"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  Image as ImageIcon, 
  Loader2, 
  Search, 
  Calendar, 
  ExternalLink,
  ToggleLeft,
  ToggleRight,
  AlertCircle
} from 'lucide-react';
import { eventsService } from '@/services/events.services';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import Link from 'next/link';

interface EventPost {
  id: number;
  title: string;
  image: string;
  image_url: string;
  event: number;
  event_title: string;
  event_date: string;
  event_location: string;
  is_active: boolean;
  order: number;
  created_at: string;
}

const generateSlug = (title: string) => {
  if (!title) return '';
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
};

export default function AdminEventPostsPage() {
  const [posts, setPosts] = useState<EventPost[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<EventPost | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [eventId, setEventId] = useState<string>('');
  const [order, setOrder] = useState('0');
  const [isActive, setIsActive] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Delete modal state
  const [deletingPost, setDeletingPost] = useState<EventPost | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [postsData, eventsData] = await Promise.all([
        eventsService.getEventPosts(),
        eventsService.getEvents()
      ]);
      setPosts(postsData.results || postsData || []);
      setEvents(eventsData.results || eventsData || []);
    } catch (err) {
      console.error("Error al cargar datos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingPost(null);
    setTitle('');
    setEventId(events.length > 0 ? events[0].id.toString() : '');
    setOrder('0');
    setIsActive(true);
    setImageFile(null);
    setImagePreview(null);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (post: EventPost) => {
    setEditingPost(post);
    setTitle(post.title || '');
    setEventId(post.event ? post.event.toString() : '');
    setOrder(post.order ? post.order.toString() : '0');
    setIsActive(post.is_active);
    setImageFile(null);
    setImagePreview(post.image_url);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSavePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId) {
      setFormError('Por favor selecciona un evento asociado.');
      return;
    }

    if (!editingPost && !imageFile) {
      setFormError('Por favor selecciona una imagen para el post promocional.');
      return;
    }

    setFormLoading(true);
    setFormError(null);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('event', eventId);
      formData.append('order', order || '0');
      formData.append('is_active', isActive ? 'true' : 'false');
      
      if (imageFile) {
        formData.append('image', imageFile);
      }

      if (editingPost) {
        await eventsService.updateEventPost(editingPost.id, formData);
      } else {
        await eventsService.createEventPost(formData);
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error("Error al guardar post de evento:", err);
      setFormError(err.response?.data?.detail || 'Hubo un error al guardar el post.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleActive = async (post: EventPost) => {
    try {
      const formData = new FormData();
      formData.append('is_active', (!post.is_active).toString());
      await eventsService.updateEventPost(post.id, formData);
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, is_active: !p.is_active } : p));
    } catch (err) {
      console.error("Error al cambiar estado:", err);
    }
  };

  const handleDeletePost = async () => {
    if (!deletingPost) return;
    setDeleteLoading(true);
    try {
      await eventsService.deleteEventPost(deletingPost.id);
      setPosts(prev => prev.filter(p => p.id !== deletingPost.id));
      setDeletingPost(null);
    } catch (err) {
      console.error("Error al eliminar post:", err);
      alert("No se pudo eliminar el post.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredPosts = posts.filter(p => {
    const query = searchQuery.toLowerCase();
    return (
      (p.title && p.title.toLowerCase().includes(query)) ||
      (p.event_title && p.event_title.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader 
        title="Posts Promocionales de Eventos" 
        subtitle="Sube imágenes promocionales vinculadas a eventos. Al hacer clic en el sitio público, redirigirán directamente a la compra de boletos del evento." 
      />

      {/* Barra de Búsqueda y Botón Nuevo */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-zinc-950 border border-white/10 p-4 rounded-2xl">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input 
            type="text"
            placeholder="Buscar por título o evento..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black border border-white/10 pl-10 pr-4 py-2.5 rounded-xl text-white text-sm focus:outline-none focus:border-red-500 transition-colors"
          />
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="bg-red-600 hover:bg-red-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-600/20"
        >
          <Plus className="w-4 h-4" /> Subir Nuevo Post
        </button>
      </div>

      {/* Grid de Posts */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="bg-zinc-950 border border-white/10 rounded-2xl p-12 text-center">
          <ImageIcon className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white uppercase">No hay posts promocionales</h3>
          <p className="text-zinc-400 text-sm mt-1">Sube una imagen promocional asociada a un evento con el botón "Subir Nuevo Post".</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post) => {
            const eventSlug = generateSlug(post.event_title);
            const targetUrl = `/eventos/${eventSlug}`;

            return (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-zinc-950 border rounded-2xl overflow-hidden flex flex-col justify-between transition-all ${
                  post.is_active ? 'border-white/10 hover:border-white/30' : 'border-red-500/20 opacity-70'
                }`}
              >
                <div>
                  {/* Vista Previa de la Imagen */}
                  <div className="relative aspect-video bg-zinc-900 overflow-hidden group">
                    {post.image_url ? (
                      <img 
                        src={post.image_url} 
                        alt={post.title || post.event_title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600">
                        <ImageIcon className="w-10 h-10" />
                      </div>
                    )}

                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      <button
                        onClick={() => handleToggleActive(post)}
                        title={post.is_active ? 'Desactivar post' : 'Activar post'}
                        className="bg-black/60 backdrop-blur-md rounded-full p-1 border border-white/10 text-white hover:scale-110 transition-transform"
                      >
                        {post.is_active ? (
                          <ToggleRight className="w-6 h-6 text-green-400" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 text-zinc-500" />
                        )}
                      </button>
                    </div>

                    {!post.is_active && (
                      <div className="absolute top-3 left-3 bg-red-950/80 border border-red-500/30 text-red-400 text-[10px] font-bold uppercase px-2 py-0.5 rounded backdrop-blur-md">
                        Inactivo
                      </div>
                    )}
                  </div>

                  {/* Información del Evento Asociado */}
                  <div className="p-5 space-y-3">
                    <h3 className="font-bold text-lg text-white leading-snug">
                      {post.title || post.event_title || 'Post sin título'}
                    </h3>

                    <div className="p-3 bg-zinc-900/60 border border-white/5 rounded-xl space-y-1.5 text-xs text-zinc-300">
                      <div className="flex items-center gap-2 font-semibold text-red-400 uppercase tracking-wider">
                        <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>Evento Asociado: {post.event_title}</span>
                      </div>
                      
                      {post.event_date && (
                        <p className="text-zinc-400 text-[11px]">
                          Fecha: {new Date(post.event_date).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
                      <span>Redirecciona a:</span>
                      <Link 
                        href={targetUrl} 
                        target="_blank"
                        className="text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                      >
                        {targetUrl} <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                <div className="p-4 border-t border-white/10 flex gap-2 justify-end bg-zinc-900/30">
                  <button
                    onClick={() => handleOpenEditModal(post)}
                    className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors border border-white/10 text-xs font-bold flex items-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Editar
                  </button>
                  <button
                    onClick={() => setDeletingPost(post)}
                    className="px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 transition-colors border border-red-800/30 text-xs font-bold flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Eliminar
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal Crear / Editar Post */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-white/20 rounded-2xl w-full max-w-lg p-6 space-y-6 shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <h3 className="text-xl font-bold uppercase text-white flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-red-500" />
                  {editingPost ? 'Editar Post Promocional' : 'Subir Nuevo Post Promocional'}
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="text-zinc-400 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSavePost} className="space-y-4">
                {/* Evento Asociado (Obligatorio) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Evento Asociado *</label>
                  <select
                    required
                    value={eventId}
                    onChange={(e) => setEventId(e.target.value)}
                    className="w-full bg-black border border-white/20 p-3 rounded-xl text-white text-sm focus:outline-none focus:border-red-500"
                  >
                    <option value="">-- Selecciona el Evento --</option>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title} ({new Date(ev.date_time).toLocaleDateString('es-MX')})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-zinc-500">
                    Al hacer clic en la imagen promocional, el usuario irá a la pasarela de boletos de este evento.
                  </p>
                </div>

                {/* Selección de Imagen */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Imagen del Post Promocional *</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full text-xs text-zinc-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-white hover:file:bg-zinc-700"
                  />
                  {imagePreview && (
                    <div className="mt-3 aspect-video w-full rounded-xl overflow-hidden bg-zinc-900 border border-white/10">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                {/* Título opcional */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Título / Nombre Corto (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej. Cartelera Oficial Guerra de Titanes"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-black border border-white/20 p-3 rounded-xl text-white text-sm focus:outline-none focus:border-red-500"
                  />
                </div>

                {/* Orden & Activo */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Orden de Visualización</label>
                    <input
                      type="number"
                      min="0"
                      value={order}
                      onChange={(e) => setOrder(e.target.value)}
                      className="w-full bg-black border border-white/20 p-3 rounded-xl text-white text-sm focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div className="flex items-center pt-6">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="w-4 h-4 rounded border-white/20 bg-black text-red-600 focus:ring-0"
                      />
                      <span className="text-xs font-bold text-white uppercase">Post Activo</span>
                    </label>
                  </div>
                </div>

                {/* Botones de Acción */}
                <div className="flex gap-3 pt-4 border-t border-white/10 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl border border-white/10 text-zinc-400 hover:text-white font-bold text-sm transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 text-white font-bold text-sm transition-all flex items-center gap-2"
                  >
                    {formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar Post'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Confirmar Eliminar */}
      <AnimatePresence>
        {deletingPost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-red-500/30 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-center"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-500">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold uppercase text-white">¿Eliminar Post Promocional?</h3>
              <p className="text-sm text-zinc-400">
                ¿Estás seguro de que deseas eliminar este post asociado al evento <strong className="text-white">{deletingPost.event_title}</strong>?
              </p>
              <div className="flex gap-3 pt-3 justify-center">
                <button
                  onClick={() => setDeletingPost(null)}
                  className="px-5 py-2.5 rounded-xl border border-white/10 text-zinc-400 hover:text-white font-bold text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeletePost}
                  disabled={deleteLoading}
                  className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 text-white font-bold text-sm transition-all flex items-center gap-2"
                >
                  {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sí, Eliminar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
