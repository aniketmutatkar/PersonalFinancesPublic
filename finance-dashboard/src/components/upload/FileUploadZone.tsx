// src/components/upload/FileUploadZone.tsx
import React, { useState, useCallback } from 'react';
import { Upload, X, File, AlertCircle } from 'lucide-react';

interface FileUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
  acceptedFileTypes?: string;
  title?: string;
  subtitle?: string;
  supportText?: string;
}

interface FileWithId extends File {
  id: string;
}

export default function FileUploadZone({ 
  onFilesSelected, 
  isLoading = false, 
  error = null,
  className = '',
  acceptedFileTypes = '.csv',
  title = 'Upload Bank CSV Files',
  subtitle = 'Drag and drop your bank CSV files here, or click to browse',
  supportText = 'Supports multiple files • Max 5MB per file • CSV format only'
}: FileUploadZoneProps) {
  const [selectedFiles, setSelectedFiles] = useState<FileWithId[]>([]);
  const [originalFiles, setOriginalFiles] = useState<File[]>([]); // Store original File objects
  const [dragActive, setDragActive] = useState(false);

  // Generate unique ID for display purposes only
  const createFileDisplay = (file: File): FileWithId => {
    const safeName = file.name || `unknown-${Date.now()}.csv`;
    const safeSize = file.size || 0;
    const safeLastModified = file.lastModified || Date.now();
    
    const fileDisplay = {
      id: `${safeName}_${safeSize}_${safeLastModified}`,
      name: safeName,
      size: safeSize,
      lastModified: safeLastModified,
      type: file.type
    } as FileWithId;
    
    return fileDisplay;
  };

  // Handle file selection
  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    
    const fileArray = Array.from(files);
    
    // Filter out duplicates from original files
    const uniqueFiles = fileArray.filter(newFile => 
      !originalFiles.some(existingFile => 
        existingFile.name === newFile.name && existingFile.size === newFile.size
      )
    );
    
    if (uniqueFiles.length > 0) {
      // Update original files (actual File objects)
      const updatedOriginalFiles = [...originalFiles, ...uniqueFiles];
      setOriginalFiles(updatedOriginalFiles);
      
      // Update display files (for UI)
      const updatedDisplayFiles = updatedOriginalFiles.map(createFileDisplay);
      setSelectedFiles(updatedDisplayFiles);
      
      // Pass original File objects to parent
      onFilesSelected(updatedOriginalFiles);
    }
  }, [originalFiles, onFilesSelected]);

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  // File input change handler
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  }, [handleFiles]);

  // Remove file
  const removeFile = useCallback((fileId: string) => {
    const updatedDisplayFiles = selectedFiles.filter(file => file.id !== fileId);
    setSelectedFiles(updatedDisplayFiles);
    
    // Find and remove from original files too
    const displayFile = selectedFiles.find(f => f.id === fileId);
    if (displayFile) {
      const updatedOriginalFiles = originalFiles.filter(file => 
        !(file.name === displayFile.name && file.size === displayFile.size)
      );
      setOriginalFiles(updatedOriginalFiles);
      onFilesSelected(updatedOriginalFiles);
    }
  }, [selectedFiles, originalFiles, onFilesSelected]);

  const clearFiles = useCallback(() => {
    setSelectedFiles([]);
    setOriginalFiles([]);
    onFilesSelected([]);
  }, [onFilesSelected]);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Zone */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
          ${dragActive ? 'border-blue-400 bg-blue-400/10' : 'border-gray-600 hover:border-gray-500'}
          ${isLoading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
          ${error ? 'border-red-500 bg-red-500/10' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          multiple
          accept={acceptedFileTypes}
          onChange={handleInputChange}
          className="hidden"
          disabled={isLoading}
        />
        
        <div className="flex flex-col items-center space-y-4">
          <Upload className={`h-12 w-12 ${dragActive ? 'text-blue-400' : 'text-gray-400'}`} />
          
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {dragActive ? 'Drop files here' : title}
            </h3>
            <p className="text-gray-400 mb-4">
              {subtitle}
            </p>
            <p className="text-xs text-gray-500">
              {supportText}
            </p>
          </div>
        </div>
        
        {isLoading && (
          <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center rounded-lg">
            <div className="flex items-center space-x-2 text-white">
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
              <span>Processing files...</span>
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-red-400 font-medium text-sm">Upload Error</h4>
              <p className="text-red-300 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-white font-medium">
              Selected Files ({selectedFiles.length})
            </h4>
            <button
              onClick={clearFiles}
              className="text-gray-400 hover:text-white text-sm transition-colors"
              disabled={isLoading}
            >
              Clear All
            </button>
          </div>
          
          <div className="space-y-2">
            {selectedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <File className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-white text-sm font-medium">{file.name}</p>
                    <p className="text-gray-400 text-xs">
                      {formatFileSize(file.size)} • Modified {new Date(file.lastModified).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => removeFile(file.id)}
                  className="text-gray-400 hover:text-red-400 transition-colors p-1"
                  disabled={isLoading}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}