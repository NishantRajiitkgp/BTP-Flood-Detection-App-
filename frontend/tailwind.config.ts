import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  darkMode: "class", // never used — light only — but kept off-by-default
  theme: {
    extend: {
      colors: {
        // Notion-inspired palette
        bg:        "#FFFFFF",
        surface:   "#F7F6F3",
        border:    "#E5E5E5",
        text:      "#37352F",
        muted:     "#787774",
        accent:    "#2383E2",
        flood:     "#E63946",
        permanent: "#1E90FF",
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: "0.375rem",
      },
      boxShadow: {
        focus: "0 0 0 3px rgba(35, 131, 226, 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
