import { useState, useEffect } from 'react';
import { fetchUpcomingDeliveries } from '../api';

const IcoTruck = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13" rx="1" />
    <path d="M16 8h4l3 5v3h-7V8z" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);

const IcoCalendar = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

function urgencyColor(daysLeft) {
  if (daysLeft === 0) return '#ef4444'; // red — today
  if (daysLeft === 1) return '#f97316'; // orange — tomorrow
  return '#F05228';                     // brand — within window
}

export default function DeliveryAlerts({ days = 3, onDealClick }) {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchUpcomingDeliveries(days)
      .then((data) => { if (!cancelled) { setDeliveries(data || []); setError(null); } })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [days]);

  if (loading) {
    return (
      <div className="delivery-alerts-wrap">
        <div className="delivery-alerts-header">
          <IcoTruck />
          <span>Upcoming Deliveries</span>
        </div>
        {[1, 2].map((i) => (
          <div key={i} className="delivery-alert-skeleton" />
        ))}
      </div>
    );
  }

  if (error) return null; // silent failure — non-critical widget

  if (deliveries.length === 0) {
    return (
      <div className="delivery-alerts-wrap">
        <div className="delivery-alerts-header">
          <IcoTruck />
          <span>Upcoming Deliveries</span>
          <span className="delivery-alerts-window">next {days} days</span>
        </div>
        <div className="delivery-alerts-empty">No deliveries in the next {days} days</div>
      </div>
    );
  }

  return (
    <div className="delivery-alerts-wrap">
      <div className="delivery-alerts-header">
        <IcoTruck />
        <span>Upcoming Deliveries</span>
        <span className="delivery-alerts-badge">{deliveries.length}</span>
        <span className="delivery-alerts-window">next {days} days</span>
      </div>
      <div className="delivery-alerts-list">
        {deliveries.map((d) => (
          <button
            key={d.deal_id}
            className="delivery-alert-card"
            onClick={() => onDealClick?.(d.deal_id)}
            style={{ '--urgency': urgencyColor(d.days_remaining) }}
          >
            <div className="da-accent" />
            <div className="da-body">
              <div className="da-customer">{d.customer}</div>
              <div className="da-variant">{d.details?.variant}</div>
              <div className="da-meta">
                <span className="da-date">
                  <IcoCalendar />
                  {d.days_remaining === 0 ? 'Today' : d.days_remaining === 1 ? 'Tomorrow' : `In ${d.days_remaining} days`}
                </span>
                {d.details?.amount && (
                  <span className="da-amount">
                    {Number(d.details.amount).toLocaleString('en-MY', { style: 'currency', currency: 'MYR', maximumFractionDigits: 0 })}
                  </span>
                )}
              </div>
            </div>
            <div className="da-days" style={{ color: urgencyColor(d.days_remaining) }}>
              {d.days_remaining === 0 ? 'TODAY' : `D-${d.days_remaining}`}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
