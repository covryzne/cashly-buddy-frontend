"use client";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme/use-theme";
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  function changeTheme() {
    const next = ({ system: "light", light: "dark", dark: "system" } as const)[
      theme
    ];
    setTheme(next);
  }
  return (
    <button
      className="icon-button"
      onClick={changeTheme}
      aria-label={`Tema ${theme === "system" ? "sistem" : theme === "light" ? "terang" : "gelap"}. Ganti tema`}
      title="Ganti tema"
    >
      <Icon size={21} />
    </button>
  );
}
