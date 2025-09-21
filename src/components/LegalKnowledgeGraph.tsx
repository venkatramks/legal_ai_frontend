import React, { useState, useEffect } from 'react';
import { ExternalLink, BookOpen, Scale, Info } from 'lucide-react';

interface LegalReference {
  id: string;
  title: string;
  type: 'act' | 'regulation' | 'guideline' | 'rule' | 'circular';
  authority: string;
  section?: string;
  description: string;
  relevance: 'high' | 'medium' | 'low';
  url?: string;
  lastUpdated?: string;
}

interface LegalKnowledgeGraphProps {
  clauseText: string;
  documentType: string;
  clauseType?: string;
  onReferencesGenerated?: (clauseText: string, references: any[]) => void;
  initialReferences?: any[] | null;
}

const LegalKnowledgeGraph: React.FC<LegalKnowledgeGraphProps> = ({
  clauseText,
  documentType,
  clauseType,
  onReferencesGenerated,
  initialReferences
}) => {
  const [legalReferences, setLegalReferences] = useState<LegalReference[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      if (initialReferences && initialReferences.length) {
        setLegalReferences(initialReferences as LegalReference[]);
        if (typeof onReferencesGenerated === 'function') {
          try { onReferencesGenerated(clauseText, initialReferences); } catch (err) { console.warn('onReferencesGenerated failed', err); }
        }
        return;
      }

      if (clauseText && expanded) {
        setLoading(true);
        try {
          // Try backend first
          try {
            const resp = await fetch('http://localhost:5000/api/legal-knowledge-graph', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ clauseText, documentType, clauseType })
            });
            if (resp.ok) {
              const data = await resp.json();
              const refs = data.references || [];
              if (mounted) setLegalReferences(refs);
              if (typeof onReferencesGenerated === 'function') {
                try { onReferencesGenerated(clauseText, refs); } catch (err) { console.warn('onReferencesGenerated failed', err); }
              }
              return;
            }
          } catch (e) {
            // ignore and fall back to mock
          }

          // Fallback to mock
          const mockReferences = getMockReferences(documentType, clauseType, clauseText);
          if (mounted) setLegalReferences(mockReferences);
          if (typeof onReferencesGenerated === 'function') {
            try { onReferencesGenerated(clauseText, mockReferences); } catch (err) { console.warn('onReferencesGenerated failed', err); }
          }
        } catch (error) {
          console.error('Error fetching legal references:', error);
        } finally {
          if (mounted) setLoading(false);
        }
      }
    };
    fetchData();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clauseText, documentType, clauseType, expanded]);

  const getMockReferences = (docType: string, clType?: string, clause?: string): LegalReference[] => {
    const baseReferences: LegalReference[] = [];

    if (docType.toLowerCase().includes('contract')) {
      baseReferences.push(
        {
          id: 'ica1872',
          title: 'Indian Contract Act, 1872',
          type: 'act',
          authority: 'Government of India',
          section: 'Section 10-30',
          description: 'Defines what constitutes a valid contract and the essentials of a contract.',
          relevance: 'high',
          url: 'https://legislative.gov.in/sites/default/files/A1872-09.pdf',
          lastUpdated: '2023-01-15'
        },
        {
          id: 'specific_relief_act',
          title: 'Specific Relief Act, 1963',
          type: 'act',
          authority: 'Government of India',
          section: 'Section 9-25',
          description: 'Provides remedies for breach of contract and specific performance.',
          relevance: 'medium',
          url: 'https://legislative.gov.in/sites/default/files/A1963-47.pdf'
        }
      );
    }

    if (docType.toLowerCase().includes('lease')) {
      baseReferences.push(
        {
          id: 'rent_control',
          title: 'Model Tenancy Act, 2021',
          type: 'act',
          authority: 'Ministry of Housing and Urban Affairs',
          description: 'Governs rental agreements and tenant-landlord relationships.',
          relevance: 'high',
          url: 'https://mohua.gov.in/upload/uploadfiles/files/MTA_English1.pdf'
        },
        {
          id: 'transfer_property',
          title: 'Transfer of Property Act, 1882',
          type: 'act',
          authority: 'Government of India',
          section: 'Section 105-117',
          description: 'Defines lease of immovable property and rights of parties.',
          relevance: 'high'
        }
      );
    }

    if (docType.toLowerCase().includes('privacy')) {
      baseReferences.push(
        {
          id: 'dpdp_act',
          title: 'Digital Personal Data Protection Act, 2023',
          type: 'act',
          authority: 'Government of India',
          description: 'Regulates processing of digital personal data.',
          relevance: 'high',
          url: 'https://www.meity.gov.in/writereaddata/files/Digital%20Personal%20Data%20Protection%20Act%202023.pdf'
        },
        {
          id: 'it_act',
          title: 'Information Technology Act, 2000',
          type: 'act',
          authority: 'Government of India',
          section: 'Section 43A, 72A',
          description: 'Provides framework for data protection and cyber security.',
          relevance: 'medium'
        }
      );
    }

    if (docType.toLowerCase().includes('employment')) {
      baseReferences.push(
        {
          id: 'labour_code',
          title: 'Code on Wages, 2019',
          type: 'act',
          authority: 'Ministry of Labour and Employment',
          description: 'Regulates wage and bonus payment to employees.',
          relevance: 'high'
        },
        {
          id: 'esi_act',
          title: "Employees' State Insurance Act, 1948",
          type: 'act',
          authority: 'ESIC',
          description: 'Provides for medical care and cash benefits to employees.',
          relevance: 'medium'
        }
      );
    }

    if ((clause || '').toLowerCase().includes('payment') || (clause || '').toLowerCase().includes('financial')) {
      baseReferences.push({
        id: 'rbi_payment',
        title: 'RBI Master Direction on Payment System',
        type: 'guideline',
        authority: 'Reserve Bank of India',
        description: 'Guidelines for payment systems and electronic transactions.',
        relevance: 'medium',
        url: 'https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=11142'
      });
    }

    return baseReferences.slice(0, 4);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'act': return <Scale className="w-4 h-4" />;
      case 'regulation': return <BookOpen className="w-4 h-4" />;
      case 'guideline': return <Info className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'act': return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
      case 'regulation': return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'guideline': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'rule': return 'text-purple-400 bg-purple-500/20 border-purple-500/30';
      case 'circular': return 'text-pink-400 bg-pink-500/20 border-pink-500/30';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  const getRelevanceColor = (relevance: string) => {
    switch (relevance) {
      case 'high': return 'text-red-400 bg-red-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20';
      case 'low': return 'text-green-400 bg-green-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  if (!clauseText) return null;

  return (
    <div className="legal-knowledge-graph">
      <button
        onClick={() => setExpanded(!expanded)}
        className="legal-graph-toggle"
      >
        <Scale className="w-4 h-4" />
        <span>Legal Knowledge Graph</span>
        {initialReferences && initialReferences.length > 0 ? (
          <span className="legal-saved-badge">Saved</span>
        ) : (
          <span className="legal-graph-count">
            {legalReferences.length > 0 ? legalReferences.length : '?'}
          </span>
        )}
      </button>

      {expanded && (
        <div className="legal-references-panel">
          <div className="legal-references-header">
            <h5>Applicable Laws & Regulations</h5>
            <p>Real-world legal framework linked to this clause</p>
          </div>

          {loading ? (
            <div className="legal-loading">
              <div className="spinner-small"></div>
              <span>Finding relevant laws...</span>
            </div>
          ) : (
            <div className="legal-references-grid">
              {legalReferences.map((ref) => (
                <div key={ref.id} className="legal-reference-card">
                  <div className="legal-reference-header">
                    <div className={`legal-type-badge ${getTypeColor(ref.type)}`}>
                      {getTypeIcon(ref.type)}
                      <span>{ref.type.toUpperCase()}</span>
                    </div>
                    <div className={`legal-relevance-badge ${getRelevanceColor(ref.relevance)}`}>
                      {ref.relevance.toUpperCase()}
                    </div>
                  </div>

                  <h6 className="legal-reference-title">{ref.title}</h6>
                  {ref.section && (
                    <div className="legal-section">{ref.section}</div>
                  )}
                  
                  <p className="legal-reference-description">{ref.description}</p>
                  
                  <div className="legal-reference-footer">
                    <span className="legal-authority">{ref.authority}</span>
                    {ref.url && (
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="legal-reference-link"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>View Source</span>
                      </a>
                    )}
                  </div>
                </div>
              ))}

              {legalReferences.length === 0 && !loading && (
                <div className="legal-no-references">
                  <Scale className="w-8 h-8 opacity-40" />
                  <p>No specific legal references found for this clause type.</p>
                  <span>Try expanding the clause text or check document classification.</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LegalKnowledgeGraph;