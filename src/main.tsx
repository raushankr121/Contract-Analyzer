import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled Application Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0c151c',
          color: '#f8fafc',
          padding: '2rem',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            background: '#162633',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '600px',
            width: '100%',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
          }}>
            <h2 style={{ color: '#ef4444', marginBottom: '0.75rem', fontSize: '1.25rem' }}>
              Application Render Exception
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginBottom: '1rem' }}>
              An unexpected error occurred during rendering. You can reload the application below:
            </p>
            <pre style={{
              background: '#091218',
              color: '#fca5a5',
              padding: '1rem',
              borderRadius: '8px',
              fontSize: '0.78rem',
              overflowX: 'auto',
              marginBottom: '1.25rem',
              whiteSpace: 'pre-wrap'
            }}>
              {this.state.error?.message || 'Unknown error'}
            </pre>
            <button
              onClick={async () => {
                localStorage.removeItem('aggroso_contracts_v1');
                localStorage.removeItem('aggroso_policy_v1');
                try {
                  await fetch('/api/contracts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify([]),
                  });
                } catch (_) {}
                window.location.reload();
              }}
              style={{
                background: '#d4b26f',
                color: '#0c151c',
                border: 'none',
                fontWeight: 700,
                padding: '0.65rem 1.25rem',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Reset Cache & Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>,
);
