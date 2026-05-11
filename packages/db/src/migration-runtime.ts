import { existsSync, readFileSync, rmSync } from "node:fs";
import { spawn as spawnChild } from "node:child_process";
import { createServer } from "node:net";
import path from "node:path";
import { ensurePostgresDatabase, getPostgresDataDirectory } from "./client.js";
import { createEmbeddedPostgresLogBuffer, formatEmbeddedPostgresError } from "./embedded-postgres-error.js";
import { resolveDatabaseTarget } from "./runtime-config.js";

type EmbeddedPostgresInstance = {
    initialise(): Promise<void>;
    start(): Promise<void>;
    stop(): Promise<void>;
};

type EmbeddedPostgresCtor = new (opts: {
    databaseDir: string;
    user: string;
    password: string;
    port: number;
    persistent: boolean;
    initdbFlags?: string[];
    onLog?: (message: unknown) => void;
    onError?: (message: unknown) => void;
}) => EmbeddedPostgresInstance;

export type MigrationConnection = {
    connectionString: string;
    source: string;
    stop: () => Promise<void>;
};

function readRunningPostmasterPid(postmasterPidFile: string): number | null {
    if (!existsSync(postmasterPidFile)) return null;
    try {
        const pid = Number(readFileSync(postmasterPidFile, "utf8").split("\n")[0]?.trim());
        if (!Number.isInteger(pid) || pid <= 0) return null;
        process.kill(pid, 0);
        return pid;
    } catch {
        return null;
    }
}

function readPidFilePort(postmasterPidFile: string): number | null {
    if (!existsSync(postmasterPidFile)) return null;
    try {
        const lines = readFileSync(postmasterPidFile, "utf8").split("\n");
        const port = Number(lines[3]?.trim());
        return Number.isInteger(port) && port > 0 ? port : null;
    } catch {
        return null;
    }
}

async function loadEmbeddedPostgresCtor(): Promise<EmbeddedPostgresCtor> {
    try {
        const mod = await import("embedded-postgres");
        return mod.default as EmbeddedPostgresCtor;
    } catch {
        throw new Error(
            "Embedded PostgreSQL support requires dependency `embedded-postgres`. Reinstall dependencies and try again.",
        );
    }
}

async function isPortFree(port: number): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
        const server = createServer();
        server.once("error", () => resolve(false));
        server.once("listening", () => {
            server.close(() => resolve(true));
        });
        server.listen({ host: "127.0.0.1", port, exclusive: true });
    });
}

async function selectEmbeddedPostgresPort(preferredPort: number, maxAttempts = 20): Promise<number> {
    if (await isPortFree(preferredPort)) {
        return preferredPort;
    }

    for (let offset = 1; offset <= maxAttempts; offset += 1) {
        const candidate = preferredPort + offset;
        if (await isPortFree(candidate)) {
            process.emitWarning(
                `Embedded PostgreSQL port is in use; using next free port (requestedPort=${preferredPort}, selectedPort=${candidate})`,
            );
            return candidate;
        }
    }

    throw new Error(
        `Unable to find a free embedded PostgreSQL port in range ${preferredPort}-${preferredPort + maxAttempts}.`,
    );
}

async function ensureEmbeddedPostgresConnection(
    dataDir: string,
    preferredPort: number,
): Promise<MigrationConnection> {
    const EmbeddedPostgres = await loadEmbeddedPostgresCtor();
    const selectedPort = await selectEmbeddedPostgresPort(preferredPort);
    const postmasterPidFile = path.resolve(dataDir, "postmaster.pid");
    const pgVersionFile = path.resolve(dataDir, "PG_VERSION");
    const runningPid = readRunningPostmasterPid(postmasterPidFile);
    const runningPort = readPidFilePort(postmasterPidFile);
    const preferredAdminConnectionString = `postgres://paperclip:paperclip@127.0.0.1:${preferredPort}/postgres`;
    const logBuffer = createEmbeddedPostgresLogBuffer();

    if (!runningPid && existsSync(pgVersionFile)) {
        try {
            const actualDataDir = await getPostgresDataDirectory(preferredAdminConnectionString);
            const matchesDataDir =
                typeof actualDataDir === "string" &&
                path.resolve(actualDataDir) === path.resolve(dataDir);
            if (!matchesDataDir) {
                throw new Error("reachable postgres does not use the expected embedded data directory");
            }
            await ensurePostgresDatabase(preferredAdminConnectionString, "paperclip");
            process.emitWarning(
                `Adopting an existing PostgreSQL instance on port ${preferredPort} for embedded data dir ${dataDir} because postmaster.pid is missing.`,
            );
            return {
                connectionString: `postgres://paperclip:paperclip@127.0.0.1:${preferredPort}/paperclip`,
                source: `embedded-postgres@${preferredPort}`,
                stop: async () => { },
            };
        } catch {
            // Fall through and attempt to start the configured embedded cluster.
        }
    }

    if (runningPid) {
        const port = runningPort ?? preferredPort;
        const adminConnectionString = `postgres://paperclip:paperclip@127.0.0.1:${port}/postgres`;
        await ensurePostgresDatabase(adminConnectionString, "paperclip");
        return {
            connectionString: `postgres://paperclip:paperclip@127.0.0.1:${port}/paperclip`,
            source: `embedded-postgres@${port}`,
            stop: async () => { },
        };
    }

    const instance = new EmbeddedPostgres({
        databaseDir: dataDir,
        user: "paperclip",
        password: "paperclip",
        port: selectedPort,
        persistent: true,
        initdbFlags: ["--encoding=UTF8", "--locale=C", "--lc-messages=C"],
        onLog: logBuffer.append,
        onError: logBuffer.append,
    });

    if (!existsSync(path.resolve(dataDir, "PG_VERSION"))) {
        try {
            await instance.initialise();
        } catch (error) {
            throw formatEmbeddedPostgresError(error, {
                fallbackMessage:
                    `Failed to initialize embedded PostgreSQL cluster in ${dataDir} on port ${selectedPort}`,
                recentLogs: logBuffer.getRecentLogs(),
            });
        }
    }
    if (existsSync(postmasterPidFile)) {
        rmSync(postmasterPidFile, { force: true });
    }
    try {
        await instance.start();
    } catch (error) {
        throw formatEmbeddedPostgresError(error, {
            fallbackMessage: `Failed to start embedded PostgreSQL on port ${selectedPort}`,
            recentLogs: logBuffer.getRecentLogs(),
        });
    }

    const adminConnectionString = `postgres://paperclip:paperclip@127.0.0.1:${selectedPort}/postgres`;
    await ensurePostgresDatabase(adminConnectionString, "paperclip");

    return {
        connectionString: `postgres://paperclip:paperclip@127.0.0.1:${selectedPort}/paperclip`,
        source: `embedded-postgres@${selectedPort}`,
        stop: async () => {
            // On Windows, embedded-postgres stop() can hang indefinitely if the
            // 'exit' event fires before the handler is registered. Use a timeout
            // and fall back to force-killing the process by PID.
            const stopWithTimeout = new Promise<void>((resolve) => {
                const timer = setTimeout(() => {
                    // Timeout: force-kill postgres by PID from postmaster.pid
                    try {
                        const pidFile = path.resolve(dataDir, "postmaster.pid");
                        if (existsSync(pidFile)) {
                            const pid = Number(readFileSync(pidFile, "utf8").split("\n")[0]?.trim());
                            if (Number.isInteger(pid) && pid > 0) {
                                if (process.platform === "win32") {
                                    try {
                                        process.kill(pid);
                                    } catch {
                                        // Fall back to taskkill without blocking the event loop.
                                        const killer = spawnChild("taskkill", ["/pid", String(pid), "/f", "/t"], {
                                            stdio: "ignore",
                                            detached: true,
                                        });
                                        killer.unref();
                                    }
                                } else {
                                    process.kill(pid, "SIGKILL");
                                }
                            }
                        }
                    } catch {
                        // ignore kill errors
                    }
                    resolve();
                }, 5000);
                instance.stop().then(() => {
                    clearTimeout(timer);
                    resolve();
                }).catch(() => {
                    clearTimeout(timer);
                    resolve();
                });
            });
            await stopWithTimeout;
        },
    };
}

export async function resolveMigrationConnection(): Promise<MigrationConnection> {
    const target = resolveDatabaseTarget();
    if (target.mode === "postgres") {
        return {
            connectionString: target.connectionString,
            source: target.source,
            stop: async () => { },
        };
    }

    return ensureEmbeddedPostgresConnection(target.dataDir, target.port);
}
