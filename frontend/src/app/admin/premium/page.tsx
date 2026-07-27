"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit, Video, Eye, EyeOff, Save, X, ExternalLink } from 'lucide-react';
import Image from 'next/image';
import { adminService } from '@/services/admin.services';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

function getYoutubeId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;

  // 1. Match ?v= or &v= parameter anywhere in the query string
  const vMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (vMatch && vMatch[1]) return vMatch[1];

  // 2. Match path-based formats (live/, shorts/, embed/, v/, watch/, youtu.be/)
  const pathMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|shorts\/|live\/|v\/|watch\/))([a-zA-Z0-9_-]{11})/i);
  if (pathMatch && pathMatch[1]) return pathMatch[1];

  // 3. Fallback for any 11-char ID in YouTube link
  if (url.toLowerCase().includes('youtu')) {
    const fallbackMatch = url.match(/([a-zA-Z0-9_-]{11})/);
    if (fallbackMatch && fallbackMatch[1]) return fallbackMatch[1];
  }

  return null;
}

function getYoutubeThumbnail(url: string): string {
  const id = getYoutubeId(url);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '';
}

const EMPTY_FORM = {
  title: '',
  description: '',
  video_url: '',
  release_date: '',
  is_published: false,
};

export default function AdminPremiumPage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [previewThumb, setPreviewThumb] = useState('');

  // Plan State
  const [plan, setPlan] = useState<any>(null);
  const [planSaving, setPlanSaving] = useState(false);
  const [editPlanPrice, setEditPlanPrice] = useState('');
  const [editPlanDesc, setEditPlanDesc] = useState('');

  const fetchData = async () => {
    try {
      const [videosData, plansData] = await Promise.all([
        adminService.getPremiumVideos(),
        adminService.getSubscriptionPlans()
      ]);
      setVideos(videosData);
      if (plansData.length > 0) {
        setPlan(plansData[0]);
        setEditPlanPrice(plansData[0].price);
        setEditPlanDesc(plansData[0].description);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Live thumbnail preview from YouTube URL
  useEffect(() => {
    if (form.video_url) {
      const thumb = getYoutubeThumbnail(form.video_url);
      setPreviewThumb(thumb);
    } else {
      setPreviewThumb('');
    }
  }, [form.video_url]);

  const openNew = () => {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (video: any) => {
    setForm({
      title: video.title || '',
      description: video.description || '',
      video_url: video.video_url || '',
      release_date: video.release_date ? video.release_date.slice(0, 16) : '',
      is_published: video.is_published || false,
    });
    setEditingId(video.id);
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (editingId) {
        const updated = await adminService.updatePremiumVideo(editingId, payload);
        setVideos(videos.map(v => v.id === editingId ? updated : v));
      } else {
        const created = await adminService.createPremiumVideo(payload);
        setVideos([created, ...videos]);
      }
      setShowForm(false);
    } catch (error) {
      console.error("Error saving video:", error);
      alert("Error al guardar el video.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("¿Eliminar este video permanentemente?")) {
      try {
        await adminService.deletePremiumVideo(id);
        setVideos(videos.filter(v => v.id !== id));
      } catch (error) {
        alert("Error al eliminar.");
      }
    }
  };

  const togglePublish = async (video: any) => {
    try {
      const updated = await adminService.updatePremiumVideo(video.id, { is_published: !video.is_published });
      setVideos(videos.map(v => v.id === video.id ? { ...v, is_published: updated.is_published } : v));
    } catch (error) {
      alert("Error al cambiar estado.");
    }
  };

  const handleUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan) return;
    setPlanSaving(true);
    try {
      const updated = await adminService.updateSubscriptionPlan(plan.id, {
        price: Number(editPlanPrice),
        description: editPlanDesc
      });
      setPlan(updated);
      alert("Plan actualizado exitosamente");
    } catch (error) {
      console.error("Error updating plan:", error);
      alert("Error al actualizar el plan");
    } finally {
      setPlanSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <AdminPageHeader 
        title="Videos Premium"
        subtitle="Gestiona los links de contenido exclusivo para miembros de YouTube."
        icon={<Video className="w-8 h-8 text-red-500" />}
      >
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-800 text-white px-5 py-2.5 text-sm font-bold uppercase tracking-wider rounded-lg hover:from-red-500 hover:to-red-700 transition-all shadow-lg shadow-red-950/20 active:scale-95 transform w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          Agregar Video
        </button>
      </AdminPageHeader>

      {/* Plan Config */}
      {plan && (
        <div className="bg-zinc-900 border border-white/10 rounded-xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">Costo y Descripción de la Membresía</h2>
          <form onSubmit={handleUpdatePlan} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 block">Costo (MXN)</label>
              <input 
                type="number"
                step="0.01"
                required
                value={editPlanPrice}
                onChange={e => setEditPlanPrice(e.target.value)}
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-red-500 text-sm"
              />
            </div>
            <div className="md:col-span-7">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 block">Descripción Breve</label>
              <input 
                type="text"
                required
                value={editPlanDesc}
                onChange={e => setEditPlanDesc(e.target.value)}
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-red-500 text-sm"
              />
            </div>
            <div className="md:col-span-3">
              <button 
                type="submit" 
                disabled={planSaving}
                className="w-full flex items-center justify-center gap-2 bg-white/10 text-white py-2.5 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-white/20 transition-colors disabled:opacity-50 border border-white/20"
              >
                <Save className="w-3.5 h-3.5" />
                {planSaving ? 'Guardando...' : 'Actualizar Plan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-white/10 rounded-xl p-5">
          <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Total Videos</p>
          <p className="text-3xl font-black text-white mt-1">{videos.length}</p>
        </div>
        <div className="bg-zinc-900 border border-white/10 rounded-xl p-5">
          <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Publicados</p>
          <p className="text-3xl font-black text-green-500 mt-1">{videos.filter(v => v.is_published).length}</p>
        </div>
        <div className="bg-zinc-900 border border-white/10 rounded-xl p-5">
          <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Borradores</p>
          <p className="text-3xl font-black text-yellow-500 mt-1">{videos.filter(v => !v.is_published).length}</p>
        </div>
      </div>

      {/* Videos Grid */}
      {loading ? (
        <div className="text-zinc-500 py-8">Cargando videos...</div>
      ) : videos.length === 0 ? (
        <div className="bg-zinc-950 border border-white/10 rounded-xl p-12 text-center text-zinc-500">
          No hay videos aún. Agrega el primero con el botón de arriba.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {videos.map(video => {
            const thumb = video.video_url ? getYoutubeThumbnail(video.video_url) : '';
            return (
              <motion.div
                key={video.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-zinc-950 border border-white/10 rounded-xl overflow-hidden group"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-zinc-900">
                  {thumb ? (
                    <Image src={thumb} alt={video.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Video className="w-12 h-12 text-zinc-700" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40" />
                  {/* Published badge */}
                  <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-widest ${video.is_published ? 'bg-green-500/90 text-white' : 'bg-yellow-500/90 text-black'}`}>
                    {video.is_published ? 'Publicado' : 'Borrador'}
                  </div>
                  {/* Open in YouTube */}
                  {video.video_url && (
                    <a
                      href={video.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute top-3 right-3 w-8 h-8 bg-black/70 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-bold text-white text-sm truncate">{video.title}</h3>
                  {video.description && (
                    <p className="text-zinc-500 text-xs mt-1 line-clamp-2">{video.description}</p>
                  )}
                  <p className="text-zinc-600 text-xs mt-2">
                    {video.release_date ? new Date(video.release_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Sin fecha'}
                  </p>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/5">
                    <button
                      onClick={() => togglePublish(video)}
                      className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${video.is_published ? 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20' : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'}`}
                    >
                      {video.is_published ? <><EyeOff className="w-3.5 h-3.5" />Despublicar</> : <><Eye className="w-3.5 h-3.5" />Publicar</>}
                    </button>
                    <button
                      onClick={() => openEdit(video)}
                      className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-white/5 text-zinc-300 hover:bg-white/10 transition-colors ml-auto"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(video.id)}
                      className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* === FORM MODAL === */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
              onClick={() => setShowForm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className="bg-zinc-950 border border-white/10 rounded-2xl p-8 w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-black uppercase tracking-tight text-white">
                    {editingId ? 'Editar Video' : 'Nuevo Video Premium'}
                  </h2>
                  <button onClick={() => setShowForm(false)} className="text-zinc-500 hover:text-white transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSave} className="space-y-5">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 block">Título del Video</label>
                    <input
                      required
                      type="text"
                      value={form.title}
                      onChange={e => setForm({ ...form, title: e.target.value })}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
                      placeholder="Ej. Backstage: Gran Noche de Campeones"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 block flex items-center gap-2">
                      <Video className="w-4 h-4 text-red-500" />
                      Link de YouTube (Para Miembros)
                    </label>
                    <input
                      required
                      type="url"
                      value={form.video_url}
                      onChange={e => setForm({ ...form, video_url: e.target.value })}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
                      placeholder="https://www.youtube.com/watch?v=..."
                    />
                    <p className="text-zinc-600 text-xs mt-1">Pega el link del video exclusivo para miembros de tu canal de YouTube.</p>
                  </div>

                  {/* YouTube thumbnail preview */}
                  {previewThumb && (
                    <div className="rounded-xl overflow-hidden border border-white/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={previewThumb} alt="Preview" className="w-full aspect-video object-cover" />
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 block">Descripción (Opcional)</label>
                    <textarea
                      rows={3}
                      value={form.description}
                      onChange={e => setForm({ ...form, description: e.target.value })}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors resize-none"
                      placeholder="Breve descripción del contenido..."
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 block">Fecha de Lanzamiento</label>
                    <input
                      required
                      type="datetime-local"
                      value={form.release_date}
                      onChange={e => setForm({ ...form, release_date: e.target.value })}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
                    />
                  </div>

                  <div className="flex items-center gap-3 bg-zinc-900 border border-white/10 rounded-xl px-4 py-3">
                    <input
                      type="checkbox"
                      id="is_published"
                      checked={form.is_published}
                      onChange={e => setForm({ ...form, is_published: e.target.checked })}
                      className="w-5 h-5 accent-red-500"
                    />
                    <label htmlFor="is_published" className="text-white font-medium text-sm">
                      Publicar ahora (visible para miembros Premium)
                    </label>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="flex-1 border border-white/10 text-zinc-400 hover:text-white py-3 rounded-xl font-bold uppercase tracking-widest text-sm transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 flex items-center justify-center gap-2 bg-white text-black py-3 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-zinc-200 transition-colors disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Guardar Video'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
