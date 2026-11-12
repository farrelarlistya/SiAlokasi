import { spawn, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const target = process.env.WEB_URL ?? "http://localhost:5173";
const isWindows = process.platform === "win32";
const localBinary = path.join("storage", isWindows ? "cloudflared.exe" : "cloudflared");

function resolveBinary() {
  if (process.env.CLOUDFLARED_PATH) return process.env.CLOUDFLARED_PATH;
  if (existsSync(localBinary)) return path.resolve(localBinary);

  const probe = spawnSync(isWindows ? "where" : "which", ["cloudflared"], {
    encoding: "utf8",
    shell: isWindows,
  });
  if (probe.status === 0 && probe.stdout.trim()) {
    return probe.stdout.trim().split(/\r?\n/)[0];
  }
  return null;
}

async function downloadBinary() {
  const asset = isWindows ? "cloudflared-windows-amd64.exe" : "cloudflared-linux-amd64";
  const url = `https://github.com/cloudflare/cloudflared/releases/latest/download/${asset}`;
  console.log(`cloudflared belum ada. Mengunduh ke ${localBinary}...`);
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) throw new Error(`Unduhan gagal: HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  mkdirSync("storage", { recursive: true });
  writeFileSync(localBinary, buffer);
  if (!isWindows) chmodSync(localBinary, 0o755);
  return path.resolve(localBinary);
}

const binary = resolveBinary() ?? (await downloadBinary());

console.log(`Membuka Cloudflare Quick Tunnel ke ${target}`);
const child = spawn(
  binary,
  ["tunnel", "--url", target, "--no-autoupdate", "--protocol", "http2"],
  { stdio: "inherit", shell: false },
);

child.on("exit", (code) => process.exit(code ?? 0));
process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
