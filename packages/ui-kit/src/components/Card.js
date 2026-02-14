"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Card = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importDefault(require("react"));
const framer_motion_1 = require("framer-motion");
const clsx_1 = __importDefault(require("clsx"));
const paddingClasses = {
    none: "",
    sm: "p-3",
    md: "p-5",
    lg: "p-7",
};
const headerPaddingClasses = {
    none: "px-0 py-0",
    sm: "px-3 py-2",
    md: "px-5 py-3",
    lg: "px-7 py-4",
};
exports.Card = react_1.default.forwardRef(({ header, hoverable = false, padding = "md", children, className, ...props }, ref) => {
    return ((0, jsx_runtime_1.jsxs)(framer_motion_1.motion.div, { ref: ref, initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3, ease: "easeOut" }, whileHover: hoverable
            ? {
                y: -2,
                boxShadow: "0 8px 30px rgba(0, 0, 0, 0.3)",
                transition: { duration: 0.2 },
            }
            : undefined, className: (0, clsx_1.default)("rounded-xl border border-white/[0.06] bg-surface-secondary shadow-lg", "overflow-hidden", className), ...props, children: [header && ((0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("border-b border-white/[0.06] bg-surface-tertiary/50", headerPaddingClasses[padding]), children: header })), (0, jsx_runtime_1.jsx)("div", { className: paddingClasses[padding], children: children })] }));
});
exports.Card.displayName = "Card";
//# sourceMappingURL=Card.js.map