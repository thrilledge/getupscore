const fs = require("fs");
const path = require("path");
const outPath = path.join(__dirname, "tsc-out.txt");

if (!fs.existsSync(outPath)) {
  console.log("NOT_STARTED");
  process.exit(0);
}

const raw = fs.readFileSync(outPath, "utf8");
const done = raw.includes("__EXIT_CODE__");
const lines = raw.split(/\r?\n/);
const errors = lines.filter((l) => l.includes("error TS"));

console.log("DONE:", done);
console.log("ERROR_COUNT:", errors.length);
if (errors.length > 0) {
  console.log("--- First 25 errors ---");
  console.log(errors.slice(0, 25).join("\n"));
}
const exitLine = lines.find((l) => l.startsWith("__EXIT_CODE__"));
if (exitLine) console.log("EXIT:", exitLine);