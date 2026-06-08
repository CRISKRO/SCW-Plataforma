"use client";

import { useEffect, useState, use, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, MapPin, Ticket, ShoppingCart, X, CheckCircle, Minus, Plus as PlusIcon } from 'lucide-react';
import api from '@/services/api';
import { useCartStore } from '@/store/cartStore';
import { useToastStore } from '@/store/toastStore';

interface SelectedSeat {
  seatId: number;
  rowName: string;
  seatNumber: number;
  zoneType: string;
  price: number;
  zoneId: number;
}

const ZONE_LABELS: Record<string, string> = {
  NORTE: 'Norte',
  SUR: 'Sur',
  ESTE: 'Este',
  OESTE: 'Oeste',
};

const ZONE_COLORS: Record<string, string> = {
  NORTE: 'text-red-400 border-red-500',
  SUR: 'text-red-400 border-red-500',
  ESTE: 'text-red-400 border-red-500',
  OESTE: 'text-red-400 border-red-500',
};

export default function EventDetail({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const eventId = unwrappedParams.id;

  const [event, setEvent] = useState<any>(null);
  const [zones, setZones] = useState<any[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<SelectedSeat[]>([]);
  const [showConfirmPanel, setShowConfirmPanel] = useState(false);
  const [loading, setLoading] = useState(true);
  const addItem = useCartStore((state) => state.addItem);

  // Memoize grouped seats to prevent lag on every re-render (click)
  const parsedZones = useMemo(() => {
    return zones.map(zone => {
      const groupedSeats: Record<string, any[]> = {};
      zone.seats?.forEach((seat: any) => {
        if (!groupedSeats[seat.row_name]) groupedSeats[seat.row_name] = [];
        groupedSeats[seat.row_name].push(seat);
      });
      // Sort seats once
      Object.keys(groupedSeats).forEach(row => {
        groupedSeats[row].sort((a, b) => a.seat_number - b.seat_number);
      });
      return {
        ...zone,
        groupedSeats,
        sortedRowNames: Object.keys(groupedSeats).sort(),
        sortedRowNamesReversed: Object.keys(groupedSeats).sort().reverse()
      };
    });
  }, [zones]);

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
        seat_id: seat.seatId,
      });
    });
    setSelectedSeats([]);
    setShowConfirmPanel(false);
    useToastStore.getState().addToast(`Se agregaron ${selectedSeats.length} boleto(s) al carrito`, 'success');
    
    // Smoothly scroll to the top since the page height will shrink and leave the user stranded at the bottom
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

        <div className={`flex flex-col-reverse lg:flex-row gap-8 items-start transition-all duration-500`}>

          {/* --- LEFT / CART: Selected seats summary --- */}
          <div className={`w-full lg:w-1/3 space-y-6 sticky top-24 ${selectedSeats.length > 0 ? 'block' : 'hidden'}`}>

            {/* Selected seats list */}
            <AnimatePresence>
              {selectedSeats.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-zinc-950 border border-white/10 rounded-2xl p-5 shadow-2xl"
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
          <div className={`w-full ${selectedSeats.length > 0 ? 'lg:w-2/3' : 'lg:w-full'} transition-all duration-500`}>
            <h2 className="text-xl md:text-3xl font-black uppercase mb-6 tracking-tight flex items-center justify-between">
              <span>Selecciona tus Asientos</span>
              {selectedSeats.length === 0 && <span className="text-sm font-medium text-zinc-500 tracking-normal hidden md:inline-block">Haz clic en un asiento para comenzar</span>}
            </h2>

            <div className="bg-zinc-950 border border-white/10 rounded-3xl p-4 md:p-8 lg:p-12 min-h-[500px] shadow-2xl relative overflow-hidden flex items-center justify-center w-full">
              {parsedZones.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-zinc-500 text-center">
                  El mapa de asientos aún no está disponible para este evento.
                </div>
              ) : (
                <div className="w-full relative">
                  <div className="absolute top-0 right-0 z-20 md:hidden bg-zinc-900/80 text-zinc-400 text-[10px] px-3 py-1 rounded-full uppercase tracking-widest border border-white/10 backdrop-blur-sm pointer-events-none">
                    ↔ Desliza el mapa
                  </div>
                  <div className="overflow-x-auto pb-12 pt-4 custom-scrollbar touch-pan-x touch-pan-y w-full">
                    <div className="inline-block min-w-max w-full text-center">
                      <div className="bg-zinc-900/40 rounded-[3rem] p-6 md:p-12 lg:p-16 inline-flex flex-col items-center justify-center border border-white/5 relative shadow-inner">
                        
                        {/* Norte */}
                        {parsedZones.find(z => z.zone_type === 'NORTE') && (
                          <div className="flex justify-center mb-6 md:mb-10 lg:mb-14">
                            {(() => {
                              const zone = parsedZones.find(z => z.zone_type === 'NORTE');
                              return (
                                <div className="bg-zinc-800/90 p-4 md:p-6 lg:p-8 rounded-3xl border-[3px] border-zinc-700/60 flex flex-col items-center gap-3 md:gap-4 lg:gap-5 relative shadow-2xl backdrop-blur-sm transition-transform hover:scale-[1.02] duration-300">
                                  <div className="px-6 py-2 rounded-full text-xs md:text-sm font-black uppercase tracking-widest bg-zinc-950 shadow-inner border border-white/5 text-zinc-300">
                                    Norte - ${zone.price}
                                  </div>
                                  <div className="flex flex-col gap-2 md:gap-3">
                                    {zone.sortedRowNamesReversed.map((rowName: string) => (
                                      <div key={rowName} className="flex items-center justify-center gap-2 flex-row">
                                        <div className="w-6 h-6 md:w-8 md:h-8 lg:w-10 lg:h-10 flex items-center justify-center font-bold text-zinc-500 text-[10px] md:text-xs lg:text-sm bg-zinc-900/60 rounded-md lg:rounded-lg shrink-0">{rowName}</div>
                                        <div className="flex gap-2 flex-row">
                                          {zone.groupedSeats[rowName].map((seat: any) => {
                                            const isSelected = isSeatSelected(seat.id);
                                            return (
                                              <button
                                                key={seat.id}
                                                disabled={!seat.is_available}
                                                onClick={() => toggleSeat(seat, zone)}
                                                className={`w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 xl:w-14 xl:h-14 rounded-md lg:rounded-lg flex items-center justify-center text-xs md:text-sm lg:text-base font-black transition-all shadow-md shrink-0 ${!seat.is_available ? 'bg-zinc-950 text-zinc-700 border border-zinc-800 opacity-50 cursor-not-allowed' : isSelected ? 'bg-red-600/90 text-white border border-red-500 scale-110 z-10 shadow-[0_0_15px_rgba(239,68,68,0.6)]' : 'bg-zinc-800 text-zinc-300 border border-zinc-600 hover:bg-zinc-700 hover:border-zinc-400 hover:scale-110 z-10 hover:shadow-lg'}`}
                                                title={seat.is_available ? `Fila ${rowName} - Asiento ${seat.seat_number}` : 'Ocupado'}
                                              >{seat.seat_number}</button>
                                            );
                                          })}
                                        </div>
                                        <div className="w-6 h-6 md:w-8 md:h-8 lg:w-10 lg:h-10 flex items-center justify-center font-bold text-zinc-500 text-[10px] md:text-xs lg:text-sm bg-zinc-900/60 rounded-md lg:rounded-lg shrink-0">{rowName}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}

                      <div className="flex items-center justify-center w-full gap-4 md:gap-8 lg:gap-12">
                        {/* Oeste */}
                        <div className="flex-1 flex justify-end">
                          {(() => {
                            const zone = parsedZones.find(z => z.zone_type === 'OESTE');
                            if (!zone) return null;
                            return (
                              <div className="bg-zinc-800/90 p-4 md:p-6 lg:p-8 rounded-3xl border-[3px] border-zinc-700/60 flex flex-col items-center gap-3 md:gap-4 lg:gap-5 relative shadow-2xl backdrop-blur-sm transition-transform hover:scale-[1.02] duration-300">
                                <div className="px-6 py-2 rounded-full text-xs md:text-sm font-black uppercase tracking-widest bg-zinc-950 shadow-inner border border-white/5 text-zinc-300">
                                  Oeste - ${zone.price}
                                </div>
                                <div className="flex flex-row gap-2 md:gap-3">
                                  {zone.sortedRowNamesReversed.map((rowName: string) => (
                                    <div key={rowName} className="flex items-center justify-center gap-2 flex-col">
                                      <div className="w-6 h-6 md:w-8 md:h-8 lg:w-10 lg:h-10 flex items-center justify-center font-bold text-zinc-500 text-[10px] md:text-xs lg:text-sm bg-zinc-900/60 rounded-md lg:rounded-lg shrink-0">{rowName}</div>
                                      <div className="flex gap-2 flex-col">
                                        {zone.groupedSeats[rowName].map((seat: any) => {
                                          const isSelected = isSeatSelected(seat.id);
                                          return (
                                            <button
                                              key={seat.id}
                                              disabled={!seat.is_available}
                                              onClick={() => toggleSeat(seat, zone)}
                                              className={`w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 xl:w-14 xl:h-14 rounded-md lg:rounded-lg flex items-center justify-center text-xs md:text-sm lg:text-base font-black transition-all shadow-md shrink-0 ${!seat.is_available ? 'bg-zinc-950 text-zinc-700 border border-zinc-800 opacity-50 cursor-not-allowed' : isSelected ? 'bg-red-600/90 text-white border border-red-500 scale-110 z-10 shadow-[0_0_15px_rgba(239,68,68,0.6)]' : 'bg-zinc-800 text-zinc-300 border border-zinc-600 hover:bg-zinc-700 hover:border-zinc-400 hover:scale-110 z-10 hover:shadow-lg'}`}
                                              title={seat.is_available ? `Fila ${rowName} - Asiento ${seat.seat_number}` : 'Ocupado'}
                                            >{seat.seat_number}</button>
                                          );
                                        })}
                                      </div>
                                      <div className="w-6 h-6 md:w-8 md:h-8 lg:w-10 lg:h-10 flex items-center justify-center font-bold text-zinc-500 text-[10px] md:text-xs lg:text-sm bg-zinc-900/60 rounded-md lg:rounded-lg shrink-0">{rowName}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        {/* El Ring Central - Diseño Realista */}
                        <div className="relative w-64 h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 xl:w-[450px] xl:h-[450px] bg-[#d4d4d8] border-[10px] lg:border-[16px] border-zinc-950 rounded flex items-center justify-center shadow-[0_0_100px_rgba(255,255,255,0.08)] z-10 shrink-0 mx-2 md:mx-4 transition-all duration-500 hover:scale-105">
                          <div className="absolute inset-1 border-[2px] border-red-600/80 rounded-sm"></div>
                          <div className="absolute inset-3 border-[2px] border-zinc-100 rounded-sm"></div>
                          <div className="absolute inset-5 border-[2px] border-red-600/80 rounded-sm"></div>
                          <div className="absolute -top-3 -left-3 w-6 h-6 lg:w-8 lg:h-8 bg-red-600 rounded-full shadow-lg border-2 border-black z-20"></div>
                          <div className="absolute top-3 left-3 w-8 h-8 lg:w-10 lg:h-10 bg-zinc-900 rotate-45 transform -translate-x-1 -translate-y-1 rounded-sm z-10"></div>
                          <div className="absolute -top-3 -right-3 w-6 h-6 lg:w-8 lg:h-8 bg-blue-600 rounded-full shadow-lg border-2 border-black z-20"></div>
                          <div className="absolute top-3 right-3 w-8 h-8 lg:w-10 lg:h-10 bg-zinc-900 -rotate-45 transform translate-x-1 -translate-y-1 rounded-sm z-10"></div>
                          <div className="absolute -bottom-3 -left-3 w-6 h-6 lg:w-8 lg:h-8 bg-blue-600 rounded-full shadow-lg border-2 border-black z-20"></div>
                          <div className="absolute bottom-3 left-3 w-8 h-8 lg:w-10 lg:h-10 bg-zinc-900 -rotate-45 transform -translate-x-1 translate-y-1 rounded-sm z-10"></div>
                          <div className="absolute -bottom-3 -right-3 w-6 h-6 lg:w-8 lg:h-8 bg-red-600 rounded-full shadow-lg border-2 border-black z-20"></div>
                          <div className="absolute bottom-3 right-3 w-8 h-8 lg:w-10 lg:h-10 bg-zinc-900 rotate-45 transform translate-x-1 translate-y-1 rounded-sm z-10"></div>
                          <div className="relative flex items-center justify-center w-32 h-32 lg:w-48 lg:h-48 border-[6px] border-zinc-400/50 rounded-full">
                            <span className="text-zinc-400/80 font-black text-5xl lg:text-7xl tracking-tighter select-none">SCW</span>
                          </div>
                        </div>

                        {/* Este */}
                        <div className="flex-1 flex justify-start">
                          {(() => {
                            const zone = parsedZones.find(z => z.zone_type === 'ESTE');
                            if (!zone) return null;
                            return (
                              <div className="bg-zinc-800/90 p-4 md:p-6 lg:p-8 rounded-3xl border-[3px] border-zinc-700/60 flex flex-col items-center gap-3 md:gap-4 lg:gap-5 relative shadow-2xl backdrop-blur-sm transition-transform hover:scale-[1.02] duration-300">
                                <div className="px-6 py-2 rounded-full text-xs md:text-sm font-black uppercase tracking-widest bg-zinc-950 shadow-inner border border-white/5 text-zinc-300">
                                  Este - ${zone.price}
                                </div>
                                <div className="flex flex-row gap-2 md:gap-3">
                                  {zone.sortedRowNames.map((rowName: string) => (
                                    <div key={rowName} className="flex items-center justify-center gap-2 flex-col">
                                      <div className="w-6 h-6 md:w-8 md:h-8 lg:w-10 lg:h-10 flex items-center justify-center font-bold text-zinc-500 text-[10px] md:text-xs lg:text-sm bg-zinc-900/60 rounded-md lg:rounded-lg shrink-0">{rowName}</div>
                                      <div className="flex gap-2 flex-col">
                                        {zone.groupedSeats[rowName].map((seat: any) => {
                                          const isSelected = isSeatSelected(seat.id);
                                          return (
                                            <button
                                              key={seat.id}
                                              disabled={!seat.is_available}
                                              onClick={() => toggleSeat(seat, zone)}
                                              className={`w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 xl:w-14 xl:h-14 rounded-md lg:rounded-lg flex items-center justify-center text-xs md:text-sm lg:text-base font-black transition-all shadow-md shrink-0 ${!seat.is_available ? 'bg-zinc-950 text-zinc-700 border border-zinc-800 opacity-50 cursor-not-allowed' : isSelected ? 'bg-red-600/90 text-white border border-red-500 scale-110 z-10 shadow-[0_0_15px_rgba(239,68,68,0.6)]' : 'bg-zinc-800 text-zinc-300 border border-zinc-600 hover:bg-zinc-700 hover:border-zinc-400 hover:scale-110 z-10 hover:shadow-lg'}`}
                                              title={seat.is_available ? `Fila ${rowName} - Asiento ${seat.seat_number}` : 'Ocupado'}
                                            >{seat.seat_number}</button>
                                          );
                                        })}
                                      </div>
                                      <div className="w-6 h-6 md:w-8 md:h-8 lg:w-10 lg:h-10 flex items-center justify-center font-bold text-zinc-500 text-[10px] md:text-xs lg:text-sm bg-zinc-900/60 rounded-md lg:rounded-lg shrink-0">{rowName}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Sur */}
                      {parsedZones.find(z => z.zone_type === 'SUR') && (
                        <div className="flex justify-center mt-6 md:mt-10 lg:mt-14">
                          {(() => {
                            const zone = parsedZones.find(z => z.zone_type === 'SUR');
                            return (
                              <div className="bg-zinc-800/90 p-4 md:p-6 lg:p-8 rounded-3xl border-[3px] border-zinc-700/60 flex flex-col items-center gap-3 md:gap-4 lg:gap-5 relative shadow-2xl backdrop-blur-sm transition-transform hover:scale-[1.02] duration-300">
                                <div className="px-6 py-2 rounded-full text-xs md:text-sm font-black uppercase tracking-widest bg-zinc-950 shadow-inner border border-white/5 text-zinc-300">
                                  Sur - ${zone.price}
                                </div>
                                <div className="flex flex-col gap-2 md:gap-3">
                                  {zone.sortedRowNames.map((rowName: string) => (
                                    <div key={rowName} className="flex items-center justify-center gap-2 flex-row">
                                      <div className="w-6 h-6 md:w-8 md:h-8 lg:w-10 lg:h-10 flex items-center justify-center font-bold text-zinc-500 text-[10px] md:text-xs lg:text-sm bg-zinc-900/60 rounded-md lg:rounded-lg shrink-0">{rowName}</div>
                                      <div className="flex gap-2 flex-row">
                                        {zone.groupedSeats[rowName].map((seat: any) => {
                                          const isSelected = isSeatSelected(seat.id);
                                          return (
                                            <button
                                              key={seat.id}
                                              disabled={!seat.is_available}
                                              onClick={() => toggleSeat(seat, zone)}
                                              className={`w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 xl:w-14 xl:h-14 rounded-md lg:rounded-lg flex items-center justify-center text-xs md:text-sm lg:text-base font-black transition-all shadow-md shrink-0 ${!seat.is_available ? 'bg-zinc-950 text-zinc-700 border border-zinc-800 opacity-50 cursor-not-allowed' : isSelected ? 'bg-red-600/90 text-white border border-red-500 scale-110 z-10 shadow-[0_0_15px_rgba(239,68,68,0.6)]' : 'bg-zinc-800 text-zinc-300 border border-zinc-600 hover:bg-zinc-700 hover:border-zinc-400 hover:scale-110 z-10 hover:shadow-lg'}`}
                                              title={seat.is_available ? `Fila ${rowName} - Asiento ${seat.seat_number}` : 'Ocupado'}
                                            >{seat.seat_number}</button>
                                          );
                                        })}
                                      </div>
                                      <div className="w-6 h-6 md:w-8 md:h-8 lg:w-10 lg:h-10 flex items-center justify-center font-bold text-zinc-500 text-[10px] md:text-xs lg:text-sm bg-zinc-900/60 rounded-md lg:rounded-lg shrink-0">{rowName}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
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
