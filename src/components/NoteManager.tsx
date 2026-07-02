import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { Plus, Search, Edit2, Trash2, X, FileText } from 'lucide-react';

interface NoteItem {
  id: string;
  note: string;
  description: string;
  create_by: string;
  create_at: string;
}

export const NoteManager: React.FC = () => {
  const { user } = useAuthStore();
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formNote, setFormNote] = useState('');
  const [formDescription, setFormDescription] = useState('');

  const fetchNotes = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('tb_note')
        .select('*')
        .order('create_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (err: any) {
      console.error('Error fetching notes:', err);
      setError(err.message || 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setFormNote('');
    setFormDescription('');
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: NoteItem) => {
    setEditingId(item.id);
    setFormNote(item.note);
    setFormDescription(item.description);
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

    if (!formNote.trim() || !formDescription.trim()) {
      setError('Title/Note and Description fields are required.');
      return;
    }

    try {
      if (editingId) {
        // Update
        const { error } = await supabase
          .from('tb_note')
          .update({
            note: formNote,
            description: formDescription,
            update_by: user?.email || 'system',
            update_at: new Date().toISOString()
          })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('tb_note')
          .insert({
            note: formNote,
            description: formDescription,
            create_by: user?.email || 'system',
            create_at: new Date().toISOString()
          });

        if (error) throw error;
      }

      closeModal();
      fetchNotes();
    } catch (err: any) {
      console.error('Error saving note:', err);
      setError(err.message || 'Failed to save note');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      const { error } = await supabase
        .from('tb_note')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchNotes();
    } catch (err: any) {
      console.error('Error deleting note:', err);
      alert(err.message || 'Failed to delete note');
    }
  };

  const filteredNotes = notes.filter(item => 
    item.note.toLowerCase().includes(search.toLowerCase()) ||
    item.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="manager-container">
      <div className="manager-header">
        <div className="title-desc">
          <h2>Deployment Notes</h2>
          <p>Record notes, descriptions, and updates for your projects and deployments.</p>
        </div>
        <button onClick={openAddModal} className="btn-primary">
          <Plus size={16} /> Add Note
        </button>
      </div>

      <div className="filters-bar">
        <div className="search-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading notes...</div>
      ) : filteredNotes.length === 0 ? (
        <div className="empty-state">
          <FileText size={48} />
          <p>No notes found. Click "Add Note" to add one.</p>
        </div>
      ) : (
        <div className="items-grid">
          {filteredNotes.map((item) => (
            <div key={item.id} className="item-card note-card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">{item.note}</h3>
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
                <p className="note-desc">{item.description}</p>
              </div>
              <div className="card-footer">
                <span>By: {item.create_by}</span>
                <span>{new Date(item.create_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingId ? 'Edit Note' : 'Add New Note'}</h3>
              <button onClick={closeModal} className="btn-close">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              {error && <div className="error-message">{error}</div>}
              <div className="form-group">
                <label>Note Title / Summary</label>
                <input
                  type="text"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="e.g. Config parameters changed in HOS-02"
                  required
                />
              </div>
              <div className="form-group">
                <label>Detailed Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="e.g. Changed the db_pool size and updated the host url due to server migration..."
                  rows={8}
                  required
                />
              </div>
              <div className="modal-footer">
                <button type="button" onClick={closeModal} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingId ? 'Update Note' : 'Add Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
