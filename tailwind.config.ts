import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        nb: {
          bg: "#fafaf2",
          surface: "#ffffff",
          "surface-alt": "#f2f5fa",
          dark: "#0a0a0a",
          text: "#29291c",
          muted: "#757568",
          "gray-400": "#a0a09c",
          green: "#bffb4f",
          "green-dark": "#4bcc00",
          "green-pale": "#e6ffb8",
          navy: "#1b3c68",
          "navy-mid": "#5b7495",
          "navy-light": "#94a4b9",
          "navy-border": "#cbd6e4",
          border: "#e6e6e3",
          orange: "#ff6a14",
        },
      },
      fontFamily: {
        sans: ["IBM Plex Mono", "monospace"],
        heading: ["Montserrat", "Helvetica", "Arial", "sans-serif"],
        display: ["Moderustic", "Helvetica", "Arial", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
