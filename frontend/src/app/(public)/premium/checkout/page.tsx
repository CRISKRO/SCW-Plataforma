"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, CreditCard, Lock, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';

export default function PremiumCheckoutPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const handlePayment = async () => {
    setProcessing(true);
    try {
      const response = await api.post('/premium/subscribe/');
      if (response.data.init_point) {
        window.location.href = response.data.init_point;
      } else {
        // Suscripción creada, sin pasarela externa activa (token de prueba)
        setSuccess(true);
        setTimeout(() => {
          window.location.href = '/premium';
        }, 3000);
      }
    } catch (error) {
      console.error("Error al suscribirse:", error);
      alert("Hubo un error al procesar el pago. Intenta de nuevo.");
      setProcessing(false);
    }
  };

  if (success) {
    return (
      <div className="bg-black min-h-screen text-white pt-32 pb-24 flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6 max-w-md w-full px-4">
          <div className="w-24 h-24 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tight">¡Bienvenido a SCW Premium!</h1>
          <p className="text-zinc-400 text-lg">Tu pago fue procesado correctamente. Tienes 30 días de acceso ilimitado.</p>
          <p className="text-zinc-500 text-sm mt-8 animate-pulse">Redirigiendo al catálogo exclusivo...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen text-white pt-24 pb-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="mb-12 border-b border-white/10 pb-6">
          <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-red-500" />
            Checkout Seguro
          </h1>
        </div>

        <div className="flex flex-col lg:flex-row gap-12">
          
          {/* Detalles del Plan */}
          <div className="lg:w-1/2 space-y-8">
            <div className="bg-zinc-900 border border-white/10 rounded-2xl p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-bl-full pointer-events-none"></div>
              
              <div className="inline-block bg-red-600 text-white px-3 py-1 text-xs font-bold uppercase tracking-widest rounded-full mb-6">
                Suscripción Mensual
              </div>
              
              <h2 className="text-3xl font-black mb-2">SCW VIP Pass</h2>
              <p className="text-zinc-400 mb-6">Acceso ilimitado por 30 días a documentales, eventos en vivo y backstage.</p>
              
              <div className="text-5xl font-black mb-6">
                $199<span className="text-xl text-zinc-500 font-medium">.00 MXN</span>
              </div>
              
              <ul className="space-y-3 text-sm text-zinc-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" /> Cancela en cualquier momento
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" /> Renovación automática cada 30 días
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" /> Soporte prioritario
                </li>
              </ul>
            </div>
          </div>

          {/* Formulario de Pago Simulado */}
          <div className="lg:w-1/2">
            <div className="bg-zinc-950 border border-white/10 rounded-2xl p-8">
              <h3 className="text-xl font-bold uppercase mb-6 flex items-center gap-2">
                <CreditCard className="w-5 h-5" /> Método de Pago
              </h3>
              
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Correo asociado a tu cuenta</label>
                    <input type="email" value={user?.email || ''} readOnly className="w-full bg-black border border-white/10 p-4 rounded-xl text-zinc-400 cursor-not-allowed" />
                  </div>

                  <div className="pt-6">
                    <button 
                      onClick={handlePayment}
                      disabled={processing}
                      className="w-full bg-[#009EE3] hover:bg-[#008ACA] disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-black uppercase tracking-widest py-5 rounded-xl transition-colors flex items-center justify-center gap-3 text-lg"
                    >
                      {processing ? (
                        <span className="animate-pulse">Conectando...</span>
                      ) : (
                        <>
                          <Lock className="w-5 h-5" />
                          Pagar Seguro con Mercado Pago
                        </>
                      )}
                    </button>
                    <p className="text-center text-xs text-zinc-500 mt-4 px-4 leading-relaxed">
                      Serás redirigido a la plataforma oficial de Mercado Pago para procesar tu tarjeta de forma segura.
                    </p>
                  </div>
                </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
