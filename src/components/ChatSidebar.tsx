import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';

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

interface ChatSidebarProps {
  documents: Document[];
  selectedDocument: Document | null;
  onSelectDocument: (document: Document | null) => void;
  onNewChat: () => void;
  onDocumentsChange?: () => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  documents,
  selectedDocument,
  onSelectDocument,
  onNewChat
  , onDocumentsChange
}) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Unknown';
    }
  };

  const truncateFileName = (fileName: string, maxLength: number = 25) => {
    if (fileName.length <= maxLength) return fileName;
    const extension = fileName.split('.').pop();
    const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
    const truncated = nameWithoutExt.substring(0, maxLength - 3 - (extension?.length || 0));
    return `${truncated}...${extension ? '.' + extension : ''}`;
  };

  return (
    <div className="chat-sidebar">
      <div className="sidebar-header">
        <h2>Documents</h2>
        <button className="new-chat-button" onClick={onNewChat}>+ New Chat / Upload</button>
      </div>
      
      <div className="documents-list">
        {documents.length === 0 ? (
          <div className="no-documents">
            <p>No documents yet</p>
            <p className="subtitle">Upload a document to get started</p>
          </div>
        ) : (
          documents.map((doc) => (
            <div
              key={doc.id}
              className={`document-item ${selectedDocument?.id === doc.id ? 'selected' : ''}`}
            >
              <div className="document-main" onClick={() => onSelectDocument(doc)}>
                <div className="document-name" title={doc.file_name}>
                  {truncateFileName(doc.file_name)}
                </div>
                <div className="document-type">
                  {(() => {
                    const allowed = new Set([
                      'Contract','Agreement','Lease Agreement','Rental Agreement','Will','Testament','Trust Document',
                      'Privacy Policy','Data Processing Agreement','Terms of Service','Terms and Conditions','Invoice','Bill',
                      'Legal Notice','Court Filing','Complaint','Summons','NDA','Non-Disclosure Agreement','Employment Agreement',
                      'Service Agreement','Sales Agreement','Purchase Agreement','Power of Attorney','Deed','Mortgage','Promissory Note',
                      'License Agreement','Settlement Agreement','Release','Consent Form'
                    ]);
                    const detected = doc.ocr_metadata?.document_type;
                    if (detected && allowed.has(detected)) return detected;
                    return 'Legal Document';
                  })()}
                </div>
              </div>
              <div className="document-meta">
                <div className="document-date">
                  {formatDate(doc.created_at)}
                </div>
                <button
                  className="delete-doc-button"
                  disabled={deletingId === doc.id}
                  aria-label={`Delete chat ${doc.file_name}`}
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!window.confirm('Delete this chat (and related messages)?')) return;
                    try {
                      setDeletingId(doc.id);
                      const resp = await fetch(`http://localhost:5000/api/chats/${doc.id}`, { method: 'DELETE' });
                      if (resp.ok) {
                        // If currently selected, clear selection
                        if (selectedDocument?.id === doc.id) {
                          onSelectDocument(null);
                        }
                        // Inform parent to refresh documents list
                        if (onDocumentsChange) onDocumentsChange();
                      } else {
                        console.warn('Failed to delete chat', await resp.text());
                      }
                    } catch (err) {
                      console.warn('Delete failed', err);
                    } finally {
                      setDeletingId(null);
                    }
                  }}
                >
                  {deletingId === doc.id ? (
                    <div className="spinner" style={{ width: '14px', height: '14px' }}></div>
                  ) : (
                    <Trash2 size={14} />
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};