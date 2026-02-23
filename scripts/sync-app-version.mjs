import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");

const packageJsonPath = path.join(repositoryRoot, "package.json");
const appVersionModulePath = path.join(repositoryRoot, "src", "lib", "app-version.ts");
const serviceWorkerTemplatePath = path.join(repositoryRoot, "scripts", "sw.template.js");
const serviceWorkerOutputPath = path.join(repositoryRoot, "public", "sw.js");

function assertVersion(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("package.json version must be a non-empty string.");
  }

  return value.trim();
}

async function syncAppVersion() {
  const packageJsonRaw = await readFile(packageJsonPath, "utf8");
  const packageJson = JSON.parse(packageJsonRaw);
  const version = assertVersion(packageJson.version);

  const appVersionModuleContent = `export const APP_VERSION = "${version}";\n`;
  await writeFile(appVersionModulePath, appVersionModuleContent, "utf8");

  const serviceWorkerTemplate = await readFile(serviceWorkerTemplatePath, "utf8");
  if (!serviceWorkerTemplate.includes("__APP_VERSION__")) {
    throw new Error("Service worker template missing __APP_VERSION__ token.");
  }

  const serviceWorkerContent = serviceWorkerTemplate.replaceAll("__APP_VERSION__", version);
  await writeFile(serviceWorkerOutputPath, serviceWorkerContent, "utf8");
}

await syncAppVersion();
