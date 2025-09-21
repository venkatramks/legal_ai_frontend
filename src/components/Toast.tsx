import React from 'react';

interface ToastProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, actionLabel, onAction, onClose }) => {
  return (
    <div className="app-toast">
      <div className="app-toast-body">
        <div className="app-toast-message">{message}</div>
        <div className="app-toast-actions">
          {actionLabel && <button className="app-toast-action" onClick={() => { onAction && onAction(); onClose && onClose(); }}>{actionLabel}</button>}
          <button className="app-toast-close" onClick={() => onClose && onClose()}>✕</button>
        </div>
      </div>
    </div>
  )
}

export default Toast;
