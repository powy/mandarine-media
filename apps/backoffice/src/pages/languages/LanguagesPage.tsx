import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Language } from 'share';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/common/DataTable';
import { useLanguagesList, useDeleteLanguage } from '../../hooks/useLanguages';
import { formatDate } from '../../utils/formatters';
import { PlusIcon } from '@heroicons/react/24/outline';

export const LanguagesPage = () => {
  const navigate = useNavigate();
  const { data: languages = [], isLoading, error } = useLanguagesList();
  
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
      accessorKey: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'sigle',
      header: 'Code',
    },
    {
      accessorKey: 'creation_date_utc',
      header: 'Created',
      cell: ({ getValue }: any) => formatDate(getValue() as string),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }: any) => {
        const language = row.original;
        return (
          <div className="flex space-x-2">
            <button
              onClick={() => handleEdit(language)}
              className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
            >
              Edit
            </button>
            <button
              onClick={() => handleDelete(language)}
              className="text-red-600 hover:text-red-900 text-sm font-medium"
            >
              Delete
            </button>
          </div>
        );
      },
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
      />
    </div>
  );
};