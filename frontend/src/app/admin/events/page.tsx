"use client";

import { useEffect, useState } from 'react';
import { Plus, Ticket, Edit2, Trash2, Search, Calendar, MapPin, Loader2, Gift, X } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { eventsService } from '@/services/events.services';
import { adminService } from '@/services/admin.services';
import AdminSeatMap from '@/components/admin/AdminSeatMap';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export default function AdminEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Courtesy Modal State
  const [isCourtesyModalOpen, setIsCourtesyModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [eventZones, setEventZones] = useState<any[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [quantityGeneral, setQuantityGeneral] = useState(0);
  const [courtesyEmail, setCourtesyEmail] = useState('');
  const [courtesyName, setCourtesyName] = useState('');
  const [loadingCourtesy, setLoadingCourtesy] = useState(false);
  const [loadingZones, setLoadingZones] = useState(false);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await eventsService.getEvents();
      setEvents(data);
    } catch (error) {
      console.error("Error loading events:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleDelete = async (id: number, title: string) => {
    if (confirm(`¿Estás seguro de que deseas eliminar el evento "${title}"?`)) {
      try {
        await eventsService.deleteEvent(id);
        setEvents(events.filter(event => event.id !== id));
      } catch (error) {
        console.error("Error deleting event:", error);
        alert("Hubo un error al eliminar el evento.");
      }
    }
  };

  const openCourtesyModal = async (event: any) => {
    setSelectedEvent(event);
    setCourtesyEmail('');
    setCourtesyName('');
    setSelectedSeats([]);
    setQuantityGeneral(0);
    setEventZones([]);
    setIsCourtesyModalOpen(true);
    setLoadingZones(true);
    try {
      const zones = await adminService.getZonesByEvent(event.id);
      setEventZones(zones);
    } catch (e) {
      console.error(e);
      alert('No se pudieron cargar los asientos.');
    } finally {
      setLoadingZones(false);
    }
  };

  const handleGrantCourtesy = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((selectedSeats.length === 0 && quantityGeneral <= 0) || !courtesyEmail) {
      alert("Por favor selecciona asientos o indica cantidad general, e ingresa el correo.");
      return;
    }
    setLoadingCourtesy(true);
    try {
      await adminService.generateCourtesyTicket({
        event_id: selectedEvent.id,
        seat_ids: selectedSeats,
        quantity_general: quantityGeneral,
        email: courtesyEmail,
        name: courtesyName
      });
      alert('✅ Boleto de cortesía generado y enviado con éxito.');
      setIsCourtesyModalOpen(false);
    } catch (error: any) {
      console.error("Error granting courtesy ticket:", error);
      alert(error?.response?.data?.error || 'Hubo un error al generar la cortesía.');
    } finally {
      setLoadingCourtesy(false);
    }
  };

  // Filter events
  const filteredEvents = events.filter(ev => {
    const matchesSearch = ev.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (ev.location && ev.location.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchesSearch) return false;
    
    if (filterStatus !== 'ALL' && ev.status !== filterStatus) return false;
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT': return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-800 text-zinc-400 border border-white/10">BORRADOR</span>;
      case 'SCHEDULED': return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">PROGRAMADO</span>;
      case 'LIVE': return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20 animate-pulse">EN VIVO</span>;
      case 'COMPLETED': return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-500 border border-green-500/20">FINALIZADO</span>;
      default: return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-800 text-zinc-400">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <AdminPageHeader 
        title="Eventos"
        subtitle="Gestiona carteleras, funciones, ubicaciones y boletos de SCW."
        icon={<Calendar className="w-8 h-8" />}
        actionLabel="Nuevo Evento"
        actionHref="/admin/events/form"
        actionIcon={<Plus className="w-4 h-4" />}
      />

      {/* KPI Summaries */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="glass-panel p-5 border border-white/5">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total Eventos</p>
              <p className="text-3xl font-black text-white mt-1">{events.length}</p>
            </div>
            <div className="p-3 bg-white/5 rounded-xl">
              <Calendar className="w-6 h-6 text-zinc-400" />
            </div>
          </div>
        </div>
        
        <div className="glass-panel p-5 border border-white/5">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Próximos (Programados)</p>
              <p className="text-3xl font-black text-blue-500 mt-1">
                {events.filter(e => e.status === 'SCHEDULED').length}
              </p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <Ticket className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="glass-panel p-5 border border-white/5">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Borradores</p>
              <p className="text-3xl font-black text-zinc-400 mt-1">
                {events.filter(e => e.status === 'DRAFT').length}
              </p>
            </div>
            <div className="p-3 bg-zinc-800 rounded-xl">
              <Edit2 className="w-6 h-6 text-zinc-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-zinc-950 border border-white/5 p-4 rounded-xl">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por título o ubicación..."
            className="w-full bg-zinc-900/50 border border-white/5 rounded-lg py-2 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-red-500/50 focus:bg-zinc-900 transition-all"
          />
        </div>
        
        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1 mr-1">
            Filtrar:
          </span>
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
              filterStatus === 'ALL'
                ? 'bg-white/10 text-white border-white/20'
                : 'bg-transparent text-zinc-400 border-transparent hover:text-white'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterStatus('SCHEDULED')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
              filterStatus === 'SCHEDULED'
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                : 'bg-transparent text-zinc-400 border-transparent hover:text-blue-400'
            }`}
          >
            Programados
          </button>
          <button
            onClick={() => setFilterStatus('LIVE')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
              filterStatus === 'LIVE'
                ? 'bg-red-500/10 text-red-500 border-red-500/20'
                : 'bg-transparent text-zinc-400 border-transparent hover:text-red-500'
            }`}
          >
            En Vivo
          </button>
          <button
            onClick={() => setFilterStatus('DRAFT')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
              filterStatus === 'DRAFT'
                ? 'bg-zinc-800 text-zinc-300 border-white/10'
                : 'bg-transparent text-zinc-400 border-transparent hover:text-zinc-300'
            }`}
          >
            Borradores
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-red-500" />
          <p className="text-sm font-medium">Cargando eventos...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="bg-zinc-950/40 border border-white/5 rounded-xl p-16 text-center text-zinc-500">
          <Calendar className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
          <p className="text-sm font-semibold text-zinc-400">No se encontraron eventos</p>
          <p className="text-xs text-zinc-600 mt-1">Crea un nuevo evento o ajusta tu búsqueda.</p>
        </div>
      ) : (
        <>
          {/* DESKTOP VIEW (TABLE) */}
          <div className="hidden lg:block overflow-x-auto rounded-xl border border-white/10 bg-zinc-950">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="text-xs text-zinc-400 uppercase bg-zinc-900/60 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4 font-semibold tracking-wider">Evento</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Ubicación</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Fecha</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Estado</th>
                  <th className="px-6 py-4 font-semibold tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((ev) => (
                  <tr key={ev.id} className="border-b border-white/5 hover:bg-white/5 transition-all duration-200">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        {ev.poster_image ? (
                          <div className="w-12 h-16 rounded overflow-hidden shrink-0 border border-white/10 bg-black">
                            <img src={ev.poster_image} alt={ev.title} className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity" />
                          </div>
                        ) : (
                          <div className="w-12 h-16 rounded bg-zinc-900 flex items-center justify-center shrink-0 border border-white/5">
                            <Calendar className="w-5 h-5 text-zinc-700" />
                          </div>
                        )}
                        <div>
                          <span className="font-bold text-white block text-base">{ev.title}</span>
                          <span className="text-zinc-500 text-xs">ID: {ev.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-zinc-400 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="truncate max-w-[200px]">{ev.location || 'Por definir'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-zinc-300">
                      {ev.date_time ? new Date(ev.date_time).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' }) : 'Sin fecha'}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(ev.status)}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => openCourtesyModal(ev)}
                        className="p-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 rounded-lg transition-all border border-yellow-500/20 hover:border-yellow-500/40"
                        title="Dar Cortesía"
                      >
                        <Gift className="w-4 h-4" />
                      </button>
                      <Link
                        href={`/admin/events/tickets/${ev.id}`}
                        className="inline-block p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-all border border-blue-500/20 hover:border-blue-500/40"
                        title="Gestionar Asientos"
                      >
                        <Ticket className="w-4 h-4" />
                      </Link>
                      <Link
                        href={`/admin/events/form/${ev.id}`}
                        className="inline-block p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg transition-all"
                        title="Editar Evento"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(ev.id, ev.title)}
                        className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 rounded-lg transition-all"
                        title="Eliminar Evento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE VIEW (CARDS) */}
          <div className="grid grid-cols-1 gap-4 lg:hidden">
            {filteredEvents.map((ev) => (
              <div key={ev.id} className="bg-zinc-950 border border-white/5 rounded-xl p-4 flex flex-col space-y-4 shadow-xl shadow-black/50">
                <div className="flex gap-4">
                  {ev.poster_image ? (
                    <div className="w-20 h-28 rounded-lg overflow-hidden shrink-0 border border-white/10 bg-black">
                      <img src={ev.poster_image} alt={ev.title} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-20 h-28 rounded-lg bg-zinc-900 flex items-center justify-center shrink-0 border border-white/5">
                      <Calendar className="w-8 h-8 text-zinc-700" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 py-1">
                    <h3 className="font-bold text-white text-lg leading-tight line-clamp-2">{ev.title}</h3>
                    <p className="text-zinc-500 text-xs mt-1 mb-2">{ev.date_time ? new Date(ev.date_time).toLocaleDateString('es-MX', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD'}</p>
                    {getStatusBadge(ev.status)}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-zinc-400 text-sm bg-zinc-900/50 p-2.5 rounded-lg border border-white/5">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span className="truncate">{ev.location || 'Ubicación pendiente'}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                  <button
                    onClick={() => openCourtesyModal(ev)}
                    className="flex items-center justify-center gap-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 py-2 rounded-lg text-sm font-semibold transition-colors border border-yellow-500/20"
                  >
                    <Gift className="w-4 h-4" /> Cortesía
                  </button>
                  <Link
                    href={`/admin/events/tickets/${ev.id}`}
                    className="flex items-center justify-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 py-2 rounded-lg text-sm font-semibold transition-colors border border-blue-500/20"
                  >
                    <Ticket className="w-4 h-4" /> Asientos
                  </Link>
                  <Link
                    href={`/admin/events/form/${ev.id}`}
                    className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-lg text-sm font-semibold transition-colors"
                  >
                    <Edit2 className="w-4 h-4" /> Editar
                  </Link>
                  <button
                    onClick={() => handleDelete(ev.id, ev.title)}
                    className="flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-500 py-2 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* COURTESY MODAL */}
      {isCourtesyModalOpen && selectedEvent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl relative my-8"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 to-yellow-600"></div>
            
            {/* Modal Title */}
            <div className="flex justify-between items-center px-6 py-5 border-b border-white/10 bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                  <Gift className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <h2 className="text-lg font-bold uppercase tracking-wider text-white leading-tight">Otorgar Cortesía</h2>
                  <p className="text-xs text-zinc-500 truncate max-w-[250px] md:max-w-md">{selectedEvent.title}</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsCourtesyModalOpen(false)} className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleGrantCourtesy} className="p-6 space-y-6">
              
              <div className="space-y-6">
                
                {/* Admin Seat Map Component */}
                <div className="bg-zinc-950 p-2 rounded-xl border border-white/5">
                  {loadingZones ? (
                    <div className="w-full h-[350px] flex flex-col items-center justify-center gap-3 text-zinc-500">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span className="text-sm">Cargando mapa de asientos...</span>
                    </div>
                  ) : (
                    <AdminSeatMap 
                      zones={eventZones} 
                      selectedSeatIds={selectedSeats} 
                      onToggleSeat={(id) => {
                        setSelectedSeats(prev => 
                          prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
                        )
                      }} 
                    />
                  )}
                  
                  {/* Controles para Entradas Generales */}
                  <div className="mt-4 flex flex-col sm:flex-row items-center justify-between bg-black p-4 rounded-xl border border-white/5">
                    <div>
                      <h4 className="text-sm font-bold text-white mb-1">Boletos Generales</h4>
                      <p className="text-xs text-zinc-400">Si deseas agregar entradas de tipo general (sin asiento)</p>
                    </div>
                    <div className="flex items-center gap-3 mt-3 sm:mt-0">
                      <button 
                        type="button" 
                        onClick={() => setQuantityGeneral(Math.max(0, quantityGeneral - 1))}
                        className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-white hover:bg-zinc-800"
                      >
                        -
                      </button>
                      <span className="text-white font-bold text-lg min-w-[20px] text-center">{quantityGeneral}</span>
                      <button 
                        type="button" 
                        onClick={() => setQuantityGeneral(quantityGeneral + 1)}
                        className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-white hover:bg-zinc-800"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  {!loadingZones && eventZones.length > 0 && eventZones.every(z => z.seats.filter((s:any) => s.is_available).length === 0) && (
                    <p className="text-xs text-red-500 mt-2 text-center font-bold">⚠️ Todos los asientos de este evento están ocupados.</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400">Correo Electrónico del Invitado</label>
                  <input 
                    required 
                    type="email" 
                    value={courtesyEmail} 
                    onChange={(e) => setCourtesyEmail(e.target.value)} 
                    className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-yellow-500/50 transition-all placeholder-zinc-700" 
                    placeholder="ejemplo@correo.com"
                  />
                  <p className="text-xs text-zinc-500">Aquí se enviará el boleto digital con código QR.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400">Nombre del Invitado (Opcional)</label>
                  <input 
                    type="text" 
                    value={courtesyName} 
                    onChange={(e) => setCourtesyName(e.target.value)} 
                    className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-yellow-500/50 transition-all placeholder-zinc-700" 
                    placeholder="Ej: Patrocinador X, Invitado Especial"
                  />
                </div>
              </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-white/5">
                <button 
                  type="button" 
                  onClick={() => setIsCourtesyModalOpen(false)}
                  className="flex-1 py-3 px-4 rounded-xl font-bold uppercase tracking-wider text-sm text-zinc-400 bg-zinc-900 hover:bg-zinc-800 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={loadingCourtesy || (selectedSeats.length === 0 && quantityGeneral <= 0)}
                  className="flex-1 py-3 px-4 rounded-xl font-bold uppercase tracking-wider text-sm text-black bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-yellow-900/20 flex justify-center items-center gap-2"
                >
                  {loadingCourtesy ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Gift className="w-5 h-5" /> Enviar Boleto{selectedSeats.length + quantityGeneral > 1 ? 's' : ''}</>}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
