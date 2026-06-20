"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getRaffle, Raffle, RaffleTicket, toggleTicketStatus } from '@/services/raffles.services';
import { ChevronLeft, Edit, Plus, Search, Trash2, User, Phone, Mail } from 'lucide-react';
import Link from 'next/link';
import RouletteModal from '@/components/RouletteModal';

export default function AdminRaffleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [raffle, setRaffle] = useState<Raffle | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isRouletteOpen, setIsRouletteOpen] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchRaffle(Number(params.id));
    }
  }, [params.id]);

  const fetchRaffle = async (id: number) => {
    try {
      const data = await getRaffle(id);
      setRaffle(data);
    } catch (error) {
      console.error('Error loading raffle:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (ticket: RaffleTicket) => {
    if (!raffle) return;
    
    // Si esta disponible, preguntar nombre para venta fisica
    let newStatus = 'SOLD_OFFLINE';
    let buyerName = '';
    
    if (ticket.status === 'AVAILABLE') {
      const name = window.prompt(`Vender boleto #${ticket.number} físicamente. Ingresa el nombre del comprador:`);
      if (name === null) return; // Cancelado
      buyerName = name.trim();
    } else if (ticket.status === 'SOLD_OFFLINE') {
      if (!window.confirm(`¿Devolver el boleto #${ticket.number} a DISPONIBLE?`)) return;
      newStatus = 'AVAILABLE';
    } else if (ticket.status === 'SOLD_ONLINE') {
      alert("No puedes modificar un boleto vendido en línea. Fue pagado automáticamente.");
      return;
    }

    try {
      const updatedData = await toggleTicketStatus(raffle.id, ticket.id, newStatus, buyerName);
      // Update local state
      setRaffle((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          tickets: prev.tickets?.map(t => t.id === ticket.id ? { ...t, status: updatedData.ticket.status as any, buyer_name: updatedData.ticket.buyer_name } : t)
        };
      });
    } catch (error) {
      console.error('Error updating ticket:', error);
      alert('Error al actualizar el estado del boleto.');
    }
  };

  if (loading) {
    return <div className="text-white text-center py-10">Cargando detalles de rifa...</div>;
  }

  if (!raffle) {
    return <div className="text-white text-center py-10">Rifa no encontrada.</div>;
  }

  const filteredTickets = raffle.tickets?.filter(t => 
    t.number.toString().includes(searchTerm) || 
    (t.buyer_name && t.buyer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (t.contact_email && t.contact_email.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  const soldTicketsCount = raffle.tickets?.filter(t => t.status !== 'AVAILABLE').length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <Link href="/admin/raffles" className="text-zinc-400 hover:text-white flex items-center gap-2 mb-2 text-sm transition-colors">
            <ChevronLeft className="w-4 h-4" />
            Volver a Rifas
          </Link>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
            {raffle.title}
          </h1>
          <p className="text-zinc-400">
            {soldTicketsCount} de {raffle.total_tickets} boletos vendidos | ${raffle.price} c/u
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsRouletteOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-widest px-6 py-3 rounded-lg shadow-lg shadow-red-900/20 transition-all flex items-center gap-2"
          >
            Sortear Ganador
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Buscar por número, nombre o correo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900 border border-white/10 text-white rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-red-500 transition-colors"
          />
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-zinc-900 border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-zinc-300">
            <thead className="bg-zinc-950 text-zinc-400 text-sm uppercase">
              <tr>
                <th className="px-6 py-4">Boleto #</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Comprador</th>
                <th className="px-6 py-4">Contacto</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredTickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono text-white text-lg font-bold bg-black px-2 py-1 rounded">
                      {String(ticket.number).padStart(2, '0')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {ticket.status === 'AVAILABLE' && <span className="bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-xs font-bold border border-green-500/20">Disponible</span>}
                    {ticket.status === 'SOLD_ONLINE' && <span className="bg-[#009EE3]/10 text-[#009EE3] px-3 py-1 rounded-full text-xs font-bold border border-[#009EE3]/20">Pagado Online</span>}
                    {ticket.status === 'SOLD_OFFLINE' && <span className="bg-red-500/10 text-red-500 px-3 py-1 rounded-full text-xs font-bold border border-red-500/20">Vendido Físico</span>}
                  </td>
                  <td className="px-6 py-4 font-medium text-white">
                    {ticket.buyer_name || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm space-y-1">
                    {ticket.contact_email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3 h-3 text-zinc-500" />
                        {ticket.contact_email}
                      </div>
                    )}
                    {ticket.contact_phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3 h-3 text-zinc-500" />
                        {ticket.contact_phone}
                      </div>
                    )}
                    {!ticket.contact_email && !ticket.contact_phone && <span className="text-zinc-600">-</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {ticket.status !== 'SOLD_ONLINE' && (
                      <button 
                        onClick={() => handleToggleStatus(ticket)}
                        className={`text-sm font-bold uppercase px-3 py-1 rounded transition-colors ${
                          ticket.status === 'AVAILABLE' 
                            ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' 
                            : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                        }`}
                      >
                        {ticket.status === 'AVAILABLE' ? 'Marcar Vendido' : 'Liberar'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredTickets.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                    No se encontraron boletos con ese criterio.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <RouletteModal 
        isOpen={isRouletteOpen} 
        onClose={() => setIsRouletteOpen(false)} 
        tickets={raffle.tickets || []} 
      />
    </div>
  );
}
