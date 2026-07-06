import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/useAuthStore";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Database,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  FileText,
  Sliders,
} from "lucide-react";
import { useQueryStore } from "../store/useQueryStore";
import type { QueryItem } from "../types/types";

export const QueryUtilities: React.FC = () => {
  const { user } = useAuthStore();
  const { queryList, loadQuery, isLoading } = useQueryStore();
  const [search, setSearch] = useState("");
  const [filterHospital, setFilterHospital] = useState("");
  const [error, setError] = useState<string | null>(null);

  // 🌟 เพิ่ม State สำหรับคัดกรองประเภท (Default เป็น 'report' ตามต้องการ)
  const [activeTab, setActiveTab] = useState<"report" | "utilities">("report");

  // Accordion State
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Copy State
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    query: "",
    hos_use: "",
    query_type: "report",
  });

  useEffect(() => {
    loadQuery();
  }, []);

  const toggleAccordion = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleCopy = async (e: React.MouseEvent, id: string, text: string) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setForm({
      title: "",
      query: "",
      hos_use: "",
      query_type: "report",
    });
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (e: React.MouseEvent, item: QueryItem) => {
    e.stopPropagation();
    setEditingId(item.id);
    setForm({
      title: item.title,
      query: item.query,
      hos_use: item.hos_use || "",
      query_type: item.query_type,
    });
    setError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { title, query, hos_use, query_type } = form;
    setError(null);

    if (!title.trim() || !query.trim()) {
      setError("Title and Query fields are required.");
      return;
    }

    try {
      if (editingId) {
        // Update
        const { error } = await supabase
          .from("tb_queries")
          .update({
            title: title,
            query: query,
            hos_use: hos_use || null,
            query_type: query_type || null,
            update_by: user?.email || "system",
            update_at: new Date().toISOString(),
          })
          .eq("id", editingId);

        if (error) throw error;
      } else {
        // Insert (จะผูก query_type ตามแท็บที่เปิดอยู่ตอนกดเพิ่มข้อมูล)

        const { error } = await supabase.from("tb_queries").insert({
          title: title,
          query: query,
          hos_use: hos_use || null,
          query_type: query_type || activeTab,
          create_by: user?.email || "system",
          create_at: new Date().toISOString(),
        });

        if (error) throw error;
      }

      closeModal();
    } catch (err: any) {
      console.error("Error saving query:", err);
      setError(err.message || "Failed to save query");
    } finally {
      loadQuery();
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this query?")) return;

    try {
      const { error } = await supabase.from("tb_queries").delete().eq("id", id);

      if (error) throw error;
    } catch (err: any) {
      console.error("Error deleting query:", err);
      alert(err.message || "Failed to delete query");
    } finally {
      loadQuery();
    }
  };

  // 🌟 อัปเดต Filter logic: เพิ่มการเช็คคัดกรองจาก activeTab เข้าไปด้วย
  const filteredQueries = queryList.filter((item) => {
    const matchesTab = item.query_type === activeTab;
    const matchesSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.query.toLowerCase().includes(search.toLowerCase()) || 
      item.hos_use?.toLowerCase().includes(search.toLowerCase());
    const matchesHospital =
      filterHospital === "" ||
      (item.hos_use &&
        item.hos_use.toLowerCase().includes(filterHospital.toLowerCase()));

    return matchesTab && matchesSearch && matchesHospital;
  });

  // Extract unique hospital list เฉพาะของประเภทที่เลือกอยู่
  const hospitalList = Array.from(
    new Set(
      queryList
        .filter((q) => q.query_type === activeTab)
        .map((q) => q.hos_use)
        .filter((h): h is string => !!h),
    ),
  ).sort();

  return (
    <div className="manager-container">
      <div className="manager-header">
        <div className="title-desc">
          <h2>Query Management</h2>
          <p>
            Create, save, and retrieve reusable SQL scripts for hospital
            deployments.
          </p>
        </div>
        <button onClick={openAddModal} className="btn-primary">
          <Plus size={16} /> Save New{" "}
          {activeTab === "report" ? "Report" : "Utility"}
        </button>
      </div>

      {/* 🌟 ปุ่มสลับแผงตัวกรองประเภท (Tab Filter) */}
      <div
        className="type-tabs"
        style={{
          display: "flex",
          gap: "8px",
          borderBottom: "2px solid #e2e8f0",
          marginBottom: "20px",
          paddingBottom: "2px",
        }}
      >
        <button
          onClick={() => {
            setActiveTab("report");
            setExpandedId(null);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "10px 20px",
            border: "none",
            background: "none",
            cursor: "pointer",
            fontSize: "1rem",
            fontWeight: activeTab === "report" ? 600 : 400,
            color: activeTab === "report" ? "#2563eb" : "#64748b",
            borderBottom:
              activeTab === "report"
                ? "2px solid #2563eb"
                : "2px solid transparent",
            marginBottom: "-4px",
            transition: "0.2s",
          }}
        >
          <FileText size={18} /> Reports
        </button>
        <button
          onClick={() => {
            setActiveTab("utilities");
            setExpandedId(null);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "10px 20px",
            border: "none",
            background: "none",
            cursor: "pointer",
            fontSize: "1rem",
            fontWeight: activeTab === "utilities" ? 600 : 400,
            color: activeTab === "utilities" ? "#2563eb" : "#64748b",
            borderBottom:
              activeTab === "utilities"
                ? "2px solid #2563eb"
                : "2px solid transparent",
            marginBottom: "-4px",
            transition: "0.2s",
          }}
        >
          <Sliders size={18} /> Utilities
        </button>
      </div>

      <div className="filters-bar">
        <div className="search-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
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
              <option key={idx} value={hos}>
                {hos}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="loading">Loading queries...</div>
      ) : filteredQueries.length === 0 ? (
        <div className="empty-state">
          <Database size={48} />
          <p>
            No {activeTab} queries found. Click "Save New{" "}
            {activeTab === "report" ? "Report" : "Utility"}" to add one.
          </p>
        </div>
      ) : (
        <div style={{ maxHeight: "55vh", overflowY: "scroll" }}>
          <div className="accordion-list">
            {filteredQueries.map((item) => {
              const isExpanded = expandedId === item.id;
              const isCopied = copiedId === item.id;

              return (
                <div
                  key={item.id}
                  className={`accordion-item ${isExpanded ? "active" : ""}`}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    marginBottom: "12px",
                    background: "#fff",
                    overflow: "hidden",
                  }}
                >
                  {/* Accordion Header */}
                  <div
                    className="accordion-header"
                    onClick={() => toggleAccordion(item.id)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "16px",
                      cursor: "pointer",
                      background: "#f8fafc",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        flexWrap: "wrap",
                      }}
                    >
                      {isExpanded ? (
                        <ChevronUp size={18} />
                      ) : (
                        <ChevronDown size={18} />
                      )}
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "1.1rem",
                          fontWeight: 600,
                        }}
                      >
                        {item.title}
                      </h3>
                      {item.hos_use && (
                        <span className="hospital-badge">{item.hos_use}</span>
                      )}
                    </div>

                    <div
                      className="card-actions"
                      style={{ display: "flex", gap: "8px" }}
                    >
                      <button
                        onClick={(e) => handleCopy(e, item.id, item.query)}
                        className="btn-action-copy"
                        style={{
                          padding: "6px 12px",
                          borderRadius: "4px",
                          border: "1px solid #cbd5e1",
                          background: isCopied ? "#dcfce7" : "#fff",
                          color: isCopied ? "#15803d" : "#64748b",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "0.85rem",
                        }}
                      >
                        {isCopied ? <Check size={14} /> : <Copy size={14} />}
                        {isCopied ? "Copied!" : "Copy"}
                      </button>
                      <button
                        onClick={(e) => openEditModal(e, item)}
                        className="btn-action-edit"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, item.id)}
                        className="btn-action-delete"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Accordion Body */}
                  {isExpanded && (
                    <div
                      className="accordion-body"
                      style={{
                        padding: "16px",
                        borderTop: "1px solid #e2e8f0",
                      }}
                    >
                      <div className="card-body">
                        <pre
                          className="sql-preview"
                          style={{
                            background: "#0f172a",
                            color: "#f8fafc",
                            padding: "16px",
                            borderRadius: "6px",
                            overflowX: "auto",
                            margin: 0,
                          }}
                        >
                          <code>{item.query}</code>
                        </pre>
                      </div>
                      <div
                        className="card-footer"
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginTop: "12px",
                          fontSize: "0.85rem",
                          color: "#64748b",
                        }}
                      >
                        <span>By: {item.create_by}</span>
                        <span>
                          {new Date(item.create_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Save/Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>
                {editingId
                  ? `Edit ${activeTab === "report" ? "Report" : "Utility"}`
                  : `Save New ${activeTab === "report" ? "Report" : "Utility"}`}
              </h3>
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
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Fetch Patient Records"
                  required
                />
              </div>
              <div className="form-group">
                <label>Hospital Code / Name (Optional)</label>
                <input
                  type="text"
                  value={form.hos_use}
                  onChange={(e) =>
                    setForm({ ...form, hos_use: e.target.value })
                  }
                  placeholder="e.g. HOS-01"
                />
              </div>
              <div className="form-group">
                <label>Query Type</label>
                <select
                  value={form.query_type}
                  onChange={(e) =>
                    setForm({ ...form, query_type: e.target.value })
                  }
                >
                  <option value="report">Report</option>
                  <option value="utilities">Utility</option>
                </select>
              </div>
              <div className="form-group">
                <label>SQL Query</label>
                <textarea
                  value={form.query}
                  onChange={(e) => setForm({ ...form, query: e.target.value })}
                  placeholder="SELECT * FROM patients WHERE..."
                  rows={8}
                  required
                />
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingId ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
