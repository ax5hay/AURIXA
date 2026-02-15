"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Hospital portal error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-amber-200">
          <h3 className="font-semibold mb-2">Something went wrong</h3>
          <p className="text-sm text-white/70 mb-4">
            {this.state.error?.message ?? "An unexpected error occurred. Try refreshing or selecting different staff."}
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 rounded-lg bg-amber-600/50 hover:bg-amber-600 text-white text-sm"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
