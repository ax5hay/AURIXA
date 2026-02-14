export interface PipelineStep {
    id: string;
    label: string;
    status: "pending" | "active" | "complete" | "error";
    progress?: number;
}
export interface PipelineVisualizerProps {
    steps: PipelineStep[];
    orientation?: "horizontal" | "vertical";
    className?: string;
}
export declare function PipelineVisualizer({ steps, orientation, className, }: PipelineVisualizerProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=PipelineVisualizer.d.ts.map