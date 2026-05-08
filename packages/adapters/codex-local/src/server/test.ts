import type {
  AdapterEnvironmentCheck,
  AdapterEnvironmentTestContext,
  AdapterEnvironmentTestResult,
} from "@paperclipai/adapter-utils";
import {
  asString,
  parseObject,
  ensureAbsoluteDirectory,
  ensureCommandResolvable,
  ensurePathInEnv,
  runChildProcess,
} from "@paperclipai/adapter-utils/server-utils";
import path from "node:path";
import { parseCodexJsonl } from "./parse.js";
import { codexHomeDir, readCodexAuthInfo } from "./quota.js";
import { buildCodexExecArgs } from "./codex-args.js";
import { DEFAULT_CODEX_LOCAL_MODEL } from "../index.js";
import { readCodexCliModelConfig } from "./codex-home.js";
import { resolveOpenaiKeySource } from "./execute.js";

function summarizeStatus(checks: AdapterEnvironmentCheck[]): AdapterEnvironmentTestResult["status"] {
  if (checks.some((check) => check.level === "error")) return "fail";
  if (checks.some((check) => check.level === "warn")) return "warn";
  return "pass";
}

function isNonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function firstNonEmptyLine(text: string): string {
  return (
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean) ?? ""
  );
}

function commandLooksLike(command: string, expected: string): boolean {
  const base = path.basename(command).toLowerCase();
  return base === expected || base === `${expected}.cmd` || base === `${expected}.exe`;
}

function summarizeProbeDetail(stdout: string, stderr: string, parsedError: string | null): string | null {
  const raw = parsedError?.trim() || firstNonEmptyLine(stderr) || firstNonEmptyLine(stdout);
  if (!raw) return null;
  const clean = raw.replace(/\s+/g, " ").trim();
  const max = 240;
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

const CODEX_AUTH_REQUIRED_RE =
  /(?:not\s+logged\s+in|login\s+required|authentication\s+required|unauthorized|invalid(?:\s+or\s+missing)?\s+api(?:[_\s-]?key)?|openai[_\s-]?api[_\s-]?key|api[_\s-]?key.*required|please\s+run\s+`?codex\s+login`?)/i;

const CODEX_UNSUPPORTED_MODEL_RE =
  /(?:not\s+supported\s+model|unsupported\s+model|param\s+incorrect.*model)/i;

const CODEX_PARAM_INCORRECT_RE = /param\s+incorrect/i;

async function runHelloProbe(args: {
  command: string;
  config: Record<string, unknown>;
  cwd: string;
  env: Record<string, string>;
}) {
  const execArgs = buildCodexExecArgs({ ...args.config, fastMode: false });
  const probe = await runChildProcess(
    `codex-envtest-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    args.command,
    execArgs.args,
    {
      cwd: args.cwd,
      env: args.env,
      timeoutSec: 45,
      graceSec: 5,
      stdin: "Respond with hello.",
      onLog: async () => {},
    },
  );
  const parsed = parseCodexJsonl(probe.stdout);
  const authEvidence = `${parsed.errorMessage ?? ""}\n${probe.stdout}\n${probe.stderr}`.trim();
  const detail = summarizeProbeDetail(probe.stdout, probe.stderr, parsed.errorMessage);

  return {
    execArgs,
    probe,
    parsed,
    detail,
    authEvidence,
  };
}

export async function testEnvironment(
  ctx: AdapterEnvironmentTestContext,
): Promise<AdapterEnvironmentTestResult> {
  const checks: AdapterEnvironmentCheck[] = [];
  const config = parseObject(ctx.config);
  const command = asString(config.command, "codex");
  const cwd = asString(config.cwd, process.cwd());

  try {
    await ensureAbsoluteDirectory(cwd, { createIfMissing: true });
    checks.push({
      code: "codex_cwd_valid",
      level: "info",
      message: `Working directory is valid: ${cwd}`,
    });
  } catch (err) {
    checks.push({
      code: "codex_cwd_invalid",
      level: "error",
      message: err instanceof Error ? err.message : "Invalid working directory",
      detail: cwd,
    });
  }

  const envConfig = parseObject(config.env);
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(envConfig)) {
    if (typeof value === "string") env[key] = value;
  }

  const openaiKeySource = resolveOpenaiKeySource(env, process.env);
  const codexHome = isNonEmpty(env.CODEX_HOME) ? env.CODEX_HOME : undefined;
  const cliModelConfig = await readCodexCliModelConfig(codexHome);
  const cliModel = cliModelConfig.model?.trim() ?? "";
  checks.push({
    code: "codex_cli_model_config_loaded",
    level: "info",
    message: `Loaded Codex CLI model from ${cliModelConfig.source ?? "(none)"}: ${cliModel || "(none)"}`,
    detail: cliModelConfig.content ?? "(none)",
  });

  const configForProbe = { ...config, model: cliModel };
  const runtimeEnv = ensurePathInEnv({ ...process.env, ...env });
  try {
    await ensureCommandResolvable(command, cwd, runtimeEnv);
    checks.push({
      code: "codex_command_resolvable",
      level: "info",
      message: `Command is executable: ${command}`,
    });
  } catch (err) {
    checks.push({
      code: "codex_command_unresolvable",
      level: "error",
      message: err instanceof Error ? err.message : "Command is not executable",
      detail: command,
    });
  }

  if (openaiKeySource !== "missing") {
    const source = openaiKeySource === "adapter_config" ? "adapter config env" : "server environment";
    checks.push({
      code: "codex_openai_api_key_present",
      level: "info",
      message: "OPENAI_API_KEY is set for Codex authentication.",
      detail: `Detected in ${source}.`,
    });
  } else {
    const codexAuth = await readCodexAuthInfo(codexHome).catch(() => null);
    if (codexAuth) {
      checks.push({
        code: "codex_native_auth_present",
        level: "info",
        message: "Codex is authenticated via its own auth configuration.",
        detail: codexAuth.email ? `Logged in as ${codexAuth.email}.` : `Credentials found in ${path.join(codexHome ?? codexHomeDir(), "auth.json")}.`,
      });
    } else {
      checks.push({
        code: "codex_openai_api_key_missing",
        level: "warn",
        message: "OPENAI_API_KEY is not set. Codex runs may fail until authentication is configured.",
        hint: "Set OPENAI_API_KEY in adapter env, shell environment, or run `codex auth` to log in.",
      });
    }
  }

  const canRunProbe =
    checks.every((check) => check.code !== "codex_cwd_invalid" && check.code !== "codex_command_unresolvable");
  if (canRunProbe) {
    if (!commandLooksLike(command, "codex")) {
      checks.push({
        code: "codex_hello_probe_skipped_custom_command",
        level: "info",
        message: "Skipped hello probe because command is not `codex`.",
        detail: command,
        hint: "Use the `codex` CLI command to run the automatic login and installation probe.",
      });
    } else {
      const primaryRun = await runHelloProbe({
        command,
        config: configForProbe,
        cwd,
        env,
      });

      if (primaryRun.execArgs.fastModeIgnoredReason) {
        checks.push({
          code: "codex_fast_mode_unsupported_model",
          level: "warn",
          message: primaryRun.execArgs.fastModeIgnoredReason,
          hint: "Switch the agent model to GPT-5.4 or enter a manual model ID to enable Codex Fast mode.",
        });
      }

      let probeRun = primaryRun;
      const configuredModel = asString(configForProbe.model, "").trim();
      const shouldRetryWithDefaultModel =
        configuredModel.length > 0 &&
        configuredModel !== DEFAULT_CODEX_LOCAL_MODEL &&
        !primaryRun.probe.timedOut &&
        (primaryRun.probe.exitCode ?? 1) !== 0 &&
        (
          CODEX_UNSUPPORTED_MODEL_RE.test(primaryRun.authEvidence)
          || CODEX_PARAM_INCORRECT_RE.test(primaryRun.authEvidence)
        );

      if (shouldRetryWithDefaultModel) {
        // First retry without --model so Codex CLI can use its own local config model.
        const localDefaultRun = await runHelloProbe({
          command,
          config: { ...configForProbe, model: "" },
          cwd,
          env,
        });
        if ((localDefaultRun.probe.exitCode ?? 1) === 0) {
          checks.push({
            code: "codex_probe_model_fallback_used",
            level: "warn",
            message: `Configured model ${configuredModel} is unsupported by this Codex environment; environment test retried with local Codex default model successfully.`,
            ...(primaryRun.detail ? { detail: primaryRun.detail } : {}),
            hint: "Leave model empty to follow local Codex config, or set a model that your configured backend supports.",
          });
          probeRun = localDefaultRun;
        } else {
          const fallbackRun = await runHelloProbe({
          command,
          config: { ...configForProbe, model: DEFAULT_CODEX_LOCAL_MODEL },
          cwd,
          env,
        });
          if ((fallbackRun.probe.exitCode ?? 1) === 0) {
            checks.push({
              code: "codex_probe_model_fallback_used",
              level: "warn",
              message: `Configured model ${configuredModel} is unsupported by local Codex; environment test used fallback model ${DEFAULT_CODEX_LOCAL_MODEL}.`,
              ...(primaryRun.detail ? { detail: primaryRun.detail } : {}),
              hint: `Update this adapter's model to ${DEFAULT_CODEX_LOCAL_MODEL} or leave model empty to follow local Codex config.`,
            });
            probeRun = fallbackRun;
          }
        }
      }

      if (probeRun.probe.timedOut) {
        checks.push({
          code: "codex_hello_probe_timed_out",
          level: "warn",
          message: "Codex hello probe timed out.",
          hint: "Retry the probe. If this persists, verify Codex can run `Respond with hello` from this directory manually.",
        });
      } else if ((probeRun.probe.exitCode ?? 1) === 0) {
        const summary = probeRun.parsed.summary.trim();
        const hasHello = /\bhello\b/i.test(summary);
        checks.push({
          code: hasHello ? "codex_hello_probe_passed" : "codex_hello_probe_unexpected_output",
          level: hasHello ? "info" : "warn",
          message: hasHello
            ? "Codex hello probe succeeded."
            : "Codex probe ran but did not return `hello` as expected.",
          ...(summary ? { detail: summary.replace(/\s+/g, " ").trim().slice(0, 240) } : {}),
          ...(hasHello
            ? {}
            : {
                hint: "Try the probe manually (`codex exec --json -` then prompt: Respond with hello) to inspect full output.",
              }),
        });
      } else if (CODEX_AUTH_REQUIRED_RE.test(probeRun.authEvidence)) {
        checks.push({
          code: "codex_hello_probe_auth_required",
          level: "warn",
          message: "Codex CLI is installed, but authentication is not ready.",
          ...(probeRun.detail ? { detail: probeRun.detail } : {}),
          hint: "Configure OPENAI_API_KEY in adapter env/shell or run `codex login`, then retry the probe.",
        });
      } else {
        checks.push({
          code: "codex_hello_probe_failed",
          level: "error",
          message: "Codex hello probe failed.",
          ...(probeRun.detail ? { detail: probeRun.detail } : {}),
          hint: "Run `codex exec --json -` manually in this working directory and prompt `Respond with hello` to debug.",
        });
      }
    }
  }

  return {
    adapterType: ctx.adapterType,
    status: summarizeStatus(checks),
    checks,
    testedAt: new Date().toISOString(),
  };
}
