import React, { useState, useEffect, useMemo } from 'react';
import { programsApi } from 'share';
import { DataTable } from '../../components/common/DataTable';
import { ColumnDef } from '@tanstack/react-table';

export default function ProgramsManagementPage() {
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const response = await programsApi.getPrograms({ limit: 50 });
        setPrograms(response.data || []);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load programs');
      } finally {
        setLoading(false);
      }
    };
    fetchPrograms();
  }, []);

  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: 'program_name',
      header: 'Program Name',
      cell: ({ getValue }) => getValue() || 'N/A',
    },
    {
      accessorKey: 'general_media_description',
      header: 'Description',
      cell: ({ getValue }) => {
        const value = getValue() as string;
        return value ? (value.length > 100 ? value.substring(0, 100) + '...' : value) : 'N/A';
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
      cell: ({ row }) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
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
    </div>
  );
}