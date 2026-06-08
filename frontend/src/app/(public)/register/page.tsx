"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Mail, User, Phone } from 'lucide-react';
import { authService } from '@/services/auth.services';
import api from '@/services/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const envWhatsappUrl = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_WHATSAPP_SERVICE
  ? process.env.NEXT_PUBLIC_WHATSAPP_SERVICE
  : undefined;

const WHATSAPP_SERVICE = envWhatsappUrl || 'https://scw-whatsapp.onrender.com';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    email: '',
    password: '',
    password_confirm: ''
  });
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [verifyCode, setVerifyCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [regMethod, setRegMethod] = useState<'whatsapp' | 'email' | 'none'>('whatsapp');
  const router = useRouter();

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await api.get('/payments/public-key/');
        if (res.data && res.data.registration_method) {
          setRegMethod(res.data.registration_method);
        }
      } catch (err) {
        console.error("No se pudo cargar la config de registro", err);
      }
    };
    fetchConfig();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (formData.password !== formData.password_confirm) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    if (!formData.phone_number) {
      setError('El número de WhatsApp es requerido');
      setLoading(false);
      return;
    }

    try {
      if (regMethod === 'none') {
        // Direct Registration
        await authService.register(formData);
        try {
          await authService.login({ email: formData.email, password: formData.password });
          window.location.href = '/dashboard';
        } catch (loginErr: any) {
          setError("Cuenta creada, pero falló el auto-login: " + (loginErr.response?.data?.detail || loginErr.message));
        }
        return;
      }

      if (regMethod === 'email') {
        await api.post('/auth/send-register-otp/', { email: formData.email });
        setStep('verify');
        return;
      }

      // Default: WhatsApp
      const res = await fetch(`${WHATSAPP_SERVICE}/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formData.phone_number })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar código de WhatsApp.');
      
      setStep('verify');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Error al procesar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (regMethod === 'email') {
        await api.post('/auth/verify-register-otp/', { email: formData.email, code: verifyCode });
      } else {
        const verifyRes = await fetch(`${WHATSAPP_SERVICE}/verify-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: formData.phone_number, code: verifyCode })
        });
        const verifyData = await verifyRes.json();
        if (!verifyRes.ok) throw new Error(verifyData.error || 'Código de WhatsApp incorrecto');
      }

      await authService.register(formData);
      try {
        await authService.login({ email: formData.email, password: formData.password });
        window.location.href = '/dashboard';
      } catch (loginErr: any) {
        setError("Cuenta creada exitosamente, pero falló el auto-login: " + (loginErr.response?.data?.detail || loginErr.message));
      }
    } catch(err: any) {
      setError("Error al registrar: " + (err.response?.data?.error || err.response?.data?.email?.[0] || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4 sm:px-6 lg:px-8 relative overflow-hidden py-12">
      {/* Background glow effects */}
      <div className="absolute top-[10%] right-[-10%] w-96 h-96 bg-zinc-800 rounded-full mix-blend-screen filter blur-[100px] opacity-30"></div>
      <div className="absolute bottom-[10%] left-[-10%] w-96 h-96 bg-zinc-800 rounded-full mix-blend-screen filter blur-[100px] opacity-30"></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-md w-full space-y-6 glass-panel p-8 sm:p-10 z-10"
      >
        <div>
          <h2 className="text-center text-3xl font-extrabold text-white tracking-tight">
            Únete a SCW
          </h2>
          <p className="mt-2 text-center text-sm text-zinc-400">
            Crea tu cuenta profesional
          </p>
        </div>
        
        {step === 'form' ? (
          <form className="mt-6 space-y-5" onSubmit={handleRegister}>
            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 bg-red-900/50 border border-red-500/50 rounded-lg text-red-200 text-sm text-center">
                {error}
              </motion.div>
            )}
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-zinc-500" />
                  </div>
                  <input
                    name="first_name" type="text" required
                    className="appearance-none rounded-xl relative block w-full px-3 py-3 pl-10 border border-zinc-700 bg-zinc-900/50 placeholder-zinc-500 text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-white sm:text-sm transition-all"
                    placeholder="Nombre" value={formData.first_name} onChange={handleChange}
                  />
                </div>
                <div className="relative">
                  <input
                    name="last_name" type="text" required
                    className="appearance-none rounded-xl relative block w-full px-3 py-3 border border-zinc-700 bg-zinc-900/50 placeholder-zinc-500 text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-white sm:text-sm transition-all"
                    placeholder="Apellido" value={formData.last_name} onChange={handleChange}
                  />
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-zinc-500" />
                </div>
                <input
                  name="phone_number" type="tel" required
                  className="appearance-none rounded-xl relative block w-full px-3 py-3 pl-10 border border-zinc-700 bg-zinc-900/50 placeholder-zinc-500 text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-white sm:text-sm transition-all"
                  placeholder="Teléfono (WhatsApp)" value={formData.phone_number} onChange={handleChange}
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-zinc-500" />
                </div>
                <input
                  name="email" type="email" required
                  className="appearance-none rounded-xl relative block w-full px-3 py-3 pl-10 border border-zinc-700 bg-zinc-900/50 placeholder-zinc-500 text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-white sm:text-sm transition-all"
                  placeholder="Correo Electrónico" value={formData.email} onChange={handleChange}
                />
              </div>
              
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-zinc-500" />
                </div>
                <input
                  name="password" type="password" required
                  className="appearance-none rounded-xl relative block w-full px-3 py-3 pl-10 border border-zinc-700 bg-zinc-900/50 placeholder-zinc-500 text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-white sm:text-sm transition-all"
                  placeholder="Contraseña" value={formData.password} onChange={handleChange}
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-zinc-500" />
                </div>
                <input
                  name="password_confirm" type="password" required
                  className="appearance-none rounded-xl relative block w-full px-3 py-3 pl-10 border border-zinc-700 bg-zinc-900/50 placeholder-zinc-500 text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-white sm:text-sm transition-all"
                  placeholder="Confirmar Contraseña" value={formData.password_confirm} onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-black bg-white hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white focus:ring-offset-black transition-all"
              >
                {loading ? 'Procesando...' : 'Crear Cuenta'}
              </motion.button>
            </div>
            
            <div className="text-center text-sm text-zinc-400 mt-4">
              ¿Ya tienes cuenta?{' '}
              <Link href="/login" className="font-medium text-white hover:underline">
                Inicia sesión aquí
              </Link>
            </div>
          </form>
        ) : (
          <form className="mt-6 space-y-5" onSubmit={handleVerify}>
            <div className="text-center mb-6">
              <p className="text-zinc-300 text-sm">
                {regMethod === 'email' ? (
                  <>
                    Hemos enviado un código de verificación al correo:
                    <br />
                    <span className="font-bold text-white">{formData.email}</span>
                  </>
                ) : (
                  <>
                    Hemos enviado un código de verificación por WhatsApp al número:
                    <br />
                    <span className="font-bold text-white">{formData.phone_number}</span>
                  </>
                )}
              </p>
            </div>
            
            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 bg-red-900/50 border border-red-500/50 rounded-lg text-red-200 text-sm text-center">
                {error}
              </motion.div>
            )}

            <div className="relative">
              <input
                type="text" required maxLength={6}
                className="appearance-none rounded-xl relative block w-full px-3 py-4 border border-zinc-700 bg-zinc-900/50 text-white text-center text-2xl font-black tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-white focus:border-white transition-all uppercase"
                placeholder="000000" value={verifyCode} onChange={(e) => setVerifyCode(e.target.value)}
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={loading || verifyCode.length < 6}
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold uppercase tracking-widest rounded-xl text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 transition-all mt-6"
            >
              {loading ? 'Verificando...' : 'Verificar y Entrar'}
            </motion.button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
