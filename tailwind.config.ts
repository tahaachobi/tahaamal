import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: "var(--surface)",
        card: "var(--card)",
        border: "var(--border)",
        muted: "var(--muted)",
        accent: "var(--accent)",
        primary: "var(--luna-blue)",
        info: "var(--luna-info)",
        success: "var(--luna-success)",
        warning: "var(--luna-warning)",
        error: "var(--luna-error)",
        neutral: "var(--luna-gray-500)",
      },
      borderRadius: {
        luna: "var(--luna-radius)",
        "luna-sm": "var(--luna-radius-sm)",
        "luna-lg": "var(--luna-radius-lg)",
        "luna-xl": "var(--luna-radius-xl)",
      },
      boxShadow: {
        "luna-xs": "var(--luna-shadow-xs)",
        "luna-sm": "var(--luna-shadow-sm)",
        luna: "var(--luna-shadow)",
        "luna-md": "var(--luna-shadow-md)",
        "luna-lg": "var(--luna-shadow-lg)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
