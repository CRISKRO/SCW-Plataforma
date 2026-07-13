"use client";

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import AdminTable from '@/components/admin/AdminTable';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
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
    if (confirm('¿Estás seguro de que deseas eliminar este resultado?')) {
      try {
        await eventsService.deleteChronicle(id);
        setChronicles(chronicles.filter(c => c.id !== id));
      } catch (error) {
        console.error("Error deleting chronicle:", error);
        alert("Hubo un error al eliminar el resultado.");
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
      <AdminPageHeader 
        title="Resultados"
        subtitle="Publica los resultados y galerías fotográficas de los eventos pasados."
        actionLabel="Añadir Resultado"
        actionHref="/admin/chronicles/form"
        actionIcon={<Plus className="w-4 h-4" />}
      />

      {loading ? (
        <div className="text-zinc-500 py-8">Cargando resultados...</div>
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
