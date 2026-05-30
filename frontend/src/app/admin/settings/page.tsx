"use client";

import { useEffect, useState } from 'react';
import { adminService } from '@/services/admin.services';
import { 
  Settings, 
  Key, 
  Mail, 
  MessageSquare, 
  Save, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Percent,
  Sliders,
  Server,
  ToggleLeft,
  ToggleRight,
  DollarSign
} from 'lucide-react';

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<'mercadopago' | 'email' | 'whatsapp'>('mercadopago');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    mercadopago_public_key: '',
    mercadopago_access_token: '',
    mercadopago_commission_rate: 0.0401,
    email_host: 'smtp.gmail.com',
    email_port: 587,
    email_use_tls: true,
    email_host_user: '',
    email_host_password: '',
    default_from_email: 'SCW Boletos <boletos.scw@gmail.com>',
    whatsapp_service_url: 'https://scw-whatsapp.onrender.com',
    whatsapp_enabled: true,
    tuition_fee: 500.00,
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await adminService.getSettings();
        if (data) {
          setFormData({
            mercadopago_public_key: data.mercadopago_public_key || '',
            mercadopago_access_token: data.mercadopago_access_token || '',
            mercadopago_commission_rate: data.mercadopago_commission_rate !== undefined ? Number(data.mercadopago_commission_rate) : 0.0401,
            email_host: data.email_host || 'smtp.gmail.com',
            email_port: data.email_port !== undefined ? Number(data.email_port) : 587,
            email_use_tls: data.email_use_tls !== undefined ? Boolean(data.email_use_tls) : true,
            email_host_user: data.email_host_user || '',
            email_host_password: data.email_host_password || '',
            default_from_email: data.default_from_email || 'SCW Boletos <boletos.scw@gmail.com>',
            whatsapp_service_url: data.whatsapp_service_url || 'https://scw-whatsapp.onrender.com',
            whatsapp_enabled: data.whatsapp_enabled !== undefined ? Boolean(data.whatsapp_enabled) : true,
            tuition_fee: data.tuition_fee !== undefined ? Number(data.tuition_fee) : 500.00,
          });
        }
      } catch (error) {
        console.error("Error loading system settings:", error);
        showNotification('error', 'No se pudieron cargar los ajustes de la base de datos.');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCheckboxChange = (name: string, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotification(null);

    try {
      await adminService.updateSettings(formData);
      showNotification('success', '¡Configuraciones actualizadas con éxito!');
    } catch (error) {
      console.error("Error saving settings:", error);
      showNotification('error', 'Error al guardar las configuraciones en el servidor.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
        <Loader2 className="w-10 h-10 animate-spin text-red-500 mb-4" />
        <p className="uppercase tracking-widest text-xs font-bold font-mono">Cargando Ajustes del Sistema...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-16">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <Settings className="w-8 h-8 text-red-500" />
            Configuración del Sistema
          </h1>
          <p className="text-zinc-400 mt-2">
            Administra credenciales, pasarelas de pago, correos de boletos y notificaciones en tiempo real.
          </p>
        </div>
      </div>

      {/* Notificación Flotante/Alerta */}
      {notification && (
        <div className={`p-4 rounded-xl flex items-center gap-3 border transition-all duration-300 ${
          notification.type === 'success' 
            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400' 
            : 'bg-red-950/40 border-red-500/30 text-red-400'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="text-sm font-semibold">{notification.message}</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar / Tabs */}
        <div className="w-full md:w-64 flex flex-col gap-2">
          <button
            onClick={() => setActiveTab('mercadopago')}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all border ${
              activeTab === 'mercadopago'
                ? 'bg-gradient-to-r from-red-600 to-red-700 text-white border-red-500 shadow-lg shadow-red-600/10'
                : 'bg-zinc-950/40 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-900/60'
            }`}
          >
            <Key className="w-5 h-5" />
            Mercado Pago
          </button>
          
          <button
            onClick={() => setActiveTab('email')}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all border ${
              activeTab === 'email'
                ? 'bg-gradient-to-r from-red-600 to-red-700 text-white border-red-500 shadow-lg shadow-red-600/10'
                : 'bg-zinc-950/40 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-900/60'
            }`}
          >
            <Mail className="w-5 h-5" />
            Servicio de Correo
          </button>

          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all border ${
              activeTab === 'whatsapp'
                ? 'bg-gradient-to-r from-red-600 to-red-700 text-white border-red-500 shadow-lg shadow-red-600/10'
                : 'bg-zinc-950/40 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-900/60'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            WhatsApp
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          <form onSubmit={handleSubmit} className="bg-zinc-950/60 border border-white/10 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl backdrop-blur-md">
            
            {/* TAB: MERCADO PAGO */}
            {activeTab === 'mercadopago' && (
              <div className="space-y-6">
                <div className="border-b border-white/10 pb-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Key className="text-red-500 w-5 h-5" />
                    Credenciales de Mercado Pago
                  </h3>
                  <p className="text-zinc-500 text-sm mt-1">
                    Configura las claves de producción o sandbox para procesar la venta de boletos e inscripciones VIP.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-zinc-400 text-sm font-bold uppercase tracking-wider mb-2">Clave Pública (Public Key)</label>
                    <input
                      type="text"
                      name="mercadopago_public_key"
                      value={formData.mercadopago_public_key}
                      onChange={handleInputChange}
                      placeholder="APP_USR-..."
                      className="w-full bg-zinc-900/80 border border-white/10 hover:border-white/20 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none rounded-xl px-4 py-3 text-white transition-all text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 text-sm font-bold uppercase tracking-wider mb-2">Token de Acceso (Access Token)</label>
                    <input
                      type="password"
                      name="mercadopago_access_token"
                      value={formData.mercadopago_access_token}
                      onChange={handleInputChange}
                      placeholder="APP_USR-..."
                      className="w-full bg-zinc-900/80 border border-white/10 hover:border-white/20 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none rounded-xl px-4 py-3 text-white transition-all text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 text-sm font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Percent className="w-4 h-4 text-red-500" />
                      Porcentaje de Comisión Extra
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.0001"
                        min="0"
                        max="0.5"
                        name="mercadopago_commission_rate"
                        value={formData.mercadopago_commission_rate}
                        onChange={handleInputChange}
                        className="w-full bg-zinc-900/80 border border-white/10 hover:border-white/20 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none rounded-xl px-4 py-3 text-white transition-all text-sm pl-10"
                      />
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-bold">%</span>
                    </div>
                    <p className="text-zinc-500 text-xs mt-1.5">
                      Valor decimal que se le cobra adicionalmente al cliente por transacción. Ej: 0.0401 equivale a 4.01% (3.49% MP fee + IVA).
                    </p>
                  </div>

                  <div className="pt-4 border-t border-white/10">
                    <label className="block text-zinc-400 text-sm font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-green-500" />
                      Costo de Mensualidad del Dojo
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-bold">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        name="tuition_fee"
                        value={formData.tuition_fee}
                        onChange={handleInputChange}
                        className="w-full bg-zinc-900/80 border border-white/10 hover:border-white/20 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none rounded-xl px-4 py-3 text-white transition-all text-sm pl-8"
                      />
                    </div>
                    <p className="text-zinc-500 text-xs mt-1.5">
                      Este es el monto base (en MXN) que se le cobrará a los alumnos cada mes a través de su panel.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: EMAIL SMTP */}
            {activeTab === 'email' && (
              <div className="space-y-6">
                <div className="border-b border-white/10 pb-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Mail className="text-red-500 w-5 h-5" />
                    Servidor de Correo Electrónico (SMTP)
                  </h3>
                  <p className="text-zinc-500 text-sm mt-1">
                    Credenciales para automatizar el envío de los correos electrónicos con los boletos QR adjuntos.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-400 text-sm font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Server className="w-4 h-4 text-red-500" />
                      Servidor SMTP
                    </label>
                    <input
                      type="text"
                      name="email_host"
                      value={formData.email_host}
                      onChange={handleInputChange}
                      placeholder="smtp.gmail.com"
                      className="w-full bg-zinc-900/80 border border-white/10 hover:border-white/20 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none rounded-xl px-4 py-3 text-white transition-all text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 text-sm font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-red-500" />
                      Puerto SMTP
                    </label>
                    <input
                      type="number"
                      name="email_port"
                      value={formData.email_port}
                      onChange={handleInputChange}
                      placeholder="587"
                      className="w-full bg-zinc-900/80 border border-white/10 hover:border-white/20 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none rounded-xl px-4 py-3 text-white transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-400 text-sm font-bold uppercase tracking-wider mb-2">Usuario SMTP (Email)</label>
                    <input
                      type="email"
                      name="email_host_user"
                      value={formData.email_host_user}
                      onChange={handleInputChange}
                      placeholder="ejemplo@gmail.com"
                      className="w-full bg-zinc-900/80 border border-white/10 hover:border-white/20 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none rounded-xl px-4 py-3 text-white transition-all text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 text-sm font-bold uppercase tracking-wider mb-2">Contraseña SMTP / De Aplicación</label>
                    <input
                      type="password"
                      name="email_host_password"
                      value={formData.email_host_password}
                      onChange={handleInputChange}
                      placeholder="••••••••••••••••"
                      className="w-full bg-zinc-900/80 border border-white/10 hover:border-white/20 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none rounded-xl px-4 py-3 text-white transition-all text-sm font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-sm font-bold uppercase tracking-wider mb-2">Remitente por Defecto (Default From Email)</label>
                  <input
                    type="text"
                    name="default_from_email"
                    value={formData.default_from_email}
                    onChange={handleInputChange}
                    placeholder="SCW Pro Wrestling <boletos.scw@gmail.com>"
                    className="w-full bg-zinc-900/80 border border-white/10 hover:border-white/20 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none rounded-xl px-4 py-3 text-white transition-all text-sm"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-xl border border-white/5">
                  <div>
                    <label className="block text-white text-sm font-bold uppercase tracking-wider">Usar Seguridad TLS</label>
                    <p className="text-zinc-500 text-xs mt-1">Obligatorio para la gran mayoría de servidores SMTP como Gmail o Outlook.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCheckboxChange('email_use_tls', !formData.email_use_tls)}
                    className="text-zinc-400 hover:text-white transition-colors"
                  >
                    {formData.email_use_tls ? (
                      <ToggleRight className="w-12 h-12 text-red-500" />
                    ) : (
                      <ToggleLeft className="w-12 h-12 text-zinc-600" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* TAB: WHATSAPP */}
            {activeTab === 'whatsapp' && (
              <div className="space-y-6">
                <div className="border-b border-white/10 pb-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <MessageSquare className="text-red-500 w-5 h-5" />
                    Configuración de WhatsApp API
                  </h3>
                  <p className="text-zinc-500 text-sm mt-1">
                    Controla el microservicio que envía notificaciones de mensualidad, recordatorios de pago y alertas a tus alumnos registrados.
                  </p>
                </div>

                <div>
                  <label className="block text-zinc-400 text-sm font-bold uppercase tracking-wider mb-2">URL Base del Microservicio</label>
                  <input
                    type="url"
                    name="whatsapp_service_url"
                    value={formData.whatsapp_service_url}
                    onChange={handleInputChange}
                    placeholder="https://scw-whatsapp.onrender.com"
                    className="w-full bg-zinc-900/80 border border-white/10 hover:border-white/20 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none rounded-xl px-4 py-3 text-white transition-all text-sm font-mono"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-xl border border-white/5">
                  <div>
                    <label className="block text-white text-sm font-bold uppercase tracking-wider">Habilitar Mensajes Automáticos</label>
                    <p className="text-zinc-500 text-xs mt-1">Si está inactivo, el sistema no intentará disparar peticiones al microservicio.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCheckboxChange('whatsapp_enabled', !formData.whatsapp_enabled)}
                    className="text-zinc-400 hover:text-white transition-colors"
                  >
                    {formData.whatsapp_enabled ? (
                      <ToggleRight className="w-12 h-12 text-red-500" />
                    ) : (
                      <ToggleLeft className="w-12 h-12 text-zinc-600" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* BOTÓN GUARDAR (PIE DEL FORMULARIO) */}
            <div className="border-t border-white/10 pt-6 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center justify-center gap-2.5 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-800/40 text-white rounded-xl text-sm font-bold uppercase tracking-widest transition-all duration-300 shadow-lg shadow-red-600/20 active:scale-95 disabled:scale-100 disabled:cursor-not-allowed w-full sm:w-auto"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Guardando Cambios...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Guardar Configuración
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
