import fs from "node:fs";

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

console.log("✅ prebuild guard OK");
