import React from "react";
import { type HTMLMotionProps } from "framer-motion";
export interface CardProps extends HTMLMotionProps<"div"> {
    header?: React.ReactNode;
    hoverable?: boolean;
    padding?: "none" | "sm" | "md" | "lg";
    children: React.ReactNode;
}
export declare const Card: React.ForwardRefExoticComponent<Omit<CardProps, "ref"> & React.RefAttributes<HTMLDivElement>>;
//# sourceMappingURL=Card.d.ts.map