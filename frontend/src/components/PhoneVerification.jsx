/**
 * Phone Verification Component
 * 
 * Features:
 * - Phone number input with auto-check customer
 * - Show existing customer info/warnings
 * - OTP flow (send → input → verify)
 * - Verification status with visual indicators
 * - Fraud warnings display
 */

import { useState, useEffect, useCallback, memo } from 'react';
import { checkCustomer, sendOtp, verifyOtp } from '../api';
import './PhoneVerification.css';

// Mask phone for display: 98****3210
function maskPhone(phone) {
  if (!phone || phone.length !== 10) return phone;
  return `${phone.slice(0, 2)}****${phone.slice(-4)}`;
}

// Format date for display
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Format currency
function formatCurrency(val) {
  if (val == null) return '—';
  return '₹' + Number(val).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export default memo(function PhoneVerification({
  phone,
  onPhoneChange,
  onVerifiedChange,
  customerName,
  disabled = false,
}) {
  const [customerInfo, setCustomerInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [verified, setVerified] = useState(false);
  const [customerId, setCustomerId] = useState(null);
  const [maskedPhone, setMaskedPhone] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [otpExpiry, setOtpExpiry] = useState(300); // 5 minutes

  // Check customer when phone changes (debounced)
  useEffect(() => {
    const check = async () => {
      if (!phone || phone.length !== 10) {
        setCustomerInfo(null);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const data = await checkCustomer(phone);
        setCustomerInfo(data);

        // If customer exists and is verified, auto-set verified
        if (data.exists && data.is_verified) {
          setVerified(true);
          setCustomerId(data.customer_id);
          onVerifiedChange?.({ verified: true, customerId: data.customer_id });
        } else {
          setVerified(false);
          setCustomerId(null);
          onVerifiedChange?.({ verified: false, customerId: null });
        }
      } catch (err) {
        console.error('Check customer error:', err);
        setCustomerInfo(null);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(check, 500);
    return () => clearTimeout(timer);
  }, [phone, onVerifiedChange]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setInterval(() => {
        setCountdown(c => Math.max(0, c - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [countdown]);

  // OTP expiry countdown
  useEffect(() => {
    if (otpSent && otpExpiry > 0 && !verified) {
      const timer = setInterval(() => {
        setOtpExpiry(e => {
          if (e <= 1) {
            setOtpSent(false);
            setOtp('');
            return 0;
          }
          return e - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [otpSent, otpExpiry, verified]);

  const handleSendOtp = useCallback(async () => {
    if (!phone || phone.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setOtpLoading(true);
    setError('');

    try {
      const data = await sendOtp(phone);
      setMaskedPhone(data.masked_phone);
      setOtpSent(true);
      setOtpExpiry(300);
      setCountdown(30); // 30 second rate limit
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  }, [phone]);

  const handleVerifyOtp = useCallback(async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter the 6-digit OTP');
      return;
    }

    setVerifyLoading(true);
    setError('');

    try {
      const data = await verifyOtp(phone, otp);
      setVerified(data.verified);
      setCustomerId(data.customer_id);
      onVerifiedChange?.({ verified: true, customerId: data.customer_id });
    } catch (err) {
      setError(err.message || 'Invalid OTP. Please try again.');
    } finally {
      setVerifyLoading(false);
    }
  }, [phone, otp, onVerifiedChange]);

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
    onPhoneChange?.(value);
    setOtpSent(false);
    setOtp('');
    setVerified(false);
    setError('');
  };

  // Format countdown time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="phone-verification">
      {/* Phone Input */}
      <div className="form-group">
        <label className="form-label">
          Mobile Number * {verified && <span className="verified-badge">✓ Verified</span>}
        </label>
        <div className="phone-input-wrapper">
          <input
            type="tel"
            className={`form-input ${verified ? 'verified' : ''}`}
            placeholder="10-digit mobile number"
            value={phone}
            onChange={handlePhoneChange}
            disabled={disabled || verified}
            maxLength={10}
          />
          {loading && <span className="loading-spinner-small" />}
          {verified && (
            <span className="verification-status verified">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="9" stroke="#10B981" strokeWidth="2"/>
                <path d="M6 10L9 13L14 7" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          )}
        </div>
      </div>

      {/* Customer Info / Warning */}
      {customerInfo && customerInfo.exists && (
        <div className={`customer-info-panel ${customerInfo.warning_message ? 'warning' : ''}`}>
          <div className="customer-info-header">
            <span className="customer-badge existing">👤 Existing Customer</span>
            {customerInfo.is_verified ? (
              <span className="verified-badge">✓ Verified</span>
            ) : (
              <span className="unverified-badge">⚠ Not Verified</span>
            )}
          </div>
          
          {customerInfo.name && (
            <div className="customer-name">{customerInfo.name}</div>
          )}
          
          <div className="customer-stats">
            <div className="stat">
              <span className="stat-value">{customerInfo.deal_count}</span>
              <span className="stat-label">Deals</span>
            </div>
            {customerInfo.recent_deals?.length > 0 && (
              <div className="stat">
                <span className="stat-value">{formatDate(customerInfo.recent_deals[0].created_at)}</span>
                <span className="stat-label">Last Deal</span>
              </div>
            )}
          </div>

          {customerInfo.warning_message && (
            <div className="customer-warning">
              <span className="warning-icon">⚠️</span>
              {customerInfo.warning_message}
            </div>
          )}

          {/* Recent Deals */}
          {customerInfo.recent_deals?.length > 0 && (
            <div className="recent-deals">
              <div className="recent-deals-title">Recent Deals</div>
              {customerInfo.recent_deals.slice(0, 3).map((deal) => (
                <div key={deal.id} className="recent-deal-item">
                  <span className={`deal-status status-${deal.status.toLowerCase()}`}>
                    {deal.status}
                  </span>
                  <span className="deal-variant">{deal.variant}</span>
                  <span className="deal-price">{formatCurrency(deal.final_price)}</span>
                  <span className="deal-date">{formatDate(deal.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New Customer Indicator */}
      {customerInfo && !customerInfo.exists && phone.length === 10 && (
        <div className="customer-info-panel new">
          <div className="customer-info-header">
            <span className="customer-badge new">✨ New Customer</span>
          </div>
          <p className="new-customer-text">
            This phone number is not in our system. Please verify to create a new customer record.
          </p>
        </div>
      )}

      {/* OTP Section */}
      {!verified && phone.length === 10 && (!customerInfo?.exists || !customerInfo?.is_verified) && (
        <div className="otp-section">
          {!otpSent ? (
            <button
              className="btn btn-secondary btn-verify"
              onClick={handleSendOtp}
              disabled={otpLoading || countdown > 0}
            >
              {otpLoading ? (
                <><span className="loading-spinner-small" /> Sending...</>
              ) : countdown > 0 ? (
                `Resend in ${countdown}s`
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginRight: '6px' }}>
                    <path d="M8 1C4.134 1 1 4.134 1 8C1 11.866 4.134 15 8 15C11.866 15 15 11.866 15 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M8 4V8L11 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M15 3L15 7M15 7L13 5.5M15 7L17 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" transform="translate(-2, -1)"/>
                  </svg>
                  Send OTP
                </>
              )}
            </button>
          ) : (
            <div className="otp-input-section">
              <div className="otp-sent-info">
                <span className="otp-sent-text">
                  OTP sent to <strong>{maskedPhone || maskPhone(phone)}</strong>
                </span>
                <span className="otp-expiry">
                  Expires in {formatTime(otpExpiry)}
                </span>
              </div>

              <div className="otp-input-row">
                <input
                  type="text"
                  className="form-input otp-input"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                />
                <button
                  className="btn btn-primary"
                  onClick={handleVerifyOtp}
                  disabled={verifyLoading || otp.length !== 6}
                >
                  {verifyLoading ? (
                    <><span className="loading-spinner-small" /> Verifying...</>
                  ) : (
                    'Verify OTP'
                  )}
                </button>
              </div>

              <div className="otp-actions">
                <button
                  className="btn-link"
                  onClick={handleSendOtp}
                  disabled={countdown > 0 || otpLoading}
                >
                  {countdown > 0 ? `Resend OTP in ${countdown}s` : 'Resend OTP'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="verification-error">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}
    </div>
  );
});
