/**
 * DealDetailModal — full deal view with audit event timeline.
 *
 * Opens when a DealCard is clicked. Fetches GET /deals/{id} which
 * returns the deal + all DealEvent audit records.
 * Provides contextual approve/reject actions if deal is PENDING.
 */
import { useState, useEffect, useCallback } from 'react';
import { fetchDealDetail, approveGM, approveDirector, rejectDeal } from '../api';

const EVENT_ICONS = {
  DEAL_CREATED: '🟢',
  APPROVED_BY_GM: '✅',
  APPROVED_BY_DIRECTOR: '✅',
  ESCALATED_TO_DIRECTOR: '🔺',
  DEAL_REJECTED: '❌',
};

function formatCurrency(val) {
  if (val == null) return '—';
  return '₹' + Number(val).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function formatPercent(val) {
  if (val == null) return '—';
  return Number(val).toFixed(2) + '%';
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function Field({ label, value, accent }) {
  return (
    <div className="modal-field">
      <div className="modal-field-label">{label}</div>
      <div className={`modal-field-value ${accent || ''}`}>{value}</div>
    </div>
  );
}

export default function DealDetailModal({ dealId, onClose, onRefresh }) {
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!dealId) return;
    setLoading(true);
    fetchDealDetail(dealId)
      .then(setDeal)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [dealId]);

  useEffect(() => {
    load();
  }, [load]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  async function handleAction(fn) {
    setActioning(true);
    setError('');
    try {
      await fn();
      onRefresh?.();
      onClose();
    } catch (e) {
      setError(e.message);
    }
    setActioning(false);
  }

  const risk = deal ? (deal.risk_level || 'LOW').toLowerCase() : 'low';
  const status = deal ? (deal.status || 'PENDING').toLowerCase() : 'pending';
  const isPending = deal?.status === 'PENDING';
  const needsGM   = deal?.approval_stage === 'GM';
  const needsDir  = deal?.approval_stage === 'DIRECTOR';

  return (
    <div className="modal-overlay" id="deal-detail-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-container" id="deal-detail-modal" role="dialog" aria-modal="true" aria-label="Deal Details">
        {/* Header */}
        <div className={`modal-header risk-border-${risk}`}>
          <div>
            <div className="modal-title">
              {deal?.customer_name || <span style={{ opacity: 0.4 }}>Loading...</span>}
            </div>
            <div className="modal-subtitle">
              {deal?.variant} &nbsp;·&nbsp;
              <span className={`badge badge-${risk}`}>{deal?.risk_level} RISK</span>
              &nbsp;
              <span className={`badge badge-${status}`}>{deal?.status}</span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close" id="modal-close-btn">✕</button>
        </div>

        {loading && (
          <div className="modal-body" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
            <span className="loading-spinner" style={{ width: 28, height: 28 }} />
          </div>
        )}

        {!loading && deal && (
          <>
            <div className="modal-body">
              {/* Pricing Grid */}
              <div className="modal-section-title">Deal Financials</div>
              <div className="modal-fields-grid">
                <Field label="Base Price" value={formatCurrency(deal.base_price)} />
                <Field label="Discount" value={formatCurrency(deal.discount)} accent={deal.discount > 0 ? 'negative' : ''} />
                <Field label="Final Price" value={formatCurrency(deal.final_price)} />
                <Field label="Margin" value={formatCurrency(deal.margin)} accent={deal.margin < 0 ? 'negative' : 'positive'} />
                <Field label="Margin %" value={formatPercent(deal.margin_percent)} accent={deal.margin < 0 ? 'negative' : 'positive'} />
                <Field label="Reg. Type" value={deal.registration_type} />
              </div>

              {/* Decision */}
              <div className="modal-section-title" style={{ marginTop: 'var(--space-lg)' }}>Profit Guard Decision</div>
              <div className="modal-decision-box">
                <span className="modal-decision-icon">
                  {deal.decision === 'AUTO_APPROVE' ? '✅' : deal.decision === 'GM_APPROVAL' ? '⚠️' : '🚨'}
                </span>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                    {deal.decision === 'AUTO_APPROVE' ? 'Auto-Approved' : deal.decision === 'GM_APPROVAL' ? 'GM Approval Required' : 'Director Approval Required'}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 2 }}>{deal.reason}</div>
                </div>
              </div>

              {/* Contact */}
              <div className="modal-section-title" style={{ marginTop: 'var(--space-lg)' }}>Customer</div>
              <div className="modal-fields-grid">
                <Field label="Name" value={deal.customer_name} />
                <Field label="Phone" value={deal.phone || '—'} />
                <Field label="Created" value={timeAgo(deal.created_at)} />
                <Field label="Approval Stage" value={deal.approval_stage || 'DONE'} />
              </div>

              {/* Audit Timeline */}
              {deal.events && deal.events.length > 0 && (
                <>
                  <div className="modal-section-title" style={{ marginTop: 'var(--space-lg)' }}>Audit Trail</div>
                  <div className="audit-timeline">
                    {deal.events.map((evt) => (
                      <div key={evt.id} className="audit-event">
                        <div className="audit-event-icon">{EVENT_ICONS[evt.event_type] || '📝'}</div>
                        <div className="audit-event-body">
                          <div className="audit-event-type">
                            {evt.event_type.replace(/_/g, ' ')}
                            {evt.actor_role && <span className="audit-event-role"> · {evt.actor_role}</span>}
                          </div>
                          <div className="audit-event-time">{timeAgo(evt.created_at)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Actions Footer */}
            {isPending && (
              <div className="modal-footer">
                {error && <div style={{ color: 'var(--risk-high)', fontSize: '0.8rem', marginBottom: 'var(--space-sm)' }}>⚠️ {error}</div>}
                <div className="modal-action-row">
                  {needsGM && (
                    <button
                      id="modal-approve-gm"
                      className="btn btn-success"
                      disabled={actioning}
                      onClick={() => handleAction(() => approveGM(deal.id))}
                    >
                      {actioning ? <span className="loading-spinner" /> : '✅ Approve (GM)'}
                    </button>
                  )}
                  {needsDir && (
                    <button
                      id="modal-approve-director"
                      className="btn btn-success"
                      disabled={actioning}
                      onClick={() => handleAction(() => approveDirector(deal.id))}
                    >
                      {actioning ? <span className="loading-spinner" /> : '✅ Approve (Director)'}
                    </button>
                  )}
                  <button
                    id="modal-reject"
                    className="btn btn-danger"
                    disabled={actioning}
                    onClick={() => handleAction(() => rejectDeal(deal.id))}
                  >
                    ❌ Reject
                  </button>
                  <button className="btn btn-ghost" onClick={onClose} style={{ marginLeft: 'auto' }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {!loading && error && !deal && (
          <div className="modal-body" style={{ color: 'var(--risk-high)', textAlign: 'center' }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
