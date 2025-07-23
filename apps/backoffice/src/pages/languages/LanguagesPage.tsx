import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Language } from 'share';
import { PageHeader, DataTable } from '@/components/common';
import { useLanguagesList, useDeleteLanguage } from '@/hooks/useLanguages';
import { formatDate } from '@/utils/formatters';
import { PlusIcon } from '@heroicons/react/24/outline';

export const LanguagesPage = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  
  const { data: languages = [], isLoading, error } = useLanguagesList({ 
    skip: (page - 1) * limit, 
    limit 
  });
  
  const deleteMutation = useDeleteLanguage();

  const handleCreate = () => {
    navigate('/languages/new');
  };

  const handleEdit = (language: Language) => {
    navigate(`/languages/${language.id}/edit`);
  };

  const handleDelete = async (language: Language) => {
    if (window.confirm(`Are you sure you want to delete "${language.name}"?`)) {
      await deleteMutation.mutateAsync(language.id);
    }
  };

  const columns = [
    {
      header: 'Name',
      accessor: 'name' as keyof Language,
      sortable: true,
    },
    {
      header: 'Code',
      accessor: 'sigle' as keyof Language,
      sortable: true,
    },
    {
      header: 'Created',
      accessor: 'creation_date_utc' as keyof Language,
      render: (value: string) => formatDate(value),
    },
  ];

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="text-sm font-medium text-red-800">Error Loading Languages</h3>
          <p className="text-sm text-red-700 mt-1">
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Languages"
        subtitle="Manage languages and localization"
        action={{
          label: 'Create Language',
          onClick: handleCreate,
          icon: PlusIcon,
        }}
      />

      <DataTable
        data={languages}
        columns={columns}
        loading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        pagination={{
          page,
          limit,
          total: languages.length,
          onPageChange: setPage,
        }}
        emptyMessage="No languages found"
      />
    </div>
  );
};