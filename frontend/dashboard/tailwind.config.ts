import type { Config } from "tailwindcss";

const config: Config = {
  presets: [require("@aurixa/ui-kit/tailwind.preset")],
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui-kit/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
