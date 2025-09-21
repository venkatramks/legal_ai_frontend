import React from 'react';
import { Scale, FileText, Sparkles } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">
          <Scale className="logo-icon" />
          <h1>LegalAI Simplifier</h1>
        </div>
        <div className="tagline">
          <FileText className="tagline-icon" />
          <p>Transform complex legal documents into clear, accessible guidance</p>
          <Sparkles className="sparkle-icon" />
        </div>
      </div>
    </header>
  );
};

export default Header;