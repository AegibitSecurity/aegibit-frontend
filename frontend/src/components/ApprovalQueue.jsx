import { useState, useEffect, useCallback } from 'react';
import { fetchGMTasks, fetchDirectorTasks, approveGM, approveDirector, rejectDeal } from '../api';
import { useWebSocket } from '../hooks/useWebSocket';
import DealCard from './DealCard';

export default function ApprovalQueue() {
  const [role, setRole] = useState('GM');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadTasks = useCallback(() => {
    setLoading(true);
    const fetcher = role === 'GM' ? fetchGMTasks : fetchDirectorTasks;
    fetcher()
      .then(setTasks)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [role]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Real-time refresh
  const handleWsEvent = useCallback((event) => {
    if (['deal_created', 'deal_approved', 'deal_rejected', 'status_changed'].includes(event.type)) {
      loadTasks();
    }
  }, [loadTasks]);

  useWebSocket(handleWsEvent);

  async function handleApprove(dealId) {
    try {
      if (role === 'GM') {
        await approveGM(dealId);
      } else {
        await approveDirector(dealId);
      }
      loadTasks();
    } catch (e) {
      console.error('Approve error:', e);
    }
  }

  async function handleReject(dealId) {
    try {
      await rejectDeal(dealId);
      loadTasks();
    } catch (e) {
      console.error('Reject error:', e);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>✅ Approval Queue</h2>
        <p>Review and approve or reject pending deals</p>
      </div>

      {/* Toggle */}
      <div className="queue-toggle">
        <button
          id="toggle-gm"
          className={`queue-toggle-btn ${role === 'GM' ? 'active' : ''}`}
          onClick={() => setRole('GM')}
        >
          GM View
        </button>
        <button
          id="toggle-director"
          className={`queue-toggle-btn ${role === 'DIRECTOR' ? 'active' : ''}`}
          onClick={() => setRole('DIRECTOR')}
        >
          Director View
        </button>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="empty-state">
          <span className="loading-spinner" style={{ width: 30, height: 30 }} />
        </div>
      ) : tasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎉</div>
          <div className="empty-state-text">
            No pending approvals for {role}. All clear!
          </div>
        </div>
      ) : (
        <div className="queue-list">
          {tasks.map((task) => (
            <DealCard
              key={task.id}
              deal={task.deal}
              actions={[
                {
                  id: `approve-${task.deal.id}`,
                  label: '✅ Approve',
                  variant: 'btn-success',
                  onClick: () => handleApprove(task.deal.id),
                },
                {
                  id: `reject-${task.deal.id}`,
                  label: '❌ Reject',
                  variant: 'btn-danger',
                  onClick: () => handleReject(task.deal.id),
                },
              ]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
