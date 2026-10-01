"use client";

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Ticket, Minus, MapPin, Layout, Sliders, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { eventsService } from '@/services/events.services';
import { adminService } from '@/services/admin.services';
import InteractiveSeatBuilder from '@/components/admin/InteractiveSeatBuilder';
import ArenaSeatMap from '@/components/ArenaSeatMap';

const ZONE_TYPES = [
  { value: 'MESAS_VIP_RINGSIDE', label: 'Mesas VIP Ringside (1-8)' },
  { value: 'MESAS_VIP', label: 'Mesas VIP (1-12)' },
  { value: 'PRIMERA_FILA', label: 'Primera Fila (1-44)' },
  { value: 'SEGUNDA_FILA', label: 'Segunda Fila (1-44)' },
  { value: 'NORTE', label: 'Norte' },
  { value: 'SUR', label: 'Sur' },
  { value: 'ESTE', label: 'Este' },
  { value: 'OESTE', label: 'Oeste' },
  { value: 'GENERAL', label: 'General' },
  { value: 'CUSTOM', label: 'Personalizada' },
];

const ZONE_COLORS: Record<string, string> = {
  MESAS_VIP_RINGSIDE: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  MESAS_VIP: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  PRIMERA_FILA: 'bg-red-500/20 text-red-400 border-red-500/30',
  SEGUNDA_FILA: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  NORTE: 'bg-red-500/20 text-red-400 border-red-500/30',
  SUR: 'bg-red-500/20 text-red-400 border-red-500/30',
  ESTE: 'bg-red-500/20 text-red-400 border-red-500/30',
  OESTE: 'bg-red-500/20 text-red-400 border-red-500/30',
  GENERAL: 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40',
  CUSTOM: 'bg-purple-950/40 text-purple-400 border-purple-800/40',
};

export default function EventTicketsPage() {
  const params = useParams();
  const eventId = Number(params.eventId);

  const [event, setEvent] = useState<any>(null);
  const [zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'BUILDER' | 'ZONES' | 'AVAILABILITY'>('BUILDER');

  const [editingZone, setEditingZone] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editPriceAbono, setEditPriceAbono] = useState('');

  const getDefaultSeats = (type: string) => {
    if (type === 'NORTE' || type === 'SUR') return 17;
    if (type === 'OESTE') return 16;
    return 10;
  };

  const [newZone, setNewZone] = useState({
    zone_type: 'NORTE',
    price: '',
    price_abono: '',
    rows: 2,
    seats_per_row: 17,
  });

  // Zoom and Pan state
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const initialPinchDist = useRef<number | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => setScale(s => Math.min(s + 0.2, 3));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.2, 0.6));
  const handleResetZoom = () => { setScale(1); setPosition({ x: 0, y: 0 }); };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const PAN_LIMIT = 200;

  const handlePointerMove = (e: React.PointerEvent) => {
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

  const handlePointerUp = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
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

  const handleTouchMove = (e: React.TouchEvent) => {
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
      
      const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      const ratio = dist / initialPinchDist.current;
      setScale(s => Math.min(Math.max(s * ratio, 0.6), 3));
      initialPinchDist.current = dist;

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

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      setIsDragging(false);
    }
    if (e.touches.length < 2) {
      initialPinchDist.current = null;
    }
  };

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventData, zonesData] = await Promise.all([
          eventsService.getEventDetails(eventId),
          adminService.getZonesByEvent(eventId),
        ]);
        setEvent(eventData);
        setZones(zonesData);
        
        const existing = zonesData.map((z: any) => z.zone_type);
        const available = ZONE_TYPES.filter(zt => !existing.includes(zt.value));
        if (available.length > 0) {
          setNewZone(prev => ({ ...prev, zone_type: available[0].value, seats_per_row: getDefaultSeats(available[0].value) }));
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [eventId]);

  const handleAddZone = async (e: React.FormEvent) => {
    e.preventDefault();

    const existingZ = zones.map(z => z.zone_type);
    const availableZ = ZONE_TYPES.filter(zt => !existingZ.includes(zt.value));
    let typeToSubmit = newZone.zone_type;
    if (!availableZ.find(zt => zt.value === typeToSubmit) && availableZ.length > 0) {
      typeToSubmit = availableZ[0].value;
    }

    setSaving(true);
    try {
      const created = await adminService.createZone({
        event: eventId,
        zone_type: typeToSubmit,
        price: newZone.price,
        price_abono: newZone.price_abono ? newZone.price_abono : null,
        rows: Number(newZone.rows),
        seats_per_row: Number(newZone.seats_per_row),
      });
      const updatedZones = [...zones, created];
      setZones(updatedZones);
      
      const newExisting = updatedZones.map(z => z.zone_type);
      const newAvailable = ZONE_TYPES.filter(zt => !newExisting.includes(zt.value));
      
      setNewZone({ 
        zone_type: newAvailable.length > 0 ? newAvailable[0].value : 'NORTE', 
        price: '', 
        price_abono: '',
        rows: 2, 
        seats_per_row: newAvailable.length > 0 ? getDefaultSeats(newAvailable[0].value) : 17 
      });
    } catch (error: any) {
      const data = error?.response?.data;
      let msg = "Error al crear la zona.";
      if (typeof data === 'string' && data.includes('no such column')) {
        msg = "Faltan migraciones en el servidor backend (PythonAnywhere). Ejecuta en la consola Bash: python manage.py migrate";
      } else if (data?.non_field_errors?.[0]) {
        msg = data.non_field_errors[0];
      } else if (data?.error) {
        msg = data.error;
      } else if (data?.detail) {
        msg = data.detail;
      }
      alert(msg.includes('unique_together') ? 'Esta zona ya existe para este evento.' : msg);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateZone = async (zoneId: number) => {
    try {
      setSaving(true);
      const payload: any = { price: editPrice };
      if (event?.is_multi_day) {
        payload.price_abono = editPriceAbono ? editPriceAbono : null;
      }
      const updated = await adminService.updateZone(zoneId, payload);
      setZones(zones.map(z => z.id === zoneId ? { ...z, price: updated.price, price_abono: updated.price_abono } : z));
      setEditingZone(null);
    } catch (error) {
      alert("Error al actualizar la zona.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteZone = async (zoneId: number) => {
    if (confirm('¿Eliminar esta zona y todos sus asientos?')) {
      try {
        await adminService.deleteZone(zoneId);
        setZones(zones.filter(z => z.id !== zoneId));
      } catch (error) {
        alert("Error al eliminar la zona.");
      }
    }
  };

  const handleToggleSeat = async (zoneId: number, seatId: number, currentStatus: boolean) => {
    // Optimistic update
    setZones(prev => prev.map(z => {
      if (z.id !== zoneId) return z;
      return {
        ...z,
        seats: z.seats.map((s: any) => s.id === seatId ? { ...s, is_available: !currentStatus } : s)
      };
    }));
    try {
      await adminService.updateSeat(seatId, { is_available: !currentStatus });
    } catch (error) {
      // Revert if error
      setZones(prev => prev.map(z => {
        if (z.id !== zoneId) return z;
        return {
          ...z,
          seats: z.seats.map((s: any) => s.id === seatId ? { ...s, is_available: currentStatus } : s)
        };
      }));
      alert("Error al actualizar estado del asiento.");
    }
  };

  if (loading) return <div className="text-zinc-500 py-8">Cargando...</div>;

  const totalSeats = zones.reduce((acc, z) => acc + (z.rows * z.seats_per_row), 0);
  const existingZoneTypes = zones.map(z => z.zone_type);
  const availableZoneTypes = ZONE_TYPES.filter(zt => !existingZoneTypes.includes(zt.value));

  const getDisplayNumber = (zoneType: string, seatNumber: number) => {
    if (zoneType === 'NORTE') return seatNumber;
    if (zoneType === 'ESTE') return seatNumber + 17;
    if (zoneType === 'SUR') return seatNumber + 27;
    if (zoneType === 'OESTE') return seatNumber + 44;
    return seatNumber;
  };

  const renderZone = (zone: any, position: 'top'|'bottom'|'left'|'right'|'default' = 'default') => {
    if (!zone) return null;
    const groupedSeats: Record<string, any[]> = {};
    zone.seats?.forEach((seat: any) => {
      if (!groupedSeats[seat.row_name]) groupedSeats[seat.row_name] = [];
      groupedSeats[seat.row_name].push(seat);
    });

    const sortedRowNames = Object.keys(groupedSeats).sort();
    if (position === 'left' || position === 'top') {
      sortedRowNames.reverse();
    }

    const isVertical = position === 'left' || position === 'right';

    return (
      <div key={zone.id} className="flex flex-col items-center relative">
        <div className={`flex gap-0.5 ${isVertical ? 'flex-row' : 'flex-col'}`}>
          {sortedRowNames.map(rowName => (
            <div key={rowName} className={`flex items-center justify-center gap-0.5 ${isVertical ? 'flex-col' : 'flex-row'}`}>
              <div className={`flex gap-0.5 ${isVertical ? 'flex-col' : 'flex-row'}`}>
                {groupedSeats[rowName].sort((a, b) => {
                  if (zone.zone_type === 'SUR' || zone.zone_type === 'OESTE') {
                    return b.seat_number - a.seat_number;
                  }
                  return a.seat_number - b.seat_number;
                }).map(seat => {
                  const displayNumber = getDisplayNumber(zone.zone_type, seat.seat_number);
                  return (
                  <div key={seat.id} className="contents">
                    <button
                      onClick={() => handleToggleSeat(zone.id, seat.id, seat.is_available)}
                      className={`w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 rounded-sm flex items-center justify-center text-[9px] md:text-[10px] font-bold transition-all shadow-sm ${!seat.is_available ? 'bg-zinc-900 text-zinc-600 border border-zinc-800 opacity-50 cursor-not-allowed' : 'bg-zinc-800 text-zinc-300 border border-zinc-600 hover:bg-zinc-700 hover:scale-110 z-10 hover:shadow-lg'}`}
                      title={`Fila ${rowName} - Asiento ${displayNumber} (${ZONE_TYPES.find(zt => zt.value === zone.zone_type)?.label})`}
                    >
                      {displayNumber}
                    </button>
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

  const zoneNorte = zones.find(z => z.zone_type === 'NORTE');
  const zoneSur = zones.find(z => z.zone_type === 'SUR');
  const zoneEste = zones.find(z => z.zone_type === 'ESTE');
  const zoneOeste = zones.find(z => z.zone_type === 'OESTE');

  const isArenaMap = event?.map_type === 'ARENA_VIP' || zones.some(z => ['MESAS_VIP_RINGSIDE', 'MESAS_VIP', 'PRIMERA_FILA', 'SEGUNDA_FILA'].includes(z.zone_type));

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link 
            href="/admin/events" 
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 px-3.5 py-2 rounded-lg transition-colors text-xs font-semibold uppercase tracking-wider"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Volver a Eventos</span>
          </Link>
          <div>
            <p className="text-red-500 text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
              <span>Gestión de Boletos y Mapas</span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                isArenaMap
                  ? 'bg-red-950 text-red-300 border-red-800'
                  : 'bg-amber-950 text-amber-300 border-amber-800'
              }`}>
                {isArenaMap ? 'Sede: Labrú' : 'Sede: The Wrestling Factory'}
              </span>
            </p>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">{event?.title}</h1>
            <p className="text-zinc-400 mt-1 flex items-center gap-2 text-xs sm:text-sm">
              <span>{new Date(event?.date_time).toLocaleString()}</span>
              <span>·</span>
              <span className="text-amber-400 font-semibold">{event?.location}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-950 border border-white/10 rounded-xl p-4 shadow-sm">
          <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Sede / Plantilla</p>
          <p className="text-base font-bold text-amber-400 mt-1 truncate">
            {isArenaMap ? 'Labrú' : 'The Wrestling Factory'}
          </p>
        </div>
        <div className="bg-zinc-950 border border-white/10 rounded-xl p-4 shadow-sm">
          <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Zonas Creadas</p>
          <p className="text-2xl font-bold text-white mt-1">{zones.length}</p>
        </div>
        <div className="bg-zinc-950 border border-white/10 rounded-xl p-4 shadow-sm">
          <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Total Asientos</p>
          <p className="text-2xl font-bold text-white mt-1">{totalSeats}</p>
        </div>
        <div className="bg-zinc-950 border border-white/10 rounded-xl p-4 shadow-sm">
          <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Disponibles</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">
            {zones.reduce((acc, z) => acc + (z.seats?.filter((s: any) => s.is_available && !s.is_locked).length || 0), 0)}
          </p>
        </div>
      </div>

      {/* Navigation Tabs - Simple Clean Style */}
      <div className="bg-zinc-950 border border-white/10 p-1.5 rounded-xl flex gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('BUILDER')}
          className={`flex items-center gap-2 py-2 px-4 rounded-lg font-semibold text-xs uppercase tracking-wider transition-colors shrink-0 ${
            activeTab === 'BUILDER'
              ? 'bg-red-600 text-white'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <Layout className="w-4 h-4" />
          <span>Editor de Mapa ({isArenaMap ? 'Labrú' : 'The Wrestling Factory'})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ZONES')}
          className={`flex items-center gap-2 py-2 px-4 rounded-lg font-semibold text-xs uppercase tracking-wider transition-colors shrink-0 ${
            activeTab === 'ZONES'
              ? 'bg-red-600 text-white'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Zonas y Precios</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('AVAILABILITY')}
          className={`flex items-center gap-2 py-2 px-4 rounded-lg font-semibold text-xs uppercase tracking-wider transition-colors shrink-0 ${
            activeTab === 'AVAILABILITY'
              ? 'bg-red-600 text-white'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <Ticket className="w-4 h-4" />
          <span>Disponibilidad en Vivo ({totalSeats})</span>
        </button>
      </div>

      {/* TAB 1: INTERACTIVE SEAT BUILDER */}
      {activeTab === 'BUILDER' && (
        <InteractiveSeatBuilder
          eventId={eventId}
          event={event}
          zones={zones}
          onZonesUpdated={(updatedZones) => setZones(updatedZones)}
          onEventUpdated={(updatedEvent) => setEvent(updatedEvent)}
        />
      )}

      {/* TAB 2: ZONES & PRICES CONFIGURATION */}
      {activeTab === 'ZONES' && (
        <div className="space-y-8">
          {/* Existing Zones */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Ticket className="w-5 h-5 text-red-500" />
              Zonas Configuradas
            </h2>

            {zones.length === 0 ? (
              <div className="bg-zinc-950 border border-white/10 rounded-xl p-8 text-center text-zinc-500">
                No hay zonas configuradas aún. Usa el Editor Interactivo o agrega la primera zona abajo.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {zones.map(zone => (
                  <div key={zone.id} className={`border rounded-xl p-6 flex justify-between items-start ${ZONE_COLORS[zone.zone_type] || 'bg-zinc-900 border-white/10 text-white'}`}>
                    {editingZone === zone.id ? (
                      <div className="flex-1 mr-4 space-y-3">
                        <p className="font-black text-lg uppercase tracking-widest">
                          {zone.name || ZONE_TYPES.find(zt => zt.value === zone.zone_type)?.label || zone.zone_type}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs uppercase tracking-widest font-bold opacity-70 mb-1 block">Precio por Día (MXN)</label>
                            <input 
                              type="number" 
                              step="0.01" 
                              value={editPrice}
                              onChange={e => setEditPrice(e.target.value)}
                              className="w-full bg-zinc-950 border border-white/20 rounded px-3 py-2 text-white focus:outline-none focus:border-red-500 text-sm"
                              placeholder="Ej. 320.00"
                            />
                          </div>
                          {event?.is_multi_day && (
                            <div>
                              <label className="text-xs uppercase tracking-widest font-bold text-amber-400 mb-1 block">Precio Abono 2 Días (MXN)</label>
                              <input 
                                type="number" 
                                step="0.01" 
                                value={editPriceAbono}
                                onChange={e => setEditPriceAbono(e.target.value)}
                                className="w-full bg-zinc-950 border border-amber-500/30 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-sm"
                                placeholder="Ej. 550.00 (Opcional)"
                              />
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button 
                            onClick={() => handleUpdateZone(zone.id)}
                            disabled={saving}
                            className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg uppercase tracking-wider transition-colors disabled:opacity-50"
                          >
                            {saving ? 'Guardando...' : 'Guardar'}
                          </button>
                          <button 
                            onClick={() => setEditingZone(null)}
                            disabled={saving}
                            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold px-3.5 py-1.5 rounded-lg uppercase tracking-wider transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="font-black text-lg uppercase tracking-widest">
                          {zone.name || ZONE_TYPES.find(zt => zt.value === zone.zone_type)?.label || zone.zone_type}
                        </p>
                        <div className="mt-1 space-y-1">
                          <p className="text-2xl font-bold">
                            ${zone.price} <span className="text-sm font-normal opacity-70">MXN {event?.is_multi_day ? '/ día' : ''}</span>
                          </p>
                          {event?.is_multi_day && (
                            <p className="text-xs font-medium flex items-center gap-1.5">
                              <span className="text-amber-400 font-bold uppercase tracking-wider">Abono (2 Días):</span>
                              {zone.price_abono ? (
                                <span className="text-white font-black text-sm">${zone.price_abono} MXN</span>
                              ) : (
                                <span className="opacity-60 italic">No configurado</span>
                              )}
                            </p>
                          )}
                        </div>
                        <p className="text-sm mt-2 opacity-70">
                          {zone.seats?.length || (zone.rows * zone.seats_per_row)} lugares configurados
                        </p>
                      </div>
                    )}
                    
                    {!editingZone && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingZone(zone.id);
                            setEditPrice(zone.price);
                            setEditPriceAbono(zone.price_abono || '');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold uppercase tracking-wider transition-colors"
                          title="Editar precio"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteZone(zone.id)}
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-red-950/60 text-zinc-400 hover:text-red-400 transition-colors"
                          title="Eliminar zona"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add New Zone */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-red-500" />
              Agregar Nueva Zona Manualmente
            </h2>

            {availableZoneTypes.length === 0 ? (
              <div className="bg-zinc-950 border border-white/10 rounded-xl p-6 text-zinc-500">
                Ya configuraste todas las zonas disponibles para este evento.
              </div>
            ) : (
              <form onSubmit={handleAddZone} className="bg-zinc-950 border border-white/10 rounded-xl p-6 space-y-6">
                <div className={`grid grid-cols-1 ${event?.is_multi_day ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-6`}>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-white uppercase tracking-widest">Tipo de Zona</label>
                    <select
                      value={newZone.zone_type}
                      onChange={e => {
                        const val = e.target.value;
                        setNewZone({ ...newZone, zone_type: val, seats_per_row: getDefaultSeats(val) });
                      }}
                      className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
                    >
                      {availableZoneTypes.map(zt => (
                        <option key={zt.value} value={zt.value}>{zt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-white uppercase tracking-widest">
                      {event?.is_multi_day ? 'Precio por Día (MXN)' : 'Precio por Boleto (MXN)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={newZone.price}
                      onChange={e => setNewZone({ ...newZone, price: e.target.value })}
                      className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
                      placeholder="Ej. 320.00"
                    />
                  </div>

                  {event?.is_multi_day && (
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-amber-400 uppercase tracking-widest flex items-center justify-between">
                        <span>Precio Abono 2 Días</span>
                        <span className="text-[10px] text-zinc-400 font-normal lowercase">(opcional)</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newZone.price_abono}
                        onChange={e => setNewZone({ ...newZone, price_abono: e.target.value })}
                        className="w-full bg-zinc-900 border border-amber-500/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
                        placeholder="Ej. 550.00"
                      />
                    </div>
                  )}
                </div>

                {newZone.zone_type !== 'GENERAL' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-white uppercase tracking-widest">Número de Filas</label>
                      <input
                        type="number"
                        min="1"
                        max="26"
                        required
                        value={newZone.rows}
                        onChange={e => setNewZone({ ...newZone, rows: Number(e.target.value) })}
                        className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
                      />
                      <p className="text-xs text-zinc-500">Máx. 26 filas (A–Z)</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-white uppercase tracking-widest">Asientos por Fila</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={newZone.seats_per_row}
                        onChange={e => setNewZone({ ...newZone, seats_per_row: Number(e.target.value) })}
                        className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 font-semibold uppercase tracking-wider text-xs rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{saving ? 'Creando...' : 'Crear Zona y Asientos'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: LIVE AVAILABILITY MAP */}
      {activeTab === 'AVAILABILITY' && (
        <div className="bg-zinc-950 border border-white/10 rounded-2xl p-6 shadow-2xl">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Ticket className="w-5 h-5 text-red-500" />
              Disponibilidad de Asientos en Vivo
            </h2>
            <p className="text-zinc-400 text-sm mt-1">
              Haz clic en cualquier asiento o mesa para habilitarlo (disponible para el público) o deshabilitarlo (bloqueado/vendido).
            </p>
          </div>

          {isArenaMap ? (
            <ArenaSeatMap
              zones={zones}
              isInteractiveEditing={false}
              onToggleSeat={(seat, zone) => handleToggleSeat(zone.id, seat.id, seat.is_available)}
            />
          ) : (
            <div className="w-full">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-zinc-500 uppercase font-black tracking-wider">The Wrestling Factory (Clásico SCW)</span>
                <div className="flex items-center gap-1 bg-zinc-900/90 backdrop-blur-md border border-white/10 rounded-2xl p-1 shadow-lg">
                  <button onClick={handleZoomOut} className="p-2 hover:bg-white/10 rounded-xl text-zinc-300 hover:text-white transition-all active:scale-95" title="Alejar"><Minus className="w-4 h-4" /></button>
                  <button onClick={handleResetZoom} className="px-3 py-1 hover:bg-white/10 rounded-xl text-xs font-black text-amber-400 tracking-wider transition-all" title="Restablecer">{Math.round(scale * 100)}%</button>
                  <button onClick={handleZoomIn} className="p-2 hover:bg-white/10 rounded-xl text-zinc-300 hover:text-white transition-all active:scale-95" title="Acercar"><Plus className="w-4 h-4" /></button>
                </div>
              </div>

              <div 
                className={`w-full h-[50vh] min-h-[400px] max-h-[600px] bg-zinc-900/20 border border-white/5 rounded-2xl overflow-hidden relative touch-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                ref={mapContainerRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <div className="w-full h-full flex items-center justify-center">
                  <div 
                    style={{
                      transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                      transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                    }}
                  >
                    <div className="bg-zinc-900/60 shadow-2xl rounded-[3rem] p-4 md:p-8 flex flex-col items-center justify-center border border-white/10 relative min-w-[700px] backdrop-blur-md">
                      {zoneNorte && <div className="flex justify-center mb-2 md:mb-4">{renderZone(zoneNorte, 'top')}</div>}
                      <div className="flex items-center justify-center w-full">
                        <div className="flex-1 flex justify-end pr-2 md:pr-4 relative">
                          <div className="absolute left-[-20px] top-1/2 -translate-y-1/2 -rotate-90 text-zinc-500 font-black text-3xl tracking-widest opacity-20 pointer-events-none">GENERAL</div>
                          {renderZone(zoneOeste, 'left')}
                        </div>
                        <div className="relative w-48 h-48 md:w-64 md:h-64 bg-[#d4d4d8] border-[8px] border-zinc-950 rounded flex items-center justify-center shadow-[0_0_80px_rgba(255,255,255,0.05)] z-10 shrink-0 mx-8 md:mx-16 lg:mx-24">
                          <div className="absolute inset-1 border-[1.5px] border-red-600/80 rounded-sm"></div>
                          <div className="absolute inset-2 border-[1.5px] border-zinc-100 rounded-sm"></div>
                          <div className="absolute inset-3 border-[1.5px] border-red-600/80 rounded-sm"></div>
                          <div className="absolute -top-2 -left-2 w-5 h-5 bg-red-600 rounded-full shadow-lg border-2 border-black z-20"></div>
                          <div className="absolute -top-2 -right-2 w-5 h-5 bg-blue-600 rounded-full shadow-lg border-2 border-black z-20"></div>
                          <div className="absolute -bottom-2 -left-2 w-5 h-5 bg-blue-600 rounded-full shadow-lg border-2 border-black z-20"></div>
                          <div className="absolute -bottom-2 -right-2 w-5 h-5 bg-red-600 rounded-full shadow-lg border-2 border-black z-20"></div>
                          <div className="relative flex items-center justify-center w-24 h-24 border-4 border-zinc-400/50 rounded-full p-2 bg-black/10">
                            <img src="/images/logo-scw.png" alt="SCW Logo" className="w-16 h-16 object-contain drop-shadow-md select-none pointer-events-none opacity-90" />
                          </div>
                        </div>
                        <div className="flex-1 flex justify-start pl-2 md:pl-4 relative">
                          <div className="absolute right-[-40px] top-1/2 -translate-y-1/2 rotate-90 text-zinc-500 font-black text-4xl tracking-widest opacity-30 pointer-events-none">ESCENARIO</div>
                          {renderZone(zoneEste, 'right')}
                        </div>
                      </div>
                      {zoneSur && <div className="flex justify-center mt-2 md:mt-4">{renderZone(zoneSur, 'bottom')}</div>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
