/**
 * DealCard — reusable card component for displaying deal information.
 *
 * Features: risk color bar, glassmorphic bg, status/risk badges,
 *           margin stats, hover elevation, optional action buttons.
 *           Clicking the card opens the DealDetailModal.
 */
import { useState } from 'react';
import DealDetailModal from './DealDetailModal';

export default function DealCard({ deal, actions, className = '', onRefresh }) {
  const [modalOpen, setModalOpen] = useState(false);
  const risk   = (deal.risk_level || 'LOW').toLowerCase();
  const status = (deal.status    || 'PENDING').toLowerCase();

  function formatCurrency(val) {
    if (val == null) return '—';
    return '₹' + Number(val).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }

  function formatPercent(val) {
    if (val == null) return '—';
    return Number(val).toFixed(1) + '%';
  }

  function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <>
      <div
        className={`card deal-card-enter ${className}`}
        id={`deal-${deal.id}`}
        onClick={() => setModalOpen(true)}
        style={{ cursor: 'pointer' }}
        title="Click for full details"
      >
        <div className={`card-risk-bar ${risk}`} />

        <div className="card-header" style={{ paddingLeft: '12px' }}>
          <div>
            <div className="card-title">{deal.customer_name || 'Unknown'}</div>
            <div className="card-subtitle">{deal.variant}</div>
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            {deal.branch_name && (
              <span className={`branch-tag${deal.branch_name === 'BERHAMPORE' ? ' branch-hq' : ''}`}
                style={{ fontSize: '11px', padding: '2px 6px' }}>
                {deal.branch_name}
              </span>
            )}
            <span className={`badge badge-${risk}`}>
              {risk === 'low' ? '🟢' : risk === 'medium' ? '🟡' : '🔴'} {deal.risk_level}
            </span>
            <span className={`badge badge-${status}`}>
              {deal.status}
            </span>
          </div>
        </div>

        <div className="card-body" style={{ paddingLeft: '12px' }}>
          <div className="card-stat">
            <span className="card-stat-label">Base Price</span>
            <span className="card-stat-value currency">{formatCurrency(deal.base_price)}</span>
          </div>
          <div className="card-stat">
            <span className="card-stat-label">Discount</span>
            <span className="card-stat-value currency" style={{ color: deal.discount > 0 ? 'var(--risk-high)' : 'var(--text-primary)' }}>
              {formatCurrency(deal.discount)}
            </span>
          </div>
          <div className="card-stat">
            <span className="card-stat-label">Final Price</span>
            <span className="card-stat-value currency">{formatCurrency(deal.final_price)}</span>
          </div>
          <div className="card-stat">
            <span className="card-stat-label">Margin</span>
            <span className="card-stat-value">{formatPercent(deal.margin_percent)}</span>
          </div>
        </div>

        {deal.reason && (
          <div style={{ paddingLeft: '12px', marginTop: 'var(--space-sm)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {deal.decision === 'AUTO_APPROVE' ? '✅' : deal.decision === 'GM_APPROVAL' ? '⚠️' : '🚨'}{' '}
              {deal.reason}
            </span>
          </div>
        )}

        {deal.created_at && (
          <div style={{ paddingLeft: '12px', marginTop: 'var(--space-xs)' }}>
            <span className="time-ago">{timeAgo(deal.created_at)}</span>
          </div>
        )}

        {actions && actions.length > 0 && (
          <div className="card-actions" style={{ paddingLeft: '12px' }}>
            {actions.map((action, i) => (
              <button
                key={i}
                id={action.id}
                className={`btn btn-sm ${action.variant || 'btn-ghost'}`}
                onClick={(e) => {
                  e.stopPropagation(); // Don't open modal when clicking actions
                  action.onClick();
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <DealDetailModal
          dealId={deal.id}
          onClose={() => setModalOpen(false)}
          onRefresh={onRefresh}
        />
      )}
    </>
  );
}
