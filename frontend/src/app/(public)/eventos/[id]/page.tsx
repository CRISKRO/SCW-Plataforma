"use client";

import { useEffect, useState, use, useMemo, useRef } from 'react';
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
  const [sessionId] = useState(() => Math.random().toString(36).substring(2, 15));

  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const initialPinchDist = useRef<number | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => setScale(s => Math.min(s + 0.2, 3));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.2, 0.6));
  const handleResetZoom = () => {
    if (mapContainerRef.current) {
      const containerWidth = mapContainerRef.current.clientWidth;
      setScale(containerWidth < 900 ? containerWidth / 900 : 1);
    } else {
      setScale(1);
    }
    setPosition({ x: 0, y: 0 });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const PAN_LIMIT = 200;

  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      setPosition({
        x: Math.max(-PAN_LIMIT, Math.min(PAN_LIMIT, newX)),
        y: Math.max(-PAN_LIMIT, Math.min(PAN_LIMIT, newY))
      });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    setIsDragging(false);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y });
    } else if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      initialPinchDist.current = dist;

      const midX = (touch1.clientX + touch2.clientX) / 2;
      const midY = (touch1.clientY + touch2.clientY) / 2;
      setDragStart({ x: midX - position.x, y: midY - position.y });
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const PAN_LIMIT = 200;
    if (e.touches.length === 1 && isDragging) {
      const newX = e.touches[0].clientX - dragStart.x;
      const newY = e.touches[0].clientY - dragStart.y;
      setPosition({
        x: Math.max(-PAN_LIMIT, Math.min(PAN_LIMIT, newX)),
        y: Math.max(-PAN_LIMIT, Math.min(PAN_LIMIT, newY))
      });
    } else if (e.touches.length === 2 && initialPinchDist.current !== null) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];

      // Pinch zoom
      const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      const ratio = dist / initialPinchDist.current;
      setScale(s => Math.min(Math.max(s * ratio, 0.6), 3));
      initialPinchDist.current = dist;

      // 2-finger pan
      const midX = (touch1.clientX + touch2.clientX) / 2;
      const midY = (touch1.clientY + touch2.clientY) / 2;
      const newX = midX - dragStart.x;
      const newY = midY - dragStart.y;
      setPosition({
        x: Math.max(-PAN_LIMIT, Math.min(PAN_LIMIT, newX)),
        y: Math.max(-PAN_LIMIT, Math.min(PAN_LIMIT, newY))
      });
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      setIsDragging(false);
    }
    if (e.touches.length < 2) {
      initialPinchDist.current = null;
    }
  };

  // Memoize grouped seats to prevent lag on every re-render (click)
  const parsedZones = useMemo(() => {
    return zones.map(zone => {
      const groupedSeats: Record<string, any[]> = {};
      zone.seats?.forEach((seat: any) => {
        if (!groupedSeats[seat.row_name]) groupedSeats[seat.row_name] = [];
        groupedSeats[seat.row_name].push(seat);
      });
      // Sort seats once depending on zone type
      Object.keys(groupedSeats).forEach(row => {
        if (zone.zone_type === 'SUR' || zone.zone_type === 'OESTE') {
          groupedSeats[row].sort((a, b) => b.seat_number - a.seat_number);
        } else {
          groupedSeats[row].sort((a, b) => a.seat_number - b.seat_number);
        }
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
    let isMounted = true;
    const fetchEventData = async () => {
      try {
        const eventRes = await api.get(`/events/events/${eventId}/`);
        if (isMounted) setEvent(eventRes.data);

        const zonesRes = await api.get(`/tickets/zones/by_event/?event_id=${eventId}`);
        if (isMounted) setZones(zonesRes.data);
      } catch (error) {
        console.error("Error loading event data", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchEventData();
    const interval = setInterval(fetchEventData, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [eventId]);

  useEffect(() => {
    if (mapContainerRef.current && parsedZones.length > 0) {
      const containerWidth = mapContainerRef.current.clientWidth;
      if (containerWidth < 900) {
        setScale(containerWidth / 900);
      }
    }
  }, [parsedZones]);

  // Prevent native browser pinch-zoom over the map
  useEffect(() => {
    const el = mapContainerRef.current;
    if (!el) return;

    const preventNativeZoom = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        e.preventDefault();
      }
    };

    const preventGesture = (e: Event) => {
      e.preventDefault();
    };

    el.addEventListener('touchmove', preventNativeZoom, { passive: false });
    el.addEventListener('gesturestart', preventGesture);
    el.addEventListener('gesturechange', preventGesture);
    el.addEventListener('gestureend', preventGesture);

    return () => {
      el.removeEventListener('touchmove', preventNativeZoom);
      el.removeEventListener('gesturestart', preventGesture);
      el.removeEventListener('gesturechange', preventGesture);
      el.removeEventListener('gestureend', preventGesture);
    };
  }, []);

  const getDisplayNumber = (zoneType: string, seatNumber: number) => {
    if (zoneType === 'NORTE') return seatNumber;
    if (zoneType === 'ESTE') return seatNumber + 17;
    if (zoneType === 'SUR') return seatNumber + 27;
    if (zoneType === 'OESTE') return seatNumber + 44;
    return seatNumber;
  };

  const isSeatSelected = (seatId: number) =>
    selectedSeats.some(s => s.seatId === seatId);

  const toggleSeat = (seat: any, zone: any, displayNumber: number) => {
    if (!seat.is_available || seat.is_locked) return;

    if (isSeatSelected(seat.id)) {
      setSelectedSeats(prev => prev.filter(s => s.seatId !== seat.id));
    } else {
      setSelectedSeats(prev => [
        ...prev,
        {
          seatId: seat.id,
          rowName: seat.row_name,
          seatNumber: displayNumber,
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

  const handleConfirm = async () => {
    try {
      setLoading(true);
      const seatIds = selectedSeats.map(s => s.seatId);
      await api.post('/tickets/seats/lock_seats/', { seat_ids: seatIds, session_id: sessionId });

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
      useToastStore.getState().addToast(`Se agregaron ${selectedSeats.length} boleto(s) al carrito y se reservaron por 10 min`, 'success');

      // Smoothly scroll to the top since the page height will shrink and leave the user stranded at the bottom
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      useToastStore.getState().addToast(error.response?.data?.error || "Error al reservar asientos.", "error");
      // Refetch to get current state
      const zonesRes = await api.get(`/tickets/zones/by_event/?event_id=${eventId}`);
      setZones(zonesRes.data);
      // Remove locked ones from selected
      const currentAvailable = zonesRes.data.flatMap((z: any) => z.seats).filter((s: any) => s.is_available && !s.is_locked).map((s: any) => s.id);
      setSelectedSeats(prev => prev.filter(s => currentAvailable.includes(s.seatId)));
    } finally {
      setLoading(false);
    }
  };

  const totalPrice = selectedSeats.reduce((acc, s) => acc + s.price, 0);

  const renderPublicZone = (zone: any, position: 'top' | 'bottom' | 'left' | 'right' = 'top') => {
    if (!zone) return null;
    const isVertical = position === 'left' || position === 'right';
    const rowNames = position === 'top' || position === 'left' ? zone.sortedRowNamesReversed : zone.sortedRowNames;
    return (
      <div className="flex flex-col items-center relative">
        <div className={`flex gap-0.5 ${isVertical ? 'flex-row' : 'flex-col'}`}>
          {rowNames.map((rowName: string) => (
            <div key={rowName} className={`flex items-center justify-center gap-0.5 ${isVertical ? 'flex-col' : 'flex-row'}`}>
              <div className={`flex gap-0.5 ${isVertical ? 'flex-col' : 'flex-row'}`}>
                {zone.groupedSeats[rowName].map((seat: any) => {
                  const isSelected = isSeatSelected(seat.id);
                  const displayNumber = getDisplayNumber(zone.zone_type, seat.seat_number);
                  return (
                    <div key={seat.id} className="contents">
                      <button
                        disabled={!seat.is_available || seat.is_locked}
                        onClick={() => toggleSeat(seat, zone, displayNumber)}
                        className={`w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 rounded-sm flex items-center justify-center text-[9px] md:text-[10px] font-bold transition-all shadow-sm ${(!seat.is_available || seat.is_locked) ? 'bg-zinc-900 text-zinc-600 border border-zinc-800 opacity-50 cursor-not-allowed' : isSelected ? 'bg-red-600/90 text-white border border-red-500 scale-110 z-10 shadow-[0_0_15px_rgba(239,68,68,0.6)]' : 'bg-zinc-800 text-zinc-300 border border-zinc-600 hover:bg-zinc-700 hover:scale-110 z-10 hover:shadow-lg'}`}
                        title={(!seat.is_available || seat.is_locked) ? 'Ocupado' : `Fila ${rowName} - Asiento ${displayNumber}`}
                      >{displayNumber}</button>
                      {zone.zone_type === 'ESTE' && displayNumber === 22 && <div className={`${isVertical ? 'h-4 md:h-6' : 'w-4 md:w-6'}`} />}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h2 className="text-xl md:text-3xl font-black uppercase tracking-tight flex items-center justify-between">
                <span>Selecciona tus Asientos</span>
                {selectedSeats.length === 0 && <span className="text-sm font-medium text-zinc-500 tracking-normal hidden md:inline-block ml-4">Haz clic en un asiento para comenzar</span>}
              </h2>

              {/* Controles de Zoom */}
              {parsedZones.length > 0 && (
                <div className="flex items-center gap-1 bg-zinc-900 border border-white/10 rounded-lg p-1">
                  <button onClick={handleZoomOut} className="p-2 hover:bg-zinc-800 rounded text-white transition-colors" title="Alejar">
                    <Minus className="w-4 h-4" />
                  </button>
                  <button onClick={handleResetZoom} className="px-3 py-1 hover:bg-zinc-800 rounded text-xs font-bold text-white transition-colors min-w-[60px]" title="Restablecer vista">
                    {Math.round(scale * 100)}%
                  </button>
                  <button onClick={handleZoomIn} className="p-2 hover:bg-zinc-800 rounded text-white transition-colors" title="Acercar">
                    <PlusIcon className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Show overlay hint on mobile */}
            <div className="md:hidden text-center text-zinc-500 text-xs mb-2 uppercase tracking-widest">
              Usa un dedo para mover el mapa, dos para hacer zoom
            </div>
            <div
              className={`bg-zinc-950 border border-white/10 rounded-3xl h-[50vh] min-h-[400px] max-h-[600px] shadow-2xl relative overflow-hidden flex items-center justify-center w-full touch-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
              ref={mapContainerRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              {parsedZones.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-zinc-500 text-center cursor-default">
                  El mapa de asientos aún no está disponible para este evento.
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div
                    style={{
                      transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                      transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                    }}
                  >
                    <div className="bg-zinc-900/60 shadow-2xl rounded-[3rem] p-4 md:p-8 flex flex-col items-center justify-center border border-white/10 relative min-w-[700px] backdrop-blur-md">

                      {/* Norte */}
                      {parsedZones.find(z => z.zone_type === 'NORTE') && (
                        <div className="flex justify-center mb-2 md:mb-4">
                          {renderPublicZone(parsedZones.find(z => z.zone_type === 'NORTE'), 'top')}
                        </div>
                      )}

                      <div className="flex items-center justify-center w-full">
                        {/* Oeste */}
                        <div className="flex-1 flex justify-end pr-2 md:pr-4 relative">
                          <div className="absolute left-[-20px] top-1/2 -translate-y-1/2 -rotate-90 text-zinc-500 font-black text-3xl md:text-4xl tracking-widest opacity-20 pointer-events-none">GENERAL</div>
                          {renderPublicZone(parsedZones.find(z => z.zone_type === 'OESTE'), 'left')}
                        </div>

                        {/* El Ring Central - Diseño Realista */}
                        <div className="relative w-48 h-48 md:w-64 md:h-64 bg-[#d4d4d8] border-[8px] border-zinc-950 rounded flex items-center justify-center shadow-[0_0_80px_rgba(255,255,255,0.05)] z-10 shrink-0 mx-8 md:mx-16 lg:mx-24">
                          <div className="absolute inset-1 border-[1.5px] border-red-600/80 rounded-sm"></div>
                          <div className="absolute inset-2 border-[1.5px] border-zinc-100 rounded-sm"></div>
                          <div className="absolute inset-3 border-[1.5px] border-red-600/80 rounded-sm"></div>
                          <div className="absolute -top-2 -left-2 w-5 h-5 bg-red-600 rounded-full shadow-lg border-2 border-black z-20"></div>
                          <div className="absolute top-2 left-2 w-6 h-6 bg-zinc-900 rotate-45 transform -translate-x-1 -translate-y-1 rounded-sm z-10"></div>
                          <div className="absolute -top-2 -right-2 w-5 h-5 bg-blue-600 rounded-full shadow-lg border-2 border-black z-20"></div>
                          <div className="absolute top-2 right-2 w-6 h-6 bg-zinc-900 -rotate-45 transform translate-x-1 -translate-y-1 rounded-sm z-10"></div>
                          <div className="absolute -bottom-2 -left-2 w-5 h-5 bg-blue-600 rounded-full shadow-lg border-2 border-black z-20"></div>
                          <div className="absolute bottom-2 left-2 w-6 h-6 bg-zinc-900 -rotate-45 transform -translate-x-1 translate-y-1 rounded-sm z-10"></div>
                          <div className="absolute -bottom-2 -right-2 w-5 h-5 bg-red-600 rounded-full shadow-lg border-2 border-black z-20"></div>
                          <div className="absolute bottom-2 right-2 w-6 h-6 bg-zinc-900 -rotate-45 transform translate-x-1 translate-y-1 rounded-sm z-10"></div>
                          <div className="relative flex items-center justify-center w-24 h-24 border-4 border-zinc-400/50 rounded-full">
                            <span className="text-zinc-400/80 font-black text-4xl tracking-tighter select-none">SCW</span>
                          </div>
                        </div>

                        {/* Este */}
                        <div className="flex-1 flex justify-start pl-2 md:pl-4 relative">
                          <div className="absolute right-[-40px] top-1/2 -translate-y-1/2 rotate-90 text-zinc-500 font-black text-4xl tracking-widest opacity-30 pointer-events-none">ESCENARIO</div>
                          {renderPublicZone(parsedZones.find(z => z.zone_type === 'ESTE'), 'right')}
                        </div>
                      </div>

                      {/* Sur */}
                      {parsedZones.find(z => z.zone_type === 'SUR') && (
                        <div className="flex justify-center mt-2 md:mt-4">
                          {renderPublicZone(parsedZones.find(z => z.zone_type === 'SUR'), 'bottom')}
                        </div>
                      )}
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
          </>
        )}
      </AnimatePresence >
    </div >
  );
}
