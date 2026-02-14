"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineVisualizer = PipelineVisualizer;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importDefault(require("react"));
const framer_motion_1 = require("framer-motion");
const clsx_1 = __importDefault(require("clsx"));
const statusColors = {
    pending: {
        bg: "bg-surface-elevated",
        border: "border-white/10",
        text: "text-gray-500",
        dot: "bg-gray-500",
    },
    active: {
        bg: "bg-aurixa-600/10",
        border: "border-aurixa-500/40",
        text: "text-aurixa-300",
        dot: "bg-aurixa-500",
    },
    complete: {
        bg: "bg-accent-success/10",
        border: "border-accent-success/30",
        text: "text-accent-success",
        dot: "bg-accent-success",
    },
    error: {
        bg: "bg-accent-error/10",
        border: "border-accent-error/30",
        text: "text-accent-error",
        dot: "bg-accent-error",
    },
};
function StepIcon({ status }) {
    const colors = statusColors[status];
    if (status === "complete") {
        return ((0, jsx_runtime_1.jsx)(framer_motion_1.motion.div, { className: (0, clsx_1.default)("flex h-6 w-6 items-center justify-center rounded-full", colors.dot), initial: { scale: 0 }, animate: { scale: 1 }, transition: { type: "spring", stiffness: 300, damping: 20 }, children: (0, jsx_runtime_1.jsx)("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "white", strokeWidth: "3", strokeLinecap: "round", strokeLinejoin: "round", children: (0, jsx_runtime_1.jsx)("polyline", { points: "20 6 9 17 4 12" }) }) }));
    }
    if (status === "error") {
        return ((0, jsx_runtime_1.jsx)(framer_motion_1.motion.div, { className: (0, clsx_1.default)("flex h-6 w-6 items-center justify-center rounded-full", colors.dot), initial: { scale: 0 }, animate: { scale: 1 }, transition: { type: "spring", stiffness: 300, damping: 20 }, children: (0, jsx_runtime_1.jsxs)("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "white", strokeWidth: "3", strokeLinecap: "round", strokeLinejoin: "round", children: [(0, jsx_runtime_1.jsx)("line", { x1: "18", y1: "6", x2: "6", y2: "18" }), (0, jsx_runtime_1.jsx)("line", { x1: "6", y1: "6", x2: "18", y2: "18" })] }) }));
    }
    if (status === "active") {
        return ((0, jsx_runtime_1.jsxs)("div", { className: "relative flex items-center justify-center", children: [(0, jsx_runtime_1.jsx)(framer_motion_1.motion.div, { className: (0, clsx_1.default)("absolute h-6 w-6 rounded-full", "bg-aurixa-500/30"), animate: { scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }, transition: { duration: 2, repeat: Infinity, ease: "easeInOut" } }), (0, jsx_runtime_1.jsx)(framer_motion_1.motion.div, { className: (0, clsx_1.default)("h-6 w-6 rounded-full", colors.dot), animate: { scale: [1, 1.1, 1] }, transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" } })] }));
    }
    return ((0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("h-6 w-6 rounded-full border-2", "border-gray-600 bg-surface-tertiary") }));
}
function Connector({ fromStatus, toStatus, orientation, }) {
    const isComplete = fromStatus === "complete";
    const isActive = fromStatus === "complete" &&
        (toStatus === "active" || toStatus === "complete");
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)("relative overflow-hidden", orientation === "horizontal" ? "h-0.5 flex-1 min-w-6" : "w-0.5 h-6 mx-auto"), children: [(0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("absolute bg-surface-elevated", orientation === "horizontal" ? "inset-0" : "inset-0") }), (0, jsx_runtime_1.jsx)(framer_motion_1.motion.div, { className: (0, clsx_1.default)("absolute", orientation === "horizontal" ? "inset-y-0 left-0" : "inset-x-0 top-0", isComplete ? "bg-accent-success" : isActive ? "bg-aurixa-500" : "bg-surface-elevated"), initial: orientation === "horizontal" ? { width: "0%" } : { height: "0%" }, animate: orientation === "horizontal"
                    ? { width: isComplete || isActive ? "100%" : "0%" }
                    : { height: isComplete || isActive ? "100%" : "0%" }, transition: { duration: 0.5, ease: "easeOut", delay: 0.2 } })] }));
}
function StepCard({ step, index, orientation, }) {
    const colors = statusColors[step.status];
    return ((0, jsx_runtime_1.jsxs)(framer_motion_1.motion.div, { className: (0, clsx_1.default)("flex items-center gap-3 rounded-lg border px-3 py-2.5", colors.bg, colors.border, orientation === "horizontal" ? "min-w-[140px]" : "w-full"), initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3, delay: index * 0.1 }, children: [(0, jsx_runtime_1.jsx)(StepIcon, { status: step.status }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-0.5 min-w-0", children: [(0, jsx_runtime_1.jsx)("span", { className: (0, clsx_1.default)("text-sm font-medium truncate", colors.text), children: step.label }), step.progress !== undefined && step.status === "active" && ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("div", { className: "h-1 w-16 overflow-hidden rounded-full bg-surface-primary", children: (0, jsx_runtime_1.jsx)(framer_motion_1.motion.div, { className: "h-full rounded-full bg-aurixa-500", initial: { width: 0 }, animate: { width: `${Math.min(100, Math.max(0, step.progress))}%` }, transition: { duration: 0.4, ease: "easeOut" } }) }), (0, jsx_runtime_1.jsxs)("span", { className: "text-[10px] font-mono text-aurixa-400", children: [Math.round(step.progress), "%"] })] })), step.status === "complete" && ((0, jsx_runtime_1.jsx)("span", { className: "text-[10px] text-accent-success/70", children: "Complete" })), step.status === "error" && ((0, jsx_runtime_1.jsx)("span", { className: "text-[10px] text-accent-error/70", children: "Failed" })), step.status === "pending" && ((0, jsx_runtime_1.jsx)("span", { className: "text-[10px] text-gray-600", children: "Pending" }))] })] }));
}
function PipelineVisualizer({ steps, orientation = "horizontal", className, }) {
    return ((0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("flex", orientation === "horizontal"
            ? "flex-row items-center gap-0"
            : "flex-col items-stretch gap-0", className), children: steps.map((step, index) => ((0, jsx_runtime_1.jsxs)(react_1.default.Fragment, { children: [(0, jsx_runtime_1.jsx)(StepCard, { step: step, index: index, orientation: orientation }), index < steps.length - 1 && ((0, jsx_runtime_1.jsx)(Connector, { fromStatus: step.status, toStatus: steps[index + 1].status, orientation: orientation }))] }, step.id))) }));
}
//# sourceMappingURL=PipelineVisualizer.js.map