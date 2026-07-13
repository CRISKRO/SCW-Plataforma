"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getRaffle, Raffle, RaffleTicket } from '@/services/raffles.services';
import Image from 'next/image';
import { useCartStore } from '@/store/cartStore';

import PageBackButton from '@/components/PageBackButton';

export default function RaffleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [raffle, setRaffle] = useState<Raffle | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTickets, setSelectedTickets] = useState<number[]>([]);
  const addItem = useCartStore((state) => state.addItem);

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

  const toggleTicketSelection = (ticketId: number) => {
    setSelectedTickets((prev) => 
      prev.includes(ticketId) ? prev.filter(id => id !== ticketId) : [...prev, ticketId]
    );
  };

  const handleAddToCart = () => {
    if (!raffle || selectedTickets.length === 0) return;

    selectedTickets.forEach(ticketId => {
      const ticket = raffle.tickets?.find(t => t.id === ticketId);
      if (ticket) {
        addItem({
          // Create a unique pseudo-ID for the cart that won't clash with merch
          id: parseInt(`999${ticket.id}`, 10), 
          name: `Rifa: ${raffle.title} - Boleto #${ticket.number}`,
          price: parseFloat(raffle.price),
          quantity: 1,
          image_url: raffle.image || '/images/logo-scw.png',
          raffle_ticket_id: ticket.id,
          requires_shipping: false, // Digits don't need shipping
        });
      }
    });

    router.push('/carrito');
  };

  if (loading) {
    return (
      <div className="bg-black min-h-screen pt-32 pb-12 flex justify-center">
        <div className="w-12 h-12 border-t-2 border-red-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!raffle || !raffle.is_active) {
    return (
      <div className="bg-black min-h-screen pt-32 pb-12 text-center text-white">
        <h1 className="text-2xl font-bold">Rifa no encontrada o inactiva</h1>
      </div>
    );
  }

  const totalPrice = selectedTickets.length * parseFloat(raffle.price);

  return (
    <div className="bg-black min-h-screen pt-24 pb-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <PageBackButton />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="relative h-80 md:h-full min-h-[300px] bg-zinc-900 rounded-2xl overflow-hidden border border-white/10">
            {raffle.image ? (
              <Image src={raffle.image} alt={raffle.title} fill className="object-cover" />
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-700">Sin Imagen</div>
            )}
          </div>
          
          <div className="flex flex-col justify-center">
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-4">
              {raffle.title}
            </h1>
            <p className="text-red-500 font-bold text-2xl mb-4">${raffle.price} MXN <span className="text-sm text-zinc-500 font-normal">por boleto</span></p>
            <p className="text-zinc-300 whitespace-pre-line mb-6 leading-relaxed">
              {raffle.description}
            </p>
            <div className="bg-zinc-900 border border-white/10 rounded-xl p-4">
              <p className="text-zinc-400 text-sm mb-2">Instrucciones:</p>
              <ul className="list-disc list-inside text-sm text-zinc-300 space-y-1">
                <li>Selecciona los números que deseas comprar en la cuadrícula de abajo.</li>
                <li>Los números en rojo ya no están disponibles.</li>
                <li>Haz clic en "Comprar Boletos" para pagar en línea.</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 md:p-8">
          <h2 className="text-2xl font-black text-white uppercase mb-6 flex items-center gap-4">
            Selecciona tus boletos
            <span className="text-sm font-normal text-zinc-400 normal-case bg-black px-3 py-1 rounded-full">
              {raffle.tickets?.filter(t => t.status === 'AVAILABLE').length} disponibles de {raffle.total_tickets}
            </span>
          </h2>
          
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2 mb-8">
            {raffle.tickets?.map((ticket) => {
              const isAvailable = ticket.status === 'AVAILABLE';
              const isSelected = selectedTickets.includes(ticket.id);

              let buttonClass = "aspect-square flex items-center justify-center font-mono font-bold text-sm md:text-base border rounded transition-all duration-200 ";
              
              if (!isAvailable) {
                buttonClass += "bg-zinc-950 border-zinc-800 text-zinc-700 cursor-not-allowed";
              } else if (isSelected) {
                buttonClass += "bg-red-600 border-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)] scale-110 z-10";
              } else {
                buttonClass += "bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-red-500 hover:text-white";
              }

              return (
                <button
                  key={ticket.id}
                  disabled={!isAvailable}
                  onClick={() => toggleTicketSelection(ticket.id)}
                  className={buttonClass}
                >
                  {ticket.number}
                </button>
              );
            })}
          </div>

          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-24 md:bottom-4 z-20 bg-zinc-900/90 backdrop-blur-md p-4 rounded-xl shadow-2xl">
            <div className="text-center sm:text-left">
              <p className="text-zinc-400 text-sm">Boletos seleccionados: <strong className="text-white">{selectedTickets.length}</strong></p>
              <p className="text-2xl font-black text-white mt-1">Total: ${totalPrice.toFixed(2)} MXN</p>
            </div>
            
            <button
              onClick={handleAddToCart}
              disabled={selectedTickets.length === 0}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest transition-colors shadow-lg shadow-red-900/20"
            >
              Añadir al Carrito
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
