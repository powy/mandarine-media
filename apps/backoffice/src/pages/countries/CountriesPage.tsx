import React, { useState, useMemo } from 'react';
import { Country, CountryCreate, CountryUpdate } from 'share';
import { DataTable } from '../../components/common/DataTable';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ColumnDef } from '@tanstack/react-table';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { useCountriesList, useCreateCountry, useUpdateCountry, useDeleteCountry } from '../../hooks/useCountries';

interface CountryFormData {
  name: string;
}

const initialFormData: CountryFormData = {
  name: '',
};

export const CountriesPage = () => {
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [formData, setFormData] = useState<CountryFormData>(initialFormData);
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [countryToDelete, setCountryToDelete] = useState<Country | null>(null);

  // API hooks
  const { data: countries = [], isLoading, error } = useCountriesList();

  const createMutation = useCreateCountry();
  const updateMutation = useUpdateCountry();
  const deleteMutation = useDeleteCountry();

  const handleCreateCountry = () => {
    setFormData(initialFormData);
    setIsCreateModalOpen(true);
  };

  const handleEditCountry = (country: Country) => {
    setEditingCountry(country);
    setFormData({
      name: country.name,
    });
    setIsEditModalOpen(true);
  };

  const handleDeleteCountry = (country: Country) => {
    setCountryToDelete(country);
    setIsDeleteModalOpen(true);
  };

  const submitCreateCountry = async () => {
    if (!formData.name.trim()) {
      return;
    }

    const createData: CountryCreate = {
      name: formData.name.trim(),
    };
    
    await createMutation.mutateAsync(createData);
    setIsCreateModalOpen(false);
  };

  const submitEditCountry = async () => {
    if (!editingCountry || !formData.name.trim()) {
      return;
    }

    const updateData: CountryUpdate = {
      name: formData.name.trim(),
    };
    
    await updateMutation.mutateAsync({ id: editingCountry.id, data: updateData });
    setIsEditModalOpen(false);
    setEditingCountry(null);
  };

  const confirmDeleteCountry = async () => {
    if (!countryToDelete) return;

    await deleteMutation.mutateAsync(countryToDelete.id);
    setIsDeleteModalOpen(false);
    setCountryToDelete(null);
  };

  const columns = useMemo<ColumnDef<Country>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Country Name',
      cell: ({ getValue }) => (
        <div className="font-medium text-gray-900">
          {getValue() as string}
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
        const country = row.original;
        return (
          <div className="flex space-x-2">
            <button
              onClick={() => handleEditCountry(country)}
              className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
            >
              Edit
            </button>
            <button
              onClick={() => handleDeleteCountry(country)}
              className="text-red-600 hover:text-red-900 text-sm font-medium"
            >
              Delete
            </button>
          </div>
        );
      },
    },
  ], []);

  const CountryFormModal = ({ isOpen, onClose, onSubmit, title, isEdit = false }: {
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
                        Country Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Enter country name"
                        required
                      />
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
                      {isSubmitting ? 'Saving...' : (isEdit ? 'Update Country' : 'Create Country')}
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
          <h3 className="text-sm font-medium text-red-800">Error Loading Countries</h3>
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
        <h1 style={{ margin: 0, color: '#1f2937' }}>Countries Management</h1>
        <button
          onClick={handleCreateCountry}
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
          Create New Country
        </button>
      </div>

      <DataTable
        data={countries}
        columns={columns}
        loading={isLoading}
        searchPlaceholder="Search countries..."
      />

      {/* Create Country Modal */}
      <CountryFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={submitCreateCountry}
        title="Create New Country"
      />

      {/* Edit Country Modal */}
      <CountryFormModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingCountry(null);
        }}
        onSubmit={submitEditCountry}
        title="Edit Country"
        isEdit={true}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setCountryToDelete(null);
        }}
        onConfirm={confirmDeleteCountry}
        title="Delete Country"
        message={`Are you sure you want to delete "${countryToDelete?.name}"? This action cannot be undone and may affect related territories and content.`}
        confirmText="Delete Country"
        type="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  );
};