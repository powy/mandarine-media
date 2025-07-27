import React, { useState, useEffect, useMemo } from 'react';
import { programsApi } from 'share';
import { DataTable } from '../../components/common/DataTable';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ColumnDef } from '@tanstack/react-table';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';

interface Program {
  id: string;
  creation_date_utc: string;
  program_name: string;
  general_media_description?: string;
}

interface ProgramFormData {
  program_name: string;
  general_media_description: string;
}

const initialFormData: ProgramFormData = {
  program_name: '',
  general_media_description: '',
};

export default function ProgramsManagementPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [formData, setFormData] = useState<ProgramFormData>(initialFormData);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [programToDelete, setProgramToDelete] = useState<Program | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      const response = await programsApi.getAll({ limit: 100 });
      setPrograms(response || []);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load programs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleCreateProgram = () => {
    setFormData(initialFormData);
    setIsCreateModalOpen(true);
  };

  const handleEditProgram = (program: Program) => {
    setEditingProgram(program);
    setFormData({
      program_name: program.program_name,
      general_media_description: program.general_media_description || '',
    });
    setIsEditModalOpen(true);
  };

  const handleDeleteProgram = (program: Program) => {
    setProgramToDelete(program);
    setIsDeleteModalOpen(true);
  };

  const submitCreateProgram = async () => {
    if (!formData.program_name.trim()) {
      showNotification('error', 'Program name is required');
      return;
    }

    try {
      setFormSubmitting(true);
      const createData = {
        program_name: formData.program_name.trim(),
        general_media_description: formData.general_media_description.trim() || undefined,
      };
      
      await programsApi.create(createData);
      setIsCreateModalOpen(false);
      await fetchPrograms();
      showNotification('success', 'Program created successfully');
    } catch (err: any) {
      showNotification('error', err.response?.data?.detail || 'Failed to create program');
    } finally {
      setFormSubmitting(false);
    }
  };

  const submitEditProgram = async () => {
    if (!editingProgram || !formData.program_name.trim()) {
      showNotification('error', 'Program name is required');
      return;
    }

    try {
      setFormSubmitting(true);
      const updateData = {
        program_name: formData.program_name.trim(),
        general_media_description: formData.general_media_description.trim() || undefined,
      };
      
      await programsApi.update(editingProgram.id, updateData);
      setIsEditModalOpen(false);
      setEditingProgram(null);
      await fetchPrograms();
      showNotification('success', 'Program updated successfully');
    } catch (err: any) {
      showNotification('error', err.response?.data?.detail || 'Failed to update program');
    } finally {
      setFormSubmitting(false);
    }
  };

  const confirmDeleteProgram = async () => {
    if (!programToDelete) return;

    try {
      setFormSubmitting(true);
      await programsApi.delete(programToDelete.id);
      setIsDeleteModalOpen(false);
      setProgramToDelete(null);
      await fetchPrograms();
      showNotification('success', 'Program deleted successfully');
    } catch (err: any) {
      showNotification('error', err.response?.data?.detail || 'Failed to delete program');
    } finally {
      setFormSubmitting(false);
    }
  };

  const columns = useMemo<ColumnDef<Program>[]>(() => [
    {
      accessorKey: 'program_name',
      header: 'Program Name',
      cell: ({ getValue }) => (
        <div className="font-medium text-gray-900">
          {getValue() || 'N/A'}
        </div>
      ),
    },
    {
      accessorKey: 'general_media_description',
      header: 'Description',
      cell: ({ getValue }) => {
        const value = getValue() as string;
        return (
          <div className="max-w-xs truncate text-gray-500" title={value}>
            {value || 'No description'}
          </div>
        );
      },
    },
    {
      accessorKey: 'creation_date_utc',
      header: 'Created',
      cell: ({ getValue }) => {
        const value = getValue() as string;
        return value ? new Date(value).toLocaleDateString() : 'N/A';
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const program = row.original;
        return (
          <div className="flex space-x-2">
            <button
              onClick={() => handleEditProgram(program)}
              className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
            >
              Edit
            </button>
            <button
              onClick={() => handleDeleteProgram(program)}
              className="text-red-600 hover:text-red-900 text-sm font-medium"
            >
              Delete
            </button>
          </div>
        );
      },
    },
  ], []);

  const ProgramFormModal = ({ isOpen, onClose, onSubmit, title, isEdit = false }: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: () => void;
    title: string;
    isEdit?: boolean;
  }) => (
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
                      Program Name *
                    </label>
                    <input
                      type="text"
                      value={formData.program_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, program_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Enter program name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.general_media_description}
                      onChange={(e) => setFormData(prev => ({ ...prev, general_media_description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Enter program description (optional)"
                    />
                  </div>
                </div>

                <div className="mt-6 flex space-x-3 justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={formSubmitting}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={onSubmit}
                    disabled={formSubmitting || !formData.program_name.trim()}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {formSubmitting ? 'Saving...' : (isEdit ? 'Update Program' : 'Create Program')}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px' 
      }}>
        <h1 style={{ margin: 0, color: '#1f2937' }}>Programs Management</h1>
        <button
          onClick={handleCreateProgram}
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
          Create New Program
        </button>
      </div>

      {notification && (
        <div style={{ 
          padding: '12px', 
          backgroundColor: notification.type === 'success' ? '#f0f9ff' : '#fef2f2', 
          color: notification.type === 'success' ? '#1e40af' : '#dc2626', 
          borderRadius: '6px', 
          marginBottom: '20px',
          border: `1px solid ${notification.type === 'success' ? '#bfdbfe' : '#fecaca'}`
        }}>
          {notification.message}
        </div>
      )}

      {error && (
        <div style={{ 
          padding: '12px', 
          backgroundColor: '#fef2f2', 
          color: '#dc2626', 
          borderRadius: '6px', 
          marginBottom: '20px' 
        }}>
          {error}
        </div>
      )}

      <DataTable
        data={programs}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search programs..."
      />

      {/* Create Program Modal */}
      <ProgramFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={submitCreateProgram}
        title="Create New Program"
      />

      {/* Edit Program Modal */}
      <ProgramFormModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingProgram(null);
        }}
        onSubmit={submitEditProgram}
        title="Edit Program"
        isEdit={true}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setProgramToDelete(null);
        }}
        onConfirm={confirmDeleteProgram}
        title="Delete Program"
        message={`Are you sure you want to delete "${programToDelete?.program_name}"? This action cannot be undone and may affect related seasons and episodes.`}
        confirmText="Delete Program"
        type="danger"
        loading={formSubmitting}
      />
    </div>
  );
}