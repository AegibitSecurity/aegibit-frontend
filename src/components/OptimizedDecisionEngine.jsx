/**
 * Optimized Decision Engine - Fast loading, minimal re-renders
 * Premium enterprise-grade UI — dark glassmorphism theme
 */

import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { fetchDashboard, fetchDeals, approveGM, approveDirector, rejectDeal, deleteDeal, getOrgId, getRole } from '../api';
import { useWebSocket } from '../hooks/useWebSocket';
import { useIsMobile } from '../hooks/useIsMobile';

// ─── Injected Premium Styles ────────────────────────────────────────────────
const premiumStyles = `
  /* ── Scoped CSS Variables ─────────────────────────────────────────────── */
  .ode-root {
    --ode-bg: #0B0F14;
    --ode-bg-secondary: #11161D;
    --ode-glass: rgba(255,255,255,0.04);
    --ode-glass-hover: rgba(255,255,255,0.07);
    --ode-border: rgba(255,255,255,0.08);
    --ode-border-strong: rgba(255,255,255,0.12);
    --ode-text: #E6EDF3;
    --ode-text-sec: #9BA7B4;
    --ode-text-dim: #6B7280;
    --ode-accent: #6366F1;
    --ode-accent-soft: rgba(99,102,241,0.15);
    --ode-accent-glow: rgba(99,102,241,0.3);
    --ode-green: #22C55E;
    --ode-green-soft: rgba(34,197,94,0.12);
    --ode-yellow: #F59E0B;
    --ode-yellow-soft: rgba(245,158,11,0.12);
    --ode-red: #EF4444;
    --ode-red-soft: rgba(239,68,68,0.12);
    --ode-radius: 12px;
    --ode-radius-sm: 8px;
  }

  /* ── Scrollbars ─────────────────────────────────────────────────────── */
  .ode-root ::-webkit-scrollbar { width: 5px; height: 5px; }
  .ode-root ::-webkit-scrollbar-track { background: transparent; }
  .ode-root ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
  .ode-root ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }

  /* ── Animations ─────────────────────────────────────────────────────── */
  @keyframes ode-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.8); }
  }
  @keyframes ode-pulse-ring {
    0% { transform: scale(1); opacity: 0.5; }
    100% { transform: scale(2.4); opacity: 0; }
  }
  @keyframes ode-fade-up {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes ode-slide-in {
    from { opacity: 0; transform: translateX(12px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes ode-glow-breathe {
    0%, 100% { box-shadow: 0 0 15px rgba(99,102,241,0.1); }
    50% { box-shadow: 0 0 25px rgba(99,102,241,0.25); }
  }
  @keyframes ode-skeleton {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes ode-spinner {
    to { transform: rotate(360deg); }
  }

  /* ── KPI Card ───────────────────────────────────────────────────────── */
  .ode-kpi {
    position: relative;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
  }
  .ode-kpi::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: var(--ode-radius);
    padding: 1px;
    background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02));
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s;
  }
  .ode-kpi:hover::before { opacity: 1; }
  .ode-kpi:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 30px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.06);
    background: var(--ode-glass-hover) !important;
  }

  /* ── Deal Row ───────────────────────────────────────────────────────── */
  .ode-deal {
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
  }
  .ode-deal:hover {
    background: rgba(255,255,255,0.03) !important;
    box-shadow: inset 0 0 0 1px rgba(255,255,255,0.05);
  }
  .ode-deal.ode-active {
    background: rgba(99,102,241,0.08) !important;
    box-shadow: inset 0 0 0 1px rgba(99,102,241,0.15);
  }

  /* ── Buttons ────────────────────────────────────────────────────────── */
  .ode-btn {
    transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }
  .ode-btn:hover {
    transform: translateY(-1px) scale(1.02);
    filter: brightness(1.15);
  }
  .ode-btn:active {
    transform: translateY(0) scale(0.97);
    filter: brightness(0.9);
  }
  .ode-btn-green:hover { box-shadow: 0 4px 20px rgba(34,197,94,0.35); }
  .ode-btn-red:hover { box-shadow: 0 4px 20px rgba(239,68,68,0.35); }

  /* ── Skeleton ───────────────────────────────────────────────────────── */
  .ode-skel {
    background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%);
    background-size: 200% 100%;
    animation: ode-skeleton 1.5s ease-in-out infinite;
    border-radius: var(--ode-radius-sm);
  }

  /* ── Panel enter animation ──────────────────────────────────────────── */
  .ode-panel-enter { animation: ode-slide-in 0.3s cubic-bezier(0.4, 0, 0.2, 1); }

  /* ── Mobile deal card ───────────────────────────────────────────────── */
  .ode-deal-card {
    margin: 8px 12px;
    background: var(--ode-glass);
    border: 1px solid var(--ode-border);
    border-radius: var(--ode-radius);
    padding: 14px;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .ode-deal-card.ode-active {
    border-color: var(--ode-accent);
    background: rgba(99,102,241,0.08);
  }
  .ode-deal-card:active { transform: scale(0.98); }

  /* ── Mobile bottom sheet (analysis) ────────────────────────────────── */
  .ode-sheet-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.7);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    z-index: 450;
    display: flex;
    align-items: flex-end;
    animation: ode-fade-in 150ms ease-out;
  }
  @keyframes ode-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  .ode-sheet {
    width: 100%;
    background: var(--ode-bg-secondary);
    border-radius: 20px 20px 0 0;
    border-top: 1px solid var(--ode-border-strong);
    max-height: 85vh;
    overflow-y: auto;
    animation: ode-sheet-up 300ms cubic-bezier(0.32, 0.72, 0, 1);
    padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px));
    touch-action: pan-y;
    will-change: transform;
  }
  @keyframes ode-sheet-up {
    from { transform: translateY(100%); }
    to   { transform: translateY(0); }
  }
  .ode-sheet-drag-handle-row {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px 16px 4px;
    position: relative;
  }
  .ode-sheet-handle {
    width: 36px; height: 4px;
    background: var(--ode-border-strong);
    border-radius: 9999px;
  }
  .ode-sheet-close-btn {
    position: absolute;
    right: 16px;
    top: 8px;
    width: 32px; height: 32px;
    border-radius: 50%;
    background: var(--ode-glass);
    border: 1px solid var(--ode-border);
    color: var(--ode-text-dim);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    font-size: 14px;
    line-height: 1;
  }

  /* ── Touch-safe buttons (min 44px) ─────────────────────────────────── */
  .ode-btn-touch {
    min-height: 44px !important;
    flex: 1;
  }
`;

// ─── Swipe-to-dismiss bottom sheet ──────────────────────────────────────────
function MobileSheet({ onClose, children }) {
  const sheetRef = useRef(null);
  const startY = useRef(0);
  const dragY = useRef(0);

  const onTouchStart = (e) => {
    startY.current = e.touches[0].clientY;
    dragY.current = 0;
    if (sheetRef.current) sheetRef.current.style.transition = 'none';
  };

  const onTouchMove = (e) => {
    const delta = e.touches[0].clientY - startY.current;
    dragY.current = delta;
    if (delta > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${delta}px)`;
    }
  };

  const onTouchEnd = () => {
    const el = sheetRef.current;
    if (!el) return;
    el.style.transition = 'transform 280ms cubic-bezier(0.32, 0.72, 0, 1)';
    if (dragY.current > 80) {
      el.style.transform = 'translateY(100%)';
      setTimeout(onClose, 260);
    } else {
      el.style.transform = 'translateY(0)';
    }
  };

  return (
    <div className="ode-sheet-overlay" onClick={onClose}>
      <div
        ref={sheetRef}
        className="ode-sheet"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="ode-sheet-drag-handle-row">
          <div className="ode-sheet-handle" />
          <button className="ode-sheet-close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Shared badge helpers ────────────────────────────────────────────────────
const RiskBadge = ({ risk }) => (
  <span style={{
    padding: '3px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.04em', display: 'inline-flex', alignItems: 'center', gap: 5,
    background: risk === 'HIGH' ? 'var(--ode-red-soft)' : risk === 'MEDIUM' ? 'var(--ode-yellow-soft)' : 'var(--ode-green-soft)',
    color: risk === 'HIGH' ? 'var(--ode-red)' : risk === 'MEDIUM' ? 'var(--ode-yellow)' : 'var(--ode-green)',
    border: `1px solid ${risk === 'HIGH' ? 'rgba(239,68,68,0.2)' : risk === 'MEDIUM' ? 'rgba(245,158,11,0.2)' : 'rgba(34,197,94,0.2)'}`,
  }}>
    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
    {risk || 'LOW'}
  </span>
);

const StatusBadge = ({ status }) => (
  <span style={{
    padding: '3px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.04em',
    background: status === 'APPROVED' ? 'var(--ode-green-soft)' : status === 'REJECTED' ? 'var(--ode-red-soft)' : 'var(--ode-yellow-soft)',
    color: status === 'APPROVED' ? 'var(--ode-green)' : status === 'REJECTED' ? 'var(--ode-red)' : 'var(--ode-yellow)',
    border: `1px solid ${status === 'APPROVED' ? 'rgba(34,197,94,0.2)' : status === 'REJECTED' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
  }}>
    {status}
  </span>
);

// ─── SVG Icons ──────────────────────────────────────────────────────────────
const Ico = {
  docs: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  clock: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  alert: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  chart: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  dollar: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  up: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>,
  down: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  check: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  x: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  layers: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  trash: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  target: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  zap: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  shield: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  crosshair: <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.12"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>,
};

const kpiIcons = [Ico.docs, Ico.clock, Ico.alert, Ico.chart, Ico.dollar];

const formatCurrency = (val) => {
  if (val == null) return '---';
  return `₹${Number(val).toLocaleString('en-IN')}`;
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

// ─── Memoized Top Bar ───────────────────────────────────────────────────────
const TopBar = memo(({ orgName, userRole, currentTime, pendingCount }) => (
  <div style={{ display: 'flex', flexDirection: 'column' }}>
    {/* Accent glow line */}
    <div style={{
      height: '2px',
      background: 'linear-gradient(90deg, transparent, var(--ode-accent), #818CF8, var(--ode-accent), transparent)',
      boxShadow: '0 0 12px var(--ode-accent-glow), 0 0 4px var(--ode-accent-glow)',
    }} />

    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '14px 24px',
      background: 'linear-gradient(180deg, rgba(17,22,29,0.96), rgba(11,15,20,0.92))',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--ode-border)',
    }}>
      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '26px', height: '26px', borderRadius: '7px',
            background: 'linear-gradient(135deg, var(--ode-accent), #818CF8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 10px var(--ode-accent-glow)',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          </div>
          <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--ode-text)', letterSpacing: '-0.03em' }}>
            AEGIBIT <span style={{ fontWeight: 400, opacity: 0.45 }}>Flow</span>
          </span>
        </div>

        <div style={{ height: '18px', width: '1px', background: 'var(--ode-border)' }} />

        <div style={{
          padding: '4px 12px', background: 'var(--ode-glass)', borderRadius: '16px',
          fontSize: '11px', fontWeight: 600, color: 'var(--ode-text-sec)',
          border: '1px solid var(--ode-border)', letterSpacing: '0.01em',
        }}>
          {orgName}
        </div>
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {pendingCount > 0 && (
          <div style={{
            padding: '4px 12px', background: 'var(--ode-yellow-soft)',
            borderRadius: '16px', fontSize: '11px', fontWeight: 700, color: 'var(--ode-yellow)',
            border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--ode-yellow)' }} />
            {pendingCount} pending
          </div>
        )}

        {/* Live badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '7px',
          padding: '4px 12px', background: 'rgba(34,197,94,0.07)',
          borderRadius: '16px', border: '1px solid rgba(34,197,94,0.15)',
        }}>
          <div style={{ position: 'relative', width: '7px', height: '7px' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'var(--ode-green)', borderRadius: '50%', animation: 'ode-pulse 2s ease-in-out infinite' }} />
            <div style={{ position: 'absolute', inset: '-2px', border: '1px solid var(--ode-green)', borderRadius: '50%', animation: 'ode-pulse-ring 2s ease-out infinite' }} />
          </div>
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--ode-green)', letterSpacing: '0.06em' }}>LIVE</span>
        </div>

        <div style={{
          padding: '4px 14px',
          background: (userRole === 'GM' || userRole === 'DIRECTOR')
            ? 'linear-gradient(135deg, var(--ode-accent), #818CF8)' : 'var(--ode-glass)',
          borderRadius: '16px', fontSize: '10px', fontWeight: 700,
          color: 'white', textTransform: 'uppercase', letterSpacing: '0.06em',
          boxShadow: (userRole === 'GM' || userRole === 'DIRECTOR') ? '0 2px 10px var(--ode-accent-glow)' : 'none',
        }}>
          {userRole}
        </div>

        <div style={{
          fontSize: '11px', fontWeight: 600, color: 'var(--ode-text-dim)',
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace", letterSpacing: '0.04em',
          background: 'var(--ode-glass)', padding: '4px 10px',
          borderRadius: '6px', border: '1px solid var(--ode-border)',
        }}>
          {currentTime}
        </div>
      </div>
    </div>
  </div>
));

// ─── Memoized KPI Cards ─────────────────────────────────────────────────────
const KPICards = memo(({ stats, loading, isMobile }) => {
  const cols = isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)';
  const pad  = isMobile ? '12px 12px' : '18px 24px';

  if (loading) {
    return (
      <div style={{
        display: 'grid', gridTemplateColumns: cols, gap: isMobile ? '8px' : '14px',
        padding: pad, borderBottom: '1px solid var(--ode-border)',
      }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="ode-skel"
            style={{ height: isMobile ? '72px' : '88px', gridColumn: isMobile && i === 4 ? 'span 2' : undefined }}
          />
        ))}
      </div>
    );
  }

  const kpis = [
    { title: 'Deals Today', value: stats?.total_deals || 0, color: 'var(--ode-text)' },
    { title: 'Pending',     value: stats?.pending || 0,     color: stats?.pending > 0 ? 'var(--ode-yellow)' : 'var(--ode-green)' },
    { title: 'High Risk',   value: stats?.high_risk || 0,   color: stats?.high_risk > 0 ? 'var(--ode-red)' : 'var(--ode-green)' },
    { title: 'Avg Margin',  value: stats?.avg_margin ? `${Number(stats.avg_margin).toFixed(1)}%` : '0%', color: 'var(--ode-text)' },
    { title: 'Revenue',     value: formatCurrency(stats?.revenue_today || 0), color: 'var(--ode-text)' },
  ];

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: cols, gap: isMobile ? '8px' : '14px',
      padding: pad,
      background: 'linear-gradient(180deg, rgba(255,255,255,0.012), transparent)',
      borderBottom: '1px solid var(--ode-border)',
    }}>
      {kpis.map((kpi, i) => (
        <div key={i} className="ode-kpi" style={{
          background: 'var(--ode-glass)', border: '1px solid var(--ode-border)',
          borderRadius: 'var(--ode-radius)', padding: isMobile ? '12px 14px' : '16px 18px', cursor: 'pointer',
          gridColumn: isMobile && i === 4 ? 'span 2' : undefined,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ fontSize: '9px', color: 'var(--ode-text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {kpi.title}
            </div>
            {!isMobile && (
              <div style={{
                width: '28px', height: '28px', borderRadius: '7px',
                background: 'var(--ode-glass)', border: '1px solid var(--ode-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--ode-text-dim)',
              }}>
                {kpiIcons[i]}
              </div>
            )}
          </div>
          <div style={{
            fontSize: isMobile ? '22px' : '26px', fontWeight: 800, color: kpi.color,
            lineHeight: 1, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums',
          }}>
            {kpi.value}
          </div>
        </div>
      ))}
    </div>
  );
});

// ─── Memoized Deal Stream ───────────────────────────────────────────────────
const DealStream = memo(({ deals, selectedDeal, onDealSelect, onDealAction, onDelete, userRole, loading, isMobile }) => {
  if (loading) {
    return (
      <div style={{ padding: isMobile ? '12px' : '24px' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="ode-skel" style={{ height: isMobile ? '88px' : '52px', marginBottom: isMobile ? '8px' : '6px', borderRadius: 'var(--ode-radius)' }} />
        ))}
      </div>
    );
  }

  const thStyle = {
    fontSize: '9px', fontWeight: 700, color: 'var(--ode-text-dim)',
    textTransform: 'uppercase', letterSpacing: '0.1em',
  };

  // ── Section header (shared) ─────────────────────────────────────────────────
  const sectionHeader = (
    <div style={{
      padding: isMobile ? '12px 12px' : '14px 24px',
      borderBottom: '1px solid var(--ode-border)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      background: 'linear-gradient(180deg, rgba(255,255,255,0.015), transparent)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ color: 'var(--ode-accent)', display: 'flex' }}>{Ico.layers}</span>
        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ode-text)', letterSpacing: '-0.02em' }}>
          Live Deals
        </span>
        <span style={{
          background: 'var(--ode-glass)', border: '1px solid var(--ode-border)',
          borderRadius: '10px', padding: '1px 9px', fontSize: '11px',
          fontWeight: 700, color: 'var(--ode-text-dim)', fontVariantNumeric: 'tabular-nums',
        }}>
          {deals.length}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: 'var(--ode-text-dim)' }}>
        <div style={{ position: 'relative', width: '6px', height: '6px' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'var(--ode-green)', borderRadius: '50%', animation: 'ode-pulse 2s ease-in-out infinite' }} />
        </div>
        <span style={{ fontWeight: 500 }}>Real-time</span>
      </div>
    </div>
  );

  // ── MOBILE: card layout ─────────────────────────────────────────────────────
  if (isMobile) {
    const canAct = (deal) => (userRole === 'GM' || userRole === 'DIRECTOR') && deal.status === 'PENDING';
    const riskBorder = (risk) =>
      risk === 'HIGH' ? 'var(--ode-red)' : risk === 'MEDIUM' ? 'var(--ode-yellow)' : 'var(--ode-green)';

    const emptyState = !loading && deals.length === 0 && (
      <div style={{
        padding: '64px 24px', textAlign: 'center',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
      }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '16px',
          background: 'var(--ode-glass)', border: '1px solid var(--ode-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--ode-text-dim)',
        }}>
          {Ico.layers}
        </div>
        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ode-text-sec)' }}>No deals yet</div>
        <div style={{ fontSize: '13px', color: 'var(--ode-text-dim)', lineHeight: 1.5, maxWidth: '220px' }}>
          New deals will appear here in real-time as they are created
        </div>
      </div>
    );

    return (
      <div>
        {sectionHeader}
        {emptyState}
        <div style={{ paddingBottom: '8px' }}>
          {deals.map((deal) => (
            <div
              key={deal.id}
              className={`ode-deal-card${selectedDeal?.id === deal.id ? ' ode-active' : ''}`}
              style={{ borderLeft: `3px solid ${riskBorder(deal.risk_level)}` }}
              onClick={() => onDealSelect(deal)}
            >
              {/* Row 1: customer + price */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ode-text)', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {deal.customer_name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--ode-text-dim)', fontWeight: 500 }}>
                    {deal.model} · {deal.variant}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--ode-text)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                    {formatCurrency(deal.final_price)}
                  </div>
                  <div style={{
                    fontSize: '12px', fontWeight: 600, fontVariantNumeric: 'tabular-nums',
                    color: deal.margin_percent > 3 ? 'var(--ode-green)' : deal.margin_percent > 1 ? 'var(--ode-yellow)' : 'var(--ode-red)',
                  }}>
                    {deal.margin_percent?.toFixed(1)}% margin
                  </div>
                </div>
              </div>

              {/* Row 2: badges + time */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: canAct(deal) || userRole === 'ADMIN' ? '12px' : 0 }}>
                <RiskBadge risk={deal.risk_level} />
                <StatusBadge status={deal.status} />
                <div style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--ode-text-dim)' }}>
                  {formatTimeAgo(deal.created_at)}
                </div>
              </div>

              {/* Action buttons — 44px touch targets */}
              {canAct(deal) && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="ode-btn ode-btn-green ode-btn-touch"
                    onClick={(e) => { e.stopPropagation(); onDealAction(deal, 'approve'); }}
                    style={{
                      flex: 1, padding: '10px', minHeight: '44px',
                      background: 'var(--ode-green-soft)', color: 'var(--ode-green)',
                      border: '1px solid rgba(34,197,94,0.25)', borderRadius: '8px',
                      fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    }}
                  >
                    {Ico.check} Approve
                  </button>
                  <button
                    className="ode-btn ode-btn-red ode-btn-touch"
                    onClick={(e) => { e.stopPropagation(); onDealAction(deal, 'reject'); }}
                    style={{
                      flex: 1, padding: '10px', minHeight: '44px',
                      background: 'var(--ode-red-soft)', color: 'var(--ode-red)',
                      border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px',
                      fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    }}
                  >
                    {Ico.x} Reject
                  </button>
                </div>
              )}
              {userRole === 'ADMIN' && (
                <button
                  className="ode-btn ode-btn-delete ode-btn-touch"
                  onClick={(e) => { e.stopPropagation(); if (window.confirm('Delete this deal?')) { onDelete?.(deal); } }}
                  style={{
                    width: '100%', padding: '10px', minHeight: '44px',
                    background: 'var(--ode-red-soft)', color: 'var(--ode-red)',
                    border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px',
                    fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  }}
                >
                  {Ico.trash} Delete Deal
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── DESKTOP: table layout (unchanged) ──────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {sectionHeader}

      {/* Sticky table header */}
      <div style={{
        display: 'grid', gridTemplateColumns: '2fr 1.2fr 0.8fr 0.7fr 0.7fr 0.8fr',
        gap: '12px', alignItems: 'center', padding: '8px 24px',
        background: 'rgba(11,15,20,0.95)', borderBottom: '1px solid var(--ode-border)',
        position: 'sticky', top: 0, zIndex: 5,
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      }}>
        {['Customer', 'Price', 'Margin', 'Risk', 'Status', 'Time'].map((h, i) => (
          <div key={h} style={{ ...thStyle, textAlign: i === 0 ? 'left' : i === 1 ? 'right' : 'center' }}>{h}</div>
        ))}
      </div>

      {/* Rows */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {deals.map((deal, idx) => (
          <div
            key={deal.id}
            className={`ode-deal ${selectedDeal?.id === deal.id ? 'ode-active' : ''}`}
            style={{
              padding: '12px 24px', cursor: 'pointer',
              borderBottom: '1px solid rgba(255,255,255,0.03)',
              borderLeft: selectedDeal?.id === deal.id ? '3px solid var(--ode-accent)' : '3px solid transparent',
              background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.008)',
            }}
            onClick={() => onDealSelect(deal)}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 0.8fr 0.7fr 0.7fr 0.8fr', gap: '12px', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ode-text)', marginBottom: '1px', letterSpacing: '-0.01em' }}>
                  {deal.customer_name}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--ode-text-dim)', fontWeight: 500 }}>
                  {deal.model} · {deal.variant}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ode-text)', fontVariantNumeric: 'tabular-nums' }}>
                  {formatCurrency(deal.final_price)}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '13px', fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                  color: deal.margin_percent > 3 ? 'var(--ode-green)' : deal.margin_percent > 1 ? 'var(--ode-yellow)' : 'var(--ode-red)',
                }}>
                  {deal.margin_percent?.toFixed(1)}%
                </div>
              </div>
              <div style={{ textAlign: 'center' }}><RiskBadge risk={deal.risk_level} /></div>
              <div style={{ textAlign: 'center' }}><StatusBadge status={deal.status} /></div>
              <div style={{ textAlign: 'right', fontSize: '11px', color: 'var(--ode-text-dim)', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                {formatTimeAgo(deal.created_at)}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '10px' }}>
              {(userRole === 'GM' || userRole === 'DIRECTOR') && deal.status === 'PENDING' && (
                <>
                  <button className="ode-btn ode-btn-green" onClick={(e) => { e.stopPropagation(); onDealAction(deal, 'approve'); }}
                    style={{ padding: '4px 14px', background: 'var(--ode-green-soft)', color: 'var(--ode-green)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {Ico.check} Approve
                  </button>
                  <button className="ode-btn ode-btn-red" onClick={(e) => { e.stopPropagation(); onDealAction(deal, 'reject'); }}
                    style={{ padding: '4px 14px', background: 'var(--ode-red-soft)', color: 'var(--ode-red)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {Ico.x} Reject
                  </button>
                </>
              )}
              {userRole === 'ADMIN' && (
                <button className="ode-btn ode-btn-delete" onClick={(e) => { e.stopPropagation(); if (window.confirm('Are you sure? This can be restored later.')) { onDelete?.(deal); } }}
                  style={{ padding: '4px 14px', background: 'var(--ode-red-soft)', color: 'var(--ode-red)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {Ico.trash} Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

// ─── Memoized Analysis Panel ────────────────────────────────────────────────
const AnalysisPanel = memo(({ selectedDeal, userRole, onDealAction }) => {
  if (!selectedDeal) {
    return (
      <div style={{
        padding: '32px 24px', textAlign: 'center', color: 'var(--ode-text-dim)',
        height: '100%', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
      }}>
        <div style={{ marginBottom: '16px' }}>{Ico.crosshair}</div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ode-text-sec)', marginBottom: '6px' }}>
          Select a deal to analyze
        </div>
        <div style={{ fontSize: '11px', color: 'var(--ode-text-dim)', lineHeight: 1.5, maxWidth: '200px' }}>
          Click any deal or use{' '}
          <kbd style={{ background: 'var(--ode-glass)', border: '1px solid var(--ode-border)', borderRadius: '3px', padding: '0 5px', fontSize: '9px', fontFamily: 'monospace' }}>↑</kbd>{' '}
          <kbd style={{ background: 'var(--ode-glass)', border: '1px solid var(--ode-border)', borderRadius: '3px', padding: '0 5px', fontSize: '9px', fontFamily: 'monospace' }}>↓</kbd>{' '}
          keys
        </div>
      </div>
    );
  }

  const recommendation = selectedDeal.margin_percent > 3 ? 'APPROVE' : 
                        selectedDeal.margin_percent < 1 ? 'REVIEW' : 'APPROVE';

  const tcs = selectedDeal.pricing_breakdown?.tcs || 
             (selectedDeal.base_price >= 1000000 ? selectedDeal.base_price * 0.01 : 0);

  const recColor = recommendation === 'APPROVE' ? 'var(--ode-green)' : 'var(--ode-yellow)';
  const recBg = recommendation === 'APPROVE' ? 'var(--ode-green-soft)' : 'var(--ode-yellow-soft)';
  const recBorder = recommendation === 'APPROVE' ? 'rgba(34,197,94,0.25)' : 'rgba(245,158,11,0.25)';

  const sectionTitle = (icon, text) => (
    <div style={{
      fontSize: '9px', fontWeight: 700, color: 'var(--ode-text-dim)', marginBottom: '12px',
      textTransform: 'uppercase', letterSpacing: '0.1em',
      display: 'flex', alignItems: 'center', gap: '7px',
    }}>
      <span style={{ color: 'var(--ode-accent)', display: 'flex' }}>{icon}</span>
      {text}
    </div>
  );

  const priceRow = (label, value, color = 'var(--ode-text)', bold = false) => (
    <div style={{
      display: 'flex', justifyContent: 'space-between', fontSize: '12px',
      padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.03)',
    }}>
      <span style={{ color: 'var(--ode-text-sec)' }}>{label}</span>
      <span style={{ fontWeight: bold ? 800 : 600, color, fontVariantNumeric: 'tabular-nums', fontSize: bold ? '14px' : '12px' }}>
        {value}
      </span>
    </div>
  );

  return (
    <div className="ode-panel-enter" key={selectedDeal.id} style={{
      height: '100%', overflow: 'auto', display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(180deg, rgba(255,255,255,0.015), transparent)',
    }}>
      {/* Panel header */}
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid var(--ode-border)',
        background: 'var(--ode-glass)', position: 'sticky', top: 0, zIndex: 5,
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div style={{
            width: '24px', height: '24px', borderRadius: '6px',
            background: 'linear-gradient(135deg, var(--ode-accent), #818CF8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px var(--ode-accent-glow)', color: 'white',
          }}>
            {Ico.target}
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ode-text)', letterSpacing: '-0.02em' }}>Deal Intelligence</div>
            <div style={{ fontSize: '10px', color: 'var(--ode-text-dim)', fontWeight: 500 }}>Instant Analysis</div>
          </div>
        </div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ode-text-sec)' }}>
          {selectedDeal.customer_name}
          <span style={{ color: 'var(--ode-text-dim)', fontWeight: 400 }}> · {selectedDeal.variant}</span>
        </div>
        <div style={{ fontSize: '10px', color: 'var(--ode-text-dim)', marginTop: '3px' }}>
          {selectedDeal.model} · {formatTimeAgo(selectedDeal.created_at)}
        </div>
      </div>

      <div style={{ padding: '20px', flex: 1 }}>
        {/* Price Breakdown */}
        <div style={{ marginBottom: '24px' }}>
          {sectionTitle(Ico.dollar, 'Price Breakdown')}
          <div style={{
            background: 'var(--ode-glass)', border: '1px solid var(--ode-border)',
            borderRadius: 'var(--ode-radius-sm)', padding: '4px 14px',
          }}>
            {priceRow('Base Price', formatCurrency(selectedDeal.base_price))}
            {priceRow('Road Tax', formatCurrency(selectedDeal.pricing_breakdown?.road_tax || 0))}
            {priceRow('Insurance', formatCurrency(selectedDeal.pricing_breakdown?.insurance || 0))}
            {priceRow('TCS', formatCurrency(tcs))}
            {priceRow('Discount', `-${formatCurrency(selectedDeal.discount)}`, 'var(--ode-red)')}
            <div style={{ height: '1px', background: 'var(--ode-border)', margin: '4px 0' }} />
            {priceRow('Final Price', formatCurrency(selectedDeal.final_price), 'var(--ode-text)', true)}
          </div>
        </div>

        {/* Margin Analysis */}
        <div style={{ marginBottom: '24px' }}>
          {sectionTitle(Ico.chart, 'Margin Analysis')}
          <div style={{
            padding: '18px', textAlign: 'center', position: 'relative', overflow: 'hidden',
            background: selectedDeal.margin_percent > 3 ? 'rgba(34,197,94,0.06)' : 'rgba(245,158,11,0.06)',
            borderRadius: 'var(--ode-radius-sm)',
            border: `1px solid ${selectedDeal.margin_percent > 3 ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)'}`,
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
              background: selectedDeal.margin_percent > 3
                ? 'linear-gradient(90deg, transparent, var(--ode-green), transparent)'
                : 'linear-gradient(90deg, transparent, var(--ode-yellow), transparent)',
              opacity: 0.5,
            }} />
            <div style={{
              fontSize: '28px', fontWeight: 800, lineHeight: 1, marginBottom: '4px',
              letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums',
              color: selectedDeal.margin_percent > 3 ? 'var(--ode-green)' : 'var(--ode-yellow)',
            }}>
              {selectedDeal.margin_percent?.toFixed(1)}%
            </div>
            <div style={{ fontSize: '11px', color: 'var(--ode-text-sec)', fontWeight: 500 }}>
              {formatCurrency(selectedDeal.margin)}
            </div>
          </div>
        </div>

        {/* Deal Status */}
        <div style={{ marginBottom: '24px' }}>
          {sectionTitle(Ico.shield, 'Deal Status')}
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{
              padding: '3px 10px', borderRadius: '12px', fontSize: '9px', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.04em',
              background: selectedDeal.risk_level === 'HIGH' ? 'var(--ode-red-soft)' :
                selectedDeal.risk_level === 'MEDIUM' ? 'var(--ode-yellow-soft)' : 'var(--ode-green-soft)',
              color: selectedDeal.risk_level === 'HIGH' ? 'var(--ode-red)' :
                selectedDeal.risk_level === 'MEDIUM' ? 'var(--ode-yellow)' : 'var(--ode-green)',
              border: `1px solid ${selectedDeal.risk_level === 'HIGH' ? 'rgba(239,68,68,0.2)' :
                selectedDeal.risk_level === 'MEDIUM' ? 'rgba(245,158,11,0.2)' : 'rgba(34,197,94,0.2)'}`,
              display: 'inline-flex', alignItems: 'center', gap: '5px',
            }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'currentColor' }} />
              {selectedDeal.risk_level || 'LOW'} RISK
            </span>
            <span style={{
              padding: '3px 10px', borderRadius: '12px', fontSize: '9px', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.04em',
              background: selectedDeal.status === 'APPROVED' ? 'var(--ode-green-soft)' :
                selectedDeal.status === 'REJECTED' ? 'var(--ode-red-soft)' : 'var(--ode-yellow-soft)',
              color: selectedDeal.status === 'APPROVED' ? 'var(--ode-green)' :
                selectedDeal.status === 'REJECTED' ? 'var(--ode-red)' : 'var(--ode-yellow)',
              border: `1px solid ${selectedDeal.status === 'APPROVED' ? 'rgba(34,197,94,0.2)' :
                selectedDeal.status === 'REJECTED' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
            }}>
              {selectedDeal.status}
            </span>
          </div>
        </div>

        {/* Recommendation */}
        <div style={{ marginBottom: '24px' }}>
          {sectionTitle(Ico.zap, 'AI Recommendation')}
          <div style={{
            padding: '18px', textAlign: 'center', borderRadius: 'var(--ode-radius-sm)',
            background: recBg, border: `1px solid ${recBorder}`,
            position: 'relative', overflow: 'hidden',
            animation: 'ode-glow-breathe 3s ease-in-out infinite',
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
              background: `linear-gradient(90deg, transparent, ${recColor}, transparent)`,
            }} />
            <div style={{ fontSize: '18px', fontWeight: 800, color: recColor, marginBottom: '4px', letterSpacing: '0.04em' }}>
              {recommendation}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--ode-text-sec)', fontWeight: 500 }}>
              {selectedDeal.reason || 'Standard review required'}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {(userRole === 'GM' || userRole === 'DIRECTOR') && selectedDeal.status === 'PENDING' && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="ode-btn ode-btn-green"
              onClick={() => onDealAction(selectedDeal, 'approve')}
              style={{
                flex: 1, padding: '12px',
                background: 'linear-gradient(135deg, rgba(34,197,94,0.18), rgba(34,197,94,0.08))',
                color: 'var(--ode-green)', border: '1px solid rgba(34,197,94,0.3)',
                borderRadius: 'var(--ode-radius-sm)', fontSize: '13px', fontWeight: 700,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              }}
            >
              {Ico.check} Approve
            </button>
            <button
              className="ode-btn ode-btn-red"
              onClick={() => onDealAction(selectedDeal, 'reject')}
              style={{
                flex: 1, padding: '12px',
                background: 'linear-gradient(135deg, rgba(239,68,68,0.18), rgba(239,68,68,0.08))',
                color: 'var(--ode-red)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 'var(--ode-radius-sm)', fontSize: '13px', fontWeight: 700,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              }}
            >
              {Ico.x} Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

// ─── Main Optimized Component ───────────────────────────────────────────────
export default memo(function OptimizedDecisionEngine() {
  const isMobile = useIsMobile();
  const [orgName, setOrgName] = useState(localStorage.getItem('aegibit_org_name') || '');
  const userRole = getRole();
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [stats, setStats] = useState(null);
  const [deals, setDeals] = useState([]);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState('');
  const selectedDealRef = useRef(null);

  // Prevent initial flicker
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update time - optimized with minimal re-renders
  useEffect(() => {
    if (!mounted) return;
    
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, [mounted]);

  // Load data - optimized with proper error handling
  const loadData = useCallback(async () => {
    if (!mounted) return;
    
    const orgId = getOrgId();
    if (!orgId) {
      setError('Please select an organization from the sidebar');
      setLoading(false);
      return;
    }
    
    // Update orgName from localStorage
    setOrgName(localStorage.getItem('aegibit_org_name') || '');
    
    try {
      setError('');
      const [dashboardData, dealsData] = await Promise.all([
        fetchDashboard().catch(() => null),
        fetchDeals(null).catch(() => [])
      ]);
      
      if (dashboardData) setStats(dashboardData);
      if (dealsData && Array.isArray(dealsData)) {
        setDeals(dealsData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      }
    } catch (err) {
      console.error('Load error:', err);
      setError(err.message || 'Failed to load data');
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

  // WebSocket - optimized
  const handleWsEvent = useCallback((event) => {
    if (['deal_created', 'deal_approved', 'deal_rejected', 'status_changed'].includes(event.type)) {
      loadData();
    }
  }, [loadData]);

  useWebSocket(handleWsEvent);

  // Keep selectedDeal ref in sync for stable callback
  useEffect(() => {
    selectedDealRef.current = selectedDeal;
  }, [selectedDeal]);

  // Listen for org changes from Sidebar (same window)
  useEffect(() => {
    const handleOrgChanged = (e) => {
      const { orgName: newOrgName } = e.detail || {};
      if (newOrgName) {
        setOrgName(newOrgName);
        loadData();
      }
    };
    window.addEventListener('orgChanged', handleOrgChanged);
    return () => window.removeEventListener('orgChanged', handleOrgChanged);
  }, [loadData]);

  // Deal actions - optimized with stable reference
  const handleDealAction = useCallback(async (deal, action) => {
    try {
      if (action === 'approve') {
        const role = getRole();
        if (role === 'GM') {
          await approveGM(deal.id);
        } else if (role === 'DIRECTOR') {
          await approveDirector(deal.id);
        }
      } else if (action === 'reject') {
        await rejectDeal(deal.id);
      }

      await loadData();
      if (selectedDealRef.current?.id === deal.id) {
        setSelectedDeal(null);
      }
    } catch (error) {
      console.error(`Failed to ${action} deal:`, error);
    }
  }, [loadData]);

  // Delete deal handler (ADMIN only)
  const handleDelete = useCallback(async (deal) => {
    const role = getRole();
    if (role !== 'ADMIN') {
      alert('Only ADMIN can delete deals');
      return;
    }
    try {
      console.log('Deleting deal:', deal.id);
      const result = await deleteDeal(deal.id);
      console.log('Delete result:', result);
      await loadData();
      if (selectedDealRef.current?.id === deal.id) {
        setSelectedDeal(null);
      }
    } catch (error) {
      console.error('Failed to delete deal:', error);
      const errorMessage = error?.detail || error?.message || JSON.stringify(error);
      alert(`Failed to delete deal: ${errorMessage}`);
    }
  }, [loadData]);

  // Keyboard shortcuts - optimized
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

  if (!mounted) {
    return (
      <div className="ode-root" style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        height: '100%', background: 'var(--ode-bg)', color: 'var(--ode-text-dim)',
        flexDirection: 'column', gap: '12px',
      }}>
        <style>{premiumStyles}</style>
        <div style={{
          width: '36px', height: '36px', border: '3px solid rgba(99,102,241,0.15)',
          borderTopColor: 'var(--ode-accent)', borderRadius: '50%', animation: 'ode-spinner 0.8s linear infinite',
        }} />
        <div style={{ fontSize: '12px', fontWeight: 500, letterSpacing: '0.04em' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="ode-root" style={{
      height: isMobile ? 'auto' : '100%',
      background: 'var(--ode-bg)', color: 'var(--ode-text)',
      display: 'flex', flexDirection: 'column',
      overflow: isMobile ? 'visible' : 'hidden',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      borderRadius: isMobile ? 0 : '8px',
    }}>
      <style>{premiumStyles}</style>

      {error && (
        <div style={{
          background: 'var(--ode-red-soft)', border: '1px solid rgba(239,68,68,0.2)',
          color: 'var(--ode-red)', padding: '10px 16px', fontSize: '12px', fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          {Ico.alert} {error}
        </div>
      )}

      {/* TopBar: hidden on mobile — MobileTopBar in App.jsx provides this context */}
      {!isMobile && (
        <TopBar
          orgName={orgName || 'No Organization Selected'}
          userRole={userRole}
          currentTime={currentTime}
          pendingCount={stats?.pending || 0}
        />
      )}

      <KPICards stats={stats} loading={loading} isMobile={isMobile} />

      {/* Content area — split pane on desktop, stacked scroll on mobile */}
      <div style={{
        flex: isMobile ? 'none' : 1,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        overflow: isMobile ? 'visible' : 'hidden',
      }}>
        {/* Deal list pane */}
        <div style={{
          flex: isMobile ? 'none' : '0 0 68%',
          borderRight: isMobile ? 'none' : '1px solid var(--ode-border)',
          overflow: isMobile ? 'visible' : 'auto',
        }}>
          <DealStream
            deals={deals}
            selectedDeal={selectedDeal}
            onDealSelect={setSelectedDeal}
            onDealAction={handleDealAction}
            onDelete={handleDelete}
            userRole={userRole}
            loading={loading}
            isMobile={isMobile}
          />
        </div>

        {/* Analysis pane — desktop only (mobile uses bottom sheet below) */}
        {!isMobile && (
          <div style={{ flex: '0 0 32%' }}>
            <AnalysisPanel
              selectedDeal={selectedDeal}
              userRole={userRole}
              onDealAction={handleDealAction}
            />
          </div>
        )}
      </div>

      {/* Mobile: analysis bottom sheet (slides up when deal is selected) */}
      {isMobile && selectedDeal && (
        <MobileSheet onClose={() => setSelectedDeal(null)}>
          <AnalysisPanel
            selectedDeal={selectedDeal}
            userRole={userRole}
            onDealAction={(deal, action) => {
              handleDealAction(deal, action);
              setSelectedDeal(null);
            }}
          />
        </MobileSheet>
      )}
    </div>
  );
});
