// finance-dashboard/src/pages/UploadView.tsx (Updated)
import React, { useState, useEffect } from 'react';
import { Upload, FileText, TrendingUp, Building2, CheckCircle, AlertTriangle } from 'lucide-react';
import { useFileUpload } from '../hooks/useUploadData';
import FileUploadZone from '../components/upload/FileUploadZone';
import TransactionReview from '../components/upload/TransactionReview';
import UploadSummary from '../components/upload/UploadSummary';
import MultiFileInvestmentUpload from '../components/upload/MultiFileInvestmentUpload';
import MultiBankStatementUpload from '../components/upload/MultiBankStatementUpload';
import { CategoryUpdate } from '../types/api';
import PageHeader from '../components/layout/PageHeader';

type UploadType = 'transactions' | 'investments' | 'bank' | null;
type UploadStep = 'select' | 'upload' | 'review' | 'summary';

interface UploadTypeConfig {
  title: string;
  description: string;
  features: string[];
  icon: React.ComponentType<any>;
  acceptedFiles: string;
  formats: string;
  buttonText: string;
  color: 'blue' | 'green' | 'orange';
}

const uploadConfigs: Record<string, UploadTypeConfig> = {
  transactions: {
    title: 'Transaction Files',
    description: 'Upload CSV files from your bank to import and categorize transactions automatically.',
    features: [
      'Automatic categorization',
      'Duplicate detection', 
      'Review before saving'
    ],
    icon: FileText,
    acceptedFiles: '.csv',
    formats: 'CSV',
    buttonText: 'Select Transaction Upload',
    color: 'blue'
  },
  investments: {
    title: 'Investment Statements',
    description: 'Upload PDF statements and images from Wealthfront, Schwab, Acorns, and other investment accounts.',
    features: [
      'Multi-file support',
      'PDF & image OCR',
      'Batch processing'
    ],
    icon: TrendingUp,
    acceptedFiles: '.pdf,.jpg,.jpeg,.png,.heic',
    formats: 'PDF, JPG, PNG, HEIC',
    buttonText: 'Select Investment Upload',
    color: 'green'
  },
  bank: {
    title: 'Bank Statements',
    description: 'Upload bank statements from major banks to track account balances and cash flow.',
    features: [
      'Balance extraction',
      'Deposit/withdrawal tracking',
      'Cash flow analysis'
    ],
    icon: Building2,
    acceptedFiles: '.pdf',
    formats: 'PDF',
    buttonText: 'Select Bank Upload',
    color: 'orange'
  }
};

export default function UnifiedUploadView() {
  const [uploadType, setUploadType] = useState<UploadType>(null);
  const [currentStep, setCurrentStep] = useState<UploadStep>('select');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const {
    isLoading,
    previewData,
    confirmData,
    error,
    uploadPreview,
    confirmUpload,
    reset
  } = useFileUpload();

  // Check for pre-selected type from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const typeParam = urlParams.get('type') as UploadType;
    if (typeParam && uploadConfigs[typeParam]) {
      setUploadType(typeParam);
      setCurrentStep('upload');
    }
  }, []);

  const handleTypeSelection = (type: UploadType) => {
    setUploadType(type);
    setCurrentStep('upload');
    reset(); // Clear any previous upload state
  };

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles(files);
  };

  const handleStartUpload = () => {
    if (selectedFiles.length === 0 || !uploadType) return;
    
    if (uploadType === 'transactions') {
      // Use existing transaction upload flow
      uploadPreview(selectedFiles);
    }
  };

  // Watch for preview data to change steps
  useEffect(() => {
    if (previewData?.data) {
      if (previewData.data.requires_review) {
        setCurrentStep('review');
      } else {
        // Auto-confirm if no review needed
        confirmUpload({
          session_id: previewData.data.session_id,
          category_updates: []
        });
      }
    }
  }, [previewData, confirmUpload]);

  // Watch for confirm data to go to summary
  useEffect(() => {
    if (confirmData?.data) {
      setCurrentStep('summary');
    }
  }, [confirmData]);

  const handleCategoryUpdates = (updates: CategoryUpdate[]) => {
    if (!previewData?.data.session_id) return;

    confirmUpload({
      session_id: previewData.data.session_id,
      category_updates: updates
    });
  };

  const handleSkipReview = () => {
    if (!previewData?.data.session_id) return;

    confirmUpload({
      session_id: previewData.data.session_id,
      category_updates: []
    });
  };

  const handleBackToSelect = () => {
    setUploadType(null);
    setCurrentStep('select');
    setSelectedFiles([]);
    reset();
  };

  const handleUploadMore = () => {
    setCurrentStep('upload');
    setSelectedFiles([]);
    reset();
  };

  const handleViewMonthly = () => {
    // Navigate to monthly view - you can replace this with proper navigation
    window.location.href = '/monthly';
  };

  const getColorClasses = (color: 'blue' | 'green' | 'orange', variant: 'background' | 'border' | 'text' | 'button') => {
    const colorMap = {
      blue: {
        background: 'from-blue-600 to-blue-700',
        border: 'border-blue-500',
        text: 'text-blue-400',
        button: 'bg-blue-600 hover:bg-blue-700'
      },
      green: {
        background: 'from-green-600 to-green-700',
        border: 'border-green-500',
        text: 'text-green-400',
        button: 'bg-green-600 hover:bg-green-700'
      },
      orange: {
        background: 'from-orange-600 to-orange-700',
        border: 'border-orange-500',
        text: 'text-orange-400',
        button: 'bg-orange-600 hover:bg-orange-700'
      }
    };
    return colorMap[color][variant];
  };

  const renderTypeSelection = () => (
    <div className="space-y-8">
        <PageHeader
          title="Upload Center"
          subtitle="Choose your upload type below to get started"
        />

      {/* Upload Type Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(uploadConfigs).map(([key, config]) => {
          const IconComponent = config.icon;
          return (
            <div
              key={key}
              className="bg-gray-800 border-2 border-gray-700 rounded-2xl p-6 hover:border-teal-500 transition-all duration-300 hover:transform hover:-translate-y-1 cursor-pointer group"
              onClick={() => handleTypeSelection(key as UploadType)}
            >
              <div className="space-y-4">
                {/* Icon */}
                <div className={`w-12 h-12 bg-gradient-to-r ${getColorClasses(config.color, 'background')} rounded-xl flex items-center justify-center`}>
                  <IconComponent className="w-6 h-6 text-white" />
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">{config.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{config.description}</p>
                </div>

                {/* Features */}
                <div className="space-y-2">
                  {config.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <span className="text-gray-300 text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Button */}
                <button className={`w-full py-3 px-4 ${getColorClasses(config.color, 'button')} text-white rounded-lg font-medium transition-colors group-hover:scale-105 transition-transform`}>
                  {config.buttonText}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderTransactionUploadZone = () => {
    const config = uploadConfigs['transactions'];
    
    return (
      <div className="space-y-6">
        <div className="space-y-6">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center">
            <button
              onClick={handleBackToSelect}
              className="text-sm text-gray-400 hover:text-gray-300 transition-colors flex items-center gap-1"
            >
              ← Back to upload types
            </button>
          </div>
          
          {/* Page Header */}
          <div>
            <h1 className="text-3xl font-bold text-white">{config.title} Upload</h1>
            <p className="text-gray-300 mt-2">{config.description}</p>
          </div>
        </div>

        {/* Upload Zone */}
        <FileUploadZone
          onFilesSelected={handleFilesSelected}
          isLoading={isLoading}
          error={error?.message || null}
        />

        {/* Start Upload Button */}
        {selectedFiles.length > 0 && !isLoading && (
          <div className="flex justify-center">
            <button
              onClick={handleStartUpload}
              className="flex items-center gap-2 px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors"
            >
              <Upload className="w-5 h-5" />
              Process {selectedFiles.length} File{selectedFiles.length !== 1 ? 's' : ''}
            </button>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span className="text-red-400 font-medium">Upload Error</span>
            </div>
            <p className="text-red-300 mt-2">{error?.message || 'An error occurred during upload'}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto">
      {currentStep === 'select' && renderTypeSelection()}
      
      {currentStep === 'upload' && uploadType === 'transactions' && renderTransactionUploadZone()}
      {currentStep === 'upload' && uploadType === 'investments' && (
        <MultiFileInvestmentUpload onBackToSelect={handleBackToSelect} />
      )}
      {currentStep === 'upload' && uploadType === 'bank' && (
        <MultiBankStatementUpload onBackToSelect={handleBackToSelect} />
      )}
      
      {currentStep === 'review' && uploadType === 'transactions' && previewData && (
        <TransactionReview
          transactions={previewData.data.misc_transactions}
          onCategoryUpdates={handleCategoryUpdates}
          onSkip={handleSkipReview}
        />
      )}
      
      {currentStep === 'summary' && uploadType === 'transactions' && confirmData && (
        <UploadSummary
          summary={confirmData.data}
          onViewMonthly={handleViewMonthly}
          onUploadMore={handleUploadMore}
        />
      )}
      
      {/* Loading overlay for transactions only */}
      {isLoading && uploadType === 'transactions' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-8 max-w-md mx-4">
            <div className="flex items-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400"></div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {currentStep === 'upload' ? 'Processing Files...' : 'Saving Transactions...'}
                </h3>
                <p className="text-gray-400 text-sm mt-1">
                  {currentStep === 'upload' 
                    ? 'Analyzing transactions and detecting categories' 
                    : 'Updating your financial data'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}