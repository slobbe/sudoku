import type { Metadata } from "next";
import { SudokuApp } from "@/components/sudoku-app";

export const metadata: Metadata = {
  title: "Settings",
  description: "Adjust Sudoku gameplay settings like difficulty, hints, lives, and theme.",
};

export default function SettingsPage() {
  return (
    <>
      <section className="sr-only">
        <h1>Settings</h1>
        <p>Adjust gameplay behavior and local data controls for Sudoku.</p>
      </section>
      <SudokuApp entryPoint="settings" />
    </>
  );
}
