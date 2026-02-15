import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDir, "..");
const sourceFile = resolve(packageRoot, "src/sudoku-board.module.css");
const outputFile = resolve(packageRoot, "dist/sudoku-board.module.css");

await mkdir(dirname(outputFile), { recursive: true });
await copyFile(sourceFile, outputFile);
