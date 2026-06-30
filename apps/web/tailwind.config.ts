import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#141414",
        paper: "#fffaf2",
        punch: "#f24f35",
        citrus: "#ffd166",
        mint: "#2ec4b6",
        leaf: "#3a7d44"
      },
      boxShadow: {
        crisp: "0 12px 30px rgba(20, 20, 20, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
