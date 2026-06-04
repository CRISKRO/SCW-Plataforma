"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ShoppingBag, 
  Search, 
  Loader2, 
  Package, 
  CheckCircle, 
  Truck, 
  MapPin, 
  AlertCircle
} from 'lucide-react';
import api from '@/services/api';

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
  }, []);

  const handleUpdateStatus = async (orderId: number, newStatus: string) => {
    if (!confirm(`¿Estás seguro de cambiar el estado a ${STATUS_MAP[newStatus].label}? Se enviará un correo al cliente notificándole este cambio.`)) return;
    
    setUpdatingId(orderId);
    try {
      const res = await api.patch(`/payments/orders/${orderId}/`, { status: newStatus });
      setOrders(orders.map(o => o.id === orderId ? res.data : o));
    } catch (error) {
      console.error("Error updating order:", error);
      alert("Hubo un error al actualizar el estado.");
    } finally {
      setUpdatingId(null);
    }
  };

  // Filter out orders that are purely subscriptions/tuitions (they usually don't have items or have specific items)
  // For simplicity, we just filter by search query for now.
  const filteredOrders = orders.filter(o => 
    o.contact_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.id.toString().includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-500 flex items-center gap-3">
            <Package className="w-8 h-8 text-blue-500 animate-pulse" />
            Gestión de Pedidos
          </h1>
          <p className="text-zinc-400 mt-2 text-base">
            Administra los envíos de la tienda. Actualiza el estado para enviar notificaciones automáticas a los clientes.
          </p>
        </div>
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
            <p className="text-sm font-semibold text-zinc-400">No se encontraron pedidos</p>
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
                  <th className="px-6 py-4 font-semibold tracking-wider">Estado de Envío</th>
                  <th className="px-6 py-4 font-semibold tracking-wider text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const statusInfo = STATUS_MAP[order.status] || STATUS_MAP.PENDING;
                  const Icon = statusInfo.icon;
                  return (
                    <tr key={order.id} className="border-b border-white/5 hover:bg-white/5 transition-all duration-200">
                      <td className="px-6 py-4 font-mono font-bold text-white">#{order.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {new Date(order.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-white font-medium">{order.contact_email}</div>
                        {order.contact_phone && <div className="text-xs text-zinc-500">{order.contact_phone}</div>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {order.items?.map((item: any) => (
                            <div key={item.id} className="text-xs">
                              <span className="font-bold text-white">{item.quantity}x</span> {item.product_name}
                              {item.size && <span className="text-zinc-500 ml-1">({item.size})</span>}
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
                      <td className="px-6 py-4 text-right">
                        {updatingId === order.id ? (
                          <Loader2 className="w-5 h-5 animate-spin text-zinc-400 inline-block" />
                        ) : (
                          <select
                            value={order.status}
                            onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                            disabled={order.status === 'PENDING'}
                            className="bg-zinc-900 border border-white/10 text-xs text-white rounded-lg px-2 py-1 focus:outline-none focus:border-blue-500"
                          >
                            <option value="PENDING" disabled>Pendiente</option>
                            <option value="PAID">Pagado</option>
                            <option value="PROCESSING">Preparando</option>
                            <option value="SHIPPED">Enviado</option>
                            <option value="DELIVERED">Entregado</option>
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
    </div>
  );
}
