import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '65vh',
      padding: '32px 16px',
      textAlign: 'center'
    }}>
      <div style={{
        background: 'var(--primary-light, #e6f4f1)',
        color: 'var(--primary, #1f8a7a)',
        padding: '20px',
        borderRadius: '50%',
        marginBottom: '20px'
      }}>
        <Compass size={48} />
      </div>
      <h1 style={{ fontSize: '2rem', marginBottom: '12px' }}>Page not found</h1>
      <p style={{ color: 'var(--text-muted, #64748b)', maxWidth: '440px', marginBottom: '28px', fontSize: '1rem', lineHeight: '1.5' }}>
        The page you are looking for doesn't exist, was deleted, or belongs to another group.
      </p>
      <Link to="/" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
        <Home size={16} />
        Back to home
      </Link>
    </div>
  );
}
