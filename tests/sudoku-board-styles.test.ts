import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "bun:test";

const boardStylesPath = join(import.meta.dir, "../packages/sudoku-board/src/sudoku-board.module.css");

describe("sudoku board styles", () => {
  it("keeps invalid digits red while selected and highlighted", () => {
    const css = readFileSync(boardStylesPath, "utf8");

    const matchSelectorIndex = css.indexOf(".cell.match {");
    const invalidMatchSelectorIndex = css.indexOf(".cell.invalid.match {");
    const selectedInvalidMatchSelectorIndex = css.indexOf(".cell.selected.invalid.match {");

    expect(matchSelectorIndex).toBeGreaterThan(-1);
    expect(invalidMatchSelectorIndex).toBeGreaterThan(matchSelectorIndex);
    expect(selectedInvalidMatchSelectorIndex).toBeGreaterThan(invalidMatchSelectorIndex);

    const invalidMatchRuleEnd = css.indexOf("}", invalidMatchSelectorIndex);
    const selectedInvalidMatchRuleEnd = css.indexOf("}", selectedInvalidMatchSelectorIndex);

    expect(css.slice(invalidMatchSelectorIndex, invalidMatchRuleEnd)).toContain("color: var(--_invalid-ink);");
    expect(css.slice(selectedInvalidMatchSelectorIndex, selectedInvalidMatchRuleEnd)).toContain("color: var(--_invalid-ink);");
  });
});
