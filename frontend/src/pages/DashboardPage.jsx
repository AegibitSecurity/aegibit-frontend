/**
 * Dashboard Page - Integration wrapper for RealTimeDashboard
 */

import React, { useState, useEffect } from 'react';
import RealTimeDashboard from '../components/RealTimeDashboard';
import { getOrgId, getRole } from '../api';

export default function DashboardPage() {
  const [orgName, setOrgName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load organization and role info
    const loadUserInfo = () => {
      try {
        // In a real implementation, you'd fetch org details from API
        const orgId = getOrgId();
        const role = getRole();
        
        // Mock org name for now - in production, fetch from /organizations endpoint
        const orgNames = {
          '5aa6f273-8f1c-40b7-936b-d3586975df4d': 'Nibir Motors',
          '1503167f-933c-4303-99c4-91425bc42769': 'S.S Bajaj'
        };
        
        setOrgName(orgNames[orgId] || 'Unknown Organization');
        setUserRole(role || 'SALES');
      } catch (error) {
        console.error('Failed to load user info:', error);
        setOrgName('Unknown Organization');
        setUserRole('SALES');
      } finally {
        setLoading(false);
      }
    };

    loadUserInfo();
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#0a0a0a',
        color: '#ffffff'
      }}>
        <div className="loading-spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  return (
    <RealTimeDashboard 
      orgName={orgName}
      userRole={userRole}
    />
  );
}
