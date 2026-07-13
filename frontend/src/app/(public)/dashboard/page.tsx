"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { LogOut, Ticket, Settings, ShoppingBag, Swords, CreditCard, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { paymentService } from '@/services/payments.services';
import api from '@/services/api';
import QRCode from 'react-qr-code';

export default function UserDashboard() {
  const { user, isAuthenticated, isLoading, logout, updateUser } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'settings' | 'dojo'>('orders');
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab && ['orders', 'settings', 'dojo'].includes(tab)) {
        setActiveTab(tab as any);
      }
    }
  }, []);
  const [studentData, setStudentData] = useState<any>(null);
  const [tuitionFee, setTuitionFee] = useState<string>('0.00');
  const [enrollmentFee, setEnrollmentFee] = useState<string>('0.00');
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
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!mounted || isLoading) return;
    
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
  }, [isAuthenticated, router, user, mounted, isLoading]);

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
        if (res.data.enrollment_fee) {
          setEnrollmentFee(res.data.enrollment_fee);
        }
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

  const shareQRImage = async (item: any) => {
    try {
      const svg = document.getElementById(`qr-${item.id}`);
      if (!svg) return;
      
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
      });
      
      // Añadir margen blanco alrededor del QR
      canvas.width = img.width + 40;
      canvas.height = img.height + 40;
      
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20);
      }
      
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/png"));
      if (!blob) return;
      
      const file = new File([blob], `Boleto-SCW-${item.id}.png`, { type: "image/png" });
      
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Boleto SCW - ${item.product_name}`,
          text: `¡Aquí está mi boleto de SCW para ${item.product_name}! Este código es mi acceso al evento.`,
          files: [file]
        });
      } else {
        // Fallback: Descargar la imagen
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Intentar abrir Whatsapp de todos modos sin la imagen
        const textToShare = encodeURIComponent(`¡Aquí está mi boleto de SCW para ${item.product_name}! Acabo de descargar la imagen en mi dispositivo para enviarla.`);
        window.open(`https://wa.me/?text=${textToShare}`, '_blank');
      }
    } catch (error) {
      console.error("Error sharing QR:", error);
      alert("Hubo un error al intentar compartir la imagen. Asegúrate de darle permisos a tu navegador.");
    }
  };

  if (!mounted || isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-t-2 border-red-500 rounded-full animate-spin mb-4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen text-white pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header Perfil */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 pt-4">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-zinc-800 to-zinc-900 flex items-center justify-center text-2xl sm:text-3xl font-black text-white shadow-xl border border-white/10 shrink-0">
              {user?.first_name?.charAt(0) || 'U'}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight leading-none text-white mb-1">{user?.first_name} {user?.last_name}</h1>
              <p className="text-zinc-400 text-sm">{user?.email}</p>
            </div>
          </div>
          
          <div className="flex gap-3 w-full md:w-auto mt-2 md:mt-0">
            {['SUPERADMIN', 'ADMIN', 'STAFF', 'REPORTER'].includes(user?.role || '') && (
              <Link 
                href="/admin"
                className="flex-1 md:flex-none flex items-center justify-center bg-white text-black font-bold uppercase text-xs tracking-widest px-5 py-3 rounded-xl hover:bg-zinc-200 transition-colors shadow-lg shadow-white/5"
              >
                Panel Admin
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 text-zinc-300 hover:text-white font-bold uppercase text-xs tracking-widest px-5 py-3 rounded-xl bg-zinc-900 border border-white/10 hover:border-white/20 hover:bg-zinc-800 transition-all shadow-lg shadow-black/50"
            >
              <LogOut className="w-4 h-4" />
              Salir
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8 pb-10">
          {/* Navegación Lateral / Lista de Botones */}
          <div className="w-full md:w-64 shrink-0 flex flex-col gap-2">
            <button 
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-3 px-5 py-4 font-bold uppercase tracking-widest text-xs sm:text-sm transition-all rounded-2xl w-full text-left ${activeTab === 'orders' ? 'bg-white text-black shadow-xl shadow-white/10' : 'bg-zinc-900/40 text-zinc-400 hover:bg-zinc-900 hover:text-white border border-white/5'}`}
            >
              <ShoppingBag className="w-5 h-5 shrink-0" /> 
              <span>Mis Compras</span>
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-3 px-5 py-4 font-bold uppercase tracking-widest text-xs sm:text-sm transition-all rounded-2xl w-full text-left ${activeTab === 'settings' ? 'bg-white text-black shadow-xl shadow-white/10' : 'bg-zinc-900/40 text-zinc-400 hover:bg-zinc-900 hover:text-white border border-white/5'}`}
            >
              <Settings className="w-5 h-5 shrink-0" /> 
              <span>Configuración</span>
            </button>
            
            {studentData && (
              <button 
                onClick={() => setActiveTab('dojo')}
                className={`flex items-center gap-3 px-5 py-4 font-bold uppercase tracking-widest text-xs sm:text-sm transition-all rounded-2xl w-full text-left ${activeTab === 'dojo' ? 'bg-red-600 text-white shadow-xl shadow-red-600/20 border-red-500' : 'bg-zinc-900/40 text-red-500/60 hover:bg-zinc-900 hover:text-red-400 border border-white/5'}`}
              >
                <Swords className="w-5 h-5 shrink-0" /> 
                <span>SCW DOJO</span>
              </button>
            )}
          </div>

          {/* Contenido principal */}
          <div className="flex-1 min-w-0">
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
                  const hasTickets = order.items?.some((item: any) => item.event !== null && item.event !== undefined);
                  const hasRaffles = order.items?.some((item: any) => item.event === null && item.product === null);
                  const hasMerch = order.items?.some((item: any) => item.product !== null && item.product !== undefined);
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
                      <div className="space-y-4">
                        {order.items?.map((item: any) => {
                          const isTicket = item.event !== null && item.event !== undefined;
                          return (
                          <div key={item.id} className="flex flex-col bg-white/5 p-4 rounded-lg border border-white/5">
                            <div className="flex justify-between items-center w-full mb-2">
                              <div>
                                <p className="font-bold text-white text-sm">{item.product_name}</p>
                                {item.size && <p className="text-zinc-500 text-xs mt-1">Talla/Asiento: {item.size}</p>}
                              </div>
                              <div className="text-right">
                                <p className="text-zinc-400 text-sm">{item.quantity} x ${parseFloat(item.price).toFixed(2)}</p>
                              </div>
                            </div>
                            
                            {isTicket && order.status === 'PAID' && item.ticket_hash && (
                              <div className="mt-4 bg-white p-4 rounded-xl flex flex-col items-center self-center w-full max-w-xs">
                                <div className="bg-white p-2 rounded">
                                  <QRCode
                                    id={`qr-${item.id}`}
                                    value={JSON.stringify({ scw: true, order: order.id, item: item.id, code: item.ticket_hash })}
                                    size={160}
                                  />
                                </div>
                                <p className="text-black font-bold mt-3 text-xs uppercase tracking-widest text-center">Código de Acceso</p>
                                <button
                                  onClick={() => shareQRImage(item)}
                                  className="mt-4 flex items-center justify-center gap-2 bg-[#25D366] text-white px-4 py-2.5 rounded-lg font-bold uppercase tracking-widest text-xs hover:bg-[#128C7E] transition-colors w-full cursor-pointer"
                                >
                                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-share-2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                                  Compartir QR
                                </button>
                              </div>
                            )}
                          </div>
                        )})}
                      </div>
                      
                      {order.status === 'PAID' && hasTickets && (
                        <div className="mt-4 pt-4 border-t border-white/5 text-sm text-zinc-400">
                          <Ticket className="w-4 h-4 inline mr-2 text-emerald-500" />
                          Tus códigos QR han sido enviados a <strong className="text-white">{order.contact_email}</strong>. Muéstralos en la entrada.
                        </div>
                      )}
                      
                      {order.status === 'PAID' && hasRaffles && (
                        <div className="mt-4 pt-4 border-t border-white/5 text-sm text-zinc-400">
                          ¡Tus boletos de rifa están confirmados! Los números que adquiriste ya están registrados a tu nombre.
                        </div>
                      )}
                      
                      {order.status === 'PAID' && hasMerch && (
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl space-y-8">
            
            {/* ID Card (Credencial Digital) */}
            <div className="flex flex-col items-center gap-6 py-4">
              
              {/* Info */}
              <div className="text-center w-full">
                <p className="text-2xl sm:text-3xl font-black uppercase text-white truncate w-full mb-4">
                  {user?.first_name} {user?.last_name}
                </p>
                <div className="flex justify-center">
                   <span className={`px-4 py-2 rounded-lg text-xs font-bold tracking-widest uppercase inline-flex items-center gap-2 border ${
                      studentData.payment_status === 'PAID' ? 'bg-green-500/10 text-green-400 border-green-500/30' :
                      studentData.payment_status === 'EXPIRING' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'
                    }`}>
                      {studentData.payment_status === 'PAID' ? 'AL CORRIENTE' :
                       studentData.payment_status === 'EXPIRING' ? 'POR VENCER' : 'DEBE MENSUALIDAD'}
                    </span>
                </div>
              </div>

              {/* Big QR Code */}
              <div className="flex flex-col items-center shrink-0">
                <div className="bg-white p-5 sm:p-6 rounded-3xl">
                  <QRCode
                    id="dojo-qr"
                    value={JSON.stringify({ scw: true, dojo_student: true, id: studentData.id })}
                    size={220}
                    style={{ height: "auto", maxWidth: "100%", width: "220px" }}
                  />
                </div>
                <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-widest mt-5">
                  Escanea tu QR en recepción
                </p>
              </div>
            </div>
            
            {/* Payment Section */}
            <div className="bg-zinc-900 border border-white/10 rounded-xl p-8">
              <h2 className="text-2xl font-bold uppercase tracking-tight mb-6">Administración de Colegiatura</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-black/40 p-5 rounded-lg border border-white/5">
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">Próximo Vencimiento</p>
                  <p className="text-white font-bold text-lg">
                    {studentData.payment_due_date ? new Date(studentData.payment_due_date + 'T12:00:00').toLocaleDateString('es-MX', {day: '2-digit', month: 'short', year: 'numeric'}) : 'No registrado'}
                  </p>
                </div>
                
                {parseFloat(studentData.outstanding_balance || '0') > 0 && (
                  <div className="bg-red-500/10 p-5 rounded-lg border border-red-500/20">
                    <p className="text-red-400/80 text-xs font-bold uppercase tracking-widest mb-2">Saldo Pendiente</p>
                    <p className="text-red-500 text-2xl font-black">
                      ${parseFloat(studentData.outstanding_balance).toFixed(2)} MXN
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-black/30 border border-white/5 p-6 rounded-lg text-center flex flex-col items-center">
                <p className="text-zinc-400 mb-6 text-sm max-w-lg">
                  Mantén tu colegiatura al día para seguir entrenando y participar en los eventos de SCW. Si prefieres pagar en efectivo, solo muestra tu código QR en taquilla.
                </p>
                
                <div className="flex flex-col items-center gap-4 w-full">
                  {studentData.last_payment_date === null && parseFloat(studentData.outstanding_balance || '0') > parseFloat(tuitionFee || '0') ? (
                    <div className="mb-2">
                      <span className="text-4xl font-black text-white">${parseFloat(studentData.outstanding_balance).toFixed(2)} <span className="text-base text-zinc-500 font-bold">MXN</span></span>
                      <p className="text-xs text-zinc-400 mt-2">Incluye inscripción (${enrollmentFee}) y primera mensualidad (${tuitionFee})</p>
                    </div>
                  ) : (
                    <span className="text-4xl font-black text-white">${tuitionFee} <span className="text-base text-zinc-500 font-bold">MXN / mes</span></span>
                  )}
                  
                  {studentData.payment_status !== 'PAID' ? (
                    <button 
                      onClick={handlePayTuition}
                      disabled={payingTuition}
                      className="mt-4 flex items-center justify-center gap-3 w-full max-w-sm bg-[#009EE3] hover:bg-[#008ACA] text-white font-black uppercase tracking-widest py-4 px-6 rounded-xl transition-all disabled:opacity-50 text-sm"
                    >
                      {payingTuition ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <CreditCard className="w-5 h-5" />
                          Pagar con Mercado Pago
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="mt-4 flex items-center justify-center w-full max-w-sm bg-green-500/10 border border-green-500/20 text-green-500 font-bold uppercase tracking-widest py-4 px-6 rounded-xl text-sm">
                      ¡Pago al corriente!
                    </div>
                  )}
                  <p className="text-xs text-zinc-500 mt-2">
                    Pago seguro. Puedes pagar con Tarjeta, Transferencia o Efectivo (OXXO).
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
        
          </div>
        </div>

      </div>
    </div>
  );
}
