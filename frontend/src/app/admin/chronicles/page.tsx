"use client";

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import AdminTable from '@/components/admin/AdminTable';
import { eventsService } from '@/services/events.services';

export default function AdminChroniclesPage() {
  const [chronicles, setChronicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChronicles = async () => {
    try {
      const data = await eventsService.getChronicles();
      setChronicles(data);
    } catch (error) {
      console.error("Error loading chronicles:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChronicles();
  }, []);

  const handleDelete = async (id: number) => {
    if (confirm('¿Estás seguro de que deseas eliminar esta crónica?')) {
      try {
        await eventsService.deleteChronicle(id);
        setChronicles(chronicles.filter(c => c.id !== id));
      } catch (error) {
        console.error("Error deleting chronicle:", error);
        alert("Hubo un error al eliminar la crónica.");
      }
    }
  };

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'title', label: 'Título' },
    { key: 'writer', label: 'Escritor' },
    { key: 'photographer', label: 'Fotógrafo' },
    { 
      key: 'created_at', 
      label: 'Fecha',
      render: (val: string) => new Date(val).toLocaleDateString()
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Crónicas</h1>
          <p className="text-zinc-400 mt-2">Publica reseñas y galerías fotográficas de los eventos pasados.</p>
        </div>
        <Link 
          href="/admin/chronicles/form" 
          className="flex items-center gap-2 bg-white text-black px-4 py-2 font-bold uppercase tracking-widest text-sm hover:bg-zinc-200 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Añadir Crónica
        </Link>
      </div>

      {loading ? (
        <div className="text-zinc-500 py-8">Cargando crónicas...</div>
      ) : (
        <AdminTable 
          columns={columns} 
          data={chronicles} 
          onDelete={handleDelete}
          editUrlPrefix="/admin/chronicles/form"
        />
      )}
    </div>
  );
}
