import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { Plus, Search, Edit2, Trash2, X, Database } from 'lucide-react';

interface QueryItem {
  id: string;
  title: string;
  query: string;
  hos_use: string | null;
  create_by: string;
  create_at: string;
}

export const QueryUtilities: React.FC = () => {
  const { user } = useAuthStore();
  const [queries, setQueries] = useState<QueryItem[]>([]);
  const [search, setSearch] = useState('');
  const [filterHospital, setFilterHospital] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formQuery, setFormQuery] = useState('');
  const [formHosUse, setFormHosUse] = useState('');

  const fetchQueries = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('tb_queries')
        .select('*')
        .order('create_at', { ascending: false });

      if (error) throw error;
      setQueries(data || []);
    } catch (err: any) {
      console.error('Error fetching queries:', err);
      setError(err.message || 'Failed to load queries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueries();
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setFormTitle('');
    setFormQuery('');
    setFormHosUse('');
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: QueryItem) => {
    setEditingId(item.id);
    setFormTitle(item.title);
    setFormQuery(item.query);
    setFormHosUse(item.hos_use || '');
    setError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formTitle.trim() || !formQuery.trim()) {
      setError('Title and Query fields are required.');
      return;
    }

    try {
      if (editingId) {
        // Update
        const { error } = await supabase
          .from('tb_queries')
          .update({
            title: formTitle,
            query: formQuery,
            hos_use: formHosUse || null,
            update_by: user?.email || 'system',
            update_at: new Date().toISOString()
          })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('tb_queries')
          .insert({
            title: formTitle,
            query: formQuery,
            hos_use: formHosUse || null,
            create_by: user?.email || 'system',
            create_at: new Date().toISOString()
          });

        if (error) throw error;
      }

      closeModal();
      fetchQueries();
    } catch (err: any) {
      console.error('Error saving query:', err);
      setError(err.message || 'Failed to save query');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this query?')) return;

    try {
      const { error } = await supabase
        .from('tb_queries')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchQueries();
    } catch (err: any) {
      console.error('Error deleting query:', err);
      alert(err.message || 'Failed to delete query');
    }
  };

  // Filter and search logic
  const filteredQueries = queries.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) || 
                          item.query.toLowerCase().includes(search.toLowerCase());
    const matchesHospital = filterHospital === '' || 
                            (item.hos_use && item.hos_use.toLowerCase().includes(filterHospital.toLowerCase()));
    return matchesSearch && matchesHospital;
  });

  // Extract unique hospital list for dropdown filter
  const hospitalList = Array.from(
    new Set(queries.map(q => q.hos_use).filter((h): h is string => !!h))
  ).sort();

  return (
    <div className="manager-container">
      <div className="manager-header">
        <div className="title-desc">
          <h2>Query Utilities</h2>
          <p>Create, save, and retrieve reusable SQL scripts for hospital deployments.</p>
        </div>
        <button onClick={openAddModal} className="btn-primary">
          <Plus size={16} /> Save Query
        </button>
      </div>

      <div className="filters-bar">
        <div className="search-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search queries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="select-wrapper">
          <select 
            value={filterHospital} 
            onChange={(e) => setFilterHospital(e.target.value)}
          >
            <option value="">All Hospitals</option>
            {hospitalList.map((hos, idx) => (
              <option key={idx} value={hos}>{hos}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading queries...</div>
      ) : filteredQueries.length === 0 ? (
        <div className="empty-state">
          <Database size={48} />
          <p>No queries found. Click "Save Query" to add one.</p>
        </div>
      ) : (
        <div className="items-grid">
          {filteredQueries.map((item) => (
            <div key={item.id} className="item-card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">{item.title}</h3>
                  {item.hos_use && <span className="hospital-badge">{item.hos_use}</span>}
                </div>
                <div className="card-actions">
                  <button onClick={() => openEditModal(item)} className="btn-action-edit" title="Edit">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="btn-action-delete" title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="card-body">
                <pre className="sql-preview">
                  <code>{item.query}</code>
                </pre>
              </div>
              <div className="card-footer">
                <span>By: {item.create_by}</span>
                <span>{new Date(item.create_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Save/Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingId ? 'Edit Query' : 'Save New Query'}</h3>
              <button onClick={closeModal} className="btn-close">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              {error && <div className="error-message">{error}</div>}
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Fetch Patient Records"
                  required
                />
              </div>
              <div className="form-group">
                <label>Hospital Code / Name (Optional)</label>
                <input
                  type="text"
                  value={formHosUse}
                  onChange={(e) => setFormHosUse(e.target.value)}
                  placeholder="e.g. HOS-01"
                />
              </div>
              <div className="form-group">
                <label>SQL Query</label>
                <textarea
                  value={formQuery}
                  onChange={(e) => setFormQuery(e.target.value)}
                  placeholder="SELECT * FROM patients WHERE..."
                  rows={8}
                  required
                />
              </div>
              <div className="modal-footer">
                <button type="button" onClick={closeModal} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingId ? 'Update Query' : 'Save Query'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
