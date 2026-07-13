"use client";

import { useEffect, useState } from 'react';
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
  Ticket
import api from '@/services/api';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

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
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  
  const [activeTab, setActiveTab] = useState<'MERCH' | 'TICKETS'>('MERCH');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/payments/orders/');
      setOrders(res.data);
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const params = new URLSearchParams(window.location.search);
    const approveId = params.get('approve');
    if (approveId) {
      setSearchQuery(approveId);
    }
  }, []);

  const handleUpdateStatus = async (orderId: number, newStatus: string) => {
    if (!confirm(`¿Estás seguro de cambiar el estado a ${STATUS_MAP[newStatus].label}? Se enviará un correo al cliente notificándole este cambio.`)) return;
    
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

  const handlePrintSticker = (order: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Por favor permite las ventanas emergentes para imprimir la pegatina.");
      return;
    }

    const itemsList = order.items.filter((i: any) => !i.product_name.toLowerCase().includes('boleto'))
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

  const isMerchOrder = (order: any) => order.items?.some((i: any) => !i.product_name.toLowerCase().includes('boleto'));
  const isTicketOrder = (order: any) => order.items?.some((i: any) => i.product_name.toLowerCase().includes('boleto'));

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.contact_email?.toLowerCase().includes(searchQuery.toLowerCase()) || o.id.toString().includes(searchQuery);
    if (!matchesSearch) return false;

    if (activeTab === 'MERCH') return isMerchOrder(o);
    if (activeTab === 'TICKETS') return !isMerchOrder(o) && isTicketOrder(o);
    return false;
  });

  return (
    <div className="space-y-6 relative">
      {/* Header */}
      <AdminPageHeader 
        title="Gestión de Pedidos"
        subtitle="Administra los pedidos de mercancía física y boletos."
        icon={<Package className="w-8 h-8 animate-pulse" />}
      />

      {/* Tabs */}
      <div className="flex gap-4 border-b border-white/10 pb-4">
        <button
          onClick={() => setActiveTab('MERCH')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
            activeTab === 'MERCH' ? 'bg-blue-500 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          Productos Físicos
        </button>
        <button
          onClick={() => setActiveTab('TICKETS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
            activeTab === 'TICKETS' ? 'bg-blue-500 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <Ticket className="w-4 h-4" />
          Solo Boletos
        </button>
      </div>

      {/* Search and List */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar pedido por email o ID..."
            className="w-full bg-zinc-950 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 focus:bg-zinc-900 transition-all"
          />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-sm font-medium">Cargando pedidos...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-zinc-950/40 border border-white/5 rounded-xl p-16 text-center text-zinc-500">
            <Package className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-sm font-semibold text-zinc-400">No se encontraron pedidos en esta categoría</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10 bg-zinc-950">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="text-xs text-zinc-400 uppercase bg-zinc-900/60 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4 font-semibold tracking-wider">Orden ID</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Fecha</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Cliente</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Artículos</th>
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        {new Date(order.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-white font-medium">{order.contact_email}</div>
                        {order.contact_phone && <div className="text-xs text-zinc-500">{order.contact_phone}</div>}
                        {order.payment_method === 'TRANSFER' && <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded font-bold uppercase mt-1 inline-block">Transferencia</span>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {order.items?.map((item: any) => (
                            <div key={item.id} className="text-xs">
                              <span className="font-bold text-white">{item.quantity}x</span> {item.product_name}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-white">${parseFloat(order.total_amount).toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusInfo.color}`}>
                          <Icon className="w-3.5 h-3.5" />
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                        {updatingId === order.id ? (
                          <Loader2 className="w-5 h-5 animate-spin text-zinc-400 inline-block" />
                        ) : (
                          <select
                            value={order.status}
                            onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                            className="bg-zinc-900 border border-white/10 text-xs text-white rounded-lg px-2 py-1 focus:outline-none focus:border-blue-500"
                          >
                            <option value="PENDING">Pendiente</option>
                            <option value="PAID">Pagado</option>
                            {activeTab === 'MERCH' && <option value="PROCESSING">Preparando</option>}
                            {activeTab === 'MERCH' && <option value="SHIPPED">Enviado</option>}
                            {activeTab === 'MERCH' && <option value="DELIVERED">Entregado</option>}
                            <option value="CANCELLED">Cancelado</option>
                          </select>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
              onClick={() => setSelectedOrder(null)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-zinc-900/50">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    Orden #{selectedOrder.id}
                    <span className={`px-2 py-0.5 rounded text-xs border ${STATUS_MAP[selectedOrder.status]?.color || STATUS_MAP.PENDING.color}`}>
                      {STATUS_MAP[selectedOrder.status]?.label || 'Desconocido'}
                    </span>
                  </h2>
                  <p className="text-sm text-zinc-400 mt-1">
                    {new Date(selectedOrder.created_at).toLocaleString('es-MX')}
                  </p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-zinc-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-8">
                
                {/* Shipping Info */}
                {isMerchOrder(selectedOrder) && (
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4 border-b border-white/10 pb-2 flex justify-between items-center">
                      Información de Envío
                      <button 
                        onClick={() => handlePrintSticker(selectedOrder)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-bold transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5" /> Imprimir Pegatina
                      </button>
                    </h3>
                    <div className="bg-zinc-900 border border-white/5 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">Contacto</p>
                        <p className="text-sm font-medium text-white">{selectedOrder.contact_email}</p>
                        <p className="text-sm text-zinc-400">{selectedOrder.contact_phone || 'Sin teléfono'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">Dirección</p>
                        <p className="text-sm text-white">{selectedOrder.shipping_address || 'No proporcionada'}</p>
                        <p className="text-sm text-zinc-400">{selectedOrder.shipping_city}, {selectedOrder.shipping_state}</p>
                        <p className="text-sm text-zinc-400">C.P. {selectedOrder.shipping_zipcode}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Payment Info */}
                {selectedOrder.payment_method === 'TRANSFER' && (
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4 border-b border-white/10 pb-2">
                      Información de Pago
                    </h3>
                    <div className="bg-zinc-900 border border-white/5 rounded-xl p-4">
                      <p className="text-sm font-bold text-white mb-2">Pago por Transferencia Bancaria</p>
                      {selectedOrder.transfer_receipt ? (
                        <a 
                          href={selectedOrder.transfer_receipt} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-bold transition-colors mt-2"
                        >
                          Ver Comprobante
                        </a>
                      ) : (
                        <p className="text-sm text-red-400">No se subió comprobante.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Items */}
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4 border-b border-white/10 pb-2">
                    Artículos
                  </h3>
                  <div className="space-y-3">
                    {selectedOrder.items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center bg-zinc-900/50 border border-white/5 p-3 rounded-lg">
                        <div>
                          <p className="text-sm font-bold text-white"><span className="text-blue-400">{item.quantity}x</span> {item.product_name}</p>
                          {item.size && <p className="text-xs text-zinc-400">Talla: {item.size}</p>}
                        </div>
                        <p className="text-sm font-bold text-white">${parseFloat(item.price).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t border-white/10 pt-4 space-y-2">
                  <div className="flex justify-between text-sm text-zinc-400">
                    <span>Costo de envío cobrado</span>
                    <span>${parseFloat(selectedOrder.shipping_cost || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-white pt-2">
                    <span>Total Pagado</span>
                    <span>${parseFloat(selectedOrder.total_amount).toFixed(2)} MXN</span>
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
