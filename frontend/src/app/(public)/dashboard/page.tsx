"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { LogOut, Ticket, Settings, ShoppingBag, Swords, CreditCard, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { paymentService } from '@/services/payments.services';
import api from '@/services/api';

export default function UserDashboard() {
  const { user, isAuthenticated, logout, updateUser } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'settings' | 'dojo'>('orders');
  
  const [studentData, setStudentData] = useState<any>(null);
  const [tuitionFee, setTuitionFee] = useState<string>('0.00');
  const [payingTuition, setPayingTuition] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [cancellingSub, setCancellingSub] = useState(false);

  // Profile state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipcode, setZipcode] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated) {
      router.push('/login');
    } else {
      fetchOrders();
      fetchStudentData();
      fetchSubscription();
      if (user) {
        setFirstName(user.first_name || '');
        setLastName(user.last_name || '');
        setAddress(user.address || '');
        setCity(user.city || '');
        setState(user.state || '');
        setZipcode(user.zipcode || '');
      }
    }
  }, [isAuthenticated, router, user]);

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

  const fetchStudentData = async () => {
    try {
      const res = await api.get('/students/enrollments/my/');
      if (res.data && res.data.enrollment) {
        setStudentData(res.data.enrollment);
        setTuitionFee(res.data.tuition_fee);
      }
    } catch (error) {
      // 404 means not a student, ignore.
    }
  };

  const fetchSubscription = async () => {
    try {
      const res = await api.get('/premium/me/');
      if (res.data && res.data.is_active) {
        setSubscription(res.data);
      } else {
        setSubscription(null);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('¿Estás seguro de que deseas cancelar tu membresía Premium? Perderás acceso a todo el contenido exclusivo.')) return;
    setCancellingSub(true);
    try {
      await api.post('/premium/cancel/');
      setSubscription(null);
      alert('Suscripción cancelada exitosamente.');
      if (user) {
        updateUser({ ...user, role: 'USER' });
      }
    } catch (error: any) {
      alert(error?.response?.data?.error || 'Error al cancelar la suscripción.');
    } finally {
      setCancellingSub(false);
    }
  };

  const handlePayTuition = async () => {
    if (!studentData) return;
    setPayingTuition(true);
    try {
      const res = await api.post(`/students/enrollments/${studentData.id}/pay_tuition/`);
      if (res.data.init_point) {
        window.location.href = res.data.init_point;
      }
    } catch (error: any) {
      console.error(error);
      alert(error?.response?.data?.error || "Error al procesar el pago.");
      setPayingTuition(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingProfile(true);
    setProfileMessage({ type: '', text: '' });
    
    try {
      const res = await api.patch('/auth/profile/', {
        first_name: firstName,
        last_name: lastName,
        address,
        city,
        state,
        zipcode
      });
      
      updateUser({
        first_name: res.data.first_name,
        last_name: res.data.last_name,
        address: res.data.address,
        city: res.data.city,
        state: res.data.state,
        zipcode: res.data.zipcode
      });
      
      setProfileMessage({ type: 'success', text: 'Datos actualizados correctamente.' });
      setTimeout(() => setProfileMessage({ type: '', text: '' }), 3000);
    } catch (error: any) {
      console.error(error);
      setProfileMessage({ 
        type: 'error', 
        text: error?.response?.data?.error || 'Error al actualizar los datos.' 
      });
    } finally {
      setUpdatingProfile(false);
    }
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
          
          {studentData && (
            <button 
              onClick={() => setActiveTab('dojo')}
              className={`flex items-center gap-2 px-4 py-2 font-bold uppercase tracking-widest text-sm transition-colors whitespace-nowrap ${activeTab === 'dojo' ? 'text-red-500 border-b-2 border-red-500' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Swords className="w-4 h-4" /> SCW DOJO
            </button>
          )}
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
                {orders.map((order) => {
                  const hasTickets = order.items?.some((item: any) => item.product_name?.toLowerCase().includes('boleto') || item.product_name?.toLowerCase().includes('entrada'));
                  
                  return (
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
                          order.status === 'DELIVERED' ? 'bg-green-500/20 text-green-500 border border-green-500/30' : 
                          order.status === 'SHIPPED' ? 'bg-blue-500/20 text-blue-500 border border-blue-500/30' : 
                          order.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30' : 
                          order.status === 'CANCELLED' ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 
                          'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30'
                        }`}>
                          {order.status === 'PAID' ? (hasTickets ? 'PAGADO (BOLETOS ENVIADOS)' : 'PAGADO') : 
                           order.status === 'PENDING' ? 'PENDIENTE DE PAGO' : 
                           order.status === 'PROCESSING' ? 'PREPARANDO ENVÍO' :
                           order.status === 'SHIPPED' ? 'ENVIADO' :
                           order.status === 'DELIVERED' ? 'ENTREGADO' :
                           order.status === 'CANCELLED' ? 'CANCELADO' :
                           order.status === 'COMPLETED' ? 'COMPLETADO' : order.status}
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
                      
                      {order.status === 'PAID' && hasTickets && (
                        <div className="mt-4 pt-4 border-t border-white/5 text-sm text-zinc-400">
                          <Ticket className="w-4 h-4 inline mr-2 text-emerald-500" />
                          Tus códigos QR han sido enviados a <strong className="text-white">{order.contact_email}</strong>. Muéstralos en la entrada.
                        </div>
                      )}
                      
                      {order.status === 'PAID' && !hasTickets && (
                        <div className="mt-4 pt-4 border-t border-white/5 text-sm text-zinc-400">
                          Tu pedido está siendo procesado y pronto será preparado para envío.
                        </div>
                      )}
                    </div>
                  </div>
                )})}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'settings' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl bg-zinc-900 border border-white/10 rounded-xl p-8">
            <h2 className="text-2xl font-bold uppercase tracking-tight mb-6">Datos Personales</h2>
            <p className="text-zinc-400 mb-8">Para actualizar tu correo o contraseña, por favor contacta al administrador, ya que estos datos son fundamentales para la seguridad de tu cuenta.</p>
            
            {profileMessage.text && (
              <div className={`p-4 rounded-lg mb-6 text-sm font-bold uppercase tracking-widest border ${
                profileMessage.type === 'success' 
                  ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                  : 'bg-red-500/10 text-red-500 border-red-500/20'
              }`}>
                {profileMessage.text}
              </div>
            )}

            {/* Premium Subscription Info */}
            <div className="bg-black/50 border border-white/5 rounded-xl p-6 mb-8">
              <h3 className="text-lg font-bold uppercase tracking-tight mb-4 text-zinc-300 flex items-center gap-2">
                Estado de Suscripción Premium
              </h3>
              {subscription ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center flex-wrap gap-4">
                    <div>
                      <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Plan Actual</p>
                      <p className="text-white font-bold">{subscription.plan_name}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Válida hasta</p>
                      <p className="text-white font-bold">
                        {subscription.end_date ? new Date(subscription.end_date).toLocaleDateString('es-MX', {day: '2-digit', month: 'short', year: 'numeric'}) : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <span className="px-3 py-1 bg-green-500/20 text-green-500 border border-green-500/30 rounded text-xs font-bold tracking-widest uppercase">
                        ACTIVA
                      </span>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-white/5 text-right">
                    <button
                      onClick={handleCancelSubscription}
                      disabled={cancellingSub}
                      className="text-red-500 hover:text-red-400 font-bold uppercase text-xs tracking-widest px-4 py-2 rounded-lg hover:bg-red-500/10 transition-colors border border-red-500/20 disabled:opacity-50"
                    >
                      {cancellingSub ? 'Cancelando...' : 'Cancelar Suscripción'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-zinc-400 text-sm">
                  <p className="mb-4">No tienes una suscripción Premium activa en este momento.</p>
                  <Link href="/premium" className="bg-e50914 hover:bg-red-700 text-white font-bold uppercase tracking-widest px-6 py-2 rounded transition-colors text-xs inline-block">
                    Obtener Premium
                  </Link>
                </div>
              )}
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Nombre</label>
                <input 
                  type="text" 
                  value={firstName} 
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-white focus:border-white/30 focus:outline-none transition-colors" 
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Apellidos</label>
                <input 
                  type="text" 
                  value={lastName} 
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-white focus:border-white/30 focus:outline-none transition-colors" 
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Correo Electrónico (Solo Lectura)</label>
                <input type="email" disabled value={user?.email || ''} className="w-full bg-black/50 border border-white/5 rounded-lg px-4 py-3 text-zinc-500 cursor-not-allowed" />
              </div>
              
              <div className="pt-6">
                <h3 className="text-lg font-bold uppercase tracking-tight mb-4 text-zinc-300">Datos de Envío Predeterminados</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Dirección (Calle y Número)</label>
                    <input 
                      type="text" 
                      value={address} 
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-white focus:border-white/30 focus:outline-none transition-colors" 
                      placeholder="Ej. Av. Siempre Viva 123"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Ciudad</label>
                      <input 
                        type="text" 
                        value={city} 
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-white focus:border-white/30 focus:outline-none transition-colors" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Estado</label>
                      <input 
                        type="text" 
                        value={state} 
                        onChange={(e) => setState(e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-white focus:border-white/30 focus:outline-none transition-colors" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Código Postal</label>
                    <input 
                      type="text" 
                      value={zipcode} 
                      onChange={(e) => setZipcode(e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-white focus:border-white/30 focus:outline-none transition-colors" 
                    />
                  </div>
                </div>
              </div>
              
              <div className="mt-8 pt-8 border-t border-white/10">
                <button 
                  type="submit" 
                  disabled={updatingProfile}
                  className="bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed font-bold uppercase tracking-widest px-6 py-3 rounded-lg w-full transition-colors flex justify-center items-center gap-2"
                >
                  {updatingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
                  {updatingProfile ? 'Actualizando...' : 'Actualizar Datos'}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {activeTab === 'dojo' && studentData && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl bg-zinc-900 border border-white/10 rounded-xl p-8">
            <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
              <Swords className="w-8 h-8 text-red-500" />
              <div>
                <h2 className="text-2xl font-bold uppercase tracking-tight">Portal del Alumno</h2>
                <p className="text-zinc-400 text-sm">Gestiona tu colegiatura y estado en SCW DOJO.</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-black/50 p-4 rounded-lg border border-white/5">
                <div>
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Estado de Pago</p>
                  <p className={`text-lg font-black mt-1 ${
                    studentData.payment_status === 'PAID' ? 'text-green-500' :
                    studentData.payment_status === 'EXPIRING' ? 'text-yellow-500' : 'text-red-500'
                  }`}>
                    {studentData.payment_status === 'PAID' ? '✅ AL CORRIENTE' :
                     studentData.payment_status === 'EXPIRING' ? '⚠️ POR VENCER' : '🚨 DEBE'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Próximo Vencimiento</p>
                  <p className="text-white font-bold mt-1">
                    {studentData.payment_due_date ? new Date(studentData.payment_due_date + 'T12:00:00').toLocaleDateString('es-MX', {day: '2-digit', month: 'short', year: 'numeric'}) : 'No registrado'}
                  </p>
                </div>
              </div>

              <div className="bg-red-500/5 border border-red-500/20 p-6 rounded-xl text-center">
                <p className="text-zinc-300 mb-4 text-sm">
                  Mantén tu colegiatura al día para seguir entrenando y participar en los próximos eventos de SCW.
                </p>
                <div className="flex flex-col items-center gap-2">
                  <span className="text-3xl font-black text-white">${tuitionFee} <span className="text-sm text-zinc-500 font-medium">MXN / mes</span></span>
                  
                  {studentData.payment_status !== 'PAID' ? (
                    <button 
                      onClick={handlePayTuition}
                      disabled={payingTuition}
                      className="mt-4 flex items-center justify-center gap-2 w-full max-w-sm bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold uppercase tracking-widest py-3 px-6 rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                    >
                      {payingTuition ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <CreditCard className="w-5 h-5" />
                          Pagar Mensualidad
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="mt-4 flex items-center justify-center w-full max-w-sm bg-green-500/10 border border-green-500/20 text-green-500 font-bold uppercase tracking-widest py-3 px-6 rounded-xl text-sm">
                      ¡Pago al corriente!
                    </div>
                  )}
                  <p className="text-xs text-zinc-500 mt-3 flex items-center justify-center gap-1">
                    Pago seguro procesado por Mercado Pago
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
