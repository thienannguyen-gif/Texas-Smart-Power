import { spawn, execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "..");
const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";

const api = spawn(npxCommand, ["vercel", "dev", "--listen", "3000"], {
  cwd: rootDir,
  stdio: "inherit",
  shell: true,
});

api.on("exit", (code) => {
  if (code && code !== 0) {
    console.error(`[api] exited with code ${code}`);
    process.exit(code);
  }
});

// On Windows, api is spawned with shell: true (needed to resolve npx.cmd),
// so child.kill() only terminates the intermediate cmd.exe wrapper — the
// real vercel/vite node.exe processes are left running as orphans.
// taskkill /T walks the whole process tree instead.
function killTree(child) {
  if (process.platform === "win32") {
    try {
      execFileSync("taskkill", ["/PID", String(child.pid), "/T", "/F"]);
    } catch {
      // already exited
    }
  } else {
    child.kill("SIGINT");
  }
}

process.on("SIGINT", () => {
  killTree(api);
  process.exit(0);
});
