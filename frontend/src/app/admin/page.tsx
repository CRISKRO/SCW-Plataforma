"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Trophy, Users, TrendingUp, AlertTriangle, Package, Ticket } from 'lucide-react';
import { adminService } from '@/services/admin.services';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { useAuthStore } from '@/store/authStore';
import { canAccessAdminPath } from './permissions';
import Link from 'next/link';

export default function AdminDashboard() {
  const canViewOrders = useAuthStore(state => canAccessAdminPath(state.user?.role, '/admin/orders'));
  const [statsData, setStatsData] = useState({
    active_events: 0,
    roster_count: 0,
    total_users: 0,
    monthly_sales: 0,
    pending_orders_count: 0,
    sales_chart_data: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await adminService.getDashboardStats();
        setStatsData(data);
      } catch (error) {
        console.error("Error fetching stats", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const stats = [
    { name: 'Eventos Activos', value: statsData.active_events.toString(), icon: CalendarDays, change: 'En el sistema' },
    { name: 'Luchadores (Roster)', value: statsData.roster_count.toString(), icon: Trophy, change: 'Activos' },
    { name: 'Usuarios Totales', value: statsData.total_users.toString(), icon: Users, change: 'Registrados' },
    { name: 'Ventas Mensuales', value: `$${statsData.monthly_sales.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, icon: TrendingUp, change: 'Mes actual' },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Resumen General"
        subtitle="Bienvenido al centro de mando de SCW."
        actionLabel="Ver boletos vendidos"
        actionHref={canViewOrders ? '/admin/orders?view=paid-tickets' : undefined}
        actionIcon={<Ticket className="w-4 h-4" />}
      />

      {loading ? (
        <div className="text-zinc-500">Cargando estadísticas...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="glass-panel p-6"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-zinc-400">{stat.name}</p>
                      <p className="mt-2 text-3xl font-semibold text-white">{stat.value}</p>
                    </div>
                    <div className="p-3 bg-white/10 rounded-xl">
                      <Icon className="w-6 h-6 text-zinc-200" />
                    </div>
                  </div>
                  <div className="mt-4 text-sm text-zinc-500">
                    <span className="text-zinc-500">{stat.change}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}
              className="glass-panel p-6 lg:col-span-2 min-h-[350px] flex flex-col"
            >
              <h3 className="text-lg font-medium text-white mb-6">Ventas de los Últimos 7 Días</h3>
              <div className="flex-1 w-full h-full min-h-[250px]">
                {statsData.sales_chart_data && statsData.sales_chart_data.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={statsData.sales_chart_data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                      <XAxis dataKey="date" stroke="#888" tick={{ fill: '#888' }} axisLine={false} tickLine={false} />
                      <YAxis stroke="#888" tick={{ fill: '#888' }} axisLine={false} tickLine={false} tickFormatter={(value) => `$${value}`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#333', borderRadius: '8px', color: '#fff' }}
                        itemStyle={{ color: '#ef4444' }}
                        formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Ventas']}
                      />
                      <Line type="monotone" dataKey="total" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: '#ef4444', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-zinc-600 border border-dashed border-zinc-800 rounded-xl">
                    No hay datos de ventas recientes.
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}
              className="glass-panel p-6 flex flex-col"
            >
              <div className="flex items-center gap-2 mb-6">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <h3 className="text-lg font-medium text-white">Alertas y Tareas</h3>
              </div>
              
              <div className="space-y-4 flex-1">
                {statsData.pending_orders_count > 0 ? (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl flex items-start gap-4">
                    <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-500">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Pedidos Pendientes</p>
                      <p className="text-zinc-400 text-sm mt-1">Tienes {statsData.pending_orders_count} pedido(s) pagado(s) que requiere(n) envío.</p>
                      <Link href="/admin/orders" className="text-yellow-500 text-sm font-bold mt-2 inline-block hover:text-yellow-400">
                        Gestionar Pedidos &rarr;
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl flex items-center justify-center h-32">
                    <p className="text-green-500 font-medium text-center">Todo al día.<br/><span className="text-sm font-normal opacity-80">No hay tareas urgentes pendientes.</span></p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}
