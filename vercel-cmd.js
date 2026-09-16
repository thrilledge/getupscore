const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Args come from VC_ARGS so the same runner can run any vercel subcommand.
const args = (process.env.VC_ARGS || "env ls production")
  .split(" ")
  .filter(Boolean);

const res = spawnSync("npx", ["--no-install", "vercel", ...args], {
  cwd: __dirname,
  shell: true,
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
});

fs.writeFileSync(
  path.join(__dirname, "vercel-cmd-out.txt"),
  (res.stdout || "") +
    (res.stderr || "") +
    "\n__EXIT_CODE__=" +
    res.status +
    "\n"
);
