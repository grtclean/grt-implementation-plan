// Automated drizzle-kit push that auto-selects "create" (first option) for all prompts
import { spawn } from "child_process";

const child = spawn("npx", ["drizzle-kit", "push", "--verbose", "--force"], {
  stdio: ["pipe", "pipe", "pipe"],
  shell: true,
  env: { ...process.env, FORCE_COLOR: "0" },
});

let buffer = "";

child.stdout.on("data", (data) => {
  const text = data.toString();
  buffer += text;
  process.stdout.write(text);

  // Detect interactive prompt and send Enter to select first option (create)
  if (buffer.includes("created or renamed")) {
    setTimeout(() => {
      child.stdin.write("\r\n");
      buffer = "";
    }, 100);
  }
  // Also handle "Yes, I want to ..." confirmation prompts
  if (buffer.includes("Yes, I want to")) {
    setTimeout(() => {
      child.stdin.write("\r\n");
      buffer = "";
    }, 100);
  }
});

child.stderr.on("data", (data) => {
  process.stderr.write(data.toString());
});

child.on("close", (code) => {
  process.exit(code);
});
