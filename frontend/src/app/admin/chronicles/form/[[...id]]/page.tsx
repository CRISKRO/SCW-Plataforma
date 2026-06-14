"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { eventsService } from '@/services/events.services';

export default function ChronicleFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id ? params.id[0] : null;
  const isEdit = !!id;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    writer: '',
    photographer: '',
    event_id: '',
  });
  
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [eventsList, setEventsList] = useState<any[]>([]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const events = await eventsService.getEvents();
        setEventsList(events);
      } catch (e) {
        console.error(e);
      }
    };
    fetchEvents();

    if (isEdit) {
      const fetchChronicle = async () => {
        try {
          const data = await eventsService.getChronicleDetails(Number(id));
          setFormData({
            title: data.title || '',
            content: data.content || '',
            writer: data.writer || '',
            photographer: data.photographer || '',
            event_id: data.event ? String(data.event) : '',
          });
          if (data.image_url) {
            setImageUrl(data.image_url);
          }
        } catch (error) {
          console.error("Error loading chronicle:", error);
          alert("No se pudo cargar la información de la crónica.");
        } finally {
          setLoading(false);
        }
      };
      fetchChronicle();
    }
  }, [id, isEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'file') {
      const fileInput = e.target as HTMLInputElement;
      if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        setImageFile(file);
        setImageUrl(URL.createObjectURL(file));
      }
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('content', formData.content);
      data.append('writer', formData.writer);
      data.append('photographer', formData.photographer);
      if (formData.event_id) {
        data.append('event', formData.event_id);
      }
      
      if (imageFile) {
        data.append('image', imageFile);
      }

      if (isEdit) {
        await eventsService.updateChronicle(Number(id), data);
      } else {
        await eventsService.createChronicle(data);
      }
      router.push('/admin/chronicles');
    } catch (error) {
      console.error("Error saving chronicle:", error);
      alert("Hubo un error al guardar la crónica.");
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-zinc-500 py-8">Cargando...</div>;
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/chronicles" className="text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            {isEdit ? 'Editar Crónica' : 'Nueva Crónica'}
          </h1>
          <p className="text-zinc-400 mt-1">Publica una reseña de un evento pasado.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-zinc-950 p-8 rounded-xl border border-white/10">
        
        <div className="space-y-2">
          <label className="text-sm font-bold text-white uppercase tracking-widest">Título</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
            placeholder="Ej. Reseña de Choque de Campeones"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-white uppercase tracking-widest">Escritor / Autor</label>
            <input
              type="text"
              name="writer"
              value={formData.writer}
              onChange={handleChange}
              required
              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
              placeholder="Nombre de quien escribe"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-white uppercase tracking-widest">Fotógrafo (Opcional)</label>
            <input
              type="text"
              name="photographer"
              value={formData.photographer}
              onChange={handleChange}
              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
              placeholder="Nombre del fotógrafo"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-white uppercase tracking-widest">Evento Relacionado (Opcional)</label>
          <select
            name="event_id"
            value={formData.event_id}
            onChange={handleChange}
            className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
          >
            <option value="">Ninguno (Independiente)</option>
            {eventsList.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.title} - {new Date(ev.date_time).toLocaleDateString()}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-white uppercase tracking-widest">Contenido / Reseña</label>
          <textarea
            name="content"
            value={formData.content}
            onChange={handleChange}
            required
            rows={12}
            className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors resize-y"
            placeholder="Escribe la crónica aquí..."
          ></textarea>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-white uppercase tracking-widest">Imagen Principal</label>
          <input
            type="file"
            name="image"
            accept="image/*"
            onChange={handleChange}
            className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-zinc-400 focus:outline-none focus:border-red-500 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-500/10 file:text-red-500 hover:file:bg-red-500/20"
          />
          {imageUrl && (
            <div className="mt-4 h-64 w-full md:w-1/2 bg-zinc-800 rounded-lg overflow-hidden border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="Chronicle Preview" className="w-full h-full object-cover" />
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-white/10">
          <button
            type="submit"
            disabled={saving}
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-white text-black px-8 py-3 rounded-lg font-bold uppercase tracking-widest hover:bg-zinc-200 transition-colors disabled:opacity-50"
          >
            {saving ? 'Guardando...' : (
              <>
                <Save className="w-5 h-5" />
                {isEdit ? 'Actualizar Crónica' : 'Publicar Crónica'}
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
