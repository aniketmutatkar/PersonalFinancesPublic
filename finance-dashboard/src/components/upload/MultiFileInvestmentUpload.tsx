import React, { useState, useCallback } from 'react';
import { FileText, Image, CheckCircle, AlertTriangle, X, Eye, Edit, Plus } from 'lucide-react';
import { getApiBaseUrl } from '../../config/api';

// Types for investment upload workflow
interface ProcessedStatement {
  id: string;
  filename: string;
  fileType: 'pdf' | 'image';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'duplicate_warning' | 'needs_review' | 'skipped';
  extractedData?: {
    institution?: string;
    account_type?: string;
    ending_balance?: number;
    statement_date?: string;
    statement_period_end?: string;
    confidence_score?: number;
    matched_account?: {
      id: number;
      name: string;
    };
  };
  error?: string;
  statement_id?: number;
  relevant_page?: number;
  total_pages?: number;
  isReviewing?: boolean;
  duplicateInfo?: {
    type: 'filename' | 'monthly';
    message: string;
    recommendation: string;
    existing_balance?: any;
    similarity_percentage?: number;
  };
  requiresReview?: boolean;
}

interface ReviewFormData {
  account_id: string;
  balance_date: string;
  balance_amount: string;
  notes: string;
}

interface InvestmentUploadProps {
  onBackToSelect: () => void;
}

type InvestmentStep = 'upload' | 'review' | 'summary';

export default function EnhancedMultiFileInvestmentUpload({ onBackToSelect }: InvestmentUploadProps) {
  const [currentStep, setCurrentStep] = useState<InvestmentStep>('upload');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [processedStatements, setProcessedStatements] = useState<ProcessedStatement[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [reviewingStatement, setReviewingStatement] = useState<ProcessedStatement | null>(null);
  const [reviewFormData, setReviewFormData] = useState<ReviewFormData>({
    account_id: '',
    balance_date: '',
    balance_amount: '',
    notes: ''
  });
  const [isReviewSaving, setIsReviewSaving] = useState(false);

  // Accounts data
  const availableAccounts = [
    { id: 1, name: 'Wealthfront Investment', institution: 'Wealthfront' },
    { id: 2, name: 'Schwab Brokerage', institution: 'Schwab' },
    { id: 3, name: 'Acorns', institution: 'Acorns' },
    { id: 4, name: 'Robinhood', institution: 'Robinhood' },
    { id: 5, name: 'Schwab Roth IRA', institution: 'Schwab' },
    { id: 6, name: 'Wealthfront Cash', institution: 'Wealthfront' }, 
    { id: 7, name: '401(k) Plan', institution: 'ADP' } 
  ];

  // File handling
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files) {
      const newFiles = Array.from(e.dataTransfer.files).filter(file => 
        file.type === 'application/pdf' || 
        file.type.startsWith('image/') ||
        file.name.toLowerCase().endsWith('.heic')
      );
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Manual entry functionality
  const handleManualEntry = () => {
    setShowManualEntry(true);
  };

  const saveManualEntry = async () => {
    if (!reviewFormData.account_id || !reviewFormData.balance_amount || !reviewFormData.balance_date) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/portfolio/balances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: parseInt(reviewFormData.account_id),
          balance_date: reviewFormData.balance_date,
          balance_amount: parseFloat(reviewFormData.balance_amount),
          notes: reviewFormData.notes
        }),
      });

      if (response.ok) {
        setShowManualEntry(false);
        setReviewFormData({ account_id: '', balance_date: '', balance_amount: '', notes: '' });
        alert('Manual balance entry saved successfully!');
      } else {
        throw new Error('Failed to save manual entry');
      }
    } catch (error) {
      console.error('Error saving manual entry:', error);
      alert('Error saving manual entry');
    }
  };

  const renderDuplicateWarning = (statement: ProcessedStatement) => {
    if (!statement.duplicateInfo) return null;
    
    const duplicate = statement.duplicateInfo;
    
    return (
      <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-3 mt-2">
        <div className="flex items-start space-x-2">
          <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5" />
          <div className="flex-1">
            <h5 className="text-yellow-400 text-sm font-medium">
              {duplicate.type === 'filename' ? 'Filename Duplicate' : 'Monthly Duplicate'}
            </h5>
            <p className="text-gray-300 text-xs mt-1">{duplicate.message}</p>
            
            {duplicate.type === 'monthly' && duplicate.existing_balance && (
              <div className="mt-2 text-xs">
                <span className="text-gray-400">Existing: </span>
                <span className="text-white">
                  ${duplicate.existing_balance.balance_amount?.toLocaleString()} 
                  ({duplicate.existing_balance.balance_date})
                </span>
                {duplicate.similarity_percentage && (
                  <span className="text-gray-400 ml-2">
                    ({(duplicate.similarity_percentage * 100).toFixed(1)}% similar)
                  </span>
                )}
              </div>
            )}
            
            <div className="mt-2 text-xs text-yellow-300">
              Recommendation: {duplicate.recommendation?.replace('_', ' ')}
            </div>
            
            {/* IMPROVED: Better action buttons */}
            <div className="flex space-x-2 mt-3">
              <button
                onClick={() => handleDuplicateAction(statement.id, 'skip')}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Skip This File
              </button>
              
              <button
                onClick={() => handleDuplicateAction(statement.id, 'proceed')}
                className="px-3 py-1 bg-yellow-600 hover:bg-yellow-500 text-white rounded text-sm"
              >
                Upload Anyway
              </button>
              
              <button
                onClick={() => startReviewingStatement(statement)}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm"
              >
                Review Details
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleDuplicateAction = async (statementId: string, action: 'proceed' | 'skip') => {
    if (action === 'skip') {
      setProcessedStatements(prev => prev.map(stmt => 
        stmt.id === statementId 
          ? { ...stmt, status: 'skipped' }
          : stmt
      ));
      
      // Show user feedback
      const statement = processedStatements.find(s => s.id === statementId);
      if (statement) {
        console.log(`Skipped duplicate file: ${statement.filename}`);
      }
    } else if (action === 'proceed') {
      // Mark as ready to save (remove duplicate warning)
      setProcessedStatements(prev => prev.map(stmt => 
        stmt.id === statementId 
          ? { ...stmt, status: 'completed', duplicateInfo: undefined }
          : stmt
      ));
    }
  };

  const removeSkippedFiles = () => {
    setProcessedStatements(prev => prev.filter(stmt => stmt.status !== 'skipped'));
    
    // If no files left, go back to upload
    const remainingFiles = processedStatements.filter(stmt => stmt.status !== 'skipped');
    if (remainingFiles.length === 0) {
      setCurrentStep('upload');
      setSelectedFiles([]);
      setProcessedStatements([]);
    }
  };

  // Review functionality - Fixed to match working single upload
  const startReviewingStatement = (statement: ProcessedStatement) => {
    setReviewingStatement(statement);
    if (statement.extractedData) {
      setReviewFormData({
        account_id: statement.extractedData.matched_account?.id.toString() || '',
        balance_date: statement.extractedData.statement_period_end || statement.extractedData.statement_date || '',
        balance_amount: statement.extractedData.ending_balance?.toString() || '',
        notes: `Auto-extracted from ${statement.extractedData.institution || 'PDF'} statement`
      });
    }
  };

  // Fixed save function to match working single upload API
  const saveReviewedStatement = async () => {
    if (!reviewingStatement || !reviewFormData.account_id || !reviewFormData.balance_amount || !reviewFormData.balance_date) {
      alert('Please fill in all required fields');
      return;
    }

    setIsReviewSaving(true);

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/portfolio/statements/${reviewingStatement.statement_id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: parseInt(reviewFormData.account_id),
          balance_date: reviewFormData.balance_date,
          balance_amount: parseFloat(reviewFormData.balance_amount),
          notes: reviewFormData.notes
        }),
      });

      if (response.ok) {
        // Mark statement as saved
        setProcessedStatements(prev => prev.map(stmt => 
          stmt.id === reviewingStatement.id 
            ? { ...stmt, status: 'completed' as const }
            : stmt
        ));
        setReviewingStatement(null);
        alert('Statement saved successfully!');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save statement');
      }
    } catch (error) {
      console.error('Error saving statement:', error);
      alert(`Error saving statement: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsReviewSaving(false);
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type === 'application/pdf') return <FileText className="w-5 h-5 text-red-400" />;
    if (file.type.startsWith('image/') || file.name.toLowerCase().endsWith('.heic')) {
      return <Image className="w-5 h-5 text-blue-400" />;
    }
    return <FileText className="w-5 h-5 text-gray-400" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'duplicate_warning': return <AlertTriangle className="h-5 w-5 text-yellow-400" />;
      case 'needs_review': return <AlertTriangle className="h-5 w-5 text-blue-400" />;
      case 'skipped': return <CheckCircle className="h-5 w-5 text-gray-400" />;
      case 'failed': return <AlertTriangle className="h-5 w-5 text-red-400" />;
      default: return <div className="h-5 w-5 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />;
    }
  };

  const processAllFiles = async () => {
    setIsProcessing(true);
    setCurrentStep('review');
    
    // Initialize processed statements
    const initialStatements: ProcessedStatement[] = selectedFiles.map((file, index) => ({
      id: `statement_${index}`,
      filename: file.name,
      fileType: file.type === 'application/pdf' ? 'pdf' : 'image',
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
        // Call your existing investment upload API
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${getApiBaseUrl()}/api/portfolio/statements/upload`, {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          
          let finalStatus: 'completed' | 'needs_review' | 'duplicate_warning' = 'completed';
          let duplicateInfo: {
            type: 'filename' | 'monthly';
            message: string;
            recommendation: string;
            existing_balance?: any;
            similarity_percentage?: number;
          } | undefined = undefined;
          
          if (result.extracted_data?.duplicate_checks) {
            const { filename_duplicate, monthly_duplicate } = result.extracted_data.duplicate_checks;
            
            // Check filename duplicate
            if (filename_duplicate.is_duplicate && filename_duplicate.recommendation !== 'auto_skip') {
              finalStatus = 'duplicate_warning';
              duplicateInfo = {
                type: 'filename' as const,
                message: filename_duplicate.message,
                recommendation: filename_duplicate.recommendation
              };
            }
            // Check monthly duplicate (takes priority over filename)
            else if (monthly_duplicate.is_duplicate && monthly_duplicate.recommendation !== 'auto_skip') {
              finalStatus = 'duplicate_warning';
              duplicateInfo = {
                type: 'monthly' as const,
                message: monthly_duplicate.message,
                recommendation: monthly_duplicate.recommendation,
                existing_balance: monthly_duplicate.existing_balance,
                similarity_percentage: monthly_duplicate.similarity_percentage
              };
            }
          }
          
          // Override with requires_review if needed
          if (result.requires_review) {
            finalStatus = 'needs_review';
          }
          
          setProcessedStatements(prev => prev.map(stmt => 
            stmt.id === `statement_${i}` 
              ? {
                  ...stmt,
                  status: finalStatus,
                  extractedData: result.extracted_data,
                  statement_id: result.statement_id,
                  relevant_page: result.relevant_page,
                  total_pages: result.total_pages,
                  duplicateInfo: duplicateInfo,
                  requiresReview: result.requires_review
                }
              : stmt
          ));
        } else {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Upload failed');
        }
      } catch (error) {
        // Update with error
        setProcessedStatements(prev => prev.map(stmt => 
          stmt.id === `statement_${i}` 
            ? { 
                ...stmt, 
                status: 'failed',
                error: error instanceof Error ? error.message : 'Processing failed'
              }
            : stmt
        ));
      }
    }

    setIsProcessing(false);
  };

  // Save all successful statements (quick save)
  const saveAllStatements = async () => {
    const successfulStatements = processedStatements.filter(stmt => 
      stmt.status === 'completed' && stmt.statement_id
    );

    try {
      // Save each statement using quick-save
      for (const statement of successfulStatements) {
        await fetch(`${getApiBaseUrl()}/api/portfolio/statements/${statement.statement_id}/quick-save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ confirm_duplicates: false }),
        });
      }

      setCurrentStep('summary');
    } catch (error) {
      console.error('Error saving statements:', error);
      alert('Error saving some statements. Please review individually.');
    }
  };

  // Render upload step
  const renderUploadStep = () => (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center">
        <button
          onClick={onBackToSelect}
          className="text-sm text-gray-400 hover:text-gray-300 transition-colors flex items-center gap-1"
        >
          ← Back to upload types
        </button>
      </div>

      {/* Manual Entry Button */}
      <div className="flex justify-between items-center">
        <div></div>
        <button
          onClick={handleManualEntry}
          className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Manual Entry
        </button>
      </div>

      {/* Upload Zone */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
          dragActive 
            ? 'border-teal-400 bg-teal-400/10' 
            : 'border-gray-600 hover:border-gray-500'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById('investment-file-input')?.click()}
      >
        <input
          id="investment-file-input"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.heic"
          multiple
          onChange={handleFileInput}
          className="hidden"
        />
        
        <div className="space-y-4">
          <div className="flex justify-center space-x-4">
            <div className="text-4xl">📄</div>
            <div className="text-4xl">📱</div>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Drop files here or click to browse
            </h3>
            <p className="text-gray-400">
              PDFs, JPG, PNG, HEIC • Multiple files supported • Max 25MB per file
            </p>
          </div>
        </div>
      </div>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Selected Files ({selectedFiles.length})</h3>
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  {getFileIcon(file)}
                  <div>
                    <div className="text-white font-medium">{file.name}</div>
                    <div className="text-gray-400 text-sm">{formatFileSize(file.size)}</div>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="text-gray-400 hover:text-red-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-center">
            <button
              onClick={processAllFiles}
              className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
            >
              Process {selectedFiles.length} File{selectedFiles.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )}

      {/* Manual Entry Modal */}
      {showManualEntry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-white mb-4">Add Manual Balance Entry</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Account</label>
                <select
                  value={reviewFormData.account_id}
                  onChange={(e) => setReviewFormData(prev => ({ ...prev, account_id: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                >
                  <option value="">Select account...</option>
                  {availableAccounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({account.institution})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Balance Date</label>
                <input
                  type="date"
                  value={reviewFormData.balance_date}
                  onChange={(e) => setReviewFormData(prev => ({ ...prev, balance_date: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Balance Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={reviewFormData.balance_amount}
                  onChange={(e) => setReviewFormData(prev => ({ ...prev, balance_amount: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Notes (Optional)</label>
                <textarea
                  value={reviewFormData.notes}
                  onChange={(e) => setReviewFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white h-20"
                  placeholder="Additional notes..."
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={saveManualEntry}
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
              >
                Save Entry
              </button>
              <button
                onClick={() => setShowManualEntry(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Review Extracted Data</h1>
          <p className="text-gray-300">Verify the information extracted from your statements</p>
          
          {/* NEW: Breadcrumb with back option */}
          <div className="flex items-center mt-2 text-sm">
            <button
              onClick={() => setCurrentStep('upload')}
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              ← Back to Upload
            </button>
            <span className="text-gray-400 mx-2">/</span>
            <span className="text-gray-300">Review Files</span>
          </div>
        </div>
        
        {!isProcessing && (
          <button
            onClick={saveAllStatements}
            disabled={processedStatements.filter(s => s.status === 'completed').length === 0}
            className="bg-teal-600 hover:bg-teal-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Quick Save All
          </button>
        )}
      </div>

      {/* NEW: Files summary */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-300">
            <span className="text-white font-medium">{processedStatements.length}</span> files uploaded • 
            <span className="text-green-400">{processedStatements.filter(s => s.status === 'completed').length}</span> ready • 
            <span className="text-yellow-400">{processedStatements.filter(s => s.status === 'duplicate_warning').length}</span> duplicates • 
            <span className="text-gray-400">{processedStatements.filter(s => s.status === 'skipped').length}</span> skipped
          </div>
          
          {/* NEW: Clear skipped files button */}
          {processedStatements.some(s => s.status === 'skipped') && (
            <button
              onClick={removeSkippedFiles}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Remove Skipped Files
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {processedStatements.map((statement) => (
          <div key={statement.id} className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {getFileIcon({ name: statement.filename, type: statement.fileType === 'pdf' ? 'application/pdf' : 'image/jpeg' } as File)}
                <div>
                  <h3 className="text-white font-medium">{statement.filename}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {statement.status === 'pending' && (
                      <span className="text-gray-400 text-sm">Waiting to process...</span>
                    )}
                    {statement.status === 'processing' && (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-400"></div>
                        <span className="text-teal-400 text-sm">Processing...</span>
                      </>
                    )}
                    {statement.status === 'completed' && (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-green-400 text-sm">
                          Processed ({statement.extractedData?.confidence_score ? (statement.extractedData.confidence_score * 100).toFixed(1) : 0}% confidence)
                        </span>
                      </>
                    )}
                    {statement.status === 'duplicate_warning' && (
                      <>
                        <AlertTriangle className="w-4 h-4 text-yellow-400" />
                        <span className="text-yellow-400 text-sm">Duplicate Warning</span>
                      </>
                    )}
                    {statement.status === 'needs_review' && (
                      <>
                        <AlertTriangle className="w-4 h-4 text-blue-400" />
                        <span className="text-blue-400 text-sm">Needs Review</span>
                      </>
                    )}
                    {statement.status === 'skipped' && (
                      <>
                        <CheckCircle className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-400 text-sm">Skipped</span>
                      </>
                    )}
                    {statement.status === 'failed' && (
                      <>
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        <span className="text-red-400 text-sm">Failed: {statement.error}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {(statement.status === 'completed' || statement.status === 'duplicate_warning' || statement.status === 'needs_review') && (
                <div className="flex gap-2">
                  {/* General action buttons */}
                  <button
                    onClick={() => startReviewingStatement(statement)}
                    className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                  >
                    <Edit className="w-3 h-3" />
                    {statement.status === 'duplicate_warning' || statement.status === 'needs_review' ? 'Manual Review' : 'Review'}
                  </button>
                  {statement.fileType === 'pdf' && statement.statement_id && (
                    <button
                      onClick={() => window.open(`${getApiBaseUrl()}/api/portfolio/statements/${statement.statement_id}/page-pdf`, '_blank')}
                      className="flex items-center gap-1 bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm transition-colors"
                    >
                      <Eye className="w-3 h-3" />
                      View PDF
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Show duplicate warning */}
            {statement.duplicateInfo && renderDuplicateWarning(statement)}

            {(statement.status === 'completed' || statement.status === 'duplicate_warning') && statement.extractedData && (
              <div className="mt-4 grid grid-cols-2 gap-6 pt-4 border-t border-gray-700">
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Extracted Information</h4>
                  <div className="space-y-1 text-sm">
                    {statement.extractedData.institution && (
                      <div><span className="text-gray-400">Institution:</span> <span className="text-white">{statement.extractedData.institution}</span></div>
                    )}
                    {statement.extractedData.ending_balance && (
                      <div><span className="text-gray-400">Balance:</span> <span className="text-white">${statement.extractedData.ending_balance.toLocaleString()}</span></div>
                    )}
                    {statement.extractedData.statement_period_end && (
                      <div><span className="text-gray-400">Date:</span> <span className="text-white">{statement.extractedData.statement_period_end}</span></div>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Account Match</h4>
                  <div className="text-sm">
                    {statement.extractedData.matched_account ? (
                      <div className="text-green-400">
                        ✓ Matched: {statement.extractedData.matched_account.name}
                      </div>
                    ) : (
                      <div className="text-yellow-400">
                        ⚠ No automatic match found
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Fixed Review Modal - Full Screen like single upload */}
      {reviewingStatement && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg w-full h-full max-w-7xl max-h-[95vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700 flex-shrink-0">
              <h3 className="text-xl font-bold text-white">Review: {reviewingStatement.filename}</h3>
              <button
                onClick={() => setReviewingStatement(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 p-6 min-h-0">
              {reviewingStatement.fileType === 'pdf' ? (
                // PDF Layout - Side by side like single upload
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
                  {/* PDF Viewer - 75% width */}
                  <div className="lg:col-span-3 border border-gray-600 rounded-lg flex flex-col">
                    <div className="p-4 border-b border-gray-600 bg-gray-900/50 flex-shrink-0">
                      <h5 className="text-white font-medium">Statement Preview</h5>
                      <p className="text-gray-400 text-sm">
                        Page {reviewingStatement.relevant_page || 1} of {reviewingStatement.total_pages || 1} • Key data detected
                      </p>
                    </div>
                    <div className="flex-1 min-h-0">
                      <iframe
                        src={`${getApiBaseUrl()}/api/portfolio/statements/${reviewingStatement.statement_id}/page-pdf#zoom=100`}
                        className="w-full h-full border-0"
                        title={`Statement Page ${reviewingStatement.relevant_page || 1}`}
                      />
                    </div>
                  </div>

                  {/* Review Form - 25% width */}
                  <div className="lg:col-span-1 flex flex-col">
                    <div className="bg-gray-900/50 rounded-lg p-4 flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-white font-medium">Extracted Data</h5>
                        <span className={`text-xs px-2 py-1 rounded ${
                          (reviewingStatement.extractedData?.confidence_score || 0) > 0.8 
                            ? 'bg-green-900/30 text-green-400' 
                            : 'bg-yellow-900/30 text-yellow-400'
                        }`}>
                          {((reviewingStatement.extractedData?.confidence_score || 0) * 100).toFixed(1)}% confidence
                        </span>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Account</label>
                          <select
                            value={reviewFormData.account_id}
                            onChange={(e) => setReviewFormData(prev => ({ ...prev, account_id: e.target.value }))}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                          >
                            <option value="">Select account...</option>
                            {availableAccounts.map(account => (
                              <option key={account.id} value={account.id}>
                                {account.name} ({account.institution})
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Balance Date</label>
                          <input
                            type="date"
                            value={reviewFormData.balance_date}
                            onChange={(e) => setReviewFormData(prev => ({ ...prev, balance_date: e.target.value }))}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Balance Amount</label>
                          <input
                            type="number"
                            step="0.01"
                            value={reviewFormData.balance_amount}
                            onChange={(e) => setReviewFormData(prev => ({ ...prev, balance_amount: e.target.value }))}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Notes</label>
                          <textarea
                            value={reviewFormData.notes}
                            onChange={(e) => setReviewFormData(prev => ({ ...prev, notes: e.target.value }))}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm h-20"
                          />
                        </div>
                      </div>
                      
                      <div className="flex gap-3 mt-6">
                        <button
                          onClick={saveReviewedStatement}
                          disabled={isReviewSaving}
                          className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-600 text-white py-2 px-4 rounded-lg font-medium transition-colors text-sm"
                        >
                          {isReviewSaving ? (
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            </div>
                          ) : (
                            'Save Statement'
                          )}
                        </button>
                        <button
                          onClick={() => setReviewingStatement(null)}
                          disabled={isReviewSaving}
                          className="flex-1 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-500 text-white py-2 px-4 rounded-lg font-medium transition-colors text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Image Layout - Center form since no PDF to show
                <div className="flex justify-center">
                  <div className="w-full max-w-md">
                    <div className="bg-gray-900/50 rounded-lg p-6">
                      <h5 className="text-white font-medium mb-4">Edit Information</h5>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Account</label>
                          <select
                            value={reviewFormData.account_id}
                            onChange={(e) => setReviewFormData(prev => ({ ...prev, account_id: e.target.value }))}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                          >
                            <option value="">Select account...</option>
                            {availableAccounts.map(account => (
                              <option key={account.id} value={account.id}>
                                {account.name} ({account.institution})
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Balance Date</label>
                          <input
                            type="date"
                            value={reviewFormData.balance_date}
                            onChange={(e) => setReviewFormData(prev => ({ ...prev, balance_date: e.target.value }))}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Balance Amount</label>
                          <input
                            type="number"
                            step="0.01"
                            value={reviewFormData.balance_amount}
                            onChange={(e) => setReviewFormData(prev => ({ ...prev, balance_amount: e.target.value }))}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Notes</label>
                          <textarea
                            value={reviewFormData.notes}
                            onChange={(e) => setReviewFormData(prev => ({ ...prev, notes: e.target.value }))}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white h-20"
                          />
                        </div>
                      </div>
                      
                      <div className="flex gap-3 mt-6">
                        <button
                          onClick={saveReviewedStatement}
                          disabled={isReviewSaving}
                          className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-600 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                        >
                          {isReviewSaving ? (
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            </div>
                          ) : (
                            'Save Statement'
                          )}
                        </button>
                        <button
                          onClick={() => setReviewingStatement(null)}
                          disabled={isReviewSaving}
                          className="flex-1 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-500 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Render summary step
  const renderSummaryStep = () => {
    const completedCount = processedStatements.filter(s => s.status === 'completed').length;
    const failedCount = processedStatements.filter(s => s.status === 'failed').length;
    const skippedCount = processedStatements.filter(s => s.status === 'skipped').length;

    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-3xl font-bold text-white mb-2">Upload Complete!</h1>
          <p className="text-gray-300">Your investment statements have been processed</p>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4">Summary</h3>
          <div className="grid grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-white">{processedStatements.length}</div>
              <div className="text-gray-400 text-sm">Files Uploaded</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">{completedCount}</div>
              <div className="text-gray-400 text-sm">Successfully Processed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-400">{skippedCount}</div>
              <div className="text-gray-400 text-sm">Skipped</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-400">{failedCount}</div>
              <div className="text-gray-400 text-sm">Failed</div>
            </div>
          </div>
        </div>

        {/* NEW: Show skipped files if any */}
        {skippedCount > 0 && (
          <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4">
            <h3 className="text-yellow-400 font-medium mb-2">Skipped Files ({skippedCount})</h3>
            <div className="space-y-1 text-sm">
              {processedStatements
                .filter(s => s.status === 'skipped')
                .map(statement => (
                  <div key={statement.id} className="text-gray-300">
                    • {statement.filename} 
                    {statement.duplicateInfo && (
                      <span className="text-yellow-400 ml-2">
                        ({statement.duplicateInfo.type} duplicate)
                      </span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className="flex justify-center gap-4">
          <button
            onClick={() => window.location.href = '/investments'}
            className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            View Investments
          </button>
          <button
            onClick={() => {
              setCurrentStep('upload');
              setSelectedFiles([]);
              setProcessedStatements([]);
            }}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Upload More Files
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto">
      {currentStep === 'upload' && renderUploadStep()}
      {currentStep === 'review' && renderReviewStep()}
      {currentStep === 'summary' && renderSummaryStep()}
    </div>
  );
}