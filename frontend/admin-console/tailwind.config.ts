import type { Config } from "tailwindcss";
import aurixaPreset from "@aurixa/ui-kit/tailwind.preset";

const config: Config = {
  presets: [aurixaPreset],
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui-kit/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
