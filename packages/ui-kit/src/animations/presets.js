"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.staggerTransition = exports.staggerChildren = exports.scaleIn = exports.slideDown = exports.slideUp = exports.fadeOut = exports.fadeIn = void 0;
exports.fadeIn = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { duration: 0.3, ease: "easeOut" },
    },
};
exports.fadeOut = {
    visible: { opacity: 1 },
    hidden: {
        opacity: 0,
        transition: { duration: 0.2, ease: "easeIn" },
    },
};
exports.slideUp = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.4, ease: "easeOut" },
    },
};
exports.slideDown = {
    hidden: { opacity: 0, y: -20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.4, ease: "easeOut" },
    },
};
exports.scaleIn = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: { duration: 0.3, ease: "easeOut" },
    },
};
exports.staggerChildren = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.05,
        },
    },
};
exports.staggerTransition = {
    staggerChildren: 0.1,
    delayChildren: 0.05,
};
//# sourceMappingURL=presets.js.map