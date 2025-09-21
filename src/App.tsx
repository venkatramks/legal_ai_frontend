import React, { useState, useEffect } from 'react';
import { ChatSidebar, ChatInterface, FileUpload } from './components';
import './App.css';

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

function App() {
  // Set backend base URL (deployed)
  const API_BASE = 'https://legal-ai-backend-chi.vercel.app';
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load documents on app start
  useEffect(() => {
    loadDocuments();
  }, []);

  // Load chat history when document is selected
  useEffect(() => {
    if (selectedDocument) {
      loadChatHistory(selectedDocument.id);
    }
  }, [selectedDocument]);

  const loadDocuments = async () => {
    try {
  const response = await fetch(`${API_BASE}/api/documents`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      } else {
        console.warn('Failed to load documents:', response.statusText);
      }
    } catch (error) {
      console.warn('Failed to load documents:', error);
    }
  };

  const loadChatHistory = async (documentId: string) => {
    try {
      setIsLoading(true);
  const response = await fetch(`${API_BASE}/api/chat/${documentId}/history`);
      if (response.ok) {
        const data = await response.json();
        setChatHistory(data.chats || []);
      } else {
        console.warn('Failed to load chat history:', response.statusText);
        setChatHistory([]);
      }
    } catch (error) {
      console.warn('Failed to load chat history:', error);
      setChatHistory([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUploaded = async (fileData: {file_id: string; filename: string; rawResponse?: any}) => {
    try {
      setIsLoading(true);
      setError(null);
      // If the upload returned an immediate processed result (serverless sync), use it
      if (fileData.rawResponse && fileData.rawResponse.result) {
        // Reload documents list and select the newly processed document if present
        await loadDocuments();
        const updatedDocs = await fetch(`${API_BASE}/api/documents`);
        if (updatedDocs.ok) {
          const data = await updatedDocs.json();
          const newDoc = (data.documents || []).find((d: Document) => 
            d.file_name === fileData.filename || 
            d.id === fileData.rawResponse.document_id
          );
          if (newDoc) {
            setDocuments(data.documents || []);
            setSelectedDocument(newDoc);
            setIsLoading(false);
            return;
          }
        }
        setIsLoading(false);
        return;
      }

      // Start processing (fallback when upload didn't process synchronously)
      const processResponse = await fetch(`${API_BASE}/api/process/${fileData.file_id}`, {
        method: 'POST'
      });
      
      if (processResponse.status === 202) {
        // Poll for completion with visual feedback
        const pollForCompletion = async () => {
          let attempts = 0;
          const maxAttempts = 60; // 60 seconds max
          
          while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            
            const statusResponse = await fetch(`${API_BASE}/api/process/status/${fileData.file_id}`);
            if (statusResponse.status === 404) {
              // File not found; stop polling and inform user
              setError('Processing file not found on server. Please re-upload and try again.');
              break;
            }
            if (statusResponse.ok) {
              const statusData = await statusResponse.json();
              
              if (statusData.status === 'done') {
                // Reload documents list and select the new document
                await loadDocuments();
                
                // Find and auto-select the newly processed document
                const updatedDocs = await fetch(`${API_BASE}/api/documents`);
                if (updatedDocs.ok) {
                  const data = await updatedDocs.json();
                  const newDoc = (data.documents || []).find((d: Document) => 
                    d.file_name === fileData.filename || 
                    (statusData.document_id && d.id === statusData.document_id)
                  );
                  if (newDoc) {
                    setDocuments(data.documents || []);
                    setSelectedDocument(newDoc);
                    setIsLoading(false);
                    return;
                  }
                }
                break;
              } else if (statusData.status === 'error') {
                setError('Document processing failed. Please try again.');
                break;
              }
            }
            
            attempts++;
          }
          
          if (attempts >= maxAttempts) {
            setError('Document processing timed out. Please check and try again.');
          }
          setIsLoading(false);
        };
        
        pollForCompletion();
      } else if (processResponse.ok) {
        // Immediate completion
        const processData = await processResponse.json();
        if (processData.result) {
          await loadDocuments();
          // Auto-select if possible
          const newDoc = documents.find(d => d.file_name === fileData.filename);
          if (newDoc) setSelectedDocument(newDoc);
        }
        setIsLoading(false);
      } else {
        setError('Failed to process document. Please try again.');
        setIsLoading(false);
      }
    } catch (error) {
      setError('Upload failed: ' + (error as Error).message);
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!selectedDocument) return;

    try {
      setIsLoading(true);
      
      // Add user message to chat immediately
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        message: message,
        created_at: new Date().toISOString()
      };
      setChatHistory(prev => [...prev, userMessage]);

      // Send to backend
  const response = await fetch(`${API_BASE}/api/chat/${selectedDocument.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Add assistant response
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          message: data.message,
          created_at: new Date().toISOString()
        };
        setChatHistory(prev => [...prev, assistantMessage]);
      } else {
        setError('Failed to send message');
      }
    } catch (error) {
      setError('Failed to send message: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteChat = async (documentId: string) => {
    try {
      setIsLoading(true);
  const resp = await fetch(`${API_BASE}/api/chats/${documentId}`, { method: 'DELETE' });
      if (resp.ok) {
        // Refresh document list and clear selection
        await loadDocuments();
        setSelectedDocument(null);
        setChatHistory([]);
      } else {
        console.warn('Failed to delete chat', await resp.text());
      }
    } catch (e) {
      console.warn('Delete chat error', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="close-error">×</button>
        </div>
      )}
      
      <div className="main-layout">
        <ChatSidebar 
          documents={documents}
          selectedDocument={selectedDocument}
          onSelectDocument={setSelectedDocument}
          onNewChat={() => setSelectedDocument(null)}
          onDocumentsChange={loadDocuments}
        />
        
        <div className="chat-area">
          {selectedDocument ? (
            <ChatInterface
              document={selectedDocument}
              chatHistory={chatHistory}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              onDeleteChat={handleDeleteChat}
            />
          ) : (
            <div className="welcome-area">
              <div className="welcome-content">
                <h1>Legal Document AI Assistant</h1>
                <p>Upload a legal document to get started with AI-powered analysis and chat.</p>
                {isLoading && (
                  <div className="processing-indicator">
                    <div className="processing-spinner"></div>
                    <p>Processing your document... This may take a few moments.</p>
                  </div>
                )}
              </div>

              {/* Show FileUpload only when not processing */}
              {!isLoading && (
                <div className="welcome-upload">
                  <FileUpload onFileUploaded={handleFileUploaded} isProcessing={isLoading} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
