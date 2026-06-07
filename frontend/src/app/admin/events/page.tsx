"use client";

import { useEffect, useState } from 'react';
import { Plus, Ticket } from 'lucide-react';
import Link from 'next/link';
import AdminTable from '@/components/admin/AdminTable';
import { eventsService } from '@/services/events.services';

export default function AdminEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    try {
      const data = await eventsService.getEvents();
      setEvents(data);
    } catch (error) {
      console.error("Error loading events:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleDelete = async (id: number) => {
    if (confirm('¿Estás seguro de que deseas eliminar este evento?')) {
      try {
        await eventsService.deleteEvent(id);
        setEvents(events.filter(event => event.id !== id));
      } catch (error) {
        console.error("Error deleting event:", error);
        alert("Hubo un error al eliminar el evento.");
      }
    }
  };

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'title', label: 'Título' },
    { 
      key: 'date_time', 
      label: 'Fecha y Hora',
      render: (val: string) => new Date(val).toLocaleString()
    },
    { key: 'location', label: 'Ubicación' },
    { 
      key: 'status', 
      label: 'Estado',
      render: (val: string) => {
        const badges: any = {
          'DRAFT': <span className="px-2 py-1 bg-zinc-500/20 text-zinc-400 rounded-full text-xs font-bold">Borrador</span>,
          'SCHEDULED': <span className="px-2 py-1 bg-blue-500/20 text-blue-500 rounded-full text-xs font-bold">Programado</span>,
          'LIVE': <span className="px-2 py-1 bg-red-500/20 text-red-500 rounded-full text-xs font-bold animate-pulse">En Vivo</span>,
          'COMPLETED': <span className="px-2 py-1 bg-green-500/20 text-green-500 rounded-full text-xs font-bold">Finalizado</span>
        };
        return badges[val] || <span className="px-2 py-1 bg-zinc-500/20 text-zinc-400 rounded-full text-xs font-bold">{val}</span>;
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Eventos</h1>
          <p className="text-zinc-400 mt-2">Gestiona las carteleras y próximos eventos de SCW.</p>
        </div>
        <Link 
          href="/admin/events/form" 
          className="flex items-center gap-2 bg-white text-black px-4 py-2 font-bold uppercase tracking-widest text-sm hover:bg-zinc-200 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Añadir Evento
        </Link>
      </div>

      {loading ? (
        <div className="text-zinc-500 py-8">Cargando eventos...</div>
      ) : (
        <AdminTable 
          columns={columns} 
          data={events} 
          onDelete={handleDelete}
          editUrlPrefix="/admin/events/form"
          extraActions={(item: any) => (
            <Link
              href={`/admin/events/tickets/${item.id}`}
              className="text-yellow-500/70 hover:text-yellow-500 transition-colors inline-block"
              title="Gestionar Boletos"
            >
              <Ticket className="w-4 h-4" />
            </Link>
          )}
        />
      )}
    </div>
  );
}
