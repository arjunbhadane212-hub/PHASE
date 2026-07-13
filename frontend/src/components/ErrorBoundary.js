import { Component } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';

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
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ backgroundColor: 'var(--color-bg, #0A0E14)' }}
        data-testid="error-boundary-fallback"
      >
        <div className="w-full max-w-md text-center">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-5 flex items-center justify-center bg-blue-500/10 border border-blue-500/20">
            <AlertTriangle className="w-7 h-7 text-blue-400" strokeWidth={2} />
          </div>
          <h1 className="text-xl font-bold font-['Satoshi'] text-white mb-2">
            Something went wrong
          </h1>
          <p className="text-sm text-zinc-400 mb-6">
            This screen hit an unexpected error. The rest of the app is still fine —
            try again or head back home.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 px-4 h-11 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
              data-testid="error-boundary-retry"
            >
              <RotateCw className="w-4 h-4" />
              Try again
            </button>
            <a
              href="/dashboard"
              className="inline-flex items-center px-4 h-11 rounded-xl border border-white/10 text-zinc-300 hover:bg-white/[0.04] text-sm font-medium transition-colors"
            >
              Go home
            </a>
          </div>
        </div>
      </div>
    );
  }
}
