"use client";

import { useState, useEffect, useCallback } from "react";

interface Tutorial {
  id: string;
  title: string;
  description: string | null;
  youtube_url: string | null;
  category: "general" | "premium";
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const categoryLabels: Record<string, string> = {
  general: "General",
  premium: "Premium",
};

const categoryBadgeStyles: Record<string, string> = {
  general: "bg-accent-blue/15 text-accent-blue border-accent-blue/30",
  premium: "bg-accent-purple/15 text-accent-purple border-accent-purple/30",
};

/**
 * Extract YouTube video ID from various URL formats
 */
function getYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function TutorialsAdminClient() {
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("");

  // New tutorial form
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formYoutubeUrl, setFormYoutubeUrl] = useState("");
  const [formCategory, setFormCategory] = useState<"general" | "premium">(
    "general"
  );
  const [formSaving, setFormSaving] = useState(false);

  // Edit mode
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editYoutubeUrl, setEditYoutubeUrl] = useState("");
  const [editCategory, setEditCategory] = useState<"general" | "premium">(
    "general"
  );

  const fetchTutorials = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (categoryFilter) params.set("category", categoryFilter);

    try {
      const res = await fetch(`/api/super-admin/tutorials?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTutorials(data.tutorials);
      }
    } finally {
      setLoading(false);
    }
  }, [categoryFilter]);

  useEffect(() => {
    fetchTutorials();
  }, [fetchTutorials]);

  // Clear feedback after 3s
  useEffect(() => {
    if (feedback) {
      const t = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(t);
    }
  }, [feedback]);

  const handleCreate = async () => {
    if (!formTitle.trim()) return;
    setFormSaving(true);
    try {
      const res = await fetch("/api/super-admin/tutorials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle,
          description: formDescription || null,
          youtube_url: formYoutubeUrl || null,
          category: formCategory,
        }),
      });
      if (res.ok) {
        setFeedback({ type: "success", message: "Tutorial creado" });
        setFormTitle("");
        setFormDescription("");
        setFormYoutubeUrl("");
        setFormCategory("general");
        setShowForm(false);
        fetchTutorials();
      } else {
        const err = await res.json();
        setFeedback({ type: "error", message: err.error || "Error al crear" });
      }
    } finally {
      setFormSaving(false);
    }
  };

  const handleTogglePublish = async (
    tutorial: Tutorial
  ) => {
    setActionLoading(tutorial.id);
    try {
      const res = await fetch(`/api/super-admin/tutorials/${tutorial.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_published: !tutorial.is_published }),
      });
      if (res.ok) {
        setFeedback({
          type: "success",
          message: tutorial.is_published ? "Despublicado" : "Publicado",
        });
        fetchTutorials();
      } else {
        const err = await res.json();
        setFeedback({ type: "error", message: err.error || "Error" });
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (tutorial: Tutorial) => {
    if (
      !confirm(
        `¿Eliminar el tutorial "${tutorial.title}"? Esta acción no se puede deshacer.`
      )
    )
      return;

    setActionLoading(tutorial.id);
    try {
      const res = await fetch(`/api/super-admin/tutorials/${tutorial.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setFeedback({ type: "success", message: "Tutorial eliminado" });
        fetchTutorials();
      } else {
        const err = await res.json();
        setFeedback({ type: "error", message: err.error || "Error" });
      }
    } finally {
      setActionLoading(null);
    }
  };

  const startEdit = (tutorial: Tutorial) => {
    setEditId(tutorial.id);
    setEditTitle(tutorial.title);
    setEditDescription(tutorial.description || "");
    setEditYoutubeUrl(tutorial.youtube_url || "");
    setEditCategory(tutorial.category);
  };

  const cancelEdit = () => {
    setEditId(null);
  };

  const handleSaveEdit = async () => {
    if (!editId || !editTitle.trim()) return;
    setActionLoading(editId);
    try {
      const res = await fetch(`/api/super-admin/tutorials/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription || null,
          youtube_url: editYoutubeUrl || null,
          category: editCategory,
        }),
      });
      if (res.ok) {
        setFeedback({ type: "success", message: "Tutorial actualizado" });
        setEditId(null);
        fetchTutorials();
      } else {
        const err = await res.json();
        setFeedback({ type: "error", message: err.error || "Error" });
      }
    } finally {
      setActionLoading(null);
    }
  };

  // Separate by category for display
  const generalTutorials = tutorials.filter((t) => t.category === "general");
  const premiumTutorials = tutorials.filter((t) => t.category === "premium");

  const renderTutorialRow = (tutorial: Tutorial) => {
    const isEditing = editId === tutorial.id;
    const videoId = tutorial.youtube_url
      ? getYouTubeId(tutorial.youtube_url)
      : null;

    if (isEditing) {
      return (
        <tr
          key={tutorial.id}
          className="border-b border-border-glass/50 bg-white/[0.03]"
        >
          <td className="px-4 py-3" colSpan={5}>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Título"
                  className="px-3 py-2 rounded-lg bg-white/[0.05] border border-border-glass text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
                />
                <select
                  value={editCategory}
                  onChange={(e) =>
                    setEditCategory(e.target.value as "general" | "premium")
                  }
                  className="px-3 py-2 rounded-lg bg-white/[0.05] border border-border-glass text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
                >
                  <option value="general">General</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
              <input
                type="text"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Descripción (opcional)"
                className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-border-glass text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
              />
              <input
                type="text"
                value={editYoutubeUrl}
                onChange={(e) => setEditYoutubeUrl(e.target.value)}
                placeholder="URL de YouTube (ej: https://youtube.com/watch?v=...)"
                className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-border-glass text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={cancelEdit}
                  className="px-3 py-1.5 text-xs rounded-lg border border-border-glass text-text-secondary hover:bg-white/[0.05] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={actionLoading === tutorial.id}
                  className="px-3 py-1.5 text-xs rounded-lg bg-accent-blue/15 text-accent-blue border border-accent-blue/30 hover:bg-accent-blue/25 disabled:opacity-50 transition-colors"
                >
                  Guardar
                </button>
              </div>
            </div>
          </td>
        </tr>
      );
    }

    return (
      <tr
        key={tutorial.id}
        className="border-b border-border-glass/50 hover:bg-white/[0.03] transition-colors"
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            {videoId ? (
              <div className="w-20 h-12 rounded-lg overflow-hidden bg-white/[0.05] flex-shrink-0">
                <img
                  src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-20 h-12 rounded-lg bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-text-muted"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z"
                  />
                </svg>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-text-primary">
                {tutorial.title}
              </p>
              {tutorial.description && (
                <p className="text-xs text-text-muted mt-0.5 line-clamp-1">
                  {tutorial.description}
                </p>
              )}
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <span
            className={`px-2 py-0.5 text-xs font-medium rounded-full border ${categoryBadgeStyles[tutorial.category]}`}
          >
            {categoryLabels[tutorial.category]}
          </span>
        </td>
        <td className="px-4 py-3">
          <span
            className={`px-2 py-0.5 text-xs rounded-full border ${
              tutorial.is_published
                ? "bg-accent-green/15 text-accent-green border-accent-green/30"
                : "bg-white/[0.05] text-text-muted border-border-glass"
            }`}
          >
            {tutorial.is_published ? "Publicado" : "Borrador"}
          </span>
        </td>
        <td className="px-4 py-3">
          {tutorial.youtube_url ? (
            <span className="text-xs text-accent-green">Con video</span>
          ) : (
            <span className="text-xs text-text-muted">Sin video</span>
          )}
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => startEdit(tutorial)}
              disabled={actionLoading === tutorial.id}
              className="px-2 py-1 text-xs rounded-lg border border-border-glass text-text-secondary hover:bg-white/[0.05] disabled:opacity-50 transition-colors"
            >
              Editar
            </button>
            <button
              onClick={() => handleTogglePublish(tutorial)}
              disabled={actionLoading === tutorial.id}
              className={`px-2 py-1 text-xs rounded-lg border disabled:opacity-50 transition-colors ${
                tutorial.is_published
                  ? "border-accent-orange/30 text-accent-orange hover:bg-accent-orange/10"
                  : "border-accent-green/30 text-accent-green hover:bg-accent-green/10"
              }`}
            >
              {tutorial.is_published ? "Despublicar" : "Publicar"}
            </button>
            <button
              onClick={() => handleDelete(tutorial)}
              disabled={actionLoading === tutorial.id}
              className="px-2 py-1 text-xs rounded-lg border border-accent-red/30 text-accent-red hover:bg-accent-red/10 disabled:opacity-50 transition-colors"
            >
              Eliminar
            </button>
          </div>
        </td>
      </tr>
    );
  };

  const renderSection = (title: string, items: Tutorial[], badgeClass: string) => {
    if (categoryFilter && items.length === 0) return null;
    if (!categoryFilter && items.length === 0) return null;

    return (
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
          <span
            className={`px-2 py-0.5 text-xs font-medium rounded-full border ${badgeClass}`}
          >
            {items.length}
          </span>
        </div>
        <div className="bg-bg-glass backdrop-blur-xl border border-border-glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-glass">
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">
                    Tutorial
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">
                    Categoría
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">
                    Video
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>{items.map(renderTutorialRow)}</tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Tutoriales</h1>
          <p className="text-text-secondary mt-1">
            Gestiona los videos tutoriales para todos los tenants (
            {tutorials.length} total)
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 text-sm font-medium rounded-xl bg-accent-blue/15 text-accent-blue border border-accent-blue/30 hover:bg-accent-blue/25 transition-colors"
        >
          {showForm ? "Cancelar" : "+ Nuevo tutorial"}
        </button>
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className={`p-3 rounded-xl text-sm mb-4 ${
            feedback.type === "success"
              ? "bg-accent-green/10 border border-accent-green/20 text-accent-green"
              : "bg-accent-red/10 border border-accent-red/20 text-accent-red"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <div className="bg-bg-glass backdrop-blur-xl border border-border-glass rounded-2xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-text-primary mb-4">
            Nuevo tutorial
          </h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Título del tutorial"
                className="px-3 py-2.5 rounded-xl bg-white/[0.05] border border-border-glass text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
              />
              <select
                value={formCategory}
                onChange={(e) =>
                  setFormCategory(e.target.value as "general" | "premium")
                }
                className="px-3 py-2.5 rounded-xl bg-white/[0.05] border border-border-glass text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
              >
                <option value="general">General</option>
                <option value="premium">Premium</option>
              </select>
            </div>
            <input
              type="text"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Descripción corta (opcional)"
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.05] border border-border-glass text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
            />
            <input
              type="text"
              value={formYoutubeUrl}
              onChange={(e) => setFormYoutubeUrl(e.target.value)}
              placeholder="URL de YouTube (ej: https://youtube.com/watch?v=abc123)"
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.05] border border-border-glass text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
            />
            <div className="flex justify-end">
              <button
                onClick={handleCreate}
                disabled={formSaving || !formTitle.trim()}
                className="px-4 py-2 text-sm font-medium rounded-xl bg-accent-blue/15 text-accent-blue border border-accent-blue/30 hover:bg-accent-blue/25 disabled:opacity-50 transition-colors"
              >
                {formSaving ? "Creando..." : "Crear tutorial"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-3 mb-6">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-white/[0.05] border border-border-glass text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
        >
          <option value="">Todas las categorías</option>
          <option value="general">General</option>
          <option value="premium">Premium</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-text-muted">Cargando...</div>
      ) : tutorials.length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          No hay tutoriales. Crea uno nuevo para comenzar.
        </div>
      ) : (
        <>
          {(!categoryFilter || categoryFilter === "general") &&
            renderSection(
              "Tutoriales Generales",
              generalTutorials,
              "bg-accent-blue/15 text-accent-blue border-accent-blue/30"
            )}
          {(!categoryFilter || categoryFilter === "premium") &&
            renderSection(
              "Tutoriales Premium",
              premiumTutorials,
              "bg-accent-purple/15 text-accent-purple border-accent-purple/30"
            )}
        </>
      )}
    </div>
  );
}
