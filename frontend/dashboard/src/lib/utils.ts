/** Lightweight className helper - avoids clsx vendor-chunk resolution issues in pnpm monorepo */
export function cn(...args: (string | false | undefined)[]): string {
  return args.filter(Boolean).join(" ");
}
