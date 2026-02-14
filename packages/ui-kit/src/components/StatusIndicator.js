"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusIndicator = StatusIndicator;
const jsx_runtime_1 = require("react/jsx-runtime");
const framer_motion_1 = require("framer-motion");
const clsx_1 = __importDefault(require("clsx"));
const statusColors = {
    healthy: "bg-accent-success",
    degraded: "bg-accent-warning",
    down: "bg-accent-error",
    unknown: "bg-gray-500",
};
const statusRingColors = {
    healthy: "bg-accent-success/30",
    degraded: "bg-accent-warning/30",
    down: "bg-accent-error/30",
    unknown: "bg-gray-500/30",
};
const statusLabels = {
    healthy: "Healthy",
    degraded: "Degraded",
    down: "Down",
    unknown: "Unknown",
};
const dotSizes = {
    sm: "h-2 w-2",
    md: "h-2.5 w-2.5",
    lg: "h-3.5 w-3.5",
};
const ringSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-7 w-7",
};
const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
};
function StatusIndicator({ status, label, size = "md", className, }) {
    const isActive = status === "healthy" || status === "degraded";
    const displayLabel = label ?? statusLabels[status];
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)("inline-flex items-center gap-2", className), children: [(0, jsx_runtime_1.jsxs)("div", { className: "relative flex items-center justify-center", children: [isActive && ((0, jsx_runtime_1.jsx)(framer_motion_1.motion.div, { className: (0, clsx_1.default)("absolute rounded-full", ringSizes[size], statusRingColors[status]), animate: {
                            scale: [1, 1.8, 1],
                            opacity: [0.6, 0, 0.6],
                        }, transition: {
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                        } })), (0, jsx_runtime_1.jsx)(framer_motion_1.motion.div, { className: (0, clsx_1.default)("relative rounded-full", dotSizes[size], statusColors[status]), animate: isActive
                            ? { scale: [1, 1.15, 1] }
                            : {}, transition: isActive
                            ? { duration: 2, repeat: Infinity, ease: "easeInOut" }
                            : {} })] }), displayLabel && ((0, jsx_runtime_1.jsx)("span", { className: (0, clsx_1.default)("font-medium", textSizes[size], status === "healthy" && "text-accent-success", status === "degraded" && "text-accent-warning", status === "down" && "text-accent-error", status === "unknown" && "text-gray-400"), children: displayLabel }))] }));
}
//# sourceMappingURL=StatusIndicator.js.map