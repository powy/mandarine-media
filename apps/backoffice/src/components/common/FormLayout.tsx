import { ReactNode } from 'react';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';

interface FormLayoutProps {
  title: string;
  subtitle?: string;
  loading?: boolean;
  onSave?: () => void;
  onCancel?: () => void;
  backPath?: string;
  saveText?: string;
  cancelText?: string;
  children: ReactNode;
  saveDisabled?: boolean;
}

export const FormLayout = ({
  title,
  subtitle,
  loading = false,
  onSave,
  onCancel,
  backPath,
  saveText = 'Save',
  cancelText = 'Cancel',
  children,
  saveDisabled = false,
}: FormLayoutProps) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backPath) {
      navigate(backPath);
    } else if (onCancel) {
      onCancel();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={handleBack}
          className="flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Back
        </button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {subtitle && (
              <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleBack}
              disabled={loading}
              className="btn btn-purple disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelText}
            </button>
            {onSave && (
              <button
                type="button"
                onClick={onSave}
                disabled={loading || saveDisabled}
                className={clsx(
                  'btn btn-success disabled:opacity-50 disabled:cursor-not-allowed',
                  loading && 'relative'
                )}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </div>
                ) : (
                  saveText
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="card p-6">
        {children}
      </div>
    </div>
  );
};