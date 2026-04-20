/**
 * Simple Debug Dashboard - To identify rendering issues
 */

import { useState, useEffect } from 'react';
import { fetchOrganizations } from '../api';

export default function SimpleDashboard() {
  const [message, setMessage] = useState('Dashboard Loading...');

  useEffect(() => {
    setMessage('Dashboard Loaded Successfully!');

    fetchOrganizations()
      .then(() => setMessage('API Working - Dashboard Ready'))
      .catch(() => setMessage('API Error - Check Backend'));
  }, []);

  return (
    <div style={{
      height: '100vh',
      background: '#0f172a',
      color: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ fontSize: '48px', marginBottom: '24px' }}>AEGIBIT Flow</h1>
      <div style={{
        padding: '24px 48px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.2)',
        fontSize: '24px',
        fontWeight: 600
      }}>
        {message}
      </div>
      
      <div style={{ marginTop: '48px', textAlign: 'center' }}>
        <p style={{ color: '#94a3b8', marginBottom: '16px' }}>Debug Information:</p>
        <div style={{
          padding: '16px',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#cbd5e1',
          maxWidth: '600px'
        }}>
          <p>Component: SimpleDashboard.jsx</p>
          <p>Time: {new Date().toLocaleTimeString()}</p>
          <p>Browser: {navigator.userAgent.split(' ')[0]}</p>
        </div>
      </div>
    </div>
  );
}
