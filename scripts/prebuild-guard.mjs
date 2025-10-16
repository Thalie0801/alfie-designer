import fs from "node:fs";
import { execSync } from "node:child_process";

const vercelFiles = [
  "vercel.json",
  "vercel.prod.json",
  "vercel.preview.json",
];

const invalidOutputDirectories = vercelFiles
  .filter((file) => fs.existsSync(file))
  .map((file) => {
    try {
      const contents = fs.readFileSync(file, "utf8");
      if (!contents.trim()) {
        return null;
      }

      const config = JSON.parse(contents);
      const outputDirectory =
        typeof config.outputDirectory === "string"
          ? config.outputDirectory
          : typeof config.build?.outputDirectory === "string"
            ? config.build.outputDirectory
            : undefined;

      if (outputDirectory && outputDirectory !== "dist") {
        return { file, outputDirectory };
      }

      return null;
    } catch (error) {
      console.error(`❌ Impossible de lire ${file}:`, error);
      process.exit(1);
    }
  })
  .filter(Boolean);

if (invalidOutputDirectories.length > 0) {
  console.error("❌ outputDirectory doit être défini sur 'dist' ou omis dans:");
  for (const { file, outputDirectory } of invalidOutputDirectories) {
    console.error(`   • ${file} (actuel: ${outputDirectory})`);
  }
  process.exit(1);
}

const registry = execSync("npm config get registry").toString().trim();

if (!/^https:\/\/registry\.npmjs\.org\/?$/.test(registry)) {
  console.error("❌ Registre npm non standard:", registry);
  process.exit(1);
}

console.log("✅ prebuild guard OK");
