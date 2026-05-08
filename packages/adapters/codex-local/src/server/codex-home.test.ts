import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { prepareManagedCodexHome } from "./codex-home.js";

describe("prepareManagedCodexHome", () => {
  const roots: string[] = [];

  afterEach(async () => {
    vi.restoreAllMocks();
    while (roots.length > 0) {
      const root = roots.pop();
      if (!root) continue;
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  async function setupHomes() {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "paperclip-codex-home-test-"));
    roots.push(root);
    const sharedCodexHome = path.join(root, "shared-codex-home");
    const paperclipHome = path.join(root, "paperclip-home");
    await fs.mkdir(sharedCodexHome, { recursive: true });
    await fs.mkdir(paperclipHome, { recursive: true });
    const env: NodeJS.ProcessEnv = {
      CODEX_HOME: sharedCodexHome,
      PAPERCLIP_HOME: paperclipHome,
      PAPERCLIP_INSTANCE_ID: "default",
    };
    return { sharedCodexHome, env };
  }

  it("falls back to copying auth.json when symlink creation is denied", async () => {
    const { sharedCodexHome, env } = await setupHomes();
    await fs.writeFile(path.join(sharedCodexHome, "auth.json"), '{"token":"shared"}\n', "utf8");

    vi.spyOn(fs, "symlink").mockRejectedValue(Object.assign(new Error("symlink denied"), { code: "EPERM" }));
    const targetHome = await prepareManagedCodexHome(env, async () => {}, "company-1");

    const targetAuth = path.join(targetHome, "auth.json");
    expect((await fs.lstat(targetAuth)).isSymbolicLink()).toBe(false);
    expect(await fs.readFile(targetAuth, "utf8")).toBe('{"token":"shared"}\n');
  });

  it("refreshes fallback-copied auth.json when the shared auth file changes", async () => {
    const { sharedCodexHome, env } = await setupHomes();
    const sharedAuth = path.join(sharedCodexHome, "auth.json");
    await fs.writeFile(sharedAuth, '{"token":"first"}\n', "utf8");

    vi.spyOn(fs, "symlink").mockRejectedValue(Object.assign(new Error("symlink denied"), { code: "EPERM" }));

    const targetHome = await prepareManagedCodexHome(env, async () => {}, "company-1");
    const targetAuth = path.join(targetHome, "auth.json");
    expect(await fs.readFile(targetAuth, "utf8")).toBe('{"token":"first"}\n');

    await fs.writeFile(sharedAuth, '{"token":"second"}\n', "utf8");
    await prepareManagedCodexHome(env, async () => {}, "company-1");
    expect(await fs.readFile(targetAuth, "utf8")).toBe('{"token":"second"}\n');
  });
});
