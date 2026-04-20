/**
 * Email OTP Verification Component
 * 
 * Features:
 * - Email + Phone input
 * - Send OTP to email
 * - Verify OTP
 * - Check phone uniqueness (can't be reused)
 * - Block deal creation until verified
 */

import { useState, useEffect, useCallback, memo } from 'react';
import { checkPhone, sendEmailOtp, verifyEmailOtp } from '../api';
import './EmailOtpVerification.css';

// Mask email for display: user@example.com → u***@example.com
function maskEmail(email) {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local[0]}***${local.slice(-1)}@${domain}`;
}

// Mask phone for display: 9876543210 → 98****3210
function maskPhone(phone) {
  if (!phone || phone.length !== 10) return phone;
  return `${phone.slice(0, 2)}****${phone.slice(-4)}`;
}

export default memo(function EmailOtpVerification({
  email,
  phone,
  onEmailChange,
  onPhoneChange,
  onVerifiedChange,
  disabled = false,
}) {
  const [phoneStatus, setPhoneStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [verified, setVerified] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [otpExpiry, setOtpExpiry] = useState(300); // 5 minutes
  const [emailMasked, setEmailMasked] = useState('');

  // Check phone status when phone changes (debounced)
  useEffect(() => {
    const check = async () => {
      if (!phone || phone.length !== 10) {
        setPhoneStatus(null);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const data = await checkPhone(phone);
        setPhoneStatus(data);

        // If phone already has a deal, show error immediately
        if (data.has_deal) {
          setError(data.message);
          onVerifiedChange?.({ verified: false, canProceed: false });
        } else if (data.verified) {
          // Phone is already verified via OTP
          setVerified(true);
          onVerifiedChange?.({ verified: true, canProceed: true });
        }
      } catch (err) {
        console.error('Check phone error:', err);
        setPhoneStatus(null);
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
    // Validate inputs
    if (!phone || phone.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    // Check if phone already has a deal
    if (phoneStatus?.has_deal) {
      setError(phoneStatus.message || 'This phone number is already registered to a deal');
      return;
    }

    setOtpLoading(true);
    setError('');

    try {
      const data = await sendEmailOtp(email, phone);
      setEmailMasked(data.email_masked);
      setOtpSent(true);
      setOtpExpiry(data.expires_in_seconds || 300);
      setCountdown(30); // 30 second rate limit
    } catch (err) {
      const msg = err.message || err.detail || 'Failed to send OTP';
      setError(msg);
    } finally {
      setOtpLoading(false);
    }
  }, [email, phone, phoneStatus]);

  const handleVerifyOtp = useCallback(async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter the 6-digit OTP');
      return;
    }

    setVerifyLoading(true);
    setError('');

    try {
      const data = await verifyEmailOtp(email, phone, otp);
      setVerified(data.verified);
      onVerifiedChange?.({ verified: data.verified, canProceed: data.verified });
    } catch (err) {
      const msg = err.message || err.detail?.message || 'Invalid OTP';
      const remaining = err.detail?.remaining_attempts;
      if (remaining !== undefined) {
        setError(`${msg} (${remaining} attempts remaining)`);
      } else {
        setError(msg);
      }
    } finally {
      setVerifyLoading(false);
    }
  }, [email, phone, otp, onVerifiedChange]);

  const handleEmailChange = (e) => {
    const value = e.target.value;
    onEmailChange?.(value);
    setError('');
  };

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

  const canSendOtp = email && email.includes('@') && phone && phone.length === 10 && !phoneStatus?.has_deal;

  return (
    <div className="email-otp-verification">
      <div className="form-row">
        {/* Email Input */}
        <div className="form-group">
          <label className="form-label">
            Email * {verified && <span className="verified-badge">✓ Verified</span>}
          </label>
          <input
            type="email"
            className={`form-input ${verified ? 'verified' : ''}`}
            placeholder="customer@email.com"
            value={email}
            onChange={handleEmailChange}
            disabled={disabled || verified}
          />
        </div>

        {/* Phone Input */}
        <div className="form-group">
          <label className="form-label">
            Phone Number * {verified && <span className="verified-badge">✓ Verified</span>}
          </label>
          <div className="phone-input-wrapper">
            <input
              type="tel"
              className={`form-input ${verified ? 'verified' : ''} ${phoneStatus?.has_deal ? 'error' : ''}`}
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
      </div>

      {/* Phone Already Has Deal Warning */}
      {phoneStatus?.has_deal && (
        <div className="phone-exists-warning">
          <span className="warning-icon">🚫</span>
          <div className="warning-content">
            <strong>Phone Already Registered</strong>
            <p>{phoneStatus.message}</p>
          </div>
        </div>
      )}

      {/* OTP Section - Only show if phone is not already used */}
      {!verified && !phoneStatus?.has_deal && phone.length === 10 && email.includes('@') && (
        <div className="otp-section">
          {!otpSent ? (
            <button
              className="btn btn-secondary btn-verify"
              onClick={handleSendOtp}
              disabled={otpLoading || countdown > 0 || !canSendOtp}
            >
              {otpLoading ? (
                <><span className="loading-spinner-small" /> Sending...</>
              ) : countdown > 0 ? (
                `Resend in ${countdown}s`
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginRight: '6px' }}>
                    <path d="M2 4h12v10H2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 4l6 5 6-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 4V2h12v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Send OTP to Email
                </>
              )}
            </button>
          ) : (
            <div className="otp-input-section">
              <div className="otp-sent-info">
                <span className="otp-sent-text">
                  OTP sent to <strong>{emailMasked || maskEmail(email)}</strong>
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
