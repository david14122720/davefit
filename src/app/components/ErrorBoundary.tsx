import React, { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Algo salió mal</h2>
          <p className="text-on-surface-variant text-sm mb-6 max-w-md">
            Ocurrió un error inesperado. Esto no debería pasar — si persiste, contacta al soporte.
          </p>
          <button
            onClick={this.handleRetry}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-hover transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Reintentar
          </button>
          {import.meta.env.DEV && this.state.error && (
            <pre className="mt-6 p-4 bg-red-950/50 rounded-lg text-red-300 text-xs max-w-xl overflow-auto text-left">
              {this.state.error.message}
              {this.state.error.stack && `\n\n${this.state.error.stack}`}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
