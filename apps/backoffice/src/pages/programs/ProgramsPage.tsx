import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Program } from 'share';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/common/DataTable';
import { useProgramsList, useDeleteProgram } from '../../hooks/usePrograms';
import { formatDate } from '../../utils/formatters';
import { PlusIcon } from '@heroicons/react/24/outline';

export const ProgramsPage = () => {
  const navigate = useNavigate();
  const { data: programs = [], isLoading, error } = useProgramsList();
  
  const deleteMutation = useDeleteProgram();

  const handleCreate = () => {
    navigate('/programs/new');
  };

  const handleEdit = (program: Program) => {
    navigate(`/programs/${program.id}/edit`);
  };

  const handleDelete = async (program: Program) => {
    if (window.confirm(`Are you sure you want to delete "${program.program_name}"?`)) {
      await deleteMutation.mutateAsync(program.id);
    }
  };

  const columns = [
    {
      header: 'Program Name',
      accessor: 'program_name' as keyof Program,
      sortable: true,
    },
    {
      header: 'Description',
      accessor: 'general_media_description' as keyof Program,
      render: (value: string) => value || 'No description',
    },
    {
      header: 'Created',
      accessor: 'creation_date_utc' as keyof Program,
      render: (value: string) => formatDate(value),
    },
  ];

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="text-sm font-medium text-red-800">Error Loading Programs</h3>
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
        title="Programs"
        subtitle="Manage programs and shows"
        action={{
          label: 'Create Program',
          onClick: handleCreate,
          icon: PlusIcon,
        }}
      />

      <DataTable
        data={programs}
        columns={columns}
        loading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        emptyMessage="No programs found"
      />
    </div>
  );
};