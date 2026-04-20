/**
 * Optimized Create Deal - Fast loading, no syntax errors
 */

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { fetchVariants, analyzeDeal, createDeal, QueuedError } from '../api';
import EmailOtpVerification from './EmailOtpVerification';

// West Bengal RTO data
const westBengalRTOs = [
  { code: "WB-01", name: "Kolkata North", district: "Kolkata" },
  { code: "WB-02", name: "Kolkata South", district: "Kolkata" },
  { code: "WB-03", name: "Kolkata East", district: "Kolkata" },
  { code: "WB-04", name: "Kolkata West", district: "Kolkata" },
  { code: "WB-05", name: "Barasat (North 24 Parganas)", district: "North 24 Parganas" },
  { code: "WB-06", name: "Barrackpore", district: "Barrackpore" },
  { code: "WB-07", name: "Basirhat", district: "Basirhat" },
  { code: "WB-08", name: "Krishnanagar (Nadia)", district: "Nadia" },
  { code: "WB-09", name: "Berhampore (Murshidabad)", district: "Murshidabad" },
  { code: "WB-10", name: "Malda", district: "Malda" },
  { code: "WB-11", name: "Balurghat (Dakshin Dinajpur)", district: "Dakshin Dinajpur" },
  { code: "WB-12", name: "Raiganj (Uttar Dinajpur)", district: "Uttar Dinajpur" },
  { code: "WB-13", name: "Siliguri", district: "Siliguri" },
  { code: "WB-14", name: "Cooch Behar", district: "Cooch Behar" },
  { code: "WB-15", name: "Jalpaiguri", district: "Jalpaiguri" },
  { code: "WB-16", name: "Alipurduar", district: "Alipurduar" },
  { code: "WB-17", name: "Darjeeling", district: "Darjeeling" },
  { code: "WB-18", name: "Kalimpong", district: "Kalimpong" },
  { code: "WB-19", name: "Asansol (Paschim Bardhaman)", district: "Paschim Bardhaman" },
  { code: "WB-20", name: "Durgapur", district: "Durgapur" },
  { code: "WB-21", name: "Burdwan (Purba Bardhaman)", district: "Purba Bardhaman" },
  { code: "WB-22", name: "Bankura", district: "Bankura" },
  { code: "WB-23", name: "Purulia", district: "Purulia" },
  { code: "WB-24", name: "Midnapore (Paschim Medinipur)", district: "Paschim Medinipur" },
  { code: "WB-25", name: "Tamluk (Purba Medinipur)", district: "Purba Medinipur" },
  { code: "WB-26", name: "Howrah", district: "Howrah" },
  { code: "WB-27", name: "Uluberia", district: "Uluberia" },
  { code: "WB-28", name: "Hooghly (Chinsurah)", district: "Hooghly" },
  { code: "WB-29", name: "Arambagh", district: "Arambagh" },
  { code: "WB-30", name: "Bolpur (Birbhum)", district: "Birbhum" },
  { code: "WB-31", name: "Suri (Birbhum)", district: "Birbhum" }
];

export default memo(function CreateDeal({ onDealCreated }) {
  const [form, setForm] = useState({
    customer_name: '',
    mobile: '',
    model: '',
    variant: '',
    registration_type: 'INDIVIDUAL',
    discount: '',
    
    // Customer fields
    customer_email: '',  // MANDATORY - for OTP verification
    phone: '',
    father_name: '',
    address: '',
    aadhaar: '',
    pan: '',
    voter_id: '',
    rse_name: '',
    sm_name: '',
    
    // Deal/CRM fields
    delivery_date: '',
    crm_date: '',
    crm_invoice_no: '',
    crm_esp: '',
    
    // Vehicle fields
    colour: '',
    chassis_no: '',
    engine_no: '',
    
    // Finance fields
    sale_type: 'CASH',
    financer_name: '',
    financer_branch: '',
    inhouse_finance: 'NO',
    
    // RTO fields
    rto_code: '',
    rto_name: '',
    rto_district: '',
    branch: '',
  });

  const [variants, setVariants] = useState([]);
  const [filteredVariants, setFilteredVariants] = useState([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [canProceed, setCanProceed] = useState(false);

  const variantRef = useRef(null);
  const analyzeTimer = useRef(null);

  // Load variants on mount
  useEffect(() => {
    const loadVariants = async () => {
      try {
        const data = await fetchVariants();
        setVariants(data || []);
      } catch (err) {
        console.error('Failed to load variants:', err);
        setVariants([]);
      }
    };
    loadVariants();
  }, []);

  const handleChange = useCallback((field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  }, []);

  const handleEmailChange = useCallback((value) => {
    setForm(prev => ({ ...prev, customer_email: value }));
    setError('');
  }, []);

  const handlePhoneChange = useCallback((value) => {
    setForm(prev => ({ ...prev, mobile: value }));
    setPhoneVerified(false);
    setCanProceed(false);
    setError('');
  }, []);

  const handleVerificationChange = useCallback(({ verified, canProceed: proceed }) => {
    setPhoneVerified(verified);
    setCanProceed(proceed);
  }, []);

  const selectVariant = useCallback((variant) => {
    setForm(prev => ({ ...prev, variant: variant.variant }));
    setShowAutocomplete(false);
    triggerAnalysis(variant.variant, form.discount, form.registration_type);
  }, [form.discount, form.registration_type]);

  const triggerAnalysis = useCallback(
    (variant, discount, regType) => {
      if (analyzeTimer.current) clearTimeout(analyzeTimer.current);
      if (!variant) {
        setAnalysis(null);
        return;
      }
      analyzeTimer.current = setTimeout(async () => {
        setAnalyzing(true);
        try {
          const result = await analyzeDeal({
            variant,
            discount: parseFloat(discount) || 0,
            registration_type: regType,
          });
          setAnalysis(result);
        } catch (e) {
          setAnalysis(null);
        }
        setAnalyzing(false);
      }, 500);
    },
    []
  );

  const handleKeyDown = useCallback((e) => {
    if (!showAutocomplete) {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSubmit();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, filteredVariants.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIndex >= 0 && filteredVariants[highlightIndex]) {
        selectVariant(filteredVariants[highlightIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowAutocomplete(false);
    }
  }, [showAutocomplete, filteredVariants, highlightIndex]);

  const handleSubmit = useCallback(async () => {
    if (!form.customer_name || !form.mobile || !form.customer_email || !form.model || !form.variant || !form.rto_code) {
      setError('Customer name, mobile, email, model, variant, and RTO are required');
      return;
    }

    if (!canProceed) {
      setError('Phone number must be verified before creating a deal. Please verify via email OTP.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const deal = await createDeal({
        customer_name: form.customer_name,
        mobile: form.mobile || null,
        customer_email: form.customer_email,
        model: form.model || null,
        variant: form.variant,
        registration_type: form.registration_type,
        discount: parseFloat(form.discount) || 0,
        
        // Customer fields
        phone: form.phone || null,
        father_name: form.father_name || null,
        address: form.address || null,
        aadhaar: form.aadhaar || null,
        pan: form.pan || null,
        voter_id: form.voter_id || null,
        rse_name: form.rse_name || null,
        sm_name: form.sm_name || null,
        
        // Deal/CRM fields
        delivery_date: form.delivery_date || null,
        crm_date: form.crm_date || null,
        crm_invoice_no: form.crm_invoice_no || null,
        crm_esp: form.crm_esp ? parseFloat(form.crm_esp) : null,
        
        // Vehicle fields
        colour: form.colour || null,
        chassis_no: form.chassis_no || null,
        engine_no: form.engine_no || null,
        
        // Finance fields
        sale_type: form.sale_type || 'CASH',
        financer_name: form.financer_name || null,
        financer_branch: form.financer_branch || null,
        inhouse_finance: form.inhouse_finance || 'NO',
        
        // RTO fields
        rto_code: form.rto_code || null,
        rto_name: form.rto_name || null,
        rto_district: form.rto_district || null,
        branch: form.branch || null,
      });

      setSuccess(`Deal created — ${deal.status}`);
      setPhoneVerified(false);
      setCanProceed(false);
      setForm({
        customer_name: '',
        mobile: '',
        customer_email: '',
        model: '',
        variant: '',
        registration_type: 'INDIVIDUAL',
        discount: '',
        
        // Customer fields
        phone: '',
        father_name: '',
        address: '',
        aadhaar: '',
        pan: '',
        voter_id: '',
        rse_name: '',
        sm_name: '',
        
        // Deal/CRM fields
        delivery_date: '',
        crm_date: '',
        crm_invoice_no: '',
        crm_esp: '',
        
        // Vehicle fields
        colour: '',
        chassis_no: '',
        engine_no: '',
        
        // Finance fields
        sale_type: 'CASH',
        financer_name: '',
        financer_branch: '',
        inhouse_finance: 'NO',
        
        // RTO fields
        rto_code: '',
        rto_name: '',
        rto_district: '',
        branch: '',
      });
      setAnalysis(null);
      onDealCreated?.(deal);
    } catch (e) {
      // Offline queue: show as soft-success rather than an error
      if (e instanceof QueuedError) {
        setSuccess(e.message);
        setSubmitting(false);
        return;
      }
      const err = e.detail || e.message;
      if (err && typeof err === 'object') {
        if (Array.isArray(err)) {
          const messages = err.map(d => {
            const field = d.loc?.[1] || 'field';
            return `${field}: ${d.msg}`;
          });
          setError(messages.join('; '));
        } else if (err.error) {
          setError(err.error);
        } else {
          setError(JSON.stringify(err));
        }
      } else if (err) {
        setError(err);
      } else {
        setError('Failed to create deal. Please check your inputs.');
      }
    }

    setSubmitting(false);
  }, [form]);

  const formatCurrency = (val) => {
    if (val == null) return '—';
    return '₹' + Number(val).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  };

  const riskClass = analysis ? `risk-${analysis.risk_level.toLowerCase()}` : '';

  return (
    <div>
      <div className="page-header">
        <h2>⚡ Create Deal</h2>
        <p>Enter deal details for instant analysis and routing</p>
      </div>

      <div className="create-deal-layout">
        {/* Form */}
        <div className="form-card">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="customer-name">Customer Name *</label>
              <input
                id="customer-name"
                className="form-input"
                type="text"
                placeholder="Enter customer name"
                value={form.customer_name}
                onChange={(e) => handleChange('customer_name', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="father-name">Father Name *</label>
              <input
                id="father-name"
                className="form-input"
                type="text"
                placeholder="Enter father name"
                value={form.father_name}
                onChange={(e) => handleChange('father_name', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Email OTP Verification Component */}
          <EmailOtpVerification
            email={form.customer_email}
            phone={form.mobile}
            onEmailChange={handleEmailChange}
            onPhoneChange={handlePhoneChange}
            onVerifiedChange={handleVerificationChange}
            disabled={submitting}
          />

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="model">Vehicle Model *</label>
              <input
                id="model"
                className="form-input"
                type="text"
                placeholder="Enter vehicle model"
                value={form.model}
                onChange={(e) => handleChange('model', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="phone">Phone (Optional)</label>
              <input
                id="phone"
                className="form-input"
                type="tel"
                placeholder="Alternative phone"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="variant-input">
              Vehicle Variant * {variants.length > 0 && <span style={{color: '#6b7280', fontWeight: 'normal'}}>({variants.length} loaded)</span>}
            </label>
            <div className="autocomplete-wrapper" ref={variantRef}>
              <input
                id="variant-input"
                className="form-input"
                type="text"
                placeholder={variants.length === 0 ? "Loading variants..." : "Start typing to search variants..."}
                value={form.variant}
                onChange={(e) => {
                  handleChange('variant', e.target.value);
                  const search = e.target.value.toLowerCase();
                  if (search) {
                    const filtered = variants.filter(v => 
                      v.variant.toLowerCase().includes(search)
                    );
                    setFilteredVariants(filtered);
                    setShowAutocomplete(true);
                    setHighlightIndex(-1);
                  } else {
                    setFilteredVariants(variants.slice(0, 10));
                    setShowAutocomplete(variants.length > 0);
                  }
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  if (variants.length > 0) {
                    setFilteredVariants(variants.slice(0, 10));
                    setShowAutocomplete(true);
                  }
                }}
                onBlur={() => setTimeout(() => setShowAutocomplete(false), 200)}
                autoComplete="off"
              />
              {showAutocomplete && (
                <div className="autocomplete-list" id="variant-autocomplete">
                  {filteredVariants.slice(0, 10).map((v, i) => (
                    <div
                      key={v.variant}
                      className={`autocomplete-item ${i === highlightIndex ? 'highlighted' : ''}`}
                      onMouseDown={() => selectVariant(v)}
                    >
                      {v.variant}
                      <span className="autocomplete-item-price">
                        {formatCurrency(v.ex_showroom_price)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="reg-type">Registration Type</label>
              <select
                id="reg-type"
                className="form-select"
                value={form.registration_type}
                onChange={(e) => {
                  handleChange('registration_type', e.target.value);
                  triggerAnalysis(form.variant, form.discount, e.target.value);
                }}
              >
                <option value="INDIVIDUAL">Individual</option>
                <option value="5YR">5 Year</option>
                <option value="15YR">15 Year</option>
                <option value="BH">BH</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="discount-input">Discount (₹)</label>
              <input
                id="discount-input"
                className="form-input"
                type="number"
                placeholder="0"
                min="0"
                value={form.discount}
                onChange={(e) => {
                  handleChange('discount', e.target.value);
                  triggerAnalysis(form.variant, e.target.value, form.registration_type);
                }}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="rto-select">RTO Office *</label>
              <select
                id="rto-select"
                className="form-select"
                value={form.rto_code}
                onChange={(e) => {
                  const selectedRTO = westBengalRTOs.find(rto => rto.code === e.target.value);
                  handleChange('rto_code', e.target.value);
                  handleChange('rto_name', selectedRTO?.name || '');
                  handleChange('rto_district', selectedRTO?.district || '');
                }}
                required
              >
                <option value="">Select RTO...</option>
                {westBengalRTOs.map((rto) => (
                  <option key={rto.code} value={rto.code}>
                    {rto.code} - {rto.name} ({rto.district})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="branch-input">Branch *</label>
              <input
                id="branch-input"
                className="form-input"
                type="text"
                placeholder="Enter branch name"
                value={form.branch}
                onChange={(e) => handleChange('branch', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="address">Address *</label>
              <input
                id="address"
                className="form-input"
                type="text"
                placeholder="Enter address"
                value={form.address}
                onChange={(e) => handleChange('address', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="aadhaar">Aadhaar *</label>
              <input
                id="aadhaar"
                className="form-input"
                type="text"
                placeholder="12-digit Aadhaar"
                value={form.aadhaar}
                onChange={(e) => handleChange('aadhaar', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="pan">PAN *</label>
              <input
                id="pan"
                className="form-input"
                type="text"
                placeholder="ABCDE1234F"
                value={form.pan}
                onChange={(e) => handleChange('pan', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="voter-id">Voter ID *</label>
              <input
                id="voter-id"
                className="form-input"
                type="text"
                placeholder="Voter ID"
                value={form.voter_id}
                onChange={(e) => handleChange('voter_id', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="colour">Colour *</label>
              <input
                id="colour"
                className="form-input"
                type="text"
                placeholder="Vehicle colour"
                value={form.colour}
                onChange={(e) => handleChange('colour', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="chassis-no">Chassis No *</label>
              <input
                id="chassis-no"
                className="form-input"
                type="text"
                placeholder="Chassis number"
                value={form.chassis_no}
                onChange={(e) => handleChange('chassis_no', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="engine-no">Engine No *</label>
              <input
                id="engine-no"
                className="form-input"
                type="text"
                placeholder="Engine number"
                value={form.engine_no}
                onChange={(e) => handleChange('engine_no', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="sale-type">Sale Type *</label>
              <select
                id="sale-type"
                className="form-select"
                value={form.sale_type}
                onChange={(e) => handleChange('sale_type', e.target.value)}
                required
              >
                <option value="CASH">CASH</option>
                <option value="FINANCE">FINANCE</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="financer-name">Financer Name *</label>
              <input
                id="financer-name"
                className="form-input"
                type="text"
                placeholder="Financer name (if FINANCE)"
                value={form.financer_name}
                onChange={(e) => handleChange('financer_name', e.target.value)}
                required={form.sale_type === 'FINANCE'}
              />
            </div>
          </div>

          {form.sale_type === 'FINANCE' && (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="financer-branch">Financer Branch *</label>
                <input
                  id="financer-branch"
                  className="form-input"
                  type="text"
                  placeholder="Financer branch (if FINANCE)"
                  value={form.financer_branch}
                  onChange={(e) => handleChange('financer_branch', e.target.value)}
                  required={form.sale_type === 'FINANCE'}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="inhouse-finance">Inhouse Finance *</label>
                <select
                  id="inhouse-finance"
                  className="form-select"
                  value={form.inhouse_finance}
                  onChange={(e) => handleChange('inhouse_finance', e.target.value)}
                  required
                >
                  <option value="NO">NO</option>
                  <option value="YES">YES</option>
                </select>
              </div>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="rse-name">RSE Name *</label>
              <input
                id="rse-name"
                className="form-input"
                type="text"
                placeholder="Retail Sales Executive"
                value={form.rse_name}
                onChange={(e) => handleChange('rse_name', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="sm-name">SM Name *</label>
              <input
                id="sm-name"
                className="form-input"
                type="text"
                placeholder="Sales Manager"
                value={form.sm_name}
                onChange={(e) => handleChange('sm_name', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="delivery-date">Delivery Date *</label>
              <input
                id="delivery-date"
                className="form-input"
                type="date"
                value={form.delivery_date}
                onChange={(e) => handleChange('delivery_date', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="crm-date">CRM Date *</label>
              <input
                id="crm-date"
                className="form-input"
                type="date"
                value={form.crm_date}
                onChange={(e) => handleChange('crm_date', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="crm-invoice-no">CRM Invoice No *</label>
              <input
                id="crm-invoice-no"
                className="form-input"
                type="text"
                placeholder="CRM invoice number"
                value={form.crm_invoice_no}
                onChange={(e) => handleChange('crm_invoice_no', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="crm-esp">CRM ESP *</label>
              <input
                id="crm-esp"
                className="form-input"
                type="number"
                placeholder="CRM ESP"
                value={form.crm_esp}
                onChange={(e) => handleChange('crm_esp', e.target.value)}
                required
              />
            </div>
          </div>

          {error && (
            <div style={{ color: 'var(--risk-high)', fontSize: '0.85rem', marginBottom: 'var(--space-md)' }}>
              ❌ {error}
            </div>
          )}
          {success && (
            <div style={{ color: 'var(--risk-low)', fontSize: '0.85rem', marginBottom: 'var(--space-md)' }}>
              ✅ {success}
            </div>
          )}

          {analysis && !analyzing && (
            <div className={`analysis-panel ${riskClass}`}>
              <div className="analysis-header">
                <span className="analysis-title">Instant Analysis</span>
                <span className={`badge badge-${analysis.risk_level.toLowerCase()}`}>
                  {analysis.risk_level} RISK
                </span>
              </div>

              <div className="analysis-grid">
                <div className="analysis-stat">
                  <div className="analysis-stat-value">{formatCurrency(analysis.base_price)}</div>
                  <div className="analysis-stat-label">Base Price</div>
                </div>
                <div className="analysis-stat">
                  <div className={`analysis-stat-value ${analysis.discount > 0 ? 'negative' : ''}`}>
                    {formatCurrency(analysis.discount)}
                  </div>
                  <div className="analysis-stat-label">Discount</div>
                </div>
                <div className="analysis-stat">
                  <div className="analysis-stat-value">{formatCurrency(analysis.final_price)}</div>
                  <div className="analysis-stat-label">Final Price</div>
                </div>
                <div className="analysis-stat">
                  <div className={`analysis-stat-value ${analysis.margin < 0 ? 'negative' : 'positive'}`}>
                    {Number(analysis.margin_percent).toFixed(1)}%
                  </div>
                  <div className="analysis-stat-label">Margin</div>
                </div>
              </div>

              <div className="analysis-decision">
                <span className="analysis-decision-icon">
                  {analysis.decision === 'AUTO_APPROVE' ? '✅' : analysis.decision === 'GM_APPROVAL' ? '⚠️' : '🚨'}
                </span>
                <div className="analysis-decision-text">
                  <strong>
                    {analysis.decision === 'AUTO_APPROVE'
                      ? 'Auto-Approved'
                      : analysis.decision === 'GM_APPROVAL'
                      ? 'GM Approval Required'
                      : 'Director Approval Required'}
                  </strong>
                  {analysis.reason}
                </div>
              </div>
            </div>
          )}

          {analyzing && (
            <div className="analysis-panel" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', opacity: 0.3 }}>📊</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 'var(--space-sm)' }}>
                Analyzing deal...
              </div>
            </div>
          )}

          <button
            id="submit-deal"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={submitting || !canProceed}
            style={{ width: '100%' }}
          >
            {submitting ? (
              <><span className="loading-spinner" /> Processing...</>
            ) : !canProceed ? (
              '🔒 Verify Phone to Create Deal'
            ) : (
              '⚡ Create Deal'
            )}
          </button>
        </div>
      </div>
    </div>
  );
});
