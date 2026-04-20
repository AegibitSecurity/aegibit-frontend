/**
 * AEGIBIT Flow - Enterprise Dashboard
 * 
 * Professional, premium UI designed for 1cr+ business scale
 * Real-time data accuracy and scalable architecture
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchDashboard, fetchDeals, approveGM, approveDirector, rejectDeal } from '../api';
import { useWebSocket } from '../hooks/useWebSocket';

// Professional utility functions
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

const formatNumber = (val) => {
  if (val == null) return '---';
  return Number(val).toLocaleString('en-IN');
};

// ENTERPRISE TOP BAR
function EnterpriseTopBar({ orgName, userRole, currentTime, systemStatus }) {
  return (
    <div className="enterprise-top-bar" style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 32px',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      backdropFilter: 'blur(20px)',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      boxShadow: '0 4px 24px rgba(0,0,0,0.3)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 40,
            height: 40,
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '16px',
            color: 'white'
          }}>
            AF
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#ffffff', lineHeight: 1.2 }}>
              AEGIBIT Flow
            </h1>
            <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>
              Enterprise Decision Engine
            </div>
          </div>
        </div>
        
        <div style={{
          padding: '8px 20px',
          background: 'rgba(255,255,255,0.08)',
          borderRadius: '24px',
          border: '1px solid rgba(255,255,255,0.12)',
          fontSize: '14px',
          fontWeight: 600,
          color: '#e2e8f0'
        }}>
          {orgName}
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 16px',
          background: systemStatus === 'healthy' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          borderRadius: '20px',
          border: `1px solid ${systemStatus === 'healthy' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            background: systemStatus === 'healthy' ? '#22c55e' : '#ef4444',
            borderRadius: '50%',
            animation: systemStatus === 'healthy' ? 'pulse 2s infinite' : 'none'
          }} />
          <span style={{ fontSize: '12px', fontWeight: 600, color: systemStatus === 'healthy' ? '#22c55e' : '#ef4444' }}>
            {systemStatus === 'healthy' ? 'System Healthy' : 'System Alert'}
          </span>
        </div>
        
        <div style={{
          padding: '8px 20px',
          background: userRole === 'GM' || userRole === 'DIRECTOR' ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' : 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
          borderRadius: '24px',
          fontSize: '13px',
          fontWeight: 700,
          color: 'white',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
        }}>
          {userRole}
        </div>
        
        <div style={{ 
          fontSize: '14px', 
          fontWeight: 600, 
          color: '#cbd5e1',
          fontFamily: '"SF Mono", "Monaco", "Inconsolata", monospace',
          padding: '8px 16px',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.08)'
        }}>
          {currentTime}
        </div>
      </div>
    </div>
  );
}

// ENTERPRISE KPI METRICS
function EnterpriseKPIs({ stats, previousStats, loading }) {
  const kpis = [
    {
      title: 'Total Deals Today',
      value: stats?.total_deals || 0,
      previous: previousStats?.total_deals || 0,
      delta: ((stats?.total_deals || 0) - (previousStats?.total_deals || 0)),
      icon: 'briefcase',
      color: '#3b82f6',
      format: 'number',
      trend: 'up'
    },
    {
      title: 'Pending Approval',
      value: stats?.pending || 0,
      previous: previousStats?.pending || 0,
      delta: ((stats?.pending || 0) - (previousStats?.pending || 0)),
      icon: 'clock',
      color: stats?.pending > 0 ? '#f59e0b' : '#22c55e',
      format: 'number',
      trend: 'down'
    },
    {
      title: 'High Risk Deals',
      value: stats?.high_risk || 0,
      previous: previousStats?.high_risk || 0,
      delta: ((stats?.high_risk || 0) - (previousStats?.high_risk || 0)),
      icon: 'alert-triangle',
      color: stats?.high_risk > 0 ? '#ef4444' : '#22c55e',
      format: 'number',
      trend: 'down'
    },
    {
      title: 'Average Margin',
      value: stats?.avg_margin || 0,
      previous: previousStats?.avg_margin || 0,
      delta: ((stats?.avg_margin || 0) - (previousStats?.avg_margin || 0)),
      icon: 'trending-up',
      color: stats?.avg_margin > 3 ? '#22c55e' : stats?.avg_margin > 1 ? '#f59e0b' : '#ef4444',
      format: 'percentage',
      trend: 'up'
    },
    {
      title: 'Revenue Today',
      value: stats?.revenue_today || 0,
      previous: previousStats?.revenue_today || 0,
      delta: ((stats?.revenue_today || 0) - (previousStats?.revenue_today || 0)),
      icon: 'indian-rupee',
      color: '#8b5cf6',
      format: 'currency',
      trend: 'up'
    },
    {
      title: 'Approval Rate',
      value: stats?.approval_rate || 0,
      previous: previousStats?.approval_rate || 0,
      delta: ((stats?.approval_rate || 0) - (previousStats?.approval_rate || 0)),
      icon: 'check-circle',
      color: stats?.approval_rate > 80 ? '#22c55e' : stats?.approval_rate > 60 ? '#f59e0b' : '#ef4444',
      format: 'percentage',
      trend: 'up'
    }
  ];

  if (loading) {
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        gap: '20px',
        padding: '32px'
      }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            padding: '24px',
            height: '140px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '12px',
              marginBottom: '16px',
              animation: 'pulse 2s infinite'
            }} />
            <div style={{
              height: '24px',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '8px',
              marginBottom: '12px',
              width: '60%'
            }} />
            <div style={{
              height: '16px',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '6px',
              width: '40%'
            }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="enterprise-kpis" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(6, 1fr)',
      gap: '20px',
      padding: '32px',
      background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 100%)'
    }}>
      {kpis.map((kpi, index) => (
        <div key={index} className="enterprise-kpi-card" style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '16px',
          padding: '24px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Background gradient */}
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '100px',
            height: '100px',
            background: `linear-gradient(135deg, ${kpi.color}20 0%, transparent 70%)`,
            borderRadius: '50%',
            transform: 'translate(30px, -30px)'
          }} />
          
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: `${kpi.color}15`,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                color: kpi.color
              }}>
                {kpi.icon === 'briefcase' && 'briefcase'}
                {kpi.icon === 'clock' && 'clock'}
                {kpi.icon === 'alert-triangle' && 'alert-triangle'}
                {kpi.icon === 'trending-up' && 'trending-up'}
                {kpi.icon === 'indian-rupee' && 'rupee'}
                {kpi.icon === 'check-circle' && 'check-circle'}
              </div>
              
              {kpi.delta !== 0 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  background: kpi.delta > 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: kpi.delta > 0 ? '#22c55e' : '#ef4444'
                }}>
                  <span>{kpi.delta > 0 ? 'up' : 'down'}</span>
                  <span>{Math.abs(kpi.delta)}</span>
                </div>
              )}
            </div>
            
            <div style={{ marginBottom: '8px' }}>
              <div style={{ 
                fontSize: '32px', 
                fontWeight: 800, 
                color: '#ffffff',
                lineHeight: 1,
                marginBottom: '8px'
              }}>
                {kpi.format === 'currency' && formatCurrency(kpi.value)}
                {kpi.format === 'percentage' && `${Number(kpi.value).toFixed(1)}%`}
                {kpi.format === 'number' && formatNumber(kpi.value)}
              </div>
              <div style={{ 
                fontSize: '13px', 
                color: '#94a3b8', 
                fontWeight: 500,
                lineHeight: 1.3
              }}>
                {kpi.title}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ENTERPRISE DEAL STREAM
function EnterpriseDealStream({ deals, selectedDeal, onDealSelect, onDealAction, userRole, loading }) {
  if (loading) {
    return (
      <div style={{ padding: '32px' }}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '12px',
            display: 'flex',
            gap: '20px'
          }}>
            <div style={{ flex: 1, display: 'flex', gap: '20px', alignItems: 'center' }}>
              <div style={{ width: '200px', height: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }} />
              <div style={{ width: '120px', height: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }} />
              <div style={{ width: '100px', height: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }} />
              <div style={{ width: '80px', height: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="enterprise-deal-stream" style={{ padding: '0 32px 32px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>
          Live Deal Stream
        </h2>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 16px',
          background: 'rgba(34, 197, 94, 0.1)',
          borderRadius: '20px',
          border: '1px solid rgba(34, 197, 94, 0.3)'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            background: '#22c55e',
            borderRadius: '50%',
            animation: 'pulse 2s infinite'
          }} />
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#22c55e' }}>
            {deals.length} Active Deals
          </span>
        </div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {deals.map((deal, index) => (
          <div
            key={deal.id}
            className={`enterprise-deal-row ${selectedDeal?.id === deal.id ? 'selected' : ''}`}
            style={{
              background: selectedDeal?.id === deal.id 
                ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)' 
                : 'rgba(255,255,255,0.03)',
              border: selectedDeal?.id === deal.id 
                ? '1px solid rgba(59, 130, 246, 0.3)' 
                : '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              padding: '20px',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative',
              overflow: 'hidden'
            }}
            onClick={() => onDealSelect(deal)}
          >
            {/* Hover effect */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.05), transparent)',
              opacity: 0,
              transition: 'opacity 0.2s ease'
            }} className="hover-overlay" />
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 1fr 120px', 
              gap: '24px', 
              alignItems: 'center',
              position: 'relative',
              zIndex: 1
            }}>
              <div>
                <div style={{ 
                  fontSize: '16px', 
                  fontWeight: 700, 
                  color: '#ffffff', 
                  marginBottom: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  {deal.customer_name}
                  {deal.risk_level === 'HIGH' && (
                    <div style={{
                      padding: '2px 6px',
                      background: 'rgba(239, 68, 68, 0.2)',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 700,
                      color: '#ef4444',
                      textTransform: 'uppercase'
                    }}>
                      HIGH RISK
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>
                  {deal.model} - {deal.variant}
                </div>
              </div>
              
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', marginBottom: '2px' }}>
                  {formatCurrency(deal.final_price)}
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Base: {formatCurrency(deal.base_price)}
                </div>
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  fontSize: '16px', 
                  fontWeight: 800, 
                  color: deal.margin_percent > 3 ? '#22c55e' : deal.margin_percent > 1 ? '#f59e0b' : '#ef4444',
                  marginBottom: '2px'
                }}>
                  {deal.margin_percent?.toFixed(1)}%
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  {formatCurrency(deal.margin)}
                </div>
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  padding: '6px 12px',
                  background: deal.risk_level === 'HIGH' ? 'rgba(239, 68, 68, 0.2)' : 
                           deal.risk_level === 'MEDIUM' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                  color: deal.risk_level === 'HIGH' ? '#ef4444' : 
                        deal.risk_level === 'MEDIUM' ? '#f59e0b' : '#22c55e',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  display: 'inline-block'
                }}>
                  {deal.risk_level || 'LOW'}
                </div>
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  padding: '6px 12px',
                  background: deal.status === 'APPROVED' ? 'rgba(34, 197, 94, 0.2)' : 
                           deal.status === 'REJECTED' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                  color: deal.status === 'APPROVED' ? '#22c55e' : 
                        deal.status === 'REJECTED' ? '#ef4444' : '#f59e0b',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  display: 'inline-block'
                }}>
                  {deal.status}
                </div>
              </div>
              
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>
                  {formatTimeAgo(deal.created_at)}
                </div>
              </div>
              
              {(userRole === 'GM' || userRole === 'DIRECTOR') && deal.status === 'PENDING' && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDealAction(deal, 'approve');
                    }}
                    style={{
                      padding: '8px 16px',
                      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)'
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
                      padding: '8px 16px',
                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)'
                    }}
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ENTERPRISE ANALYSIS PANEL
function EnterpriseAnalysisPanel({ selectedDeal, userRole, onDealAction }) {
  if (!selectedDeal) {
    return (
      <div className="enterprise-analysis-panel" style={{
        width: '450px',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
        padding: '32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#94a3b8'
      }}>
        <div style={{
          width: '120px',
          height: '120px',
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '48px',
          color: '#3b82f6',
          marginBottom: '24px',
          border: '1px solid rgba(59, 130, 246, 0.2)'
        }}>
          briefcase
        </div>
        <div style={{ fontSize: '16px', fontWeight: 600, textAlign: 'center', marginBottom: '8px' }}>
          No Deal Selected
        </div>
        <div style={{ fontSize: '14px', textAlign: 'center', opacity: 0.7 }}>
          Select a deal from the stream to view detailed analysis
        </div>
      </div>
    );
  }

  const recommendation = useMemo(() => {
    const margin = selectedDeal.margin_percent || 0;
    const risk = selectedDeal.risk_level?.toUpperCase();
    
    if (margin < 0) return { action: 'REJECT', reason: 'Negative margin detected', color: '#ef4444', confidence: 95 };
    if (margin < 2) return { action: 'REVIEW', reason: 'Low margin - requires review', color: '#f59e0b', confidence: 85 };
    if (risk === 'HIGH') return { action: 'REVIEW', reason: 'High risk factors present', color: '#f59e0b', confidence: 90 };
    if (margin > 5 && risk === 'LOW') return { action: 'APPROVE', reason: 'Strong margin with low risk', color: '#22c55e', confidence: 95 };
    return { action: 'REVIEW', reason: 'Standard review required', color: '#64748b', confidence: 75 };
  }, [selectedDeal]);

  return (
    <div className="enterprise-analysis-panel" style={{
      width: '450px',
      background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
      borderLeft: '1px solid rgba(255,255,255,0.08)',
      padding: '32px',
      overflow: 'auto'
    }}>
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#ffffff', marginBottom: '12px' }}>
          Deal Analysis
        </h3>
        <div style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 500 }}>
          {selectedDeal.customer_name} - {selectedDeal.variant}
        </div>
      </div>

      {/* Price Breakdown */}
      <div style={{ marginBottom: '32px' }}>
        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#94a3b8', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Price Breakdown
        </h4>
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: '#94a3b8', fontWeight: 500 }}>Base Price</span>
              <span style={{ fontWeight: 700, color: '#ffffff' }}>
                {formatCurrency(selectedDeal.base_price)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: '#94a3b8', fontWeight: 500 }}>Discount</span>
              <span style={{ fontWeight: 700, color: '#ef4444' }}>
                -{formatCurrency(selectedDeal.discount)}
              </span>
            </div>
            <div style={{ 
              height: '1px', 
              background: 'rgba(255,255,255,0.1)', 
              margin: '8px 0' 
            }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px' }}>
              <span style={{ color: '#94a3b8', fontWeight: 600 }}>Final Price</span>
              <span style={{ fontWeight: 800, color: '#ffffff', fontSize: '18px' }}>
                {formatCurrency(selectedDeal.final_price)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Margin Analysis */}
      <div style={{ marginBottom: '32px' }}>
        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#94a3b8', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Margin Analysis
        </h4>
        <div style={{
          background: selectedDeal.margin_percent > 3 ? 'rgba(34, 197, 94, 0.1)' : 
                   selectedDeal.margin_percent > 1 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          borderRadius: '12px',
          border: `1px solid ${selectedDeal.margin_percent > 3 ? '#22c55e' : selectedDeal.margin_percent > 1 ? '#f59e0b' : '#ef4444'}`,
          padding: '24px',
          textAlign: 'center'
        }}>
          <div style={{ 
            fontSize: '36px', 
            fontWeight: 800, 
            color: selectedDeal.margin_percent > 3 ? '#22c55e' : selectedDeal.margin_percent > 1 ? '#f59e0b' : '#ef4444',
            marginBottom: '8px'
          }}>
            {selectedDeal.margin_percent?.toFixed(1)}%
          </div>
          <div style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 500 }}>
            {formatCurrency(selectedDeal.margin)} absolute margin
          </div>
        </div>
      </div>

      {/* AI Recommendation */}
      <div style={{ marginBottom: '32px' }}>
        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#94a3b8', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          AI Recommendation
        </h4>
        <div style={{
          background: `${recommendation.color}15`,
          borderRadius: '12px',
          border: `1px solid ${recommendation.color}40`,
          padding: '24px',
          textAlign: 'center'
        }}>
          <div style={{ 
            fontSize: '24px', 
            fontWeight: 800, 
            color: recommendation.color,
            marginBottom: '8px'
          }}>
            {recommendation.action}
          </div>
          <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '16px' }}>
            {recommendation.reason}
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '12px',
            color: '#94a3b8'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              background: recommendation.color,
              borderRadius: '50%'
            }} />
            <span>{recommendation.confidence}% Confidence</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {(userRole === 'GM' || userRole === 'DIRECTOR') && selectedDeal.status === 'PENDING' && (
        <div style={{ display: 'flex', gap: '16px' }}>
          <button
            onClick={() => onDealAction(selectedDeal, 'approve')}
            style={{
              flex: 1,
              padding: '16px',
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)'
            }}
          >
            Approve Deal
          </button>
          <button
            onClick={() => onDealAction(selectedDeal, 'reject')}
            style={{
              flex: 1,
              padding: '16px',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
            }}
          >
            Reject Deal
          </button>
        </div>
      )}
    </div>
  );
}

// MAIN ENTERPRISE DASHBOARD
export default function EnterpriseDashboard({ orgName, userRole }) {
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [stats, setStats] = useState(null);
  const [previousStats, setPreviousStats] = useState(null);
  const [deals, setDeals] = useState([]);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState('healthy');

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load data with error handling
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
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
      
      if (dashboardData) {
        setPreviousStats(stats);
        setStats(dashboardData);
      }
      
      if (dealsData) {
        setDeals(dealsData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      }
      
      setSystemStatus('healthy');
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setSystemStatus('error');
    } finally {
      setLoading(false);
    }
  }, [stats]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // WebSocket integration with error handling
  const handleWsEvent = useCallback((event) => {
    if (['deal_created', 'deal_approved', 'deal_rejected', 'status_changed'].includes(event.type)) {
      loadData();
    }
  }, [loadData]);

  useWebSocket(handleWsEvent);

  // Deal action handler with feedback
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
      
      // Refresh data
      await loadData();
      
      // Clear selection if deal was processed
      if (selectedDeal?.id === deal.id) {
        setSelectedDeal(null);
      }
    } catch (error) {
      console.error(`Failed to ${action} deal:`, error);
      // Could add toast notification here
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
        background: '#0f172a',
        color: '#ffffff'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '3px solid rgba(255,255,255,0.1)',
            borderTop: '3px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }} />
          <div style={{ fontSize: '16px', color: '#94a3b8', fontWeight: 500 }}>
            Loading Enterprise Dashboard...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="enterprise-dashboard" style={{
      height: '100vh',
      background: '#0f172a',
      color: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <EnterpriseTopBar 
        orgName={orgName} 
        userRole={userRole} 
        currentTime={currentTime}
        systemStatus={systemStatus}
      />
      <EnterpriseKPIs 
        stats={stats} 
        previousStats={previousStats}
        loading={loading}
      />
      
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <EnterpriseDealStream
          deals={deals}
          selectedDeal={selectedDeal}
          onDealSelect={setSelectedDeal}
          onDealAction={handleDealAction}
          userRole={userRole}
          loading={loading}
        />
        <EnterpriseAnalysisPanel
          selectedDeal={selectedDeal}
          userRole={userRole}
          onDealAction={handleDealAction}
        />
      </div>
    </div>
  );
}
