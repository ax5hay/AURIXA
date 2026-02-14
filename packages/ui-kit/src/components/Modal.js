"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Modal = Modal;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const framer_motion_1 = require("framer-motion");
const clsx_1 = __importDefault(require("clsx"));
const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
};
const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
};
const modalVariants = {
    hidden: {
        opacity: 0,
        scale: 0.95,
        y: 10,
    },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: {
            type: "spring",
            stiffness: 300,
            damping: 25,
        },
    },
    exit: {
        opacity: 0,
        scale: 0.95,
        y: 10,
        transition: {
            duration: 0.15,
            ease: "easeIn",
        },
    },
};
function Modal({ open, onClose, title, children, size = "md", closeOnBackdrop = true, closeOnEscape = true, className, }) {
    const handleEscape = (0, react_1.useCallback)((e) => {
        if (e.key === "Escape" && closeOnEscape) {
            onClose();
        }
    }, [onClose, closeOnEscape]);
    (0, react_1.useEffect)(() => {
        if (open) {
            document.addEventListener("keydown", handleEscape);
            document.body.style.overflow = "hidden";
        }
        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.body.style.overflow = "";
        };
    }, [open, handleEscape]);
    const handleBackdropClick = (e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) {
            onClose();
        }
    };
    return ((0, jsx_runtime_1.jsx)(framer_motion_1.AnimatePresence, { children: open && ((0, jsx_runtime_1.jsxs)(framer_motion_1.motion.div, { className: "fixed inset-0 z-50 flex items-center justify-center p-4", variants: backdropVariants, initial: "hidden", animate: "visible", exit: "hidden", transition: { duration: 0.2 }, children: [(0, jsx_runtime_1.jsx)(framer_motion_1.motion.div, { className: "absolute inset-0 bg-black/60 backdrop-blur-sm", onClick: handleBackdropClick, initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.2 } }), (0, jsx_runtime_1.jsxs)(framer_motion_1.motion.div, { role: "dialog", "aria-modal": "true", "aria-label": typeof title === "string" ? title : undefined, variants: modalVariants, initial: "hidden", animate: "visible", exit: "exit", className: (0, clsx_1.default)("relative z-10 w-full rounded-xl border border-white/[0.08] bg-surface-secondary shadow-2xl", sizeClasses[size], className), children: [title && ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between border-b border-white/[0.06] px-6 py-4", children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-lg font-semibold text-white", children: title }), (0, jsx_runtime_1.jsx)("button", { onClick: onClose, className: "rounded-md p-1.5 text-gray-400 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aurixa-500", "aria-label": "Close modal", children: (0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [(0, jsx_runtime_1.jsx)("line", { x1: "18", y1: "6", x2: "6", y2: "18" }), (0, jsx_runtime_1.jsx)("line", { x1: "6", y1: "6", x2: "18", y2: "18" })] }) })] })), (0, jsx_runtime_1.jsx)("div", { className: "px-6 py-5", children: children })] })] })) }));
}
//# sourceMappingURL=Modal.js.map