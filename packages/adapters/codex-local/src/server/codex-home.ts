import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { AdapterExecutionContext } from "@paperclipai/adapter-utils";

const TRUTHY_ENV_RE = /^(1|true|yes|on)$/i;
const COPIED_SHARED_FILES = ["config.json", "config.toml", "instructions.md"] as const;
const SYMLINKED_SHARED_FILES = ["auth.json"] as const;
const DEFAULT_PAPERCLIP_INSTANCE_ID = "default";

function nonEmpty(value: string | undefined): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export async function pathExists(candidate: string): Promise<boolean> {
  return fs.access(candidate).then(() => true).catch(() => false);
}

export function resolveSharedCodexHomeDir(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const fromEnv = nonEmpty(env.CODEX_HOME);
  return fromEnv ? path.resolve(fromEnv) : path.join(os.homedir(), ".codex");
}

function isWorktreeMode(env: NodeJS.ProcessEnv): boolean {
  return TRUTHY_ENV_RE.test(env.PAPERCLIP_IN_WORKTREE ?? "");
}

export function resolveManagedCodexHomeDir(
  env: NodeJS.ProcessEnv,
  companyId?: string,
): string {
  const paperclipHome = nonEmpty(env.PAPERCLIP_HOME) ?? path.resolve(os.homedir(), ".paperclip");
  const instanceId = nonEmpty(env.PAPERCLIP_INSTANCE_ID) ?? DEFAULT_PAPERCLIP_INSTANCE_ID;
  return companyId
    ? path.resolve(paperclipHome, "instances", instanceId, "companies", companyId, "codex-home")
    : path.resolve(paperclipHome, "instances", instanceId, "codex-home");
}

async function ensureParentDir(target: string): Promise<void> {
  await fs.mkdir(path.dirname(target), { recursive: true });
}

async function ensureSymlinkOrCopy(target: string, source: string): Promise<void> {
  try {
    await fs.symlink(source, target);
  } catch (err) {
    // Windows without Developer Mode / elevated privileges denies symlinks (EPERM/EACCES).
    // Fall back to a plain file copy so the adapter still works.
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "EPERM" || code === "EACCES") {
      await fs.copyFile(source, target);
      return;
    }
    throw err;
  }
}

async function ensureSymlink(target: string, source: string): Promise<void> {
  const existing = await fs.lstat(target).catch(() => null);
  if (!existing) {
    await ensureParentDir(target);
    await ensureSymlinkOrCopy(target, source);
    return;
  }

  if (!existing.isSymbolicLink()) {
    // Keep fallback-copied files fresh when managed auth/config changes upstream.
    if (existing.isFile()) {
      await fs.copyFile(source, target);
    }
    return;
  }

  const linkedPath = await fs.readlink(target).catch(() => null);
  if (!linkedPath) return;

  const resolvedLinkedPath = path.resolve(path.dirname(target), linkedPath);
  if (resolvedLinkedPath === source) return;

  await fs.unlink(target);
  await ensureSymlinkOrCopy(target, source);
}

async function ensureCopiedFile(target: string, source: string): Promise<void> {
  const existing = await fs.lstat(target).catch(() => null);
  if (existing) return;
  await ensureParentDir(target);
  await fs.copyFile(source, target);
}

function parseModelFromJson(value: unknown): string | null {
  if (typeof value !== "object" || value === null) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = parseModelFromJson(item);
      if (found) return found;
    }
    return null;
  }

  const record = value as Record<string, unknown>;
  const direct = ["model", "default_model", "openai_model", "codex_model", "model_id"] as const;
  for (const key of direct) {
    const raw = record[key];
    if (typeof raw === "string" && raw.trim().length > 0) return raw.trim();
  }

  for (const nestedKey of ["openai", "codex", "models", "defaults", "profile", "profiles"]) {
    const found = parseModelFromJson(record[nestedKey]);
    if (found) return found;
  }

  for (const nested of Object.values(record)) {
    const found = parseModelFromJson(nested);
    if (found) return found;
  }

  return null;
}

function parseModelFromToml(content: string): { model: string | null; excerpt: string | null } {
  const lines = content.split(/\r?\n/);
  let currentSection = "";
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    if (line.startsWith("[") && line.endsWith("]")) {
      currentSection = line.slice(1, -1).trim().toLowerCase();
      continue;
    }

    const direct = /^\s*(?:model|default_model|openai_model|codex_model|model_id)\s*=\s*["']([^"']+)["']/i.exec(line);
    if (direct?.[1]) return { model: direct[1].trim(), excerpt: rawLine.trim() };

    const inModelSection = /(?:^|\.)(?:openai|codex|model|models|defaults)(?:\.|$)/i.test(currentSection);
    if (inModelSection) {
      const sectionModel = /^\s*model\s*=\s*["']([^"']+)["']/i.exec(line);
      if (sectionModel?.[1]) return { model: sectionModel[1].trim(), excerpt: rawLine.trim() };
    }
  }

  return { model: null, excerpt: null };
}

export async function readCodexCliModelConfig(codexHome?: string): Promise<{
  model: string | null;
  source: string | null;
  content: string | null;
}> {
  const home = codexHome ?? path.join(os.homedir(), ".codex");

  const configJsonPath = path.join(home, "config.json");
  try {
    const raw = await fs.readFile(configJsonPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    const model = parseModelFromJson(parsed);
    if (model) {
      return {
        model,
        source: configJsonPath,
        content: JSON.stringify({ model }, null, 2),
      };
    }
  } catch {
    // Ignore parse/read errors and continue to TOML fallback.
  }

  const configTomlPath = path.join(home, "config.toml");
  try {
    const raw = await fs.readFile(configTomlPath, "utf8");
    const parsed = parseModelFromToml(raw);
    if (parsed.model) {
      return {
        model: parsed.model,
        source: configTomlPath,
        content: parsed.excerpt,
      };
    }
  } catch {
    // Ignore parse/read errors and report no model.
  }

  return { model: null, source: null, content: null };
}

export async function prepareManagedCodexHome(
  env: NodeJS.ProcessEnv,
  onLog: AdapterExecutionContext["onLog"],
  companyId?: string,
): Promise<string> {
  const targetHome = resolveManagedCodexHomeDir(env, companyId);

  const sourceHome = resolveSharedCodexHomeDir(env);
  if (path.resolve(sourceHome) === path.resolve(targetHome)) return targetHome;

  await fs.mkdir(targetHome, { recursive: true });

  for (const name of SYMLINKED_SHARED_FILES) {
    const source = path.join(sourceHome, name);
    if (!(await pathExists(source))) continue;
    await ensureSymlink(path.join(targetHome, name), source);
  }

  for (const name of COPIED_SHARED_FILES) {
    const source = path.join(sourceHome, name);
    if (!(await pathExists(source))) continue;
    await ensureCopiedFile(path.join(targetHome, name), source);
  }

  await onLog(
    "stdout",
    `[paperclip] Using ${isWorktreeMode(env) ? "worktree-isolated" : "Paperclip-managed"} Codex home "${targetHome}" (seeded from "${sourceHome}").\n`,
  );
  return targetHome;
}
