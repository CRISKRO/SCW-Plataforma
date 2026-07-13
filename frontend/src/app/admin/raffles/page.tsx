"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Edit, Trash2, Ticket } from 'lucide-react';
import { getRaffles, deleteRaffle, Raffle } from '@/services/raffles.services';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminTable from '@/components/admin/AdminTable';

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

  const columns = [
    { key: 'title', label: 'Título' },
    { 
      key: 'price', 
      label: 'Precio',
      render: (val: any) => `$${val}`
    },
    { key: 'total_tickets', label: 'Total Boletos' },
    { 
      key: 'is_active', 
      label: 'Estado',
      render: (val: boolean) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${val ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
          {val ? 'Activa' : 'Inactiva'}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader 
        title="Gestión de Rifas"
        subtitle="Crea y administra los sorteos y boletos de SCW."
        icon={<Ticket className="w-8 h-8 text-red-500" />}
      >
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {activeRaffle && (
            <Link 
              href={`/admin/raffles/${activeRaffle.id}`}
              className="flex flex-1 justify-center items-center gap-2 bg-[#009EE3] hover:bg-[#0088cc] text-white px-4 py-2.5 rounded-lg transition-colors font-bold whitespace-nowrap text-sm"
              title="Ver Boletos y Sortear la Rifa Principal"
            >
              <Ticket className="w-4 h-4" />
              Sortear Rifa Activa
            </Link>
          )}
          <Link 
            href="/admin/raffles/form" 
            className="flex flex-1 justify-center items-center gap-2 bg-gradient-to-r from-red-600 to-red-800 text-white px-5 py-2.5 text-sm font-bold uppercase tracking-wider rounded-lg hover:from-red-500 hover:to-red-700 transition-all shadow-lg shadow-red-950/20 active:scale-95 transform whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Nueva Rifa
          </Link>
        </div>
      </AdminPageHeader>

      <AdminTable 
        columns={columns} 
        data={raffles} 
        onDelete={handleDelete}
        editUrlPrefix="/admin/raffles/form"
      />
    </div>
  );
}
