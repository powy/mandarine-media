import React, { useState, useEffect, useMemo } from 'react';
import { usersApi } from 'share';
import { DataTable } from '../../components/common/DataTable';
import { ColumnDef } from '@tanstack/react-table';

export default function UsersManagementPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await usersApi.getUsers({ limit: 50 });
        setUsers(response.data || []);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load users');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const columns = useMemo<ColumnDef<any>[]>(() => [
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
      header: 'Admin',
      cell: ({ getValue }) => getValue() ? 'Yes' : 'No',
    },
    {
      accessorKey: 'is_active',
      header: 'Active',
      cell: ({ getValue }) => getValue() ? 'Yes' : 'No',
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ getValue }) => {
        const value = getValue() as string;
        return value ? new Date(value).toLocaleDateString() : 'N/A';
      },
    },
  ], []);

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
    </div>
  );
}