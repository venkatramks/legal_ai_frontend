import React, { useState, useEffect } from 'react';
import { AlertTriangle, TrendingUp, TrendingDown, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface Scenario {
  id: string;
  title: string;
  description: string;
  likelihood: 'high' | 'medium' | 'low';
  impact: 'high' | 'medium' | 'low';
  category: 'breach' | 'compliance' | 'financial' | 'operational' | 'legal';
  outcomes: string[];
  mitigation: string[];
  precedent?: string;
}

interface WhatIfScenariosProps {
  clauseText: string;
  documentType: string;
  clauseType?: string;
  clauseId?: string;
  onScenariosGenerated?: (clauseId: string | undefined, scenarios: Scenario[]) => void;
  initialScenarios?: Scenario[] | null;
}

const WhatIfScenarios: React.FC<WhatIfScenariosProps> = ({
  clauseText,
  documentType,
  clauseType,
  clauseId,
  onScenariosGenerated,
  initialScenarios
}) => {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  // const [selectedScenario, setSelectedScenario] = useState<string | null>(null);

  useEffect(() => {
    const fetchScenarios = async () => {
      // If initial scenarios are provided, use them and skip fetching
      if (initialScenarios && initialScenarios.length) {
        setScenarios(initialScenarios);
        if (typeof onScenariosGenerated === 'function') {
          try { onScenariosGenerated(clauseId, initialScenarios); } catch (err) { console.warn('onScenariosGenerated failed', err); }
        }
        return;
      }

      if (clauseText && expanded) {
        setLoading(true);
        try {
          // Call backend API to get what-if scenarios
          const response = await fetch('http://localhost:5000/api/what-if-scenarios', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              clauseText,
              documentType,
              clauseType
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const fetched = data.scenarios || [];
            setScenarios(fetched);
            // notify parent/cache
            if (typeof onScenariosGenerated === 'function') {
              try { onScenariosGenerated(clauseId, fetched); } catch (err) { console.warn('onScenariosGenerated callback failed', err); }
            }
          } else {
            // Fallback to mock data if API not available
            const mock = getMockScenarios(documentType, clauseType);
            setScenarios(mock);
            if (typeof onScenariosGenerated === 'function') {
              try { onScenariosGenerated(clauseId, mock); } catch (err) { console.warn('onScenariosGenerated callback failed', err); }
            }
          }
        } catch (error) {
          console.warn('What-if scenarios API unavailable, using mock data');
          const mock = getMockScenarios(documentType, clauseType);
          setScenarios(mock);
          if (typeof onScenariosGenerated === 'function') {
            try { onScenariosGenerated(clauseId, mock); } catch (err) { console.warn('onScenariosGenerated callback failed', err); }
          }
        } finally {
          setLoading(false);
        }
      }
    };
    
    fetchScenarios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clauseText, documentType, clauseType, expanded]);

  const getMockScenarios = (docType: string, clType?: string): Scenario[] => {
    const baseScenarios: Scenario[] = [];
    
    // Common scenarios for all legal documents
    baseScenarios.push({
      id: 'breach_scenario',
      title: 'Clause Breach Scenario',
      description: 'What happens if this clause is violated or not fulfilled',
      likelihood: 'medium',
      impact: 'high',
      category: 'breach',
      outcomes: [
        'Legal action may be initiated by the non-breaching party',
        'Damages or penalties as specified in the contract may apply',
        'Relationship between parties may be strained or terminated'
      ],
      mitigation: [
        'Implement clear monitoring and compliance procedures',
        'Regular review and communication between parties',
        'Consider adding grace periods or cure provisions'
      ]
    });

    // Document type specific scenarios
    if (docType.toLowerCase().includes('contract') || docType.toLowerCase().includes('agreement')) {
      baseScenarios.push(
        {
          id: 'payment_delay',
          title: 'Payment Delay Scenario',
          description: 'Analysis of delayed payment implications',
          likelihood: 'high',
          impact: 'medium',
          category: 'financial',
          outcomes: [
            'Interest charges may accrue on overdue amounts',
            'Services may be suspended until payment is received',
            'Credit rating impact for the defaulting party'
          ],
          mitigation: [
            'Establish clear payment terms and schedules',
            'Implement automated payment reminders',
            'Consider requiring deposits or guarantees'
          ]
        },
        {
          id: 'scope_creep',
          title: 'Scope Expansion Scenario',
          description: 'What if project scope expands beyond agreed terms',
          likelihood: 'medium',
          impact: 'medium',
          category: 'operational',
          outcomes: [
            'Additional costs may not be covered',
            'Timeline delays and resource strain',
            'Disputes over responsibility and compensation'
          ],
          mitigation: [
            'Define clear change management procedures',
            'Require written approval for scope changes',
            'Establish pricing for additional work'
          ]
        }
      );
    }

    if (docType.toLowerCase().includes('lease') || docType.toLowerCase().includes('rental')) {
      baseScenarios.push(
        {
          id: 'property_damage',
          title: 'Property Damage Scenario',
          description: 'Implications of property damage during lease term',
          likelihood: 'low',
          impact: 'high',
          category: 'legal',
          outcomes: [
            'Tenant may be liable for repair costs',
            'Security deposit may be forfeited',
            'Insurance claims and potential premium increases'
          ],
          mitigation: [
            'Require comprehensive tenant insurance',
            'Conduct regular property inspections',
            'Clearly define normal wear vs. damage'
          ],
          precedent: 'Model Tenancy Act 2021, Section 7'
        },
        {
          id: 'early_termination',
          title: 'Early Lease Termination',
          description: 'Financial and legal consequences of breaking the lease',
          likelihood: 'medium',
          impact: 'medium',
          category: 'financial',
          outcomes: [
            'Early termination penalties may apply',
            'Loss of security deposit',
            'Difficulty finding alternative accommodation'
          ],
          mitigation: [
            'Include reasonable termination clauses',
            'Allow subletting with landlord approval',
            'Consider graduated penalty structure'
          ]
        }
      );
    }

    if (docType.toLowerCase().includes('employment')) {
      baseScenarios.push(
        {
          id: 'termination_dispute',
          title: 'Wrongful Termination Scenario',
          description: 'Legal implications of disputed employment termination',
          likelihood: 'medium',
          impact: 'high',
          category: 'legal',
          outcomes: [
            'Labor court proceedings and legal costs',
            'Potential compensation for wrongful dismissal',
            'Reputational impact on employer'
          ],
          mitigation: [
            'Follow proper disciplinary procedures',
            'Document performance issues clearly',
            'Provide adequate notice or compensation'
          ],
          precedent: 'Industrial Disputes Act 1947'
        }
      );
    }

    if (docType.toLowerCase().includes('privacy') || docType.toLowerCase().includes('data')) {
      baseScenarios.push(
        {
          id: 'data_breach',
          title: 'Data Breach Scenario',
          description: 'Consequences of personal data compromise',
          likelihood: 'low',
          impact: 'high',
          category: 'compliance',
          outcomes: [
            'Regulatory fines under DPDP Act 2023',
            'Mandatory breach notification to authorities',
            'Individual compensation claims'
          ],
          mitigation: [
            'Implement robust data security measures',
            'Regular security audits and updates',
            'Data breach response plan'
          ],
          precedent: 'DPDP Act 2023, Section 33'
        }
      );
    }

    return baseScenarios;
  };

  const getLikelihoodColor = (likelihood: string) => {
    switch (likelihood) {
      case 'high': return 'bg-red-500/20 text-red-300 border-red-500/40';
      case 'medium': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
      case 'low': return 'bg-green-500/20 text-green-300 border-green-500/40';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/40';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-500/20 text-red-300 border-red-500/40';
      case 'medium': return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
      case 'low': return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/40';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'breach': return <AlertTriangle className="w-4 h-4" />;
      case 'financial': return <TrendingDown className="w-4 h-4" />;
      case 'operational': return <TrendingUp className="w-4 h-4" />;
      case 'compliance': return <HelpCircle className="w-4 h-4" />;
      case 'legal': return <AlertTriangle className="w-4 h-4" />;
      default: return <HelpCircle className="w-4 h-4" />;
    }
  };

  if (!clauseText) return null;

  return (
    <div className="what-if-scenarios">
      <button
        onClick={() => setExpanded(!expanded)}
        className="what-if-toggle"
      >
        {getCategoryIcon('operational')}
        <span>What-if Scenarios</span>
        {initialScenarios && initialScenarios.length > 0 ? (
          <div className="scenario-saved-badge">Saved</div>
        ) : (
          <div className="scenario-count">
            {loading ? '...' : scenarios.length}
          </div>
        )}
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {expanded && (
        <div className="scenarios-panel">
          <div className="scenarios-header">
            <h5>
              <AlertTriangle className="w-5 h-5" />
              Risk & Scenario Analysis
            </h5>
            <p>Explore potential outcomes and implications of this clause</p>
          </div>

          {loading ? (
            <div className="scenarios-loading">
              <div className="spinner"></div>
              <span>Analyzing scenarios...</span>
            </div>
          ) : scenarios.length > 0 ? (
            <div className="scenarios-grid">
              {/* One-time generated scenarios — no manual regenerate */}
              {scenarios.map((scenario) => (
                <div key={scenario.id} className="scenario-card">
                  <div className="scenario-header">
                    <div className="scenario-title-row">
                      {getCategoryIcon(scenario.category)}
                      <h6 className="scenario-title">{scenario.title}</h6>
                    </div>
                    <div className="scenario-badges">
                      <span className={`scenario-badge ${getLikelihoodColor(scenario.likelihood)}`}>
                        {scenario.likelihood} likelihood
                      </span>
                      <span className={`scenario-badge ${getImpactColor(scenario.impact)}`}>
                        {scenario.impact} impact
                      </span>
                    </div>
                  </div>

                  <p className="scenario-description">{scenario.description}</p>

                  <div className="scenario-details">
                    <div className="scenario-section">
                      <h6 className="scenario-section-title">Potential Outcomes:</h6>
                      <ul className="scenario-list">
                        {scenario.outcomes.map((outcome, index) => (
                          <li key={index}>{outcome}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="scenario-section">
                      <h6 className="scenario-section-title">Mitigation Strategies:</h6>
                      <ul className="scenario-list mitigation">
                        {scenario.mitigation.map((strategy, index) => (
                          <li key={index}>{strategy}</li>
                        ))}
                      </ul>
                    </div>

                    {scenario.precedent && (
                      <div className="scenario-precedent">
                        <strong>Legal Precedent:</strong> {scenario.precedent}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="scenarios-no-data">
              <HelpCircle className="w-12 h-12" />
              <p>No scenarios available</p>
              <span>Unable to generate what-if scenarios for this clause</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WhatIfScenarios;