"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Button = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importDefault(require("react"));
const framer_motion_1 = require("framer-motion");
const clsx_1 = __importDefault(require("clsx"));
const variantClasses = {
    primary: "bg-aurixa-600 text-white hover:bg-aurixa-700 active:bg-aurixa-800 shadow-md shadow-aurixa-600/25",
    secondary: "bg-surface-tertiary text-gray-200 hover:bg-surface-elevated active:bg-surface-elevated border border-white/10",
    danger: "bg-accent-error text-white hover:bg-red-500 active:bg-red-600 shadow-md shadow-accent-error/25",
    ghost: "bg-transparent text-gray-300 hover:bg-white/5 active:bg-white/10",
};
const sizeClasses = {
    sm: "px-3 py-1.5 text-sm rounded-md gap-1.5",
    md: "px-4 py-2 text-sm rounded-lg gap-2",
    lg: "px-6 py-3 text-base rounded-lg gap-2.5",
};
const spinnerSizes = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-5 w-5",
};
function Spinner({ size }) {
    return ((0, jsx_runtime_1.jsxs)(framer_motion_1.motion.svg, { className: (0, clsx_1.default)("animate-spin", spinnerSizes[size]), xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", initial: { opacity: 0, scale: 0.8 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.8 }, transition: { duration: 0.15 }, children: [(0, jsx_runtime_1.jsx)("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }), (0, jsx_runtime_1.jsx)("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" })] }));
}
exports.Button = react_1.default.forwardRef(({ variant = "primary", size = "md", loading = false, disabled = false, children, className, ...props }, ref) => {
    const isDisabled = disabled || loading;
    return ((0, jsx_runtime_1.jsxs)(framer_motion_1.motion.button, { ref: ref, whileHover: isDisabled ? undefined : { scale: 1.02 }, whileTap: isDisabled ? undefined : { scale: 0.98 }, transition: { type: "spring", stiffness: 400, damping: 25 }, className: (0, clsx_1.default)("inline-flex items-center justify-center font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aurixa-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-primary", variantClasses[variant], sizeClasses[size], isDisabled && "opacity-50 cursor-not-allowed pointer-events-none", className), disabled: isDisabled, ...props, children: [loading && (0, jsx_runtime_1.jsx)(Spinner, { size: size }), children] }));
});
exports.Button.displayName = "Button";
//# sourceMappingURL=Button.js.map