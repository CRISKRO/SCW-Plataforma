"use client";

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import AdminTable from '@/components/admin/AdminTable';
import { eventsService } from '@/services/events.services';

export default function AdminSponsorsPage() {
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSponsors = async () => {
    try {
      const data = await eventsService.getSponsors();
      setSponsors(data);
    } catch (error) {
      console.error("Error loading sponsors:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSponsors();
  }, []);

  const handleDelete = async (id: number) => {
    if (confirm('¿Estás seguro de que deseas eliminar a este patrocinador?')) {
      try {
        await eventsService.deleteSponsor(id);
        setSponsors(sponsors.filter(s => s.id !== id));
      } catch (error) {
        console.error("Error deleting sponsor:", error);
        alert("Hubo un error al eliminar al patrocinador.");
      }
    }
  };

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Nombre' },
    { key: 'contact', label: 'Contacto' },
    { key: 'phone', label: 'Teléfono' },
    { 
      key: 'is_active', 
      label: 'Activo',
      render: (val: boolean) => (
        <span className={`px-2 py-1 rounded-full text-xs font-bold ${val ? 'bg-green-500/20 text-green-500' : 'text-red-500/50'}`}>
          {val ? 'Sí' : 'No'}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Patrocinadores</h1>
          <p className="text-zinc-400 mt-2">Gestiona los patrocinadores de SCW.</p>
        </div>
        <Link 
          href="/admin/sponsors/form" 
          className="flex items-center gap-2 bg-white text-black px-4 py-2 font-bold uppercase tracking-widest text-sm hover:bg-zinc-200 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Añadir Patrocinador
        </Link>
      </div>

      {loading ? (
        <div className="text-zinc-500 py-8">Cargando patrocinadores...</div>
      ) : (
        <AdminTable 
          columns={columns} 
          data={sponsors} 
          onDelete={handleDelete}
          editUrlPrefix="/admin/sponsors/form"
        />
      )}
    </div>
  );
}
