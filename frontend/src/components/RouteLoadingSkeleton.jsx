import React from 'react';

export default function RouteLoadingSkeleton() {
  return (
    <div
      className="skeleton-container"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading page content"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        padding: '8px 0',
        width: '100%',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      {/* Top Banner Skeleton */}
      <div className="skeleton-box" style={{ height: '72px', borderRadius: 'var(--radius-lg, 18px)' }} />

      {/* Metric Cards Skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="skeleton-box" style={{ height: '110px', borderRadius: 'var(--radius-lg, 18px)' }} />
        <div className="skeleton-box" style={{ height: '110px', borderRadius: 'var(--radius-lg, 18px)' }} />
        <div className="skeleton-box" style={{ height: '110px', borderRadius: 'var(--radius-lg, 18px)' }} />
      </div>

      {/* Main Content Card Skeleton */}
      <div className="skeleton-box" style={{ height: '280px', borderRadius: 'var(--radius-lg, 18px)' }} />
    </div>
  );
}
