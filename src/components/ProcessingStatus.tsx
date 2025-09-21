import React, { useEffect, useState, useRef } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import axios from 'axios';

interface ProcessingStatusProps {
  fileId: string;
  filename: string;
  onComplete: (result: any) => void;
  onError: (error: string) => void;
}

const POLL_INTERVAL_MS = 2000;

const ProcessingStatus: React.FC<ProcessingStatusProps> = ({
  fileId,
  filename,
  onComplete,
  onError
}) => {
  const [statusMessage, setStatusMessage] = useState('Processing...');
  const pollingRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const startProcessing = async () => {
      try {
        const postUrl = `http://localhost:5000/api/process/${fileId}`;
        const postResp = await axios.post(postUrl);

        // If backend returned immediate result (cached or direct), handle it
        if (postResp.status === 200) {
          const payload = postResp.data;
          const result = payload && payload.result ? payload.result : payload;
          if (!cancelled) onComplete(result);
          return;
        }

        // If processing started (202), poll for completion
        if (postResp.status === 202) {
          setStatusMessage('Processing started — checking status...');
          pollStatus();
          return;
        }

        // Fallback: treat response as data
        const fallback = postResp.data;
        const result = fallback && fallback.result ? fallback.result : fallback;
        if (!cancelled) onComplete(result);

      } catch (err: any) {
        // If server responded with 202 but axios treats as success, handle above. Otherwise handle errors.
        if (err.response && err.response.status === 202) {
          setStatusMessage('Processing started — checking status...');
          pollStatus();
          return;
        }

        const errorMessage = err.response?.data?.error || 'Processing failed. Please try again.';
        if (!cancelled) onError(errorMessage);
      }
    };

    const pollStatus = () => {
      // clear any existing poll
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current);
      }

      pollingRef.current = window.setInterval(async () => {
        try {
          const statusUrl = `http://localhost:5000/api/process/status/${fileId}`;
          const resp = await axios.get(statusUrl);
          const data = resp.data;

          if (data.status === 'done' && (data.result || data.result === 0)) {
            // result may be inside data.result or data
            const result = data.result || data;
            if (pollingRef.current) {
              window.clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
            onComplete(result);
          }

          // You can expand to handle 'error' or other states
        } catch (err: any) {
          // keep polling; if too many failures occur, notify user
          console.warn('Status poll failed, will retry:', err?.message || err);
        }
      }, POLL_INTERVAL_MS);
    };

    startProcessing();

    return () => {
      cancelled = true;
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [fileId, onComplete, onError]);

  return (
    <div className="processing-container simple">
      <div className="processing-header">
        <FileText className="file-icon" />
        <h2>Processing Document</h2>
        <p className="filename">{filename}</p>
      </div>
      <div className="processing-line">
        <Loader2 className="spinner" />
        <span className="processing-text">{statusMessage}</span>
      </div>
    </div>
  );
};

export default ProcessingStatus;