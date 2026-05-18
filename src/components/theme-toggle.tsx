"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
    const { setTheme, theme } = useTheme();

    return (
        <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="btn-touch glass-card !p-3 flex items-center justify-center w-[46px] h-[46px]"
            aria-label="Toggle theme"
        >
            <Sun className="h-5 w-5 dark:hidden text-amber-500" />
            <Moon className="h-5 w-5 hidden dark:block text-emerald-400" />
        </button>
    );
}
