import { useState, useEffect, useCallback } from 'react';
import { fetchDeals, fetchDashboard } from '../api';
import { useWebSocket } from '../hooks/useWebSocket';
import DealCard from './DealCard';

export default function DealStream() {
  const [deals, setDeals] = useState([]);
  const [statusFilter, setStatusFilter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  const loadDeals = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetchDeals(statusFilter),
      fetchDashboard(),
    ])
      .then(([dealData, dashData]) => {
        setDeals(dealData);
        setStats(dashData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => {
    loadDeals();
  }, [loadDeals]);

  // Real-time updates via WebSocket
  const handleWsEvent = useCallback((event) => {
    if (['deal_created', 'deal_approved', 'deal_rejected', 'status_changed'].includes(event.type)) {
      loadDeals();
    }
  }, [loadDeals]);

  useWebSocket(handleWsEvent);

  const filters = [
    { label: 'All', value: null },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Rejected', value: 'REJECTED' },
  ];

  return (
    <div>
      <div className="page-header">
        <h2>📊 Deal Stream</h2>
        <p>Live feed of all deals — updates in real time</p>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="stats-row">
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
            <div className="stat-number accent">{stats.avg_margin}%</div>
            <div className="stat-label">Avg Margin</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="deal-filters">
        {filters.map((f) => (
          <button
            key={f.label}
            id={`filter-${f.label.toLowerCase()}`}
            className={`filter-btn ${statusFilter === f.value ? 'active' : ''}`}
            onClick={() => setStatusFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
        <button className="filter-btn" onClick={loadDeals} style={{ marginLeft: 'auto' }}>
          🔄 Refresh
        </button>
      </div>

      {/* Deal Grid */}
      {loading ? (
        <div className="empty-state">
          <span className="loading-spinner" style={{ width: 30, height: 30 }} />
        </div>
      ) : deals.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-text">
            No deals yet. Create your first deal to see it here.
          </div>
        </div>
      ) : (
        <div className="deal-stream">
          {deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </div>
      )}
    </div>
  );
}
