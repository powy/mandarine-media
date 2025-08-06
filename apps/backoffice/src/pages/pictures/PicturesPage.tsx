import React, { useState, useMemo } from 'react';
import { Picture, PictureCreate, PictureUpdate } from 'share';
import { DataTable } from '../../components/common/DataTable';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ColumnDef } from '@tanstack/react-table';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { usePicturesList, useCreatePicture, useUpdatePicture, useDeletePicture } from '../../hooks/usePictures';

interface PictureFormData {
  photo_url: string;
  file_name: string;
  file_size_bytes: string;
  width: string;
  height: string;
  alt_text: string;
}

const initialFormData: PictureFormData = {
  photo_url: '',
  file_name: '',
  file_size_bytes: '',
  width: '',
  height: '',
  alt_text: '',
};

export const PicturesPage = () => {
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [formData, setFormData] = useState<PictureFormData>(initialFormData);
  const [editingPicture, setEditingPicture] = useState<Picture | null>(null);
  const [pictureToDelete, setPictureToDelete] = useState<Picture | null>(null);

  // API hooks
  const { data: pictures = [], isLoading, error } = usePicturesList();

  const createMutation = useCreatePicture();
  const updateMutation = useUpdatePicture();
  const deleteMutation = useDeletePicture();

  const handleCreatePicture = () => {
    setFormData(initialFormData);
    setIsCreateModalOpen(true);
  };

  const handleEditPicture = (picture: Picture) => {
    setEditingPicture(picture);
    setFormData({
      photo_url: picture.photo_url,
      file_name: picture.file_name || '',
      file_size_bytes: picture.file_size_bytes?.toString() || '',
      width: picture.width?.toString() || '',
      height: picture.height?.toString() || '',
      alt_text: picture.alt_text || '',
    });
    setIsEditModalOpen(true);
  };

  const handleDeletePicture = (picture: Picture) => {
    setPictureToDelete(picture);
    setIsDeleteModalOpen(true);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const submitCreatePicture = async () => {
    if (!formData.photo_url.trim()) {
      return;
    }

    const createData: PictureCreate = {
      photo_url: formData.photo_url.trim(),
      file_name: formData.file_name.trim() || undefined,
      file_size_bytes: formData.file_size_bytes ? parseInt(formData.file_size_bytes) : undefined,
      width: formData.width ? parseInt(formData.width) : undefined,
      height: formData.height ? parseInt(formData.height) : undefined,
      alt_text: formData.alt_text.trim() || undefined,
    };
    
    await createMutation.mutateAsync(createData);
    setIsCreateModalOpen(false);
  };

  const submitEditPicture = async () => {
    if (!editingPicture || !formData.photo_url.trim()) {
      return;
    }

    const updateData: PictureUpdate = {
      photo_url: formData.photo_url.trim(),
      file_name: formData.file_name.trim() || undefined,
      file_size_bytes: formData.file_size_bytes ? parseInt(formData.file_size_bytes) : undefined,
      width: formData.width ? parseInt(formData.width) : undefined,
      height: formData.height ? parseInt(formData.height) : undefined,
      alt_text: formData.alt_text.trim() || undefined,
    };
    
    await updateMutation.mutateAsync({ id: editingPicture.id, data: updateData });
    setIsEditModalOpen(false);
    setEditingPicture(null);
  };

  const confirmDeletePicture = async () => {
    if (!pictureToDelete) return;

    await deleteMutation.mutateAsync(pictureToDelete.id);
    setIsDeleteModalOpen(false);
    setPictureToDelete(null);
  };

  const columns = useMemo<ColumnDef<Picture>[]>(() => [
    {
      accessorKey: 'photo_url',
      header: 'Preview',
      cell: ({ getValue, row }) => {
        const url = getValue() as string;
        const picture = row.original;
        return (
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 w-16 h-16">
              <img
                className="w-16 h-16 rounded-md object-cover border border-gray-200"
                src={url}
                alt={picture.alt_text || 'Picture preview'}
                onError={(e) => {
                  e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMSAyMUg0M1Y0M0gyMVYyMVoiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPHBhdGggZD0iTTI4IDI4TDM2IDM2TDQzIDI5IiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+CjxjaXJjbGUgY3g9IjI4IiBjeT0iMjgiIHI9IjMiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIyIi8+Cjwvc3ZnPgo=';
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-gray-900 truncate" title={picture.file_name}>
                {picture.file_name || 'Untitled'}
              </div>
              <div className="text-sm text-gray-500">
                {picture.width && picture.height ? `${picture.width}×${picture.height}` : 'Unknown size'}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'photo_url',
      header: 'URL',
      cell: ({ getValue }) => {
        const url = getValue() as string;
        return (
          <div className="max-w-xs">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-900 text-sm truncate block"
              title={url}
            >
              {url}
            </a>
          </div>
        );
      },
    },
    {
      accessorKey: 'file_size_bytes',
      header: 'Size',
      cell: ({ getValue }) => {
        const size = getValue() as number;
        return size ? formatFileSize(size) : 'Unknown';
      },
    },
    {
      accessorKey: 'alt_text',
      header: 'Alt Text',
      cell: ({ getValue }) => {
        const altText = getValue() as string;
        return (
          <div className="max-w-xs truncate" title={altText}>
            {altText || <span className="text-gray-400 italic">No alt text</span>}
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
        const picture = row.original;
        return (
          <div className="flex space-x-2">
            <button
              onClick={() => handleEditPicture(picture)}
              className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
            >
              Edit
            </button>
            <button
              onClick={() => handleDeletePicture(picture)}
              className="text-red-600 hover:text-red-900 text-sm font-medium"
            >
              Delete
            </button>
          </div>
        );
      },
    },
  ], []);

  const PictureFormModal = ({ isOpen, onClose, onSubmit, title, isEdit = false }: {
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
                <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 mb-4">
                    {title}
                  </Dialog.Title>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Photo URL *
                      </label>
                      <input
                        type="url"
                        value={formData.photo_url}
                        onChange={(e) => setFormData(prev => ({ ...prev, photo_url: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="https://example.com/image.jpg"
                        required
                      />
                    </div>

                    {formData.photo_url && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Preview
                        </label>
                        <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
                          <img
                            src={formData.photo_url}
                            alt="Preview"
                            className="max-w-full h-32 object-contain mx-auto"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                              if (nextElement) {
                                nextElement.style.display = 'block';
                              }
                            }}
                          />
                          <div className="text-center text-gray-500 text-sm hidden">
                            Failed to load image preview
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          File Name
                        </label>
                        <input
                          type="text"
                          value={formData.file_name}
                          onChange={(e) => setFormData(prev => ({ ...prev, file_name: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="image.jpg"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          File Size (bytes)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.file_size_bytes}
                          onChange={(e) => setFormData(prev => ({ ...prev, file_size_bytes: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="1024000"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Width (px)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.width}
                          onChange={(e) => setFormData(prev => ({ ...prev, width: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="1920"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Height (px)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.height}
                          onChange={(e) => setFormData(prev => ({ ...prev, height: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="1080"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Alt Text (Accessibility)
                      </label>
                      <textarea
                        value={formData.alt_text}
                        onChange={(e) => setFormData(prev => ({ ...prev, alt_text: e.target.value }))}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Descriptive text for screen readers"
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
                      disabled={isSubmitting || !formData.photo_url.trim()}
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      {isSubmitting ? 'Saving...' : (isEdit ? 'Update Picture' : 'Create Picture')}
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
          <h3 className="text-sm font-medium text-red-800">Error Loading Pictures</h3>
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
        <h1 style={{ margin: 0, color: '#1f2937' }}>Pictures Management</h1>
        <button
          onClick={handleCreatePicture}
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
          Add Picture
        </button>
      </div>

      <DataTable
        data={pictures}
        columns={columns}
        loading={isLoading}
        searchPlaceholder="Search pictures..."
      />

      {/* Create Picture Modal */}
      <PictureFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={submitCreatePicture}
        title="Add New Picture"
      />

      {/* Edit Picture Modal */}
      <PictureFormModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingPicture(null);
        }}
        onSubmit={submitEditPicture}
        title="Edit Picture"
        isEdit={true}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setPictureToDelete(null);
        }}
        onConfirm={confirmDeletePicture}
        title="Delete Picture"
        message={`Are you sure you want to delete this picture? This action cannot be undone and may affect content that references this image.`}
        confirmText="Delete Picture"
        type="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  );
};