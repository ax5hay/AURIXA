import type { Preview } from "@storybook/react";
import React from "react";
import "../src/styles/themes.css";

const preview: Preview = {
  parameters: {
    layout: "padded",
    controls: { matchers: { color: /(background|color)$/i } },
  },
  globalTypes: {
    theme: {
      description: "Product theme",
      defaultValue: "operator",
      toolbar: {
        title: "Theme",
        items: [
          { value: "operator", title: "Operator" },
          { value: "patient", title: "Patient" },
          { value: "clinical", title: "Clinical" },
        ],
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = (context.globals.theme as string) || "operator";
      return (
        <div data-theme={theme} className="min-h-screen bg-[var(--ui-canvas)] p-6 text-[var(--ui-ink)]">
          <Story />
        </div>
      );
    },
  ],
};

export default preview;
