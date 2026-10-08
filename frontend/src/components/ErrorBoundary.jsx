import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('GroupSpend caught an unhandled application error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '70vh',
          padding: '24px',
          textAlign: 'center'
        }}>
          <div style={{
            background: 'var(--danger-light, #fef2f2)',
            color: 'var(--danger, #ef4444)',
            padding: '16px',
            borderRadius: '50%',
            marginBottom: '16px'
          }}>
            <AlertTriangle size={40} />
          </div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Something went wrong</h2>
          <p style={{ color: 'var(--text-muted, #64748b)', maxWidth: '420px', marginBottom: '24px', fontSize: '0.95rem' }}>
            An unexpected error occurred while loading this view. You can reload or return to the main dashboard.
          </p>
          <button
            onClick={this.handleReload}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <RotateCcw size={16} />
            Reload app
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
