import { ReactNode } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  onCreateNew?: () => void;
  createNewText?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: any;
  };
  backPath?: string;
  children?: ReactNode;
}

export const PageHeader = ({
  title,
  subtitle,
  description,
  onCreateNew,
  createNewText = 'Create New',
  action,
  backPath,
  children,
}: PageHeaderProps) => {
  return (
    <div className="mb-8">
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          )}
          {description && (
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          )}
        </div>
        
        <div className="mt-4 md:mt-0 md:ml-4 flex items-center space-x-3">
          {children}
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className="btn btn-primary flex items-center"
            >
              {action.icon && <action.icon className="w-4 h-4 mr-2" />}
              {action.label}
            </button>
          )}
          {onCreateNew && (
            <button
              type="button"
              onClick={onCreateNew}
              className="btn btn-primary flex items-center"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              {createNewText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};