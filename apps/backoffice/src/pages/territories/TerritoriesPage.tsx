import React, { useState, useMemo } from 'react';
import { Territory, TerritoryCreate, TerritoryUpdate, Country } from 'share';
import { DataTable } from '../../components/common/DataTable';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ColumnDef } from '@tanstack/react-table';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { useTerritoriesList, useCreateTerritory, useUpdateTerritory, useDeleteTerritory } from '../../hooks/useTerritories';
import { useCountriesList } from '../../hooks/useCountries';

interface TerritoryFormData {
  name: string;
  country_id: string;
}

const initialFormData: TerritoryFormData = {
  name: '',
  country_id: '',
};

export const TerritoriesPage = () => {
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [formData, setFormData] = useState<TerritoryFormData>(initialFormData);
  const [editingTerritory, setEditingTerritory] = useState<Territory | null>(null);
  const [territoryToDelete, setTerritoryToDelete] = useState<Territory | null>(null);

  // API hooks
  const [page, setPage] = useState(1);
  const limit = 20;
  const { data: territories = [], isLoading, error } = useTerritoriesList({ 
    skip: (page - 1) * limit, 
    limit 
  });

  // Load countries for dropdown
  const { data: countries = [] } = useCountriesList({ limit: 100 });

  const createMutation = useCreateTerritory();
  const updateMutation = useUpdateTerritory();
  const deleteMutation = useDeleteTerritory();

  // Create a map for quick country lookup
  const countriesMap = useMemo(() => {
    const map = new Map<string, Country>();
    countries.forEach(country => map.set(country.id, country));
    return map;
  }, [countries]);

  const handleCreateTerritory = () => {
    setFormData(initialFormData);
    setIsCreateModalOpen(true);
  };

  const handleEditTerritory = (territory: Territory) => {
    setEditingTerritory(territory);
    setFormData({
      name: territory.name,
      country_id: territory.country_id || '',
    });
    setIsEditModalOpen(true);
  };

  const handleDeleteTerritory = (territory: Territory) => {
    setTerritoryToDelete(territory);
    setIsDeleteModalOpen(true);
  };

  const submitCreateTerritory = async () => {
    if (!formData.name.trim()) {
      return;
    }

    const createData: TerritoryCreate = {
      name: formData.name.trim(),
      country_id: formData.country_id || undefined,
    };
    
    await createMutation.mutateAsync(createData);
    setIsCreateModalOpen(false);
  };

  const submitEditTerritory = async () => {
    if (!editingTerritory || !formData.name.trim()) {
      return;
    }

    const updateData: TerritoryUpdate = {
      name: formData.name.trim(),
      country_id: formData.country_id || undefined,
    };
    
    await updateMutation.mutateAsync({ id: editingTerritory.id, data: updateData });
    setIsEditModalOpen(false);
    setEditingTerritory(null);
  };

  const confirmDeleteTerritory = async () => {
    if (!territoryToDelete) return;

    await deleteMutation.mutateAsync(territoryToDelete.id);
    setIsDeleteModalOpen(false);
    setTerritoryToDelete(null);
  };

  const columns = useMemo<ColumnDef<Territory>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Territory Name',
      cell: ({ getValue }) => (
        <div className="font-medium text-gray-900">
          {getValue() as string}
        </div>
      ),
    },
    {
      accessorKey: 'country_id',
      header: 'Country',
      cell: ({ getValue }) => {
        const countryId = getValue() as string;
        if (!countryId) {
          return <span className="text-gray-500 italic">No country assigned</span>;
        }
        const country = countriesMap.get(countryId);
        return (
          <div className="text-gray-900">
            {country?.name || 'Unknown Country'}
          </div>
        );
      },
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
        const territory = row.original;
        return (
          <div className="flex space-x-2">
            <button
              onClick={() => handleEditTerritory(territory)}
              className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
            >
              Edit
            </button>
            <button
              onClick={() => handleDeleteTerritory(territory)}
              className="text-red-600 hover:text-red-900 text-sm font-medium"
            >
              Delete
            </button>
          </div>
        );
      },
    },
  ], [countriesMap]);

  const TerritoryFormModal = ({ isOpen, onClose, onSubmit, title, isEdit = false }: {
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
                        Territory Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Enter territory name"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Country (Optional)
                      </label>
                      <select
                        value={formData.country_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, country_id: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="">No country assigned</option>
                        {countries.map(country => (
                          <option key={country.id} value={country.id}>
                            {country.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Territories can exist without being assigned to a specific country
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
                      disabled={isSubmitting || !formData.name.trim()}
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      {isSubmitting ? 'Saving...' : (isEdit ? 'Update Territory' : 'Create Territory')}
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
          <h3 className="text-sm font-medium text-red-800">Error Loading Territories</h3>
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
        <h1 style={{ margin: 0, color: '#1f2937' }}>Territories Management</h1>
        <button
          onClick={handleCreateTerritory}
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
          Create New Territory
        </button>
      </div>

      <DataTable
        data={territories}
        columns={columns}
        loading={isLoading}
        searchPlaceholder="Search territories..."
        pagination={{
          page,
          limit,
          total: territories.length,
          onPageChange: setPage,
        }}
        emptyMessage="No territories found"
      />

      {/* Create Territory Modal */}
      <TerritoryFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={submitCreateTerritory}
        title="Create New Territory"
      />

      {/* Edit Territory Modal */}
      <TerritoryFormModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingTerritory(null);
        }}
        onSubmit={submitEditTerritory}
        title="Edit Territory"
        isEdit={true}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setTerritoryToDelete(null);
        }}
        onConfirm={confirmDeleteTerritory}
        title="Delete Territory"
        message={`Are you sure you want to delete "${territoryToDelete?.name}"? This action cannot be undone and may affect content distribution rights.`}
        confirmText="Delete Territory"
        type="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  );
};