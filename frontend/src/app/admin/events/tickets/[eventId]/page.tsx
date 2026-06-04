"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Ticket } from 'lucide-react';
import Link from 'next/link';
import { eventsService } from '@/services/events.services';
import { adminService } from '@/services/admin.services';

const ZONE_TYPES = [
  { value: 'RINGSIDE_N', label: 'Ringside Norte' },
  { value: 'RINGSIDE_S', label: 'Ringside Sur' },
  { value: 'RINGSIDE_E', label: 'Ringside Este' },
  { value: 'RINGSIDE_O', label: 'Ringside Oeste' },
  { value: 'VIP', label: 'VIP' },
  { value: 'GENERAL', label: 'General / Gradas' },
];

const ZONE_COLORS: Record<string, string> = {
  VIP: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
  RINGSIDE_N: 'bg-red-500/20 text-red-400 border-red-500/30',
  RINGSIDE_S: 'bg-red-500/20 text-red-400 border-red-500/30',
  RINGSIDE_E: 'bg-red-500/20 text-red-400 border-red-500/30',
  RINGSIDE_O: 'bg-red-500/20 text-red-400 border-red-500/30',
  GENERAL: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
};

export default function EventTicketsPage() {
  const params = useParams();
  const eventId = Number(params.eventId);

  const [event, setEvent] = useState<any>(null);
  const [zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [newZone, setNewZone] = useState({
    zone_type: 'GENERAL',
    price: '',
    rows: 3,
    seats_per_row: 10,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventData, zonesData] = await Promise.all([
          eventsService.getEventDetails(eventId),
          adminService.getZonesByEvent(eventId),
        ]);
        setEvent(eventData);
        setZones(zonesData);
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
    setSaving(true);
    try {
      const created = await adminService.createZone({
        event: eventId,
        zone_type: newZone.zone_type,
        price: newZone.price,
        rows: Number(newZone.rows),
        seats_per_row: Number(newZone.seats_per_row),
      });
      setZones([...zones, created]);
      setNewZone({ zone_type: 'GENERAL', price: '', rows: 3, seats_per_row: 10 });
    } catch (error: any) {
      const msg = error?.response?.data?.non_field_errors?.[0] || "Error al crear la zona.";
      alert(msg.includes('unique_together') ? 'Esta zona ya existe para este evento.' : msg);
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

  const renderZone = (zone: any) => {
    if (!zone) return null;
    const groupedSeats: Record<string, any[]> = {};
    zone.seats?.forEach((seat: any) => {
      if (!groupedSeats[seat.row_name]) groupedSeats[seat.row_name] = [];
      groupedSeats[seat.row_name].push(seat);
    });

    return (
      <div key={zone.id} className="flex flex-col items-center gap-3">
        <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${ZONE_COLORS[zone.zone_type] || 'bg-zinc-800 text-zinc-400'}`}>
          {ZONE_TYPES.find(zt => zt.value === zone.zone_type)?.label}
        </div>
        <div className="flex flex-col gap-1">
          {Object.keys(groupedSeats).sort().map(rowName => (
            <div key={rowName} className="flex items-center gap-2 justify-center">
              <div className="w-5 text-center font-bold text-zinc-500 text-xs">{rowName}</div>
              <div className="flex gap-1">
                {groupedSeats[rowName].sort((a, b) => a.seat_number - b.seat_number).map(seat => (
                  <button
                    key={seat.id}
                    onClick={() => handleToggleSeat(zone.id, seat.id, seat.is_available)}
                    className={`w-6 h-6 md:w-8 md:h-8 rounded flex items-center justify-center text-[10px] font-bold transition-all ${
                      seat.is_available 
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/40 hover:scale-110' 
                        : 'bg-zinc-800/80 text-zinc-600 border border-zinc-700/50 hover:bg-zinc-700 opacity-40 hover:opacity-80'
                    }`}
                    title={`Fila ${rowName} - Asiento ${seat.seat_number} (${ZONE_TYPES.find(zt => zt.value === zone.zone_type)?.label})`}
                  >
                    {seat.seat_number}
                  </button>
                ))}
              </div>
              <div className="w-5 text-center font-bold text-zinc-500 text-xs">{rowName}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const zoneNorte = zones.find(z => z.zone_type === 'RINGSIDE_N');
  const zoneSur = zones.find(z => z.zone_type === 'RINGSIDE_S');
  const zoneEste = zones.find(z => z.zone_type === 'RINGSIDE_E');
  const zoneOeste = zones.find(z => z.zone_type === 'RINGSIDE_O');
  const zoneVip = zones.find(z => z.zone_type === 'VIP');
  const zoneGeneral = zones.find(z => z.zone_type === 'GENERAL');

  return (
    <div className="max-w-4xl space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/events" className="text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <p className="text-red-500 text-sm font-bold uppercase tracking-widest mb-1">Gestión de Boletos</p>
          <h1 className="text-3xl font-bold tracking-tight text-white">{event?.title}</h1>
          <p className="text-zinc-400 mt-1">
            {new Date(event?.date_time).toLocaleString()} · {event?.location}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-950 border border-white/10 rounded-xl p-5">
          <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Zonas Creadas</p>
          <p className="text-3xl font-black text-white mt-1">{zones.length}</p>
        </div>
        <div className="bg-zinc-950 border border-white/10 rounded-xl p-5">
          <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Total Asientos</p>
          <p className="text-3xl font-black text-white mt-1">{totalSeats}</p>
        </div>
      </div>

      {/* Existing Zones */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Ticket className="w-5 h-5 text-red-500" />
          Zonas Configuradas
        </h2>

        {zones.length === 0 ? (
          <div className="bg-zinc-950 border border-white/10 rounded-xl p-8 text-center text-zinc-500">
            No hay zonas configuradas aún. Agrega la primera zona abajo.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {zones.map(zone => (
              <div key={zone.id} className={`border rounded-xl p-6 flex justify-between items-start ${ZONE_COLORS[zone.zone_type] || 'bg-zinc-900 border-white/10 text-white'}`}>
                <div>
                  <p className="font-black text-lg uppercase tracking-widest">
                    {ZONE_TYPES.find(zt => zt.value === zone.zone_type)?.label}
                  </p>
                  <p className="text-2xl font-bold mt-1">${zone.price} <span className="text-sm font-normal opacity-70">MXN</span></p>
                  <p className="text-sm mt-2 opacity-70">
                    {zone.rows} filas × {zone.seats_per_row} asientos = <strong>{zone.rows * zone.seats_per_row} lugares</strong>
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteZone(zone.id)}
                  className="text-current opacity-50 hover:opacity-100 transition-opacity"
                  title="Eliminar zona"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add New Zone */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-red-500" />
          Agregar Nueva Zona
        </h2>

        {availableZoneTypes.length === 0 ? (
          <div className="bg-zinc-950 border border-white/10 rounded-xl p-6 text-zinc-500">
            Ya configuraste todas las zonas disponibles para este evento.
          </div>
        ) : (
          <form onSubmit={handleAddZone} className="bg-zinc-950 border border-white/10 rounded-xl p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-white uppercase tracking-widest">Tipo de Zona</label>
                <select
                  value={newZone.zone_type}
                  onChange={e => setNewZone({ ...newZone, zone_type: e.target.value })}
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
                >
                  {availableZoneTypes.map(zt => (
                    <option key={zt.value} value={zt.value}>{zt.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-white uppercase tracking-widest">Precio por Boleto (MXN)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={newZone.price}
                  onChange={e => setNewZone({ ...newZone, price: e.target.value })}
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
                  placeholder="Ej. 350.00"
                />
              </div>
            </div>

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

            {/* Preview */}
            <div className="bg-zinc-900/50 border border-white/5 rounded-lg p-4">
              <p className="text-xs text-zinc-400 uppercase tracking-widest font-bold mb-1">Vista Previa</p>
              <p className="text-white">
                Se crearán <strong className="text-red-500">{Number(newZone.rows) * Number(newZone.seats_per_row)} asientos</strong> para{' '}
                <strong>{ZONE_TYPES.find(zt => zt.value === newZone.zone_type)?.label}</strong>{' '}
                a <strong>${newZone.price || '0'} MXN</strong> c/u.
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-white text-black px-6 py-3 font-bold uppercase tracking-widest rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {saving ? 'Creando...' : 'Crear Zona y Asientos'}
            </button>
          </form>
        )}
      </div>

      {/* Interactive Seat Map */}
      {zones.length > 0 && (
        <div className="bg-zinc-950 border border-white/10 rounded-xl p-6 mt-8">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Ticket className="w-5 h-5 text-red-500" />
            Mapa Interactivo de Asientos
          </h2>
          <p className="text-zinc-400 text-sm mb-6">
            Haz clic en los asientos para deshabilitarlos o habilitarlos. Los asientos deshabilitados (oscuros) no aparecerán en el plano de compra, lo que te permite diseñar pasillos o esculpir formas reales en las gradas.
          </p>

          <div className="overflow-x-auto pb-8">
            <div className="inline-block min-w-full text-center">
              <div className="bg-zinc-900 rounded-3xl p-10 inline-flex flex-col items-center gap-8 border border-white/5 shadow-2xl relative">
                
                {/* Ringside Norte */}
                {renderZone(zoneNorte)}

                <div className="flex items-center gap-12 my-4">
                  {/* Ringside Oeste */}
                  {renderZone(zoneOeste)}

                  {/* El Ring Central */}
                  <div className="relative w-40 h-40 md:w-56 md:h-56 bg-zinc-950 border-4 border-red-600/40 rounded-xl flex items-center justify-center shadow-[0_0_40px_rgba(220,38,38,0.15)] z-10 overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-900/20 via-transparent to-transparent"></div>
                    <div className="absolute top-2 left-2 w-3 h-3 bg-red-600 rounded-full shadow-lg"></div>
                    <div className="absolute top-2 right-2 w-3 h-3 bg-red-600 rounded-full shadow-lg"></div>
                    <div className="absolute bottom-2 left-2 w-3 h-3 bg-red-600 rounded-full shadow-lg"></div>
                    <div className="absolute bottom-2 right-2 w-3 h-3 bg-red-600 rounded-full shadow-lg"></div>
                    <span className="text-zinc-600 font-black text-2xl md:text-4xl tracking-[0.3em] rotate-45 opacity-30 select-none">RING</span>
                  </div>

                  {/* Ringside Este */}
                  {renderZone(zoneEste)}
                </div>

                {/* Ringside Sur */}
                {renderZone(zoneSur)}

                {/* Separador */}
                {(zoneVip || zoneGeneral) && (
                  <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-8" />
                )}

                {/* Otras Zonas (VIP, General) */}
                <div className="flex flex-col gap-12">
                  {renderZone(zoneVip)}
                  {renderZone(zoneGeneral)}
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
