// finance-dashboard/src/components/upload/MultiBankStatementUpload.tsx
import React, { useState, useCallback } from 'react';
import { FileText, CheckCircle, AlertTriangle, X, Edit, Building2 } from 'lucide-react';
import { getApiBaseUrl } from '../../config/api';

interface ConflictData {
  success: boolean;
  duplicate_detected?: boolean;
  conflict_type?: string;
  message?: string;
  recommendation?: 'auto_skip' | 'suggest_update' | 'manual_review';
  similarity_percentage?: number;
  existing_balance?: any;
  extracted_balance?: any;
  options?: {
    can_skip: boolean;
    can_update: boolean;
    requires_review: boolean;
  };
}

interface ProcessedStatement {
  id: string;
  filename: string;
  fileType: 'pdf';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'conflict' | 'skipped';
  extractedData?: {
    institution?: string;
    account_name?: string;
    account_number?: string;
    statement_month?: string;
    beginning_balance?: number;
    ending_balance?: number;
    deposits_additions?: number;
    withdrawals_subtractions?: number;
    confidence_score?: number;
    extraction_notes?: string[];
  };
  error?: string;
  bank_balance_id?: number;
  isReviewing?: boolean;
  conflictData?: ConflictData;
}

interface ReviewFormData {
  account_name: string;
  statement_month: string;
  beginning_balance: string;
  ending_balance: string;
  deposits_additions: string;
  withdrawals_subtractions: string;
  notes: string;
}

interface BankUploadProps {
  onBackToSelect: () => void;
}

type BankStep = 'upload' | 'review' | 'summary';

export default function MultiBankStatementUpload({ onBackToSelect }: BankUploadProps) {
  const [currentStep, setCurrentStep] = useState<BankStep>('upload');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [processedStatements, setProcessedStatements] = useState<ProcessedStatement[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [reviewingStatement, setReviewingStatement] = useState<ProcessedStatement | null>(null);
  const [reviewFormData, setReviewFormData] = useState<ReviewFormData>({
    account_name: '',
    statement_month: '',
    beginning_balance: '',
    ending_balance: '',
    deposits_additions: '',
    withdrawals_subtractions: '',
    notes: ''
  });
  const [isReviewSaving, setIsReviewSaving] = useState(false);
  const [uploadSummary, setUploadSummary] = useState<any>(null);

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
      const newFiles = Array.from(e.dataTransfer.files);
      handleFiles(newFiles);
    }
  }, []);

  const handleFiles = useCallback((files: File[]) => {
    // Filter for PDF files only
    const pdfFiles = files.filter(file => 
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    );
    
    if (pdfFiles.length === 0) {
      alert('Please select PDF files only for bank statements.');
      return;
    }

    // Filter out duplicates
    const uniqueFiles = pdfFiles.filter(newFile => 
      !selectedFiles.some(existingFile => 
        existingFile.name === newFile.name && existingFile.size === newFile.size
      )
    );

    if (uniqueFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...uniqueFiles]);
    }
  }, [selectedFiles]);

  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderConflictResolution = (statement: ProcessedStatement) => {
    if (!statement.conflictData) return null;
    
    const conflict = statement.conflictData;
    
    return (
      <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4 mt-2">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-yellow-400 font-medium">Duplicate Detected</h4>
            <p className="text-gray-300 text-sm mt-1">{conflict.message}</p>
            
            {conflict.existing_balance && conflict.extracted_balance && (
              <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Existing:</span>
                  <div className="text-white">
                    ${conflict.existing_balance.ending_balance?.toLocaleString()} 
                    ({conflict.existing_balance.statement_date})
                  </div>
                </div>
                <div>
                  <span className="text-gray-400">New:</span>
                  <div className="text-white">
                    ${conflict.extracted_balance.ending_balance?.toLocaleString()} 
                    ({conflict.extracted_balance.statement_date})
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex space-x-2 mt-3">
              {conflict.options?.can_skip && (
                <button
                  onClick={() => handleConflictAction(statement.id, 'skip')}
                  className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm"
                >
                  Skip Upload
                </button>
              )}
              {conflict.options?.can_update && (
                <button
                  onClick={() => handleConflictAction(statement.id, 'update')}
                  className="px-3 py-1 bg-yellow-600 hover:bg-yellow-500 text-white rounded text-sm"
                >
                  Replace Existing
                </button>
              )}
              {conflict.options?.requires_review && (
                <button
                  onClick={() => handleConflictAction(statement.id, 'review')}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm"
                >
                  Manual Review
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleConflictAction = async (statementId: string, action: 'skip' | 'update' | 'review') => {
    const statement = processedStatements.find(s => s.id === statementId);
    if (!statement?.conflictData) return;
    
    switch (action) {
      case 'skip':
        setProcessedStatements(prev => prev.map(stmt => 
          stmt.id === statementId 
            ? { ...stmt, status: 'skipped' }
            : stmt
        ));
        break;
        
      case 'update':
        // Re-upload with allow_update flag
        const fileIndex = parseInt(statementId.split('_')[1]);
        const originalFile = selectedFiles[fileIndex];
        
        try {
          const formData = new FormData();
          formData.append('file', originalFile);
          formData.append('allow_update', 'true');  // NEW FLAG
          
          const response = await fetch(`${getApiBaseUrl()}/api/portfolio/bank-statements/upload`, {
            method: 'POST',
            body: formData,
          });
          
          if (response.ok) {
            const result = await response.json();
            setProcessedStatements(prev => prev.map(stmt => 
              stmt.id === statementId 
                ? { 
                    ...stmt, 
                    status: 'completed', 
                    conflictData: undefined,
                    extractedData: {
                      institution: 'Wells Fargo',
                      account_name: result.bank_balance?.account_name || 'Checking',
                      account_number: result.bank_balance?.account_number || null,
                      statement_month: result.bank_balance?.statement_month || null,
                      beginning_balance: result.bank_balance?.beginning_balance || null,
                      ending_balance: result.bank_balance?.ending_balance || null,
                      deposits_additions: result.bank_balance?.deposits_additions || null,
                      withdrawals_subtractions: result.bank_balance?.withdrawals_subtractions || null,
                      confidence_score: result.parsing_confidence || 0,
                      extraction_notes: result.extraction_notes || []
                    },
                    bank_balance_id: result.bank_balance?.id || null
                  }
                : stmt
            ));
          }
        } catch (error) {
          console.error('Update failed:', error);
        }
        break;
        
      case 'review':
        // Open manual review (existing functionality)
        handleReviewStatement(statement);
        break;
    }
  };

  // Processing logic - UPDATED to handle conflict responses
  const processAllFiles = async () => {
    setIsProcessing(true);
    setCurrentStep('review');
    
    // Initialize processed statements
    const initialStatements: ProcessedStatement[] = selectedFiles.map((file, index) => ({
      id: `statement_${index}`,
      filename: file.name,
      fileType: 'pdf',
      status: 'pending'
    }));
    
    setProcessedStatements(initialStatements);

    // Process each file
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      
      // Update status to processing
      setProcessedStatements(prev => prev.map(stmt => 
        stmt.id === `statement_${i}` 
          ? { ...stmt, status: 'processing' }
          : stmt
      ));

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${getApiBaseUrl()}/api/portfolio/bank-statements/upload`, {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          
          if (result.duplicate_detected) {
            setProcessedStatements(prev => prev.map(stmt => 
              stmt.id === `statement_${i}` 
                ? { 
                    ...stmt, 
                    status: 'conflict',
                    conflictData: result,
                    extractedData: result.extracted_balance
                  }
                : stmt
            ));
          } else if (result.success) {
            // Normal success
            setProcessedStatements(prev => prev.map(stmt => 
              stmt.id === `statement_${i}` 
                ? { 
                    ...stmt, 
                    status: 'completed',
                    extractedData: {
                      institution: 'Wells Fargo',
                      account_name: result.bank_balance?.account_name || 'Checking',
                      account_number: result.bank_balance?.account_number || null,
                      statement_month: result.bank_balance?.statement_month || null,
                      beginning_balance: result.bank_balance?.beginning_balance || null,
                      ending_balance: result.bank_balance?.ending_balance || null,
                      deposits_additions: result.bank_balance?.deposits_additions || null,
                      withdrawals_subtractions: result.bank_balance?.withdrawals_subtractions || null,
                      confidence_score: result.parsing_confidence || 0,
                      extraction_notes: result.extraction_notes || []
                    },
                    bank_balance_id: result.bank_balance?.id || null
                  }
                : stmt
            ));
          }
        } else {
          const errorData = await response.json();
          setProcessedStatements(prev => prev.map(stmt => 
            stmt.id === `statement_${i}` 
              ? { ...stmt, status: 'failed', error: errorData.message || 'Processing failed' }
              : stmt
          ));
        }
      } catch (error) {
        setProcessedStatements(prev => prev.map(stmt => 
          stmt.id === `statement_${i}` 
            ? { ...stmt, status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' }
            : stmt
        ));
      }
    }

    setIsProcessing(false);
  };

  const handleReviewStatement = (statement: ProcessedStatement) => {
    setReviewingStatement(statement);
    
    if (statement.extractedData) {
      setReviewFormData({
        account_name: statement.extractedData.account_name || 'Checking',
        statement_month: statement.extractedData.statement_month || '',
        beginning_balance: statement.extractedData.beginning_balance?.toString() || '',
        ending_balance: statement.extractedData.ending_balance?.toString() || '',
        deposits_additions: statement.extractedData.deposits_additions?.toString() || '',
        withdrawals_subtractions: statement.extractedData.withdrawals_subtractions?.toString() || '',
        notes: `Extracted from ${statement.filename}`
      });
    }
  };

  const handleReviewFormChange = (field: keyof ReviewFormData, value: string) => {
    setReviewFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const saveReviewedStatement = async () => {
    if (!reviewingStatement) return;
    
    setIsReviewSaving(true);
    
    try {
      // Since the statement is already processed, we just update the local state
      setProcessedStatements(prev => prev.map(stmt => 
        stmt.id === reviewingStatement.id 
          ? { 
              ...stmt, 
              extractedData: {
                ...stmt.extractedData!,
                account_name: reviewFormData.account_name,
                statement_month: reviewFormData.statement_month,
                beginning_balance: parseFloat(reviewFormData.beginning_balance),
                ending_balance: parseFloat(reviewFormData.ending_balance),
                deposits_additions: reviewFormData.deposits_additions ? parseFloat(reviewFormData.deposits_additions) : undefined,
                withdrawals_subtractions: reviewFormData.withdrawals_subtractions ? parseFloat(reviewFormData.withdrawals_subtractions) : undefined,
              }
            }
          : stmt
      ));
      
      setReviewingStatement(null);
    } catch (error) {
      console.error('Error saving statement:', error);
      alert(`Error saving statement: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsReviewSaving(false);
    }
  };

  const proceedToSummary = () => {
    const successfulStatements = processedStatements.filter(stmt => stmt.status === 'completed');
    setUploadSummary({
      total_processed: processedStatements.length,
      successful: successfulStatements.length,
      failed: processedStatements.filter(stmt => stmt.status === 'failed').length,
      skipped: processedStatements.filter(stmt => stmt.status === 'skipped').length,
      statements: successfulStatements
    });
    setCurrentStep('summary');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'conflict': return <AlertTriangle className="h-5 w-5 text-yellow-400" />;
      case 'skipped': return <CheckCircle className="h-5 w-5 text-gray-400" />;
      case 'failed': return <AlertTriangle className="h-5 w-5 text-red-400" />;
      default: return <div className="h-5 w-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />;
    }
  };

  const renderUploadStep = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-6">
        <div className="flex items-center">
          <button
            onClick={onBackToSelect}
            className="text-sm text-gray-400 hover:text-gray-300 transition-colors flex items-center gap-1"
          >
            ← Back to upload types
          </button>
        </div>
        
        <div>
          <h1 className="text-3xl font-bold text-white">Bank Statements Upload</h1>
          <p className="text-gray-300 mt-2">Upload Wells Fargo bank statements to extract balances and track your cash flow.</p>
        </div>
      </div>

      {/* Upload Zone */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
          ${dragActive ? 'border-orange-400 bg-orange-400/10' : 'border-gray-600 hover:border-gray-500'}
          ${isProcessing ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById('bank-file-input')?.click()}
      >
        <input
          id="bank-file-input"
          type="file"
          multiple
          accept=".pdf"
          onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
          className="hidden"
          disabled={isProcessing}
        />
        
        <div className="flex flex-col items-center space-y-4">
          <Building2 className={`h-12 w-12 ${dragActive ? 'text-orange-400' : 'text-gray-400'}`} />
          
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {dragActive ? 'Drop bank statements here' : 'Upload Bank PDF Files'}
            </h3>
            <p className="text-gray-400 mb-4">
              Drag and drop your Wells Fargo bank statements here, or click to browse
            </p>
            <p className="text-xs text-gray-500">
              Supports PDF files • Max 50MB per file • Multiple files supported
            </p>
          </div>
        </div>
      </div>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-white font-medium">
              Selected Files ({selectedFiles.length})
            </h4>
            <button
              onClick={() => setSelectedFiles([])}
              className="text-gray-400 hover:text-white text-sm transition-colors"
              disabled={isProcessing}
            >
              Clear All
            </button>
          </div>
          
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-orange-400" />
                  <div>
                    <p className="text-white text-sm font-medium">{file.name}</p>
                    <p className="text-gray-400 text-xs">
                      {formatFileSize(file.size)} • Modified {new Date(file.lastModified).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => removeFile(index)}
                  className="text-gray-400 hover:text-red-400 transition-colors p-1"
                  disabled={isProcessing}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* What We'll Extract Info */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-2">What we'll extract:</h3>
        <ul className="space-y-1 text-gray-300">
          <li>• Beginning balance</li>
          <li>• Ending balance</li>
          <li>• Total deposits/additions</li>
          <li>• Total withdrawals/subtractions</li>
          <li>• Statement period</li>
          <li>• Account number</li>
        </ul>
      </div>

      {/* Start Processing Button */}
      {selectedFiles.length > 0 && !isProcessing && (
        <div className="flex justify-center">
          <button
            onClick={processAllFiles}
            className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <FileText className="w-5 h-5" />
            Process {selectedFiles.length} Statement{selectedFiles.length !== 1 ? 's' : ''}
          </button>
        </div>
      )}
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-6">
        <div className="flex items-center">
          <button
            onClick={onBackToSelect}
            className="text-sm text-gray-400 hover:text-gray-300 transition-colors flex items-center gap-1"
          >
            ← Back to upload types
          </button>
        </div>
        
        <div>
          <h1 className="text-3xl font-bold text-white">Review Extracted Data</h1>
          <p className="text-gray-300 mt-2">Review the extracted bank statement data before saving.</p>
        </div>
      </div>

      {/* Processing Status */}
      {isProcessing && (
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-400"></div>
            <h3 className="text-lg font-semibold text-white">Processing Statements...</h3>
          </div>
          <div className="space-y-2">
            {processedStatements.map((stmt) => (
              <div key={stmt.id} className="flex items-center justify-between p-3 bg-gray-700 rounded">
                <span className="text-white">{stmt.filename}</span>
                <span className={`text-sm ${
                  stmt.status === 'completed' ? 'text-green-400' :
                  stmt.status === 'processing' ? 'text-orange-400' :
                  stmt.status === 'failed' ? 'text-red-400' :
                  stmt.status === 'conflict' ? 'text-yellow-400' :
                  'text-gray-400'
                }`}>
                  {stmt.status === 'conflict' ? 'Duplicate Found' : stmt.status.charAt(0).toUpperCase() + stmt.status.slice(1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Processed Statements - UPDATED to show conflicts */}
      {!isProcessing && processedStatements.length > 0 && (
        <div className="space-y-4">
          {processedStatements.map((statement) => (
            <div key={statement.id} className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-orange-400" />
                  <div>
                    <h3 className="text-lg font-semibold text-white">{statement.filename}</h3>
                    <p className="text-sm text-gray-400">Wells Fargo Bank Statement</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {getStatusIcon(statement.status)}
                  <span className={`text-sm ${
                    statement.status === 'completed' ? 'text-green-400' :
                    statement.status === 'conflict' ? 'text-yellow-400' :
                    statement.status === 'skipped' ? 'text-gray-400' :
                    statement.status === 'failed' ? 'text-red-400' : 'text-gray-400'
                  }`}>
                    {statement.status === 'completed' && 'Extracted Successfully'}
                    {statement.status === 'conflict' && 'Duplicate Detected'}
                    {statement.status === 'skipped' && 'Skipped'}
                    {statement.status === 'failed' && 'Processing Failed'}
                  </span>
                </div>
              </div>

              {/* NEW: Show conflict resolution if needed */}
              {statement.status === 'conflict' && renderConflictResolution(statement)}

              {(statement.status === 'completed' || statement.status === 'conflict') && statement.extractedData && (
                <>
                  {/* Confidence Score */}
                  <div className="mb-4 bg-gray-700/50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Extraction Confidence</h4>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-600 rounded-full h-3">
                        <div 
                          className={`h-3 rounded-full transition-all duration-300 ${
                            (statement.extractedData.confidence_score || 0) >= 0.8 ? 'bg-green-500' :
                            (statement.extractedData.confidence_score || 0) >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${((statement.extractedData.confidence_score || 0) * 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-300 font-medium">
                        {((statement.extractedData.confidence_score || 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Extracted Data Display */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-400 mb-1">Account</h4>
                      <p className="text-white">{statement.extractedData.account_name || 'Checking'}</p>
                      {statement.extractedData.account_number && (
                        <p className="text-sm text-gray-400">#{statement.extractedData.account_number}</p>
                      )}
                    </div>
                    
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-400 mb-1">Statement Period</h4>
                      <p className="text-white">{statement.extractedData.statement_month || 'Unknown'}</p>
                    </div>
                    
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-400 mb-1">Beginning Balance</h4>
                      <p className="text-white font-semibold">
                        {statement.extractedData.beginning_balance ? `$${statement.extractedData.beginning_balance.toLocaleString()}` : 'Not found'}
                      </p>
                    </div>
                    
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-400 mb-1">Ending Balance</h4>
                      <p className="text-green-400 font-semibold">
                        {statement.extractedData.ending_balance ? `$${statement.extractedData.ending_balance.toLocaleString()}` : 'Not found'}
                      </p>
                    </div>
                    
                    {statement.extractedData.deposits_additions && (
                      <div className="bg-gray-700/50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-400 mb-1">Total Deposits</h4>
                        <p className="text-green-400">+${statement.extractedData.deposits_additions.toLocaleString()}</p>
                      </div>
                    )}
                    
                    {statement.extractedData.withdrawals_subtractions && (
                      <div className="bg-gray-700/50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-400 mb-1">Total Withdrawals</h4>
                        <p className="text-red-400">-${statement.extractedData.withdrawals_subtractions.toLocaleString()}</p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {statement.status === 'completed' && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleReviewStatement(statement)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                        Review & Edit
                      </button>
                    </div>
                  )}
                </>
              )}

              {statement.status === 'failed' && (
                <div className="bg-red-900/20 border border-red-600 rounded-lg p-4">
                  <p className="text-red-300">{statement.error}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Continue Button */}
      {!isProcessing && processedStatements.filter(s => s.status === 'completed').length > 0 && (
        <div className="flex justify-center">
          <button
            onClick={proceedToSummary}
            className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            Save All Statements ({processedStatements.filter(s => s.status === 'completed').length})
          </button>
        </div>
      )}
    </div>
  );

  const renderSummaryStep = () => (
    <div className="space-y-6">
      {/* Success Header - Clean like other uploads */}
      <div className="space-y-6">
        <div className="flex items-center">
          <button
            onClick={onBackToSelect}
            className="text-sm text-gray-400 hover:text-gray-300 transition-colors flex items-center gap-1"
          >
            ← Back to upload types
          </button>
        </div>
        
        <div>
          <h1 className="text-3xl font-bold text-white">Upload Complete</h1>
          <p className="text-gray-300 mt-2">
            Successfully processed {uploadSummary?.successful || 0} of {uploadSummary?.total_processed || 0} bank statements.
          </p>
        </div>
      </div>

      {/* What Was Uploaded */}
      {uploadSummary?.statements && uploadSummary.statements.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Uploaded Statements</h3>
          <div className="space-y-3">
            {uploadSummary.statements.map((statement: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-white font-medium">{statement.filename}</p>
                    <p className="text-gray-400 text-sm">
                      {statement.extractedData?.statement_month || 'Unknown month'} • 
                      ${statement.extractedData?.ending_balance?.toLocaleString() || 'N/A'} ending balance
                    </p>
                  </div>
                </div>
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Cards - Same style as other pages */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Statements Processed</h3>
          <p className="text-2xl font-bold text-white">{uploadSummary?.total_processed || 0}</p>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Successful</h3>
          <p className="text-2xl font-bold text-green-400">{uploadSummary?.successful || 0}</p>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Skipped</h3>
          <p className="text-2xl font-bold text-yellow-400">{uploadSummary?.skipped || 0}</p>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Failed</h3>
          <p className="text-2xl font-bold text-red-400">{uploadSummary?.failed || 0}</p>
        </div>
      </div>

      {/* Action Buttons - Clean style */}
      <div className="flex gap-4">
        <button
          onClick={() => window.location.href = '/bank-statements'}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
        >
          View Bank Statements
        </button>
        
        <button
          onClick={() => {
            setSelectedFiles([]);
            setProcessedStatements([]);
            setUploadSummary(null);
            setCurrentStep('upload');
          }}
          className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
        >
          Upload More
        </button>
      </div>
    </div>
  );

  // Review Modal
  const reviewModal = reviewingStatement && (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-white">Review Statement Data</h3>
          <button
            onClick={() => setReviewingStatement(null)}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Account Name</label>
              <input
                type="text"
                value={reviewFormData.account_name}
                onChange={(e) => handleReviewFormChange('account_name', e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Statement Month</label>
              <input
                type="text"
                value={reviewFormData.statement_month}
                onChange={(e) => handleReviewFormChange('statement_month', e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                placeholder="YYYY-MM"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Beginning Balance</label>
              <input
                type="number"
                step="0.01"
                value={reviewFormData.beginning_balance}
                onChange={(e) => handleReviewFormChange('beginning_balance', e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Ending Balance</label>
              <input
                type="number"
                step="0.01"
                value={reviewFormData.ending_balance}
                onChange={(e) => handleReviewFormChange('ending_balance', e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Total Deposits</label>
              <input
                type="number"
                step="0.01"
                value={reviewFormData.deposits_additions}
                onChange={(e) => handleReviewFormChange('deposits_additions', e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                placeholder="Optional"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Total Withdrawals</label>
              <input
                type="number"
                step="0.01"
                value={reviewFormData.withdrawals_subtractions}
                onChange={(e) => handleReviewFormChange('withdrawals_subtractions', e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                placeholder="Optional"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Notes</label>
            <textarea
              value={reviewFormData.notes}
              onChange={(e) => handleReviewFormChange('notes', e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              rows={3}
              placeholder="Add any notes about this statement..."
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={saveReviewedStatement}
            disabled={isReviewSaving}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-3 px-4 rounded-lg font-medium transition-colors"
          >
            {isReviewSaving ? 'Saving...' : 'Save Changes'}
          </button>
          
          <button
            onClick={() => setReviewingStatement(null)}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="max-w-6xl mx-auto">
        {currentStep === 'upload' && renderUploadStep()}
        {currentStep === 'review' && renderReviewStep()}
        {currentStep === 'summary' && renderSummaryStep()}
      </div>
      {reviewModal}
    </>
  );
}