"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Minus, Plus, RotateCcw } from 'lucide-react';

interface SeatItem {
  id: number;
  row_name: string;
  seat_number: number;
  is_available: boolean;
  custom_label?: string;
  price?: string | number;
}

interface ClassicWrestlingFactoryMapProps {
  zones: any[];
  selectedSeatId?: number | null;
  selectedSeatIds?: number[];
  onSeatClick?: (seat: SeatItem, zone: any) => void;
}

export default function ClassicWrestlingFactoryMap({
  zones,
  selectedSeatId,
  selectedSeatIds = [],
  onSeatClick,
}: ClassicWrestlingFactoryMapProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const zoneNorte = zones.find(z => z.zone_type === 'NORTE');
  const zoneSur = zones.find(z => z.zone_type === 'SUR');
  const zoneEste = zones.find(z => z.zone_type === 'ESTE');
  const zoneOeste = zones.find(z => z.zone_type === 'OESTE');

  const getDisplayNumber = (zoneType: string, seatNumber: number) => {
    if (zoneType === 'NORTE') return seatNumber;
    if (zoneType === 'ESTE') return seatNumber + 17;
    if (zoneType === 'SUR') return seatNumber + 27;
    if (zoneType === 'OESTE') return seatNumber + 44;
    return seatNumber;
  };

  const handleZoomIn = () => setScale(s => Math.min(s + 0.15, 2.2));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.15, 0.6));
  const handleResetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const onPointerUp = () => setIsDragging(false);

  const renderZone = (zone: any, positionType: 'top' | 'bottom' | 'left' | 'right' = 'top') => {
    if (!zone) return null;
    const groupedSeats: Record<string, any[]> = {};
    zone.seats?.forEach((seat: any) => {
      if (!groupedSeats[seat.row_name]) groupedSeats[seat.row_name] = [];
      groupedSeats[seat.row_name].push(seat);
    });

    const sortedRowNames = Object.keys(groupedSeats).sort();
    if (positionType === 'left' || positionType === 'top') {
      sortedRowNames.reverse();
    }

    const isVertical = positionType === 'left' || positionType === 'right';

    return (
      <div className="flex flex-col items-center relative select-none">
        <div className={`flex gap-1 ${isVertical ? 'flex-row' : 'flex-col'}`}>
          {sortedRowNames.map(rowName => (
            <div key={rowName} className={`flex items-center justify-center gap-1 ${isVertical ? 'flex-col' : 'flex-row'}`}>
              <div className={`flex gap-1 ${isVertical ? 'flex-col' : 'flex-row'}`}>
                {groupedSeats[rowName].sort((a, b) => {
                  if (zone.zone_type === 'SUR' || zone.zone_type === 'OESTE') {
                    return b.seat_number - a.seat_number;
                  }
                  return a.seat_number - b.seat_number;
                }).map(seat => {
                  const displayNumber = getDisplayNumber(zone.zone_type, seat.seat_number);
                  const isSelected = (selectedSeatIds && selectedSeatIds.includes(seat.id)) || selectedSeatId === seat.id;
                  const isAvailable = seat.is_available;

                  return (
                    <div key={seat.id} className="contents">
                      <button
                        type="button"
                        onClick={() => onSeatClick?.(seat, zone)}
                        className={`w-6 h-6 md:w-7 md:h-7 rounded text-[10px] font-bold flex items-center justify-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-red-600 text-white border-2 border-white scale-110 z-20 shadow-[0_0_18px_rgba(239,68,68,0.85)] ring-2 ring-red-400 font-black'
                            : !isAvailable
                            ? 'bg-zinc-950 text-zinc-600 border border-zinc-800/80 opacity-40 cursor-pointer'
                            : 'bg-zinc-900 text-zinc-300 border border-zinc-700 hover:border-red-500 hover:bg-zinc-800 hover:text-white'
                        }`}
                        title={`Fila ${rowName} · Asiento ${displayNumber} (${zone.name || zone.zone_type}) - ${isAvailable ? 'Disponible' : 'Bloqueado'}`}
                      >
                        {displayNumber}
                      </button>
                      {zone.zone_type === 'ESTE' && displayNumber === 22 && (
                        <div className={isVertical ? 'h-5' : 'w-5'} />
                      )}
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

  return (
    <div className="glass-panel border border-white/10 p-4 sm:p-5 relative shadow-2xl overflow-hidden">
      {/* Top Bar inside canvas */}
      <div className="flex items-center justify-between gap-4 mb-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-600 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
          <span className="text-xs font-black uppercase tracking-wider text-white">
            The Wrestling Factory · Ring Clásico SCW
          </span>
          <span className="text-[11px] text-zinc-400 hidden sm:inline">
            (Haz clic en un asiento para seleccionarlo)
          </span>
        </div>

        {/* Simple Zoom Controls */}
        <div className="flex items-center gap-1 bg-zinc-900/90 border border-white/10 rounded-xl p-1 shadow-sm">
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg transition-colors cursor-pointer"
            title="Alejar"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            className="px-2 py-0.5 text-xs font-bold text-white hover:bg-zinc-800 rounded-lg transition-colors min-w-[45px] text-center cursor-pointer"
            title="Restablecer Zoom"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg transition-colors cursor-pointer"
            title="Acercar"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Draggable Canvas */}
      <div
        ref={mapContainerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        className={`w-full h-[620px] bg-zinc-900/30 rounded-xl overflow-hidden relative flex items-center justify-center select-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        <div
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          }}
          className="shrink-0"
        >
          <div className="bg-zinc-900/70 border border-white/10 rounded-[2.5rem] p-6 sm:p-10 flex flex-col items-center justify-center relative min-w-[720px] backdrop-blur-sm shadow-2xl">
            {/* Top Zone: Norte */}
            {zoneNorte && (
              <div className="flex flex-col items-center mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
                  Zona Norte (Filas A - B)
                </span>
                {renderZone(zoneNorte, 'top')}
              </div>
            )}

            {/* Middle Row: Oeste + Ring + Este */}
            <div className="flex items-center justify-center w-full">
              {/* Left Zone: Oeste & General */}
              <div className="flex-1 flex flex-col items-end pr-4 relative">
                <div className="absolute left-[-15px] top-1/2 -translate-y-1/2 -rotate-90 text-zinc-600 font-black text-2xl tracking-widest opacity-30 pointer-events-none">
                  GENERAL
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1 pr-1">
                  Zona Oeste
                </span>
                {renderZone(zoneOeste, 'left')}
              </div>

              {/* Center SCW Ring */}
              <div className="relative w-44 h-44 sm:w-56 sm:h-56 bg-[#d4d4d8] border-[6px] border-zinc-950 rounded flex items-center justify-center shadow-2xl z-10 shrink-0 mx-6 sm:mx-10">
                {/* Ropes */}
                <div className="absolute inset-1 border-[1.5px] border-red-600/80 rounded-sm pointer-events-none" />
                <div className="absolute inset-2 border-[1.5px] border-zinc-100 rounded-sm pointer-events-none" />
                <div className="absolute inset-3 border-[1.5px] border-red-600/80 rounded-sm pointer-events-none" />
                
                {/* Turnbuckles (Padded Corners) */}
                <div className="absolute -top-2 -left-2 w-4 h-4 bg-red-600 rounded-full border border-black shadow pointer-events-none" />
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-600 rounded-full border border-black shadow pointer-events-none" />
                <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-blue-600 rounded-full border border-black shadow pointer-events-none" />
                <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-red-600 rounded-full border border-black shadow pointer-events-none" />

                {/* SCW Center Canvas Logo */}
                <div className="relative flex items-center justify-center w-20 h-20 border-2 border-zinc-400/40 rounded-full bg-black/10 pointer-events-none">
                  <img
                    src="/images/logo-scw.png"
                    alt="SCW Logo"
                    className="w-14 h-14 object-contain opacity-90 select-none"
                  />
                </div>
              </div>

              {/* Right Zone: Este & Escenario */}
              <div className="flex-1 flex flex-col items-start pl-4 relative">
                <div className="absolute right-[-25px] top-1/2 -translate-y-1/2 rotate-90 text-zinc-600 font-black text-2xl tracking-widest opacity-30 pointer-events-none">
                  ESCENARIO
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1 pl-1">
                  Zona Este
                </span>
                {renderZone(zoneEste, 'right')}
              </div>
            </div>

            {/* Bottom Zone: Sur */}
            {zoneSur && (
              <div className="flex flex-col items-center mt-3">
                {renderZone(zoneSur, 'bottom')}
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mt-1">
                  Zona Sur (Filas A - B)
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
