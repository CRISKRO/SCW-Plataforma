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

  if (loading) return <div className="text-zinc-500 py-8">Cargando...</div>;

  const totalSeats = zones.reduce((acc, z) => acc + (z.rows * z.seats_per_row), 0);
  const existingZoneTypes = zones.map(z => z.zone_type);
  const availableZoneTypes = ZONE_TYPES.filter(zt => !existingZoneTypes.includes(zt.value));

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
    </div>
  );
}
