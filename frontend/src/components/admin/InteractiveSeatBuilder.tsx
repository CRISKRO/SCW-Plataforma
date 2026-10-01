"use client";

import React, { useState, useEffect } from 'react';
import { 
  Move, Plus, Trash2, Save, LayoutTemplate, Grid, CheckCircle2, 
  RotateCcw, Sliders, Eye, EyeOff, Layers, DollarSign, AlertCircle, Sparkles
} from 'lucide-react';
import { adminService } from '@/services/admin.services';
import ArenaSeatMap, { SeatItem } from '@/components/ArenaSeatMap';
import { useToastStore } from '@/store/toastStore';

interface InteractiveSeatBuilderProps {
  eventId: number;
  event: any;
  zones: any[];
  onZonesUpdated: (updatedZones: any[]) => void;
}

export default function InteractiveSeatBuilder({
  eventId,
  event,
  zones,
  onZonesUpdated,
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
      useToastStore.getState().addToast('¡Distribución y coordenadas del mapa guardadas exitosamente!', 'success');
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
      ? '¿Cargar la plantilla de la sede "Labrú"? Esto configurará el mapa con 8 Mesas Ringside, 12 Mesas VIP, 44 Primera Fila, 44 Segunda Fila, General y cuadrilátero.'
      : '¿Cargar la plantilla de la sede "The Wrestling Factory"? Esto restaurará la distribución tradicional con Ring Clásico SCW y las 4 zonas cardinales (Norte, Sur, Este, Oeste y General).';

    if (!confirm(confirmMsg)) return;

    try {
      setIsSaving(true);
      const result = await adminService.applyTemplate({
        event_id: eventId,
        template_type: selectedTemplate,
        prices: templatePrices,
        clear_existing: true,
      });

      setLocalZones(result.zones || []);
      onZonesUpdated(result.zones || []);
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

  return (
    <div className="space-y-6">
      {/* Top Action Toolbar */}
      <div className="bg-zinc-950/90 backdrop-blur-md border border-white/10 rounded-3xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-2xl">
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Templates Button */}
          <button
            type="button"
            onClick={() => setIsTemplateModalOpen(true)}
            className="group relative flex items-center gap-2.5 bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 hover:from-red-500 hover:via-rose-500 hover:to-amber-400 text-white font-black text-xs uppercase tracking-wider px-5 py-3 rounded-2xl transition-all shadow-[0_0_20px_rgba(239,68,68,0.35)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] hover:scale-[1.02] active:scale-[0.98] border border-white/20"
          >
            <LayoutTemplate className="w-4 h-4 text-amber-200 group-hover:rotate-12 transition-transform" />
            <span>Cargar Plantilla de Mapa</span>
          </button>

          {/* Add Seat */}
          <button
            type="button"
            onClick={() => setIsAddSeatOpen(true)}
            className="flex items-center gap-2 bg-zinc-900/90 hover:bg-emerald-950/40 text-zinc-200 hover:text-emerald-300 border border-white/10 hover:border-emerald-500/40 font-bold text-xs uppercase tracking-wider px-4 py-3 rounded-2xl transition-all shadow-sm hover:shadow-[0_0_15px_rgba(16,185,129,0.25)] hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Agregar Asiento</span>
          </button>

          {/* Grid Snap Options */}
          <div className="flex items-center gap-2 bg-zinc-900/90 backdrop-blur-md border border-white/10 rounded-2xl px-3.5 py-1.5 shadow-inner">
            <Grid className="w-3.5 h-3.5 text-zinc-400" />
            <span className="font-black text-[10px] uppercase tracking-wider text-zinc-400">Cuadrícula:</span>
            <div className="flex items-center gap-1">
              {[0, 5, 10, 20].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setGridSnap(val)}
                  className={`px-2 py-1 rounded-xl text-[11px] font-black transition-all ${
                    gridSnap === val
                      ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-[0_0_12px_rgba(239,68,68,0.5)] scale-105'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {val === 0 ? 'Libre' : `${val}px`}
                </button>
              ))}
            </div>
          </div>

          {/* Preview Toggle */}
          <button
            type="button"
            onClick={() => setPreviewMode(!previewMode)}
            className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider px-4 py-3 rounded-2xl border transition-all hover:scale-[1.02] active:scale-[0.98] ${
              previewMode
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                : 'bg-zinc-900/90 text-zinc-300 border-white/10 hover:text-white hover:bg-zinc-800'
            }`}
          >
            {previewMode ? <Eye className="w-4 h-4 text-amber-400" /> : <EyeOff className="w-4 h-4 text-zinc-400" />}
            <span>{previewMode ? 'Modo Vista Previa' : 'Modo Edición'}</span>
          </button>
        </div>

        {/* Save Changes Button */}
        <div className="flex items-center gap-3">
          {hasUnsavedChanges && (
            <span className="text-amber-400 text-xs font-bold animate-pulse flex items-center gap-1 bg-amber-950/40 border border-amber-500/30 px-3 py-1.5 rounded-full">
              <AlertCircle className="w-3.5 h-3.5" /> Cambios sin guardar
            </span>
          )}
          <button
            type="button"
            disabled={isSaving || !hasUnsavedChanges}
            onClick={handleSaveChanges}
            className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-xl ${
              hasUnsavedChanges
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-[0_0_25px_rgba(16,185,129,0.5)] ring-2 ring-emerald-400/50 scale-105 active:scale-95'
                : 'bg-zinc-900/60 text-zinc-600 border border-white/5 cursor-not-allowed'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Guardando...' : 'Guardar Mapa'}</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Workspace Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Seat Map Canvas (3 columns) */}
        <div className="lg:col-span-3">
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
        </div>

        {/* Sidebar Inspector / Details (1 column) */}
        <div className="lg:col-span-1 space-y-4">
          {selectedSeat ? (
            <div className="bg-zinc-950 border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-red-500">Asiento Seleccionado</span>
                  <h3 className="text-lg font-black text-white">
                    {selectedSeat.table_number
                      ? `Mesa #${selectedSeat.table_number}`
                      : `Fila ${selectedSeat.row_name} · #${selectedSeat.seat_number}`}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSeat(null)}
                  className="text-zinc-500 hover:text-white text-xs"
                >
                  ✕
                </button>
              </div>

              {/* Position coordinates */}
              <div className="bg-zinc-900/60 rounded-xl p-3 border border-white/5 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">Coordenadas en Arena:</span>
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

              {/* Zone info */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Zona</label>
                <p className="text-sm font-bold text-white bg-zinc-900 px-3 py-2 rounded-lg border border-white/5">
                  {selectedZone?.name || selectedZone?.zone_type} (${selectedZone?.price} MXN)
                </p>
              </div>

              {/* Custom Label input */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Etiqueta Personalizada</label>
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

              {/* Status toggle */}
              <div className="pt-2 border-t border-white/10 space-y-2">
                <button
                  type="button"
                  onClick={() => handleToggleSeatAvailability(selectedSeat)}
                  className={`w-full py-3 px-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all border shadow-lg ${
                    selectedSeat.is_available
                      ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/50 hover:bg-emerald-900/80 shadow-[0_0_15px_rgba(16,185,129,0.25)] active:scale-95'
                      : 'bg-zinc-900/80 text-zinc-400 border-zinc-700/60 hover:text-white hover:bg-zinc-850 active:scale-95'
                  }`}
                >
                  {selectedSeat.is_available ? '✓ Asiento Habilitado (Público)' : '✕ Asiento Bloqueado / Oculto'}
                </button>

                {/* Delete Seat */}
                <button
                  type="button"
                  onClick={() => handleDeleteSeat(selectedSeat.id)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-black uppercase tracking-wider text-rose-400 hover:text-rose-200 bg-rose-950/20 hover:bg-rose-950/50 border border-rose-500/20 hover:border-rose-500/50 rounded-2xl transition-all shadow-sm active:scale-95"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Eliminar Asiento</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-zinc-950 border border-white/10 rounded-2xl p-5 shadow-2xl text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-zinc-900 border border-white/10 mx-auto flex items-center justify-center text-zinc-500">
                <Move className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Inspector Interactivo</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Haz clic en cualquier asiento o mesa del mapa para ver sus detalles, cambiar su etiqueta o posición.
              </p>
              <div className="bg-zinc-900/50 rounded-xl p-3 text-[11px] text-zinc-500 text-left space-y-1">
                <p>• <strong>Arrastra</strong> con el mouse para mover asientos o mesas completas.</p>
                <p>• Usa los controles de zoom para acercar áreas específicas.</p>
                <p>• Recuerda hacer clic en <strong>Guardar Mapa</strong> para persistir cambios.</p>
              </div>
            </div>
          )}

          {/* Zones Summary Card */}
          <div className="bg-zinc-950 border border-white/10 rounded-2xl p-4 shadow-xl space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">Zonas en este Evento</span>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {localZones.map(z => (
                <div key={z.id} className="flex items-center justify-between text-xs bg-zinc-900/60 px-2.5 py-1.5 rounded-lg border border-white/5">
                  <span className="font-bold text-zinc-300">{z.name || z.zone_type}</span>
                  <span className="font-mono text-emerald-400 font-bold">${z.price}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* === TEMPLATES MODAL === */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-white/10 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-red-500 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> Plantillas de Distribución
                </span>
                <h3 className="text-xl font-black text-white mt-1">Selecciona una Plantilla para el Mapa</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="text-zinc-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Template Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option 1: Labrú */}
              <div
                onClick={() => setSelectedTemplate('ARENA_VIP')}
                className={`p-5 rounded-3xl border cursor-pointer transition-all ${
                  selectedTemplate === 'ARENA_VIP'
                    ? 'bg-gradient-to-b from-rose-950/40 to-zinc-950 border-rose-500 shadow-[0_0_25px_rgba(244,63,94,0.35)] ring-2 ring-rose-500/80 scale-[1.02]'
                    : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/80'
                }`}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black uppercase tracking-wider text-rose-400">Labrú</span>
                    <span className="text-[10px] bg-rose-950/80 text-rose-300 border border-rose-500/40 px-2.5 py-0.5 rounded-full font-black">
                      Sede Nueva
                    </span>
                  </div>
                  {selectedTemplate === 'ARENA_VIP' && <CheckCircle2 className="w-5 h-5 text-rose-500" />}
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Configura la distribución oficial para <strong>Labrú</strong>: <strong>8 Mesas Ringside</strong> con entrada, <strong>12 Mesas VIP</strong>, <strong>44 Primera Fila</strong>, <strong>44 Segunda Fila</strong>, General y cuadrilátero central.
                </p>
              </div>

              {/* Option 2: The Wrestling Factory */}
              <div
                onClick={() => setSelectedTemplate('CLASSIC_RING')}
                className={`p-5 rounded-3xl border cursor-pointer transition-all ${
                  selectedTemplate === 'CLASSIC_RING'
                    ? 'bg-gradient-to-b from-amber-950/40 to-zinc-950 border-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.35)] ring-2 ring-amber-500/80 scale-[1.02]'
                    : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/80'
                }`}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black uppercase tracking-wider text-amber-400">The Wrestling Factory</span>
                    <span className="text-[10px] bg-amber-950/80 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full font-black">
                      Sede Clásica
                    </span>
                  </div>
                  {selectedTemplate === 'CLASSIC_RING' && <CheckCircle2 className="w-5 h-5 text-amber-500" />}
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Configura la distribución tradicional de <strong>The Wrestling Factory</strong>: Ring SCW clásico con las 4 zonas cardinales (<strong>Norte</strong>, <strong>Sur</strong>, <strong>Este</strong>, <strong>Oeste</strong>) y <strong>General</strong>.
                </p>
              </div>
            </div>

            {/* Price configuration for the template */}
            <div className="space-y-3 bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 block">Precios de las Zonas (MXN):</span>
              {selectedTemplate === 'ARENA_VIP' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-pink-400 block mb-1">Mesas Ringside (1-8)</label>
                    <input
                      type="number"
                      value={templatePrices.MESAS_VIP_RINGSIDE}
                      onChange={(e) => setTemplatePrices({ ...templatePrices, MESAS_VIP_RINGSIDE: e.target.value })}
                      className="w-full bg-zinc-950 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-yellow-400 block mb-1">Mesas VIP (1-12)</label>
                    <input
                      type="number"
                      value={templatePrices.MESAS_VIP}
                      onChange={(e) => setTemplatePrices({ ...templatePrices, MESAS_VIP: e.target.value })}
                      className="w-full bg-zinc-950 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-red-400 block mb-1">Primera Fila (1-44)</label>
                    <input
                      type="number"
                      value={templatePrices.PRIMERA_FILA}
                      onChange={(e) => setTemplatePrices({ ...templatePrices, PRIMERA_FILA: e.target.value })}
                      className="w-full bg-zinc-950 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-blue-400 block mb-1">Segunda Fila (1-44)</label>
                    <input
                      type="number"
                      value={templatePrices.SEGUNDA_FILA}
                      onChange={(e) => setTemplatePrices({ ...templatePrices, SEGUNDA_FILA: e.target.value })}
                      className="w-full bg-zinc-950 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-emerald-400 block mb-1">General</label>
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
                    <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Norte / Sur</label>
                    <input
                      type="number"
                      value={templatePrices.NORTE}
                      onChange={(e) => setTemplatePrices({ ...templatePrices, NORTE: e.target.value, SUR: e.target.value })}
                      className="w-full bg-zinc-950 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Este / Oeste</label>
                    <input
                      type="number"
                      value={templatePrices.ESTE}
                      onChange={(e) => setTemplatePrices({ ...templatePrices, ESTE: e.target.value, OESTE: e.target.value })}
                      className="w-full bg-zinc-950 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-emerald-400 block mb-1">General</label>
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

            <div className="flex gap-3 pt-3">
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="flex-1 py-3.5 rounded-2xl border border-white/10 bg-zinc-900/80 hover:bg-zinc-800 font-bold text-xs uppercase tracking-wider text-zinc-400 hover:text-white transition-all active:scale-[0.98]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApplyTemplate}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:via-rose-500 hover:to-amber-500 font-black text-xs uppercase tracking-wider text-white shadow-[0_0_25px_rgba(239,68,68,0.4)] hover:shadow-[0_0_35px_rgba(245,158,11,0.6)] transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Confirmar y Aplicar Plantilla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === ADD SEAT MODAL === */}
      {isAddSeatOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleAddCustomSeat} className="bg-zinc-950 border border-white/10 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-white uppercase tracking-tight">Agregar Nuevo Asiento</h3>

            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-400 uppercase">Zona</label>
              <select
                value={newSeatData.zone_id}
                onChange={(e) => setNewSeatData({ ...newSeatData, zone_id: Number(e.target.value) })}
                className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2.5 text-xs text-white"
              >
                {localZones.filter(z => z.zone_type !== 'GENERAL').map(z => (
                  <option key={z.id} value={z.id}>{z.name || z.zone_type}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-400 uppercase">Fila</label>
                <input
                  type="text"
                  required
                  value={newSeatData.row_name}
                  onChange={(e) => setNewSeatData({ ...newSeatData, row_name: e.target.value })}
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-xs text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-400 uppercase">Número</label>
                <input
                  type="number"
                  required
                  value={newSeatData.seat_number}
                  onChange={(e) => setNewSeatData({ ...newSeatData, seat_number: Number(e.target.value) })}
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-400 uppercase">Posición X</label>
                <input
                  type="number"
                  value={newSeatData.x}
                  onChange={(e) => setNewSeatData({ ...newSeatData, x: Number(e.target.value) })}
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-xs text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-400 uppercase">Posición Y</label>
                <input
                  type="number"
                  value={newSeatData.y}
                  onChange={(e) => setNewSeatData({ ...newSeatData, y: Number(e.target.value) })}
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-3">
              <button
                type="button"
                onClick={() => setIsAddSeatOpen(false)}
                className="flex-1 py-3 rounded-2xl border border-white/10 bg-zinc-900/80 hover:bg-zinc-800 font-bold text-xs uppercase tracking-wider text-zinc-400 hover:text-white transition-all active:scale-95"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 font-black text-xs uppercase tracking-wider text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all hover:scale-[1.02] active:scale-95"
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
