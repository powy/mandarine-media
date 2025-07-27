import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { categoryListsApi, CategoryListWithItemCount, CategoryList, CategoryListItem } from 'share';

const CategoryListsPage: React.FC = () => {
  const [categoryLists, setCategoryLists] = useState<CategoryListWithItemCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedList, setSelectedList] = useState<CategoryList | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showItemsModal, setShowItemsModal] = useState(false);
  const [regeneratingJSON, setRegeneratingJSON] = useState(false);

  const fetchCategoryLists = async () => {
    try {
      setLoading(true);
      const response = await categoryListsApi.getCategoryLists({ limit: 100 });
      setCategoryLists(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load category lists');
      console.error('Error loading category lists:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategoryLists();
  }, []);

  const handleCreateList = () => {
    setSelectedList(null);
    setShowCreateForm(true);
  };

  const handleEditList = async (listId: string) => {
    try {
      const list = await categoryListsApi.getCategoryList(listId);
      setSelectedList(list);
      setShowCreateForm(true);
    } catch (err) {
      setError('Failed to load category list details');
    }
  };

  const handleDeleteList = async (listId: string, listName: string) => {
    if (!confirm(`Are you sure you want to delete the category list "${listName}"?`)) {
      return;
    }

    try {
      await categoryListsApi.deleteCategoryList(listId);
      await fetchCategoryLists();
    } catch (err) {
      setError('Failed to delete category list');
    }
  };

  const handleViewItems = async (listId: string) => {
    try {
      const list = await categoryListsApi.getCategoryList(listId);
      setSelectedList(list);
      setShowItemsModal(true);
    } catch (err) {
      setError('Failed to load category list items');
    }
  };

  const handleRegenerateAllJSON = async () => {
    if (!confirm('Regenerate JSON for all category lists? This may take a moment.')) {
      return;
    }

    try {
      setRegeneratingJSON(true);
      const result = await categoryListsApi.regenerateAllCategoryListsJSON();
      alert(`Successfully updated ${result.updated_count} category lists. ${result.failed_count} failed.`);
      await fetchCategoryLists();
    } catch (err) {
      setError('Failed to regenerate JSON');
    } finally {
      setRegeneratingJSON(false);
    }
  };

  const handleRegenerateJSON = async (listId: string) => {
    try {
      await categoryListsApi.regenerateCategoryListJSON(listId);
      alert('JSON regenerated successfully');
      await fetchCategoryLists();
    } catch (err) {
      setError('Failed to regenerate JSON for this list');
    }
  };

  const getStatusBadge = (isActive: boolean) => (
    <span
      style={{
        padding: '4px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 'bold',
        backgroundColor: isActive ? '#dcfce7' : '#fef2f2',
        color: isActive ? '#166534' : '#dc2626',
      }}
    >
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-text">Loading category lists...</div>
      </div>
    );
  }

  return (
    <div className="category-lists-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <h1 className="page-title">Category Lists Management</h1>
          <p className="page-description">
            Manage category lists and their content organization
          </p>
        </div>
        <div className="header-actions">
          <button
            onClick={handleRegenerateAllJSON}
            disabled={regeneratingJSON}
            className="btn btn-secondary"
          >
            {regeneratingJSON ? 'Regenerating...' : '🔄 Regenerate All JSON'}
          </button>
          <button onClick={handleCreateList} className="btn btn-primary">
            ➕ Create Category List
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError(null)} className="error-close">
            ✕
          </button>
        </div>
      )}

      {/* Category Lists Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Title</th>
              <th>Status</th>
              <th>Order</th>
              <th>Items</th>
              <th>JSON Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categoryLists.map((list) => (
              <tr key={list.id}>
                <td>
                  <span className="list-name">{list.name}</span>
                </td>
                <td>
                  <div>
                    <div className="list-title">{list.title}</div>
                    {list.description && (
                      <div className="list-description">{list.description}</div>
                    )}
                  </div>
                </td>
                <td>{getStatusBadge(list.is_active)}</td>
                <td>
                  <span className="display-order">{list.display_order}</span>
                </td>
                <td>
                  <button
                    onClick={() => handleViewItems(list.id)}
                    className="btn btn-link"
                  >
                    {list.item_count} items
                  </button>
                </td>
                <td>
                  <div className="json-status">
                    {list.json_last_updated ? (
                      <span className="json-updated">
                        {format(new Date(list.json_last_updated), 'MMM dd, HH:mm')}
                      </span>
                    ) : (
                      <span className="json-not-updated">Not generated</span>
                    )}
                  </div>
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      onClick={() => handleEditList(list.id)}
                      className="btn btn-sm btn-secondary"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleRegenerateJSON(list.id)}
                      className="btn btn-sm btn-secondary"
                    >
                      🔄 JSON
                    </button>
                    <button
                      onClick={() => handleDeleteList(list.id, list.name)}
                      className="btn btn-sm btn-danger"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {categoryLists.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <div className="empty-title">No category lists found</div>
            <div className="empty-description">
              Create your first category list to get started
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Form Modal */}
      {showCreateForm && (
        <CategoryListFormModal
          list={selectedList}
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => {
            setShowCreateForm(false);
            fetchCategoryLists();
          }}
        />
      )}

      {/* Items View Modal */}
      {showItemsModal && selectedList && (
        <CategoryListItemsModal
          list={selectedList}
          onClose={() => setShowItemsModal(false)}
          onUpdate={() => {
            setShowItemsModal(false);
            fetchCategoryLists();
          }}
        />
      )}

      <style>{`
        .category-lists-page {
          padding: 24px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
          padding: 20px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .page-title {
          margin: 0 0 8px 0;
          font-size: 24px;
          color: #1f2937;
        }

        .page-description {
          margin: 0;
          color: #6b7280;
          font-size: 14px;
        }

        .header-actions {
          display: flex;
          gap: 12px;
        }

        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
        }

        .btn-primary:hover {
          background: #2563eb;
        }

        .btn-secondary {
          background: #6b7280;
          color: white;
        }

        .btn-secondary:hover {
          background: #4b5563;
        }

        .btn-danger {
          background: #ef4444;
          color: white;
        }

        .btn-danger:hover {
          background: #dc2626;
        }

        .btn-link {
          background: none;
          color: #3b82f6;
          padding: 4px;
          text-decoration: underline;
        }

        .btn-sm {
          padding: 4px 8px;
          font-size: 12px;
        }

        .error-banner {
          background: #fef2f2;
          color: #dc2626;
          padding: 12px 16px;
          border-radius: 6px;
          margin-bottom: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .error-close {
          background: none;
          border: none;
          color: #dc2626;
          cursor: pointer;
          font-size: 16px;
        }

        .table-container {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
        }

        .data-table th {
          background: #f8fafc;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          color: #374151;
          border-bottom: 1px solid #e5e7eb;
        }

        .data-table td {
          padding: 12px;
          border-bottom: 1px solid #f3f4f6;
        }

        .list-name {
          font-family: monospace;
          background: #f3f4f6;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 12px;
        }

        .list-title {
          font-weight: 500;
          color: #1f2937;
        }

        .list-description {
          font-size: 12px;
          color: #6b7280;
          margin-top: 2px;
        }

        .display-order {
          font-weight: 500;
        }

        .json-updated {
          color: #059669;
          font-size: 12px;
        }

        .json-not-updated {
          color: #dc2626;
          font-size: 12px;
        }

        .action-buttons {
          display: flex;
          gap: 4px;
        }

        .empty-state {
          text-align: center;
          padding: 48px 24px;
        }

        .empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .empty-title {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 8px;
        }

        .empty-description {
          color: #6b7280;
        }

        .loading-container {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 200px;
        }

        .loading-text {
          color: #6b7280;
          font-size: 16px;
        }
      `}</style>
    </div>
  );
};

// Form Modal Component (placeholder - would need full implementation)
const CategoryListFormModal: React.FC<{
  list: CategoryList | null;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ list, onClose, onSuccess }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{list ? 'Edit Category List' : 'Create Category List'}</h2>
        <p>Form implementation would go here...</p>
        <div className="modal-actions">
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button onClick={onSuccess} className="btn btn-primary">
            Save
          </button>
        </div>
      </div>
      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          background: white;
          padding: 24px;
          border-radius: 8px;
          min-width: 400px;
        }
        .modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 24px;
        }
      `}</style>
    </div>
  );
};

// Items Modal Component (placeholder - would need full implementation)
const CategoryListItemsModal: React.FC<{
  list: CategoryList;
  onClose: () => void;
  onUpdate: () => void;
}> = ({ list, onClose, onUpdate }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content large">
        <h2>{list.title} - Items</h2>
        <p>Items management implementation would go here...</p>
        <p>Items count: {list.items.length}</p>
        <div className="modal-actions">
          <button onClick={onClose} className="btn btn-secondary">
            Close
          </button>
        </div>
      </div>
      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          background: white;
          padding: 24px;
          border-radius: 8px;
          min-width: 400px;
        }
        .modal-content.large {
          min-width: 800px;
          max-height: 80vh;
          overflow-y: auto;
        }
        .modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 24px;
        }
      `}</style>
    </div>
  );
};

export default CategoryListsPage;