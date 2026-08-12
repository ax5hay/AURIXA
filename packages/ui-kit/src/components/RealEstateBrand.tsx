import React from "react";
import clsx from "clsx";

export interface RealEstateBrandMarkProps {
  /** Single letter or short monogram */
  monogram?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "h-8 w-8 text-sm",
  md: "h-10 w-10 text-base",
  lg: "h-12 w-12 text-lg",
};

/** Brokerage-style mark: roofline over monogram */
export function RealEstateBrandMark({
  monogram = "A",
  size = "md",
  className,
}: RealEstateBrandMarkProps) {
  return (
    <span
      className={clsx(
        "ui-re-brand-mark relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-ui-md font-display font-semibold text-ui-accent-ink",
        sizeMap[size],
        className,
      )}
      aria-hidden
    >
      <svg
        className="pointer-events-none absolute inset-x-0 top-0 h-[42%] w-full text-ui-accent-ink/25"
        viewBox="0 0 40 18"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path fill="currentColor" d="M20 2 4 16h8V10h16v6h8L20 2z" />
      </svg>
      <svg
        className="pointer-events-none absolute inset-x-[18%] bottom-[12%] h-[28%] w-[64%] opacity-70"
        viewBox="0 0 24 10"
        preserveAspectRatio="none"
        aria-hidden
      >
        <rect x="1" y="1" width="4" height="3" rx="0.5" fill="currentColor" opacity="0.2" />
        <rect x="7" y="1" width="4" height="3" rx="0.5" fill="currentColor" opacity="0.35" />
        <rect x="13" y="1" width="4" height="3" rx="0.5" fill="currentColor" opacity="0.25" />
        <rect x="19" y="1" width="4" height="3" rx="0.5" fill="currentColor" opacity="0.3" />
        <rect x="4" y="6" width="4" height="3" rx="0.5" fill="currentColor" opacity="0.28" />
        <rect x="10" y="6" width="4" height="3" rx="0.5" fill="currentColor" opacity="0.22" />
        <rect x="16" y="6" width="4" height="3" rx="0.5" fill="currentColor" opacity="0.32" />
      </svg>
      <span className="relative z-[1] mt-1">{monogram}</span>
    </span>
  );
}

export interface RealEstateSkylineProps {
  className?: string;
  /** Decorative strip for hero sections */
  variant?: "footer" | "hero";
}

export function RealEstateSkyline({ className, variant = "footer" }: RealEstateSkylineProps) {
  const height = variant === "hero" ? "h-24 sm:h-32" : "h-14 sm:h-16";
  return (
    <div
      className={clsx(
        "pointer-events-none w-full overflow-hidden text-ui-accent",
        height,
        className,
      )}
      aria-hidden
    >
      <svg
        className="h-full w-full opacity-[0.14]"
        viewBox="0 0 1200 120"
        preserveAspectRatio="xMidYMax slice"
        role="presentation"
      >
        <path
          fill="currentColor"
          d="M0 120V72h48v16h56V52h64v68h40V64h72v56h48V44h80v76h56V80h96v40H0z"
        />
        <path
          fill="currentColor"
          opacity="0.55"
          d="M0 120V92h32v28h24V76h40v44h28V68h52v52h36V84h44v36H0z"
        />
      </svg>
    </div>
  );
}
