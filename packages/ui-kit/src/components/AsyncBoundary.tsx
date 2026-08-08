"use client";

import React from "react";
import { Alert, PageLoader } from "./Feedback";
import { Icon } from "./Icon";

export interface AsyncBoundaryProps {
  children: React.ReactNode;
  loadingFallback?: React.ReactNode;
  errorFallback?: React.ReactNode | ((error: Error, retry: () => void) => React.ReactNode);
  loadingLabel?: string;
  /** Changing any reset key clears a previously captured render error. */
  resetKeys?: readonly unknown[];
  onError?: (error: Error, info: React.ErrorInfo) => void;
  onRetry?: () => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

class RenderErrorBoundary extends React.Component<
  Omit<AsyncBoundaryProps, "loadingFallback" | "loadingLabel">,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.props.onError?.(error, info);
  }

  componentDidUpdate(previousProps: Readonly<AsyncBoundaryProps>) {
    if (
      this.state.error &&
      previousProps.resetKeys &&
      this.props.resetKeys &&
      (previousProps.resetKeys.length !== this.props.resetKeys.length ||
        previousProps.resetKeys.some(
          (key, index) => !Object.is(key, this.props.resetKeys?.[index]),
        ))
    ) {
      this.setState({ error: null });
    }
  }

  retry = () => {
    this.setState({ error: null });
    this.props.onRetry?.();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (typeof this.props.errorFallback === "function") {
      return this.props.errorFallback(error, this.retry);
    }
    if (this.props.errorFallback) return this.props.errorFallback;

    return (
      <Alert title="This content could not be loaded" tone="danger">
        <p>Try again. If the problem continues, return to the previous page.</p>
        <button
          type="button"
          onClick={this.retry}
          className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-ui-md border border-ui-danger/30 px-3 font-semibold text-ui-danger hover:bg-ui-danger/10"
        >
          <Icon name="refresh" size="sm" />
          Try again
        </button>
      </Alert>
    );
  }
}

/**
 * One boundary for Suspense loading and recoverable render failures.
 * Data libraries may suspend beneath it without each portal inventing states.
 */
export function AsyncBoundary({
  children,
  loadingFallback,
  loadingLabel,
  ...errorBoundaryProps
}: AsyncBoundaryProps) {
  return (
    <RenderErrorBoundary {...errorBoundaryProps}>
      <React.Suspense fallback={loadingFallback ?? <PageLoader label={loadingLabel} />}>
        {children}
      </React.Suspense>
    </RenderErrorBoundary>
  );
}
