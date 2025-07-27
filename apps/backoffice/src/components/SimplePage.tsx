import React from 'react';

interface SimplePageProps {
  title: string;
  description?: string;
}

export const SimplePage: React.FC<SimplePageProps> = ({ title, description }) => {
  return (
    <div style={{ padding: '20px' }}>
      <h1 style={{ 
        fontSize: '24px', 
        fontWeight: 'bold', 
        marginBottom: '16px',
        color: '#1f2937'
      }}>
        {title}
      </h1>
      {description && (
        <p style={{ 
          color: '#6b7280', 
          fontSize: '16px',
          marginBottom: '24px'
        }}>
          {description}
        </p>
      )}
      <div style={{
        backgroundColor: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '24px',
        textAlign: 'center'
      }}>
        <p style={{ color: '#6b7280', marginBottom: '12px' }}>
          This page is ready for implementation.
        </p>
        <p style={{ color: '#9ca3af', fontSize: '14px' }}>
          Content management functionality will be added here.
        </p>
      </div>
    </div>
  );
};