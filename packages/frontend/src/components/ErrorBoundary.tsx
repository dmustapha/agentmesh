'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="glass-card p-8 text-center animate-fade-in">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-mesh-red/10 border border-mesh-red/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-mesh-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
            </svg>
          </div>
          <p className="text-mesh-muted font-medium text-sm">Something went wrong</p>
          <p className="text-mesh-muted-dim text-xs mt-1">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 px-4 py-2 rounded-lg text-sm text-mesh-accent hover:text-mesh-accent-light border border-mesh-accent/20 hover:border-mesh-accent/40 transition-all duration-300"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
