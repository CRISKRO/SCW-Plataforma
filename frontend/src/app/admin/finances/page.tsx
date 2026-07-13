"use client";

import { useEffect, useState } from 'react';
import AdminTable from '@/components/admin/AdminTable';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { adminService } from '@/services/admin.services';

export default function AdminFinancesPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const data = await adminService.getOrders();
      setOrders(data);
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    if (confirm(`¿Marcar orden como ${newStatus}?`)) {
      try {
        await adminService.updateOrderStatus(orderId, newStatus);
        setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      } catch (error) {
        console.error("Error updating status:", error);
        alert("Error al actualizar el estado.");
      }
    }
  };

  const handleDeleteOrder = async (orderId: number) => {
    if (confirm(`¿Estás seguro de que deseas eliminar permanentemente la orden #${orderId}? Esta acción no se puede deshacer y borrará todos los registros de pago y tickets asociados.`)) {
      try {
        await adminService.deleteOrder(orderId);
        setOrders(orders.filter(o => o.id !== orderId));
      } catch (error) {
        console.error("Error deleting order:", error);
        alert("Error al eliminar la orden. Es posible que tenga relaciones activas que impidan su eliminación.");
      }
    }
  };

  const columns = [
    { key: 'id', label: '# Orden' },
    { key: 'contact_email', label: 'Email Cliente' },
    { 
      key: 'total_amount', 
      label: 'Monto Total',
      render: (val: number) => `$${val} MXN`
    },
    { 
      key: 'created_at', 
      label: 'Fecha',
      render: (val: string) => new Date(val).toLocaleString()
    },
    { 
      key: 'status', 
      label: 'Estado',
      render: (val: string, item: any) => (
        <select 
          value={val}
          onChange={(e) => handleStatusChange(item.id, e.target.value)}
          className={`px-2 py-1 rounded text-xs font-bold tracking-widest outline-none border border-white/10 ${
            val === 'COMPLETED' ? 'bg-green-500/20 text-green-500' : 
            val === 'CANCELLED' ? 'bg-red-500/20 text-red-500' : 
            'bg-yellow-500/20 text-yellow-500'
          }`}
        >
          <option value="PENDING">PENDIENTE</option>
          <option value="PAID">PAGADO</option>
          <option value="SHIPPED">ENVIADO</option>
          <option value="COMPLETED">COMPLETADO</option>
          <option value="CANCELLED">CANCELADO</option>
        </select>
      )
    },
    {
      key: 'actions',
      label: 'Acciones',
      render: (_: any, item: any) => (
        <button
          onClick={() => handleDeleteOrder(item.id)}
          className="px-3 py-1 bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white rounded border border-red-600/20 hover:border-red-600 text-xs font-semibold transition"
        >
          Eliminar
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader 
        title="Finanzas y Ventas"
        subtitle="Monitorea los ingresos de la tienda SCW."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-zinc-900 border border-white/10 rounded-xl p-6">
          <p className="text-zinc-400 text-sm font-bold uppercase tracking-widest">Ingresos Totales (Completados)</p>
          <p className="text-3xl font-black text-white mt-2">
            ${orders.filter(o => o.status === 'COMPLETED' || o.status === 'PAID').reduce((acc, curr) => acc + parseFloat(curr.total_amount), 0).toFixed(2)}
          </p>
        </div>
        <div className="bg-zinc-900 border border-white/10 rounded-xl p-6">
          <p className="text-zinc-400 text-sm font-bold uppercase tracking-widest">Órdenes Pendientes</p>
          <p className="text-3xl font-black text-yellow-500 mt-2">
            {orders.filter(o => o.status === 'PENDING').length}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-zinc-500 py-8">Cargando datos financieros...</div>
      ) : (
        <AdminTable columns={columns} data={orders} />
      )}
    </div>
  );
}
