"use client";

import { motion } from 'framer-motion';
import { CalendarDays, Trophy, Users, TrendingUp } from 'lucide-react';

const stats = [
  { name: 'Eventos Activos', value: '3', icon: CalendarDays, change: '+1 este mes' },
  { name: 'Luchadores (Roster)', value: '42', icon: Trophy, change: '+5 nuevos' },
  { name: 'Usuarios Totales', value: '1,204', icon: Users, change: '+12% vs mes anterior' },
  { name: 'Ventas Mensuales', value: '$12,450', icon: TrendingUp, change: '+8% vs mes anterior' },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Resumen General</h1>
        <p className="text-zinc-400 mt-2">Bienvenido al centro de mando de SCW.</p>
      </div>

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
                <span className="text-green-400">{stat.change}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Placeholder for future charts or lists */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}
          className="glass-panel p-6 min-h-[300px]"
        >
          <h3 className="text-lg font-medium text-white mb-4">Próximos Eventos</h3>
          <div className="flex items-center justify-center h-48 text-zinc-600 border border-dashed border-zinc-800 rounded-xl">
            (Lista de eventos conectada a la API)
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}
          className="glass-panel p-6 min-h-[300px]"
        >
          <h3 className="text-lg font-medium text-white mb-4">Actividad Reciente</h3>
          <div className="flex items-center justify-center h-48 text-zinc-600 border border-dashed border-zinc-800 rounded-xl">
            (Logs y registros de la plataforma)
          </div>
        </motion.div>
      </div>
    </div>
  );
}
