import type { Metadata } from "next";
import { SudokuApp } from "@/components/sudoku-app";

export const metadata: Metadata = {
  title: "Settings",
  description: "Adjust Sudoku gameplay settings like difficulty, hints, lives, and theme.",
};

export default function SettingsPage() {
  return <SudokuApp entryPoint="settings" />;
}
