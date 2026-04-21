/**
 * SkeletonCard — shimmer placeholder while data loads.
 * Drop-in replacement for any card section.
 */

export function SkeletonStatGrid() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="skeleton skeleton-stat-card" />
      ))}
    </div>
  );
}

export function SkeletonDealList({ rows = 4 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton skeleton-deal-row" />
      ))}
    </div>
  );
}

export function SkeletonText({ lines = 2 }) {
  const widths = ['full', 'medium', 'short', 'full', 'medium'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`skeleton skeleton-row ${widths[i % widths.length]}`} />
      ))}
    </div>
  );
}
