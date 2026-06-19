import fs from "node:fs";

for (const dir of [".next", ".open-next"]) {
  if (!fs.existsSync(dir)) {
    console.log(`skip ${dir} (not present)`);
    continue;
  }

  fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  console.log(`removed ${dir}`);
}
