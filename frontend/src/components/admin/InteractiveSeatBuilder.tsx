"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutTemplate, CheckCircle2, 
  EyeOff, CheckSquare, Layers, X
} from 'lucide-react';
import { adminService } from '@/services/admin.services';
import ArenaSeatMap, { SeatItem } from '@/components/ArenaSeatMap';
import ClassicWrestlingFactoryMap from '@/components/admin/ClassicWrestlingFactoryMap';
import { useToastStore } from '@/store/toastStore';

interface InteractiveSeatBuilderProps {
  eventId: number;
  event: any;
  zones: any[];
  onZonesUpdated: (updatedZones: any[]) => void;
  onEventUpdated?: (updatedEvent: any) => void;
}

export default function InteractiveSeatBuilder({
  eventId,
  event,
  zones,
  onZonesUpdated,
  onEventUpdated,
}: InteractiveSeatBuilderProps) {
  const [localZones, setLocalZones] = useState<any[]>(zones);
  const [isSaving, setIsSaving] = useState(false);

  // Selected items in editor (multi-selection)
  const [selectedSeats, setSelectedSeats] = useState<SeatItem[]>([]);
  const [lastSelectedZone, setLastSelectedZone] = useState<any | null>(null);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const selectedSeatIds = useMemo(() => selectedSeats.map(s => s.id), [selectedSeats]);
  const selectedSeat = selectedSeats.length === 1 ? selectedSeats[0] : null;

  const getZoneForSeat = (seat: SeatItem) => {
    return localZones.find(z => z.seats?.some((s: SeatItem) => s.id === seat.id)) || seat.zone || lastSelectedZone;
  };

  const selectedZone = selectedSeat ? getZoneForSeat(selectedSeat) : lastSelectedZone;

  // Multi-select counts
  const availableCount = useMemo(() => selectedSeats.filter(s => s.is_available).length, [selectedSeats]);
  const blockedCount = useMemo(() => selectedSeats.length - availableCount, [selectedSeats, availableCount]);

  // Templates modal
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<'ARENA_VIP' | 'CLASSIC_RING'>('ARENA_VIP');
  const [templatePrices, setTemplatePrices] = useState({
    MESAS_VIP_RINGSIDE: '1500.00',
    MESAS_VIP: '1000.00',
    PRIMERA_FILA: '500.00',
    SEGUNDA_FILA: '400.00',
    GENERAL: '250.00',
    NORTE: '320.00',
    SUR: '320.00',
    ESTE: '320.00',
    OESTE: '320.00',
  });

  // Check if map is Arena VIP (Labrú) or Classic Ring (The Wrestling Factory)
  const isArenaMap =
    event?.map_type === 'ARENA_VIP' ||
    localZones.some(z =>
      ['MESAS_VIP_RINGSIDE', 'MESAS_VIP', 'PRIMERA_FILA', 'SEGUNDA_FILA'].includes(z.zone_type)
    );

  // Sync incoming zones
  useEffect(() => {
    setLocalZones(zones);
  }, [zones]);



  // 1-Click Toggle Availability for single seat or whole table directly on click
  const handleSeatClickInEditor = async (seat: SeatItem, zone: any) => {
    setLastSelectedZone(zone);

    // Check if seat belongs to a table (VIP or Ringside)
    const isTable = Boolean(seat.table_number) || zone?.zone_type === 'MESAS_VIP' || zone?.zone_type === 'MESAS_VIP_RINGSIDE';

    if (isTable) {
      const tableNum = seat.table_number || seat.seat_number;
      const currentZone = localZones.find((z: any) => z.id === zone?.id || z.zone_type === zone?.zone_type);
      const tableSeats: SeatItem[] = (currentZone?.seats || []).filter(
        (s: SeatItem) => (s.table_number || s.seat_number) === tableNum
      );

      const seatsToUpdate = tableSeats.length > 0 ? tableSeats : [seat];
      // If any seat in table is available, toggle to disabled; if all disabled, toggle to enabled
      const anyAvailable = seatsToUpdate.some((s: SeatItem) => s.is_available);
      const newStatus = !anyAvailable;
      const targetIds = new Set(seatsToUpdate.map(s => s.id));

      // Optimistic update
      setLocalZones(prev =>
        prev.map(z => {
          if (z.id !== currentZone?.id && z.zone_type !== zone?.zone_type) return z;
          return {
            ...z,
            seats: z.seats?.map((s: SeatItem) =>
              targetIds.has(s.id) ? { ...s, is_available: newStatus } : s
            ),
          };
        })
      );

      setSelectedSeats(
        seatsToUpdate.map(s => ({ ...s, is_available: newStatus, zone: currentZone || zone }))
      );

      try {
        await adminService.bulkUpdateSeatPositions({
          seats: seatsToUpdate.map(s => ({ id: s.id, is_available: newStatus })),
        });
        useToastStore.getState().addToast(
          `Mesa ${tableNum} ${newStatus ? 'habilitada' : 'deshabilitada'}`,
          'info'
        );
      } catch (error) {
        console.error('Error toggling table availability:', error);
        // Rollback
        setLocalZones(prev =>
          prev.map(z => {
            if (z.id !== currentZone?.id && z.zone_type !== zone?.zone_type) return z;
            return {
              ...z,
              seats: z.seats?.map((s: SeatItem) => {
                const orig = seatsToUpdate.find(o => o.id === s.id);
                return orig ? { ...s, is_available: orig.is_available } : s;
              }),
            };
          })
        );
        useToastStore.getState().addToast('Error al actualizar disponibilidad de la mesa', 'error');
      }
      return;
    }

    // Individual seat toggle
    const currentZone = localZones.find((z: any) => z.id === zone?.id || z.zone_type === zone?.zone_type);
    const freshSeat = currentZone?.seats?.find((s: SeatItem) => s.id === seat.id) || seat;
    const newStatus = !freshSeat.is_available;

    // Optimistic update
    setLocalZones(prev =>
      prev.map(z => {
        if (z.id !== currentZone?.id && z.zone_type !== zone?.zone_type) return z;
        return {
          ...z,
          seats: z.seats?.map((s: SeatItem) =>
            s.id === seat.id ? { ...s, is_available: newStatus } : s
          ),
        };
      })
    );

    setSelectedSeats([{ ...freshSeat, is_available: newStatus, zone: currentZone || zone }]);

    try {
      await adminService.updateSeat(seat.id, { is_available: newStatus });
      const label = seat.custom_label || (seat.row_name ? `${seat.row_name}-${seat.seat_number}` : seat.seat_number);
      useToastStore.getState().addToast(
        `Asiento ${label} ${newStatus ? 'habilitado' : 'deshabilitado'}`,
        'info'
      );
    } catch (error) {
      console.error('Error toggling seat availability:', error);
      // Rollback
      setLocalZones(prev =>
        prev.map(z => {
          if (z.id !== currentZone?.id && z.zone_type !== zone?.zone_type) return z;
          return {
            ...z,
            seats: z.seats?.map((s: SeatItem) =>
              s.id === seat.id ? { ...s, is_available: freshSeat.is_available } : s
            ),
          };
        })
      );
      useToastStore.getState().addToast('Error al actualizar disponibilidad del asiento', 'error');
    }
  };



  // Apply template (Labrú o The Wrestling Factory)
  const handleApplyTemplate = async () => {
    const isLabru = selectedTemplate === 'ARENA_VIP';
    const venueName = isLabru ? 'Labrú' : 'The Wrestling Factory';
    const confirmMsg = isLabru
      ? '¿Cargar la plantilla de la sede "Labrú"? Esto configurará el mapa con 8 Mesas Ringside, 12 Mesas VIP, 44 Primera Fila, 44 Segunda Fila, General y cuadrilátero central.'
      : '¿Cargar la plantilla de la sede "The Wrestling Factory"? Esto configurará el diseño tradicional con Ring Clásico SCW y las 4 zonas cardinales (Norte, Sur, Este, Oeste y General).';

    if (!confirm(confirmMsg)) return;

    try {
      setIsSaving(true);
      const result = await adminService.applyTemplate({
        event_id: eventId,
        template_type: selectedTemplate,
        prices: templatePrices,
        clear_existing: true,
      });

      const updatedZones = result.zones || [];
      const updatedMapType = result.map_type || selectedTemplate;
      const updatedLocation = result.location || (selectedTemplate === 'ARENA_VIP' ? 'Labrú' : 'The Wrestling Factory');

      setLocalZones(updatedZones);
      onZonesUpdated(updatedZones);
      if (onEventUpdated) {
        onEventUpdated({
          ...event,
          map_type: updatedMapType,
          location: updatedLocation,
          map_config: result.map_config || {},
        });
      }
      setIsTemplateModalOpen(false);
      setSelectedSeats([]);
      setLastSelectedZone(null);
      useToastStore.getState().addToast(`Plantilla de "${venueName}" aplicada con éxito`, 'success');
    } catch (error: any) {
      const data = error?.response?.data;
      let msg = "Error al aplicar plantilla";
      if (typeof data === 'string' && data.includes('no such column')) {
        msg = "Faltan migraciones en el servidor backend (PythonAnywhere). Ejecuta en la consola Bash: python manage.py migrate";
      } else if (data?.error) {
        msg = data.error;
      } else if (data?.detail) {
        msg = data.detail;
      } else if (error?.message) {
        msg = `${msg}: ${error.message}`;
      }
      alert(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Bulk set availability (true = habilitar, false = bloquear)
  const handleBulkSetAvailability = async (newStatus: boolean) => {
    if (selectedSeats.length === 0) return;
    try {
      setIsBulkUpdating(true);
      const targetIds = new Set(selectedSeats.map(s => s.id));

      // Optimistic update
      setLocalZones(prev =>
        prev.map(zone => ({
          ...zone,
          seats: zone.seats?.map((s: SeatItem) =>
            targetIds.has(s.id) ? { ...s, is_available: newStatus } : s
          ),
        }))
      );

      setSelectedSeats(prev =>
        prev.map(s => ({ ...s, is_available: newStatus }))
      );

      // Backend bulk update
      const payload = selectedSeats.map(s => ({
        id: s.id,
        is_available: newStatus,
      }));

      await adminService.bulkUpdateSeatPositions({ seats: payload });
      useToastStore.getState().addToast(
        `${selectedSeats.length} ${selectedSeats.length === 1 ? 'asiento' : 'asientos'} ${newStatus ? 'habilitados para el público' : 'bloqueados/deshabilitados'} exitosamente`,
        'success'
      );
    } catch (error) {
      console.error('Error in bulk availability update:', error);
      alert('Error al actualizar la disponibilidad de los asientos seleccionados.');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // Toggle single seat availability in editor
  const handleToggleSeatAvailability = async (seat: SeatItem) => {
    const newStatus = !seat.is_available;
    setLocalZones(prev =>
      prev.map(z => ({
        ...z,
        seats: z.seats?.map((s: any) => (s.id === seat.id ? { ...s, is_available: newStatus } : s)),
      }))
    );
    setSelectedSeats(prev =>
      prev.map(s => (s.id === seat.id ? { ...s, is_available: newStatus } : s))
    );
    try {
      await adminService.updateSeat(seat.id, { is_available: newStatus });
      useToastStore.getState().addToast(
        `Asiento ${newStatus ? 'habilitado' : 'bloqueado'} con éxito`,
        'success'
      );
    } catch (error) {
      console.error(error);
      alert('Error al actualizar asiento');
    }
  };





  const handleSelectAll = () => {
    const allSeats: SeatItem[] = [];
    localZones.forEach(z => {
      z.seats?.forEach((s: SeatItem) => {
        allSeats.push({ ...s, zone: z });
      });
    });
    setSelectedSeats(allSeats);
    useToastStore.getState().addToast(`Todos los asientos seleccionados (${allSeats.length})`, 'info');
  };

  const handleInvertSelection = () => {
    const currentIds = new Set(selectedSeats.map(s => s.id));
    const inverted: SeatItem[] = [];
    localZones.forEach(z => {
      z.seats?.forEach((s: SeatItem) => {
        if (!currentIds.has(s.id)) {
          inverted.push({ ...s, zone: z });
        }
      });
    });
    setSelectedSeats(inverted);
  };

  const handleClearSelection = () => {
    setSelectedSeats([]);
  };

  const handleRemoveSeatFromSelection = (seatId: number) => {
    setSelectedSeats(prev => prev.filter(s => s.id !== seatId));
  };



  const getDisplayNumber = (zoneType?: string, seatNumber?: number) => {
    if (!seatNumber) return '';
    if (zoneType === 'NORTE') return seatNumber;
    if (zoneType === 'ESTE') return seatNumber + 17;
    if (zoneType === 'SUR') return seatNumber + 27;
    if (zoneType === 'OESTE') return seatNumber + 44;
    return seatNumber;
  };

  const formatSeatTitle = (seat: SeatItem) => {
    if (seat.table_number) {
      return `Mesa #${seat.table_number}${seat.table_seat_number ? ` (Asiento ${seat.table_seat_number})` : ''}`;
    }
    const zone = getZoneForSeat(seat);
    const num = seat.custom_label || getDisplayNumber(zone?.zone_type, seat.seat_number);
    return `Fila ${seat.row_name} · Asiento ${num}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Action Toolbar */}
      <div className="glass-panel border border-white/10 p-4 flex flex-wrap items-center justify-between gap-3 shadow-2xl">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Templates Button */}
          <button
            type="button"
            onClick={() => setIsTemplateModalOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all shadow-md shadow-red-950/30 active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <LayoutTemplate className="w-4 h-4" />
            <span>Cargar Plantilla</span>
          </button>



          {/* Active Selection Indicator in Toolbar */}
          {selectedSeats.length > 0 && (
            <div className="flex items-center gap-2 bg-zinc-900/90 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-red-600" />
              <span className="font-bold text-white">
                {selectedSeats.length} {selectedSeats.length === 1 ? 'asiento seleccionado' : 'asientos seleccionados'}
              </span>
              <button
                type="button"
                onClick={handleClearSelection}
                className="text-zinc-500 hover:text-white text-xs ml-1 hover:bg-white/5 rounded px-1 transition-colors cursor-pointer"
                title="Deseleccionar todos"
              >
                ✕ Limpiar
              </button>
            </div>
          )}
        </div>

        {/* Automatic Save Indicator */}
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-3.5 py-2 rounded-xl">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Guardado automático</span>
        </div>
      </div>

      {/* Main Interactive Workspace Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Seat Map Canvas (3 columns) */}
        <div className="lg:col-span-3">
          {isArenaMap ? (
            <ArenaSeatMap
              zones={localZones}
              onSeatClickInEditor={handleSeatClickInEditor}
              selectedSeatInEditor={selectedSeat}
              selectedSeatIdsInEditor={selectedSeatIds}
              mapConfig={event?.map_config}
            />
          ) : (
            <ClassicWrestlingFactoryMap
              zones={localZones}
              selectedSeatId={selectedSeat?.id}
              selectedSeatIds={selectedSeatIds}
              onSeatClick={(seat, zone) => {
                handleSeatClickInEditor(seat, zone);
              }}
            />
          )}
        </div>

        {/* Sidebar Inspector / Details (1 column) */}
        <div className="lg:col-span-1 space-y-4">
          {selectedSeats.length > 1 ? (
            /* MULTI-SEAT BULK INSPECTOR */
            <div className="glass-panel border border-white/10 p-5 shadow-2xl space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-red-500">
                      Selección Múltiple
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-white tracking-tight mt-0.5">
                    {selectedSeats.length} Asientos Seleccionados
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 transition-colors cursor-pointer"
                  title="Deseleccionar todos"
                >
                  Limpiar
                </button>
              </div>

              {/* Status Breakdown Pills */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 block">Habilitados</span>
                  <span className="text-xl font-black text-emerald-400 mt-0.5 block">{availableCount}</span>
                </div>
                <div className="bg-zinc-900/80 border border-white/10 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 block">Bloqueados</span>
                  <span className="text-xl font-black text-zinc-300 mt-0.5 block">{blockedCount}</span>
                </div>
              </div>

              {/* Bulk Actions Section */}
              <div className="space-y-2 pt-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block">
                  Acciones en Lote:
                </label>

                {/* Habilitar Todos */}
                <button
                  type="button"
                  disabled={isBulkUpdating}
                  onClick={() => handleBulkSetAvailability(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-emerald-600 to-emerald-800 hover:from-emerald-500 hover:to-emerald-700 text-white transition-all shadow-lg shadow-emerald-950/30 cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isBulkUpdating ? 'Procesando...' : `Habilitar Todos (${selectedSeats.length})`}</span>
                </button>

                {/* Bloquear / Deshabilitar Todos */}
                <button
                  type="button"
                  disabled={isBulkUpdating}
                  onClick={() => handleBulkSetAvailability(false)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/10 hover:border-white/20 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  <EyeOff className="w-4 h-4 text-zinc-400" />
                  <span>{isBulkUpdating ? 'Procesando...' : `Bloquear / Deshabilitar (${selectedSeats.length})`}</span>
                </button>

              </div>



              {/* List of Selected Seats with individual remove */}
              <div className="pt-2 border-t border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                    Detalle ({selectedSeats.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="text-[10px] text-zinc-500 hover:text-zinc-300 cursor-pointer"
                  >
                    Deseleccionar todos
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                  {selectedSeats.map(seat => {
                    const title = formatSeatTitle(seat);
                    return (
                      <div
                        key={seat.id}
                        className="flex items-center justify-between bg-zinc-900/90 border border-white/5 px-3 py-2 rounded-xl text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${seat.is_available ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-zinc-600'}`} />
                          <span className="text-zinc-200 font-semibold truncate">{title}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveSeatFromSelection(seat.id)}
                          className="text-zinc-500 hover:text-white p-1 hover:bg-white/5 rounded-md ml-1 cursor-pointer transition-colors"
                          title="Quitar de selección"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : selectedSeats.length === 1 && selectedSeat ? (
            /* SINGLE SEAT INSPECTOR */
            <div className="glass-panel border border-white/10 p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block">
                    Detalles del Asiento
                  </span>
                  <h3 className="text-lg font-black text-white tracking-tight mt-0.5">
                    {formatSeatTitle(selectedSeat)}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="p-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/5 transition-colors cursor-pointer"
                  title="Deseleccionar"
                >
                  ✕
                </button>
              </div>



              {/* Status toggle & delete */}
              <div className="pt-2 border-t border-white/10 space-y-2">
                <button
                  type="button"
                  onClick={() => handleToggleSeatAvailability(selectedSeat)}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 active:scale-95 ${
                    selectedSeat.is_available
                      ? 'bg-gradient-to-r from-emerald-600 to-emerald-800 hover:from-emerald-500 hover:to-emerald-700 text-white shadow-emerald-950/40'
                      : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-white/10'
                  }`}
                >
                  {selectedSeat.is_available ? <CheckCircle2 className="w-4 h-4" /> : <EyeOff className="w-4 h-4 text-zinc-400" />}
                  <span>{selectedSeat.is_available ? 'Habilitado (Público)' : 'Bloqueado / Oculto'}</span>
                </button>

              </div>
            </div>
          ) : (
            /* EMPTY STATE INSPECTOR */
            <div className="glass-panel border border-white/10 p-6 shadow-2xl text-center space-y-4 rounded-2xl">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 mx-auto flex items-center justify-center text-red-500">
                <CheckSquare className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">Inspector y Selección de Asientos</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Haz clic directamente en cualquier asiento o mesa para habilitarlo o deshabilitarlo con 1 solo clic. Si le das un clic se desactiva/bloquea, y si lo vuelves a tocar se habilita.
              </p>

              <div className="pt-2 border-t border-white/5 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-200 hover:text-white border border-white/10 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer active:scale-95"
                >
                  Seleccionar Todos los Asientos
                </button>
              </div>

              <div className="bg-zinc-900/50 rounded-xl p-3 text-[11px] text-zinc-400 text-left space-y-1.5">
                <p className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Guardado automático activado</span>
                </p>
                <p>• Da 1 clic sobre cualquier asiento para bloquearlo o habilitarlo.</p>
                <p>• Haz clic en una mesa para alternar todas sus sillas al mismo tiempo.</p>
                <p>• Usa los controles de zoom (+ / -) y arrastra el mapa para navegarlo.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* TEMPLATE SELECTION MODAL */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel border border-white/10 rounded-2xl max-w-2xl w-full p-6 sm:p-7 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-red-500">
                  Plantillas de Sede
                </span>
                <h3 className="text-xl font-black text-white mt-0.5">Selecciona una Plantilla para el Mapa</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="text-zinc-400 hover:text-white p-2 hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Template Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option 1: Labrú */}
              <div
                onClick={() => setSelectedTemplate('ARENA_VIP')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  selectedTemplate === 'ARENA_VIP'
                    ? 'bg-red-950/20 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)] ring-1 ring-red-500'
                    : 'bg-zinc-900/60 border-white/10 hover:border-white/20 hover:bg-zinc-900/80'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold uppercase text-white">Labrú</span>
                    <span className="text-[10px] bg-red-950/60 text-red-400 border border-red-800/60 px-2 py-0.5 rounded-full font-bold uppercase">
                      Sede Nueva
                    </span>
                  </div>
                  {selectedTemplate === 'ARENA_VIP' && <CheckCircle2 className="w-4 h-4 text-red-500" />}
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Distribución oficial para <strong>Labrú</strong>: 8 Mesas Ringside con entrada, 12 Mesas VIP, 44 Primera Fila, 44 Segunda Fila, General y cuadrilátero central.
                </p>
              </div>

              {/* Option 2: The Wrestling Factory */}
              <div
                onClick={() => setSelectedTemplate('CLASSIC_RING')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  selectedTemplate === 'CLASSIC_RING'
                    ? 'bg-red-950/20 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)] ring-1 ring-red-500'
                    : 'bg-zinc-900/60 border-white/10 hover:border-white/20 hover:bg-zinc-900/80'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold uppercase text-white">The Wrestling Factory</span>
                    <span className="text-[10px] bg-zinc-800 text-zinc-300 border border-zinc-700 px-2 py-0.5 rounded-full font-bold uppercase">
                      Sede Clásica
                    </span>
                  </div>
                  {selectedTemplate === 'CLASSIC_RING' && <CheckCircle2 className="w-4 h-4 text-red-500" />}
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Distribución tradicional de <strong>The Wrestling Factory</strong>: Ring SCW clásico con las 4 zonas cardinales (Norte, Sur, Este, Oeste) y General.
                </p>
              </div>
            </div>

            {/* Price configuration for the template */}
            <div className="space-y-3 bg-zinc-900/60 p-4 rounded-2xl border border-white/10">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 block">Precios de las Zonas (MXN):</span>
              {selectedTemplate === 'ARENA_VIP' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Mesas Ringside (1-8)</label>
                    <input
                      type="number"
                      value={templatePrices.MESAS_VIP_RINGSIDE}
                      onChange={(e) => setTemplatePrices({ ...templatePrices, MESAS_VIP_RINGSIDE: e.target.value })}
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Mesas VIP (1-12)</label>
                    <input
                      type="number"
                      value={templatePrices.MESAS_VIP}
                      onChange={(e) => setTemplatePrices({ ...templatePrices, MESAS_VIP: e.target.value })}
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Primera Fila (1-44)</label>
                    <input
                      type="number"
                      value={templatePrices.PRIMERA_FILA}
                      onChange={(e) => setTemplatePrices({ ...templatePrices, PRIMERA_FILA: e.target.value })}
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Segunda Fila (1-44)</label>
                    <input
                      type="number"
                      value={templatePrices.SEGUNDA_FILA}
                      onChange={(e) => setTemplatePrices({ ...templatePrices, SEGUNDA_FILA: e.target.value })}
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">General</label>
                    <input
                      type="number"
                      value={templatePrices.GENERAL}
                      onChange={(e) => setTemplatePrices({ ...templatePrices, GENERAL: e.target.value })}
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Norte / Sur</label>
                    <input
                      type="number"
                      value={templatePrices.NORTE}
                      onChange={(e) => setTemplatePrices({ ...templatePrices, NORTE: e.target.value, SUR: e.target.value })}
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Este / Oeste</label>
                    <input
                      type="number"
                      value={templatePrices.ESTE}
                      onChange={(e) => setTemplatePrices({ ...templatePrices, ESTE: e.target.value, OESTE: e.target.value })}
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">General</label>
                    <input
                      type="number"
                      value={templatePrices.GENERAL}
                      onChange={(e) => setTemplatePrices({ ...templatePrices, GENERAL: e.target.value })}
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="flex-1 py-3 rounded-xl border border-white/10 bg-zinc-900 hover:bg-zinc-800 font-bold text-xs uppercase tracking-wider text-zinc-300 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApplyTemplate}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 font-bold text-xs uppercase tracking-wider text-white shadow-lg shadow-red-950/40 transition-all cursor-pointer active:scale-95"
              >
                Confirmar y Aplicar Plantilla
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
