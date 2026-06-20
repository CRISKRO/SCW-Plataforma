"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { eventsService } from '@/services/events.services';

export default function SponsorFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id ? params.id[0] : null;
  const isEdit = !!id;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    contact: '',
    phone: '',
    description: '',
    url: '',
    is_active: true,
  });
  
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    if (isEdit) {
      const fetchSponsor = async () => {
        try {
          const data = await eventsService.getSponsorDetails(Number(id));
          setFormData({
            name: data.name || '',
            address: data.address || '',
            contact: data.contact || '',
            phone: data.phone || '',
            description: data.description || '',
            url: data.url || '',
            is_active: data.is_active !== undefined ? data.is_active : true,
          });
          if (data.image_url) {
            setImageUrl(data.image_url);
          }
        } catch (error) {
          console.error("Error loading sponsor:", error);
          alert("No se pudo cargar la información del patrocinador.");
        } finally {
          setLoading(false);
        }
      };
      fetchSponsor();
    }
  }, [id, isEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
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
      data.append('name', formData.name);
      data.append('address', formData.address);
      data.append('contact', formData.contact);
      data.append('phone', formData.phone);
      data.append('description', formData.description);
      data.append('url', formData.url);
      data.append('is_active', String(formData.is_active));
      
      if (imageFile) {
        data.append('image', imageFile);
      }

      if (isEdit) {
        await eventsService.updateSponsor(Number(id), data);
      } else {
        await eventsService.createSponsor(data);
      }
      router.push('/admin/sponsors');
    } catch (error) {
      console.error("Error saving sponsor:", error);
      alert("Hubo un error al guardar al patrocinador.");
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-zinc-500 py-8">Cargando...</div>;
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/sponsors" className="text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            {isEdit ? 'Editar Patrocinador' : 'Nuevo Patrocinador'}
          </h1>
          <p className="text-zinc-400 mt-1">Ingresa la información del patrocinador.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-zinc-950 p-8 rounded-xl border border-white/10">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-white uppercase tracking-widest">Nombre del Patrocinador</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
              placeholder="Ej. Deporte Plus"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-white uppercase tracking-widest">Contacto / Representante</label>
            <input
              type="text"
              name="contact"
              value={formData.contact}
              onChange={handleChange}
              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
              placeholder="Ej. Juan Pérez"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-white uppercase tracking-widest">Teléfono</label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
              placeholder="Ej. 1234567890"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-white uppercase tracking-widest">Dirección</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
              placeholder="Ej. Av. Principal 123"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-bold text-white uppercase tracking-widest">Enlace / Página Web (Opcional)</label>
          <input
            type="url"
            name="url"
            value={formData.url}
            onChange={handleChange}
            className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
            placeholder="Ej. https://www.ejemplo.com"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-white uppercase tracking-widest">Texto / Descripción</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors resize-none"
            placeholder="Información sobre el patrocinador o mensaje publicitario..."
          ></textarea>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-white uppercase tracking-widest">Imagen / Logo</label>
          <input
            type="file"
            name="image"
            accept="image/*"
            onChange={handleChange}
            className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-zinc-400 focus:outline-none focus:border-red-500 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-500/10 file:text-red-500 hover:file:bg-red-500/20"
          />
          {imageUrl && (
            <div className="mt-4 h-48 w-48 bg-white p-4 rounded-lg overflow-hidden border border-white/10 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="Sponsor Preview" className="max-w-full max-h-full object-contain" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              name="is_active"
              id="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              className="w-5 h-5 accent-red-500"
            />
            <label htmlFor="is_active" className="text-white font-medium">
              Activo (Mostrar al público)
            </label>
          </div>
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
                {isEdit ? 'Actualizar Patrocinador' : 'Añadir Patrocinador'}
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
