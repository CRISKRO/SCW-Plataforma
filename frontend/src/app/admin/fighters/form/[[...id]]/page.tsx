"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { eventsService } from '@/services/events.services';

export default function FighterFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id ? params.id[0] : null;
  const isEdit = !!id;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    nickname: '',
    bio: '',
    instagram: '',
    tiktok: '',
    twitter: '',
    facebook: '',
    signature_move: '',
    achievements: '',
    weight_kg: '',
    height_cm: '',
    is_active: true,
    is_student: false,
    order: 0,
  });
  
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    if (isEdit) {
      const fetchFighter = async () => {
        try {
          const data = await eventsService.getFighterDetails(Number(id));
          setFormData({
            name: data.name || '',
            nickname: data.nickname || '',
            bio: data.bio || '',
            instagram: data.instagram || '',
            tiktok: data.tiktok || '',
            twitter: data.twitter || '',
            facebook: data.facebook || '',
            signature_move: data.signature_move || '',
            achievements: data.achievements || '',
            weight_kg: data.weight_kg || '',
            height_cm: data.height_cm || '',
            is_active: data.is_active !== undefined ? data.is_active : true,
            is_student: data.is_student !== undefined ? data.is_student : false,
            order: data.order !== undefined ? data.order : 0,
          });
          if (data.image_url) {
            setImageUrl(data.image_url);
          }
        } catch (error) {
          console.error("Error loading fighter:", error);
          alert("No se pudo cargar la información del luchador.");
        } finally {
          setLoading(false);
        }
      };
      fetchFighter();
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
      data.append('name', formData.name);
      data.append('nickname', formData.nickname);
      data.append('bio', formData.bio);
      data.append('instagram', formData.instagram);
      data.append('tiktok', formData.tiktok);
      data.append('twitter', formData.twitter);
      data.append('facebook', formData.facebook);
      data.append('signature_move', formData.signature_move);
      data.append('achievements', formData.achievements);
      if (formData.weight_kg) data.append('weight_kg', formData.weight_kg);
      if (formData.height_cm) data.append('height_cm', formData.height_cm);
      data.append('is_active', String(formData.is_active));
      data.append('is_student', String(formData.is_student));
      data.append('order', String(formData.order));
      
      if (imageFile) {
        data.append('image', imageFile);
      }

      if (isEdit) {
        await eventsService.updateFighter(Number(id), data);
      } else {
        await eventsService.createFighter(data);
      }
      router.push('/admin/fighters');
    } catch (error) {
      console.error("Error saving fighter:", error);
      alert("Hubo un error al guardar al luchador.");
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-zinc-500 py-8">Cargando...</div>;
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/fighters" className="text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            {isEdit ? 'Editar Luchador' : 'Nuevo Luchador'}
          </h1>
          <p className="text-zinc-400 mt-1">Ingresa la información del luchador para el Roster.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-zinc-950 p-8 rounded-xl border border-white/10">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-white uppercase tracking-widest">Nombre de Ring</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
              placeholder="Ej. El Enmascarado"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-white uppercase tracking-widest">Apodo (Opcional)</label>
            <input
              type="text"
              name="nickname"
              value={formData.nickname}
              onChange={handleChange}
              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
              placeholder="Ej. El ídolo de los niños"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-white uppercase tracking-widest">Orden (Prioridad)</label>
            <input
              type="number"
              name="order"
              value={formData.order}
              onChange={handleChange}
              min="0"
              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
              placeholder="Ej. 1"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-white uppercase tracking-widest">Instagram (URL)</label>
            <input
              type="url"
              name="instagram"
              value={formData.instagram}
              onChange={handleChange}
              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
              placeholder="Ej. https://instagram.com/usuario"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-white uppercase tracking-widest">TikTok (URL)</label>
            <input
              type="url"
              name="tiktok"
              value={formData.tiktok}
              onChange={handleChange}
              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
              placeholder="Ej. https://tiktok.com/@usuario"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-white uppercase tracking-widest">Twitter / X (URL)</label>
            <input
              type="url"
              name="twitter"
              value={formData.twitter}
              onChange={handleChange}
              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
              placeholder="Ej. https://x.com/usuario"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-white uppercase tracking-widest">Facebook (URL)</label>
            <input
              type="url"
              name="facebook"
              value={formData.facebook}
              onChange={handleChange}
              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
              placeholder="Ej. https://facebook.com/usuario"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-white uppercase tracking-widest">Peso (kg)</label>
            <input
              type="number"
              name="weight_kg"
              value={formData.weight_kg}
              onChange={handleChange}
              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
              placeholder="Ej. 85"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-white uppercase tracking-widest">Estatura (cm)</label>
            <input
              type="number"
              name="height_cm"
              value={formData.height_cm}
              onChange={handleChange}
              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
              placeholder="Ej. 175"
            />
          </div>
        </div>



        <div className="space-y-2">
          <label className="text-sm font-bold text-white uppercase tracking-widest">Imagen del Luchador</label>
          <input
            type="file"
            name="image"
            accept="image/*"
            onChange={handleChange}
            className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-zinc-400 focus:outline-none focus:border-red-500 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-500/10 file:text-red-500 hover:file:bg-red-500/20"
          />
          {imageUrl && (
            <div className="mt-4 h-64 w-48 bg-zinc-800 rounded-lg overflow-hidden border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="Fighter Preview" className="w-full h-full object-cover" />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-white uppercase tracking-widest">Biografía</label>
          <textarea
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            rows={5}
            className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors resize-none"
            placeholder="Historia y detalles del luchador..."
          ></textarea>
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
              Activo en el Roster
            </label>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              name="is_student"
              id="is_student"
              checked={formData.is_student}
              onChange={handleChange}
              className="w-5 h-5 accent-blue-500"
            />
            <label htmlFor="is_student" className="text-white font-medium">
              Es Alumno (Se mostrará en la sección de alumnos)
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
                {isEdit ? 'Actualizar Luchador' : 'Añadir Luchador'}
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
