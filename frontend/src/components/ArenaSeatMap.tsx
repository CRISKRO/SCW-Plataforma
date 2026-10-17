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
}

export default function ArenaSeatMap({
  zones,
  selectedSeatIds = [],
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
}: ArenaSeatMapProps) {
  // Zoom & Pan state
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Dragging seat or table in editor with distance threshold (5px)
  const dragInteractionRef = useRef<{
    type: 'seat' | 'table';
    item: any;
    startClientX: number;
    startClientY: number;
    offset: { x: number; y: number };
  } | null>(null);
  const didDragOccurRef = useRef(false);
  const [isActuallyDragging, setIsActuallyDragging] = useState(false);

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

  // Zoom controls
  const handleZoomIn = () => setScale(s => Math.min(s + 0.2, 3));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.2, 0.5));
  const handleResetZoom = () => {
    setScale(1);
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

  // Canvas Pan Handlers
  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    // If clicking on an element inside SVG that is a seat or table, don't start pan
    if ((e.target as HTMLElement).closest('[data-draggable="true"]')) return;
    if ((e.target as HTMLElement).closest('button')) return;

    setIsPanning(true);
    setPanStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleCanvasPointerMove = (e: React.PointerEvent) => {
    if (isPanning) {
      setPosition({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    if (!isInteractiveEditing || !dragInteractionRef.current) return;

    // Minimum drag threshold (5px) to differentiate click from intentional drag
    const moveDist = Math.hypot(
      e.clientX - dragInteractionRef.current.startClientX,
      e.clientY - dragInteractionRef.current.startClientY
    );

    if (!didDragOccurRef.current) {
      if (moveDist < 5) {
        return; // Pure click: DO NOT MOVE SEAT OR SNAP
      }
      didDragOccurRef.current = true;
      setIsActuallyDragging(true);
    }

    const coords = getSvgCoordinates(e);
    const newX = snap(coords.x - dragInteractionRef.current.offset.x);
    const newY = snap(coords.y - dragInteractionRef.current.offset.y);

    if (dragInteractionRef.current.type === 'seat' && onSeatMove) {
      onSeatMove(dragInteractionRef.current.item.id, newX, newY);
    } else if (dragInteractionRef.current.type === 'table' && onTableMove) {
      onTableMove(
        dragInteractionRef.current.item.tableNumber,
        dragInteractionRef.current.item.zoneType,
        newX,
        newY
      );
    }
  };

  const handleCanvasPointerUp = () => {
    setIsPanning(false);
    setIsActuallyDragging(false);
    // Keep didDragOccur briefly so onClick handler can check whether a drag occurred
    setTimeout(() => {
      dragInteractionRef.current = null;
      didDragOccurRef.current = false;
    }, 60);
  };

  // Seat interaction in Editor vs Public
  const handleSeatClick = (seat: SeatItem, zone: any, e: React.MouseEvent) => {
    e.stopPropagation();
    // If user dragged the seat across the canvas, don't trigger selection/toggle
    if (didDragOccurRef.current) return;

    if (isInteractiveEditing) {
      if (onSeatClickInEditor) onSeatClickInEditor(seat, zone);
    } else {
      if (onToggleSeat && (seat.is_available && !seat.is_locked)) {
        onToggleSeat(seat, zone);
      }
    }
  };

  const handleSeatMouseDown = (seat: SeatItem, e: React.MouseEvent) => {
    if (!isInteractiveEditing) return;
    e.stopPropagation();
    const coords = getSvgCoordinates(e);
    const seatX = seat.x || 0;
    const seatY = seat.y || 0;
    dragInteractionRef.current = {
      type: 'seat',
      item: seat,
      startClientX: e.clientX,
      startClientY: e.clientY,
      offset: { x: coords.x - seatX, y: coords.y - seatY },
    };
    didDragOccurRef.current = false;
  };

  // Table Drag in Editor
  const handleTableMouseDown = (tableNum: number, zoneType: string, centerX: number, centerY: number, e: React.MouseEvent) => {
    if (!isInteractiveEditing) return;
    e.stopPropagation();
    const coords = getSvgCoordinates(e);
    dragInteractionRef.current = {
      type: 'table',
      item: { tableNumber: tableNum, zoneType },
      startClientX: e.clientX,
      startClientY: e.clientY,
      offset: { x: coords.x - centerX, y: coords.y - centerY },
    };
    didDragOccurRef.current = false;
  };

  return (
    <div className="w-full relative select-none flex flex-col items-center">
      {/* Zoom / Controls Header */}
      <div className="w-full flex items-center justify-between gap-4 mb-3 px-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"></span>
            Arena SCW · Mapa Interactivo
          </span>
          {isInteractiveEditing && (
            <span className="text-[11px] bg-red-950/80 text-red-300 border border-red-800/80 px-2 py-0.5 rounded-full font-bold">
              Modo Edición: Arrastra los asientos o mesas
            </span>
          )}
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1 bg-zinc-900 border border-white/10 rounded-xl p-1 shadow-lg z-20">
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
            title="Restablecer vista"
          >
            {Math.round(scale * 100)}%
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
        className={`w-full bg-[#0a0a0c] border border-white/10 rounded-3xl h-[620px] shadow-2xl relative overflow-hidden flex items-center justify-center touch-none ${
          isPanning ? 'cursor-grabbing' : isInteractiveEditing ? 'cursor-default' : 'cursor-grab'
        }`}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onPointerLeave={handleCanvasPointerUp}
      >
        <div
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            transition: isPanning || isActuallyDragging ? 'none' : 'transform 0.15s ease-out',
          }}
          className="w-full h-full flex items-center justify-center"
        >
          <svg
            ref={svgRef}
            viewBox="0 0 1200 980"
            className="w-[1200px] h-[980px] drop-shadow-2xl overflow-visible select-none"
            style={{ maxWidth: 'none', maxHeight: 'none' }}
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
            <rect x="0" y="0" width="1200" height="980" fill="#0d0e12" rx="16" />
            <rect x="15" y="15" width="1170" height="950" fill="none" stroke="#27272a" strokeWidth="2" strokeDasharray="6 6" rx="12" />

            {/* Spotlight on ring area */}
            <circle cx="520" cy="480" r="420" fill="url(#ringSpotlight)" />

            {/* === GENERAL ZONES (Dark Green Background Areas) === */}
            {/* Top-Left General */}
            <g
              onClick={() => onSelectGeneral && zoneGeneral && onSelectGeneral(zoneGeneral)}
              className={onSelectGeneral ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}
            >
              <rect x="260" y="40" width="310" height="135" rx="8" fill="#132a24" stroke="#10b981" strokeWidth="1.5" strokeOpacity="0.4" />
              <text x="415" y="115" textAnchor="middle" fill="#34d399" fontSize="22" fontWeight="900" letterSpacing="6" opacity="0.4">
                GENERAL
              </text>
            </g>

            {/* Right Side General */}
            <g
              onClick={() => onSelectGeneral && zoneGeneral && onSelectGeneral(zoneGeneral)}
              className={onSelectGeneral ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}
            >
              <rect x="835" y="195" width="335" height="590" rx="8" fill="#132a24" stroke="#10b981" strokeWidth="1.5" strokeOpacity="0.4" />
              <text x="1002" y="495" textAnchor="middle" fill="#34d399" fontSize="34" fontWeight="900" letterSpacing="10" opacity="0.4">
                GENERAL
              </text>
            </g>

            {/* Bottom General */}
            <g
              onClick={() => onSelectGeneral && zoneGeneral && onSelectGeneral(zoneGeneral)}
              className={onSelectGeneral ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}
            >
              <rect x="260" y="785" width="555" height="95" rx="8" fill="#132a24" stroke="#10b981" strokeWidth="1.5" strokeOpacity="0.4" />
              <text x="537" y="842" textAnchor="middle" fill="#34d399" fontSize="26" fontWeight="900" letterSpacing="8" opacity="0.4">
                GENERAL
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
                    data-draggable="true"
                    onMouseDown={(e) => handleTableMouseDown(tNum, 'MESAS_VIP', cx, cy, e)}
                    onClick={(e) => {
                      if (!isInteractiveEditing) {
                        // Click table selects its seats
                        seatsInTable.forEach(s => handleSeatClick(s, zoneVip, e));
                      } else if (onSeatClickInEditor) {
                        if (didDragOccurRef.current) return;
                        onSeatClickInEditor(firstSeat, zoneVip);
                      }
                    }}
                    className={`cursor-pointer group ${!allAvailable ? 'opacity-40' : ''}`}
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
                    data-draggable="true"
                    onMouseDown={(e) => handleTableMouseDown(tNum, 'MESAS_VIP_RINGSIDE', cx, cy, e)}
                    onClick={(e) => {
                      if (!isInteractiveEditing) {
                        seatsInTable.forEach(s => handleSeatClick(s, zoneRingside, e));
                      } else if (onSeatClickInEditor) {
                        if (didDragOccurRef.current) return;
                        onSeatClickInEditor(firstSeat, zoneRingside);
                      }
                    }}
                    className={`cursor-pointer group ${!allAvailable ? 'opacity-40' : ''}`}
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
                  data-draggable="true"
                  transform={`translate(${sx}, ${sy})`}
                  onMouseDown={(e) => handleSeatMouseDown(seat, e)}
                  onClick={(e) => handleSeatClick(seat, zoneF1, e)}
                  onMouseEnter={(e) => setHoveredSeat({ seat, zone: zoneF1, x: sx, y: sy })}
                  onMouseLeave={() => setHoveredSeat(null)}
                  className={`cursor-pointer group ${!isAvailable ? 'opacity-40 cursor-pointer' : ''}`}
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
                  data-draggable="true"
                  transform={`translate(${sx}, ${sy})`}
                  onMouseDown={(e) => handleSeatMouseDown(seat, e)}
                  onClick={(e) => handleSeatClick(seat, zoneF2, e)}
                  onMouseEnter={(e) => setHoveredSeat({ seat, zone: zoneF2, x: sx, y: sy })}
                  onMouseLeave={() => setHoveredSeat(null)}
                  className={`cursor-pointer group ${!isAvailable ? 'opacity-40 cursor-pointer' : ''}`}
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
                    data-draggable="true"
                    transform={`translate(${sx}, ${sy})`}
                    onMouseDown={(e) => handleSeatMouseDown(seat, e)}
                    onClick={(e) => handleSeatClick(seat, zone, e)}
                    onMouseEnter={(e) => setHoveredSeat({ seat, zone, x: sx, y: sy })}
                    onMouseLeave={() => setHoveredSeat(null)}
                    className={`cursor-pointer group ${!isAvailable ? 'opacity-40 cursor-pointer' : ''}`}
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
            <g transform="translate(40, 890)">
              {/* Legend background bar */}
              <rect x="0" y="0" width="1120" height="75" rx="8" fill="#000000" stroke="#27272a" strokeWidth="1.5" />

              {/* 1. Pink Table: Mesas VIP Ringside */}
              <g transform="translate(40, 38)">
                <circle cx="0" cy="0" r="16" fill="url(#pinkTableGrad)" stroke="#be185d" strokeWidth="1.5" />
                <circle cx="-16" cy="0" r="3.5" fill="#f472b6" />
                <circle cx="16" cy="0" r="3.5" fill="#f472b6" />
                <circle cx="0" cy="-16" r="3.5" fill="#f472b6" />
                <circle cx="0" cy="16" r="3.5" fill="#f472b6" />
                <text x="35" y="-5" fill="#ffffff" fontSize="12" fontWeight="900" letterSpacing="1">
                  MESAS VIP RINGSIDE
                </text>
                <text x="35" y="14" fill="#f472b6" fontSize="11" fontWeight="700">
                  (1 - 8) {zoneRingside?.price ? `· $${zoneRingside.price} MXN` : ''}
                </text>
              </g>

              {/* 2. Gold Table: Mesas VIP */}
              <g transform="translate(290, 38)">
                <circle cx="0" cy="0" r="16" fill="url(#goldTableGrad)" stroke="#ca8a04" strokeWidth="1.5" />
                <circle cx="-16" cy="0" r="3.5" fill="#facc15" />
                <circle cx="16" cy="0" r="3.5" fill="#facc15" />
                <circle cx="0" cy="-16" r="3.5" fill="#facc15" />
                <circle cx="0" cy="16" r="3.5" fill="#facc15" />
                <text x="35" y="-5" fill="#ffffff" fontSize="12" fontWeight="900" letterSpacing="1">
                  MESAS VIP
                </text>
                <text x="35" y="14" fill="#facc15" fontSize="11" fontWeight="700">
                  (1 - 12) {zoneVip?.price ? `· $${zoneVip.price} MXN` : ''}
                </text>
              </g>

              {/* 3. Red Chair: Primera Fila */}
              <g transform="translate(510, 38)">
                <rect x="-12" y="-12" width="24" height="24" rx="4" fill="#dc2626" stroke="#991b1b" strokeWidth="1.5" />
                <text x="25" y="-5" fill="#ffffff" fontSize="12" fontWeight="900" letterSpacing="1">
                  PRIMERA FILA
                </text>
                <text x="25" y="14" fill="#f87171" fontSize="11" fontWeight="700">
                  (1 - 44) {zoneF1?.price ? `· $${zoneF1.price} MXN` : ''}
                </text>
              </g>

              {/* 4. Blue Chair: Segunda Fila */}
              <g transform="translate(730, 38)">
                <rect x="-12" y="-12" width="24" height="24" rx="4" fill="#2563eb" stroke="#1d4ed8" strokeWidth="1.5" />
                <text x="25" y="-5" fill="#ffffff" fontSize="12" fontWeight="900" letterSpacing="1">
                  SEGUNDA FILA
                </text>
                <text x="25" y="14" fill="#60a5fa" fontSize="11" fontWeight="700">
                  (1 - 44) {zoneF2?.price ? `· $${zoneF2.price} MXN` : ''}
                </text>
              </g>

              {/* 5. Green Box: General */}
              <g
                transform="translate(935, 38)"
                onClick={() => onSelectGeneral && zoneGeneral && onSelectGeneral(zoneGeneral)}
                className={onSelectGeneral ? 'cursor-pointer hover:opacity-80' : ''}
              >
                <rect x="-14" y="-14" width="28" height="28" rx="4" fill="#132a24" stroke="#10b981" strokeWidth="1.5" />
                <text x="25" y="-5" fill="#ffffff" fontSize="12" fontWeight="900" letterSpacing="1">
                  GENERAL
                </text>
                <text x="25" y="14" fill="#34d399" fontSize="11" fontWeight="700">
                  (SIN NUMERACIÓN) {zoneGeneral?.price ? `· $${zoneGeneral.price} MXN` : ''}
                </text>
              </g>
            </g>
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
    </div>
  );
}
