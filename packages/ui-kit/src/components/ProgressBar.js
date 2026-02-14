"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProgressBar = ProgressBar;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importDefault(require("react"));
const framer_motion_1 = require("framer-motion");
const clsx_1 = __importDefault(require("clsx"));
function getProgressColor(progress) {
    if (progress < 25)
        return "from-accent-error to-accent-warning";
    if (progress < 50)
        return "from-accent-warning to-yellow-300";
    if (progress < 75)
        return "from-yellow-300 to-aurixa-400";
    if (progress < 100)
        return "from-aurixa-400 to-accent-success";
    return "from-accent-success to-green-300";
}
function getProgressGlow(progress) {
    if (progress < 25)
        return "shadow-accent-error/40";
    if (progress < 50)
        return "shadow-accent-warning/40";
    if (progress < 75)
        return "shadow-aurixa-400/40";
    return "shadow-accent-success/40";
}
function ProgressBar({ progress, label, steps, currentStep, className, }) {
    const clampedProgress = Math.min(100, Math.max(0, progress));
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)("w-full", className), children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-2 flex items-center justify-between", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-sm font-medium text-gray-200", children: label }), (0, jsx_runtime_1.jsxs)(framer_motion_1.motion.span, { className: "text-sm font-mono font-semibold text-white", initial: { opacity: 0.6, y: -4 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.2 }, children: [Math.round(clampedProgress), "%"] }, Math.round(clampedProgress))] }), (0, jsx_runtime_1.jsxs)("div", { className: "relative h-2.5 w-full overflow-hidden rounded-full bg-surface-tertiary", children: [(0, jsx_runtime_1.jsx)(framer_motion_1.motion.div, { className: (0, clsx_1.default)("absolute inset-y-0 left-0 rounded-full bg-gradient-to-r shadow-lg", getProgressColor(clampedProgress), getProgressGlow(clampedProgress)), initial: { width: 0 }, animate: { width: `${clampedProgress}%` }, transition: {
                            duration: 0.6,
                            ease: "easeOut",
                        } }), clampedProgress > 0 && clampedProgress < 100 && ((0, jsx_runtime_1.jsx)(framer_motion_1.motion.div, { className: "absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent", style: { width: `${clampedProgress}%` }, animate: {
                            x: ["-100%", "100%"],
                        }, transition: {
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "linear",
                        } }))] }), steps && steps.length > 0 && ((0, jsx_runtime_1.jsx)("div", { className: "mt-3 flex items-center gap-1", children: steps.map((step, index) => {
                    const isActive = currentStep !== undefined && index === currentStep;
                    const isComplete = currentStep !== undefined && index < currentStep;
                    return ((0, jsx_runtime_1.jsxs)(react_1.default.Fragment, { children: [index > 0 && ((0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("h-px flex-1 transition-colors duration-300", isComplete ? "bg-accent-success" : "bg-surface-elevated") })), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col items-center gap-1", children: [(0, jsx_runtime_1.jsx)(framer_motion_1.motion.div, { className: (0, clsx_1.default)("flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold transition-colors duration-300", isComplete &&
                                            "bg-accent-success text-surface-primary", isActive &&
                                            "bg-aurixa-600 text-white ring-2 ring-aurixa-400/30", !isActive &&
                                            !isComplete &&
                                            "bg-surface-elevated text-gray-500"), animate: isActive
                                            ? { scale: [1, 1.1, 1] }
                                            : { scale: 1 }, transition: isActive
                                            ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
                                            : {}, children: isComplete ? ((0, jsx_runtime_1.jsx)("svg", { width: "10", height: "10", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "3", strokeLinecap: "round", strokeLinejoin: "round", children: (0, jsx_runtime_1.jsx)("polyline", { points: "20 6 9 17 4 12" }) })) : (index + 1) }), (0, jsx_runtime_1.jsx)("span", { className: (0, clsx_1.default)("text-[10px] whitespace-nowrap transition-colors duration-300", isActive && "text-aurixa-400 font-medium", isComplete && "text-accent-success", !isActive && !isComplete && "text-gray-500"), children: step })] })] }, index));
                }) }))] }));
}
//# sourceMappingURL=ProgressBar.js.map