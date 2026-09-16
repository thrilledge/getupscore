const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const outPath = path.join(__dirname, "tsc-out.txt");
const res = spawnSync(
  "npx",
  ["--no-install", "tsc", "--noEmit", "--pretty", "false"],
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