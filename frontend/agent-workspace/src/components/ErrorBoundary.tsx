"use client";

import { Component, type ReactNode } from "react";
import { Alert, Button } from "@aurixa/ui-kit";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <Alert title="This clinical view could not load" tone="danger">
          <p>No patient details are displayed. Retry the view or return to today’s work.</p>
          <Button className="mt-3" onClick={() => this.setState({ hasError: false })}>
            Try again
          </Button>
        </Alert>
      );
    }
    return this.props.children;
  }
}
