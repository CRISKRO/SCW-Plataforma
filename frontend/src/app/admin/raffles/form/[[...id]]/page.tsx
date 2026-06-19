"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getRaffle, createRaffle, updateRaffle, toggleTicketStatus, Raffle, RaffleTicket } from '@/services/raffles.services';

export default function AdminRaffleForm({ params }: { params: { id?: string[] } }) {
  const router = useRouter();
  const isEditing = !!params.id;
  const raffleId = isEditing ? parseInt(params.id![0], 10) : null;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    total_tickets: '',
    is_active: true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [tickets, setTickets] = useState<RaffleTicket[]>([]);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEditing && raffleId) {
      loadRaffle();
    }
  }, [isEditing, raffleId]);

  const loadRaffle = async () => {
    try {
      const data: Raffle = await getRaffle(raffleId!);
      setFormData({
        title: data.title,
        description: data.description,
        price: data.price,
        total_tickets: data.total_tickets.toString(),
        is_active: data.is_active,
      });
      setCurrentImage(data.image || null);
      setTickets(data.tickets || []);
    } catch (error) {
      console.error('Error loading raffle:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('description', formData.description);
      data.append('price', formData.price);
      data.append('total_tickets', formData.total_tickets);
      data.append('is_active', formData.is_active.toString());
      if (imageFile) {
        data.append('image', imageFile);
      }

      if (isEditing) {
        await updateRaffle(raffleId!, data);
      } else {
        await createRaffle(data);
      }
      router.push('/admin/raffles');
    } catch (error) {
      console.error('Error saving raffle:', error);
      alert('Error al guardar la rifa. Revisa los datos.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTicket = async (ticket: RaffleTicket) => {
    if (ticket.status === 'SOLD_ONLINE') {
      alert(`Este boleto ya fue pagado en línea por: ${ticket.buyer_name || 'Desconocido'}. No se puede modificar aquí.`);
      return;
    }

    const newStatus = ticket.status === 'AVAILABLE' ? 'SOLD_OFFLINE' : 'AVAILABLE';
    let buyerName = ticket.buyer_name;

    if (newStatus === 'SOLD_OFFLINE') {
      const name = prompt('Ingresa el nombre del comprador físico (opcional):');
      if (name === null) return; // Cancelado
      buyerName = name;
    } else {
      const confirm = window.confirm('¿Seguro que deseas liberar este boleto y ponerlo disponible de nuevo?');
      if (!confirm) return;
      buyerName = '';
    }

    try {
      await toggleTicketStatus(raffleId!, ticket.id, newStatus, buyerName || '');
      loadRaffle(); // Reload to get updated tickets
    } catch (error) {
      console.error('Error toggling ticket:', error);
      alert('Error al actualizar el estado del boleto.');
    }
  };

  if (loading) return <div className="text-center text-white py-10">Cargando...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-zinc-900 border border-white/10 rounded-xl p-6">
        <h1 className="text-2xl font-bold text-white mb-6">
          {isEditing ? 'Editar Rifa' : 'Nueva Rifa'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Título</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Precio del Boleto (MXN)</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                required
                min="1"
                step="0.01"
                className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-zinc-400 mb-2">Descripción (Bases del sorteo)</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Total de Boletos</label>
              <input
                type="number"
                name="total_tickets"
                value={formData.total_tickets}
                onChange={handleChange}
                required
                min="1"
                className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500"
              />
              <p className="text-xs text-zinc-500 mt-1">Si cambias este número después, los boletos se ajustarán automáticamente.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Imagen del Premio</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500"
              />
              {currentImage && (
                <div className="mt-2">
                  <img src={currentImage} alt="Premio" className="h-20 rounded-md object-cover" />
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              className="w-4 h-4 rounded border-white/10 bg-black text-red-600 focus:ring-red-600 focus:ring-offset-black"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-white">Rifa Activa (Visible al público)</label>
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={() => router.push('/admin/raffles')}
              className="px-6 py-2 border border-white/10 rounded-lg text-white hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar Rifa'}
            </button>
          </div>
        </form>
      </div>

      {isEditing && (
        <div className="bg-zinc-900 border border-white/10 rounded-xl p-6">
          <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-white">Control de Boletos</h2>
              <p className="text-zinc-400 text-sm mt-1">Haz clic en un número verde para marcarlo como vendido en físico. Haz clic en uno rojo para volver a liberarlo.</p>
            </div>
            <div className="flex gap-4 text-xs font-medium">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></span> Disponible</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></span> Vendido (Físico)</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500/20 border border-blue-500/50"></span> Vendido (Web)</div>
            </div>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
            {tickets.map((ticket) => {
              let style = "bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20";
              let title = "Disponible";

              if (ticket.status === 'SOLD_OFFLINE') {
                style = "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20";
                title = `Vendido a: ${ticket.buyer_name || 'Anónimo'}`;
              } else if (ticket.status === 'SOLD_ONLINE') {
                style = "bg-blue-500/10 border-blue-500/30 text-blue-400 cursor-not-allowed";
                title = `Pagado en web por: ${ticket.buyer_name || 'Usuario'}`;
              }

              return (
                <button
                  key={ticket.id}
                  type="button"
                  title={title}
                  onClick={() => handleToggleTicket(ticket)}
                  className={`aspect-square flex items-center justify-center font-mono font-bold text-sm border rounded transition-colors ${style}`}
                >
                  {ticket.number}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
