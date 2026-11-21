"use client";

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, 
  Search, 
  Loader2, 
  Package, 
  CheckCircle, 
  Truck, 
  MapPin, 
  AlertCircle,
  X,
  Printer,
  Ticket,
  Calendar,
  Filter,
  ChevronDown,
  Mail
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import api from '@/services/api';
import { adminService } from '@/services/admin.services';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

function isTicketItem(item: { event?: number | null; product_name?: string }) {
  return item.event != null || !!item.product_name?.toLowerCase().includes('boleto');
}

function isCourtesy(order: any, item?: any) {
  if (order?.payment_method === 'COURTESY') return true;
  const name = (item?.product_name || '').toLowerCase();
  return name.includes('cortesía') || name.includes('cortesia');
}

const ZONE_LABELS: Record<string, string> = {
  MESAS_VIP_RINGSIDE: 'Mesas VIP Ringside',
  MESAS_VIP: 'Mesas VIP',
  PRIMERA_FILA: 'Primera fila',
  SEGUNDA_FILA: 'Segunda fila',
  NORTE: 'Norte',
  SUR: 'Sur',
  ESTE: 'Este',
  OESTE: 'Oeste',
  GENERAL: 'General',
  CUSTOM: 'Zona especial',
};

// Zona del boleto: primero el asiento real, luego lo que diga el nombre del boleto
function getTicketZone(item: any): string {
  const zt = item.seat_details?.zone_type;
  if (zt) return zt;
  const text = `${item.product_name || ''} ${item.size || ''}`.toUpperCase();
  const keys = ['MESAS_VIP_RINGSIDE', 'MESAS_VIP', 'PRIMERA_FILA', 'SEGUNDA_FILA', 'NORTE', 'SUR', 'ESTE', 'OESTE', 'GENERAL'];
  const found = keys.find(k => text.includes(k) || text.includes(k.replace(/_/g, ' ')));
  return found || 'OTRO';
}

// Proporción que realmente se cobró después de cupones de descuento
function orderPaidRatio(order: any) {
  const subtotal = (order.items || []).reduce((acc: number, i: any) => acc + parseFloat(i.price || 0) * (i.quantity || 1), 0);
  const discount = parseFloat(order.discount_amount || 0);
  if (!subtotal || !discount) return 1;
  return Math.max(0, subtotal - discount) / subtotal;
}

const PAYMENT_LABELS: Record<string, string> = {
  MERCADOPAGO: 'Mercado Pago',
  TRANSFER: 'Transferencia',
  BOX_OFFICE: 'Taquilla',
  STRIPE: 'Tarjeta (Stripe)',
};

function matchesTicketFilter(o: any, f: string) {
  switch (f) {
    case 'PAID': return o.status === 'PAID' && !isCourtesy(o);
    case 'COURTESY': return isCourtesy(o) && o.status !== 'CANCELLED';
    case 'PENDING': return o.status === 'PENDING';
    case 'CANCELLED': return o.status === 'CANCELLED';
    default: return true;
  }
}

const money = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_MAP: Record<string, { label: string, color: string, icon: any }> = {
  PENDING: { label: 'Pendiente', color: 'bg-zinc-800 text-zinc-400 border-zinc-700', icon: AlertCircle },
  PAID: { label: 'Pagado', color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: CheckCircle },
  PROCESSING: { label: 'Preparando', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', icon: Package },
  SHIPPED: { label: 'Enviado', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: Truck },
  DELIVERED: { label: 'Entregado', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: MapPin },
  CANCELLED: { label: 'Cancelado', color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: AlertCircle },
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [resendingId, setResendingId] = useState<number | null>(null);
  
  const params = useSearchParams();
  const view = params.get('view');
  const paidOnly = view === 'paid-tickets';
  const activeTab = paidOnly || view === 'tickets' ? 'TICKETS' : 'MERCH';

  function selectView(nextView: 'paid-tickets' | 'tickets' | 'merch') {
    const url = new URL(window.location.href);
    if (nextView === 'merch') url.searchParams.delete('view');
    else url.searchParams.set('view', nextView);
    window.history.replaceState(null, '', url);
  }

  const [selectedEventId, setSelectedEventId] = useState<string>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  type TicketFilter = 'ALL' | 'PAID' | 'COURTESY' | 'PENDING' | 'CANCELLED';
  const [ticketFilter, setTicketFilter] = useState<TicketFilter>(paidOnly ? 'PAID' : 'ALL');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ordersRes, eventsRes] = await Promise.allSettled([
        api.get('/payments/orders/'),
        api.get('/events/events/')
      ]);
      
      if (ordersRes.status === 'fulfilled') {
        setOrders(ordersRes.value.data);
      }
      if (eventsRes.status === 'fulfilled') {
        setEvents(eventsRes.value.data);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const params = new URLSearchParams(window.location.search);
    const approveId = params.get('approve');
    if (approveId) {
      setSearchQuery(approveId);
    }
  }, []);

  const handleUpdateStatus = async (orderId: number, newStatus: string) => {
    if (!confirm(`¿Estás seguro de cambiar el estado a ${STATUS_MAP[newStatus]?.label || newStatus}? Se enviará un correo al cliente notificándole este cambio.`)) return;
    
    setUpdatingId(orderId);
    try {
      const res = await api.patch(`/payments/orders/${orderId}/`, { status: newStatus });
      setOrders(orders.map(o => o.id === orderId ? res.data : o));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(res.data);
      }
    } catch (error) {
      console.error("Error updating order:", error);
      alert("Hubo un error al actualizar el estado.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleResendEmail = async (order: any) => {
    if (!confirm(`¿Deseas reenviar los boletos / recibo de la orden #${order.id} a ${order.contact_email}?`)) return;
    
    setResendingId(order.id);
    try {
      const res = await adminService.resendOrderEmail(order.id);
      alert(res.message || `Boletos reenviados exitosamente a ${order.contact_email}.`);
    } catch (error: any) {
      console.error("Error resending email:", error);
      alert("Hubo un error al reenviar el correo: " + (error.response?.data?.error || error.message));
    } finally {
      setResendingId(null);
    }
  };

  const handlePrintSticker = (order: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Por favor permite las ventanas emergentes para imprimir la pegatina.");
      return;
    }

    const itemsList = order.items.filter((i: any) => !isTicketItem(i))
      .map((i: any) => `<li>${i.quantity}x ${i.product_name} ${i.size ? `(${i.size})` : ''}</li>`).join('');

    const html = `
      <html>
        <head>
          <title>Etiqueta de Envío - Orden #${order.id}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            body {
              font-family: 'Inter', sans-serif;
              margin: 0;
              padding: 20px;
              color: #000;
              background: #fff;
            }
            .label-container {
              border: 2px dashed #000;
              padding: 24px;
              max-width: 500px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 12px;
              margin-bottom: 20px;
            }
            .header h1 { margin: 0; font-size: 28px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px; }
            .header p { margin: 4px 0 0; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; }
            
            .section { margin-bottom: 20px; }
            .section-title { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #666; margin-bottom: 8px; }
            
            .dest-name { font-size: 20px; font-weight: 700; margin: 0 0 4px; }
            .dest-address { font-size: 16px; margin: 0 0 4px; line-height: 1.4; }
            .dest-phone { font-size: 14px; margin: 0; font-family: monospace; }
            
            .items-box { border: 1px solid #000; padding: 12px; font-size: 14px; }
            .items-box ul { margin: 0; padding-left: 20px; }
            .items-box li { margin-bottom: 4px; }
            
            .footer {
              text-align: center;
              font-size: 12px;
              margin-top: 24px;
              font-weight: 700;
            }
            
            @media print {
              body { padding: 0; }
              .label-container { border: none; padding: 0; max-width: 100%; }
              @page { size: auto; margin: 0mm; }
            }
          </style>
        </head>
        <body>
          <div class="label-container">
            <div class="header">
              <h1>SCW Pro Wrestling</h1>
              <p>Envío de Mercancía Oficial</p>
            </div>
            
            <div class="section">
              <div class="section-title">Destinatario</div>
              <div class="dest-name">${order.contact_email}</div>
              <div class="dest-address">
                ${order.shipping_address}<br/>
                ${order.shipping_city}, ${order.shipping_state}<br/>
                C.P. ${order.shipping_zipcode}
              </div>
              <div class="dest-phone">Tel: ${order.contact_phone || order.shipping_phone || 'No especificado'}</div>
            </div>

            <div class="section">
              <div class="section-title">Contenido del Paquete (Orden #${order.id})</div>
              <div class="items-box">
                <ul>
                  ${itemsList}
                </ul>
              </div>
            </div>

            <div class="footer">
              GRACIAS POR TU COMPRA
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const isMerchOrder = (order: any) => order.items?.some((i: any) => !isTicketItem(i));
  const isTicketOrder = (order: any) => order.items?.some(isTicketItem);

  // Selected event title helper
  const selectedEventObj = useMemo(() => {
    if (selectedEventId === 'ALL') return null;
    return events.find(e => e.id.toString() === selectedEventId);
  }, [events, selectedEventId]);

  // Evento al que pertenece un boleto. Usa el id del evento; si el boleto no lo
  // trae (boletos viejos), lo busca por título exacto dentro del nombre.
  const itemEventKey = useMemo(() => {
    const sortedByTitle = [...events].sort((a, b) => (b.title || '').length - (a.title || '').length);
    return (item: any): string => {
      const id = item.event ?? item.event_id;
      if (id != null) return String(id);
      const text = `${item.event_title || ''} ${item.product_name || ''}`.toLowerCase();
      const ev = sortedByTitle.find(e => e.title && text.includes(e.title.toLowerCase()));
      return ev ? String(ev.id) : 'NONE';
    };
  }, [events]);

  // Filter orders according to tab, search query, and event selection
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesSearch = 
        o.contact_email?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        o.id.toString().includes(searchQuery);

      if (!matchesSearch) return false;

      if (activeTab === 'MERCH') {
        return isMerchOrder(o);
      }

      if (activeTab === 'TICKETS') {
        if (!isTicketOrder(o)) return false;

        if (selectedEventId !== 'ALL') {
          const hasMatchingEvent = o.items?.some((item: any) => isTicketItem(item) && itemEventKey(item) === selectedEventId);
          if (!hasMatchingEvent) return false;
        }
        return matchesTicketFilter(o, ticketFilter);
      }

      return false;
    });
  }, [orders, activeTab, searchQuery, selectedEventId, ticketFilter, itemEventKey]);

  // Cuántos pedidos hay en cada filtro (respetando evento y búsqueda)
  const ticketFilterCounts = useMemo(() => {
    const counts: Record<TicketFilter, number> = { ALL: 0, PAID: 0, COURTESY: 0, PENDING: 0, CANCELLED: 0 };
    const q = searchQuery.toLowerCase();
    orders.forEach(o => {
      if (!isTicketOrder(o)) return;
      if (q && !(o.contact_email?.toLowerCase().includes(q) || o.id.toString().includes(q))) return;
      if (selectedEventId !== 'ALL' && !o.items?.some((i: any) => isTicketItem(i) && itemEventKey(i) === selectedEventId)) return;
      (Object.keys(counts) as TicketFilter[]).forEach(k => { if (matchesTicketFilter(o, k)) counts[k]++; });
    });
    return counts;
  }, [orders, searchQuery, selectedEventId, itemEventKey]);

  // Corte de caja: pedidos PAGADOS del evento elegido, separando ventas y cortesías.
  // No depende de la búsqueda: siempre cuadra contra el evento completo.
  const ticketStats = useMemo(() => {
    type Line = { qty: number; gross: number; discount: number; revenue: number };
    const line = (): Line => ({ qty: 0, gross: 0, discount: 0, revenue: 0 });
    const sales: Record<string, Line> = {};
    const courtesies: Record<string, Line> = {};
    const methods: Record<string, { orders: Set<number>; revenue: number }> = {};
    const pending = { orders: new Set<number>(), qty: 0, amount: 0 };
    const salesOrders = new Set<number>();
    const courtesyOrders = new Set<number>();
    // Con un evento elegido se agrupa por zona; con todos, por evento
    const groupKey = (item: any) => (selectedEventId === 'ALL' ? itemEventKey(item) : getTicketZone(item));

    orders.forEach(order => {
      if (!isTicketOrder(order)) return;
      if (order.status !== 'PAID' && order.status !== 'PENDING') return;
      const ratio = orderPaidRatio(order);
      order.items?.forEach((item: any) => {
        if (!isTicketItem(item)) return;
        if (selectedEventId !== 'ALL' && itemEventKey(item) !== selectedEventId) return;
        const qty = item.quantity || 1;
        const gross = parseFloat(item.price || 0) * qty;

        if (order.status === 'PENDING') {
          pending.orders.add(order.id);
          pending.qty += qty;
          pending.amount += gross * ratio;
          return;
        }
        const courtesy = isCourtesy(order, item);
        const l = ((courtesy ? courtesies : sales)[groupKey(item)] ||= line());
        l.qty += qty;
        if (courtesy) {
          courtesyOrders.add(order.id);
          return;
        }
        l.gross += gross;
        l.revenue += gross * ratio;
        l.discount += gross * (1 - ratio);
        salesOrders.add(order.id);
        const m = (methods[order.payment_method || 'OTRO'] ||= { orders: new Set(), revenue: 0 });
        m.orders.add(order.id);
        m.revenue += gross * ratio;
      });
    });

    const zoneOrder = ['MESAS_VIP_RINGSIDE', 'MESAS_VIP', 'PRIMERA_FILA', 'SEGUNDA_FILA', 'NORTE', 'SUR', 'ESTE', 'OESTE', 'GENERAL', 'CUSTOM', 'OTRO'];
    const eventDate = (key: string) => new Date(events.find(e => String(e.id) === key)?.date_time || 0).getTime();
    const sortLines = (rec: Record<string, Line>) =>
      Object.entries(rec).sort((a, b) =>
        selectedEventId === 'ALL' ? eventDate(b[0]) - eventDate(a[0]) : zoneOrder.indexOf(a[0]) - zoneOrder.indexOf(b[0]));
    const sum = (rec: Record<string, Line>, k: keyof Line) => Object.values(rec).reduce((t, l) => t + l[k], 0);

    return {
      sales: sortLines(sales),
      courtesies: sortLines(courtesies),
      soldQty: sum(sales, 'qty'),
      revenue: sum(sales, 'revenue'),
      discount: sum(sales, 'discount'),
      courtesyQty: sum(courtesies, 'qty'),
      salesOrders: salesOrders.size,
      courtesyOrders: courtesyOrders.size,
      methods: Object.entries(methods).sort((a, b) => b[1].revenue - a[1].revenue),
      pending: { orders: pending.orders.size, qty: pending.qty, amount: pending.amount },
    };
  }, [orders, events, selectedEventId, itemEventKey]);

  // Nombre de cada renglón del corte (zona o evento)
  const corteLabel = (key: string) => {
    if (selectedEventId !== 'ALL') return ZONE_LABELS[key] || 'Sin zona identificada';
    const ev = events.find(e => String(e.id) === key);
    return ev ? ev.title : 'Sin evento identificado';
  };

  // Resumen corto de los boletos de un pedido: "2 × Primera fila"
  const renderTicketSummary = (order: any) => {
    const groups: Record<string, number> = {};
    order.items?.forEach((item: any) => {
      if (!isTicketItem(item)) return;
      if (selectedEventId !== 'ALL' && itemEventKey(item) !== selectedEventId) return;
      const z = getTicketZone(item);
      groups[z] = (groups[z] || 0) + (item.quantity || 1);
    });
    const entries = Object.entries(groups);
    const evTitles = selectedEventId === 'ALL'
      ? Array.from(new Set((order.items || []).filter(isTicketItem).map((i: any) => events.find(e => String(e.id) === itemEventKey(i))?.title).filter(Boolean)))
      : [];
    return (
      <div className="space-y-1">
        {evTitles.length > 0 && <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">{evTitles.join(', ')}</div>}
        {entries.map(([z, qty]) => (
          <div key={z} className="text-sm text-zinc-200">
            <span className="font-bold text-white">{qty} ×</span> {ZONE_LABELS[z] || 'Boleto'}
          </div>
        ))}
      </div>
    );
  };

  const renderPaymentBadge = (method: string) => {
    switch (method) {
      case 'MERCADOPAGO':
        return <span className="text-[10px] bg-sky-500/20 text-sky-400 border border-sky-500/30 px-1.5 py-0.5 rounded font-bold uppercase mt-1 inline-block">MercadoPago</span>;
      case 'TRANSFER':
        return <span className="text-[10px] bg-purple-500/20 text-purple-400 border border-purple-500/30 px-1.5 py-0.5 rounded font-bold uppercase mt-1 inline-block">Transferencia</span>;
      case 'BOX_OFFICE':
        return <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded font-bold uppercase mt-1 inline-block">Taquilla</span>;
      case 'COURTESY':
        return <span className="text-[10px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-1.5 py-0.5 rounded font-bold uppercase mt-1 inline-block">Cortesía</span>;
      default:
        return method ? <span className="text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700 px-1.5 py-0.5 rounded font-bold uppercase mt-1 inline-block">{method}</span> : null;
    }
  };

  return (
    <div className="space-y-6 relative pb-12">
      {/* Header */}
      <AdminPageHeader 
        title="Gestión de Pedidos"
        subtitle="Administra los pedidos de mercancía física y boletos."
        icon={<Package className="w-8 h-8 animate-pulse" />}
      />

      {/* Pestañas y evento */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="inline-flex rounded-xl bg-zinc-900 border border-white/10 p-1 self-start">
          <button
            onClick={() => selectView('merch')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors whitespace-nowrap ${activeTab === 'MERCH' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}
          >
            <ShoppingBag className="w-4 h-4" />
            Productos físicos
          </button>
          <button
            onClick={() => selectView('tickets')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors whitespace-nowrap ${activeTab === 'TICKETS' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}
          >
            <Ticket className="w-4 h-4" />
            Boletos
          </button>
        </div>

        {activeTab === 'TICKETS' && (
          <div className="relative w-full sm:w-80">
            <Calendar className="w-4 h-4 text-red-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              aria-label="Evento"
              className="w-full appearance-none bg-zinc-900 border border-white/10 hover:border-white/30 text-sm text-white rounded-xl py-3 pl-10 pr-9 focus:outline-none focus:border-red-500 transition-colors cursor-pointer font-semibold"
            >
              <option value="ALL">Todos los eventos</option>
              {[...events]
                .sort((a, b) => new Date(b.date_time).getTime() - new Date(a.date_time).getTime())
                .map((ev) => (
                  <option key={ev.id} value={ev.id.toString()}>
                    {ev.title} · {new Date(ev.date_time).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </option>
                ))}
            </select>
            <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )}
      </div>

      {/* Corte de caja (solo pestaña Boletos) */}
      {activeTab === 'TICKETS' && (
        <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4 items-start">
          {/* Ticket principal */}
          <div className="rounded-2xl border border-white/10 bg-zinc-950 overflow-hidden">
            <div className="flex items-baseline justify-between gap-3 px-5 py-4 border-b border-white/10">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Corte de caja</p>
                <h3 className="text-lg font-black text-white truncate">
                  {selectedEventObj ? selectedEventObj.title : 'Todos los eventos'}
                </h3>
              </div>
              {selectedEventObj && (
                <span className="text-sm text-zinc-400 whitespace-nowrap">
                  {new Date(selectedEventObj.date_time).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>

            {/* Ventas */}
            <div className="px-5 pt-4 pb-1 flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Ventas</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600">Boletos · Importe</span>
            </div>
            {ticketStats.sales.length === 0 ? (
              <p className="px-5 py-3 text-sm text-zinc-500">Todavía no hay ventas pagadas.</p>
            ) : (
              ticketStats.sales.map(([key, l]) => (
                <div key={key} className="flex items-baseline justify-between gap-4 px-5 py-2.5 border-t border-white/5 text-sm">
                  <span className="min-w-0 text-zinc-200">
                    <span className="font-semibold text-white">{corteLabel(key)}</span>
                    <span className="text-zinc-500"> · {l.qty}</span>
                    {l.discount > 0.005 && <span className="text-zinc-500"> (cupón −{money(l.discount)})</span>}
                    {selectedEventId === 'ALL' && key !== 'NONE' && (
                      <button onClick={() => setSelectedEventId(key)} className="ml-2 text-xs font-bold text-red-400 hover:text-red-300">
                        ver
                      </button>
                    )}
                  </span>
                  <span className="text-white tabular-nums">{money(l.revenue)}</span>
                </div>
              ))
            )}
            <div className="flex items-baseline justify-between px-5 py-3 border-t border-white/15 bg-zinc-900/60 text-sm">
              <span className="font-bold text-white">Subtotal ventas · {ticketStats.soldQty} boleto{ticketStats.soldQty === 1 ? '' : 's'}</span>
              <span className="font-black text-green-400 tabular-nums">{money(ticketStats.revenue)}</span>
            </div>

            {/* Cortesías */}
            <div className="px-5 pt-5 pb-1">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-yellow-400">Cortesías</span>
            </div>
            {ticketStats.courtesies.length === 0 ? (
              <p className="px-5 py-3 text-sm text-zinc-500">Sin cortesías.</p>
            ) : (
              ticketStats.courtesies.map(([key, l]) => (
                <div key={key} className="flex items-baseline justify-between gap-4 px-5 py-2.5 border-t border-white/5 text-sm">
                  <span className="min-w-0">
                    <span className="font-semibold text-white">{corteLabel(key)}</span>
                    <span className="text-zinc-500"> · {l.qty}</span>
                  </span>
                  <span className="text-zinc-500 tabular-nums">$0.00</span>
                </div>
              ))
            )}
            <div className="flex items-baseline justify-between px-5 py-3 border-t border-white/15 bg-zinc-900/60 text-sm">
              <span className="font-bold text-white">Subtotal cortesías · {ticketStats.courtesyQty} boleto{ticketStats.courtesyQty === 1 ? '' : 's'}</span>
              <span className="font-black text-zinc-400 tabular-nums">$0.00</span>
            </div>

            {/* Total */}
            <div className="flex flex-wrap items-end justify-between gap-3 px-5 py-5 border-t-2 border-dashed border-white/15">
              <div>
                <p className="text-sm font-bold text-white">Total del {selectedEventObj ? 'evento' : 'periodo'}</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {ticketStats.soldQty + ticketStats.courtesyQty} personas con boleto ({ticketStats.soldQty} pagados + {ticketStats.courtesyQty} cortesías)
                </p>
              </div>
              <p className="text-3xl font-black text-green-400 tabular-nums">{money(ticketStats.revenue)}</p>
            </div>
          </div>

          {/* Columna lateral: cómo entró el dinero y lo que falta */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-zinc-950 overflow-hidden">
              <p className="px-5 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 border-b border-white/10">Cómo se cobró</p>
              {ticketStats.methods.length === 0 ? (
                <p className="px-5 py-3 text-sm text-zinc-500">Sin cobros.</p>
              ) : (
                ticketStats.methods.map(([m, v]) => (
                  <div key={m} className="flex items-baseline justify-between gap-3 px-5 py-2.5 border-t border-white/5 first:border-t-0 text-sm">
                    <span className="text-white font-semibold">
                      {PAYMENT_LABELS[m] || m}
                      <span className="text-zinc-500 font-normal"> · {v.orders.size} pedido{v.orders.size === 1 ? '' : 's'}</span>
                    </span>
                    <span className="text-white tabular-nums">{money(v.revenue)}</span>
                  </div>
                ))
              )}
              {ticketStats.discount > 0.005 && (
                <p className="px-5 py-2.5 border-t border-white/5 text-xs text-zinc-500">
                  Descuentos por cupón: −{money(ticketStats.discount)}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setTicketFilter('PENDING')}
              className="w-full text-left rounded-2xl border border-white/10 bg-zinc-950 hover:border-white/30 transition-colors px-5 py-4"
            >
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Pendientes de pago</p>
              <p className="text-xl font-black text-white mt-1 tabular-nums">{money(ticketStats.pending.amount)}</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {ticketStats.pending.orders} pedido{ticketStats.pending.orders === 1 ? '' : 's'} · {ticketStats.pending.qty} boleto{ticketStats.pending.qty === 1 ? '' : 's'} · no entran al corte
              </p>
            </button>
          </div>
        </section>
      )}

      {/* Pedidos: búsqueda y filtro */}
      <div className="space-y-3">
        {activeTab === 'TICKETS' && (
          <h3 className="text-sm font-black uppercase tracking-wider text-white pt-2">
            Pedidos <span className="text-zinc-500 font-bold">({filteredOrders.length})</span>
          </h3>
        )}
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por correo o número de pedido"
              className="w-full bg-zinc-950 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>
          {activeTab === 'TICKETS' && (
            <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
              {([
                ['ALL', 'Todos'],
                ['PAID', 'Pagados'],
                ['COURTESY', 'Cortesías'],
                ['PENDING', 'Pendientes'],
                ['CANCELLED', 'Cancelados'],
              ] as [TicketFilter, string][]).map(([k, label]) => {
                const active = ticketFilter === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setTicketFilter(k)}
                    className={`shrink-0 inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-bold transition-colors ${
                      active
                        ? k === 'COURTESY' ? 'bg-yellow-400 text-black border-yellow-400' : 'bg-white text-black border-white'
                        : 'border-white/10 text-zinc-300 hover:border-white/30'
                    }`}
                  >
                    {label}
                    <span className={`rounded-full px-1.5 text-[11px] ${active ? 'bg-black/15' : 'bg-white/10 text-zinc-400'}`}>{ticketFilterCounts[k]}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Orders List Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500 gap-3 bg-zinc-950/40 rounded-xl border border-white/5">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm font-medium">Cargando pedidos...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-zinc-950/40 border border-white/5 rounded-xl p-12 text-center text-zinc-500">
          <Package className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
          <p className="text-sm font-semibold text-zinc-400">No se encontraron pedidos con los filtros aplicados</p>
          {selectedEventId !== 'ALL' && (
            <button 
              onClick={() => setSelectedEventId('ALL')} 
              className="mt-3 text-xs text-blue-400 hover:underline font-medium"
            >
              Ver todos los eventos
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View (Hidden on mobile) */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-white/10 bg-zinc-950">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="text-xs text-zinc-400 uppercase bg-zinc-900/60 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4 font-semibold tracking-wider">Orden ID</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Fecha</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Cliente</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">{activeTab === 'TICKETS' ? 'Boletos' : 'Artículos'}</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Total</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Estado</th>
                  <th className="px-6 py-4 font-semibold tracking-wider text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const statusInfo = STATUS_MAP[order.status] || STATUS_MAP.PENDING;
                  const Icon = statusInfo.icon;
                  return (
                    <tr 
                      key={order.id} 
                      onClick={() => setSelectedOrder(order)}
                      className="border-b border-white/5 hover:bg-white/5 transition-all duration-200 cursor-pointer"
                    >
                      <td className="px-6 py-4 font-mono font-bold text-white">#{order.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-zinc-400">
                        {new Date(order.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-6 py-4">
                        {order.contact_name && <div className="text-sm text-white font-semibold">{order.contact_name}</div>}
                        <div className={order.contact_name ? 'text-xs text-zinc-400' : 'text-sm text-white font-medium'}>{order.contact_email}</div>
                        {order.contact_phone && <div className="text-xs text-zinc-500">{order.contact_phone}</div>}
                        {renderPaymentBadge(order.payment_method)}
                      </td>
                      <td className="px-6 py-4">
                        {activeTab === 'TICKETS' ? renderTicketSummary(order) : (
                          <div className="space-y-1">
                            {order.items?.map((item: any) => (
                              <div key={item.id} className="text-xs">
                                <span className="font-bold text-blue-400">{item.quantity}x</span> {item.product_name}
                                {item.size && <span className="text-zinc-500 ml-1">({item.size})</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 font-bold text-white">${parseFloat(order.total_amount).toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusInfo.color}`}>
                          <Icon className="w-3.5 h-3.5" />
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleResendEmail(order)}
                            disabled={resendingId === order.id}
                            title="Reenviar correo de boletos / recibo"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-purple-500/10 hover:bg-purple-600 text-purple-400 hover:text-white rounded-lg border border-purple-500/20 hover:border-purple-600 text-xs font-semibold transition-all disabled:opacity-50"
                          >
                            {resendingId === order.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Mail className="w-3.5 h-3.5" />
                            )}
                            <span className="hidden lg:inline">Reenviar</span>
                          </button>

                          {updatingId === order.id ? (
                            <Loader2 className="w-5 h-5 animate-spin text-zinc-400 inline-block" />
                          ) : (
                            <select
                              value={order.status}
                              onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                              className="bg-zinc-900 border border-white/10 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer"
                            >
                              <option value="PENDING">Pendiente</option>
                              <option value="PAID">Pagado</option>
                              {activeTab === 'MERCH' && <option value="PROCESSING">Preparando</option>}
                              {activeTab === 'MERCH' && <option value="SHIPPED">Enviado</option>}
                              {activeTab === 'MERCH' && <option value="DELIVERED">Entregado</option>}
                              <option value="CANCELLED">Cancelado</option>
                            </select>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View (Visible only on mobile screens < 768px) */}
          <div className="block md:hidden space-y-3">
            {filteredOrders.map((order) => {
              const statusInfo = STATUS_MAP[order.status] || STATUS_MAP.PENDING;
              const Icon = statusInfo.icon;
              return (
                <div 
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className="bg-zinc-950 border border-white/10 rounded-xl p-4 space-y-3 cursor-pointer hover:border-blue-500/50 transition-all active:scale-[0.99]"
                >
                  {/* Top Row: ID, Date, Status */}
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-white text-base">#{order.id}</span>
                      <span className="text-[11px] text-zinc-400">
                        {new Date(order.created_at).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusInfo.color}`}>
                      <Icon className="w-3 h-3" />
                      {statusInfo.label}
                    </span>
                  </div>

                  {/* Customer Info */}
                  <div>
                    <p className="text-xs font-semibold text-white truncate">{order.contact_email}</p>
                    {order.contact_phone && (
                      <p className="text-[11px] text-zinc-400 mt-0.5">{order.contact_phone}</p>
                    )}
                    {renderPaymentBadge(order.payment_method)}
                  </div>

                  {/* Items List */}
                  {activeTab === 'TICKETS' ? (
                    <div className="bg-zinc-900/60 rounded-lg p-2.5 border border-white/5">{renderTicketSummary(order)}</div>
                  ) : (
                  <div className="bg-zinc-900/60 rounded-lg p-2.5 space-y-1.5 border border-white/5">
                    {order.items?.map((item: any) => (
                      <div key={item.id} className="text-xs flex justify-between items-start">
                        <span className="text-zinc-200">
                          <strong className="text-blue-400">{item.quantity}x</strong> {item.product_name}
                          {item.size && <span className="text-zinc-400 ml-1">({item.size})</span>}
                        </span>
                        <span className="text-zinc-400 font-mono text-[11px] ml-2">
                          ${parseFloat(item.price).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                  )}

                  {/* Bottom Row: Total & Action dropdown */}
                  <div className="flex items-center justify-between pt-1" onClick={e => e.stopPropagation()}>
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Total</span>
                      <span className="text-base font-black text-white">${parseFloat(order.total_amount).toFixed(2)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleResendEmail(order)}
                        disabled={resendingId === order.id}
                        title="Reenviar correo"
                        className="inline-flex items-center gap-1 px-2 py-1.5 bg-purple-500/10 hover:bg-purple-600 text-purple-400 hover:text-white rounded-lg border border-purple-500/20 text-xs font-semibold transition"
                      >
                        {resendingId === order.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Mail className="w-3.5 h-3.5" />
                        )}
                        <span>Reenviar</span>
                      </button>

                      {updatingId === order.id ? (
                        <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
                      ) : (
                        <select
                          value={order.status}
                          onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                          className="bg-zinc-900 border border-white/10 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
                        >
                          <option value="PENDING">Pendiente</option>
                          <option value="PAID">Pagado</option>
                          {activeTab === 'MERCH' && <option value="PROCESSING">Preparando</option>}
                          {activeTab === 'MERCH' && <option value="SHIPPED">Enviado</option>}
                          {activeTab === 'MERCH' && <option value="DELIVERED">Entregado</option>}
                          <option value="CANCELLED">Cancelado</option>
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Order Details Modal (Responsive for Mobile) */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
              onClick={() => setSelectedOrder(null)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-6 border-b border-white/10 flex justify-between items-center bg-zinc-900/50">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                    Orden #{selectedOrder.id}
                    <span className={`px-2 py-0.5 rounded text-[11px] border ${STATUS_MAP[selectedOrder.status]?.color || STATUS_MAP.PENDING.color}`}>
                      {STATUS_MAP[selectedOrder.status]?.label || 'Desconocido'}
                    </span>
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                    {new Date(selectedOrder.created_at).toLocaleString('es-MX')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleResendEmail(selectedOrder)}
                    disabled={resendingId === selectedOrder.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-md shadow-purple-600/20"
                  >
                    {resendingId === selectedOrder.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Mail className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden sm:inline">Reenviar Correo</span>
                  </button>
                  <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-zinc-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
                
                {/* Shipping Info (Only Merch) */}
                {isMerchOrder(selectedOrder) && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3 border-b border-white/10 pb-2 flex justify-between items-center">
                      Información de Envío
                      <button 
                        onClick={() => handlePrintSticker(selectedOrder)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5" /> Imprimir Pegatina
                      </button>
                    </h3>
                    <div className="bg-zinc-900 border border-white/5 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-zinc-500 mb-0.5">Contacto</p>
                        <p className="text-sm font-medium text-white break-all">{selectedOrder.contact_email}</p>
                        <p className="text-xs text-zinc-400">{selectedOrder.contact_phone || 'Sin teléfono'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500 mb-0.5">Dirección</p>
                        <p className="text-sm text-white">{selectedOrder.shipping_address || 'No proporcionada'}</p>
                        <p className="text-xs text-zinc-400">{selectedOrder.shipping_city}, {selectedOrder.shipping_state}</p>
                        <p className="text-xs text-zinc-400">C.P. {selectedOrder.shipping_zipcode}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Payment Info */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3 border-b border-white/10 pb-2">
                    Método de Pago
                  </h3>
                  <div className="bg-zinc-900 border border-white/5 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-white">
                          {selectedOrder.payment_method === 'MERCADOPAGO' ? 'MercadoPago (Tarjeta/OXXO)' : 
                           selectedOrder.payment_method === 'TRANSFER' ? 'Transferencia Bancaria' : 
                           selectedOrder.payment_method === 'BOX_OFFICE' ? 'Venta Directa / Taquilla' : 
                           selectedOrder.payment_method === 'COURTESY' ? 'Boleto de Cortesía ($0)' : 
                           selectedOrder.payment_method}
                        </p>
                        {renderPaymentBadge(selectedOrder.payment_method)}
                      </div>
                      {selectedOrder.payment_method === 'TRANSFER' && (
                        <div className="mt-2">
                          {selectedOrder.transfer_receipt ? (
                            <a 
                              href={selectedOrder.transfer_receipt} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors"
                            >
                              Ver Comprobante
                            </a>
                          ) : (
                            <p className="text-xs text-red-400 font-medium">No se subió comprobante.</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3 border-b border-white/10 pb-2">
                    Artículos ({selectedOrder.items?.length || 0})
                  </h3>
                  <div className="space-y-2.5">
                    {selectedOrder.items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center bg-zinc-900/60 border border-white/5 p-3 rounded-xl">
                        <div>
                          <p className="text-sm font-bold text-white">
                            <span className="text-blue-400 font-extrabold">{item.quantity}x</span> {item.product_name}
                          </p>
                          {item.size && <p className="text-xs text-zinc-400 mt-0.5">Talla/Zona: {item.size}</p>}
                        </div>
                        <p className="text-sm font-bold text-white font-mono">${parseFloat(item.price).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t border-white/10 pt-4 space-y-2">
                  {isMerchOrder(selectedOrder) && (
                    <div className="flex justify-between text-xs sm:text-sm text-zinc-400">
                      <span>Costo de envío cobrado</span>
                      <span>${parseFloat(selectedOrder.shipping_cost || 0).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base sm:text-lg font-extrabold text-white pt-1">
                    <span>Total Pagado</span>
                    <span className="text-blue-400 font-mono">${parseFloat(selectedOrder.total_amount).toFixed(2)} MXN</span>
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
