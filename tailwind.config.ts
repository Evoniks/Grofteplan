import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./types/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f4f7fb",
          100: "#e6eef8",
          200: "#bfd4eb",
          300: "#96badf",
          400: "#5d8dc7",
          500: "#2f67ad",
          600: "#1f4f8d",
          700: "#173d6f",
          800: "#112c50",
          900: "#0d1f37"
        }
      }
    }
  },
  plugins: []
};

export default config;
