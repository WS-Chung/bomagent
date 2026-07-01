import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "Segoe UI",
          "Apple SD Gothic Neo",
          "Noto Sans KR",
          "sans-serif",
        ],
      },
      colors: {
        brand: {
          50: "#E5F0F5",
          100: "#C7DCE7",
          200: "#BCE3EA",
          300: "#7CC9D5",
          400: "#1BBBCC",
          500: "#4383AF",
          600: "#06438C",
          700: "#052E62",
          800: "#031F44",
          900: "#021530",
        },
        emerald: {
          100: "#E5F8F2",
          200: "#C9F1E5",
          300: "#7DEAD5",
          400: "#5DD7BE",
          500: "#3DC4A7",
          600: "#2BAA8D",
          700: "#1F8F76",
          800: "#16735F",
          900: "#0E5847",
        },
        ink: {
          950: "#04060f",
          900: "#0a0e1a",
          800: "#0f1424",
          700: "#161c2e",
          600: "#1e2640",
        },
        co: {
          black: "#000000",
          light: "#DEDEDE",
          mid: "#A0A0A0",
          dark: "#555555",
          mint: "#7DEAD5",
          cyan: "#1BBBCC",
          blue: "#4383AF",
          navy: "#06438C",
        },
      },
      boxShadow: {
        glow: "0 0 24px rgba(27,187,204,0.35)",
        "glow-sm": "0 0 12px rgba(27,187,204,0.4)",
      },
      animation: {
        slideIn: "slideIn 0.45s cubic-bezier(0.22,1,0.36,1)",
        fadeIn: "fadeIn 0.35s ease-out",
        floatPulse: "floatPulse 3.4s ease-in-out infinite",
      },
      keyframes: {
        slideIn: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        floatPulse: {
          "0%,100%": { transform: "translateY(0)", opacity: "0.7" },
          "50%": { transform: "translateY(-4px)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
