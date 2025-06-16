// src/hooks/useUploadData.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { 
  FilePreviewResponse, 
  UploadConfirmation, 
  UploadSummaryResponse,
  ApiResponse 
} from '../types/api';
import { QUERY_KEYS } from './useApiData';

// Upload Preview Hook
export function useUploadPreview() {
  return useMutation({
    mutationFn: async (files: File[]) => {
      // Validate files before upload
      const validationErrors = validateFiles(files);
      if (validationErrors.length > 0) {
        throw new Error(`File validation failed: ${validationErrors.join(', ')}`);
      }
      
      return api.uploadFilesPreview(files);
    },
    onError: (error) => {
      console.error('Upload preview failed:', error);
    },
  });
}

// Upload Confirmation Hook
export function useUploadConfirm() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (confirmation: UploadConfirmation) => {
      return api.confirmUpload(confirmation);
    },
    onSuccess: () => {
      // Invalidate all relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financialOverview });
      queryClient.invalidateQueries({ queryKey: ['monthly-summaries'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['budget-analysis'] });
      queryClient.invalidateQueries({ queryKey: ['yearly-budget-analysis'] });
    },
    onError: (error) => {
      console.error('Upload confirmation failed:', error);
    },
  });
}

// File Validation Helper
function validateFiles(files: File[]): string[] {
  const errors: string[] = [];
  const maxFileSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['text/csv', 'application/vnd.ms-excel'];
  
  files.forEach((file, index) => {
    // Check file size
    if (file.size > maxFileSize) {
      errors.push(`File ${index + 1} (${file.name}) is too large. Maximum size is 5MB.`);
    }
    
    // Check file type
    const isValidType = allowedTypes.includes(file.type) || file.name.toLowerCase().endsWith('.csv');
    if (!isValidType) {
      errors.push(`File ${index + 1} (${file.name}) is not a valid CSV file.`);
    }
    
    // Check if file is empty
    if (file.size === 0) {
      errors.push(`File ${index + 1} (${file.name}) is empty.`);
    }
  });
  
  // Check total number of files
  if (files.length === 0) {
    errors.push('No files selected.');
  }
  
  if (files.length > 10) {
    errors.push('Too many files. Maximum 10 files allowed per upload.');
  }
  
  return errors;
}

// Combined Upload Hook (for simpler usage)
export function useFileUpload() {
  const previewMutation = useUploadPreview();
  const confirmMutation = useUploadConfirm();
  
  return {
    // Upload states
    isPreviewLoading: previewMutation.isPending,
    isConfirmLoading: confirmMutation.isPending,
    isLoading: previewMutation.isPending || confirmMutation.isPending,
    
    // Upload data
    previewData: previewMutation.data,
    confirmData: confirmMutation.data,
    
    // Upload errors
    previewError: previewMutation.error,
    confirmError: confirmMutation.error,
    error: previewMutation.error || confirmMutation.error,
    
    // Upload functions
    uploadPreview: previewMutation.mutate,
    confirmUpload: confirmMutation.mutate,
    
    // Reset function
    reset: () => {
      previewMutation.reset();
      confirmMutation.reset();
    },
  };
}