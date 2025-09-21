import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import ClauseVisualizer from './ClauseVisualizer';
import Toast from './Toast';
import { TypingAnimation } from './TypingAnimation';
import { API_BASE } from '../config';

interface Document {
  id: string;
  file_name: string;
  created_at: string;
  processed_at: string;
  ocr_metadata?: {
    document_type?: string;
    statistics?: any;
  };
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  message: string;
  created_at: string;
  metadata?: any;
}

interface ChatInterfaceProps {
  document: Document;
  chatHistory: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  onDeleteChat?: (documentId: string) => Promise<void>;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  document,
  chatHistory,
  onSendMessage,
  isLoading,
  onDeleteChat
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [clauses, setClauses] = useState<any[]>([]);
  const [persistedByDocument, setPersistedByDocument] = useState<Record<string, boolean>>({});
  const [showVisualizer, setShowVisualizer] = useState(false);
  const [visualizerLoading, setVisualizerLoading] = useState(false);
  const [highlights, setHighlights] = useState<Record<string, string[]>>({});
  const [toast, setToast] = useState<null | { id: string; message: string; actionLabel?: string; onAction?: ()=>void }>(null);
  const [lastMessageCount, setLastMessageCount] = useState(0);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Track message count to detect new messages
  useEffect(() => {
    setLastMessageCount(chatHistory.length);
  }, [chatHistory]);

  // On mount / document change: check if clauses already persisted for this document
  useEffect(() => {
    let mounted = true;
    const checkPersisted = async () => {
      try {
  const resp = await fetch(`${API_BASE}/api/analysis/clauses/${document.id}/persisted`);
        if (resp.ok) {
          const data = await resp.json();
          const present = Array.isArray(data.clauses) && data.clauses.length > 0;
          if (mounted) setPersistedByDocument(prev => ({ ...prev, [document.id]: present }));
        } else {
          // Non-200 means probably supabase not configured or no persisted rows
          if (mounted) setPersistedByDocument(prev => ({ ...prev, [document.id]: false }));
        }
      } catch (e) {
        // Network or server error — assume not persisted
        if (mounted) setPersistedByDocument(prev => ({ ...prev, [document.id]: false }));
      }
    };
    checkPersisted();
    return () => { mounted = false; }
  }, [document.id]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }, [inputMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim() && !isLoading) {
      onSendMessage(inputMessage.trim());
      setInputMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const formatMessage = (message: string) => {
    // Use ReactMarkdown for ChatGPT-style rendering
    return (
      <ReactMarkdown rehypePlugins={[rehypeRaw as any]}
        components={{
          p: ({ children }) => <div className="gpt-paragraph">{children}</div>,
          ul: ({ children }) => <ul className="gpt-list">{children}</ul>,
          ol: ({ children }) => <ol className="gpt-list">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          code: ({ children, ...props }) => 
            props.className?.includes('language-') ? 
              <pre className="gpt-code"><code>{children}</code></pre> : 
              <code className="gpt-inline-code">{children}</code>,
          strong: ({ children }) => <strong className="gpt-bold">{children}</strong>,
          em: ({ children }) => <em className="gpt-italic">{children}</em>,
          blockquote: ({ children }) => <blockquote className="gpt-quote">{children}</blockquote>,
          h1: ({ children }) => <h1 className="gpt-h1">{children}</h1>,
          h2: ({ children }) => <h2 className="gpt-h2">{children}</h2>,
          h3: ({ children }) => <h3 className="gpt-h3">{children}</h3>,
        }}
      >
        {message}
      </ReactMarkdown>
    );
  };

  // Replace highlight snippets in a message string with <mark>wrapped</mark> HTML
  const applyInlineHighlights = (message: string) => {
    if (!message || Object.keys(highlights).length === 0) return message;

    let transformed = message;
    // For each highlight snippet, replace first occurrence to avoid excessive replacements.
    Object.values(highlights).forEach((snippets) => {
      snippets.forEach((snippet) => {
        if (!snippet) return;
        try {
          // escape RegExp special chars in snippet
          const esc = snippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const re = new RegExp(esc, 'i');
          if (re.test(transformed)) {
            transformed = transformed.replace(re, (m) => `<mark>${m}</mark>`);
          }
        } catch (e) {
          // ignore invalid regex
        }
      });
    });
    return transformed;
  };

  const formatTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="chat-interface">
      {/* Chat Header */}
      <div className="chat-header">
        <div className="document-info">
          <h3>{document.file_name}</h3>
          {/* Show detected type only if it matches a whitelist of expected labels */}
          <span className="document-type">
            {(() => {
              const allowed = new Set([
                'Contract','Agreement','Lease Agreement','Rental Agreement','Will','Testament','Trust Document',
                'Privacy Policy','Data Processing Agreement','Terms of Service','Terms and Conditions','Invoice','Bill',
                'Legal Notice','Court Filing','Complaint','Summons','NDA','Non-Disclosure Agreement','Employment Agreement',
                'Service Agreement','Sales Agreement','Purchase Agreement','Power of Attorney','Deed','Mortgage','Promissory Note',
                'License Agreement','Settlement Agreement','Release','Consent Form'
              ]);
              const detected = document.ocr_metadata?.document_type;
              if (detected && allowed.has(detected)) return detected;
              return 'Legal Document';
            })()}
          </span>
        </div>
        <div className="header-actions">
          <button className="visualize-button" disabled={visualizerLoading} onClick={async () => {
            try {
              setVisualizerLoading(true);
              if (persistedByDocument[document.id]) {
                // Load persisted clauses from server
                const resp = await fetch(`${API_BASE}/api/analysis/clauses/${document.id}/persisted`);
                if (resp.ok) {
                  const data = await resp.json();
                  setClauses(data.clauses || []);
                  setShowVisualizer(true);
                } else {
                  // show user-friendly message
                  let msg = 'Failed to load persisted clauses';
                  try {
                    const body = await resp.json();
                    msg = body.error || JSON.stringify(body);
                  } catch (e) {
                    try { msg = await resp.text(); } catch(_){}
                  }
                  setToast({ id: `toast-${Date.now()}`, message: msg });
                  console.warn('Failed to load persisted clauses', msg);
                }
              } else {
                // Run fresh analysis
                const resp = await fetch(`${API_BASE}/api/analysis/clauses/${document.id}`);
                if (resp.ok) {
                  const data = await resp.json();
                  const persisted = data.clauses || [];
                  setClauses(persisted);
                  // Pre-populate ClauseVisualizer caches by passing the persisted clauses
                  // ClauseVisualizer will pick up scenarios/legal_references from the clause objects when persisting/viewing
                  setShowVisualizer(true);
                } else {
                  // Provide actionable feedback: document likely not processed yet
                  let msg = 'Clause analysis failed';
                  try {
                    const body = await resp.json();
                    msg = body.error || JSON.stringify(body);
                  } catch (e) {
                    try { msg = await resp.text(); } catch(_){}
                  }
                  // If we know the underlying cause, offer to start processing using file_name
                  if (msg && msg.toLowerCase().includes('document text unavailable')) {
                    const actionAvailable = !!document.file_name;
                    setToast({
                      id: `toast-${Date.now()}`,
                      message: 'Document not processed yet. Click to start processing.',
                      actionLabel: actionAvailable ? 'Start processing' : undefined,
                      onAction: actionAvailable ? async () => {
                          try {
                            setToast(null);
                            // Attempt to start processing using document.file_name as the file id
                            const startResp = await fetch(`${API_BASE}/api/process/${encodeURIComponent(document.file_name)}`, { method: 'POST' });
                            if (startResp.ok || startResp.status === 202) {
                              // Poll status until done, but bail on 404 (file not found)
                              const poll = async () => {
                                for (let i=0;i<60;i++) {
                                  await new Promise(r=>setTimeout(r, 2000));
                                  const st = await fetch(`${API_BASE}/api/process/status/${encodeURIComponent(document.file_name)}`);
                                  if (st.status === 404) {
                                    // File isn't present on the server — inform the user to re-upload
                                    setToast({ id: `toast-${Date.now()}`, message: 'Processing file not found on server. Please re-upload the original file and try again.' });
                                    return;
                                  }
                                  if (st.ok) {
                                    const body = await st.json();
                                    if (body.status === 'done') {
                                      // Re-run analysis request
                                      const r2 = await fetch(`${API_BASE}/api/analysis/clauses/${document.id}`);
                                      if (r2.ok) {
                                        const data = await r2.json();
                                        setClauses(data.clauses || []);
                                        setShowVisualizer(true);
                                        setPersistedByDocument(prev => ({ ...prev, [document.id]: true }));
                                        return;
                                      }
                                    } else if (body.status === 'error') {
                                      setToast({ id: `toast-${Date.now()}`, message: 'Processing failed on server. Please try again later.' });
                                      return;
                                    }
                                  }
                                }
                                setToast({ id: `toast-${Date.now()}`, message: 'Processing did not complete in time. Please try again later.' });
                              };
                              poll();
                            } else {
                              const txt = await startResp.text().catch(()=>null);
                              setToast({ id: `toast-${Date.now()}`, message: `Failed to start processing: ${txt || startResp.status}` });
                            }
                          } catch (err) {
                            setToast({ id: `toast-${Date.now()}`, message: `Failed to start processing: ${String(err)}` });
                          }
                        } : undefined
                    });
                  } else {
                    setToast({ id: `toast-${Date.now()}`, message: msg });
                  }
                  console.warn('Clause analysis failed', msg);
                }
              }
            } catch (e) {
              console.warn('Clause visualization failed', e);
            } finally {
              setVisualizerLoading(false);
            }
          }}>{persistedByDocument[document.id] ? 'View Clauses' : 'Visualize Clauses'}</button>
        </div>
      </div>

      {showVisualizer && (
        <div className="clause-panel">
          <ClauseVisualizer
            clauses={clauses}
            documentId={document.id}
            documentType={(() => {
              const allowed = new Set([
                'Contract','Agreement','Lease Agreement','Rental Agreement','Will','Testament','Trust Document',
                'Privacy Policy','Data Processing Agreement','Terms of Service','Terms and Conditions','Invoice','Bill',
                'Legal Notice','Court Filing','Complaint','Summons','NDA','Non-Disclosure Agreement','Employment Agreement',
                'Service Agreement','Sales Agreement','Purchase Agreement','Power of Attorney','Deed','Mortgage','Promissory Note',
                'License Agreement','Settlement Agreement','Release','Consent Form'
              ]);
              const detected = document.ocr_metadata?.document_type;
              if (detected && allowed.has(detected)) return detected;
              return 'Legal Document';
            })()}
            onPersist={(inserted) => {
                // Mark this document as persisted
                setPersistedByDocument(prev => ({ ...prev, [document.id]: true }));

              // Build highlights map from inserted clauses
              const map: Record<string, string[]> = {};
              (inserted || []).forEach((c: any) => {
                if (c.highlights && c.highlights.length) {
                  map[c.id] = c.highlights;
                } else if (c.clause_text) {
                  // use clause text fallback as a single highlight
                  map[c.id] = [c.clause_text.slice(0, 200)];
                }
              });
              setHighlights(map);

              // Show toast with Undo action (pass clause ids if available)
              const ids = (inserted || []).map((x: any) => x.id).filter(Boolean);
              if (ids.length) {
                setToast({
                  id: Date.now().toString(),
                  message: `${ids.length} clause(s) saved`,
                  actionLabel: 'Undo',
                  onAction: async () => {
                    try {
                      const resp = await fetch(`${API_BASE}/api/analysis/clauses/${document.id}/undo`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ clause_ids: ids })
                      });
                      if (resp.ok) {
                        // Optionally refresh clauses
                        setClauses(prev => prev.filter((c:any) => !ids.includes(c.id)));
                        // Clear persisted flag for this document
                        setPersistedByDocument(prev => ({ ...prev, [document.id]: false }));
                      } else {
                        console.warn('Undo failed', await resp.text());
                      }
                    } catch (e) {
                      console.warn('Undo request failed', e);
                    }
                  }
                });
                // auto-dismiss toast after 8s
                setTimeout(() => setToast(null), 8000);
              }
            }}
            onClose={() => setShowVisualizer(false)}
          />
        </div>
      )}

      {/* Messages Area */}
      <div className="messages-container">
        <div className="messages">
          {chatHistory.length === 0 ? (
            <div className="empty-chat">
              <div className="welcome-message">
                <h4>Welcome! Your document has been processed.</h4>
                <p>Ask me questions about this document, request summaries, or get legal guidance.</p>
                <div className="suggested-questions">
                  <p><strong>Try asking:</strong></p>
                  <ul>
                    <li>"What are the key points in this document?"</li>
                    <li>"Can you summarize this for me?"</li>
                    <li>"What should I be aware of?"</li>
                    <li>"Are there any important dates or deadlines?"</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            chatHistory.map((msg, index) => {
              const isLatestAssistantMessage = 
                msg.role === 'assistant' && 
                index === chatHistory.length - 1 && 
                chatHistory.length > lastMessageCount;
              
              return (
                <div key={msg.id} className={`message ${msg.role}`}>
                  <div className="message-content">
                    <div className="message-text">
                      {isLatestAssistantMessage ? (
                        <TypingAnimation 
                          text={msg.message} 
                          speed={15}
                        />
                      ) : (
                        // Apply inline highlights into the markdown before rendering
                        formatMessage(applyInlineHighlights(msg.message))
                      )}
                    </div>
                    <div className="message-time">
                      {formatTime(msg.created_at)}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Show loading indicator when waiting for response */}
          {isLoading && (
            <div className="message assistant">
              <div className="message-content loading-message">
                <div className="ai-thinking">
                  <div className="thinking-dots">
                    <div className="thinking-dot"></div>
                    <div className="thinking-dot"></div>
                    <div className="thinking-dot"></div>
                  </div>
                  <span className="thinking-text">AI is analyzing...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="chat-input-container">
        <form onSubmit={handleSubmit} className="chat-form">
          <div className="input-wrapper">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about this document..."
              disabled={isLoading}
              rows={1}
              className="chat-input"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className="send-button"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path 
                  d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </form>
      </div>
      {/* Toast overlay */}
      {toast && (
        <Toast
          message={toast.message}
          actionLabel={toast.actionLabel}
          onAction={toast.onAction}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

// Render toast overlay at end of component tree
export default ChatInterface;