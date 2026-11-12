import { Component } from 'react';
import { AlertTriangle, RotateCw } from './icons';

/**
 * Top-level safety net. Catches render/runtime errors from any child screen so
 * a single broken page shows a recoverable fallback instead of unmounting the
 * whole React tree into a black screen.
 *
 * Reset it by changing `resetKey` (e.g. the current route path) — navigating to
 * a healthy screen clears the error automatically.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidUpdate(prevProps) {
    // Clear the error when the caller signals a context change (e.g. route nav)
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  componentDidCatch(error, info) {
    // Keep a breadcrumb in the console for debugging; no external reporter yet.
    console.error('ErrorBoundary caught an error:', error, info?.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--gm-bg)]" data-testid="error-boundary-fallback">
        <div className="w-full max-w-md text-center">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-5 flex items-center justify-center bg-[var(--gm-card)]">
            <AlertTriangle className="w-7 h-7 text-[var(--gm-ink)]" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-black font-['Archivo'] text-[var(--gm-ink)] mb-2">Something went wrong</h1>
          <p className="text-sm text-[var(--gm-muted)] mb-6">
            This screen hit an unexpected error. Your streak and progress are safe — try again or head back home.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button onClick={this.handleReload}
              className="inline-flex items-center gap-2 px-5 h-11 rounded-full bg-[#95DEE6] text-[#183A3F] text-sm font-bold"
              data-testid="error-boundary-retry">
              <RotateCw className="w-4 h-4" /> Try again
            </button>
            <a href="/dashboard" className="inline-flex items-center px-5 h-11 rounded-full bg-[var(--gm-card)] text-[var(--gm-ink)] text-sm font-bold">
              Go home
            </a>
          </div>
        </div>
      </div>
    );
  }
}
