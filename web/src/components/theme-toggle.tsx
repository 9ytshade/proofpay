"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function initialTheme(): Theme {
  const saved = window.localStorage.getItem("proofpay-theme");
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle() {
  // Keep the first browser render identical to the server render. Reading
  // localStorage during initial render made the icon differ before hydration.
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const restoreTheme = window.setTimeout(() => setTheme(initialTheme()), 0);
    return () => window.clearTimeout(restoreTheme);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function toggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("proofpay-theme", nextTheme);
    setTheme(nextTheme);
  }

  const label = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button
      aria-label={label}
      title={label}
      aria-pressed={theme === "dark"}
      onClick={toggleTheme}
      className="theme-toggle grid h-9 w-9 place-items-center rounded-full border border-[var(--ink)] transition hover:bg-[var(--ink)] hover:text-[var(--paper)]"
    >
      {theme === "dark" ? (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.7]">
          <circle cx="12" cy="12" r="3.5" />
          <path d="M12 2.5v2M12 19.5v2M21.5 12h-2M4.5 12h-2M18.72 5.28 17.3 6.7M6.7 17.3l-1.42 1.42M18.72 18.72 17.3 17.3M6.7 6.7 5.28 5.28" />
        </svg>
      ) : (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-current">
          <path d="M19.8 15.3A8.5 8.5 0 0 1 8.7 4.2 8.5 8.5 0 1 0 19.8 15.3Z" />
        </svg>
      )}
    </button>
  );
}
