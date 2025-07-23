import React, { useState, useEffect, useMemo } from 'react';
import { personsApi } from 'share';
import { DataTable } from '../../components/common/DataTable';
import PublicPersonForm from '../../components/forms/PublicPersonForm';
import { ColumnDef } from '@tanstack/react-table';

export default function PersonsManagementPage() {
  const [persons, setPersons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<any>(null);

  useEffect(() => {
    const fetchPersons = async () => {
      try {
        const response = await personsApi.getPublicPersons({ limit: 50 });
        setPersons(response.data || []);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load persons');
      } finally {
        setLoading(false);
      }
    };
    fetchPersons();
  }, []);

  const handleCreate = () => {
    setIsCreating(true);
    setEditingItem(null);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setIsCreating(false);
  };

  const handleDelete = (item: any) => {
    setShowDeleteDialog(item);
  };

  const confirmDelete = async () => {
    if (showDeleteDialog) {
      try {
        await personsApi.deletePublicPerson(showDeleteDialog.id);
        setPersons(persons.filter(item => item.id !== showDeleteDialog.id));
        setShowDeleteDialog(null);
      } catch (err: any) {
        console.error('Delete error:', err);
        let errorMessage = 'Failed to delete person';
        
        if (err.response) {
          const status = err.response.status;
          const data = err.response.data;
          errorMessage = `Error ${status}: ${data?.detail || data?.message || err.message}`;
        } else if (err.message) {
          errorMessage = `Network error: ${err.message}`;
        }
        
        setError(errorMessage);
      }
    }
  };

  const handleSave = async (formData: any) => {
    try {
      setError('');
      console.log('Raw form data:', formData);
      
      // Validate required fields (v1.5: only stage_name_roman is required)
      const stage_name_roman = formData.stage_name_roman?.trim();
      
      // Check required field for v1.5
      if (!stage_name_roman) { setError('Romanized stage name is required'); return; }
      
      // Clean and prepare data for API (v1.5 specification)
      const apiData: any = {
        stage_name_roman, // Required field
        
        // Optional name fields (v1.5)
        first_name_hangul: formData.first_name_hangul?.trim() || null,
        last_name_hangul: formData.last_name_hangul?.trim() || null,
        first_name_roman: formData.first_name_roman?.trim() || null,
        last_name_roman: formData.last_name_roman?.trim() || null,
        stage_name_hangul: formData.stage_name_hangul?.trim() || null,
        
        // v1.5 fields
        profession_list: formData.profession_list && formData.profession_list.length > 0 ? formData.profession_list : null,
        face_image_id: formData.face_image_id || null
      };
      
      console.log('Cleaned API data:', apiData);
      
      if (isCreating) {
        const newItem = await personsApi.createPublicPerson(apiData);
        setPersons([...persons, newItem]);
        setEditingItem(null);
        setIsCreating(false);
      } else {
        const updatedItem = await personsApi.updatePublicPerson(editingItem.id, apiData);
        setPersons(persons.map(item => item.id === editingItem.id ? updatedItem : item));
        setEditingItem(updatedItem);
      }
    } catch (err: any) {
      console.error('Save error:', err);
      let errorMessage = 'Failed to save person';
      
      if (err.response) {
        const status = err.response.status;
        const data = err.response.data;
        
        if (status === 422) {
          const validationErrors = data?.detail || data?.errors || [];
          if (Array.isArray(validationErrors)) {
            const errorList = validationErrors.map(e => e.msg || e.message || e).join(', ');
            errorMessage = `Error 422: Validation failed - ${errorList}`;
          } else {
            errorMessage = `Error 422: Validation failed - ${data?.detail || 'Invalid data format'}`;
          }
        } else {
          errorMessage = `Error ${status}: ${data?.detail || data?.message || err.message}`;
        }
      } else if (err.message) {
        errorMessage = `Network error: ${err.message}`;
      }
      
      setError(errorMessage);
    }
  };

  const handleCancel = () => {
    setEditingItem(null);
    setIsCreating(false);
  };

  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: 'stage_name_roman',
      header: 'Stage Name (Required)',
      cell: ({ getValue }) => getValue() || 'N/A',
    },
    {
      id: 'full_name',
      header: 'Name',
      cell: ({ row }) => {
        const first = row.original.first_name_roman || '';
        const last = row.original.last_name_roman || '';
        return first && last ? `${first} ${last}` : 'N/A';
      },
    },
    {
      accessorKey: 'profession_list',
      header: 'Professions',
      cell: ({ getValue }) => {
        const value = getValue() as string[];
        if (Array.isArray(value) && value.length > 0) {
          return value.join(', ');
        }
        return 'N/A';
      },
    },
    {
      accessorKey: 'face_image_id',
      header: 'Face Image',
      cell: ({ getValue }) => getValue() ? 'Yes' : 'No',
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
      cell: ({ row }) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(row.original);
            }}
            style={{
              padding: '4px 8px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Edit
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(row.original);
            }}
            style={{
              padding: '4px 8px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Delete
          </button>
        </div>
      ),
    },
  ], []);

  // Show edit/create form if editing or creating
  if (editingItem || isCreating) {
    return (
      <PublicPersonForm
        item={editingItem}
        isCreating={isCreating}
        onSave={handleSave}
        onCancel={handleCancel}
        onDelete={() => editingItem && handleDelete(editingItem)}
        error={error}
      />
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
        <h1 style={{ margin: 0, color: '#1f2937' }}>Public Persons Management (v1.5)</h1>
        <button
          onClick={handleCreate}
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
          Create New Person
        </button>
      </div>

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
        data={persons}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search public persons..."
      />

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '8px',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#dc2626' }}>Confirm Delete</h3>
            <p style={{ margin: '0 0 20px 0', color: '#374151' }}>
              Are you sure you want to delete "{showDeleteDialog.stage_name_roman}"? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowDeleteDialog(null)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}