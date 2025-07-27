import React, { useState, useEffect, useMemo } from 'react';
import { usersApi, User, UserCreate, UserUpdate } from 'share';
import { DataTable } from '../../components/common/DataTable';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ColumnDef } from '@tanstack/react-table';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';

interface UserFormData {
  email: string;
  username: string;
  full_name: string;
  password?: string;
  is_admin: boolean;
  is_active: boolean;
}

const initialFormData: UserFormData = {
  email: '',
  username: '',
  full_name: '',
  password: '',
  is_admin: false,
  is_active: true,
};

export default function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [formData, setFormData] = useState<UserFormData>(initialFormData);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await usersApi.getUsers({ limit: 100 });
      setUsers(response.data || []);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleCreateUser = () => {
    setFormData(initialFormData);
    setIsCreateModalOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      username: user.email, // Backend uses email as username
      full_name: user.full_name,
      is_admin: user.is_admin,
      is_active: user.is_active,
    });
    setIsEditModalOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const submitCreateUser = async () => {
    if (!formData.email || !formData.full_name || !formData.password) {
      showNotification('error', 'Email, full name, and password are required');
      return;
    }

    try {
      setFormSubmitting(true);
      const createData: UserCreate = {
        email: formData.email,
        username: formData.username || formData.email,
        full_name: formData.full_name,
        password: formData.password!,
        role: formData.is_admin ? 'admin' : 'user',
        is_active: formData.is_active,
      };
      
      await usersApi.createUser(createData);
      setIsCreateModalOpen(false);
      await fetchUsers();
      showNotification('success', 'User created successfully');
    } catch (err: any) {
      showNotification('error', err.response?.data?.detail || 'Failed to create user');
    } finally {
      setFormSubmitting(false);
    }
  };

  const submitEditUser = async () => {
    if (!editingUser || !formData.email || !formData.full_name) {
      showNotification('error', 'Email and full name are required');
      return;
    }

    try {
      setFormSubmitting(true);
      const updateData: UserUpdate = {
        email: formData.email,
        username: formData.username || formData.email,
        full_name: formData.full_name,
        role: formData.is_admin ? 'admin' : 'user',
        is_active: formData.is_active,
      };
      
      await usersApi.updateUser(editingUser.id.toString(), updateData);
      setIsEditModalOpen(false);
      setEditingUser(null);
      await fetchUsers();
      showNotification('success', 'User updated successfully');
    } catch (err: any) {
      showNotification('error', err.response?.data?.detail || 'Failed to update user');
    } finally {
      setFormSubmitting(false);
    }
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      setFormSubmitting(true);
      await usersApi.deleteUser(userToDelete.id.toString());
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
      await fetchUsers();
      showNotification('success', 'User deleted successfully');
    } catch (err: any) {
      showNotification('error', err.response?.data?.detail || 'Failed to delete user');
    } finally {
      setFormSubmitting(false);
    }
  };

  const columns = useMemo<ColumnDef<User>[]>(() => [
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ getValue }) => getValue() || 'N/A',
    },
    {
      accessorKey: 'full_name',
      header: 'Full Name',
      cell: ({ getValue }) => getValue() || 'N/A',
    },
    {
      accessorKey: 'is_admin',
      header: 'Role',
      cell: ({ getValue }) => (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
          getValue() 
            ? 'bg-purple-100 text-purple-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {getValue() ? 'Admin' : 'User'}
        </span>
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ getValue }) => (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
          getValue() 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {getValue() ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      accessorKey: 'created_at',
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
        const user = row.original;
        return (
          <div className="flex space-x-2">
            <button
              onClick={() => handleEditUser(user)}
              className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
            >
              Edit
            </button>
            <button
              onClick={() => handleDeleteUser(user)}
              className="text-red-600 hover:text-red-900 text-sm font-medium"
            >
              Delete
            </button>
          </div>
        );
      },
    },
  ], []);

  const UserFormModal = ({ isOpen, onClose, onSubmit, title, isEdit = false }: {
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
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="user@example.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="John Doe"
                      required
                    />
                  </div>

                  {!isEdit && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password *
                      </label>
                      <input
                        type="password"
                        value={formData.password || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Enter password"
                        required
                      />
                    </div>
                  )}

                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.is_admin}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_admin: e.target.checked }))}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Admin privileges</span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Active</span>
                    </label>
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
                    disabled={formSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {formSubmitting ? 'Saving...' : (isEdit ? 'Update User' : 'Create User')}
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
        <h1 style={{ margin: 0, color: '#1f2937' }}>Users Management</h1>
        <button
          onClick={handleCreateUser}
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
          Create New User
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
        data={users}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search users..."
      />

      {/* Create User Modal */}
      <UserFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={submitCreateUser}
        title="Create New User"
      />

      {/* Edit User Modal */}
      <UserFormModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingUser(null);
        }}
        onSubmit={submitEditUser}
        title="Edit User"
        isEdit={true}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setUserToDelete(null);
        }}
        onConfirm={confirmDeleteUser}
        title="Delete User"
        message={`Are you sure you want to delete "${userToDelete?.full_name}"? This action cannot be undone.`}
        confirmText="Delete User"
        type="danger"
        loading={formSubmitting}
      />
    </div>
  );
}