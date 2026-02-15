import type { Config } from "tailwindcss";

const config: Config = {
  presets: [require("@aurixa/ui-kit/tailwind.preset")],
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui-kit/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hospital: {
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
        },
      },
    },
  },
  plugins: [],
};

export default config;
