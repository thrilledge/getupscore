const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const outPath = path.join(__dirname, "vercel-out.txt");
const token = process.env.VERCEL_TOKEN || "";

const res = spawnSync(
  "npx",
  ["--no-install", "vercel", "--prod", "--yes", ...(token ? ["--token", token] : [])],
  {
    cwd: __dirname,
    shell: true,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  }
);

fs.writeFileSync(
  outPath,
  (res.stdout || "") +
    (res.stderr || "") +
    "\n__EXIT_CODE__=" +
    res.status +
    "\n"
);