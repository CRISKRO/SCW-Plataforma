"use client";

import { useEffect, useState, use, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, MapPin, Ticket, ShoppingCart, X, CheckCircle, Minus, Plus as PlusIcon } from 'lucide-react';
import api from '@/services/api';
import { useCartStore } from '@/store/cartStore';
import { useToastStore } from '@/store/toastStore';
import { useRouter } from 'next/navigation';
import { eventsService } from '@/services/events.services';
import ArenaSeatMap from '@/components/ArenaSeatMap';

interface SelectedSeat {
  seatId: number;
  rowName: string;
  seatNumber: number | string;
  zoneType: string;
  price: number;
  zoneId: number;
}

const ZONE_LABELS: Record<string, string> = {
  MESAS_VIP_RINGSIDE: 'Mesas VIP Ringside',
  MESAS_VIP: 'Mesas VIP',
  PRIMERA_FILA: 'Primera Fila',
  SEGUNDA_FILA: 'Segunda Fila',
  NORTE: 'Norte',
  SUR: 'Sur',
  ESTE: 'Este',
  OESTE: 'Oeste',
  GENERAL: 'General',
  CUSTOM: 'Zona Especial',
};

const ZONE_COLORS: Record<string, string> = {
  MESAS_VIP_RINGSIDE: 'text-pink-400 border-pink-500',
  MESAS_VIP: 'text-amber-400 border-amber-500',
  PRIMERA_FILA: 'text-red-400 border-red-500',
  SEGUNDA_FILA: 'text-blue-400 border-blue-500',
  NORTE: 'text-red-400 border-red-500',
  SUR: 'text-red-400 border-red-500',
  ESTE: 'text-red-400 border-red-500',
  OESTE: 'text-red-400 border-red-500',
  GENERAL: 'text-emerald-400 border-emerald-500',
  CUSTOM: 'text-purple-400 border-purple-500',
};

const getEventDays = (dateTimeStr?: string) => {
  if (!dateTimeStr) {
    return {
      day1Name: '',
      day2Name: '',
      day1Tab: 'Día 1',
      day2Tab: 'Día 2',
      day1Label: ' (Día 1)',
      day2Label: ' (Día 2)',
    };
  }

  try {
    const d1 = new Date(dateTimeStr);
    const d2 = new Date(d1);
    d2.setDate(d2.getDate() + 1);

    const capitalize = (str: string) => (str ? str.charAt(0).toUpperCase() + str.slice(1) : '');
    const d1Name = capitalize(d1.toLocaleDateString('es-MX', { weekday: 'long' }));
    const d2Name = capitalize(d2.toLocaleDateString('es-MX', { weekday: 'long' }));

    return {
      day1Name: d1Name,
      day2Name: d2Name,
      day1Tab: `Día 1 (${d1Name})`,
      day2Tab: `Día 2 (${d2Name})`,
      day1Label: ` (Día 1 - ${d1Name})`,
      day2Label: ` (Día 2 - ${d2Name})`,
    };
  } catch {
    return {
      day1Name: '',
      day2Name: '',
      day1Tab: 'Día 1',
      day2Tab: 'Día 2',
      day1Label: ' (Día 1)',
      day2Label: ' (Día 2)',
    };
  }
};

export default function EventDetail({ params }: { params: Promise<{ slug: string }> }) {
  const unwrappedParams = use(params);
  const slug = unwrappedParams.slug;

  const [event, setEvent] = useState<any>(null);
  const [actualEventId, setActualEventId] = useState<number | null>(null);
  const [zones, setZones] = useState<any[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<SelectedSeat[]>([]);
  const [selectedDay, setSelectedDay] = useState<'DAY_1' | 'DAY_2' | 'BOTH'>('DAY_1');
  const [showConfirmPanel, setShowConfirmPanel] = useState(false);
  const [loading, setLoading] = useState(true);
  const addItem = useCartStore((state) => state.addItem);
  const [sessionId] = useState(() => Math.random().toString(36).substring(2, 15));
  const router = useRouter();

  const { day1Tab, day2Tab, day1Label, day2Label } = useMemo(() => {
    return getEventDays(event?.date_time);
  }, [event?.date_time]);

  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(0.6);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const initialPinchDist = useRef<number | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const innerContainerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => setScale(s => Math.min(s + 0.2, 3));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.2, minScale));
  const handleResetZoom = () => {
    if (mapContainerRef.current && innerContainerRef.current) {
      const containerWidth = mapContainerRef.current.clientWidth;
      const innerWidth = innerContainerRef.current.clientWidth;
      const calculatedMinScale = containerWidth < innerWidth ? (containerWidth / innerWidth) * 0.88 : 1;
      setScale(calculatedMinScale);
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
      setScale(s => Math.min(Math.max(s * ratio, minScale), 3));
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
        const events = await eventsService.getEvents();
        const eventMatch = events.find((e: any) => {
          const genSlug = e.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
          return genSlug === slug || e.id.toString() === slug;
        });

        if (!eventMatch) throw new Error("Event not found");
        const foundId = eventMatch.id;
        
        if (isMounted) {
          setEvent(eventMatch);
          setActualEventId(foundId);
        }

        const res = await api.get(`/tickets/zones/by_event/?event_id=${foundId}&day=${selectedDay}`);
        if (isMounted) {
          setZones(res.data);
        }
      } catch (error) {
        console.error("Error loading data:", error);
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
  }, [slug, selectedDay]);

  useEffect(() => {
    if (mapContainerRef.current && innerContainerRef.current && parsedZones.length > 0) {
      // Use a short timeout to let the DOM render the inner content width properly
      setTimeout(() => {
        if (!mapContainerRef.current || !innerContainerRef.current) return;
        const containerWidth = mapContainerRef.current.clientWidth;
        const innerWidth = innerContainerRef.current.clientWidth;
        
        // Fit with some margin so it doesn't feel too close to the edges
        const calculatedMinScale = containerWidth < innerWidth ? (containerWidth / innerWidth) * 0.88 : 1;
        setMinScale(calculatedMinScale);
        setScale(calculatedMinScale);
        setPosition({ x: 0, y: 0 });
      }, 50);
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

  const isArenaMap = event?.map_type === 'ARENA_VIP' || zones.some(z => ['MESAS_VIP_RINGSIDE', 'MESAS_VIP', 'PRIMERA_FILA', 'SEGUNDA_FILA'].includes(z.zone_type));

  const isSeatSelected = (seatId: number) =>
    selectedSeats.some(s => s.seatId === seatId);

  const toggleSeat = (seat: any, zone: any, displayNumber?: number | string) => {
    if (!seat.is_available || seat.is_locked) return;

    if (isSeatSelected(seat.id)) {
      setSelectedSeats(prev => prev.filter(s => s.seatId !== seat.id));
    } else {
      const isAbono = !!event?.is_multi_day && selectedDay === 'BOTH';
      const effectivePrice = isAbono
        ? (zone.price_abono ? parseFloat(zone.price_abono) : parseFloat(zone.price) * 2)
        : parseFloat(zone.price);

      const dNum = displayNumber ?? (seat.custom_label || (seat.table_number ? `Mesa ${seat.table_number}` : (seat.display_number ?? getDisplayNumber(zone.zone_type, seat.seat_number))));

      setSelectedSeats(prev => [
        ...prev,
        {
          seatId: seat.id,
          rowName: seat.row_name,
          seatNumber: dNum,
          zoneType: zone.zone_type,
          price: effectivePrice,
          zoneId: zone.id,
        },
      ]);
    }
  };

  const handleSelectGeneral = (zone: any) => {
    const isAbono = !!event?.is_multi_day && selectedDay === 'BOTH';
    const effectivePrice = isAbono
      ? (zone.price_abono ? parseFloat(zone.price_abono) : parseFloat(zone.price) * 2)
      : parseFloat(zone.price);

    const isMultiDay = !!event.is_multi_day;
    const effectiveDay = isMultiDay ? selectedDay : 'ALL';
    const dayLabel = isMultiDay ? (selectedDay === 'DAY_1' ? day1Label : selectedDay === 'DAY_2' ? day2Label : ' (Pase 2 Días - Abono)') : '';
    const daySuffix = isMultiDay ? (selectedDay === 'DAY_1' ? '1' : selectedDay === 'DAY_2' ? '2' : '3') : '0';

    addItem({
      id: parseInt(`${actualEventId}999${daySuffix}`),
      name: `Boleto: ${event.title}`,
      price: effectivePrice,
      quantity: 1,
      image_url: event.banner_url || '',
      size: `General (Sin Numeración)${dayLabel}`,
      event_id: actualEventId!,
      valid_for_day: effectiveDay,
      session_id: sessionId,
    });
    useToastStore.getState().addToast(`Se agregó 1 boleto General al carrito`, 'success');
  };

  const removeSeat = (seatId: number) => {
    setSelectedSeats(prev => prev.filter(s => s.seatId !== seatId));
  };

  const validateOrphanSeats = (): boolean => {
    if (isArenaMap) return true;
    for (const zone of parsedZones) {
      if (!zone.groupedSeats) continue;
      for (const rowName of Object.keys(zone.groupedSeats)) {
        const seats = zone.groupedSeats[rowName];
        if (!seats || seats.length === 0) continue;
        
        // Sort seats physically by seat_number
        const sortedSeats = [...seats].sort((a: any, b: any) => a.seat_number - b.seat_number);
        
        const states = sortedSeats.map((seat: any) => {
          if (isSeatSelected(seat.id)) return 'S';
          if (!seat.is_available || seat.is_locked) return 'U';
          return 'E';
        });
        
        for (let i = 0; i < states.length; i++) {
          if (states[i] === 'E') {
            const left = i === 0 ? 'U' : states[i - 1];
            const right = i === states.length - 1 ? 'U' : states[i + 1];
            
            if ((left === 'U' || left === 'S') && (right === 'U' || right === 'S')) {
              // It's an orphan. Did the user create it? (Is at least one neighbor 'S'?)
              if (left === 'S' || right === 'S') {
                useToastStore.getState().addToast(`No puedes dejar un solo asiento vacío aislado en la fila ${rowName}. Por favor selecciona asientos contiguos o deja al menos 2 libres.`, 'error');
                return false;
              }
            }
          }
        }
      }
    }
    return true;
  };

  const handleConfirm = async () => {
    if (!event || !actualEventId) return;
    if (!validateOrphanSeats()) return;
    
    try {
      setLoading(true);
      const isMultiDay = !!event.is_multi_day;
      const effectiveDay = isMultiDay ? selectedDay : 'ALL';
      const seatIds = selectedSeats.map(s => s.seatId);

      await api.post('/tickets/seats/lock_seats/', { seat_ids: seatIds, session_id: sessionId, day: effectiveDay });

      const dayLabel = isMultiDay ? (selectedDay === 'DAY_1' ? day1Label : selectedDay === 'DAY_2' ? day2Label : ' (Pase 2 Días - Abono)') : '';
      const daySuffix = isMultiDay ? (selectedDay === 'DAY_1' ? '1' : selectedDay === 'DAY_2' ? '2' : '3') : '0';

      selectedSeats.forEach(seat => {
        addItem({
          id: parseInt(`${actualEventId}${seat.seatId}${daySuffix}`),
          name: `Boleto: ${event.title}`,
          price: seat.price,
          quantity: 1,
          image_url: event.banner_url || '',
          size: `${ZONE_LABELS[seat.zoneType] || seat.zoneType} · Fila ${seat.rowName} - Asiento ${seat.seatNumber}${dayLabel}`,
          seat_id: seat.seatId,
          event_id: actualEventId,
          valid_for_day: effectiveDay,
          session_id: sessionId,
        });
      });
      setSelectedSeats([]);
      setShowConfirmPanel(false);
      useToastStore.getState().addToast(`Se agregaron ${selectedSeats.length} boleto(s) al carrito y se reservaron por 10 min`, 'success');

      // Smoothly scroll to the top since the page height will shrink and leave the user stranded at the bottom
      window.scrollTo({ top: 0, behavior: 'smooth' });
      router.push('/carrito');
    } catch (error: any) {
      useToastStore.getState().addToast(error.response?.data?.error || "Error al reservar asientos.", "error");
      // Refetch to get current state
      const zonesRes = await api.get(`/tickets/zones/by_event/?event_id=${actualEventId}&day=${selectedDay}`);
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

        {/* Day Selection Tabs (solo si el evento está configurado como de 2 días) */}
        {event.is_multi_day && (
          <div className="bg-zinc-950 border border-white/10 rounded-2xl p-4 sm:p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-red-500" /> Selecciona la Vigencia del Asiento
              </p>
              <span className="text-[11px] font-medium text-zinc-500 hidden sm:inline">
                Los asientos comprados por día quedan libres para la otra fecha
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(() => {
                const sampleNumberedZone = zones.find(z => z.zone_type !== 'GENERAL');
                const sampleDayPrice = sampleNumberedZone ? parseFloat(sampleNumberedZone.price) : null;
                const sampleAbonoPrice = sampleNumberedZone ? (sampleNumberedZone.price_abono ? parseFloat(sampleNumberedZone.price_abono) : (sampleDayPrice ? sampleDayPrice * 2 : null)) : null;

                return (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedDay !== 'DAY_1') {
                          setSelectedDay('DAY_1');
                          setSelectedSeats([]);
                        }
                      }}
                      className={`py-3 px-4 rounded-xl font-bold text-xs md:text-sm uppercase tracking-wider transition-all border flex flex-col items-center justify-center gap-1 ${
                        selectedDay === 'DAY_1'
                          ? 'bg-gradient-to-r from-red-600 to-red-700 text-white border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)] scale-[1.02]'
                          : 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-white'
                      }`}
                    >
                      <span>{day1Tab}</span>
                      {sampleDayPrice && (
                        <span className="text-[11px] font-semibold opacity-90">${sampleDayPrice.toFixed(2)} MXN</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedDay !== 'DAY_2') {
                          setSelectedDay('DAY_2');
                          setSelectedSeats([]);
                        }
                      }}
                      className={`py-3 px-4 rounded-xl font-bold text-xs md:text-sm uppercase tracking-wider transition-all border flex flex-col items-center justify-center gap-1 ${
                        selectedDay === 'DAY_2'
                          ? 'bg-gradient-to-r from-red-600 to-red-700 text-white border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)] scale-[1.02]'
                          : 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-white'
                      }`}
                    >
                      <span>{day2Tab}</span>
                      {sampleDayPrice && (
                        <span className="text-[11px] font-semibold opacity-90">${sampleDayPrice.toFixed(2)} MXN</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedDay !== 'BOTH') {
                          setSelectedDay('BOTH');
                          setSelectedSeats([]);
                        }
                      }}
                      className={`py-3 px-4 rounded-xl font-bold text-xs md:text-sm uppercase tracking-wider transition-all border flex flex-col items-center justify-center gap-1 ${
                        selectedDay === 'BOTH'
                          ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.5)] scale-[1.02]'
                          : 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:border-amber-700/50 hover:text-white'
                      }`}
                    >
                      <span>Pase 2 Días (Abono)</span>
                      {sampleAbonoPrice && (
                        <span className="text-[11px] font-semibold opacity-90 text-amber-300">${sampleAbonoPrice.toFixed(2)} MXN</span>
                      )}
                    </button>
                  </>
                );
              })()}
            </div>
          </div>
        )}

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

              {/* Controles de Zoom para mapa clásico */}
              {!isArenaMap && parsedZones.length > 0 && (
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

            {isArenaMap ? (
              <ArenaSeatMap
                zones={zones}
                selectedSeatIds={selectedSeats.map(s => s.seatId)}
                onToggleSeat={(seat, zone) => toggleSeat(seat, zone)}
                onSelectGeneral={handleSelectGeneral}
              />
            ) : (
              <>
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
                        ref={innerContainerRef}
                        style={{
                          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                          transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                        }}
                      >
                        <div className="bg-zinc-900/60 shadow-2xl rounded-[1.5rem] p-1.5 md:p-3 flex flex-col items-center justify-center border border-white/10 relative w-max backdrop-blur-md">

                          {/* Norte */}
                          {parsedZones.find(z => z.zone_type === 'NORTE') && (
                            <div className="flex justify-center mb-6 md:mb-10">
                              {renderPublicZone(parsedZones.find(z => z.zone_type === 'NORTE'), 'top')}
                            </div>
                          )}

                          <div className="flex items-center justify-center w-full">
                            {/* Oeste */}
                            <div className="flex-1 flex justify-end pr-6 md:pr-10 relative">
                              {renderPublicZone(parsedZones.find(z => z.zone_type === 'OESTE'), 'left')}
                            </div>

                            {/* El Ring Central - Diseño Realista */}
                            <div className="relative w-48 h-48 md:w-64 md:h-64 bg-[#d4d4d8] border-[8px] border-zinc-950 rounded flex items-center justify-center shadow-[0_0_80px_rgba(255,255,255,0.05)] z-10 shrink-0 mx-8 md:mx-12 lg:mx-16">
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
                              <div className="absolute bottom-2 right-2 w-6 h-6 bg-zinc-900 rotate-45 transform translate-x-1 translate-y-1 rounded-sm z-10"></div>
                              <div className="relative flex items-center justify-center w-24 h-24 border-4 border-zinc-400/50 rounded-full p-2 bg-black/10">
                                <img src="/images/logo-scw.png" alt="SCW Logo" className="w-16 h-16 object-contain drop-shadow-md select-none pointer-events-none opacity-90" />
                              </div>
                            </div>

                            {/* Este */}
                            <div className="flex-1 flex justify-start pl-6 md:pl-10 relative">
                              {renderPublicZone(parsedZones.find(z => z.zone_type === 'ESTE'), 'right')}
                            </div>
                          </div>

                          {/* Sur */}
                          {parsedZones.find(z => z.zone_type === 'SUR') && (
                            <div className="flex justify-center mt-6 md:mt-10">
                              {renderPublicZone(parsedZones.find(z => z.zone_type === 'SUR'), 'bottom')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
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
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
              onClick={() => setShowConfirmPanel(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 24 }}
              className="fixed inset-0 flex items-center justify-center z-[101] p-4 sm:p-6"
            >
              <div className="bg-zinc-950 border border-white/10 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl max-h-[85vh] flex flex-col my-auto relative">
                <div className="flex justify-between items-center mb-4 shrink-0">
                  <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
                    Confirmar Compra
                  </h3>
                  <button
                    onClick={() => setShowConfirmPanel(false)}
                    className="text-zinc-500 hover:text-white transition-colors p-1"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <p className="text-zinc-400 text-xs sm:text-sm mb-4 uppercase tracking-widest font-bold shrink-0">{event.title}</p>

                {/* Lista de asientos con scroll interno */}
                <ul className="space-y-3 mb-4 overflow-y-auto pr-1.5 flex-1 min-h-0 custom-scrollbar">
                  {selectedSeats.map(seat => (
                    <li key={seat.seatId} className="flex justify-between items-center bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 shrink-0">
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
                          className="text-zinc-600 hover:text-red-500 transition-colors p-1"
                          title="Eliminar asiento"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Footer fijo con total a pagar y botones de acción */}
                <div className="border-t border-white/10 pt-4 pb-4 flex justify-between items-center font-bold text-base sm:text-lg shrink-0">
                  <span className="text-zinc-400">Total a pagar</span>
                  <span className="text-white font-black">${totalPrice.toFixed(2)} <span className="text-xs sm:text-sm text-zinc-500 font-normal">MXN</span></span>
                </div>

                <div className="flex gap-3 sm:gap-4 shrink-0">
                  <button
                    onClick={() => setShowConfirmPanel(false)}
                    className="flex-1 border border-white/10 text-zinc-400 hover:text-white hover:border-white/30 font-bold text-xs sm:text-sm uppercase tracking-widest py-3 rounded-xl transition-colors"
                  >
                    Seguir Eligiendo
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold text-xs sm:text-sm uppercase tracking-widest py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-950/40"
                  >
                    <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                    Comprar Ahora
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
