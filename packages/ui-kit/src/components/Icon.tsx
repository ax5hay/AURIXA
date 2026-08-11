import React from "react";
import clsx from "clsx";

export type IconName =
  | "alert"
  | "bell"
  | "building"
  | "calendar"
  | "check"
  | "chevron-down"
  | "chevron-left"
  | "chevron-right"
  | "clock"
  | "close"
  | "home"
  | "info"
  | "key"
  | "listing"
  | "map-pin"
  | "menu"
  | "message"
  | "office"
  | "map"
  | "compass"
  | "sign"
  | "door"
  | "refresh"
  | "search"
  | "settings"
  | "user";

export interface IconProps extends Omit<React.SVGAttributes<SVGSVGElement>, "children"> {
  name: IconName;
  size?: "sm" | "md" | "lg" | number;
  /** Supply a label only when the icon communicates meaning without adjacent text. */
  label?: string;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

function IconPaths({ name }: { name: IconName }) {
  switch (name) {
    case "alert":
      return (
        <>
          <path d="M12 3 2.8 19a1.4 1.4 0 0 0 1.2 2h16a1.4 1.4 0 0 0 1.2-2L12 3Z" />
          <path d="M12 9v4.5M12 17h.01" />
        </>
      );
    case "building":
      return (
        <>
          <path d="M4 21V8l8-5 8 5v13" />
          <path d="M9 21v-6h6v6M9 10h.01M15 10h.01M9 14h.01M15 14h.01" />
        </>
      );
    case "key":
      return (
        <>
          <circle cx="8" cy="8" r="4" />
          <path d="M11 11 21 21M16 16h5M18 14v4" />
        </>
      );
    case "listing":
      return (
        <>
          <path d="M3 21V9l9-6 9 6v12" />
          <path d="M9 21v-8h6v8M12 7v.01" />
        </>
      );
    case "map-pin":
      return (
        <>
          <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z" />
          <circle cx="12" cy="10" r="2.5" />
        </>
      );
    case "door":
      return (
        <>
          <path d="M5 4h14v16H5z" />
          <path d="M15 12h.01M9 4V2h6v2" />
        </>
      );
    case "office":
      return (
        <>
          <path d="M3 21h18" />
          <path d="M6 21V8l6-4 6 4v13" />
          <path d="M10 12h.01M14 12h.01M10 16h.01M14 16h.01M10 21v-5h4v5" />
        </>
      );
    case "map":
      return (
        <>
          <path d="M3 6 9 4l6 2 6-2v14l-6 2-6-2-6 2V6Z" />
          <path d="M9 4v14M15 6v14" />
        </>
      );
    case "compass":
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="m16 8-2 6-6 2 2-6 6-2Z" />
        </>
      );
    case "sign":
      return (
        <>
          <path d="M12 3v18" />
          <path d="M8 7h8l-1.5 4H9.5L8 7Z" />
          <path d="M6 21h12" />
        </>
      );
    case "bell":
      return (
        <>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" />
          <path d="M10 21h4" />
        </>
      );
    case "calendar":
      return (
        <>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 10h18" />
        </>
      );
    case "check":
      return <path d="m5 12 4 4L19 6" />;
    case "chevron-down":
      return <path d="m6 9 6 6 6-6" />;
    case "chevron-left":
      return <path d="m15 18-6-6 6-6" />;
    case "chevron-right":
      return <path d="m9 18 6-6-6-6" />;
    case "clock":
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </>
      );
    case "close":
      return <path d="M6 6l12 12M18 6 6 18" />;
    case "home":
      return (
        <>
          <path d="m3 11 9-8 9 8" />
          <path d="M5 10v11h14V10M9 21v-7h6v7" />
        </>
      );
    case "info":
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v6M12 7h.01" />
        </>
      );
    case "menu":
      return <path d="M4 7h16M4 12h16M4 17h16" />;
    case "message":
      return <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z" />;
    case "refresh":
      return (
        <>
          <path d="M20 7v5h-5" />
          <path d="M4 17v-5h5M6.1 8a7 7 0 0 1 11.5-2L20 8M4 16l2.4 2A7 7 0 0 0 18 16" />
        </>
      );
    case "search":
      return (
        <>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </>
      );
    case "settings":
      return (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
        </>
      );
    case "user":
      return (
        <>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </>
      );
  }
}

export function Icon({ name, size = "md", label, className, ...props }: IconProps) {
  const numericSize = typeof size === "number" ? size : undefined;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={numericSize}
      height={numericSize}
      className={clsx(typeof size === "string" && sizeClasses[size], "shrink-0", className)}
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
      focusable="false"
      {...props}
    >
      <IconPaths name={name} />
    </svg>
  );
}
