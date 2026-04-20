/**
 * AEGIBIT Flow - Decision Engine
 * 
 * Clean, minimal, high-speed dealership decision system
 * Stripe clarity + Linear speed + Notion flexibility
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchDashboard, fetchDeals, approveGM, approveDirector, rejectDeal } from '../api';
import { useWebSocket } from '../hooks/useWebSocket';

// Utility functions
const formatCurrency = (val) => {
  if (val == null) return '---';
  return `Rs. ${Number(val).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

const formatTimeAgo = (timestamp) => {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
};

// TOP BAR
function TopBar({ orgName, userRole, currentTime, pendingCount }) {
  return (
    <div className="top-bar" style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 24px',
      borderBottom: '1px solid #e5e7eb',
      background: '#ffffff'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <div style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>
          AEGIBIT Flow
        </div>
        <div style={{
          padding: '4px 12px',
          background: '#f3f4f6',
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: 500,
          color: '#374151'
        }}>
          {orgName}
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {pendingCount > 0 && (
          <div style={{
            padding: '4px 8px',
            background: '#fef3c7',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 600,
            color: '#d97706'
          }}>
            {pendingCount} pending
          </div>
        )}
        
        <div style={{
          padding: '6px 12px',
          background: userRole === 'GM' || userRole === 'DIRECTOR' ? '#dbeafe' : '#f3f4f6',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: 600,
          color: userRole === 'GM' || userRole === 'DIRECTOR' ? '#1d4ed8' : '#374151'
        }}>
          {userRole}
        </div>
        
        <div style={{ 
          fontSize: '13px', 
          fontWeight: 500, 
          color: '#6b7280',
          fontFamily: 'monospace'
        }}>
          {currentTime}
        </div>
      </div>
    </div>
  );
}

// KPI CARDS
function KPICards({ stats, previousStats, loading }) {
  const kpis = [
    {
      title: 'Deals Today',
      value: stats?.total_deals || 0,
      delta: ((stats?.total_deals || 0) - (previousStats?.total_deals || 0)),
      color: '#111827'
    },
    {
      title: 'Pending',
      value: stats?.pending || 0,
      delta: ((stats?.pending || 0) - (previousStats?.pending || 0)),
      color: stats?.pending > 0 ? '#d97706' : '#059669'
    },
    {
      title: 'High Risk',
      value: stats?.high_risk || 0,
      delta: ((stats?.high_risk || 0) - (previousStats?.high_risk || 0)),
      color: stats?.high_risk > 0 ? '#dc2626' : '#059669'
    },
    {
      title: 'Avg Margin',
      value: stats?.avg_margin ? `${Number(stats.avg_margin).toFixed(1)}%` : '0%',
      delta: ((stats?.avg_margin || 0) - (previousStats?.avg_margin || 0)),
      color: stats?.avg_margin > 3 ? '#059669' : stats?.avg_margin > 1 ? '#d97706' : '#dc2626'
    },
    {
      title: 'Revenue Today',
      value: formatCurrency(stats?.revenue_today || 0),
      delta: ((stats?.revenue_today || 0) - (previousStats?.revenue_today || 0)),
      color: '#111827'
    }
  ];

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        gap: '16px',
        padding: '20px 24px',
        background: '#fafafa',
        borderBottom: '1px solid #e5e7eb'
      }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{
            flex: 1,
            height: '80px',
            background: '#f3f4f6',
            borderRadius: '8px',
            animation: 'pulse 2s infinite'
          }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      gap: '16px',
      padding: '20px 24px',
      background: '#fafafa',
      borderBottom: '1px solid #e5e7eb',
      overflow: 'auto'
    }}>
      {kpis.map((kpi, i) => (
        <div key={i} className="kpi-card" style={{
          flex: 1,
          minWidth: '140px',
          padding: '16px',
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, marginBottom: '4px' }}>
            {kpi.title}
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: kpi.color, marginBottom: '4px' }}>
            {kpi.value}
          </div>
          {kpi.delta !== 0 && (
            <div style={{ fontSize: '11px', fontWeight: 600, color: kpi.delta > 0 ? '#059669' : '#dc2626' }}>
              {kpi.delta > 0 ? 'up' : 'down'} {Math.abs(kpi.delta)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// DEAL STREAM
function DealStream({ deals, selectedDeal, onDealSelect, onDealAction, userRole, loading }) {
  if (loading) {
    return (
      <div style={{ padding: '24px' }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{
            height: '60px',
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            marginBottom: '8px',
            animation: 'pulse 2s infinite'
          }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '16px' }}>
        Live Deals
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {deals.map((deal, index) => (
          <div
            key={deal.id}
            className={`deal-row ${selectedDeal?.id === deal.id ? 'selected' : ''}`}
            style={{
              padding: '16px',
              background: selectedDeal?.id === deal.id ? '#f0f9ff' : '#ffffff',
              border: selectedDeal?.id === deal.id ? '1px solid #3b82f6' : '1px solid #e5e7eb',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 80px 80px 100px',
              gap: '16px',
              alignItems: 'center'
            }}
            onClick={() => onDealSelect(deal)}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onDealSelect(deal);
              }
            }}
          >
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '2px' }}>
                {deal.customer_name}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                {deal.model} - {deal.variant}
              </div>
            </div>
            
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                {formatCurrency(deal.final_price)}
              </div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '13px', 
                fontWeight: 700, 
                color: deal.margin_percent > 3 ? '#059669' : deal.margin_percent > 1 ? '#d97706' : '#dc2626'
              }}>
                {deal.margin_percent?.toFixed(1)}%
              </div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{
                padding: '2px 6px',
                background: deal.risk_level === 'HIGH' ? '#fef2f2' : 
                         deal.risk_level === 'MEDIUM' ? '#fef3c7' : '#f0fdf4',
                color: deal.risk_level === 'HIGH' ? '#dc2626' : 
                      deal.risk_level === 'MEDIUM' ? '#d97706' : '#059669',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: 600,
                textTransform: 'uppercase',
                display: 'inline-block'
              }}>
                {deal.risk_level || 'LOW'}
              </div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{
                padding: '2px 6px',
                background: deal.status === 'APPROVED' ? '#f0fdf4' : 
                         deal.status === 'REJECTED' ? '#fef2f2' : '#fef3c7',
                color: deal.status === 'APPROVED' ? '#059669' : 
                      deal.status === 'REJECTED' ? '#dc2626' : '#d97706',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: 600,
                textTransform: 'uppercase',
                display: 'inline-block'
              }}>
                {deal.status}
              </div>
            </div>
            
            <div style={{ textAlign: 'right', fontSize: '11px', color: '#6b7280' }}>
              {formatTimeAgo(deal.created_at)}
            </div>
            
            {(userRole === 'GM' || userRole === 'DIRECTOR') && deal.status === 'PENDING' && (
              <div style={{ display: 'flex', gap: '8px', gridColumn: 'span 6', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDealAction(deal, 'approve');
                  }}
                  style={{
                    padding: '4px 12px',
                    background: '#059669',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Approve
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDealAction(deal, 'reject');
                  }}
                  style={{
                    padding: '4px 12px',
                    background: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ANALYSIS PANEL
function AnalysisPanel({ selectedDeal, userRole, onDealAction }) {
  if (!selectedDeal) {
    return (
      <div style={{
        padding: '32px',
        textAlign: 'center',
        color: '#6b7280',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>briefcase</div>
        <div style={{ fontSize: '14px', fontWeight: 500 }}>
          Select a deal to view analysis
        </div>
      </div>
    );
  }

  const recommendation = useMemo(() => {
    const margin = selectedDeal.margin_percent || 0;
    const risk = selectedDeal.risk_level?.toUpperCase();
    
    if (margin < 0) return { action: 'REJECT', reason: 'Negative margin', color: '#dc2626' };
    if (margin < 2) return { action: 'REVIEW', reason: 'Low margin', color: '#d97706' };
    if (risk === 'HIGH') return { action: 'REVIEW', reason: 'High risk', color: '#d97706' };
    if (margin > 5 && risk === 'LOW') return { action: 'APPROVE', reason: 'Strong margin', color: '#059669' };
    return { action: 'REVIEW', reason: 'Standard review', color: '#6b7280' };
  }, [selectedDeal]);

  return (
    <div style={{ padding: '24px', height: '100%', overflow: 'auto' }}>
      <div style={{ fontSize: '16px', fontWeight: 600, color: '#111827', marginBottom: '20px' }}>
        Deal Analysis
      </div>
      
      {/* Customer Info */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>
          {selectedDeal.customer_name}
        </div>
        <div style={{ fontSize: '12px', color: '#6b7280' }}>
          {selectedDeal.model} - {selectedDeal.variant}
        </div>
      </div>

      {/* Price Breakdown */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '12px', textTransform: 'uppercase' }}>
          Price Breakdown
        </div>
        <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>Base Price</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
              {formatCurrency(selectedDeal.base_price)}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>Discount</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#dc2626' }}>
              -{formatCurrency(selectedDeal.discount)}
            </span>
          </div>
          <div style={{ height: '1px', background: '#e5e7eb', margin: '8px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>Final Price</span>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>
              {formatCurrency(selectedDeal.final_price)}
            </span>
          </div>
        </div>
      </div>

      {/* Margin */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '12px', textTransform: 'uppercase' }}>
          Margin
        </div>
        <div style={{
          padding: '16px',
          background: selectedDeal.margin_percent > 3 ? '#f0fdf4' : 
                   selectedDeal.margin_percent > 1 ? '#fef3c7' : '#fef2f2',
          borderRadius: '6px',
          textAlign: 'center'
        }}>
          <div style={{ 
            fontSize: '20px', 
            fontWeight: 700, 
            color: selectedDeal.margin_percent > 3 ? '#059669' : 
                   selectedDeal.margin_percent > 1 ? '#d97706' : '#dc2626'
          }}>
            {selectedDeal.margin_percent?.toFixed(1)}%
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            {formatCurrency(selectedDeal.margin)}
          </div>
        </div>
      </div>

      {/* Recommendation */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '12px', textTransform: 'uppercase' }}>
          Recommendation
        </div>
        <div style={{
          padding: '16px',
          background: `${recommendation.color}10`,
          borderRadius: '6px',
          border: `1px solid ${recommendation.color}30`,
          textAlign: 'center'
        }}>
          <div style={{ 
            fontSize: '16px', 
            fontWeight: 700, 
            color: recommendation.color,
            marginBottom: '4px'
          }}>
            {recommendation.action}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            {recommendation.reason}
          </div>
        </div>
      </div>

      {/* Actions */}
      {(userRole === 'GM' || userRole === 'DIRECTOR') && selectedDeal.status === 'PENDING' && (
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => onDealAction(selectedDeal, 'approve')}
            style={{
              flex: 1,
              padding: '12px',
              background: '#059669',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Approve
          </button>
          <button
            onClick={() => onDealAction(selectedDeal, 'reject')}
            style={{
              flex: 1,
              padding: '12px',
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}

// MAIN DECISION ENGINE
export default function DecisionEngine({ orgName, userRole }) {
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [stats, setStats] = useState(null);
  const [previousStats, setPreviousStats] = useState(null);
  const [deals, setDeals] = useState([]);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [loading, setLoading] = useState(true);

  // Update time
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [dashboardData, dealsData] = await Promise.all([
        fetchDashboard().catch(err => {
          console.error('Dashboard error:', err);
          return null;
        }),
        fetchDeals(null).catch(err => {
          console.error('Deals error:', err);
          return [];
        })
      ]);
      
      if (dashboardData) {
        setPreviousStats(stats);
        setStats(dashboardData);
      }
      
      if (dealsData) {
        setDeals(dealsData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      }
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  }, [stats]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // WebSocket
  const handleWsEvent = useCallback((event) => {
    if (['deal_created', 'deal_approved', 'deal_rejected', 'status_changed'].includes(event.type)) {
      loadData();
    }
  }, [loadData]);

  useWebSocket(handleWsEvent);

  // Deal actions
  const handleDealAction = async (deal, action) => {
    try {
      if (action === 'approve') {
        if (userRole === 'GM') {
          await approveGM(deal.id);
        } else if (userRole === 'DIRECTOR') {
          await approveDirector(deal.id);
        }
      } else if (action === 'reject') {
        await rejectDeal(deal.id);
      }
      
      await loadData();
      if (selectedDeal?.id === deal.id) {
        setSelectedDeal(null);
      }
    } catch (error) {
      console.error(`Failed to ${action} deal:`, error);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedDeal(null);
      }
      if (e.key === 'ArrowDown' && selectedDeal) {
        const currentIndex = deals.findIndex(d => d.id === selectedDeal.id);
        if (currentIndex < deals.length - 1) {
          setSelectedDeal(deals[currentIndex + 1]);
        }
      }
      if (e.key === 'ArrowUp' && selectedDeal) {
        const currentIndex = deals.findIndex(d => d.id === selectedDeal.id);
        if (currentIndex > 0) {
          setSelectedDeal(deals[currentIndex - 1]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDeal, deals]);

  if (loading && !stats) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#ffffff',
        color: '#6b7280'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '2px solid #e5e7eb',
            borderTop: '2px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <div style={{ fontSize: '14px', fontWeight: 500 }}>
            Loading...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="decision-engine" style={{
      height: '100vh',
      background: '#ffffff',
      color: '#111827',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <TopBar 
        orgName={orgName} 
        userRole={userRole} 
        currentTime={currentTime}
        pendingCount={stats?.pending || 0}
      />
      
      <KPICards 
        stats={stats} 
        previousStats={previousStats}
        loading={loading}
      />
      
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: '0 0 70%', borderRight: '1px solid #e5e7eb', overflow: 'auto' }}>
          <DealStream
            deals={deals}
            selectedDeal={selectedDeal}
            onDealSelect={setSelectedDeal}
            onDealAction={handleDealAction}
            userRole={userRole}
            loading={loading}
          />
        </div>
        
        <div style={{ flex: '0 0 30%', background: '#fafafa' }}>
          <AnalysisPanel
            selectedDeal={selectedDeal}
            userRole={userRole}
            onDealAction={handleDealAction}
          />
        </div>
      </div>
    </div>
  );
}
