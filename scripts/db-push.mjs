import { spawnSync } from "node:child_process";

const npxBin = process.platform === "win32" ? "npx.cmd" : "npx";
const prisma = spawnSync(npxBin, ["prisma", "db", "push"], {
  cwd: process.cwd(),
  encoding: "utf8",
  stdio: "pipe"
});

if (prisma.status === 0) {
  process.stdout.write(prisma.stdout);
  process.stderr.write(prisma.stderr);
  process.exit(0);
}

console.log("Prisma db push was unavailable locally; initializing SQLite with the MVP fallback.");

const fallback = spawnSync(process.execPath, ["--no-warnings", "scripts/init-sqlite.mjs"], {
  cwd: process.cwd(),
  encoding: "utf8",
  stdio: "pipe"
});

process.stdout.write(fallback.stdout);
process.stderr.write(fallback.stderr);
process.exit(fallback.status ?? 1);
