"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, X, Trash2, Image as ImageIcon, Check } from 'lucide-react';
import { galleryService } from '@/services/gallery.services';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export default function AdminGalleryPage() {
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [colSpan, setColSpan] = useState('md:col-span-1');
  const [rowSpan, setRowSpan] = useState('md:row-span-1');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      const data = await galleryService.getImages();
      setImages(data);
    } catch (error) {
      console.error("Error fetching images", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('title', title);
      formData.append('category', category);
      formData.append('col_span', colSpan);
      formData.append('row_span', rowSpan);
      formData.append('image', file);

      await galleryService.createImage(formData);
      
      // Reset form
      setTitle('');
      setCategory('');
      setColSpan('md:col-span-1');
      setRowSpan('md:row-span-1');
      setFile(null);
      setShowForm(false);
      
      // Refresh list
      fetchImages();
    } catch (error: any) {
      console.error("Error creating image", error);
      const errMsg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      alert(`Hubo un error al subir la imagen: ${errMsg}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta imagen?')) return;
    
    try {
      await galleryService.deleteImage(id);
      fetchImages();
    } catch (error) {
      console.error("Error deleting image", error);
      alert("No se pudo eliminar la imagen");
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader 
        title="Galería"
        subtitle="Gestiona las imágenes de la galería pública"
        actionLabel={showForm ? 'Cancelar' : 'Nueva Imagen'}
        actionOnClick={() => setShowForm(!showForm)}
        actionIcon={showForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
      />

      {showForm && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900 border border-white/10 rounded-2xl p-6"
        >
          <h2 className="text-xl font-bold mb-4 uppercase tracking-wider text-red-500">Subir Nueva Imagen</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1 uppercase tracking-wider">Título</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500 transition-colors"
                  placeholder="Ej: El Choque"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1 uppercase tracking-wider">Categoría</label>
                <input 
                  type="text" 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500 transition-colors"
                  placeholder="Ej: Acción"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1 uppercase tracking-wider">Ancho (Columnas)</label>
                <select 
                  value={colSpan}
                  onChange={(e) => setColSpan(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500 transition-colors"
                >
                  <option value="md:col-span-1">Normal (1 columna)</option>
                  <option value="md:col-span-2">Ancho (2 columnas)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1 uppercase tracking-wider">Alto (Filas)</label>
                <select 
                  value={rowSpan}
                  onChange={(e) => setRowSpan(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500 transition-colors"
                >
                  <option value="md:row-span-1">Normal (1 fila)</option>
                  <option value="md:row-span-2">Alto (2 filas)</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-zinc-400 mb-1 uppercase tracking-wider">Imagen</label>
                <div className="border-2 border-dashed border-white/20 rounded-xl p-8 flex flex-col items-center justify-center bg-black/50 hover:bg-black transition-colors relative cursor-pointer group">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                    required
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  {file ? (
                    <div className="text-center">
                      <Check className="w-8 h-8 text-green-500 mx-auto mb-2" />
                      <p className="text-white font-medium">{file.name}</p>
                      <p className="text-zinc-500 text-sm mt-1">Haz clic para cambiar de archivo</p>
                    </div>
                  ) : (
                    <div className="text-center group-hover:text-white transition-colors text-zinc-400">
                      <ImageIcon className="w-10 h-10 mx-auto mb-3 opacity-50" />
                      <p className="font-medium uppercase tracking-wider">Subir Archivo</p>
                      <p className="text-sm mt-1 opacity-70">PNG, JPG, WEBP o GIF (Max 5MB)</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end mt-6">
              <button 
                type="submit"
                disabled={submitting || !file}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-bold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Subiendo...' : 'Guardar Imagen'}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Galería Preview */}
      {loading ? (
        <div className="text-center text-zinc-500 py-12">Cargando imágenes...</div>
      ) : images.length === 0 ? (
        <div className="text-center text-zinc-500 py-12 bg-zinc-900/30 rounded-2xl border border-white/5">
          No hay imágenes en la galería. Haz clic en "Nueva Imagen" para empezar.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {images.map((img) => (
            <div key={img.id} className="relative group rounded-lg overflow-hidden border border-white/10 aspect-square bg-zinc-900">
              <img 
                src={img.image} 
                alt={img.title}
                className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-80"></div>
              
              <div className="absolute bottom-0 left-0 p-3 w-full">
                <span className="text-red-500 text-[10px] font-bold uppercase tracking-widest">{img.category}</span>
                <p className="text-white font-bold leading-tight truncate">{img.title}</p>
                <div className="text-zinc-400 text-xs mt-1">
                  Grid: {img.col_span.replace('md:col-span-', '')}x{img.row_span.replace('md:row-span-', '')}
                </div>
              </div>

              <button 
                onClick={() => handleDelete(img.id)}
                className="absolute top-2 right-2 p-2 bg-red-600/90 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                title="Eliminar"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
