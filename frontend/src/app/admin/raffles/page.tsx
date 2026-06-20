"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { getRaffles, deleteRaffle, Raffle } from '@/services/raffles.services';

export default function AdminRafflesPage() {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRaffles();
  }, []);

  const fetchRaffles = async () => {
    try {
      const data = await getRaffles();
      setRaffles(data);
    } catch (error) {
      console.error('Error loading raffles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Estás seguro de eliminar esta rifa? Esta acción no se puede deshacer y borrará todos los boletos.')) {
      try {
        await deleteRaffle(id);
        fetchRaffles();
      } catch (error) {
        console.error('Error deleting raffle:', error);
        alert('Error al eliminar la rifa');
      }
    }
  };

  if (loading) {
    return <div className="text-white text-center py-10">Cargando rifas...</div>;
  }

  const activeRaffle = raffles.find(r => r.is_active) || raffles[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-white">Gestión de Rifas</h1>
        <div className="flex items-center gap-3">
          {activeRaffle && (
            <Link 
              href={`/admin/raffles/${activeRaffle.id}`}
              className="flex items-center gap-2 bg-[#009EE3] hover:bg-[#0088cc] text-white px-4 py-2 rounded-lg transition-colors font-bold"
              title="Ver Boletos y Sortear la Rifa Principal"
            >
              <Ticket className="w-5 h-5" />
              Ver Boletos y Sortear
            </Link>
          )}
          <Link 
            href="/admin/raffles/form" 
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nueva Rifa
          </Link>
        </div>
      </div>

      <div className="bg-zinc-900 rounded-lg overflow-hidden border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-zinc-300">
            <thead className="bg-zinc-950 text-zinc-400 text-sm uppercase">
              <tr>
                <th className="px-6 py-4">Título</th>
                <th className="px-6 py-4">Precio</th>
                <th className="px-6 py-4">Total Boletos</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {raffles.map((raffle) => (
                <tr key={raffle.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-medium text-white">{raffle.title}</td>
                  <td className="px-6 py-4">${raffle.price}</td>
                  <td className="px-6 py-4">{raffle.total_tickets}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${raffle.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {raffle.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-3">
                    <Link 
                      href={`/admin/raffles/form/${raffle.id}`}
                      className="text-zinc-400 hover:text-white transition-colors"
                      title="Editar Rifa"
                    >
                      <Edit className="w-5 h-5 inline" />
                    </Link>
                    <button 
                      onClick={() => handleDelete(raffle.id)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                      title="Eliminar Rifa"
                    >
                      <Trash2 className="w-5 h-5 inline" />
                    </button>
                  </td>
                </tr>
              ))}
              {raffles.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                    No hay rifas registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
