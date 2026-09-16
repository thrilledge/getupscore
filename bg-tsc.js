// Starts the tsc runner as a detached background process so the 30s command
// timeout does not kill it. Progress/result -> tsc-out.txt
const { spawn } = require("child_process");
const path = require("path");

const child = spawn(process.execPath, [path.join(__dirname, "tsc-runner.js")], {
  cwd: __dirname,
  detached: true,
  stdio: "ignore",
});

child.unref();
console.log("Started background tsc runner, pid:", child.pid);
console.log("Status: node tsc-status.js  |  Raw: tsc-out.txt");