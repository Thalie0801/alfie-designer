import fs from "node:fs";
import { execSync } from "node:child_process";

const vercelFiles = [
  "vercel.json",
  "vercel.prod.json",
  "vercel.preview.json",
];

const hasForbiddenOutputDirectory = vercelFiles
  .filter((file) => fs.existsSync(file))
  .some((file) => {
    const contents = fs.readFileSync(file, "utf8");
    return contents.includes('"outputDirectory": "public/app"');
  });

if (hasForbiddenOutputDirectory) {
  console.error("❌ outputDirectory=public/app détecté dans un vercel.json");
  process.exit(1);
}

const registry = execSync("npm config get registry").toString().trim();

if (!/^https:\/\/registry\.npmjs\.org\/?$/.test(registry)) {
  console.error("❌ Registre npm non standard:", registry);
  process.exit(1);
}

console.log("✅ prebuild guard OK");
