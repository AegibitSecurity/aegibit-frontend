/**
 * Stable Decision Engine - No blinking, clean rendering
 */

import { useState, useEffect, useCallback, memo } from 'react';
import { fetchDashboard, fetchDeals, approveGM, approveDirector, rejectDeal } from '../api';
import { useWebSocket } from '../hooks/useWebSocket';

const formatCurrency = (val) => {
  if (val == null) return '---';
  return `Rs. ${Number(val).toLocaleString('en-IN')}`;
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

// Top Bar Component
function TopBar({ orgName, userRole, currentTime, pendingCount }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 24px',
      borderBottom: '1px solid #e5e7eb',
      background: '#ffffff',
      position: 'sticky',
      top: 0,
      zIndex: 100
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

// KPI Cards Component
function KPICards({ stats, loading }) {
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
            borderRadius: '8px'
          }} />
        ))}
      </div>
    );
  }

  const kpis = [
    { title: 'Deals Today', value: stats?.total_deals || 0, color: '#111827' },
    { title: 'Pending', value: stats?.pending || 0, color: stats?.pending > 0 ? '#d97706' : '#059669' },
    { title: 'High Risk', value: stats?.high_risk || 0, color: stats?.high_risk > 0 ? '#dc2626' : '#059669' },
    { title: 'Avg Margin', value: stats?.avg_margin ? `${Number(stats.avg_margin).toFixed(1)}%` : '0%', color: '#111827' },
    { title: 'Revenue', value: formatCurrency(stats?.revenue_today || 0), color: '#111827' }
  ];

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
        <div key={i} style={{
          flex: 1,
          minWidth: '140px',
          padding: '16px',
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, marginBottom: '4px' }}>
            {kpi.title}
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: kpi.color }}>
            {kpi.value}
          </div>
        </div>
      ))}
    </div>
  );
}

// Deal Stream Component
function DealStream({ deals, selectedDeal, onDealSelect, onDealAction, userRole, loading }) {
  if (loading) {
    return (
      <div style={{ padding: '24px' }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{
            height: '60px',
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            marginBottom: '8px'
          }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '16px' }}>
        Live Deals ({deals.length})
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {deals.map((deal) => (
          <div
            key={deal.id}
            style={{
              padding: '16px',
              background: selectedDeal?.id === deal.id ? '#f0f9ff' : '#ffffff',
              border: selectedDeal?.id === deal.id ? '2px solid #3b82f6' : '1px solid #e5e7eb',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 80px 80px 100px',
              gap: '16px',
              alignItems: 'center'
            }}
            onClick={() => onDealSelect(deal)}
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
                textTransform: 'uppercase'
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
                textTransform: 'uppercase'
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

// Analysis Panel Component
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
        justifyContent: 'center'
      }}>
        <div style={{ fontSize: '14px', fontWeight: 500 }}>
          Select a deal to view analysis
        </div>
      </div>
    );
  }

  const recommendation = selectedDeal.margin_percent > 3 ? 'APPROVE' : 
                        selectedDeal.margin_percent < 1 ? 'REVIEW' : 'APPROVE';

  // Calculate TCS if not present in pricing breakdown
  const tcs = selectedDeal.pricing_breakdown?.tcs || 
             (selectedDeal.base_price >= 1000000 ? selectedDeal.base_price * 0.01 : 0);

  return (
    <div style={{ padding: '24px', height: '100%', overflow: 'auto', background: '#fafafa' }}>
      <div style={{ fontSize: '16px', fontWeight: 600, color: '#111827', marginBottom: '20px' }}>
        Deal Analysis
      </div>
      
      {/* Customer Info - No personal data */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>
          {selectedDeal.customer_name}
        </div>
        <div style={{ fontSize: '12px', color: '#6b7280' }}>
          {selectedDeal.model} - {selectedDeal.variant}
        </div>
        <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
          {formatTimeAgo(selectedDeal.created_at)}
        </div>
      </div>

      {/* Price Breakdown with TCS */}
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
          
          {/* Road Tax */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>Road Tax</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
              {formatCurrency(selectedDeal.pricing_breakdown?.road_tax || 0)}
            </span>
          </div>
          
          {/* Insurance */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>Insurance</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
              {formatCurrency(selectedDeal.pricing_breakdown?.insurance || 0)}
            </span>
          </div>
          
          {/* TCS */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>TCS</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
              {formatCurrency(tcs)}
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

      {/* Margin Analysis */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '12px', textTransform: 'uppercase' }}>
          Margin Analysis
        </div>
        <div style={{
          padding: '16px',
          background: selectedDeal.margin_percent > 3 ? '#f0fdf4' : '#fef3c7',
          borderRadius: '6px',
          textAlign: 'center'
        }}>
          <div style={{ 
            fontSize: '20px', 
            fontWeight: 700, 
            color: selectedDeal.margin_percent > 3 ? '#059669' : '#d97706'
          }}>
            {selectedDeal.margin_percent?.toFixed(1)}%
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            {formatCurrency(selectedDeal.margin)}
          </div>
        </div>
      </div>

      {/* Risk & Status */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '12px', textTransform: 'uppercase' }}>
          Deal Status
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{
            padding: '4px 8px',
            background: selectedDeal.risk_level === 'HIGH' ? '#fef2f2' : 
                     selectedDeal.risk_level === 'MEDIUM' ? '#fef3c7' : '#f0fdf4',
            color: selectedDeal.risk_level === 'HIGH' ? '#dc2626' : 
                  selectedDeal.risk_level === 'MEDIUM' ? '#d97706' : '#059669',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 600,
            textTransform: 'uppercase'
          }}>
            {selectedDeal.risk_level || 'LOW'} RISK
          </div>
          <div style={{
            padding: '4px 8px',
            background: selectedDeal.status === 'APPROVED' ? '#f0fdf4' : 
                     selectedDeal.status === 'REJECTED' ? '#fef2f2' : '#fef3c7',
            color: selectedDeal.status === 'APPROVED' ? '#059669' : 
                  selectedDeal.status === 'REJECTED' ? '#dc2626' : '#d97706',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 600,
            textTransform: 'uppercase'
          }}>
            {selectedDeal.status}
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
          background: '#f0f9ff',
          borderRadius: '6px',
          border: '1px solid #bfdbfe',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#1d4ed8', marginBottom: '4px' }}>
            {recommendation}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            {selectedDeal.reason || 'Standard review required'}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
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

// Memoized components for performance
const TopBar = memo(TopBar);
const KPICards = memo(KPICards);
const DealStream = memo(DealStream);
const AnalysisPanel = memo(AnalysisPanel);

// Main Component
export default memo(function DecisionEngine({ orgName, userRole }) {
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [stats, setStats] = useState(null);
  const [deals, setDeals] = useState([]);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Prevent initial flicker
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update time
  useEffect(() => {
    if (!mounted) return;
    
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, [mounted]);

  // Load data
  const loadData = useCallback(async () => {
    if (!mounted) return;
    
    try {
      console.log('Loading dashboard data...');
      
      const [dashboardData, dealsData] = await Promise.all([
        fetchDashboard().catch(err => {
          console.error('Dashboard API error:', err);
          return null;
        }),
        fetchDeals(null).catch(err => {
          console.error('Deals API error:', err);
          return [];
        })
      ]);
      
      console.log('Dashboard data:', dashboardData);
      console.log('Deals data:', dealsData);
      
      if (dashboardData) {
        setStats(dashboardData);
        console.log('Stats set:', dashboardData);
      }
      
      if (dealsData && Array.isArray(dealsData)) {
        const sortedDeals = dealsData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setDeals(sortedDeals);
        console.log('Deals set:', sortedDeals);
      } else {
        console.log('Deals data is not an array:', dealsData);
        setDeals([]);
      }
    } catch (error) {
      console.error('Load error:', error);
      setDeals([]);
    } finally {
      setLoading(false);
    }
  }, [mounted]);

  useEffect(() => {
    if (mounted) {
      loadData();
    }
  }, [mounted, loadData]);

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
        await rejectDeal(deal.id, userRole);
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
  }, [selectedDeal, deals, userRole]);

  if (!mounted) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#ffffff',
        color: '#6b7280'
      }}>
        <div style={{ fontSize: '32px', opacity: 0.3 }}>📊</div>
        <div style={{ fontSize: '14px', color: '#94a3b8', marginTop: 'var(--space-sm)' }}>
          Loading...
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
      overflow: 'hidden'
    }}>
      <TopBar 
        orgName={orgName} 
        userRole={userRole} 
        currentTime={currentTime}
        pendingCount={stats?.pending || 0}
      />
      
      <KPICards 
        stats={stats} 
        loading={loading}
      />
      
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <DealStream
          deals={deals}
          selectedDeal={selectedDeal}
          onDealSelect={setSelectedDeal}
          onDealAction={handleDealAction}
          userRole={userRole}
          loading={loading}
        />
        <AnalysisPanel
          selectedDeal={selectedDeal}
          userRole={userRole}
          onDealAction={handleDealAction}
        />
      </div>
    </div>
  );
});
