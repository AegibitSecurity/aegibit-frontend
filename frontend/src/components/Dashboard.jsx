/**
 * Dashboard — Analytics & KPI overview for AEGIBIT Flow.
 *
 * Shows live KPI cards, SVG margin bar chart, risk donut,
 * and quick-action shortcuts. Refreshes on WebSocket events.
 */
import { useState, useEffect, useCallback } from 'react';
import { fetchDashboard, fetchDeals } from '../api';
import { useWebSocket } from '../hooks/useWebSocket';

function RiskDonut({ low = 0, medium = 0, high = 0 }) {
  const total = low + medium + high || 1;
  const r = 40;
  const cx = 56;
  const cy = 56;
  const circumference = 2 * Math.PI * r;

  const lowPct = low / total;
  const medPct = medium / total;
  const highPct = high / total;

  const segments = [
    { pct: lowPct, color: 'var(--risk-low)', label: 'LOW', count: low },
    { pct: medPct, color: 'var(--risk-medium)', label: 'MED', count: medium },
    { pct: highPct, color: 'var(--risk-high)', label: 'HIGH', count: high },
  ];

  let offset = 0;
  const arcs = segments.map((s) => {
    const dash = s.pct * circumference;
    const gap = circumference - dash;
    const el = (
      <circle
        key={s.label}
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={s.color}
        strokeWidth="14"
        strokeDasharray={`${dash} ${gap}`}
        strokeDashoffset={-offset * circumference}
        style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px`, opacity: s.pct > 0 ? 1 : 0 }}
      />
    );
    offset += s.pct;
    return el;
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)' }}>
      <svg width="112" height="112">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="14" />
        {arcs}
        <text x={cx} y={cy + 5} textAnchor="middle" fill="var(--text-primary)" fontSize="13" fontWeight="700">
          {low + medium + high}
        </text>
        <text x={cx} y={cy + 18} textAnchor="middle" fill="var(--text-muted)" fontSize="9">
          deals
        </text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {segments.map((s) => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, display: 'inline-block', flexShrink: 0 }} />
            <span style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600, marginLeft: 'auto' }}>{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MarginBars({ deals }) {
  if (!deals.length) {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-end', height: 80, gap: 4, padding: '0 4px' }}>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: 3, height: '20%' }} />
        ))}
      </div>
    );
  }

  const maxDiscount = Math.max(...deals.map((d) => Math.abs(d.discount)), 1);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', height: 80, gap: 3, padding: '0 4px' }}>
      {deals.map((d) => {
        const heightPct = Math.max(5, (Math.abs(d.discount) / maxDiscount) * 100);
        const color =
          d.status === 'APPROVED'
            ? 'var(--risk-low)'
            : d.status === 'REJECTED'
            ? 'var(--risk-high)'
            : 'var(--risk-medium)';
        return (
          <div
            key={d.id}
            title={`${d.customer_name} — ₹${d.discount.toLocaleString('en-IN')} discount`}
            style={{
              flex: 1,
              height: `${heightPct}%`,
              background: color,
              borderRadius: '3px 3px 0 0',
              opacity: 0.85,
              transition: 'opacity 0.2s',
              cursor: 'default',
              minWidth: 6,
            }}
          />
        );
      })}
    </div>
  );
}

export default function Dashboard({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [recentDeals, setRecentDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([fetchDashboard(), fetchDeals(null)])
      .then(([s, deals]) => {
        setStats(s);
        setRecentDeals(deals.slice(0, 20).reverse()); // oldest→newest for chart
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleWsEvent = useCallback(
    (event) => {
      if (['deal_created', 'deal_approved', 'deal_rejected', 'status_changed'].includes(event.type)) {
        loadData();
      }
    },
    [loadData]
  );

  useWebSocket(handleWsEvent);

  // Risk counts from recentDeals (all fetched)
  const riskCounts = recentDeals.reduce(
    (acc, d) => {
      const r = (d.risk_level || 'LOW').toUpperCase();
      acc[r] = (acc[r] || 0) + 1;
      return acc;
    },
    { LOW: 0, MEDIUM: 0, HIGH: 0 }
  );

  function formatCurrency(val) {
    if (val == null) return '—';
    return '₹' + Number(val).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }

  if (loading && !stats) {
    return (
      <div className="empty-state">
        <span className="loading-spinner" style={{ width: 30, height: 30 }} />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2>🏠 Dashboard</h2>
        <p>Real-time deal analytics & system health</p>
      </div>

      {/* KPI Row */}
      {stats && (
        <div className="stats-row" style={{ marginBottom: 'var(--space-xl)' }}>
          <div className="stat-card">
            <div className="stat-number accent">{stats.total_deals}</div>
            <div className="stat-label">Total Deals</div>
          </div>
          <div className="stat-card">
            <div className="stat-number green">{stats.approved}</div>
            <div className="stat-label">Approved</div>
          </div>
          <div className="stat-card">
            <div className="stat-number amber">{stats.pending}</div>
            <div className="stat-label">Pending</div>
          </div>
          <div className="stat-card">
            <div className="stat-number red">{stats.rejected}</div>
            <div className="stat-label">Rejected</div>
          </div>
          <div className="stat-card">
            <div className="stat-number accent">{Number(stats.avg_margin).toFixed(1)}%</div>
            <div className="stat-label">Avg Margin</div>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="dashboard-charts-row">
        {/* Margin bar chart */}
        <div className="card dashboard-chart-card">
          <div className="dashboard-chart-title">Discount Depth — Last {recentDeals.length} Deals</div>
          <div className="dashboard-chart-legend">
            <span className="dashboard-legend-dot" style={{ background: 'var(--risk-low)' }} /> Approved
            <span className="dashboard-legend-dot" style={{ background: 'var(--risk-medium)', marginLeft: 12 }} /> Pending
            <span className="dashboard-legend-dot" style={{ background: 'var(--risk-high)', marginLeft: 12 }} /> Rejected
          </div>
          <MarginBars deals={recentDeals} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
            <span>Oldest</span>
            <span>Most Recent</span>
          </div>
        </div>

        {/* Risk distribution donut */}
        <div className="card dashboard-chart-card">
          <div className="dashboard-chart-title">Risk Distribution</div>
          <div style={{ marginTop: 'var(--space-md)' }}>
            <RiskDonut low={riskCounts.LOW} medium={riskCounts.MEDIUM} high={riskCounts.HIGH} />
          </div>
        </div>

        {/* Approval queue health */}
        {stats && (
          <div className="card dashboard-chart-card">
            <div className="dashboard-chart-title">Approval Queue</div>
            <div style={{ marginTop: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div className="dashboard-queue-row">
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>GM Queue</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: stats.pending_gm_tasks > 0 ? 'var(--risk-medium)' : 'var(--risk-low)' }}>
                    {stats.pending_gm_tasks}
                  </div>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => onNavigate?.('approval')}
                  style={{ alignSelf: 'center' }}
                >
                  Review →
                </button>
              </div>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
              <div className="dashboard-queue-row">
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>Director Queue</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: stats.pending_director_tasks > 0 ? 'var(--risk-high)' : 'var(--risk-low)' }}>
                    {stats.pending_director_tasks}
                  </div>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => onNavigate?.('approval')}
                  style={{ alignSelf: 'center' }}
                >
                  Review →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="dashboard-actions">
        <button id="dash-create-deal" className="btn btn-primary" onClick={() => onNavigate?.('create')}>
          ⚡ Create Deal
        </button>
        <button id="dash-view-stream" className="btn btn-ghost" onClick={() => onNavigate?.('stream')}>
          📊 View All Deals
        </button>
        <button id="dash-upload" className="btn btn-ghost" onClick={() => onNavigate?.('upload')}>
          📁 Upload Pricing
        </button>
      </div>
    </div>
  );
}
