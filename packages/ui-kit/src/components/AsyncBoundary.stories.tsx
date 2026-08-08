import type { Meta, StoryObj } from "@storybook/react";
import { AsyncBoundary } from "./AsyncBoundary";

const meta: Meta<typeof AsyncBoundary> = {
  title: "Foundations/AsyncBoundary",
  component: AsyncBoundary,
};

export default meta;

type Story = StoryObj<typeof AsyncBoundary>;

export const Ready: Story = {
  args: {
    children: <p className="text-sm text-ui-muted">Content loaded successfully.</p>,
  },
};
