import React from "react";
export interface ModalProps {
    open: boolean;
    onClose: () => void;
    title?: React.ReactNode;
    children: React.ReactNode;
    size?: "sm" | "md" | "lg" | "xl";
    closeOnBackdrop?: boolean;
    closeOnEscape?: boolean;
    className?: string;
}
export declare function Modal({ open, onClose, title, children, size, closeOnBackdrop, closeOnEscape, className, }: ModalProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=Modal.d.ts.map