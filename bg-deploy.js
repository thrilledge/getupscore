const { spawn } = require("child_process");
const path = require("path");

const child = spawn(process.execPath, [path.join(__dirname, "vercel-runner.js")], {
  cwd: __dirname,
  detached: true,
  stdio: "ignore",
  env: {
    ...process.env,
    VERCEL_TOKEN: "vcp_3mmQyZ6eee2hTEwZFdYUgNYLrBZk4ZcbU4rkyLFceA92bIn2bB3Bp5HF",
  },
});

child.unref();
console.log("Started background vercel --prod, pid:", child.pid);
console.log("Result -> vercel-out.txt");