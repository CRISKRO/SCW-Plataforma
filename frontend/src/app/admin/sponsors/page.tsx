"use client";

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import AdminTable from '@/components/admin/AdminTable';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
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
    { key: 'order', label: 'Orden' },
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
      <AdminPageHeader 
        title="Patrocinadores"
        subtitle="Gestiona los patrocinadores de SCW."
        actionLabel="Añadir Patrocinador"
        actionHref="/admin/sponsors/form"
        actionIcon={<Plus className="w-4 h-4" />}
      />

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
