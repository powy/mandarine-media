import React, { useState, useMemo } from 'react';
import { Season, SeasonCreate, SeasonUpdate, Program } from 'share';
import { DataTable } from '../../components/common/DataTable';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ColumnDef } from '@tanstack/react-table';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { useSeasonsList, useCreateSeason, useUpdateSeason, useDeleteSeason } from '../../hooks/useSeasons';
import { useProgramsList } from '../../hooks/usePrograms';

interface SeasonFormData {
  program_id: string;
  season_number: string;
}

const initialFormData: SeasonFormData = {
  program_id: '',
  season_number: '',
};

export const SeasonsPage = () => {
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [formData, setFormData] = useState<SeasonFormData>(initialFormData);
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const [seasonToDelete, setSeasonToDelete] = useState<Season | null>(null);

  // Filters
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');

  // API hooks
  const [page, setPage] = useState(1);
  const limit = 20;
  const { data: seasons = [], isLoading, error } = useSeasonsList({ 
    skip: (page - 1) * limit, 
    limit,
    program_id: selectedProgramId || undefined
  });

  // Load programs for dropdown
  const { data: programs = [] } = useProgramsList({ limit: 100 });

  const createMutation = useCreateSeason();
  const updateMutation = useUpdateSeason();
  const deleteMutation = useDeleteSeason();

  // Create a map for quick program lookup
  const programsMap = useMemo(() => {
    const map = new Map<string, Program>();
    programs.forEach(program => map.set(program.id, program));
    return map;
  }, [programs]);

  const handleCreateSeason = () => {
    setFormData(initialFormData);
    setIsCreateModalOpen(true);
  };

  const handleEditSeason = (season: Season) => {
    setEditingSeason(season);
    setFormData({
      program_id: season.program_id,
      season_number: season.season_number.toString(),
    });
    setIsEditModalOpen(true);
  };

  const handleDeleteSeason = (season: Season) => {
    setSeasonToDelete(season);
    setIsDeleteModalOpen(true);
  };

  const submitCreateSeason = async () => {
    if (!formData.program_id || !formData.season_number) {
      return;
    }

    const createData: SeasonCreate = {
      program_id: formData.program_id,
      season_number: parseInt(formData.season_number),
    };
    
    await createMutation.mutateAsync(createData);
    setIsCreateModalOpen(false);
  };

  const submitEditSeason = async () => {
    if (!editingSeason || !formData.season_number) {
      return;
    }

    const updateData: SeasonUpdate = {
      season_number: parseInt(formData.season_number),
    };
    
    await updateMutation.mutateAsync({ id: editingSeason.id, data: updateData });
    setIsEditModalOpen(false);
    setEditingSeason(null);
  };

  const confirmDeleteSeason = async () => {
    if (!seasonToDelete) return;

    await deleteMutation.mutateAsync(seasonToDelete.id);
    setIsDeleteModalOpen(false);
    setSeasonToDelete(null);
  };

  const columns = useMemo<ColumnDef<Season>[]>(() => [
    {
      accessorKey: 'program_id',
      header: 'Program',
      cell: ({ getValue }) => {
        const programId = getValue() as string;
        const program = programsMap.get(programId);
        return (
          <div className="font-medium text-gray-900">
            {program?.program_name || 'Unknown Program'}
          </div>
        );
      },
    },
    {
      accessorKey: 'season_number',
      header: 'Season Number',
      cell: ({ getValue }) => (
        <div className="font-medium text-gray-900">
          Season {getValue() as number}
        </div>
      ),
    },
    {
      accessorKey: 'creation_date_utc',
      header: 'Created',
      cell: ({ getValue }) => {
        const value = getValue() as string;
        return new Date(value).toLocaleDateString();
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const season = row.original;
        return (
          <div className="flex space-x-2">
            <button
              onClick={() => handleEditSeason(season)}
              className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
            >
              Edit
            </button>
            <button
              onClick={() => handleDeleteSeason(season)}
              className="text-red-600 hover:text-red-900 text-sm font-medium"
            >
              Delete
            </button>
          </div>
        );
      },
    },
  ], [programsMap]);

  const SeasonFormModal = ({ isOpen, onClose, onSubmit, title, isEdit = false }: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: () => void;
    title: string;
    isEdit?: boolean;
  }) => {
    const isSubmitting = isEdit ? updateMutation.isPending : createMutation.isPending;

    return (
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={onClose}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 mb-4">
                    {title}
                  </Dialog.Title>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Program *
                      </label>
                      <select
                        value={formData.program_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, program_id: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        required
                        disabled={isEdit} // Don't allow changing program on edit
                      >
                        <option value="">Select a program</option>
                        {programs.map(program => (
                          <option key={program.id} value={program.id}>
                            {program.program_name}
                          </option>
                        ))}
                      </select>
                      {isEdit && (
                        <p className="text-xs text-gray-500 mt-1">
                          Program cannot be changed after creation
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Season Number *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.season_number}
                        onChange={(e) => setFormData(prev => ({ ...prev, season_number: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="1"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Season numbers must be unique within each program
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex space-x-3 justify-end">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={isSubmitting}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={onSubmit}
                      disabled={isSubmitting || !formData.program_id || !formData.season_number}
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      {isSubmitting ? 'Saving...' : (isEdit ? 'Update Season' : 'Create Season')}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    );
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="text-sm font-medium text-red-800">Error Loading Seasons</h3>
          <p className="text-sm text-red-700 mt-1">
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px' 
      }}>
        <h1 style={{ margin: 0, color: '#1f2937' }}>Seasons Management</h1>
        <button
          onClick={handleCreateSeason}
          style={{
            padding: '12px 24px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          Create New Season
        </button>
      </div>

      {/* Filter by Program */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Filter by Program
        </label>
        <select
          value={selectedProgramId}
          onChange={(e) => {
            setSelectedProgramId(e.target.value);
            setPage(1); // Reset to first page when filtering
          }}
          className="max-w-sm px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">All programs</option>
          {programs.map(program => (
            <option key={program.id} value={program.id}>
              {program.program_name}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        data={seasons}
        columns={columns}
        loading={isLoading}
        searchPlaceholder="Search seasons..."
        pagination={{
          page,
          limit,
          total: seasons.length,
          onPageChange: setPage,
        }}
        emptyMessage={selectedProgramId ? "No seasons found for this program" : "No seasons found"}
      />

      {/* Create Season Modal */}
      <SeasonFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={submitCreateSeason}
        title="Create New Season"
      />

      {/* Edit Season Modal */}
      <SeasonFormModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingSeason(null);
        }}
        onSubmit={submitEditSeason}
        title="Edit Season"
        isEdit={true}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSeasonToDelete(null);
        }}
        onConfirm={confirmDeleteSeason}
        title="Delete Season"
        message={`Are you sure you want to delete Season ${seasonToDelete?.season_number} of "${programsMap.get(seasonToDelete?.program_id || '')?.program_name}"? This action cannot be undone and may affect related episodes.`}
        confirmText="Delete Season"
        type="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  );
};