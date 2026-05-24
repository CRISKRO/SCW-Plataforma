"use client";

import { useEffect, useState, use } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, MapPin, Ticket, ShoppingCart, X, CheckCircle, Minus, Plus as PlusIcon } from 'lucide-react';
import api from '@/services/api';
import { useCartStore } from '@/store/cartStore';

interface SelectedSeat {
  seatId: number;
  rowName: string;
  seatNumber: number;
  zoneType: string;
  price: number;
  zoneId: number;
}

const ZONE_LABELS: Record<string, string> = {
  VIP: 'VIP',
  RINGSIDE_N: 'Ringside Norte',
  RINGSIDE_S: 'Ringside Sur',
  RINGSIDE_E: 'Ringside Este',
  RINGSIDE_O: 'Ringside Oeste',
  GENERAL: 'General',
};

const ZONE_COLORS: Record<string, string> = {
  VIP: 'text-yellow-400 border-yellow-500',
  RINGSIDE_N: 'text-red-400 border-red-500',
  RINGSIDE_S: 'text-red-400 border-red-500',
  RINGSIDE_E: 'text-red-400 border-red-500',
  RINGSIDE_O: 'text-red-400 border-red-500',
  GENERAL: 'text-zinc-300 border-zinc-500',
};

export default function EventDetail({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const eventId = unwrappedParams.id;

  const [event, setEvent] = useState<any>(null);
  const [zones, setZones] = useState<any[]>([]);
  const [selectedZone, setSelectedZone] = useState<any>(null);
  const [selectedSeats, setSelectedSeats] = useState<SelectedSeat[]>([]);
  const [showConfirmPanel, setShowConfirmPanel] = useState(false);
  const [loading, setLoading] = useState(true);
  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    const fetchEventData = async () => {
      try {
        const eventRes = await api.get(`/events/events/${eventId}/`);
        setEvent(eventRes.data);

        const zonesRes = await api.get(`/tickets/zones/by_event/?event_id=${eventId}`);
        setZones(zonesRes.data);
      } catch (error) {
        console.error("Error loading event data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchEventData();
  }, [eventId]);

  const isSeatSelected = (seatId: number) =>
    selectedSeats.some(s => s.seatId === seatId);

  const toggleSeat = (seat: any, zone: any) => {
    if (!seat.is_available) return;

    if (isSeatSelected(seat.id)) {
      setSelectedSeats(prev => prev.filter(s => s.seatId !== seat.id));
    } else {
      setSelectedSeats(prev => [
        ...prev,
        {
          seatId: seat.id,
          rowName: seat.row_name,
          seatNumber: seat.seat_number,
          zoneType: zone.zone_type,
          price: parseFloat(zone.price),
          zoneId: zone.id,
        },
      ]);
    }
  };

  const removeSeat = (seatId: number) => {
    setSelectedSeats(prev => prev.filter(s => s.seatId !== seatId));
  };

  const handleConfirm = () => {
    selectedSeats.forEach(seat => {
      addItem({
        id: parseInt(`999${seat.seatId}`),
        name: `Boleto: ${event.title}`,
        price: seat.price,
        quantity: 1,
        image_url: event.banner_url || '',
        size: `${ZONE_LABELS[seat.zoneType] || seat.zoneType} · Fila ${seat.rowName} - Asiento ${seat.seatNumber}`,
      });
    });
    setSelectedSeats([]);
    setShowConfirmPanel(false);
    setSelectedZone(null);
  };

  const totalPrice = selectedSeats.reduce((acc, s) => acc + s.price, 0);

  if (loading) return (
    <div className="min-h-screen bg-black flex justify-center items-center">
      <div className="w-10 h-10 border-t-2 border-red-500 rounded-full animate-spin" />
    </div>
  );
  if (!event) return <div className="min-h-screen bg-black flex justify-center items-center text-white">Evento no encontrado.</div>;

  return (
    <div className="bg-black min-h-screen text-white pt-24 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Event Header */}
        <div className="relative rounded-3xl overflow-hidden bg-zinc-900 border border-white/10 mb-12">
          <div className="absolute inset-0 bg-cover bg-center opacity-30 blur-sm" style={{ backgroundImage: `url(${event.banner_url})` }} />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
          <div className="relative p-8 md:p-12">
            <div className="flex items-center gap-2 text-red-500 text-sm font-bold uppercase tracking-widest mb-4">
              <Calendar className="w-5 h-5" />
              {new Date(event.date_time).toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight mb-4">{event.title}</h1>
            <div className="flex items-center gap-2 text-zinc-300 mb-6">
              <MapPin className="w-5 h-5" />
              {event.location}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* --- LEFT: Zone selector + Selected seats summary --- */}
          <div className="lg:col-span-1 space-y-6">
            <div>
              <h2 className="text-xl font-bold uppercase mb-4 flex items-center gap-2">
                <Ticket className="w-5 h-5 text-red-500" />
                1. Elige tu Zona
              </h2>
              {zones.length === 0 ? (
                <p className="text-zinc-500">Aún no hay zonas configuradas para este evento.</p>
              ) : (
                <div className="space-y-3">
                  {zones.map((zone) => (
                    <button
                      key={zone.id}
                      onClick={() => setSelectedZone(zone)}
                      className={`w-full text-left p-5 rounded-xl border transition-all ${
                        selectedZone?.id === zone.id
                          ? 'bg-zinc-900 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                          : 'bg-zinc-950 border-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <h3 className="font-bold uppercase tracking-widest text-sm">{ZONE_LABELS[zone.zone_type] || zone.zone_type}</h3>
                        <span className="text-lg font-black">${zone.price}</span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">
                        {zone.seats?.filter((s: any) => s.is_available).length ?? '—'} disponibles
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected seats list */}
            <AnimatePresence>
              {selectedSeats.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 16 }}
                  className="bg-zinc-950 border border-white/10 rounded-2xl p-5"
                >
                  <h3 className="font-bold uppercase tracking-widest text-sm text-white mb-4 flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-red-500" />
                    Asientos Seleccionados ({selectedSeats.length})
                  </h3>
                  <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {selectedSeats.map(seat => (
                      <li key={seat.seatId} className="flex items-center justify-between text-sm">
                        <span className="text-zinc-300">
                          <span className={`font-bold ${ZONE_COLORS[seat.zoneType]?.split(' ')[0] || ''}`}>
                            {ZONE_LABELS[seat.zoneType]}
                          </span>
                          {' · '}Fila {seat.rowName} Asiento {seat.seatNumber}
                        </span>
                        <div className="flex items-center gap-2 text-right shrink-0">
                          <span className="text-white font-bold">${seat.price}</span>
                          <button onClick={() => removeSeat(seat.seatId)} className="text-zinc-600 hover:text-red-500 transition-colors">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className="border-t border-white/10 mt-4 pt-4 flex justify-between font-bold">
                    <span className="text-zinc-400 uppercase tracking-widest text-sm">Total</span>
                    <span className="text-white text-lg">${totalPrice.toFixed(2)} MXN</span>
                  </div>

                  <button
                    onClick={() => setShowConfirmPanel(true)}
                    className="mt-4 w-full bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-widest py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Confirmar Selección
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* --- RIGHT: Seat map --- */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold uppercase mb-4">
              2. Selecciona tus Asientos
            </h2>

            <div className="bg-zinc-950 border border-white/10 rounded-3xl p-8 min-h-[400px]">
              {!selectedZone ? (
                <div className="flex items-center justify-center h-64 text-zinc-500 text-center">
                  ← Selecciona una zona para ver el mapa de asientos.
                </div>
              ) : (
                <div>
                  {/* Ring indicator */}
                  <div className="text-center mb-10">
                    <div className="inline-block px-16 py-4 border-2 border-dashed border-red-500/30 text-red-500/40 uppercase font-black tracking-[0.4em] text-xs">
                      R I N G
                    </div>
                  </div>

                  {/* Seats by row */}
                  <div className="overflow-x-auto pb-6 -mx-4 px-4 md:mx-0 md:px-0">
                    <div className="space-y-4 min-w-[max-content]">
                      {Array.from(new Set(selectedZone.seats.map((s: any) => s.row_name))).map((rowName: any) => (
                        <div key={rowName} className="flex items-center gap-3">
                          <span className="w-14 text-right text-xs font-bold text-zinc-500 shrink-0">Fila {rowName}</span>
                          <div className="flex gap-1.5 flex-wrap">
                            {selectedZone.seats
                              .filter((s: any) => s.row_name === rowName)
                              .sort((a: any, b: any) => a.seat_number - b.seat_number)
                              .map((seat: any) => {
                                const isSelected = isSeatSelected(seat.id);
                                return (
                                  <button
                                    key={seat.id}
                                    disabled={!seat.is_available}
                                    onClick={() => toggleSeat(seat, selectedZone)}
                                    title={seat.is_available
                                      ? `Fila ${seat.row_name} · Asiento ${seat.seat_number}`
                                      : 'Ocupado'}
                                    className={`w-9 h-9 rounded-t-lg border-b-4 flex items-center justify-center text-xs font-bold transition-all select-none shrink-0 ${
                                      !seat.is_available
                                        ? 'bg-red-950/50 border-red-900/50 text-red-900 cursor-not-allowed'
                                        : isSelected
                                          ? 'bg-red-600 border-red-400 text-white scale-110 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                                          : 'bg-zinc-800 border-zinc-600 hover:bg-zinc-600 hover:border-zinc-400 text-zinc-300'
                                    }`}
                                  >
                                    {seat.seat_number}
                                  </button>
                                );
                              })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="mt-10 pt-6 border-t border-white/5 flex flex-wrap justify-center gap-6">
                    {[
                      { color: 'bg-zinc-800 border-zinc-600', label: 'Disponible' },
                      { color: 'bg-red-600 border-red-400', label: 'Seleccionado' },
                      { color: 'bg-red-950/50 border-red-900/50', label: 'Ocupado' },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-t border-b-2 ${item.color}`} />
                        <span className="text-xs text-zinc-400 uppercase tracking-widest">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* === CONFIRMATION MODAL === */}
      <AnimatePresence>
        {showConfirmPanel && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
              onClick={() => setShowConfirmPanel(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 24 }}
              className="fixed inset-0 flex items-center justify-center z-50 px-4"
            >
              <div className="bg-zinc-950 border border-white/10 rounded-3xl p-8 max-w-lg w-full shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-black uppercase tracking-tight text-white">
                    Confirmar Compra
                  </h3>
                  <button
                    onClick={() => setShowConfirmPanel(false)}
                    className="text-zinc-500 hover:text-white transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <p className="text-zinc-400 text-sm mb-6 uppercase tracking-widest font-bold">{event.title}</p>

                <ul className="space-y-3 mb-6">
                  {selectedSeats.map(seat => (
                    <li key={seat.seatId} className="flex justify-between items-center bg-zinc-900 rounded-xl px-4 py-3">
                      <div>
                        <p className="font-bold text-white text-sm">
                          {ZONE_LABELS[seat.zoneType] || seat.zoneType}
                        </p>
                        <p className="text-zinc-400 text-xs mt-0.5">
                          Fila {seat.rowName} · Asiento {seat.seatNumber}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-white">${seat.price}</span>
                        <button
                          onClick={() => {
                            removeSeat(seat.seatId);
                            if (selectedSeats.length <= 1) setShowConfirmPanel(false);
                          }}
                          className="text-zinc-600 hover:text-red-500 transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="border-t border-white/10 pt-4 pb-6 flex justify-between font-bold text-lg">
                  <span className="text-zinc-400">Total a pagar</span>
                  <span className="text-white">${totalPrice.toFixed(2)} <span className="text-sm text-zinc-500 font-normal">MXN</span></span>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setShowConfirmPanel(false)}
                    className="flex-1 border border-white/10 text-zinc-400 hover:text-white hover:border-white/30 font-bold uppercase tracking-widest py-3 rounded-xl transition-colors"
                  >
                    Seguir Eligiendo
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-widest py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    Agregar al Carrito
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
