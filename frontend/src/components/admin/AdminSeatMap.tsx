"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Minus, Plus as PlusIcon } from 'lucide-react';

interface AdminSeatMapProps {
  zones: any[];
  selectedSeatIds: number[];
  onToggleSeat: (seatId: number) => void;
}

export default function AdminSeatMap({ zones, selectedSeatIds, onToggleSeat }: AdminSeatMapProps) {
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(0.6);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const initialPinchDist = useRef<number | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const innerContainerRef = useRef<HTMLDivElement>(null);

  const parsedZones = useMemo(() => {
    return zones.map(zone => {
      const groupedSeats: Record<string, any[]> = {};
      zone.seats?.forEach((seat: any) => {
        if (!groupedSeats[seat.row_name]) groupedSeats[seat.row_name] = [];
        groupedSeats[seat.row_name].push(seat);
      });
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

  const PAN_LIMIT = 200;

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

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
      setScale(s => Math.min(Math.max(s * ratio, minScale), 3));
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

  const onTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) setIsDragging(false);
    if (e.touches.length < 2) initialPinchDist.current = null;
  };

  useEffect(() => {
    if (parsedZones.length > 0) {
      setTimeout(() => {
        if (!mapContainerRef.current || !innerContainerRef.current) return;
        const containerWidth = mapContainerRef.current.clientWidth;
        const innerWidth = innerContainerRef.current.clientWidth;
        const calculatedMinScale = containerWidth < innerWidth ? (containerWidth / innerWidth) * 0.88 : 1;
        setMinScale(calculatedMinScale);
        setScale(calculatedMinScale);
        setPosition({ x: 0, y: 0 });
      }, 50);
    }
  }, [parsedZones]);

  const getDisplayNumber = (zoneType: string, seatNumber: number) => {
    if (zoneType === 'NORTE') return seatNumber;
    if (zoneType === 'ESTE') return seatNumber + 17;
    if (zoneType === 'SUR') return seatNumber + 27;
    if (zoneType === 'OESTE') return seatNumber + 44;
    return seatNumber;
  };

  const renderZone = (zone: any, position: 'top' | 'bottom' | 'left' | 'right' = 'top') => {
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
                  const isSelected = selectedSeatIds.includes(seat.id);
                  const displayNumber = getDisplayNumber(zone.zone_type, seat.seat_number);
                  const isAvailable = seat.is_available && !seat.is_locked;
                  return (
                    <div key={seat.id} className="contents">
                      <button
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => onToggleSeat(seat.id)}
                        className={`w-5 h-5 md:w-6 md:h-6 rounded-sm flex items-center justify-center text-[9px] md:text-[10px] font-bold transition-all shadow-sm 
                        ${!isAvailable ? 'bg-zinc-900 text-zinc-600 border border-zinc-800 opacity-50 cursor-not-allowed' 
                          : isSelected ? 'bg-red-600/90 text-white border border-red-500 scale-110 z-10 shadow-[0_0_10px_rgba(239,68,68,0.6)]' 
                          : 'bg-zinc-800 text-zinc-300 border border-zinc-600 hover:bg-zinc-700 hover:scale-110 z-10 hover:shadow-md'}`}
                        title={!isAvailable ? 'Ocupado' : `Fila ${rowName} - Asiento ${displayNumber}`}
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

  return (
    <div className="w-full relative select-none">
      <div className="flex items-center justify-between gap-4 mb-2">
        <span className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Mapa de Asientos</span>
        {parsedZones.length > 0 && (
          <div className="flex items-center gap-1 bg-zinc-900 border border-white/10 rounded-lg p-1 z-10">
            <button type="button" onClick={handleZoomOut} className="p-1 hover:bg-zinc-800 rounded text-white transition-colors" title="Alejar">
              <Minus className="w-4 h-4" />
            </button>
            <button type="button" onClick={handleResetZoom} className="px-2 py-0.5 hover:bg-zinc-800 rounded text-xs font-bold text-white transition-colors" title="Restablecer">
              {Math.round(scale * 100)}%
            </button>
            <button type="button" onClick={handleZoomIn} className="p-1 hover:bg-zinc-800 rounded text-white transition-colors" title="Acercar">
              <PlusIcon className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div
        className={`bg-zinc-950 border border-white/10 rounded-xl h-[350px] shadow-inner relative overflow-hidden flex items-center justify-center w-full touch-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
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
          <div className="text-zinc-500 text-xs">No hay zonas configuradas.</div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div
              ref={innerContainerRef}
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                transition: isDragging ? 'none' : 'transform 0.1s ease-out'
              }}
            >
              <div className="bg-zinc-900/60 shadow-xl rounded-2xl p-4 flex flex-col items-center justify-center border border-white/10 relative w-max backdrop-blur-md">
                {parsedZones.find(z => z.zone_type === 'NORTE') && (
                  <div className="flex justify-center mb-6">
                    {renderZone(parsedZones.find(z => z.zone_type === 'NORTE'), 'top')}
                  </div>
                )}
                <div className="flex items-center justify-center w-full">
                  <div className="flex-1 flex justify-end pr-6 relative">
                    {renderZone(parsedZones.find(z => z.zone_type === 'OESTE'), 'left')}
                  </div>
                  <div className="relative w-32 h-32 md:w-40 md:h-40 bg-[#d4d4d8] border-4 border-zinc-950 rounded flex items-center justify-center shadow-lg z-10 mx-6">
                    <div className="absolute inset-1 border border-red-600/80 rounded-sm"></div>
                    <div className="absolute inset-2 border border-zinc-100 rounded-sm"></div>
                    <div className="absolute inset-3 border border-red-600/80 rounded-sm"></div>
                    <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-red-600 rounded-full border border-black z-20"></div>
                    <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-blue-600 rounded-full border border-black z-20"></div>
                    <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-blue-600 rounded-full border border-black z-20"></div>
                    <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-red-600 rounded-full border border-black z-20"></div>
                    <div className="relative flex items-center justify-center w-12 h-12 border-2 border-zinc-400/50 rounded-full p-1 bg-black/10">
                      <img src="/images/logo-scw.png" alt="SCW Logo" className="w-8 h-8 object-contain drop-shadow-md select-none pointer-events-none opacity-90" />
                    </div>
                  </div>
                  <div className="flex-1 flex justify-start pl-6 relative">
                    {renderZone(parsedZones.find(z => z.zone_type === 'ESTE'), 'right')}
                  </div>
                </div>
                {parsedZones.find(z => z.zone_type === 'SUR') && (
                  <div className="flex justify-center mt-6">
                    {renderZone(parsedZones.find(z => z.zone_type === 'SUR'), 'bottom')}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
