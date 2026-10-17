"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Move, Plus, Trash2, Save, LayoutTemplate, Grid, CheckCircle2, 
  Eye, EyeOff, AlertCircle, CheckSquare, Layers, X
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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [gridSnap, setGridSnap] = useState<number>(5);
  const [previewMode, setPreviewMode] = useState(false);

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

  // Add Seat modal / drawer
  const [isAddSeatOpen, setIsAddSeatOpen] = useState(false);
  const [newSeatData, setNewSeatData] = useState({
    zone_id: zones[0]?.id || 0,
    row_name: 'A',
    seat_number: 1,
    x: 520,
    y: 200,
    custom_label: '',
    table_number: '',
    is_available: true,
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
    if (zones.length > 0 && !newSeatData.zone_id) {
      setNewSeatData(prev => ({ ...prev, zone_id: zones[0].id }));
    }
  }, [zones]);

  // Handle seat drag/move
  const handleSeatMove = (seatId: number, newX: number, newY: number) => {
    setLocalZones(prevZones =>
      prevZones.map(zone => ({
        ...zone,
        seats: zone.seats?.map((seat: SeatItem) =>
          seat.id === seatId ? { ...seat, x: newX, y: newY } : seat
        ),
      }))
    );
    setHasUnsavedChanges(true);

    setSelectedSeats(prev =>
      prev.map(s => (s.id === seatId ? { ...s, x: newX, y: newY } : s))
    );
  };

  // Handle table drag/move (moves all seats in that table)
  const handleTableMove = (tableNumber: number, zoneType: string, newCenterX: number, newCenterY: number) => {
    setLocalZones(prevZones =>
      prevZones.map(zone => {
        if (zone.zone_type !== zoneType) return zone;
        return {
          ...zone,
          seats: zone.seats?.map((seat: SeatItem) => {
            const tNum = seat.table_number || seat.seat_number;
            if (tNum === tableNumber) {
              return { ...seat, x: newCenterX, y: newCenterY };
            }
            return seat;
          }),
        };
      })
    );
    setHasUnsavedChanges(true);

    setSelectedSeats(prev =>
      prev.map(s => {
        const tNum = s.table_number || s.seat_number;
        if (tNum === tableNumber) {
          return { ...s, x: newCenterX, y: newCenterY };
        }
        return s;
      })
    );
  };

  // Click on seat to toggle selection in editor (multi-select)
  const handleSeatClickInEditor = (seat: SeatItem, zone: any) => {
    setLastSelectedZone(zone);
    setSelectedSeats(prev => {
      const exists = prev.some(s => s.id === seat.id);
      if (exists) {
        // Toggle OFF (unselect)
        return prev.filter(s => s.id !== seat.id);
      } else {
        // Toggle ON (add to selection)
        const freshSeat = zone?.seats?.find((s: SeatItem) => s.id === seat.id) || seat;
        return [...prev, { ...freshSeat, zone }];
      }
    });
  };

  // Save all moved seats to backend
  const handleSaveChanges = async () => {
    try {
      setIsSaving(true);
      const allSeats: any[] = [];
      localZones.forEach(z => {
        z.seats?.forEach((s: SeatItem) => {
          allSeats.push({
            id: s.id,
            x: s.x,
            y: s.y,
            custom_label: s.custom_label,
            row_name: s.row_name,
            seat_number: s.seat_number,
            table_number: s.table_number,
            table_seat_number: s.table_seat_number,
            is_available: s.is_available,
            zone_id: z.id,
          });
        });
      });

      await adminService.bulkUpdateSeatPositions({ seats: allSeats });
      setHasUnsavedChanges(false);
      onZonesUpdated(localZones);
      useToastStore.getState().addToast('¡Mapa guardado exitosamente!', 'success');
    } catch (error) {
      console.error('Error saving seat positions:', error);
      alert('Hubo un error al guardar las posiciones de los asientos.');
    } finally {
      setIsSaving(false);
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
      setHasUnsavedChanges(false);
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

  // Bulk delete seats
  const handleBulkDeleteSeats = async () => {
    if (selectedSeats.length === 0) return;
    const count = selectedSeats.length;
    const confirmMsg = count === 1
      ? '¿Eliminar este asiento del mapa?'
      : `¿Eliminar los ${count} asientos seleccionados del mapa? Esta acción no se puede deshacer.`;
    
    if (!confirm(confirmMsg)) return;

    try {
      setIsBulkUpdating(true);
      const targetIds = new Set(selectedSeats.map(s => s.id));
      
      await Promise.all(selectedSeats.map(s => adminService.deleteSeat(s.id)));

      setLocalZones(prev =>
        prev.map(z => ({
          ...z,
          seats: z.seats?.filter((s: any) => !targetIds.has(s.id)),
        }))
      );
      setSelectedSeats([]);
      useToastStore.getState().addToast(`${count} ${count === 1 ? 'asiento eliminado' : 'asientos eliminados'} del mapa`, 'info');
    } catch (error) {
      console.error('Error deleting seats:', error);
      alert('Error al eliminar asientos seleccionados');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // Delete individual seat
  const handleDeleteSeat = async (seatId: number) => {
    if (!confirm('¿Eliminar este asiento del mapa?')) return;
    try {
      await adminService.deleteSeat(seatId);
      setLocalZones(prev =>
        prev.map(z => ({
          ...z,
          seats: z.seats?.filter((s: any) => s.id !== seatId),
        }))
      );
      setSelectedSeats(prev => prev.filter(s => s.id !== seatId));
      useToastStore.getState().addToast('Asiento eliminado del mapa', 'info');
    } catch (error) {
      alert('Error al eliminar asiento');
    }
  };

  // Helper selectors
  const handleSelectRow = () => {
    const baseSeat = selectedSeats[selectedSeats.length - 1];
    if (!baseSeat) return;
    const baseZone = getZoneForSeat(baseSeat);
    if (!baseZone || !baseSeat.row_name) return;

    const rowSeats: SeatItem[] = (baseZone.seats || []).filter(
      (s: SeatItem) => s.row_name === baseSeat.row_name
    );

    setSelectedSeats(prev => {
      const existingIds = new Set(prev.map(s => s.id));
      const toAdd = rowSeats.filter(s => !existingIds.has(s.id)).map(s => ({ ...s, zone: baseZone }));
      return [...prev, ...toAdd];
    });
    useToastStore.getState().addToast(`Fila ${baseSeat.row_name} seleccionada (${rowSeats.length} asientos)`, 'info');
  };

  const handleSelectTable = () => {
    const baseSeat = selectedSeats[selectedSeats.length - 1];
    if (!baseSeat || !baseSeat.table_number) return;
    const baseZone = getZoneForSeat(baseSeat);
    if (!baseZone) return;

    const tableSeats: SeatItem[] = (baseZone.seats || []).filter(
      (s: SeatItem) => s.table_number === baseSeat.table_number
    );

    setSelectedSeats(prev => {
      const existingIds = new Set(prev.map(s => s.id));
      const toAdd = tableSeats.filter(s => !existingIds.has(s.id)).map(s => ({ ...s, zone: baseZone }));
      return [...prev, ...toAdd];
    });
    useToastStore.getState().addToast(`Mesa #${baseSeat.table_number} seleccionada (${tableSeats.length} asientos)`, 'info');
  };

  const handleSelectZone = () => {
    const baseSeat = selectedSeats[selectedSeats.length - 1];
    const baseZone = baseSeat ? getZoneForSeat(baseSeat) : lastSelectedZone || localZones[0];
    if (!baseZone || !baseZone.seats) return;

    setSelectedSeats(prev => {
      const existingIds = new Set(prev.map(s => s.id));
      const toAdd = baseZone.seats.filter((s: SeatItem) => !existingIds.has(s.id)).map((s: SeatItem) => ({ ...s, zone: baseZone }));
      return [...prev, ...toAdd];
    });
    useToastStore.getState().addToast(`Zona "${baseZone.name || baseZone.zone_type}" seleccionada (${baseZone.seats.length} asientos)`, 'info');
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

  // Add a new custom seat
  const handleAddCustomSeat = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const created = await adminService.createCustomSeat(newSeatData);
      setLocalZones(prev =>
        prev.map(z => (z.id === Number(newSeatData.zone_id) ? { ...z, seats: [...(z.seats || []), created] } : z))
      );
      setIsAddSeatOpen(false);
      useToastStore.getState().addToast('Nuevo asiento agregado al mapa', 'success');
    } catch (error) {
      alert('Error al crear asiento');
    } finally {
      setIsSaving(false);
    }
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
            <span>Cargar Plantilla de Mapa</span>
          </button>

          {/* Add Seat (Only in Labrú mode) */}
          {isArenaMap && (
            <button
              type="button"
              onClick={() => setIsAddSeatOpen(true)}
              className="flex items-center gap-1.5 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 border border-white/10 font-bold text-xs uppercase tracking-wider px-3.5 py-2.5 rounded-xl transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-red-500" />
              <span>Agregar Asiento</span>
            </button>
          )}

          {/* Grid Snap Options (Only in Labrú mode) */}
          {isArenaMap && (
            <div className="flex items-center gap-1.5 bg-zinc-900/80 border border-white/10 rounded-xl px-3 py-1.5 text-xs">
              <span className="font-bold text-zinc-400 uppercase text-[10px] tracking-wider">Cuadrícula:</span>
              <div className="flex items-center gap-1">
                {[0, 5, 10, 20].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setGridSnap(val)}
                    className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      gridSnap === val
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                    }`}
                  >
                    {val === 0 ? 'Libre' : `${val}px`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Preview Toggle (Only in Labrú mode) */}
          {isArenaMap && (
            <button
              type="button"
              onClick={() => setPreviewMode(!previewMode)}
              className="flex items-center gap-1.5 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 font-bold text-xs uppercase tracking-wider px-3.5 py-2.5 rounded-xl transition-all cursor-pointer active:scale-95"
            >
              {previewMode ? <Eye className="w-4 h-4 text-red-500" /> : <EyeOff className="w-4 h-4 text-zinc-400" />}
              <span>{previewMode ? 'Vista Previa' : 'Modo Edición'}</span>
            </button>
          )}

          {/* Quick Selection Status Badge in Toolbar */}
          {selectedSeats.length > 0 && (
            <div className="flex items-center gap-2.5 bg-zinc-900/90 border border-red-500/30 rounded-xl px-3 py-1.5 text-xs text-zinc-200 shadow-md">
              <span className="flex items-center gap-1.5 font-black text-white">
                <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_#ef4444] animate-pulse" />
                {selectedSeats.length} {selectedSeats.length === 1 ? 'seleccionado' : 'seleccionados'}
              </span>
              <div className="h-4 w-px bg-white/10" />
              <button
                type="button"
                disabled={isBulkUpdating}
                onClick={() => handleBulkSetAvailability(true)}
                className="text-emerald-400 hover:text-emerald-300 font-bold px-2 py-0.5 rounded-lg hover:bg-emerald-950/40 border border-emerald-500/20 transition-colors cursor-pointer text-xs uppercase tracking-wider"
                title="Habilitar todos los seleccionados"
              >
                Habilitar
              </button>
              <button
                type="button"
                disabled={isBulkUpdating}
                onClick={() => handleBulkSetAvailability(false)}
                className="text-zinc-300 hover:text-white font-bold px-2 py-0.5 rounded-lg hover:bg-zinc-800 border border-white/10 transition-colors cursor-pointer text-xs uppercase tracking-wider"
                title="Bloquear todos los seleccionados"
              >
                Bloquear
              </button>
              <button
                type="button"
                onClick={handleClearSelection}
                className="text-zinc-500 hover:text-white text-xs px-1 hover:bg-white/5 rounded transition-colors cursor-pointer"
                title="Deseleccionar todos"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Save Changes Button (Only in Labrú mode) */}
        {isArenaMap && (
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <span className="text-red-400 text-xs font-bold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-red-500" /> Cambios sin guardar
              </span>
            )}
            <button
              type="button"
              disabled={isSaving || !hasUnsavedChanges}
              onClick={handleSaveChanges}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                hasUnsavedChanges
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-800 hover:from-emerald-500 hover:to-emerald-700 text-white shadow-lg shadow-emerald-950/40 cursor-pointer active:scale-95'
                  : 'bg-zinc-900 text-zinc-600 border border-white/5 cursor-not-allowed'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Guardando...' : 'Guardar Mapa'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Interactive Workspace Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Seat Map Canvas (3 columns) */}
        <div className="lg:col-span-3">
          {isArenaMap ? (
            <ArenaSeatMap
              zones={localZones}
              isInteractiveEditing={!previewMode}
              onSeatMove={handleSeatMove}
              onTableMove={handleTableMove}
              onSeatClickInEditor={handleSeatClickInEditor}
              selectedSeatInEditor={selectedSeat}
              selectedSeatIdsInEditor={selectedSeatIds}
              gridSnap={gridSnap}
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

                {/* Bulk Delete (in Arena mode) */}
                {isArenaMap && (
                  <button
                    type="button"
                    disabled={isBulkUpdating}
                    onClick={handleBulkDeleteSeats}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-4 text-xs font-bold uppercase tracking-wider text-red-400 hover:text-red-300 bg-red-950/20 hover:bg-red-950/50 border border-red-500/20 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar Asientos Seleccionados</span>
                  </button>
                )}
              </div>

              {/* Quick Selection Helpers */}
              <div className="pt-2 border-t border-white/10 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block">
                  Ayudantes de Selección
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={handleSelectRow}
                    className="px-2.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-white/10 font-bold text-[10px] uppercase tracking-wider transition-colors cursor-pointer text-center"
                  >
                    + Fila Actual
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectZone}
                    className="px-2.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-white/10 font-bold text-[10px] uppercase tracking-wider transition-colors cursor-pointer text-center"
                  >
                    + Toda la Zona
                  </button>
                  <button
                    type="button"
                    onClick={handleInvertSelection}
                    className="px-2.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-white/10 font-bold text-[10px] uppercase tracking-wider transition-colors cursor-pointer text-center"
                  >
                    Invertir
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="px-2.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-white/10 font-bold text-[10px] uppercase tracking-wider transition-colors cursor-pointer text-center"
                  >
                    Todo el Mapa
                  </button>
                </div>
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
                  <span className="text-[10px] font-black uppercase tracking-widest text-red-500 flex items-center gap-1.5">
                    <CheckSquare className="w-3 h-3 text-red-500" />
                    1 Asiento Seleccionado
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

              {/* Position coordinates (Only in Labrú mode) */}
              {isArenaMap && (
                <div className="bg-zinc-900/60 rounded-xl p-3 border border-white/5 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block">Coordenadas:</span>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="bg-zinc-950 p-2 rounded-lg border border-white/10">
                      <span className="text-zinc-500">X: </span>
                      <span className="text-white font-bold">{Math.round(selectedSeat.x || 0)}px</span>
                    </div>
                    <div className="bg-zinc-950 p-2 rounded-lg border border-white/10">
                      <span className="text-zinc-500">Y: </span>
                      <span className="text-white font-bold">{Math.round(selectedSeat.y || 0)}px</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Zone info */}
              <div className="bg-zinc-900/60 border border-white/5 rounded-xl p-3 space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block">Zona</label>
                <p className="text-sm font-bold text-white">
                  {selectedZone?.name || selectedZone?.zone_type} (${selectedZone?.price} MXN)
                </p>
              </div>

              {/* Custom Label input (Only in Labrú mode) */}
              {isArenaMap && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block">Etiqueta Personalizada</label>
                  <input
                    type="text"
                    value={selectedSeat.custom_label || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedSeats(prev =>
                        prev.map(s => (s.id === selectedSeat.id ? { ...s, custom_label: val } : s))
                      );
                      setLocalZones(prev =>
                        prev.map(z => ({
                          ...z,
                          seats: z.seats?.map((s: any) => (s.id === selectedSeat.id ? { ...s, custom_label: val } : s)),
                        }))
                      );
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2 text-white text-xs focus:border-red-500 focus:outline-none transition-colors"
                    placeholder="Ej. VIP-1, 44..."
                  />
                </div>
              )}

              {/* Quick Selection Helpers for this single seat */}
              <div className="pt-2 border-t border-white/10 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block">
                  Expandir Selección
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedSeat.row_name && (
                    <button
                      type="button"
                      onClick={handleSelectRow}
                      className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-white/10 font-bold text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      + Toda la Fila {selectedSeat.row_name}
                    </button>
                  )}
                  {selectedSeat.table_number && (
                    <button
                      type="button"
                      onClick={handleSelectTable}
                      className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-white/10 font-bold text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      + Toda la Mesa #{selectedSeat.table_number}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSelectZone}
                    className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-white/10 font-bold text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    + Toda la Zona
                  </button>
                </div>
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

                {/* Delete Seat (Only in Labrú mode) */}
                {isArenaMap && (
                  <button
                    type="button"
                    onClick={() => handleDeleteSeat(selectedSeat.id)}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold uppercase tracking-wider text-red-400 hover:text-red-300 bg-red-950/20 hover:bg-red-950/50 border border-red-500/20 rounded-xl transition-colors cursor-pointer active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar Asiento</span>
                  </button>
                )}
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
                Haz clic en cualquier asiento del mapa para seleccionarlo. Puedes hacer clic en múltiples asientos para seleccionarlos a la vez y gestionar su estado en lote (habilitar o bloquear).
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

              {isArenaMap && (
                <div className="bg-zinc-900/50 rounded-xl p-3 text-[11px] text-zinc-400 text-left space-y-1">
                  <p>• <strong>Arrastra</strong> con el mouse para mover asientos o mesas completas.</p>
                  <p>• Usa los controles de zoom para acercar áreas específicas.</p>
                  <p>• Recuerda hacer clic en <strong>Guardar Mapa</strong> para persistir cambios.</p>
                </div>
              )}
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

      {/* ADD CUSTOM SEAT MODAL */}
      {isAddSeatOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleAddCustomSeat} className="glass-panel border border-white/10 rounded-2xl max-w-md w-full p-6 sm:p-7 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-red-500">
                  Nuevo Asiento
                </span>
                <h3 className="text-xl font-black text-white mt-0.5">Agregar Asiento Manual al Mapa</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddSeatOpen(false)}
                className="text-zinc-400 hover:text-white p-2 hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Zona</label>
                <select
                  value={newSeatData.zone_id}
                  onChange={(e) => setNewSeatData({ ...newSeatData, zone_id: Number(e.target.value) })}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-xs text-white focus:border-red-500 focus:outline-none transition-colors"
                >
                  {localZones.map(z => (
                    <option key={z.id} value={z.id}>
                      {z.name || z.zone_type} (${z.price} MXN)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Fila</label>
                  <input
                    type="text"
                    value={newSeatData.row_name}
                    onChange={(e) => setNewSeatData({ ...newSeatData, row_name: e.target.value })}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-xs text-white focus:border-red-500 focus:outline-none transition-colors"
                    placeholder="Ej. A, VIP 1"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Número de Asiento</label>
                  <input
                    type="number"
                    value={newSeatData.seat_number}
                    onChange={(e) => setNewSeatData({ ...newSeatData, seat_number: Number(e.target.value) })}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-xs text-white focus:border-red-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Etiqueta Personalizada</label>
                <input
                  type="text"
                  value={newSeatData.custom_label}
                  onChange={(e) => setNewSeatData({ ...newSeatData, custom_label: e.target.value })}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-xs text-white focus:border-red-500 focus:outline-none transition-colors"
                  placeholder="Ej. VIP-1, 44..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Posición X (px)</label>
                  <input
                    type="number"
                    value={newSeatData.x}
                    onChange={(e) => setNewSeatData({ ...newSeatData, x: Number(e.target.value) })}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-xs text-white focus:border-red-500 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Posición Y (px)</label>
                  <input
                    type="number"
                    value={newSeatData.y}
                    onChange={(e) => setNewSeatData({ ...newSeatData, y: Number(e.target.value) })}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-xs text-white focus:border-red-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAddSeatOpen(false)}
                className="flex-1 py-3 rounded-xl border border-white/10 bg-zinc-900 hover:bg-zinc-800 font-bold text-xs uppercase tracking-wider text-zinc-300 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 font-bold text-xs uppercase tracking-wider text-white shadow-lg shadow-red-950/40 transition-all cursor-pointer active:scale-95"
              >
                Crear Asiento
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
