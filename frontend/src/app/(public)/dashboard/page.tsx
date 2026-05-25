"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { LogOut, Ticket, Settings, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { paymentService } from '@/services/payments.services';

export default function UserDashboard() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'settings'>('orders');

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated) {
      router.push('/login');
    } else {
      fetchOrders();
    }
  }, [isAuthenticated, router]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await paymentService.getMyOrders();
      setOrders(data);
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (!mounted || !isAuthenticated) return null;

  return (
    <div className="bg-black min-h-screen text-white pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header Perfil */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8 bg-zinc-900/50 p-8 rounded-2xl border border-white/10 mb-8">
          <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center text-4xl font-black text-zinc-500 border-2 border-white/20">
            {user?.first_name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl font-bold uppercase tracking-tight">{user?.first_name} {user?.last_name}</h1>
            <p className="text-zinc-400 mt-1">{user?.email}</p>
            <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-3">
              <span className="px-3 py-1 bg-white/10 rounded text-xs font-bold uppercase tracking-widest text-zinc-300">
                Rol: {user?.role}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-3 w-full md:w-auto">
            {(user?.role === 'SUPERADMIN' || user?.role === 'ADMIN') && (
              <Link 
                href="/admin"
                className="flex items-center justify-center gap-2 bg-white text-black font-bold uppercase text-sm tracking-widest px-4 py-2 rounded-lg hover:bg-zinc-200 transition-colors w-full"
              >
                Ir a Panel Admin
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 text-red-500 hover:text-red-400 font-bold uppercase text-sm tracking-widest px-4 py-2 rounded-lg hover:bg-red-500/10 transition-colors w-full border border-red-500/20"
            >
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-white/10 mb-8 overflow-x-auto pb-2">
          <button 
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-4 py-2 font-bold uppercase tracking-widest text-sm transition-colors whitespace-nowrap ${activeTab === 'orders' ? 'text-white border-b-2 border-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <ShoppingBag className="w-4 h-4" /> Mis Compras
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2 font-bold uppercase tracking-widest text-sm transition-colors whitespace-nowrap ${activeTab === 'settings' ? 'text-white border-b-2 border-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Settings className="w-4 h-4" /> Configuración de Cuenta
          </button>
        </div>

        {/* Contenido */}
        {activeTab === 'orders' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <h2 className="text-2xl font-bold uppercase tracking-tight mb-6">Historial de Compras</h2>
            
            {loading ? (
              <div className="text-zinc-500 py-8 text-center animate-pulse">Cargando compras...</div>
            ) : orders.length === 0 ? (
              <div className="bg-zinc-900/50 border border-white/10 p-12 rounded-xl text-center">
                <Ticket className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold uppercase tracking-tight mb-2 text-zinc-400">Aún no tienes compras</h3>
                <p className="text-zinc-500 mb-6 max-w-md mx-auto">Cuando adquieras boletos para eventos o mercancía oficial, aparecerán aquí.</p>
                <Link href="/eventos" className="inline-block bg-white text-black font-bold uppercase tracking-widest px-6 py-3 rounded hover:bg-zinc-200 transition-colors">
                  Ver Eventos
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="bg-zinc-900 border border-white/10 rounded-xl overflow-hidden">
                    <div className="bg-black/50 p-4 border-b border-white/5 flex flex-wrap justify-between items-center gap-4">
                      <div>
                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Orden #{order.id}</p>
                        <p className="text-zinc-300 text-sm">{new Date(order.created_at).toLocaleDateString()} a las {new Date(order.created_at).toLocaleTimeString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Total</p>
                        <p className="text-white font-black">${parseFloat(order.total_amount).toFixed(2)} MXN</p>
                      </div>
                      <div>
                        <span className={`px-3 py-1 rounded text-xs font-bold tracking-widest uppercase inline-block ${
                          order.status === 'COMPLETED' ? 'bg-green-500/20 text-green-500 border border-green-500/30' : 
                          order.status === 'SHIPPED' ? 'bg-blue-500/20 text-blue-500 border border-blue-500/30' : 
                          order.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30' : 
                          order.status === 'CANCELLED' ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 
                          'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30'
                        }`}>
                          {order.status === 'PAID' ? 'PAGADO (BOLETOS ENVIADOS)' : order.status === 'PENDING' ? 'PENDIENTE DE PAGO' : order.status}
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="space-y-3">
                        {order.items?.map((item: any) => (
                          <div key={item.id} className="flex justify-between items-center bg-white/5 p-3 rounded border border-white/5">
                            <div>
                              <p className="font-bold text-white text-sm">{item.product_name}</p>
                              {item.size && <p className="text-zinc-500 text-xs mt-1">Talla/Asiento: {item.size}</p>}
                            </div>
                            <div className="text-right">
                              <p className="text-zinc-400 text-sm">{item.quantity} x ${parseFloat(item.price).toFixed(2)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {order.status === 'PAID' && (
                        <div className="mt-4 pt-4 border-t border-white/5 text-sm text-zinc-400">
                          <Ticket className="w-4 h-4 inline mr-2 text-emerald-500" />
                          Tus códigos QR han sido enviados a <strong className="text-white">{order.contact_email}</strong>. Muéstralos en la entrada.
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'settings' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl bg-zinc-900 border border-white/10 rounded-xl p-8">
            <h2 className="text-2xl font-bold uppercase tracking-tight mb-6">Datos Personales</h2>
            <p className="text-zinc-400 mb-8">Para actualizar tu correo o contraseña, por favor contacta al administrador, ya que estos datos son fundamentales para la seguridad de tu suscripción.</p>
            
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Nombre</label>
                <input type="text" disabled value={user?.first_name || ''} className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-zinc-400 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Apellidos</label>
                <input type="text" disabled value={user?.last_name || ''} className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-zinc-400 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Correo Electrónico</label>
                <input type="email" disabled value={user?.email || ''} className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-zinc-400 cursor-not-allowed" />
              </div>
            </div>
            
            <div className="mt-8 pt-8 border-t border-white/10">
              <button disabled className="bg-white/10 text-zinc-500 cursor-not-allowed font-bold uppercase tracking-widest px-6 py-3 rounded-lg w-full">
                Actualizar Datos (Próximamente)
              </button>
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
