"use client";

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import AdminTable from '@/components/admin/AdminTable';
import { eventsService } from '@/services/events.services';

export default function AdminFightersPage() {
  const [fighters, setFighters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFighters = async () => {
    try {
      const data = await eventsService.getFighters();
      setFighters(data);
    } catch (error) {
      console.error("Error loading fighters:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFighters();
  }, []);

  const handleDelete = async (id: number) => {
    if (confirm('¿Estás seguro de que deseas eliminar a este luchador?')) {
      try {
        await eventsService.deleteFighter(id);
        setFighters(fighters.filter(f => f.id !== id));
      } catch (error) {
        console.error("Error deleting fighter:", error);
        alert("Hubo un error al eliminar al luchador.");
      }
    }
  };

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Nombre' },
    { key: 'social_network', label: 'Red Social' },
    { 
      key: 'is_student', 
      label: 'Alumno',
      render: (val: boolean) => (
        <span className={`px-2 py-1 rounded-full text-xs font-bold ${val ? 'bg-blue-500/20 text-blue-500' : 'text-zinc-500'}`}>
          {val ? 'Sí' : 'No'}
        </span>
      )
    },
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
          <h1 className="text-3xl font-bold tracking-tight text-white">Roster</h1>
          <p className="text-zinc-400 mt-2">Gestiona a todos los luchadores de SCW.</p>
        </div>
        <Link 
          href="/admin/fighters/form" 
          className="flex items-center gap-2 bg-white text-black px-4 py-2 font-bold uppercase tracking-widest text-sm hover:bg-zinc-200 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Añadir Luchador
        </Link>
      </div>

      {loading ? (
        <div className="text-zinc-500 py-8">Cargando roster...</div>
      ) : (
        <AdminTable 
          columns={columns} 
          data={fighters} 
          onDelete={handleDelete}
          editUrlPrefix="/admin/fighters/form"
        />
      )}
    </div>
  );
}
