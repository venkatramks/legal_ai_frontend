import React, { useState } from 'react';
import { FileText, Download, RefreshCw, BarChart3, Eye, EyeOff } from 'lucide-react';

interface ResultsDisplayProps {
  result: {
    file_id: string;
    raw_text: string;
    cleaned_text: string;
    document_type?: string;
    guidance?: string;
    llm_available?: boolean;
    statistics: {
      raw_length: number;
      cleaned_length: number;
      reduction_percentage: number;
    };
  };
  onReset: () => void;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ result, onReset }) => {
  // Normalize backend wrapper: some responses use { result: {...}, cached: true }
  const payload: any = result && (result as any).result ? (result as any).result : result;

  const stats = payload && payload.statistics ? payload.statistics : { raw_length: 0, cleaned_length: 0, reduction_percentage: 0 };
  const cleanedText = payload && payload.cleaned_text ? payload.cleaned_text : '';
  const rawText = payload && payload.raw_text ? payload.raw_text : '';
  const docType = payload && payload.document_type ? payload.document_type : 'Legal Document';

  const [activeTab, setActiveTab] = useState<'cleaned' | 'original' | 'stats'>('cleaned');
  const [showFullText, setShowFullText] = useState(false);

  const downloadText = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const truncateText = (text: string, maxLength: number = 2000) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const formatText = (text: string) => {
    const safeText = text || '';
    return safeText.split('\n').map((line, index) => (
      <p key={index} className={line.trim() === '' ? 'empty-line' : ''}>
        {line || '\u00A0'} {/* Non-breaking space for empty lines */}
      </p>
    ));
  };

  return (
    <div className="results-container">
      <div className="results-header">
        <div className="header-content">
          <FileText className="results-icon" />
          <div>
            <h2>Document Processing Complete</h2>
            <p>Your {docType} has been simplified and cleaned</p>
          </div>
        </div>
        <button onClick={onReset} className="new-document-button">
          <RefreshCw className="button-icon" />
          Process New Document
        </button>
      </div>

      <div className="results-summary">
        <div className="summary-card">
          <h3>Processing Summary</h3>
          <div className="summary-stats">
            <div className="stat">
              <span className="stat-label">Document Type:</span>
              <span className="stat-value">{docType}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Original Length:</span>
              <span className="stat-value">{stats.raw_length.toLocaleString()} characters</span>
            </div>
            <div className="stat">
              <span className="stat-label">Cleaned Length:</span>
              <span className="stat-value">{stats.cleaned_length.toLocaleString()} characters</span>
            </div>
            <div className="stat highlight">
              <span className="stat-label">Noise Removed:</span>
              <span className="stat-value">{stats.reduction_percentage}%</span>
            </div>
            <div className="stat">
              <span className="stat-label">AI Analysis:</span>
              <span className="stat-value">{payload && payload.llm_available ? 'Available' : 'Fallback Mode'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="results-tabs">
        <button
          className={`tab ${activeTab === 'cleaned' ? 'active' : ''}`}
          onClick={() => setActiveTab('cleaned')}
        >
          <FileText className="tab-icon" />
          Cleaned Text
        </button>
        <button
          className={`tab ${activeTab === 'original' ? 'active' : ''}`}
          onClick={() => setActiveTab('original')}
        >
          <Eye className="tab-icon" />
          Original Text
        </button>
        <button
          className={`tab ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          <BarChart3 className="tab-icon" />
          Statistics
        </button>
      </div>

      <div className="results-content">
        {activeTab === 'cleaned' && (
          <div className="text-display">
            <div className="text-header">
              <h3>Cleaned & Simplified Text</h3>
              <div className="text-actions">
                <button
                  onClick={() => setShowFullText(!showFullText)}
                  className="toggle-button"
                >
                  {showFullText ? <EyeOff className="button-icon" /> : <Eye className="button-icon" />}
                  {showFullText ? 'Show Preview' : 'Show Full Text'}
                </button>
                <button
                  onClick={() => downloadText(cleanedText, 'cleaned_document.txt')}
                  className="download-button"
                >
                  <Download className="button-icon" />
                  Download
                </button>
              </div>
            </div>
            <div className="text-content">
              {formatText(showFullText ? cleanedText : truncateText(cleanedText))}
              {!showFullText && cleanedText.length > 2000 && (
                <p className="truncation-notice">
                  Text truncated for preview. Click "Show Full Text" to see complete content.
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'original' && (
          <div className="text-display">
            <div className="text-header">
              <h3>Original Extracted Text</h3>
              <div className="text-actions">
                <button
                  onClick={() => setShowFullText(!showFullText)}
                  className="toggle-button"
                >
                  {showFullText ? <EyeOff className="button-icon" /> : <Eye className="button-icon" />}
                  {showFullText ? 'Show Preview' : 'Show Full Text'}
                </button>
                <button
                  onClick={() => downloadText(rawText, 'original_document.txt')}
                  className="download-button"
                >
                  <Download className="button-icon" />
                  Download
                </button>
              </div>
            </div>
            <div className="text-content original">
              {formatText(showFullText ? rawText : truncateText(rawText))}
              {!showFullText && rawText.length > 2000 && (
                <p className="truncation-notice">
                  Text truncated for preview. Click "Show Full Text" to see complete content.
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="statistics-display">
            <h3>Processing Statistics</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <h4>Character Count</h4>
                <div className="stat-comparison">
                  <div className="stat-item">
                    <span className="label">Original:</span>
                    <span className="value">{stats.raw_length.toLocaleString()}</span>
                  </div>
                  <div className="stat-item">
                    <span className="label">Cleaned:</span>
                    <span className="value">{stats.cleaned_length.toLocaleString()}</span>
                  </div>
                  <div className="stat-item reduction">
                    <span className="label">Reduction:</span>
                    <span className="value">{stats.reduction_percentage}%</span>
                  </div>
                </div>
              </div>
              
              <div className="stat-card">
                <h4>Word Count (Estimated)</h4>
                <div className="stat-comparison">
                  <div className="stat-item">
                    <span className="label">Original:</span>
                    <span className="value">{Math.round(stats.raw_length / 5).toLocaleString()}</span>
                  </div>
                  <div className="stat-item">
                    <span className="label">Cleaned:</span>
                    <span className="value">{Math.round(stats.cleaned_length / 5).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <h4>Improvements Made</h4>
                <ul className="improvements-list">
                  <li>Removed page numbers and headers</li>
                  <li>Cleaned special characters</li>
                  <li>Normalized whitespace</li>
                  <li>Fixed formatting issues</li>
                  <li>Improved paragraph structure</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI Guidance section - shown below all content */}
      <div className="ai-guidance">
        <h3>AI Guidance</h3>
        {payload && payload.guidance ? (
          <div className="guidance-content">
            {formatText(payload.guidance)}
          </div>
        ) : (
          <p className="no-guidance">AI guidance not available for this document.</p>
        )}
      </div>

    </div>
  );
};

export default ResultsDisplay;