/**
 * AEGIBIT Flow - Real-Time Decision Dashboard
 * 
 * Premium, high-speed dealership decision engine interface
 * Inspired by Stripe, Linear, and Notion for speed and clarity
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchDashboard, fetchDeals, approveGM, approveDirector, rejectDeal, deleteDeal, fetchDeletedDeals, restoreDeal } from '../api';
import { useWebSocket } from '../hooks/useWebSocket';

// ─── Injected Premium Styles ────────────────────────────────────────────────
const dashboardStyles = `
  /* ── Dashboard CSS Variables ─────────────────────────────────────────── */
  .rtd-root {
    --rtd-bg-primary: #0B0F14;
    --rtd-bg-secondary: #11161D;
    --rtd-glass: rgba(255,255,255,0.04);
    --rtd-glass-strong: rgba(255,255,255,0.06);
    --rtd-border-subtle: rgba(255,255,255,0.08);
    --rtd-border-strong: rgba(255,255,255,0.12);
    --rtd-text-primary: #E6EDF3;
    --rtd-text-secondary: #9BA7B4;
    --rtd-text-muted: #6B7280;
    --rtd-accent: #4F46E5;
    --rtd-accent-light: #6366F1;
    --rtd-accent-glow: rgba(79,70,229,0.25);
    --rtd-accent-glow-strong: rgba(79,70,229,0.4);
    --rtd-success: #22C55E;
    --rtd-success-glow: rgba(34,197,94,0.2);
    --rtd-warning: #F59E0B;
    --rtd-warning-glow: rgba(245,158,11,0.2);
    --rtd-risk-high: #EF4444;
    --rtd-risk-high-glow: rgba(239,68,68,0.2);
    --rtd-radius: 12px;
    --rtd-radius-sm: 8px;
    --rtd-radius-xs: 6px;
    --rtd-transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    --rtd-transition-fast: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* ── Scrollbar Styling ──────────────────────────────────────────────── */
  .rtd-root ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  .rtd-root ::-webkit-scrollbar-track {
    background: transparent;
  }
  .rtd-root ::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.1);
    border-radius: 3px;
  }
  .rtd-root ::-webkit-scrollbar-thumb:hover {
    background: rgba(255,255,255,0.18);
  }

  /* ── Animations ──────────────────────────────────────────────────────── */
  @keyframes rtd-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.85); }
  }
  @keyframes rtd-pulse-ring {
    0% { transform: scale(1); opacity: 0.6; }
    100% { transform: scale(2.2); opacity: 0; }
  }
  @keyframes rtd-fade-in {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes rtd-slide-in-right {
    from { opacity: 0; transform: translateX(16px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes rtd-value-pop {
    0% { transform: scale(1); }
    50% { transform: scale(1.08); }
    100% { transform: scale(1); }
  }
  @keyframes rtd-shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes rtd-glow-pulse {
    0%, 100% { box-shadow: 0 0 20px rgba(79,70,229,0.15); }
    50% { box-shadow: 0 0 30px rgba(79,70,229,0.3); }
  }
  @keyframes rtd-spinner {
    to { transform: rotate(360deg); }
  }

  /* ── KPI Card Hover ──────────────────────────────────────────────────── */
  .rtd-kpi-card {
    position: relative;
    transition: var(--rtd-transition);
  }
  .rtd-kpi-card::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: var(--rtd-radius);
    padding: 1px;
    background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.03));
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  .rtd-kpi-card:hover::before {
    opacity: 1;
  }
  .rtd-kpi-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.06) !important;
  }

  /* ── Deal Row Hover ──────────────────────────────────────────────────── */
  .rtd-deal-row {
    transition: var(--rtd-transition);
    position: relative;
  }
  .rtd-deal-row:hover {
    background: rgba(255,255,255,0.04) !important;
    box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06);
  }
  .rtd-deal-row.rtd-selected {
    background: rgba(79,70,229,0.08) !important;
    box-shadow: inset 0 0 0 1px rgba(79,70,229,0.15);
  }

  /* ── Button Micro-interactions ────────────────────────────────────────── */
  .rtd-btn {
    transition: var(--rtd-transition-fast);
    position: relative;
    overflow: hidden;
  }
  .rtd-btn::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.15), transparent);
    opacity: 0;
    transition: opacity 0.2s ease;
  }
  .rtd-btn:hover {
    transform: translateY(-1px) scale(1.02);
    filter: brightness(1.1);
  }
  .rtd-btn:hover::after {
    opacity: 1;
  }
  .rtd-btn:active {
    transform: translateY(0) scale(0.98);
    filter: brightness(0.95);
  }
  .rtd-btn-approve:hover {
    box-shadow: 0 4px 20px rgba(34,197,94,0.35);
  }
  .rtd-btn-reject:hover {
    box-shadow: 0 4px 20px rgba(239,68,68,0.35);
  }

  /* ── Analysis Panel animation ─────────────────────────────────────────── */
  .rtd-analysis-enter {
    animation: rtd-slide-in-right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* ── Table Header Sticky ──────────────────────────────────────────────── */
  .rtd-table-header {
    position: sticky;
    top: 0;
    z-index: 10;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
  }

  /* ── Premium Loading ──────────────────────────────────────────────────── */
  .rtd-loading-spinner {
    width: 44px;
    height: 44px;
    border: 3px solid rgba(79,70,229,0.15);
    border-top-color: var(--rtd-accent);
    border-radius: 50%;
    animation: rtd-spinner 0.8s linear infinite;
  }
`;

// ─── SVG Icon Components (minimal, no dependencies) ─────────────────────────
const Icons = {
  deals: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  pending: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  risk: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  margin: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  revenue: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  arrowUp: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15"/>
    </svg>
  ),
  arrowDown: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  ),
  check: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  x: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  shield: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  target: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="6"/>
      <circle cx="12" cy="12" r="2"/>
    </svg>
  ),
  zap: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  layers: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
      <polyline points="2 17 12 22 22 17"/>
      <polyline points="2 12 12 17 22 12"/>
    </svg>
  ),
  trash: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    </svg>
  ),
  trash: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    </svg>
  ),
  crosshair: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.15">
      <circle cx="12" cy="12" r="10"/>
      <line x1="22" y1="12" x2="18" y2="12"/>
      <line x1="6" y1="12" x2="2" y2="12"/>
      <line x1="12" y1="6" x2="12" y2="2"/>
      <line x1="12" y1="22" x2="12" y2="18"/>
    </svg>
  ),
};

const iconMap = { deal: Icons.deals, pending: Icons.pending, risk: Icons.risk, margin: Icons.margin, revenue: Icons.revenue };

// Utility functions
const formatCurrency = (val) => {
  if (val == null) return '---';
  return `₹${Number(val).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
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

const getRiskColor = (risk) => {
  switch (risk?.toUpperCase()) {
    case 'HIGH': return 'var(--risk-high)';
    case 'MEDIUM': return 'var(--risk-medium)';
    default: return 'var(--risk-low)';
  }
};

const getStatusColor = (status) => {
  switch (status?.toUpperCase()) {
    case 'APPROVED': return 'var(--success)';
    case 'REJECTED': return 'var(--risk-high)';
    case 'PENDING': return 'var(--warning)';
    default: return 'var(--text-muted)';
  }
};

// ─── TOP BAR COMPONENT ──────────────────────────────────────────────────────
function TopBar({ orgName, userRole, currentTime, showDeleted, setShowDeleted }) {
  return (
    <div className="top-bar" style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Glowing accent line at very top */}
      <div style={{
        height: '2px',
        background: 'linear-gradient(90deg, transparent, var(--rtd-accent), var(--rtd-accent-light), var(--rtd-accent), transparent)',
        boxShadow: '0 0 12px var(--rtd-accent-glow), 0 0 4px var(--rtd-accent-glow)',
      }} />
      
      {/* Main bar content */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 28px',
        background: 'linear-gradient(180deg, rgba(17,22,29,0.95) 0%, rgba(11,15,20,0.9) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--rtd-border-subtle)',
      }}>
        {/* Left side: Logo + Org */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, var(--rtd-accent), var(--rtd-accent-light))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 12px var(--rtd-accent-glow)',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>
            <h1 style={{
              margin: 0,
              fontSize: '17px',
              fontWeight: 800,
              color: 'var(--rtd-text-primary)',
              letterSpacing: '-0.03em',
              lineHeight: 1,
            }}>
              AEGIBIT <span style={{ fontWeight: 400, opacity: 0.5 }}>Flow</span>
            </h1>
          </div>

          <div style={{
            height: '20px',
            width: '1px',
            background: 'var(--rtd-border-subtle)',
          }} />

          <div style={{
            padding: '5px 14px',
            background: 'var(--rtd-glass)',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--rtd-text-secondary)',
            letterSpacing: '0.02em',
            border: '1px solid var(--rtd-border-subtle)',
          }}>
            {orgName}
          </div>
        </div>

        {/* Right side: Live indicator + Role + Time */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Live indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 14px',
            background: 'rgba(34,197,94,0.08)',
            borderRadius: '20px',
            border: '1px solid rgba(34,197,94,0.15)',
          }}>
            <div style={{ position: 'relative', width: '8px', height: '8px' }}>
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'var(--rtd-success)',
                borderRadius: '50%',
                animation: 'rtd-pulse 2s ease-in-out infinite',
              }} />
              <div style={{
                position: 'absolute',
                inset: '-2px',
                border: '1px solid var(--rtd-success)',
                borderRadius: '50%',
                animation: 'rtd-pulse-ring 2s ease-out infinite',
              }} />
            </div>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--rtd-success)', letterSpacing: '0.04em' }}>LIVE</span>
          </div>

          {/* Role badge */}
          <div style={{
            padding: '5px 16px',
            background: userRole === 'GM' || userRole === 'DIRECTOR'
              ? 'linear-gradient(135deg, var(--rtd-accent), var(--rtd-accent-light))'
              : 'var(--rtd-glass-strong)',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: 700,
            color: 'white',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            boxShadow: userRole === 'GM' || userRole === 'DIRECTOR'
              ? '0 2px 12px var(--rtd-accent-glow)'
              : 'none',
          }}>
            {userRole}
          </div>

          {/* Deleted Deals Toggle (ADMIN only) */}
          {userRole === 'ADMIN' && (
            <button
              onClick={() => setShowDeleted(!showDeleted)}
              style={{
                padding: '5px 14px',
                background: showDeleted ? 'rgba(239,68,68,0.2)' : 'var(--rtd-glass)',
                border: `1px solid ${showDeleted ? 'rgba(239,68,68,0.4)' : 'var(--rtd-border-subtle)'}`,
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: 600,
                color: showDeleted ? '#ef4444' : 'var(--rtd-text-secondary)',
                letterSpacing: '0.02em',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
              {showDeleted ? 'Viewing Deleted' : 'Deleted Deals'}
            </button>
          )}

          {/* Time */}
          <div style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--rtd-text-muted)',
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            letterSpacing: '0.04em',
            background: 'var(--rtd-glass)',
            padding: '5px 12px',
            borderRadius: '8px',
            border: '1px solid var(--rtd-border-subtle)',
          }}>
            {currentTime}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── KPI STRIP COMPONENT ────────────────────────────────────────────────────
function KPIStrip({ stats, previousStats }) {
  const kpis = [
    {
      label: 'Total Deals Today',
      value: stats?.total_deals || 0,
      delta: stats?.total_deals - (previousStats?.total_deals || 0),
      color: 'var(--rtd-text-primary)',
      icon: 'deal'
    },
    {
      label: 'Pending Approval',
      value: stats?.pending || 0,
      delta: stats?.pending - (previousStats?.pending || 0),
      color: stats?.pending > 0 ? 'var(--warning)' : 'var(--rtd-text-primary)',
      icon: 'pending'
    },
    {
      label: 'High Risk Deals',
      value: stats?.high_risk || 0,
      delta: stats?.high_risk - (previousStats?.high_risk || 0),
      color: stats?.high_risk > 0 ? 'var(--risk-high)' : 'var(--rtd-text-primary)',
      icon: 'risk'
    },
    {
      label: 'Avg Margin %',
      value: stats?.avg_margin ? Number(stats.avg_margin).toFixed(1) + '%' : '0%',
      delta: (stats?.avg_margin || 0) - (previousStats?.avg_margin || 0),
      color: stats?.avg_margin > 3 ? 'var(--success)' : 'var(--rtd-text-primary)',
      icon: 'margin'
    },
    {
      label: 'Revenue Today',
      value: formatCurrency(stats?.revenue_today || 0),
      delta: (stats?.revenue_today || 0) - (previousStats?.revenue_today || 0),
      color: 'var(--rtd-text-primary)',
      icon: 'revenue'
    }
  ];

  return (
    <div className="kpi-strip" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      gap: '16px',
      padding: '20px 28px',
      background: 'linear-gradient(180deg, rgba(255,255,255,0.015) 0%, transparent 100%)',
      borderBottom: '1px solid var(--rtd-border-subtle)',
    }}>
      {kpis.map((kpi, i) => (
        <div key={i} className="rtd-kpi-card" style={{
          background: 'var(--rtd-glass)',
          border: '1px solid var(--rtd-border-subtle)',
          borderRadius: 'var(--rtd-radius)',
          padding: '20px',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Subtle shimmer background */}
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '120px',
            height: '120px',
            background: `radial-gradient(circle at top right, ${kpi.color === 'var(--rtd-text-primary)' ? 'rgba(79,70,229,0.06)' : kpi.color.replace(')', ',0.06)').replace('var(', '').replace(')', '')}06, transparent)`,
            pointerEvents: 'none',
          }} />

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
          }}>
            <div style={{
              fontSize: '10px',
              color: 'var(--rtd-text-muted)',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}>
              {kpi.label}
            </div>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'var(--rtd-glass-strong)',
              border: '1px solid var(--rtd-border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--rtd-text-muted)',
            }}>
              {iconMap[kpi.icon]}
            </div>
          </div>

          <div style={{
            fontSize: '28px',
            fontWeight: 800,
            color: kpi.color,
            marginBottom: '6px',
            lineHeight: 1,
            letterSpacing: '-0.02em',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {kpi.value}
          </div>

          {kpi.delta !== 0 && (
            <div style={{
              fontSize: '11px',
              fontWeight: 600,
              color: kpi.delta > 0 ? 'var(--success)' : 'var(--risk-high)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              marginTop: '4px',
            }}>
              <span style={{ display: 'flex', alignItems: 'center' }}>
                {kpi.delta > 0 ? Icons.arrowUp : Icons.arrowDown}
              </span>
              <span>{Math.abs(typeof kpi.delta === 'number' ? (kpi.delta % 1 !== 0 ? kpi.delta.toFixed(1) : kpi.delta) : kpi.delta)}</span>
              <span style={{ color: 'var(--rtd-text-muted)', fontWeight: 500 }}>vs last</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── LIVE DEAL STREAM COMPONENT ─────────────────────────────────────────────
function LiveDealStream({ deals, selectedDeal, onDealSelect, onDealAction, onDelete, userRole }) {
  const [highlightedDeal, setHighlightedDeal] = useState(null);

  const tableHeaderStyle = {
    fontSize: '10px',
    fontWeight: 700,
    color: 'var(--rtd-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  };

  return (
    <div className="deal-stream" style={{
      flex: 1,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      borderRight: '1px solid var(--rtd-border-subtle)',
    }}>
      {/* Stream Header */}
      <div style={{
        padding: '16px 28px',
        borderBottom: '1px solid var(--rtd-border-subtle)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.02), transparent)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ color: 'var(--rtd-accent-light)', display: 'flex', alignItems: 'center' }}>
            {Icons.layers}
          </div>
          <h2 style={{
            margin: 0,
            fontSize: '15px',
            fontWeight: 700,
            color: 'var(--rtd-text-primary)',
            letterSpacing: '-0.02em',
          }}>
            Live Deal Stream
          </h2>
          <div style={{
            background: 'var(--rtd-glass-strong)',
            border: '1px solid var(--rtd-border-subtle)',
            borderRadius: '12px',
            padding: '2px 10px',
            fontSize: '11px',
            fontWeight: 700,
            color: 'var(--rtd-text-muted)',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {deals.length}
          </div>
        </div>
        <div style={{
          fontSize: '11px',
          color: 'var(--rtd-text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <div style={{ position: 'relative', width: '8px', height: '8px' }}>
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'var(--rtd-success)',
              borderRadius: '50%',
              animation: 'rtd-pulse 2s ease-in-out infinite',
            }} />
          </div>
          <span style={{ fontWeight: 500 }}>Real-time</span>
        </div>
      </div>

      {/* Table Header Row */}
      <div className="rtd-table-header" style={{
        display: 'grid',
        gridTemplateColumns: '2fr 2fr 1.5fr 1fr 1fr 1fr 100px',
        gap: '16px',
        alignItems: 'center',
        padding: '10px 28px',
        background: 'rgba(11,15,20,0.95)',
        borderBottom: '1px solid var(--rtd-border-subtle)',
      }}>
        <div style={tableHeaderStyle}>Customer</div>
        <div style={{ ...tableHeaderStyle, textAlign: 'right' }}>Price</div>
        <div style={{ ...tableHeaderStyle, textAlign: 'center' }}>Margin</div>
        <div style={{ ...tableHeaderStyle, textAlign: 'center' }}>Risk</div>
        <div style={{ ...tableHeaderStyle, textAlign: 'center' }}>Status</div>
        <div style={{ ...tableHeaderStyle, textAlign: 'right' }}>Time</div>
        <div style={{ ...tableHeaderStyle, textAlign: 'center', minWidth: '100px' }}>
          {(userRole === 'GM' || userRole === 'DIRECTOR' || userRole === 'ADMIN') ? 'Action' : ''}
        </div>
      </div>

      {/* Deal Rows */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {deals.map((deal, index) => (
          <div
            key={deal.id}
            className={`rtd-deal-row ${selectedDeal?.id === deal.id ? 'rtd-selected' : ''} ${highlightedDeal === deal.id ? 'highlighted' : ''}`}
            style={{
              padding: '14px 28px',
              borderBottom: '1px solid rgba(255,255,255,0.03)',
              cursor: 'pointer',
              background: index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.012)',
              borderLeft: selectedDeal?.id === deal.id
                ? '3px solid var(--rtd-accent)'
                : '3px solid transparent',
            }}
            onClick={() => onDealSelect(deal)}
            onMouseEnter={() => setHighlightedDeal(deal.id)}
            onMouseLeave={() => setHighlightedDeal(null)}
          >
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 2fr 1.5fr 1fr 1fr 1fr 100px',
              gap: '16px',
              alignItems: 'center',
            }}>
              {/* Customer */}
              <div>
                <div style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--rtd-text-primary)',
                  marginBottom: '2px',
                  letterSpacing: '-0.01em',
                }}>
                  {deal.customer_name}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: 'var(--rtd-text-muted)',
                  fontWeight: 500,
                }}>
                  {deal.model} · {deal.variant}
                </div>
              </div>

              {/* Price */}
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: 'var(--rtd-text-primary)',
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '-0.01em',
                }}>
                  {formatCurrency(deal.final_price)}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: 'var(--rtd-text-muted)',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  Base: {formatCurrency(deal.base_price)}
                </div>
              </div>

              {/* Margin */}
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: deal.margin_percent > 3 ? 'var(--success)' : deal.margin_percent > 0 ? 'var(--warning)' : 'var(--risk-high)',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {deal.margin_percent?.toFixed(1)}%
                </div>
                <div style={{
                  fontSize: '10px',
                  color: 'var(--rtd-text-muted)',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {formatCurrency(deal.margin)}
                </div>
              </div>

              {/* Risk Badge */}
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  padding: '3px 10px',
                  background: deal.risk_level?.toUpperCase() === 'HIGH'
                    ? 'rgba(239,68,68,0.12)'
                    : deal.risk_level?.toUpperCase() === 'MEDIUM'
                      ? 'rgba(245,158,11,0.12)'
                      : 'rgba(34,197,94,0.12)',
                  color: getRiskColor(deal.risk_level),
                  borderRadius: '20px',
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  display: 'inline-block',
                  letterSpacing: '0.04em',
                  border: `1px solid ${deal.risk_level?.toUpperCase() === 'HIGH'
                    ? 'rgba(239,68,68,0.2)'
                    : deal.risk_level?.toUpperCase() === 'MEDIUM'
                      ? 'rgba(245,158,11,0.2)'
                      : 'rgba(34,197,94,0.2)'}`,
                }}>
                  {deal.risk_level || 'LOW'}
                </div>
              </div>

              {/* Status Badge */}
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  padding: '3px 10px',
                  background: deal.status?.toUpperCase() === 'APPROVED'
                    ? 'rgba(34,197,94,0.12)'
                    : deal.status?.toUpperCase() === 'REJECTED'
                      ? 'rgba(239,68,68,0.12)'
                      : deal.status?.toUpperCase() === 'PENDING'
                        ? 'rgba(245,158,11,0.12)'
                        : 'rgba(255,255,255,0.06)',
                  color: getStatusColor(deal.status),
                  borderRadius: '20px',
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  display: 'inline-block',
                  letterSpacing: '0.04em',
                  border: `1px solid ${deal.status?.toUpperCase() === 'APPROVED'
                    ? 'rgba(34,197,94,0.2)'
                    : deal.status?.toUpperCase() === 'REJECTED'
                      ? 'rgba(239,68,68,0.2)'
                      : deal.status?.toUpperCase() === 'PENDING'
                        ? 'rgba(245,158,11,0.2)'
                        : 'rgba(255,255,255,0.08)'}`,
                }}>
                  {deal.status}
                </div>
              </div>

              {/* Time */}
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: '11px',
                  color: 'var(--rtd-text-muted)',
                  fontWeight: 500,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {formatTimeAgo(deal.created_at)}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                {(userRole === 'GM' || userRole === 'DIRECTOR') && deal.status === 'PENDING' ? (
                  <>
                    <button
                      className="rtd-btn rtd-btn-approve"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDealAction(deal, 'approve');
                      }}
                      style={{
                        padding: '5px 12px',
                        background: 'rgba(34,197,94,0.15)',
                        color: 'var(--rtd-success)',
                        border: '1px solid rgba(34,197,94,0.25)',
                        borderRadius: 'var(--rtd-radius-xs)',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {Icons.check} <span>OK</span>
                    </button>
                    <button
                      className="rtd-btn rtd-btn-reject"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDealAction(deal, 'reject');
                      }}
                      style={{
                        padding: '5px 12px',
                        background: 'rgba(239,68,68,0.15)',
                        color: 'var(--rtd-risk-high)',
                        border: '1px solid rgba(239,68,68,0.25)',
                        borderRadius: 'var(--rtd-radius-xs)',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {Icons.x} <span>No</span>
                    </button>
                  </>
                ) : userRole === 'ADMIN' ? (
                  <button
                    className="rtd-btn rtd-btn-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('Are you sure? This can be restored later.')) {
                        onDelete?.(deal);
                      }
                    }}
                    style={{
                      padding: '5px 12px',
                      background: 'rgba(239,68,68,0.15)',
                      color: '#ef4444',
                      border: '1px solid rgba(239,68,68,0.3)',
                      borderRadius: 'var(--rtd-radius-xs)',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {Icons.trash} <span>Delete</span>
                  </button>
                ) : <span style={{ fontSize: '11px', color: 'var(--rtd-text-muted)' }}>—</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── INSTANT ANALYSIS PANEL ─────────────────────────────────────────────────
function InstantAnalysisPanel({ selectedDeal, userRole, onDealAction }) {
  if (!selectedDeal) {
    return (
      <div className="analysis-panel" style={{
        width: '420px',
        minWidth: '420px',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.015), transparent)',
        borderLeft: '1px solid var(--rtd-border-subtle)',
        padding: '32px 28px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--rtd-text-muted)',
      }}>
        <div style={{ marginBottom: '20px' }}>{Icons.crosshair}</div>
        <div style={{
          fontSize: '14px',
          fontWeight: 600,
          textAlign: 'center',
          marginBottom: '8px',
          color: 'var(--rtd-text-secondary)',
        }}>
          Select a deal to analyze
        </div>
        <div style={{
          fontSize: '12px',
          textAlign: 'center',
          color: 'var(--rtd-text-muted)',
          maxWidth: '220px',
          lineHeight: 1.5,
        }}>
          Click on any deal from the stream or use{' '}
          <kbd style={{
            background: 'var(--rtd-glass-strong)',
            border: '1px solid var(--rtd-border-subtle)',
            borderRadius: '4px',
            padding: '1px 6px',
            fontSize: '10px',
            fontFamily: "'JetBrains Mono', monospace",
          }}>↑</kbd>{' '}
          <kbd style={{
            background: 'var(--rtd-glass-strong)',
            border: '1px solid var(--rtd-border-subtle)',
            borderRadius: '4px',
            padding: '1px 6px',
            fontSize: '10px',
            fontFamily: "'JetBrains Mono', monospace",
          }}>↓</kbd>{' '}
          to navigate
        </div>
      </div>
    );
  }

  const recommendation = useMemo(() => {
    const margin = selectedDeal.margin_percent || 0;
    const risk = selectedDeal.risk_level?.toUpperCase();
    
    if (margin < 0) return { action: 'REJECT', reason: 'Negative margin', color: 'var(--risk-high)' };
    if (margin < 2) return { action: 'REVIEW', reason: 'Low margin', color: 'var(--warning)' };
    if (risk === 'HIGH') return { action: 'REVIEW', reason: 'High risk detected', color: 'var(--warning)' };
    if (margin > 5 && risk === 'LOW') return { action: 'APPROVE', reason: 'Strong margin, low risk', color: 'var(--success)' };
    return { action: 'REVIEW', reason: 'Standard review required', color: 'var(--text-muted)' };
  }, [selectedDeal]);

  const sectionTitleStyle = {
    margin: 0,
    fontSize: '10px',
    fontWeight: 700,
    color: 'var(--rtd-text-muted)',
    marginBottom: '14px',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  const dataRowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    padding: '8px 0',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
  };

  return (
    <div className="analysis-panel rtd-analysis-enter" key={selectedDeal.id} style={{
      width: '420px',
      minWidth: '420px',
      background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.005))',
      borderLeft: '1px solid var(--rtd-border-subtle)',
      padding: '0',
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Panel Header */}
      <div style={{
        padding: '20px 28px',
        borderBottom: '1px solid var(--rtd-border-subtle)',
        background: 'var(--rtd-glass)',
        position: 'sticky',
        top: 0,
        zIndex: 5,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '10px',
        }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, var(--rtd-accent), var(--rtd-accent-light))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px var(--rtd-accent-glow)',
            color: 'white',
          }}>
            {Icons.target}
          </div>
          <div>
            <h3 style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 700,
              color: 'var(--rtd-text-primary)',
              letterSpacing: '-0.02em',
            }}>
              Deal Intelligence
            </h3>
            <div style={{
              fontSize: '11px',
              color: 'var(--rtd-text-muted)',
              fontWeight: 500,
            }}>
              Instant Analysis Engine
            </div>
          </div>
        </div>
        <div style={{
          fontSize: '13px',
          color: 'var(--rtd-text-secondary)',
          fontWeight: 600,
        }}>
          {selectedDeal.customer_name}
          <span style={{ color: 'var(--rtd-text-muted)', fontWeight: 400 }}> · {selectedDeal.variant}</span>
        </div>
      </div>

      <div style={{ padding: '24px 28px', flex: 1 }}>
        {/* Price Breakdown */}
        <div style={{ marginBottom: '28px' }}>
          <h4 style={sectionTitleStyle}>
            <span style={{ color: 'var(--rtd-accent-light)', display: 'flex' }}>{Icons.margin}</span>
            Price Breakdown
          </h4>
          <div style={{
            background: 'var(--rtd-glass)',
            border: '1px solid var(--rtd-border-subtle)',
            borderRadius: 'var(--rtd-radius-sm)',
            padding: '4px 16px',
            overflow: 'hidden',
          }}>
            <div style={dataRowStyle}>
              <span style={{ color: 'var(--rtd-text-secondary)' }}>Base Price</span>
              <span style={{ fontWeight: 600, color: 'var(--rtd-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                {formatCurrency(selectedDeal.base_price)}
              </span>
            </div>
            <div style={dataRowStyle}>
              <span style={{ color: 'var(--rtd-text-secondary)' }}>Discount</span>
              <span style={{ fontWeight: 600, color: 'var(--risk-high)', fontVariantNumeric: 'tabular-nums' }}>
                -{formatCurrency(selectedDeal.discount)}
              </span>
            </div>
            <div style={{ ...dataRowStyle, borderBottom: 'none', paddingTop: '10px' }}>
              <span style={{ color: 'var(--rtd-text-primary)', fontWeight: 600 }}>Final Price</span>
              <span style={{ fontWeight: 800, color: 'var(--rtd-text-primary)', fontSize: '15px', fontVariantNumeric: 'tabular-nums' }}>
                {formatCurrency(selectedDeal.final_price)}
              </span>
            </div>
          </div>
        </div>

        {/* Margin Analysis */}
        <div style={{ marginBottom: '28px' }}>
          <h4 style={sectionTitleStyle}>
            <span style={{ color: 'var(--rtd-accent-light)', display: 'flex' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
            </span>
            Margin Analysis
          </h4>
          <div style={{
            padding: '20px',
            background: selectedDeal.margin_percent > 3
              ? 'rgba(34,197,94,0.06)'
              : selectedDeal.margin_percent > 0
                ? 'rgba(245,158,11,0.06)'
                : 'rgba(239,68,68,0.06)',
            borderRadius: 'var(--rtd-radius-sm)',
            border: `1px solid ${selectedDeal.margin_percent > 3
              ? 'rgba(34,197,94,0.2)'
              : selectedDeal.margin_percent > 0
                ? 'rgba(245,158,11,0.2)'
                : 'rgba(239,68,68,0.2)'}`,
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '1px',
              background: selectedDeal.margin_percent > 3
                ? 'linear-gradient(90deg, transparent, var(--success), transparent)'
                : selectedDeal.margin_percent > 0
                  ? 'linear-gradient(90deg, transparent, var(--warning), transparent)'
                  : 'linear-gradient(90deg, transparent, var(--risk-high), transparent)',
              opacity: 0.6,
            }} />
            <div style={{
              fontSize: '32px',
              fontWeight: 800,
              color: selectedDeal.margin_percent > 3 ? 'var(--success)' : selectedDeal.margin_percent > 0 ? 'var(--warning)' : 'var(--risk-high)',
              lineHeight: 1,
              marginBottom: '6px',
              letterSpacing: '-0.03em',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {selectedDeal.margin_percent?.toFixed(1)}%
            </div>
            <div style={{ fontSize: '12px', color: 'var(--rtd-text-secondary)', fontWeight: 500 }}>
              {formatCurrency(selectedDeal.margin)} absolute margin
            </div>
          </div>
        </div>

        {/* Risk Assessment */}
        <div style={{ marginBottom: '28px' }}>
          <h4 style={sectionTitleStyle}>
            <span style={{ color: 'var(--rtd-accent-light)', display: 'flex' }}>{Icons.shield}</span>
            Risk Assessment
          </h4>
          <div style={{
            padding: '16px',
            background: 'var(--rtd-glass)',
            border: '1px solid var(--rtd-border-subtle)',
            borderRadius: 'var(--rtd-radius-sm)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <div style={{
                padding: '4px 12px',
                background: selectedDeal.risk_level?.toUpperCase() === 'HIGH'
                  ? 'rgba(239,68,68,0.12)'
                  : selectedDeal.risk_level?.toUpperCase() === 'MEDIUM'
                    ? 'rgba(245,158,11,0.12)'
                    : 'rgba(34,197,94,0.12)',
                color: getRiskColor(selectedDeal.risk_level),
                borderRadius: '20px',
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '8px',
                border: `1px solid ${selectedDeal.risk_level?.toUpperCase() === 'HIGH'
                  ? 'rgba(239,68,68,0.2)'
                  : selectedDeal.risk_level?.toUpperCase() === 'MEDIUM'
                    ? 'rgba(245,158,11,0.2)'
                    : 'rgba(34,197,94,0.2)'}`,
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: getRiskColor(selectedDeal.risk_level) }} />
                {selectedDeal.risk_level || 'LOW'} RISK
              </div>
              <div style={{ fontSize: '12px', color: 'var(--rtd-text-muted)', fontWeight: 500 }}>
                Stage: <span style={{ color: 'var(--rtd-text-secondary)', fontWeight: 600 }}>{selectedDeal.approval_stage || 'PENDING'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recommendation — Strongly Highlighted */}
        <div style={{ marginBottom: '28px' }}>
          <h4 style={sectionTitleStyle}>
            <span style={{ color: 'var(--rtd-accent-light)', display: 'flex' }}>{Icons.zap}</span>
            AI Recommendation
          </h4>
          <div style={{
            padding: '20px',
            background: recommendation.action === 'APPROVE'
              ? 'rgba(34,197,94,0.08)'
              : recommendation.action === 'REJECT'
                ? 'rgba(239,68,68,0.08)'
                : 'rgba(245,158,11,0.08)',
            borderRadius: 'var(--rtd-radius-sm)',
            border: `1px solid ${recommendation.action === 'APPROVE'
              ? 'rgba(34,197,94,0.25)'
              : recommendation.action === 'REJECT'
                ? 'rgba(239,68,68,0.25)'
                : 'rgba(245,158,11,0.25)'}`,
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
            animation: 'rtd-glow-pulse 3s ease-in-out infinite',
            boxShadow: recommendation.action === 'APPROVE'
              ? '0 0 30px rgba(34,197,94,0.1)'
              : recommendation.action === 'REJECT'
                ? '0 0 30px rgba(239,68,68,0.1)'
                : '0 0 30px rgba(245,158,11,0.1)',
          }}>
            {/* Glow bar top */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '2px',
              background: recommendation.action === 'APPROVE'
                ? 'linear-gradient(90deg, transparent, var(--success), transparent)'
                : recommendation.action === 'REJECT'
                  ? 'linear-gradient(90deg, transparent, var(--risk-high), transparent)'
                  : 'linear-gradient(90deg, transparent, var(--warning), transparent)',
            }} />
            <div style={{
              fontSize: '22px',
              fontWeight: 800,
              color: recommendation.color,
              marginBottom: '6px',
              letterSpacing: '0.05em',
            }}>
              {recommendation.action}
            </div>
            <div style={{
              fontSize: '12px',
              color: 'var(--rtd-text-secondary)',
              fontWeight: 500,
            }}>
              {recommendation.reason}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {(userRole === 'GM' || userRole === 'DIRECTOR') && selectedDeal.status === 'PENDING' && (
          <div style={{
            display: 'flex',
            gap: '12px',
            paddingTop: '8px',
          }}>
            <button
              className="rtd-btn rtd-btn-approve"
              onClick={() => onDealAction(selectedDeal, 'approve')}
              style={{
                flex: 1,
                padding: '13px',
                background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.1))',
                color: 'var(--rtd-success)',
                border: '1px solid rgba(34,197,94,0.3)',
                borderRadius: 'var(--rtd-radius-sm)',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                letterSpacing: '0.02em',
              }}
            >
              {Icons.check} Approve Deal
            </button>
            <button
              className="rtd-btn rtd-btn-reject"
              onClick={() => onDealAction(selectedDeal, 'reject')}
              style={{
                flex: 1,
                padding: '13px',
                background: 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.1))',
                color: 'var(--rtd-risk-high)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 'var(--rtd-radius-sm)',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                letterSpacing: '0.02em',
              }}
            >
              {Icons.x} Reject Deal
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN DASHBOARD COMPONENT ───────────────────────────────────────────────
export default function RealTimeDashboard({ orgName, userRole }) {
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [stats, setStats] = useState(null);
  const [previousStats, setPreviousStats] = useState(null);
  const [deals, setDeals] = useState([]);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleted, setShowDeleted] = useState(false); // ADMIN: view deleted deals

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load data
  const loadData = useCallback(async () => {
    try {
      if (showDeleted && userRole === 'ADMIN') {
        // Fetch deleted deals for ADMIN
        const dealsData = await fetchDeletedDeals();
        setDeals(dealsData.sort((a, b) => new Date(b.deleted_at || b.created_at) - new Date(a.deleted_at || a.created_at)));
      } else {
        // Fetch normal deals + dashboard stats
        const [dashboardData, dealsData] = await Promise.all([
          fetchDashboard(),
          fetchDeals(null)
        ]);
        
        setPreviousStats(stats);
        setStats(dashboardData);
        setDeals(dealsData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [stats, showDeleted, userRole]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // WebSocket integration
  const handleWsEvent = useCallback((event) => {
    if (['deal_created', 'deal_approved', 'deal_rejected', 'status_changed'].includes(event.type)) {
      loadData();
    }
  }, [loadData]);

  useWebSocket(handleWsEvent);

  // Deal action handler
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
    }
  };

  // Delete deal handler (ADMIN only)
  const handleDelete = async (deal) => {
    if (userRole !== 'ADMIN') {
      alert('Only ADMIN can delete deals');
      return;
    }
    try {
      await deleteDeal(deal.id);
      // Refresh data
      await loadData();
      // Clear selection if deleted deal was selected
      if (selectedDeal?.id === deal.id) {
        setSelectedDeal(null);
      }
    } catch (error) {
      console.error('Failed to delete deal:', error);
      alert('Failed to delete deal');
    }
  };

  // Restore deal handler (ADMIN only)
  const handleRestore = async (deal) => {
    if (userRole !== 'ADMIN') {
      alert('Only ADMIN can restore deals');
      return;
    }
    try {
      await restoreDeal(deal.id);
      // Refresh data
      await loadData();
      // Clear selection if restored deal was selected
      if (selectedDeal?.id === deal.id) {
        setSelectedDeal(null);
      }
    } catch (error) {
      console.error('Failed to restore deal:', error);
      alert('Failed to restore deal');
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

  if (loading) {
    return (
      <div className="rtd-root" style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'var(--rtd-bg-primary)',
        color: 'var(--rtd-text-muted)',
        gap: '16px',
      }}>
        <style>{dashboardStyles}</style>
        <div className="rtd-loading-spinner" />
        <div style={{ fontSize: '13px', fontWeight: 500, letterSpacing: '0.04em' }}>
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="real-time-dashboard rtd-root" style={{
      height: '100vh',
      background: 'var(--rtd-bg-primary)',
      color: 'var(--rtd-text-primary)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <style>{dashboardStyles}</style>
      
      <TopBar orgName={orgName} userRole={userRole} currentTime={currentTime} showDeleted={showDeleted} setShowDeleted={setShowDeleted} />
      <KPIStrip stats={stats} previousStats={previousStats} />
      
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <LiveDealStream
          deals={deals}
          selectedDeal={selectedDeal}
          onDealSelect={setSelectedDeal}
          onDealAction={handleDealAction}
          onDelete={handleDelete}
          userRole={userRole}
        />
        <InstantAnalysisPanel
          selectedDeal={selectedDeal}
          userRole={userRole}
          onDealAction={handleDealAction}
        />
      </div>
    </div>
  );
}
