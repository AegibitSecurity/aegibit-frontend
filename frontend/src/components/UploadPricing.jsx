import { useState, useRef } from 'react';
import { uploadPricing } from '../api';

export default function UploadPricing() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  async function handleUpload() {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError('');
    setResult(null);

    try {
      const res = await uploadPricing(file);
      setResult(res);
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
    } catch (e) {
      console.error('Upload error details:', {
        message: e.message,
        stack: e.stack,
        name: e.name,
        toString: e.toString(),
        fullError: e
      });
      
      const errorMessage = e.message || e.toString() || 'Upload failed';
      setError(errorMessage);
    }

    setUploading(false);
  }

  return (
    <div>
      <div className="page-header">
        <h2>📁 Upload Pricing</h2>
        <p>Upload an Excel spreadsheet to update vehicle pricing data</p>
      </div>

      <div className="form-card" style={{ maxWidth: 600 }}>
        <div className="form-group">
          <label className="form-label" htmlFor="pricing-file">Excel File (.xlsx)</label>
          <input
            id="pricing-file"
            ref={inputRef}
            className="form-input"
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => {
              setFile(e.target.files[0]);
              setError('');
              setResult(null);
            }}
            style={{ padding: '8px' }}
          />
        </div>

        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }}>
          📋 Expected format: headers at <strong>row 11</strong>, data from <strong>row 13</strong>. 
          Columns: Variant, Ex-Showroom Price, 5yr, 15yr, BH (fuzzy-matched).
        </div>

        {error && (
          <div style={{ color: 'var(--risk-high)', fontSize: '0.85rem', marginBottom: 'var(--space-md)' }}>
            ❌ {error}
          </div>
        )}

        <button
          id="upload-btn"
          className="btn btn-primary"
          onClick={handleUpload}
          disabled={uploading || !file}
          style={{ width: '100%' }}
        >
          {uploading ? (
            <><span className="loading-spinner" /> Uploading...</>
          ) : (
            '📤 Upload & Process'
          )}
        </button>

        {result && (
          <div className="analysis-panel risk-low" style={{ marginTop: 'var(--space-lg)' }}>
            <div className="analysis-header">
              <span className="analysis-title">Upload Results</span>
              <span className="badge badge-approved">Complete</span>
            </div>
            <div className="analysis-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              <div className="analysis-stat">
                <div className="analysis-stat-value positive">{result.rows_inserted}</div>
                <div className="analysis-stat-label">Rows Inserted</div>
              </div>
              <div className="analysis-stat">
                <div className="analysis-stat-value warning">{result.rows_skipped}</div>
                <div className="analysis-stat-label">Rows Skipped</div>
              </div>
              <div className="analysis-stat">
                <div className="analysis-stat-value">{result.errors?.length || 0}</div>
                <div className="analysis-stat-label">Errors</div>
              </div>
            </div>
            {result.errors?.length > 0 && (
              <div style={{ marginTop: 'var(--space-md)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {result.errors.map((e, i) => (
                  <div key={i}>⚠️ {e}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
