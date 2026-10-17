"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { eventsService } from '@/services/events.services';

export default function EventFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id ? params.id[0] : null;
  const isEdit = !!id;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date_time: '',
    location: '',
    ticket_link: '',
    status: 'DRAFT',
    is_multi_day: false
  });
  
  const [bannerUrl, setBannerUrl] = useState('');
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  useEffect(() => {
    if (isEdit) {
      const fetchEvent = async () => {
        try {
          const data = await eventsService.getEventDetails(Number(id));
          // Formatear la fecha para input type="datetime-local" (YYYY-MM-DDTHH:MM)
          let formattedDate = '';
          if (data.date_time) {
            const dateObj = new Date(data.date_time);
            const pad = (n: number) => n.toString().padStart(2, '0');
            const year = dateObj.getFullYear();
            const month = pad(dateObj.getMonth() + 1);
            const day = pad(dateObj.getDate());
            const hours = pad(dateObj.getHours());
            const minutes = pad(dateObj.getMinutes());
            formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;
          }
          
          setFormData({
            title: data.title || '',
            description: data.description || '',
            date_time: formattedDate,
            location: data.location || '',
            ticket_link: data.ticket_link || '',
            status: data.status || 'DRAFT',
            is_multi_day: !!data.is_multi_day
          });
          if (data.banner_url) {
            setBannerUrl(data.banner_url);
          }
        } catch (error) {
          console.error("Error loading event:", error);
          alert("No se pudo cargar la información del evento.");
        } finally {
          setLoading(false);
        }
      };
      fetchEvent();
    }
  }, [id, isEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'file') {
      const fileInput = e.target as HTMLInputElement;
      if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        setBannerFile(file);
        setBannerUrl(URL.createObjectURL(file));
      }
      return;
    }

    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('description', formData.description);
      data.append('date_time', formData.date_time);
      data.append('location', formData.location);
      data.append('ticket_link', formData.ticket_link);
      data.append('status', formData.status);
      data.append('is_multi_day', formData.is_multi_day ? 'true' : 'false');
      
      if (bannerFile) {
        data.append('banner', bannerFile);
      }

      if (isEdit) {
        await eventsService.updateEvent(Number(id), data);
      } else {
        await eventsService.createEvent(data);
      }
      router.push('/admin/events');
    } catch (error) {
      console.error("Error saving event:", error);
      alert("Hubo un error al guardar el evento.");
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-zinc-500 py-8">Cargando...</div>;
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/events" className="text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            {isEdit ? 'Editar Evento' : 'Nuevo Evento'}
          </h1>
          <p className="text-zinc-400 mt-1">Completa los detalles del evento para la cartelera.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-zinc-950 p-8 rounded-xl border border-white/10">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-white uppercase tracking-widest">Título del Evento</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
              placeholder="Ej. SCW: Lucha Extrema"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-white uppercase tracking-widest">Ubicación</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
              placeholder="Ej. Arena SCW"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-white uppercase tracking-widest">Fecha y Hora</label>
          <input
            type="datetime-local"
            name="date_time"
            value={formData.date_time}
            onChange={handleChange}
            required
            className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-white uppercase tracking-widest">Imagen del Banner</label>
          <input
            type="file"
            name="banner"
            accept="image/*"
            onChange={handleChange}
            className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-zinc-400 focus:outline-none focus:border-red-500 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-500/10 file:text-red-500 hover:file:bg-red-500/20"
          />
          {bannerUrl && (
            <div className="mt-4 h-48 w-full bg-zinc-800 rounded-lg overflow-hidden border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={bannerUrl} alt="Banner Preview" className="w-full h-full object-cover" />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-white uppercase tracking-widest">Descripción</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors resize-none"
            placeholder="Detalles de la cartelera..."
          ></textarea>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-white uppercase tracking-widest">Estado del Evento</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors appearance-none"
          >
            <option value="DRAFT">Borrador (No visible)</option>
            <option value="SCHEDULED">Programado (A la venta)</option>
            <option value="LIVE">En Vivo</option>
            <option value="COMPLETED">Finalizado</option>
          </select>
        </div>

        <div className="bg-zinc-900/80 border border-white/10 rounded-xl p-4 flex items-center justify-between">
          <div className="pr-4">
            <label htmlFor="is_multi_day" className="font-bold text-white uppercase tracking-widest text-sm block cursor-pointer">
              Evento de 2 días (Venta por Día / Pase 2 Días)
            </label>
            <p className="text-xs text-zinc-400 mt-1">
              Si activas esta casilla, los usuarios podrán comprar únicamente el Día 1, Día 2 o el Pase de 2 Días. Si la dejas desactivada, se venderá como evento normal de 1 día.
            </p>
          </div>
          <input
            type="checkbox"
            id="is_multi_day"
            name="is_multi_day"
            checked={formData.is_multi_day}
            onChange={handleChange}
            className="w-6 h-6 accent-red-600 rounded cursor-pointer flex-shrink-0"
          />
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
                {isEdit ? 'Actualizar Evento' : 'Crear Evento'}
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
