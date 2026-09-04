import React from 'react';

/**
 * Error Boundary — catches any unhandled React rendering errors
 * and shows a clean recovery UI instead of a silent blank screen.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught error:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            background: '#030712',
            color: '#fff',
            fontFamily: "'Cairo', 'Segoe UI', sans-serif",
            textAlign: 'center',
            padding: '24px',
            gap: '20px',
          }}
        >
          <div style={{ fontSize: '3rem' }}>⚠️</div>
          <h1 style={{ fontSize: '1.5rem', color: '#ffd166', margin: 0 }}>
            حدث خطأ غير متوقع
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', maxWidth: '480px', lineHeight: 1.7 }}>
            تعذّر تحميل التطبيق بشكل صحيح. يمكنك إعادة المحاولة أو التواصل مع الدعم إذا استمرت المشكلة.
          </p>
          {this.state.error && (
            <pre
              style={{
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '12px 16px',
                fontSize: '0.75rem',
                color: '#f87171',
                maxWidth: '560px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                textAlign: 'left',
                direction: 'ltr',
              }}
            >
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={this.handleReload}
            style={{
              background: '#e5b869',
              color: '#030712',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 28px',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            إعادة تحميل الصفحة
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
