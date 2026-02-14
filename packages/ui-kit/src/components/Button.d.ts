import React from "react";
import { type HTMLMotionProps } from "framer-motion";
export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";
export interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
}
export declare const Button: React.ForwardRefExoticComponent<Omit<ButtonProps, "ref"> & React.RefAttributes<HTMLButtonElement>>;
//# sourceMappingURL=Button.d.ts.map