"use client";

import React, { useState, useEffect } from 'react';
import { 
  Move, Plus, Trash2, Save, LayoutTemplate, Grid, CheckCircle2, 
  Eye, EyeOff, AlertCircle
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

  // Selected item in editor
  const [selectedSeat, setSelectedSeat] = useState<SeatItem | null>(null);
  const [selectedZone, setSelectedZone] = useState<any | null>(null);

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

    if (selectedSeat && selectedSeat.id === seatId) {
      setSelectedSeat(prev => (prev ? { ...prev, x: newX, y: newY } : null));
    }
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
  };

  // Click on seat to select in editor
  const handleSeatClickInEditor = (seat: SeatItem, zone: any) => {
    setSelectedSeat(seat);
    setSelectedZone(zone);
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
      setSelectedSeat(null);
      setSelectedZone(null);
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
      setSelectedSeat(null);
      useToastStore.getState().addToast('Asiento eliminado del mapa', 'info');
    } catch (error) {
      alert('Error al eliminar asiento');
    }
  };

  // Toggle seat availability in editor
  const handleToggleSeatAvailability = async (seat: SeatItem) => {
    const newStatus = !seat.is_available;
    setLocalZones(prev =>
      prev.map(z => ({
        ...z,
        seats: z.seats?.map((s: any) => (s.id === seat.id ? { ...s, is_available: newStatus } : s)),
      }))
    );
    if (selectedSeat?.id === seat.id) {
      setSelectedSeat(prev => (prev ? { ...prev, is_available: newStatus } : null));
    }
    try {
      await adminService.updateSeat(seat.id, { is_available: newStatus });
    } catch (error) {
      console.error(error);
    }
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

  return (
    <div className="space-y-6">
      {/* Top Action Toolbar */}
      <div className="bg-zinc-950 border border-white/10 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex flex-wrap items-center gap-2">
          {/* Templates Button */}
          <button
            type="button"
            onClick={() => setIsTemplateModalOpen(true)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs uppercase tracking-wider px-4 py-2 rounded-lg transition-colors cursor-pointer"
          >
            <LayoutTemplate className="w-4 h-4" />
            <span>Cargar Plantilla de Mapa</span>
          </button>

          {/* Add Seat (Only in Labrú mode) */}
          {isArenaMap && (
            <button
              type="button"
              onClick={() => setIsAddSeatOpen(true)}
              className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/10 font-semibold text-xs uppercase tracking-wider px-3.5 py-2 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Agregar Asiento</span>
            </button>
          )}

          {/* Grid Snap Options (Only in Labrú mode) */}
          {isArenaMap && (
            <div className="flex items-center gap-1.5 bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1 text-xs">
              <span className="font-semibold text-zinc-400">Cuadrícula:</span>
              <div className="flex items-center gap-1">
                {[0, 5, 10, 20].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setGridSnap(val)}
                    className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors ${
                      gridSnap === val
                        ? 'bg-zinc-700 text-white'
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
              className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/10 font-semibold text-xs uppercase tracking-wider px-3 py-2 rounded-lg transition-colors cursor-pointer"
            >
              {previewMode ? <Eye className="w-4 h-4 text-amber-400" /> : <EyeOff className="w-4 h-4 text-zinc-400" />}
              <span>{previewMode ? 'Vista Previa' : 'Modo Edición'}</span>
            </button>
          )}
        </div>

        {/* Save Changes Button (Only in Labrú mode) */}
        {isArenaMap && (
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <span className="text-amber-400 text-xs font-bold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Cambios sin guardar
              </span>
            )}
            <button
              type="button"
              disabled={isSaving || !hasUnsavedChanges}
              onClick={handleSaveChanges}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-xs uppercase tracking-wider transition-colors ${
                hasUnsavedChanges
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
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
              gridSnap={gridSnap}
              mapConfig={event?.map_config}
            />
          ) : (
            <ClassicWrestlingFactoryMap
              zones={localZones}
              selectedSeatId={selectedSeat?.id}
              onSeatClick={(seat, zone) => {
                setSelectedSeat(seat);
                setSelectedZone(zone);
              }}
            />
          )}
        </div>

        {/* Sidebar Inspector / Details (1 column) */}
        <div className="lg:col-span-1 space-y-4">
          {selectedSeat ? (
            <div className="bg-zinc-950 border border-white/10 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">Asiento Seleccionado</span>
                  <h3 className="text-base font-bold text-white">
                    {selectedSeat.table_number
                      ? `Mesa #${selectedSeat.table_number}`
                      : isArenaMap
                      ? `Fila ${selectedSeat.row_name} · #${selectedSeat.seat_number}`
                      : `Fila ${selectedSeat.row_name} · Asiento ${selectedSeat.custom_label || getDisplayNumber(selectedZone?.zone_type, selectedSeat.seat_number)}`}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSeat(null)}
                  className="text-zinc-500 hover:text-white text-xs p-1"
                >
                  ✕
                </button>
              </div>

              {/* Position coordinates (Only in Labrú mode) */}
              {isArenaMap && (
                <div className="bg-zinc-900/60 rounded-xl p-3 border border-white/5 space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">Coordenadas:</span>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="bg-zinc-950 p-2 rounded border border-white/10">
                      <span className="text-zinc-500">X: </span>
                      <span className="text-white font-bold">{Math.round(selectedSeat.x || 0)}px</span>
                    </div>
                    <div className="bg-zinc-950 p-2 rounded border border-white/10">
                      <span className="text-zinc-500">Y: </span>
                      <span className="text-white font-bold">{Math.round(selectedSeat.y || 0)}px</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Zone info */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Zona</label>
                <p className="text-sm font-semibold text-white bg-zinc-900 px-3 py-2 rounded-lg border border-white/5">
                  {selectedZone?.name || selectedZone?.zone_type} (${selectedZone?.price} MXN)
                </p>
              </div>

              {/* Custom Label input (Only in Labrú mode) */}
              {isArenaMap && (
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Etiqueta Personalizada</label>
                  <input
                    type="text"
                    value={selectedSeat.custom_label || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedSeat({ ...selectedSeat, custom_label: val });
                      setLocalZones(prev =>
                        prev.map(z => ({
                          ...z,
                          seats: z.seats?.map((s: any) => (s.id === selectedSeat.id ? { ...s, custom_label: val } : s)),
                        }))
                      );
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:border-red-500 focus:outline-none"
                    placeholder="Ej. VIP-1, 44..."
                  />
                </div>
              )}

              {/* Status toggle */}
              <div className="pt-2 border-t border-white/10 space-y-2">
                <button
                  type="button"
                  onClick={() => handleToggleSeatAvailability(selectedSeat)}
                  className={`w-full py-2.5 px-3 rounded-lg font-semibold text-xs uppercase tracking-wider transition-colors ${
                    selectedSeat.is_available
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                  }`}
                >
                  {selectedSeat.is_available ? '✓ Habilitado (Público)' : '✕ Bloqueado / Oculto'}
                </button>

                {/* Delete Seat (Only in Labrú mode) */}
                {isArenaMap && (
                  <button
                    type="button"
                    onClick={() => handleDeleteSeat(selectedSeat.id)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-red-400 hover:text-red-300 bg-zinc-900 hover:bg-zinc-850 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar Asiento</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-zinc-950 border border-white/10 rounded-2xl p-5 shadow-lg text-center space-y-3">
              <div className="w-9 h-9 rounded-full bg-zinc-900 border border-white/10 mx-auto flex items-center justify-center text-zinc-400">
                <Move className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider">Inspector de Asientos</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Haz clic en cualquier asiento del mapa para seleccionarlo, ver sus datos o cambiar su disponibilidad (habilitar / bloquear).
              </p>
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-white/10 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">
                  Plantillas de Sede
                </span>
                <h3 className="text-lg font-bold text-white mt-1">Selecciona una Plantilla para el Mapa</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="text-zinc-500 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            {/* Template Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option 1: Labrú */}
              <div
                onClick={() => setSelectedTemplate('ARENA_VIP')}
                className={`p-4 rounded-xl border cursor-pointer transition-colors ${
                  selectedTemplate === 'ARENA_VIP'
                    ? 'bg-zinc-900 border-red-500 ring-1 ring-red-500'
                    : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold uppercase text-white">Labrú</span>
                    <span className="text-[10px] bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded font-semibold">
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
                className={`p-4 rounded-xl border cursor-pointer transition-colors ${
                  selectedTemplate === 'CLASSIC_RING'
                    ? 'bg-zinc-900 border-red-500 ring-1 ring-red-500'
                    : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold uppercase text-white">The Wrestling Factory</span>
                    <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded font-semibold">
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
            <div className="space-y-3 bg-zinc-900/50 p-4 rounded-xl border border-white/5">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300 block">Precios de las Zonas (MXN):</span>
              {selectedTemplate === 'ARENA_VIP' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold uppercase text-zinc-400 block mb-1">Mesas Ringside (1-8)</label>
                    <input
                      type="number"
                      value={templatePrices.MESAS_VIP_RINGSIDE}
                      onChange={(e) => setTemplatePrices({ ...templatePrices, MESAS_VIP_RINGSIDE: e.target.value })}
                      className="w-full bg-zinc-950 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase text-zinc-400 block mb-1">Mesas VIP (1-12)</label>
                    <input
                      type="number"
                      value={templatePrices.MESAS_VIP}
                      onChange={(e) => setTemplatePrices({ ...templatePrices, MESAS_VIP: e.target.value })}
                      className="w-full bg-zinc-950 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase text-zinc-400 block mb-1">Primera Fila (1-44)</label>
                    <input
                      type="number"
                      value={templatePrices.PRIMERA_FILA}
                      onChange={(e) => setTemplatePrices({ ...templatePrices, PRIMERA_FILA: e.target.value })}
                      className="w-full bg-zinc-950 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase text-zinc-400 block mb-1">Segunda Fila (1-44)</label>
                    <input
                      type="number"
                      value={templatePrices.SEGUNDA_FILA}
                      onChange={(e) => setTemplatePrices({ ...templatePrices, SEGUNDA_FILA: e.target.value })}
                      className="w-full bg-zinc-950 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase text-zinc-400 block mb-1">General</label>
                    <input
                      type="number"
                      value={templatePrices.GENERAL}
                      onChange={(e) => setTemplatePrices({ ...templatePrices, GENERAL: e.target.value })}
                      className="w-full bg-zinc-950 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold uppercase text-zinc-400 block mb-1">Norte / Sur</label>
                    <input
                      type="number"
                      value={templatePrices.NORTE}
                      onChange={(e) => setTemplatePrices({ ...templatePrices, NORTE: e.target.value, SUR: e.target.value })}
                      className="w-full bg-zinc-950 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase text-zinc-400 block mb-1">Este / Oeste</label>
                    <input
                      type="number"
                      value={templatePrices.ESTE}
                      onChange={(e) => setTemplatePrices({ ...templatePrices, ESTE: e.target.value, OESTE: e.target.value })}
                      className="w-full bg-zinc-950 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase text-zinc-400 block mb-1">General</label>
                    <input
                      type="number"
                      value={templatePrices.GENERAL}
                      onChange={(e) => setTemplatePrices({ ...templatePrices, GENERAL: e.target.value })}
                      className="w-full bg-zinc-950 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="flex-1 py-2.5 rounded-lg border border-white/10 bg-zinc-900 hover:bg-zinc-800 font-semibold text-xs uppercase tracking-wider text-zinc-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApplyTemplate}
                className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 font-semibold text-xs uppercase tracking-wider text-white transition-colors cursor-pointer"
              >
                Confirmar y Aplicar Plantilla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD CUSTOM SEAT MODAL */}
      {isAddSeatOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleAddCustomSeat} className="bg-zinc-950 border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white">Agregar Asiento Manual al Mapa</h3>
              <button
                type="button"
                onClick={() => setIsAddSeatOpen(false)}
                className="text-zinc-500 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-zinc-400 uppercase block mb-1">Zona</label>
                <select
                  value={newSeatData.zone_id}
                  onChange={(e) => setNewSeatData({ ...newSeatData, zone_id: Number(e.target.value) })}
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2.5 text-xs text-white"
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
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase block mb-1">Fila</label>
                  <input
                    type="text"
                    value={newSeatData.row_name}
                    onChange={(e) => setNewSeatData({ ...newSeatData, row_name: e.target.value })}
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2.5 text-xs text-white"
                    placeholder="Ej. A, VIP 1"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase block mb-1">Número de Asiento</label>
                  <input
                    type="number"
                    value={newSeatData.seat_number}
                    onChange={(e) => setNewSeatData({ ...newSeatData, seat_number: Number(e.target.value) })}
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2.5 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-400 uppercase block mb-1">Etiqueta Personalizada</label>
                <input
                  type="text"
                  value={newSeatData.custom_label}
                  onChange={(e) => setNewSeatData({ ...newSeatData, custom_label: e.target.value })}
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2.5 text-xs text-white"
                  placeholder="Ej. VIP-1, 44..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase block mb-1">Posición X (px)</label>
                  <input
                    type="number"
                    value={newSeatData.x}
                    onChange={(e) => setNewSeatData({ ...newSeatData, x: Number(e.target.value) })}
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase block mb-1">Posición Y (px)</label>
                  <input
                    type="number"
                    value={newSeatData.y}
                    onChange={(e) => setNewSeatData({ ...newSeatData, y: Number(e.target.value) })}
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2.5 text-xs text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAddSeatOpen(false)}
                className="flex-1 py-2.5 rounded-lg border border-white/10 bg-zinc-900 hover:bg-zinc-800 font-semibold text-xs uppercase tracking-wider text-zinc-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 font-semibold text-xs uppercase tracking-wider text-white transition-colors cursor-pointer"
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
