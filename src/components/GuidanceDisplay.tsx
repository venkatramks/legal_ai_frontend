import React from 'react';

interface GuidanceDisplayProps {
  stage: 'upload' | 'processing' | 'results';
  documentType?: string;
  guidance?: string;
}

const GuidanceDisplay: React.FC<GuidanceDisplayProps> = ({ stage, documentType, guidance }) => {
  const getDefaultGuidance = () => {
    switch (stage) {
      case 'upload':
        return {
          title: "Getting Started with Legal Document Simplification",
          steps: [
            "Upload your legal document (PDF, JPG, PNG formats supported)",
            "Our AI will extract and analyze the text using advanced OCR technology",
            "Get simplified, plain-language explanations of complex legal terms",
            "Receive actionable insights and key takeaways from your document"
          ],
          tips: [
            "Ensure your document is clearly scanned for best OCR results",
            "Higher resolution images provide better text extraction",
            "The AI works best with standard legal document formats"
          ]
        };
      case 'processing':
        return {
          title: "AI Analysis in Progress",
          steps: [
            "Extracting text from your document using OCR technology",
            "Cleaning and preprocessing the extracted content",
            "Analyzing legal terminology and complex clauses",
            "Generating simplified explanations and guidance"
          ],
          tips: [
            "This process typically takes 30-60 seconds",
            "Complex documents may require additional processing time",
            "Our AI is trained on various legal document types"
          ]
        };
      case 'results':
        return {
          title: "Document Analysis Complete",
          steps: [
            "Review the simplified version of your document",
            "Check the AI-generated explanations for key terms",
            "Read the actionable insights and recommendations",
            "Download or save your results for future reference"
          ],
          tips: [
            "Compare the original and simplified versions",
            "Pay attention to highlighted key terms and clauses",
            "Consider consulting a legal professional for complex matters"
          ]
        };
      default:
        return { title: "", steps: [], tips: [] };
    }
  };

  const defaultGuidance = getDefaultGuidance();

  return (
    <div className="guidance-container">
      <div className="guidance-header">
        <div className="guidance-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M12 1v6m0 6v6"></path>
            <path d="m9 9 3-3 3 3"></path>
            <path d="m9 15 3 3 3-3"></path>
          </svg>
        </div>
        <h3>{defaultGuidance.title}</h3>
      </div>

      {guidance && (
        <div className="ai-guidance">
          <div className="ai-guidance-header">
            <div className="ai-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <h4>AI-Generated Guidance</h4>
          </div>
          <div className="ai-guidance-content">
            <p>{guidance}</p>
          </div>
        </div>
      )}

      <div className="guidance-section">
        <h4>Process Overview</h4>
        <ul className="guidance-steps">
          {defaultGuidance.steps.map((step, index) => (
            <li key={index} className="guidance-step">
              <span className="step-number">{index + 1}</span>
              <span className="step-text">{step}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="guidance-section">
        <h4>Tips for Best Results</h4>
        <ul className="guidance-tips">
          {defaultGuidance.tips.map((tip, index) => (
            <li key={index} className="guidance-tip">
              <div className="tip-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4"></path>
                  <circle cx="12" cy="12" r="9"></circle>
                </svg>
              </div>
              <span className="tip-text">{tip}</span>
            </li>
          ))}
        </ul>
      </div>

      {stage === 'results' && (
        <div className="guidance-section disclaimer">
          <div className="disclaimer-header">
            <div className="warning-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 9v4"></path>
                <path d="M12 17h.01"></path>
                <path d="M8.5 2.5L2 8v8l6.5 5.5L16 16l-2.5-5.5L8.5 2.5z"></path>
              </svg>
            </div>
            <h4>Important Disclaimer</h4>
          </div>
          <p className="disclaimer-text">
            This AI-generated analysis is for informational purposes only and should not be considered as legal advice. 
            For important legal matters, always consult with a qualified legal professional who can provide guidance 
            specific to your situation and jurisdiction.
          </p>
        </div>
      )}
    </div>
  );
};

export default GuidanceDisplay;