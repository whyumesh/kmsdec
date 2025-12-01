"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "./button";
import { Upload, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { validateFile, uploadFileWithProgress, UploadProgress } from "@/lib/storj";

interface FileUploadStorjProps {
  onFileSelected: (file: File) => void;
  onFileRemoved: () => void;
  accept?: string;
  className?: string;
  fileType: 'aadhaar' | 'photo' | 'proposer_aadhaar';
  candidateId: string;
  maxSizeMB?: number;
  selectedFile?: File | null;
}

interface FileState {
  status: 'idle' | 'selected' | 'error';
  error?: string;
}

export function FileUploadStorj({
  onFileSelected,
  onFileRemoved,
  accept,
  className,
  fileType,
  candidateId,
  maxSizeMB = 5,
  selectedFile
}: FileUploadStorjProps) {
  const [dragActive, setDragActive] = useState(false);
  const [fileState, setFileState] = useState<FileState>({ status: 'idle' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync internal state with selectedFile prop
  useEffect(() => {
    if (selectedFile) {
      setFileState({ status: 'selected' });
    } else {
      setFileState({ status: 'idle' });
    }
  }, [selectedFile]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    // Validate file
    const validation = validateFile(file, maxSizeMB);
    if (!validation.valid) {
      setFileState({
        status: 'error',
        error: validation.error
      });
      return;
    }

    setFileState({ status: 'selected' });
    onFileSelected(file);
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const removeFile = () => {
    setFileState({ status: 'idle' });
    onFileRemoved();
  };

  const getStatusIcon = () => {
    switch (fileState.status) {
      case 'selected':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-6 w-6 text-red-500" />;
      default:
        return <Upload className="h-6 w-6 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (fileState.status) {
      case 'selected':
        return 'File selected - will upload on form submission';
      case 'error':
        return fileState.error || 'File selection failed';
      default:
        return 'Select a file to upload';
    }
  };

  const getStatusColor = () => {
    switch (fileState.status) {
      case 'selected':
        return 'border-green-400 bg-green-50';
      case 'error':
        return 'border-red-400 bg-red-50';
      default:
        return dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400';
    }
  };

  return (
    <div className="space-y-4">
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${getStatusColor()} ${className}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileInput}
          className="hidden"
        />

        <div className="space-y-3">
          {getStatusIcon()}
          
          <div className="text-gray-700">
            <p className="text-sm font-medium">
              {getStatusText()}
            </p>
            

            {fileState.status === 'idle' && (
              <p className="text-xs text-gray-500 mt-1">
                Drag and drop a file here, or{" "}
                <button
                  type="button"
                  onClick={openFileDialog}
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  browse
                </button>
              </p>
            )}

            {accept && fileState.status === 'idle' && (
              <p className="text-xs text-gray-500 mt-1">
                Accepted formats: {accept}
              </p>
            )}

            {fileState.status === 'idle' && (
              <p className="text-xs text-gray-500 mt-1">
                Max size: {maxSizeMB}MB
              </p>
            )}
          </div>

          {fileState.status === 'selected' && selectedFile && (
            <div className="mt-3 p-3 bg-white rounded-lg border">
              <p className="text-sm text-gray-700">
                <strong>File:</strong> {selectedFile.name}
              </p>
              <p className="text-xs text-gray-500">
                Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          )}
        </div>
      </div>

      {fileState.status === 'selected' && (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={removeFile}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <X className="h-4 w-4 mr-2" />
            Remove File
          </Button>
        </div>
      )}

      {fileState.status === 'error' && (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setFileState({ status: 'idle' });
            }}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}
