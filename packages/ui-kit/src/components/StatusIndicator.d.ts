export type StatusType = "healthy" | "degraded" | "down" | "unknown";
export interface StatusIndicatorProps {
    status: StatusType;
    label?: string;
    size?: "sm" | "md" | "lg";
    className?: string;
}
export declare function StatusIndicator({ status, label, size, className, }: StatusIndicatorProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=StatusIndicator.d.ts.map