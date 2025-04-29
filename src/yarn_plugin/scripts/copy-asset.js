/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs").promises;
const path = require("path");

const { execSync } = require("child_process");

const WEB_UI_DIR = path.resolve(__dirname, "../../webui/");

async function buildFrontend() {
  console.log("Building front end...");

  try {
    execSync("npm install", {
      cwd: WEB_UI_DIR,
      stdio: "inherit", // Show real-time output
    });

    execSync("npm run build", {
      cwd: WEB_UI_DIR,
      stdio: "inherit",
    });

    console.log("✅ Front-end build completed successfully!");
  } catch (error) {
    throw new Error(
      `❌ '${error.cmd}' failed with exit code ${error.status}: ${error.message}`,
    );
  }
}

const sourceDir = path.resolve(__dirname, "../../webui/dist/"); // Adjust path if needed
const destDir = path.resolve(__dirname, "../bundles/@yarnpkg/webui/"); // Output location

async function copyFile() {
  try {
    await fs.access(sourceDir);
    await fs.cp(sourceDir, destDir, { recursive: true });
    console.log(`Copied webUI to plugin`);
  } catch (error) {
    console.error(`Failed to copy file: ${error.message}`);
    process.exit(1);
  }
}

buildFrontend();
copyFile();
