import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { AlertCircle, Plus } from 'lucide-react';
import axios from 'axios';
import { API_BASE } from '../config';

interface FileUploadProps {
  onFileUploaded: (fileData: {file_id: string; filename: string}) => void;
  isProcessing?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileUploaded, isProcessing = false }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadFile = useCallback(async (file: File) => {
    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
  const response = await axios.post(`${API_BASE}/api/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.file_id) {
        // Forward the whole response so the caller can use immediate "result" when the
        // backend processed the upload synchronously (serverless). This avoids a
        // follow-up /api/process call that may 404 if files are ephemeral.
        onFileUploaded({
          file_id: response.data.file_id,
          filename: response.data.filename,
          rawResponse: response.data
        } as any);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Upload failed. Please try again.';
      setUploadError(errorMessage);
    } finally {
      setUploading(false);
    }
  }, [onFileUploaded]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0 && !isProcessing && !uploading) {
      uploadFile(acceptedFiles[0]);
    }
  }, [uploadFile, isProcessing, uploading]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
    },
    maxSize: 16 * 1024 * 1024, // 16MB
    multiple: false,
    disabled: isProcessing || uploading,
  });

  const isDisabled = isProcessing || uploading;

  return (
    <div className="file-upload-bottom">
      <div
        {...getRootProps()}
        className={`upload-zone ${isDragActive ? 'drag-active' : ''} ${isDisabled ? 'disabled' : ''}`}
      >
        <input {...getInputProps()} />
        
        <div className="upload-content">
          {uploading ? (
            <>
              <div className="spinner-small"></div>
              <span>Uploading...</span>
            </>
          ) : isProcessing ? (
            <>
              <div className="spinner-small"></div>
              <span>Processing...</span>
            </>
          ) : (
            <>
              <Plus className="upload-icon-small" />
              <span>Upload new document</span>
            </>
          )}
        </div>
      </div>

      {fileRejections.length > 0 && (
        <div className="upload-error">
          <AlertCircle className="error-icon-small" />
          <span>
            {fileRejections[0].errors[0].code === 'file-too-large'
              ? 'File too large (max 16MB)'
              : fileRejections[0].errors[0].code === 'file-invalid-type'
              ? 'Invalid file type (PDF, PNG, JPG only)'
              : 'Upload error'}
          </span>
        </div>
      )}

      {uploadError && (
        <div className="upload-error">
          <AlertCircle className="error-icon-small" />
          <span>{uploadError}</span>
        </div>
      )}
    </div>
  );
};

export default FileUpload;