import type { Meta, StoryObj } from "@storybook/react";
import { DateTime, StatusBadge } from "./Production";

const meta: Meta = {
  title: "Foundations/Status and DateTime",
};

export default meta;

type Story = StoryObj;

export const StatusVocabulary: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <StatusBadge status="active" />
      <StatusBadge status="pending" />
      <StatusBadge status="attention" />
      <StatusBadge status="complete" />
      <StatusBadge status="failed" />
      <StatusBadge status="offline" />
      <StatusBadge status="checked_in" />
      <StatusBadge status="in_room" />
    </div>
  ),
};

export const RelativeDateTime: Story = {
  render: () => (
    <DateTime
      value="2026-08-08T18:00:00.000Z"
      relative
      now={new Date("2026-08-08T18:05:00.000Z")}
    />
  ),
};
