const { spawn } = require("child_process");

const vars = {
  SMTP_HOST: "smtp.hostinger.com",
  SMTP_PORT: "465",
  SMTP_EMAIL: "usama@thrilledge.com",
  SMTP_PASSWORD: "Helloworld!6381",
  SMTP_FROM: "UpScore <usama@thrilledge.com>",
};

async function addVar(name, value) {
  return new Promise((resolve, reject) => {
    const proc = spawn("cmd", ["/c", "npx", "vercel", "env", "add", name, "production", "--force"], {
      stdio: ["pipe", "inherit", "inherit"],
      cwd: process.cwd(),
    });
    // First answer "n" to sensitive prompt
    proc.stdin.write("n\n");
    // Small delay then write value
    setTimeout(() => {
      proc.stdin.write(value + "\n");
    }, 500);
    proc.on("close", (code) => resolve(code));
    proc.on("error", reject);
  });
}

async function main() {
  for (const [name, value] of Object.entries(vars)) {
    console.log(`Adding ${name}...`);
    await addVar(name, value);
  }
  console.log("All done!");
}

main();
