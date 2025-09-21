import React from 'react';
import LegalKnowledgeGraph from './LegalKnowledgeGraph';
import WhatIfScenarios from './WhatIfScenarios';
import { API_BASE } from '../config';

interface Clause {
  id: string;
  clause_text: string;
  risk: 'low'|'medium'|'high';
  highlights?: string[];
  clause_headline?: string;
  start_pos?: number;
  end_pos?: number;
  scenarios?: any[];
  legal_references?: any[];
}

interface ClauseVisualizerProps {
  clauses: Clause[];
  documentId?: string;
  documentType?: string;
  onPersist?: (inserted: Clause[]) => void;
  onClose?: () => void;
}

const riskColor = (r: string) => {
  if (r === 'high') return '#e74c3c';
  if (r === 'medium') return '#f39c12';
  return '#2ecc71';
}

const ClauseVisualizer: React.FC<ClauseVisualizerProps> = ({ clauses, documentId, documentType, onPersist, onClose }) => {
  const [saving, setSaving] = React.useState(false);
  const [savedCount, setSavedCount] = React.useState<number | null>(null);
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  // Cache of generated what-if scenarios and legal references per clause id
  const [scenariosById, setScenariosById] = React.useState<Record<string, any[]>>({});
  const [referencesById, setReferencesById] = React.useState<Record<string, any[]>>({});

  // When the visualizer mounts or clauses change, fetch scenarios and references once for clauses that don't have them
  React.useEffect(() => {
    let mounted = true;
    const fetchForClause = async (c: Clause) => {
      try {
        // Fetch scenarios only if not present in clause
        if ((!c.scenarios || c.scenarios.length === 0) && c.clause_text) {
          const resp = await fetch(`${API_BASE}/api/what-if-scenarios`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clauseText: c.clause_text, documentType: documentType, clauseType: c.risk })
          });
          if (resp.ok) {
            const data = await resp.json();
            if (mounted && data.scenarios) setScenariosById(prev => ({ ...prev, [c.id]: data.scenarios }));
          }
        } else if (c.scenarios && c.scenarios.length) {
          // Use existing scenarios
          if (mounted) setScenariosById(prev => ({ ...prev, [c.id]: c.scenarios || [] } as Record<string, any[]>));
        }

        // Fetch legal references only if not present
        if ((!c.legal_references || c.legal_references.length === 0) && c.clause_text) {
          const resp2 = await fetch(`${API_BASE}/api/legal-knowledge-graph`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clauseText: c.clause_text, documentType: documentType, clauseType: c.risk })
          });
          if (resp2.ok) {
            const data2 = await resp2.json();
            if (mounted && data2.references) setReferencesById(prev => ({ ...prev, [c.id]: data2.references }));
          }
        } else if (c.legal_references && c.legal_references.length) {
          if (mounted) setReferencesById(prev => ({ ...prev, [c.id]: c.legal_references || [] } as Record<string, any[]>));
        }
      } catch (e) {
        // ignore per-clause failures; child components will fall back to mock data
        console.warn('Per-clause analysis failed', e);
      }
    }

    if (clauses && clauses.length) {
      clauses.forEach(c => { fetchForClause(c); });
    }

    return () => { mounted = false; }
  }, [clauses, documentType]);

  const handlePersist = async () => {
    if (!documentId) return;
    try {
      setSaving(true);
      // Build clauses payload including cached scenarios and legal references when available
      const payloadClauses = (clauses || []).map(c => ({
        clause_text: c.clause_text,
        clause_headline: c.clause_headline || (c.clause_text || '').slice(0, 200),
        start_pos: c.start_pos,
        end_pos: c.end_pos,
        risk: c.risk,
        highlights: c.highlights,
        scenarios: scenariosById[c.id] || undefined,
        legal_references: referencesById[c.id] || undefined
      }));

  const resp = await fetch(`${API_BASE}/api/analysis/clauses/${documentId}/persist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clauses: payloadClauses })
      });
      if (resp.ok) {
        const data = await resp.json();
        setSavedCount(data.count || 0);
        // Notify parent of persisted clauses if provided
        if (typeof onPersist === 'function') {
          try {
            const inserted = data.inserted || [];
            onPersist(inserted as Clause[]);
          } catch (e) {
            console.warn('Failed to notify parent of persisted clauses', e);
          }
        }
        // Close visualizer if parent provided onClose
        if (typeof onClose === 'function') {
          try {
            onClose();
          } catch (e) {
            console.warn('Failed to call onClose', e);
          }
        }
      }
    } catch (e) {
      console.warn('Persist failed', e);
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="clause-visualizer">
      <h4>Clause Visualizer & Risk Scoring</h4>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:12}}>
        <div>
          <button className="close-visualizer" onClick={() => onClose && onClose()}>Close</button>
        </div>
        <div>
          {documentId && <button className="persist-button" onClick={handlePersist} disabled={saving}>{saving ? 'Saving...' : 'Persist Clauses'}</button>}
          {savedCount !== null && <span style={{marginLeft:8}}>{savedCount} saved</span>}
        </div>
      </div>
      <div className="clauses-list">
        {clauses.length === 0 ? (
          <div className="no-clauses">No clauses found.</div>
        ) : (
          clauses.map((c) => {
            const isExpanded = !!expanded[c.id];
            const excerpt = c.clause_text ? (c.clause_text.length > 300 ? c.clause_text.slice(0, 300) + '...' : c.clause_text) : '';
            return (
              <div key={c.id} className="clause-item">
                <div className="clause-header">
                  <div className="clause-id">{c.id}</div>
                  <div className="clause-risk" style={{backgroundColor: riskColor(c.risk)}}>{c.risk.toUpperCase()}</div>
                </div>

                {/* Show excerpt only (hide long OCR text); allow expand to view full clause */}
                <div className="clause-text">
                  {!isExpanded ? (
                    <div>
                      <div className="clause-excerpt">{excerpt}</div>
                      {c.clause_text && c.clause_text.length > 300 && (
                        <button className="view-full-button" onClick={() => setExpanded({...expanded, [c.id]: true})}>Show full clause</button>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="clause-full">{c.clause_text}</div>
                      <button className="view-full-button" onClick={() => setExpanded({...expanded, [c.id]: false})}>Collapse</button>
                    </div>
                  )}
                </div>

                {c.highlights && c.highlights.length > 0 && (
                  <>
                    <div className="highlights-intro">
                      <div className="highlights-title">Key highlights & action items</div>
                      <div className="highlights-sub">These bullets summarize important points from the clause for quick review — use them to decide what to persist or act on.</div>
                    </div>
                    <ul className="clause-highlights">
                      {c.highlights.map((h, i) => <li key={i}>{h}</li>)}
                    </ul>
                  </>
                )}

                {/* Legal Knowledge Graph Integration */}
                <LegalKnowledgeGraph
                  clauseText={c.clause_text}
                  documentType={documentType || 'Legal Document'}
                  clauseType={c.risk}
                  onReferencesGenerated={(text, refs) => setReferencesById(prev => ({...prev, [c.id]: refs}))}
                  initialReferences={c.legal_references || referencesById[c.id] || null}
                />

                {/* What-if Scenarios Integration */}
                <WhatIfScenarios
                  clauseText={c.clause_text}
                  documentType={documentType || 'Legal Document'}
                  clauseType={c.risk}
                  clauseId={c.id}
                  onScenariosGenerated={(id, sc) => setScenariosById(prev => ({...prev, [c.id]: sc}))}
                  initialScenarios={c.scenarios || scenariosById[c.id] || null}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ClauseVisualizer;
