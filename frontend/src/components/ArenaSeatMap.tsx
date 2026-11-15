"use client";

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Minus, Plus as PlusIcon, Info, RotateCcw } from 'lucide-react';

export interface SeatItem {
  id: number;
  row_name: string;
  seat_number: number;
  is_available: boolean;
  is_locked?: boolean;
  x?: number | null;
  y?: number | null;
  table_number?: number | null;
  table_seat_number?: number | null;
  custom_label?: string;
  display_number?: string | number;
  zone?: any;
}

interface ArenaSeatMapProps {
  zones: any[];
  selectedSeatIds?: number[];
  selectedGeneralCount?: number;
  onToggleSeat?: (seat: SeatItem, zone: any) => void;
  onSelectGeneral?: (zone: any) => void;
  isInteractiveEditing?: boolean;
  onSeatMove?: (seatId: number, newX: number, newY: number) => void;
  onTableMove?: (tableNumber: number, zoneType: string, newCenterX: number, newCenterY: number) => void;
  onSeatClickInEditor?: (seat: SeatItem, zone: any) => void;
  selectedSeatInEditor?: SeatItem | null;
  selectedSeatIdsInEditor?: number[];
  selectedTableInEditor?: { tableNumber: number; zoneType: string } | null;
  gridSnap?: number; // 0, 5, 10, 20
  mapConfig?: any;
  /** Vista pública simplificada: sin leyenda de precios dentro del mapa y con leyenda de estados */
  compact?: boolean;
  /** Resalta una zona y atenúa las demás (solo vista pública) */
  focusZoneType?: string | null;
}

export default function ArenaSeatMap({
  zones,
  selectedSeatIds = [],
  selectedGeneralCount = 0,
  onToggleSeat,
  onSelectGeneral,
  isInteractiveEditing = false,
  onSeatMove,
  onTableMove,
  onSeatClickInEditor,
  selectedSeatInEditor,
  selectedSeatIdsInEditor = [],
  selectedTableInEditor,
  gridSnap = 0,
  mapConfig = {},
  compact = false,
  focusZoneType = null,
}: ArenaSeatMapProps) {
  const MAP_H = compact ? 890 : 980;
  const soldClass = compact ? 'opacity-60 cursor-not-allowed' : 'opacity-40 cursor-pointer';
  const dimClass = (zoneType?: string, keep?: boolean) =>
    compact && focusZoneType && zoneType !== focusZoneType && !keep ? ' opacity-25' : '';
  // Zoom & Pan state
  const [scale, setScale] = useState(1);
  const [fitScale, setFitScale] = useState(1);
  const [minScale, setMinScale] = useState(0.2);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const hasDraggedRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const touchStartPos = useRef({ x: 0, y: 0 });
  const initialPinchDist = useRef<number | null>(null);
  const pinchStartScale = useRef<number>(1);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Tooltip
  const [hoveredSeat, setHoveredSeat] = useState<{ seat: SeatItem; zone: any; x: number; y: number } | null>(null);

  // Group zones
  const zoneRingside = useMemo(() => zones.find(z => z.zone_type === 'MESAS_VIP_RINGSIDE'), [zones]);
  const zoneVip = useMemo(() => zones.find(z => z.zone_type === 'MESAS_VIP'), [zones]);
  const zoneF1 = useMemo(() => zones.find(z => z.zone_type === 'PRIMERA_FILA'), [zones]);
  const zoneF2 = useMemo(() => zones.find(z => z.zone_type === 'SEGUNDA_FILA'), [zones]);
  const zoneGeneral = useMemo(() => zones.find(z => z.zone_type === 'GENERAL'), [zones]);

  // All seats flattened with zone attached
  const allSeatsWithZone = useMemo(() => {
    const list: { seat: SeatItem; zone: any }[] = [];
    zones.forEach(z => {
      z.seats?.forEach((s: SeatItem) => {
        list.push({ seat: s, zone: z });
      });
    });
    return list;
  }, [zones]);

  // Group tables for Ringside and VIP
  const ringsideTables = useMemo(() => {
    const tables: Record<number, SeatItem[]> = {};
    zoneRingside?.seats?.forEach((s: SeatItem) => {
      const tNum = s.table_number || s.seat_number;
      if (!tables[tNum]) tables[tNum] = [];
      tables[tNum].push(s);
    });
    return tables;
  }, [zoneRingside]);

  const vipTables = useMemo(() => {
    const tables: Record<number, SeatItem[]> = {};
    zoneVip?.seats?.forEach((s: SeatItem) => {
      const tNum = s.table_number || s.seat_number;
      if (!tables[tNum]) tables[tNum] = [];
      tables[tNum].push(s);
    });
    return tables;
  }, [zoneVip]);

  // Auto-fit initial scale to viewport / container dimensions
  const updateFitScale = () => {
    if (!mapContainerRef.current) return;
    const cw = mapContainerRef.current.clientWidth;
    const ch = mapContainerRef.current.clientHeight;
    if (cw <= 0 || ch <= 0) return;

    // Margin factor so the map doesn't touch the container edges:
    const margin = compact ? 0.98 : cw < 640 ? 0.94 : 0.90;
    const scaleX = (cw / 1200) * margin;
    const scaleY = (ch / MAP_H) * margin;
    const calculatedFit = Math.min(scaleX, scaleY);

    setFitScale(calculatedFit);
    setMinScale(Math.max(calculatedFit * 0.75, 0.15));
    setScale(calculatedFit);
    setPosition({ x: 0, y: 0 });
  };

  useEffect(() => {
    const timer = setTimeout(updateFitScale, 60);
    window.addEventListener('resize', updateFitScale);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateFitScale);
    };
  }, [zones]);

  // Prevent native browser pinch-zoom inside the map container
  useEffect(() => {
    const el = mapContainerRef.current;
    if (!el) return;
    const preventZoom = (e: TouchEvent) => {
      if (e.touches.length >= 2) e.preventDefault();
    };
    el.addEventListener('touchmove', preventZoom, { passive: false });
    return () => el.removeEventListener('touchmove', preventZoom);
  }, []);

  // Zoom controls
  // En celular, al elegir una zona el mapa se acerca a ella
  useEffect(() => {
    if (!compact || !mapContainerRef.current) return;
    const cw = mapContainerRef.current.clientWidth;
    const ch = mapContainerRef.current.clientHeight;
    if (cw <= 0 || cw >= 768) return;
    if (!focusZoneType) {
      setScale(fitScale);
      setPosition({ x: 0, y: 0 });
      return;
    }
    const zone = zones.find(z => z.zone_type === focusZoneType);
    const pts = ((zone?.seats || []) as SeatItem[]).filter(p => p.x != null && p.y != null);
    if (pts.length === 0) return;
    const xs = pts.map(p => p.x as number);
    const ys = pts.map(p => p.y as number);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const target = Math.min(3, Math.max(fitScale, Math.min(cw / (maxX - minX + 120), ch / (maxY - minY + 120))));
    setScale(target);
    setPosition({ x: (600 - (minX + maxX) / 2) * target, y: (MAP_H / 2 - (minY + maxY) / 2) * target });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusZoneType]);

  const handleZoomIn = () => setScale(s => Math.min(s + 0.15, 3));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.15, minScale));
  const handleResetZoom = () => {
    setScale(fitScale);
    setPosition({ x: 0, y: 0 });
  };

  // Convert SVG coordinates from mouse event
  const getSvgCoordinates = (e: React.MouseEvent | React.PointerEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPoint = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    return { x: svgPoint.x, y: svgPoint.y };
  };

  // Snapping helper
  const snap = (val: number) => {
    if (!gridSnap || gridSnap <= 0) return val;
    return Math.round(val / gridSnap) * gridSnap;
  };

  // Mouse Pan Handlers
  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    hasDraggedRef.current = false;
    touchStartPos.current = { x: e.clientX, y: e.clientY };
    setIsPanning(true);
    panStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleCanvasPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || !isPanning) return;
    const dx = e.clientX - touchStartPos.current.x;
    const dy = e.clientY - touchStartPos.current.y;
    if (Math.hypot(dx, dy) > 5) {
      hasDraggedRef.current = true;
    }
    setPosition({
      x: e.clientX - panStartRef.current.x,
      y: e.clientY - panStartRef.current.y,
    });
  };

  const handleCanvasPointerUp = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    setIsPanning(false);
    setTimeout(() => {
      hasDraggedRef.current = false;
    }, 60);
  };

  // Touch Handlers for Mobile (1-finger pan, 2-finger pinch-to-zoom)
  const handleTouchStart = (e: React.TouchEvent) => {
    hasDraggedRef.current = false;
    if (e.touches.length === 1) {
      setIsPanning(true);
      touchStartPos.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
      panStartRef.current = {
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      };
    } else if (e.touches.length === 2) {
      setIsPanning(true);
      hasDraggedRef.current = true;
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      initialPinchDist.current = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      pinchStartScale.current = scale;
      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;
      panStartRef.current = {
        x: midX - position.x,
        y: midY - position.y,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const dx = e.touches[0].clientX - touchStartPos.current.x;
      const dy = e.touches[0].clientY - touchStartPos.current.y;
      if (Math.hypot(dx, dy) > 6) {
        hasDraggedRef.current = true;
      }
      setPosition({
        x: e.touches[0].clientX - panStartRef.current.x,
        y: e.touches[0].clientY - panStartRef.current.y,
      });
    } else if (e.touches.length === 2 && initialPinchDist.current !== null) {
      hasDraggedRef.current = true;
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const factor = dist / initialPinchDist.current;
      const newScale = Math.min(Math.max(pinchStartScale.current * factor, minScale), 3);
      setScale(newScale);

      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;
      setPosition({
        x: midX - panStartRef.current.x,
        y: midY - panStartRef.current.y,
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      setIsPanning(false);
      initialPinchDist.current = null;
      setTimeout(() => {
        hasDraggedRef.current = false;
      }, 60);
    } else if (e.touches.length === 1) {
      initialPinchDist.current = null;
      touchStartPos.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
      panStartRef.current = {
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      };
    }
  };

  // Seat interaction in Editor vs Public
  const handleSeatClick = (seat: SeatItem, zone: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasDraggedRef.current) return;
    if (onSeatClickInEditor) {
      onSeatClickInEditor(seat, zone);
    } else if (onToggleSeat && (seat.is_available && !seat.is_locked)) {
      onToggleSeat(seat, zone);
    }
  };

  // General zone click
  const handleGeneralClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasDraggedRef.current) return;
    if (onSelectGeneral && zoneGeneral) {
      onSelectGeneral(zoneGeneral);
    }
  };

  return (
    <div className="w-full relative select-none flex flex-col items-center">
      {/* Zoom / Controls Header (Clean, without pulsating dot or redundant titles) */}
      <div className="w-full flex items-center justify-between mb-3 px-1">
        <span className={compact ? 'text-xs sm:text-sm text-zinc-400' : 'text-xs font-bold text-zinc-400 hidden sm:inline'}>
          {compact ? 'Toca un asiento para elegirlo' : 'Haz clic o toca un asiento para seleccionarlo'}
        </span>

        {/* Zoom controls */}
        <div className={`flex items-center gap-1 bg-zinc-900 border border-white/10 p-1 z-20 ml-auto ${compact ? '' : 'rounded-xl shadow-lg'}`}>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 hover:bg-zinc-800 rounded-lg text-white transition-colors"
            title="Alejar mapa"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            className="px-2.5 py-1 hover:bg-zinc-800 rounded-lg text-xs font-bold text-white transition-colors min-w-[55px]"
            title="Restablecer vista completa"
          >
            {Math.round((scale / (fitScale || 1)) * 100)}%
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 hover:bg-zinc-800 rounded-lg text-white transition-colors"
            title="Acercar mapa"
          >
            <PlusIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Interactive Map Viewer Container */}
      <div
        ref={mapContainerRef}
        className={`w-full bg-[#0a0a0c] border border-white/10 ${compact ? 'h-[58vh] min-h-[360px] lg:h-[calc(100vh-300px)] lg:min-h-[520px]' : 'rounded-3xl h-[460px] sm:h-[540px] md:h-[620px] shadow-2xl'} relative overflow-hidden flex items-center justify-center touch-none ${
          isPanning ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onPointerLeave={handleCanvasPointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <div
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            transition: isPanning ? 'none' : 'transform 0.15s ease-out',
          }}
          className="w-full h-full flex items-center justify-center"
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 1200 ${MAP_H}`}
            className="w-[1200px] drop-shadow-2xl overflow-visible select-none"
            style={{ maxWidth: 'none', maxHeight: 'none', height: MAP_H }}
          >
            <defs>
              {/* Floor ambient lighting */}
              <radialGradient id="ringSpotlight" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.08" />
                <stop offset="60%" stopColor="#1e1e24" stopOpacity="0.03" />
                <stop offset="100%" stopColor="#09090b" stopOpacity="0" />
              </radialGradient>

              {/* Gold Mesas Gradient */}
              <linearGradient id="goldTableGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="50%" stopColor="#eab308" />
                <stop offset="100%" stopColor="#ca8a04" />
              </linearGradient>

              {/* Pink Ringside Gradient */}
              <linearGradient id="pinkTableGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f472b6" />
                <stop offset="50%" stopColor="#ec4899" />
                <stop offset="100%" stopColor="#be185d" />
              </linearGradient>

              {/* Red Seat Glow */}
              <filter id="redSeatGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#ef4444" floodOpacity="0.5" />
              </filter>

              {/* Blue Seat Glow */}
              <filter id="blueSeatGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#3b82f6" floodOpacity="0.5" />
              </filter>

              {/* Selected Glow */}
              <filter id="selectedGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000000" floodOpacity="0.4" />
              </filter>
            </defs>

            {/* Arena Flooring Background */}
            <rect x="0" y="0" width="1200" height={MAP_H} fill="#0d0e12" rx="16" />
            <rect x="15" y="15" width="1170" height={MAP_H - 30} fill="none" stroke="#27272a" strokeWidth="2" strokeDasharray="6 6" rx="12" />

            {/* Spotlight on ring area */}
            <circle cx="520" cy="480" r="420" fill="url(#ringSpotlight)" />

            {/* === GENERAL ZONES (Dark Green Background Areas) === */}
            {/* Top-Left General */}
            <g
              onClick={handleGeneralClick}
              className={onSelectGeneral ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}
            >
              <rect
                x="260"
                y="40"
                width="310"
                height="135"
                rx="8"
                fill={selectedGeneralCount > 0 ? '#18473a' : '#132a24'}
                stroke="#10b981"
                strokeWidth={selectedGeneralCount > 0 ? 3 : 1.5}
                strokeOpacity={selectedGeneralCount > 0 ? 0.95 : 0.4}
                filter={selectedGeneralCount > 0 ? 'url(#selectedGlow)' : ''}
              />
              <text
                x="415"
                y="115"
                textAnchor="middle"
                fill={selectedGeneralCount > 0 ? '#ffffff' : '#34d399'}
                fontSize="22"
                fontWeight="900"
                letterSpacing="6"
                opacity={selectedGeneralCount > 0 ? 0.95 : 0.4}
              >
                GENERAL {selectedGeneralCount > 0 ? `(${selectedGeneralCount})` : ''}
              </text>
            </g>

            {/* Right Side General */}
            <g
              onClick={handleGeneralClick}
              className={onSelectGeneral ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}
            >
              <rect
                x="835"
                y="195"
                width="335"
                height="590"
                rx="8"
                fill={selectedGeneralCount > 0 ? '#18473a' : '#132a24'}
                stroke="#10b981"
                strokeWidth={selectedGeneralCount > 0 ? 3 : 1.5}
                strokeOpacity={selectedGeneralCount > 0 ? 0.95 : 0.4}
                filter={selectedGeneralCount > 0 ? 'url(#selectedGlow)' : ''}
              />
              <text
                x="1002"
                y="495"
                textAnchor="middle"
                fill={selectedGeneralCount > 0 ? '#ffffff' : '#34d399'}
                fontSize="34"
                fontWeight="900"
                letterSpacing="10"
                opacity={selectedGeneralCount > 0 ? 0.95 : 0.4}
              >
                GENERAL {selectedGeneralCount > 0 ? `(${selectedGeneralCount})` : ''}
              </text>
            </g>

            {/* Bottom General */}
            <g
              onClick={handleGeneralClick}
              className={onSelectGeneral ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}
            >
              <rect
                x="260"
                y="785"
                width="555"
                height="95"
                rx="8"
                fill={selectedGeneralCount > 0 ? '#18473a' : '#132a24'}
                stroke="#10b981"
                strokeWidth={selectedGeneralCount > 0 ? 3 : 1.5}
                strokeOpacity={selectedGeneralCount > 0 ? 0.95 : 0.4}
                filter={selectedGeneralCount > 0 ? 'url(#selectedGlow)' : ''}
              />
              <text
                x="537"
                y="842"
                textAnchor="middle"
                fill={selectedGeneralCount > 0 ? '#ffffff' : '#34d399'}
                fontSize="26"
                fontWeight="900"
                letterSpacing="8"
                opacity={selectedGeneralCount > 0 ? 0.95 : 0.4}
              >
                GENERAL {selectedGeneralCount > 0 ? `(${selectedGeneralCount})` : ''}
              </text>
            </g>

            {/* === TOP VIP TABLES CONTAINER ("MESAS VIP") === */}
            <g>
              <rect x="590" y="25" width="465" height="155" rx="10" fill="#17140b" stroke="#eab308" strokeWidth="2.5" />
              {/* Header Box Label */}
              <rect x="760" y="16" width="130" height="20" rx="4" fill="#0d0e12" />
              <text x="825" y="30" textAnchor="middle" fill="#facc15" fontSize="13" fontWeight="900" letterSpacing="3">
                MESAS VIP
              </text>

              {/* Render the 12 Mesas VIP */}
              {Object.keys(vipTables).map(tableNumStr => {
                const tNum = parseInt(tableNumStr);
                const seatsInTable = vipTables[tNum];
                if (!seatsInTable || seatsInTable.length === 0) return null;

                // Position calculation (or custom stored coords)
                const firstSeat = seatsInTable[0];
                const cx = firstSeat.x ?? (635 + ((tNum - 1) % 6) * 70);
                const cy = firstSeat.y ?? (tNum <= 6 ? 70 : 138);

                const isTableSelected = selectedTableInEditor?.tableNumber === tNum && selectedTableInEditor?.zoneType === 'MESAS_VIP';
                const hasSelectedSeat = seatsInTable.some(s => selectedSeatIds.includes(s.id) || selectedSeatIdsInEditor.includes(s.id));
                const allAvailable = seatsInTable.every(s => s.is_available && !s.is_locked);

                return (
                  <g
                    key={`vip-table-${tNum}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (hasDraggedRef.current) return;
                      if (onSeatClickInEditor) {
                        onSeatClickInEditor(firstSeat, zoneVip);
                      } else {
                        seatsInTable.forEach(s => handleSeatClick(s, zoneVip, e));
                      }
                    }}
                    className={`cursor-pointer group transition-opacity ${!allAvailable ? (compact ? 'opacity-60' : 'opacity-40') : ''}${dimClass('MESAS_VIP', hasSelectedSeat)}`}
                  >
                    {/* Chairs around table */}
                    {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
                      const rad = (angle * Math.PI) / 180;
                      const chairX = cx + Math.cos(rad) * 26;
                      const chairY = cy + Math.sin(rad) * 26;
                      return (
                        <circle
                          key={`chair-${tNum}-${i}`}
                          cx={chairX}
                          cy={chairY}
                          r="4"
                          fill={!allAvailable ? '#27272a' : '#ca8a04'}
                          stroke={!allAvailable ? '#3f3f46' : '#713f12'}
                          strokeWidth="1"
                        />
                      );
                    })}

                    {/* Table Surface */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r="20"
                      fill={!allAvailable ? '#18181b' : 'url(#goldTableGrad)'}
                      stroke={hasSelectedSeat || isTableSelected ? '#ffffff' : !allAvailable ? '#3f3f46' : '#713f12'}
                      strokeWidth={hasSelectedSeat || isTableSelected ? 3 : 2}
                      className="transition-all duration-200"
                      filter={hasSelectedSeat ? 'url(#selectedGlow)' : ''}
                    />

                    {/* Table Number */}
                    <text
                      x={cx}
                      y={cy + 5}
                      textAnchor="middle"
                      fill={!allAvailable ? '#71717a' : '#1c1917'}
                      fontSize="14"
                      fontWeight="900"
                    >
                      {tNum}
                    </text>
                  </g>
                );
              })}
            </g>

            {/* === LEFT VIP RINGSIDE STRIP ("MESAS VIP RINGSIDE") === */}
            <g>
              <rect x="115" y="170" width="125" height="710" rx="12" fill="#20052b" stroke="#db2777" strokeWidth="2.5" />
              {/* Header Box Label */}
              <text
                x="177"
                y="200"
                textAnchor="middle"
                fill="#f472b6"
                fontSize="11"
                fontWeight="900"
                letterSpacing="2"
              >
                MESAS VIP
              </text>
              <text
                x="177"
                y="215"
                textAnchor="middle"
                fill="#f472b6"
                fontSize="11"
                fontWeight="900"
                letterSpacing="2"
              >
                RINGSIDE
              </text>

              {/* Render the 8 Mesas Ringside */}
              {Object.keys(ringsideTables).map(tableNumStr => {
                const tNum = parseInt(tableNumStr);
                const seatsInTable = ringsideTables[tNum];
                if (!seatsInTable || seatsInTable.length === 0) return null;

                const firstSeat = seatsInTable[0];
                const cx = firstSeat.x ?? 177;
                const cy = firstSeat.y ?? (210 + tNum * 62);

                const isTableSelected = selectedTableInEditor?.tableNumber === tNum && selectedTableInEditor?.zoneType === 'MESAS_VIP_RINGSIDE';
                const hasSelectedSeat = seatsInTable.some(s => selectedSeatIds.includes(s.id) || selectedSeatIdsInEditor.includes(s.id));
                const allAvailable = seatsInTable.every(s => s.is_available && !s.is_locked);

                return (
                  <g
                    key={`ringside-table-${tNum}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (hasDraggedRef.current) return;
                      if (onSeatClickInEditor) {
                        onSeatClickInEditor(firstSeat, zoneRingside);
                      } else {
                        seatsInTable.forEach(s => handleSeatClick(s, zoneRingside, e));
                      }
                    }}
                    className={`cursor-pointer group transition-opacity ${!allAvailable ? (compact ? 'opacity-60' : 'opacity-40') : ''}${dimClass('MESAS_VIP_RINGSIDE', hasSelectedSeat)}`}
                  >
                    {/* Chairs */}
                    {[0, 60, 120, 180, 240, 300].map((angle, i) => {
                      const rad = (angle * Math.PI) / 180;
                      const chairX = cx + Math.cos(rad) * 26;
                      const chairY = cy + Math.sin(rad) * 26;
                      return (
                        <circle
                          key={`chair-rs-${tNum}-${i}`}
                          cx={chairX}
                          cy={chairY}
                          r="4"
                          fill={!allAvailable ? '#27272a' : '#be185d'}
                          stroke={!allAvailable ? '#3f3f46' : '#500724'}
                          strokeWidth="1"
                        />
                      );
                    })}

                    {/* Table Surface */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r="20"
                      fill={!allAvailable ? '#18181b' : 'url(#pinkTableGrad)'}
                      stroke={hasSelectedSeat || isTableSelected ? '#ffffff' : !allAvailable ? '#3f3f46' : '#831843'}
                      strokeWidth={hasSelectedSeat || isTableSelected ? 3 : 2}
                      className="transition-all duration-200"
                      filter={hasSelectedSeat ? 'url(#selectedGlow)' : ''}
                    />

                    {/* Table Number */}
                    <text
                      x={cx}
                      y={cy + 5}
                      textAnchor="middle"
                      fill={!allAvailable ? '#71717a' : '#ffffff'}
                      fontSize="14"
                      fontWeight="900"
                    >
                      {tNum}
                    </text>
                  </g>
                );
              })}

              {/* Entrance Arrow at the bottom of the Ringside Strip */}
              <g transform="translate(177, 810)">
                <path d="M 0 -22 L -12 -2 L -4 -2 L -4 18 L 4 18 L 4 -2 L 12 -2 Z" fill="#ffffff" />
                <text x="0" y="38" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="900" letterSpacing="3">
                  ENTRADA
                </text>
              </g>
            </g>

            {/* === CENTRAL RING === */}
            <g transform="translate(340, 290)">
              {/* Outer Ring Border & Canvas */}
              <rect x="0" y="0" width="360" height="360" rx="8" fill="#18181b" stroke="#09090b" strokeWidth="8" />

              {/* Ropes (3 Concentric Ropes) */}
              <rect x="18" y="18" width="324" height="324" fill="none" stroke="#ef4444" strokeWidth="2.5" opacity="0.8" rx="4" />
              <rect x="28" y="28" width="304" height="304" fill="none" stroke="#e4e4e7" strokeWidth="2.5" opacity="0.8" rx="4" />
              <rect x="38" y="38" width="284" height="284" fill="none" stroke="#ef4444" strokeWidth="2.5" opacity="0.8" rx="4" />

              {/* Corner Turnbuckles */}
              {/* Top-Left: Red */}
              <circle cx="10" cy="10" r="10" fill="#dc2626" stroke="#000000" strokeWidth="3" />
              <rect x="14" y="14" width="16" height="16" fill="#18181b" transform="rotate(45, 22, 22)" />

              {/* Top-Right: Blue */}
              <circle cx="350" cy="10" r="10" fill="#2563eb" stroke="#000000" strokeWidth="3" />
              <rect x="330" y="14" width="16" height="16" fill="#18181b" transform="rotate(-45, 338, 22)" />

              {/* Bottom-Left: Blue */}
              <circle cx="10" cy="350" r="10" fill="#2563eb" stroke="#000000" strokeWidth="3" />
              <rect x="14" y="330" width="16" height="16" fill="#18181b" transform="rotate(-45, 22, 338)" />

              {/* Bottom-Right: Red */}
              <circle cx="350" cy="350" r="10" fill="#dc2626" stroke="#000000" strokeWidth="3" />
              <rect x="330" y="330" width="16" height="16" fill="#18181b" transform="rotate(45, 338, 338)" />

              {/* Center Ring SCW Emblem */}
              <circle cx="180" cy="180" r="48" fill="#000000" fillOpacity="0.4" stroke="#52525b" strokeWidth="3" />
              <image href="/images/logo-scw.png" x="144" y="144" width="72" height="72" opacity="0.85" />
            </g>

            {/* === PASILLO (Aisle in Top Seats) === */}
            <g transform="translate(488, 192)">
              <rect x="0" y="0" width="64" height="76" fill="#18181b" rx="4" stroke="#27272a" strokeWidth="1" />
              <text x="32" y="44" textAnchor="middle" fill="#71717a" fontSize="10" fontWeight="900" letterSpacing="1.5">
                PASILLO
              </text>
            </g>

            {/* === PRIMERA FILA (RED SEATS 1-44) === */}
            {zoneF1?.seats?.map((seat: SeatItem) => {
              const sx = seat.x ?? 0;
              const sy = seat.y ?? 0;
              const isSelected = selectedSeatIds.includes(seat.id);
              const isEditingCurrent = selectedSeatInEditor?.id === seat.id || selectedSeatIdsInEditor.includes(seat.id);
              const isAvailable = seat.is_available && !seat.is_locked;
              const label = seat.custom_label || seat.display_number || seat.seat_number;

              return (
                <g
                  key={`f1-${seat.id}`}
                  transform={`translate(${sx}, ${sy})`}
                  onClick={(e) => handleSeatClick(seat, zoneF1, e)}
                  onMouseEnter={(e) => setHoveredSeat({ seat, zone: zoneF1, x: sx, y: sy })}
                  onMouseLeave={() => setHoveredSeat(null)}
                  className={`cursor-pointer group transition-opacity ${!isAvailable ? soldClass : ''}${dimClass('PRIMERA_FILA', isSelected)}`}
                >
                  <rect
                    x="-12"
                    y="-12"
                    width="24"
                    height="24"
                    rx="4"
                    fill={!isAvailable ? '#18181b' : isSelected ? '#ffffff' : '#dc2626'}
                    stroke={isEditingCurrent || isSelected ? '#ffffff' : !isAvailable ? '#3f3f46' : '#991b1b'}
                    strokeWidth={isEditingCurrent || isSelected ? 2.5 : 1.5}
                    className="transition-colors group-hover:stroke-white group-hover:stroke-[2px]"
                    filter={isSelected ? 'url(#selectedGlow)' : isAvailable ? 'url(#redSeatGlow)' : ''}
                  />
                  <text
                    x="0"
                    y="4"
                    textAnchor="middle"
                    fill={!isAvailable ? '#71717a' : isSelected ? '#000000' : '#ffffff'}
                    fontSize="9.5"
                    fontWeight="900"
                  >
                    {label}
                  </text>
                </g>
              );
            })}

            {/* === SEGUNDA FILA (BLUE SEATS 1-44) === */}
            {zoneF2?.seats?.map((seat: SeatItem) => {
              const sx = seat.x ?? 0;
              const sy = seat.y ?? 0;
              const isSelected = selectedSeatIds.includes(seat.id);
              const isEditingCurrent = selectedSeatInEditor?.id === seat.id || selectedSeatIdsInEditor.includes(seat.id);
              const isAvailable = seat.is_available && !seat.is_locked;
              const label = seat.custom_label || seat.display_number || seat.seat_number;

              return (
                <g
                  key={`f2-${seat.id}`}
                  transform={`translate(${sx}, ${sy})`}
                  onClick={(e) => handleSeatClick(seat, zoneF2, e)}
                  onMouseEnter={(e) => setHoveredSeat({ seat, zone: zoneF2, x: sx, y: sy })}
                  onMouseLeave={() => setHoveredSeat(null)}
                  className={`cursor-pointer group transition-opacity ${!isAvailable ? soldClass : ''}${dimClass('SEGUNDA_FILA', isSelected)}`}
                >
                  <rect
                    x="-12"
                    y="-12"
                    width="24"
                    height="24"
                    rx="4"
                    fill={!isAvailable ? '#18181b' : isSelected ? '#ffffff' : '#2563eb'}
                    stroke={isEditingCurrent || isSelected ? '#ffffff' : !isAvailable ? '#3f3f46' : '#1d4ed8'}
                    strokeWidth={isEditingCurrent || isSelected ? 2.5 : 1.5}
                    className="transition-colors group-hover:stroke-white group-hover:stroke-[2px]"
                    filter={isSelected ? 'url(#selectedGlow)' : isAvailable ? 'url(#blueSeatGlow)' : ''}
                  />
                  <text
                    x="0"
                    y="4"
                    textAnchor="middle"
                    fill={!isAvailable ? '#71717a' : isSelected ? '#000000' : '#ffffff'}
                    fontSize="9.5"
                    fontWeight="900"
                  >
                    {label}
                  </text>
                </g>
              );
            })}

            {/* === CUSTOM / OTHER SEATS (Outside standard F1/F2/VIP) === */}
            {zones
              .filter(z => !['MESAS_VIP_RINGSIDE', 'MESAS_VIP', 'PRIMERA_FILA', 'SEGUNDA_FILA', 'GENERAL'].includes(z.zone_type))
              .flatMap(z => (z.seats || []).map((s: SeatItem) => ({ seat: s, zone: z })))
              .map(({ seat, zone }) => {
                const sx = seat.x ?? 100;
                const sy = seat.y ?? 100;
                const isSelected = selectedSeatIds.includes(seat.id);
                const isEditingCurrent = selectedSeatInEditor?.id === seat.id || selectedSeatIdsInEditor.includes(seat.id);
                const isAvailable = seat.is_available && !seat.is_locked;
                const label = seat.custom_label || seat.display_number || seat.seat_number;
                const zoneColor = zone.color || '#a855f7';

                return (
                  <g
                    key={`custom-${seat.id}`}
                    transform={`translate(${sx}, ${sy})`}
                    onClick={(e) => handleSeatClick(seat, zone, e)}
                    onMouseEnter={(e) => setHoveredSeat({ seat, zone, x: sx, y: sy })}
                    onMouseLeave={() => setHoveredSeat(null)}
                    className={`cursor-pointer group transition-opacity ${!isAvailable ? soldClass : ''}${dimClass(zone.zone_type, isSelected)}`}
                  >
                    <rect
                      x="-12"
                      y="-12"
                      width="24"
                      height="24"
                      rx="4"
                      fill={!isAvailable ? '#18181b' : isSelected ? '#ffffff' : zoneColor}
                      stroke={isEditingCurrent || isSelected ? '#ffffff' : !isAvailable ? '#3f3f46' : zoneColor}
                      strokeWidth={isEditingCurrent || isSelected ? 2.5 : 1.5}
                      className="transition-colors group-hover:stroke-white group-hover:stroke-[2px]"
                      filter={isSelected ? 'url(#selectedGlow)' : ''}
                    />
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fill={!isAvailable ? '#71717a' : isSelected ? '#000000' : '#ffffff'}
                      fontSize="9.5"
                      fontWeight="900"
                    >
                      {label}
                    </text>
                  </g>
                );
              })}

            {/* === LEGEND AT BOTTOM (Matching the Image) === */}
            {!compact && (
            <g transform="translate(40, 885)">
              {/* Legend background bar */}
              <rect x="0" y="0" width="1120" height="85" rx="10" fill="#000000" stroke="#27272a" strokeWidth="2" />

              {/* 1. Pink Table: Mesas VIP Ringside */}
              <g transform="translate(40, 42)">
                <circle cx="0" cy="0" r="16" fill="url(#pinkTableGrad)" stroke="#be185d" strokeWidth="1.5" />
                <circle cx="-16" cy="0" r="3.5" fill="#f472b6" />
                <circle cx="16" cy="0" r="3.5" fill="#f472b6" />
                <circle cx="0" cy="-16" r="3.5" fill="#f472b6" />
                <circle cx="0" cy="16" r="3.5" fill="#f472b6" />
                <text x="35" y="-5" fill="#ffffff" fontSize="13" fontWeight="900" letterSpacing="1">
                  MESAS VIP RINGSIDE
                </text>
                <text x="35" y="16" fill="#f472b6" fontSize="13" fontWeight="800">
                  (1 - 8) {zoneRingside?.price ? `· $${parseFloat(zoneRingside.price).toFixed(2)} MXN` : ''}
                </text>
              </g>

              {/* 2. Gold Table: Mesas VIP */}
              <g transform="translate(290, 42)">
                <circle cx="0" cy="0" r="16" fill="url(#goldTableGrad)" stroke="#ca8a04" strokeWidth="1.5" />
                <circle cx="-16" cy="0" r="3.5" fill="#facc15" />
                <circle cx="16" cy="0" r="3.5" fill="#facc15" />
                <circle cx="0" cy="-16" r="3.5" fill="#facc15" />
                <circle cx="0" cy="16" r="3.5" fill="#facc15" />
                <text x="35" y="-5" fill="#ffffff" fontSize="13" fontWeight="900" letterSpacing="1">
                  MESAS VIP
                </text>
                <text x="35" y="16" fill="#facc15" fontSize="13" fontWeight="800">
                  (1 - 12) {zoneVip?.price ? `· $${parseFloat(zoneVip.price).toFixed(2)} MXN` : ''}
                </text>
              </g>

              {/* 3. Red Chair: Primera Fila */}
              <g transform="translate(510, 42)">
                <rect x="-12" y="-12" width="24" height="24" rx="4" fill="#dc2626" stroke="#991b1b" strokeWidth="1.5" />
                <text x="25" y="-5" fill="#ffffff" fontSize="13" fontWeight="900" letterSpacing="1">
                  PRIMERA FILA
                </text>
                <text x="25" y="16" fill="#f87171" fontSize="13" fontWeight="800">
                  (1 - 44) {zoneF1?.price ? `· $${parseFloat(zoneF1.price).toFixed(2)} MXN` : ''}
                </text>
              </g>

              {/* 4. Blue Chair: Segunda Fila */}
              <g transform="translate(730, 42)">
                <rect x="-12" y="-12" width="24" height="24" rx="4" fill="#2563eb" stroke="#1d4ed8" strokeWidth="1.5" />
                <text x="25" y="-5" fill="#ffffff" fontSize="13" fontWeight="900" letterSpacing="1">
                  SEGUNDA FILA
                </text>
                <text x="25" y="16" fill="#60a5fa" fontSize="13" fontWeight="800">
                  (1 - 44) {zoneF2?.price ? `· $${parseFloat(zoneF2.price).toFixed(2)} MXN` : ''}
                </text>
              </g>

              {/* 5. Green Box: General */}
              <g
                transform="translate(935, 42)"
                onClick={handleGeneralClick}
                className={onSelectGeneral ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
              >
                <rect
                  x="-14"
                  y="-14"
                  width="28"
                  height="28"
                  rx="4"
                  fill={selectedGeneralCount > 0 ? '#10b981' : '#132a24'}
                  stroke="#10b981"
                  strokeWidth={selectedGeneralCount > 0 ? 2.5 : 1.5}
                  filter={selectedGeneralCount > 0 ? 'url(#selectedGlow)' : ''}
                />
                <text x="25" y="-5" fill="#ffffff" fontSize="13" fontWeight="900" letterSpacing="1">
                  GENERAL {selectedGeneralCount > 0 ? `(${selectedGeneralCount} SEL.)` : ''}
                </text>
                <text x="25" y="16" fill="#34d399" fontSize="13" fontWeight="800">
                  (SIN NUMERACIÓN) {zoneGeneral?.price ? `· $${parseFloat(zoneGeneral.price).toFixed(2)} MXN` : ''}
                </text>
              </g>
            </g>
            )}
          </svg>
        </div>

        {/* Hover Tooltip */}
        {hoveredSeat && !isInteractiveEditing && (
          <div
            className="absolute bg-zinc-950/95 border border-white/20 px-3 py-2 rounded-xl text-xs shadow-2xl pointer-events-none z-30 backdrop-blur-md"
            style={{
              left: `${Math.min(window.innerWidth - 180, Math.max(20, (hoveredSeat.x * scale) + position.x + (mapContainerRef.current?.clientWidth || 0) / 2 - 600))}px`,
              top: `${Math.max(20, (hoveredSeat.y * scale) + position.y + (mapContainerRef.current?.clientHeight || 0) / 2 - 520)}px`,
            }}
          >
            <p className="font-bold text-white uppercase tracking-wider">{hoveredSeat.zone?.name || hoveredSeat.zone?.zone_type}</p>
            <p className="text-zinc-400">
              {hoveredSeat.seat.table_number ? `Mesa #${hoveredSeat.seat.table_number}` : `Fila ${hoveredSeat.seat.row_name} · Asiento ${hoveredSeat.seat.custom_label || hoveredSeat.seat.seat_number}`}
            </p>
            <p className="text-red-400 font-black mt-1">${hoveredSeat.zone?.price} MXN</p>
          </div>
        )}
      </div>

      {compact && (
        <div className="w-full flex flex-wrap items-center gap-x-5 gap-y-2 border border-t-0 border-white/10 bg-[#0a0a0c] px-4 py-3 text-xs text-zinc-300">
          <span className="flex items-center gap-2"><span className="w-3.5 h-3.5 bg-red-600" /> Disponible (color de su zona)</span>
          <span className="flex items-center gap-2"><span className="w-3.5 h-3.5 bg-zinc-900 border border-zinc-600" /> Vendido</span>
          <span className="flex items-center gap-2"><span className="w-3.5 h-3.5 bg-white ring-2 ring-red-500 ring-offset-1 ring-offset-black" /> Tu selección</span>
        </div>
      )}
    </div>
  );
}
