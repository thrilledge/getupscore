const { spawn } = require("child_process");
const path = require("path");

const TOKEN = "vcp_3mmQyZ6eee2hTEwZFdYUgNYLrBZk4ZcbU4rkyLFceA92bIn2bB3Bp5HF";
const args =
  process.argv.slice(2).join(" ") || "env ls production";

const child = spawn(process.execPath, [path.join(__dirname, "vercel-cmd.js")], {
  cwd: __dirname,
  detached: true,
  stdio: "ignore",
  env: {
    ...process.env,
    VC_ARGS: `${args} --token ${TOKEN}`,
  },
});

child.unref();
console.log("Started: vercel " + args);
console.log("Result -> vercel-cmd-out.txt");