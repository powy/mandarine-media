import React, { useState } from 'react';

interface PublicPersonFormProps {
  item?: any;
  isCreating: boolean;
  onSave: (data: any) => void;
  onCancel: () => void;
  onDelete?: () => void;
  error?: string;
}

export default function PublicPersonForm({ 
  item, 
  isCreating, 
  onSave, 
  onCancel, 
  onDelete, 
  error 
}: PublicPersonFormProps) {
  const [formData, setFormData] = useState(() => {
    if (item) {
      return {
        // Required field in v1.5
        stage_name_roman: item.stage_name_roman || item.stage_name || '',
        
        // Optional name fields (v1.5)
        first_name_hangul: item.first_name_hangul || '',
        last_name_hangul: item.last_name_hangul || '',
        first_name_roman: item.first_name_roman || '',
        last_name_roman: item.last_name_roman || '',
        stage_name_hangul: item.stage_name_hangul || '',
        
        // v1.5 fields
        profession_list: item.profession_list || [],
        face_image_id: item.face_image_id || '',
      };
    } else {
      return {
        // Required field in v1.5
        stage_name_roman: '',
        
        // Optional name fields (v1.5)
        first_name_hangul: '',
        last_name_hangul: '',
        first_name_roman: '',
        last_name_roman: '',
        stage_name_hangul: '',
        
        // v1.5 fields
        profession_list: [],
        face_image_id: '',
      };
    }
  });
  
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
      onCancel(); // Close form on success
    } catch (err) {
      // Error is handled by parent component
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndBack = async () => {
    setLoading(true);
    try {
      await onSave(formData);
      onCancel(); // Go back to list after saving
    } catch (err) {
      // Error is handled by parent component
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirmation(true);
  };

  const handleDeleteConfirm = () => {
    if (onDelete) {
      onDelete();
    }
    setShowDeleteConfirmation(false);
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirmation(false);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '24px' 
      }}>
        <h2 style={{ margin: 0, color: '#1f2937' }}>
          {isCreating ? 'Create Public Person' : 'Edit Public Person'}
        </h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              backgroundColor: '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          {!isCreating && onDelete && (
            <button
              onClick={handleDeleteClick}
              style={{
                padding: '8px 16px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Delete
            </button>
          )}
        </div>
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

      <form onSubmit={handleSubmit}>
        <div style={{ 
          backgroundColor: 'white', 
          padding: '24px', 
          borderRadius: '8px', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px'
        }}>
          <div>
            <h3 style={{ margin: '0 0 16px 0', color: '#374151' }}>v1.5 PublicPerson</h3>
            
            {/* Required Field: Romanized Stage Name */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: '#dc2626' }}>
                Romanized Stage Name * (Required)
              </label>
              <input
                type="text"
                value={formData.stage_name_roman}
                onChange={(e) => handleFieldChange('stage_name_roman', e.target.value)}
                placeholder="Stage Name"
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '2px solid #dc2626',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
              <small style={{ color: '#6b7280', fontSize: '12px' }}>
                This is the only required field in v1.5
              </small>
            </div>

            <h3 style={{ margin: '16px 0 16px 0', color: '#374151' }}>Optional Name Fields</h3>

            {/* Korean First Name */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: '#374151' }}>
                Korean First Name (Optional)
              </label>
              <input
                type="text"
                value={formData.first_name_hangul}
                onChange={(e) => handleFieldChange('first_name_hangul', e.target.value)}
                placeholder="한글 이름"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Korean Last Name */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: '#374151' }}>
                Korean Last Name (Optional)
              </label>
              <input
                type="text"
                value={formData.last_name_hangul}
                onChange={(e) => handleFieldChange('last_name_hangul', e.target.value)}
                placeholder="한글 성"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Korean Stage Name */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: '#374151' }}>
                Korean Stage Name (Optional)
              </label>
              <input
                type="text"
                value={formData.stage_name_hangul}
                onChange={(e) => handleFieldChange('stage_name_hangul', e.target.value)}
                placeholder="한글 예명"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Roman First Name */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: '#374151' }}>
                Romanized First Name (Optional)
              </label>
              <input
                type="text"
                value={formData.first_name_roman}
                onChange={(e) => handleFieldChange('first_name_roman', e.target.value)}
                placeholder="First Name"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Roman Last Name */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: '#374151' }}>
                Romanized Last Name (Optional)
              </label>
              <input
                type="text"
                value={formData.last_name_roman}
                onChange={(e) => handleFieldChange('last_name_roman', e.target.value)}
                placeholder="Last Name"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div>
            <h3 style={{ margin: '0 0 16px 0', color: '#374151' }}>v1.5 Fields</h3>

            {/* Profession List */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: '#374151' }}>
                Professions (Optional)
              </label>
              <input
                type="text"
                value={formData.profession_list?.join(', ') || ''}
                onChange={(e) => {
                  const professions = e.target.value.split(',').map(p => p.trim()).filter(p => p);
                  handleFieldChange('profession_list', professions);
                }}
                placeholder="actor, singer, dancer (comma-separated)"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
              <small style={{ color: '#6b7280', fontSize: '12px' }}>
                Enter professions separated by commas (e.g., actor, singer, host)
              </small>
            </div>

            {/* Face Image ID */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: '#374151' }}>
                Face Image ID (Optional)
              </label>
              <input
                type="text"
                value={formData.face_image_id}
                onChange={(e) => handleFieldChange('face_image_id', e.target.value)}
                placeholder="UUID of face image in pictures table"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
              <small style={{ color: '#6b7280', fontSize: '12px' }}>
                Reference to a picture ID for the person's face image
              </small>
            </div>

            <div style={{ 
              padding: '16px', 
              backgroundColor: '#f0f9ff', 
              border: '1px solid #0ea5e9', 
              borderRadius: '6px',
              marginBottom: '16px'
            }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#0369a1' }}>v1.5 Simplified Model</h4>
              <p style={{ margin: 0, fontSize: '14px', color: '#0369a1' }}>
                This form now matches the v1.5 API specification with only the essential fields. 
                The complex v1.4 fields (birthdate, gender, nationality, blood type, etc.) have been removed 
                for a cleaner, more focused model.
              </p>
            </div>
          </div>
          
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'flex-end',
              paddingTop: '20px',
              borderTop: '1px solid #e5e7eb'
            }}>
              <button
                type="button"
                onClick={onCancel}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '12px 24px',
                  backgroundColor: loading ? '#9ca3af' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: loading ? 'default' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                {loading ? 'Saving...' : (isCreating ? 'Create' : 'Update')}
              </button>
              <button
                type="button"
                onClick={handleSaveAndBack}
                disabled={loading}
                style={{
                  padding: '12px 24px',
                  backgroundColor: loading ? '#9ca3af' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: loading ? 'default' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                {loading ? 'Saving...' : 'Save and Back'}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirmation && (
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
              Are you sure you want to delete this public person? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleDeleteCancel}
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
                onClick={handleDeleteConfirm}
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