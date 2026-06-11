"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Users, ShieldAlert, CheckCircle, Lock, MessageCircle, ChevronRight, Phone, Mail } from 'lucide-react';
import Link from 'next/link';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';

const browserOrigin = typeof window !== 'undefined'
  ? window.location.origin
  : 'http://localhost';

const envWhatsappUrl = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_WHATSAPP_SERVICE
  ? process.env.NEXT_PUBLIC_WHATSAPP_SERVICE
  : undefined;

const WHATSAPP_SERVICE = envWhatsappUrl || 'https://scw-whatsapp.onrender.com';
const EXPERIENCE_LABELS: Record<string, string> = {
  NONE: 'Ninguna. Quiero empezar desde cero.',
  BEGINNER: 'Principiante (He entrenado un poco)',
  INTERMEDIATE: 'Intermedio (Sé caer y llaves básicas)',
  ADVANCED: 'Avanzado (Ya he luchado o estoy listo para debutar)',
};

type Step = 'check' | 'verify_email' | 'form' | 'success' | 'already_enrolled';


export default function EscuelaPage() {
  const { isAuthenticated, user } = useAuthStore();
  const [step, setStep] = useState<Step>('check');
  const [verifyCode, setVerifyCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [formStatus, setFormStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  const [formData, setFormData] = useState({
    name: '',
    age: '',
    email: '',
    phone: '',
    experience: 'NONE',
    message: '',
  });

  const [idDocument, setIdDocument] = useState<File | null>(null);
  const [medicalCertificate, setMedicalCertificate] = useState<File | null>(null);

  // Pre-fill user data if logged in or from session
  useEffect(() => {
    const saved = sessionStorage.getItem('dojo_form_data');
    if (saved) {
      try {
        setFormData(prev => ({ ...prev, ...JSON.parse(saved) }));
      } catch (e) {}
    } else if (user) {
      setFormData(prev => ({
        ...prev,
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        email: user.email || '',
        phone: user.phone_number || '',
      }));
    }
  }, [user]);

  // Save form data to session storage
  useEffect(() => {
    sessionStorage.setItem('dojo_form_data', JSON.stringify(formData));
  }, [formData]);

  // Restore code sent status
  useEffect(() => {
    if (sessionStorage.getItem('dojo_code_sent') === 'true') {
      setCodeSent(true);
    }
  }, []);

  // Determine starting step
  useEffect(() => {
    const checkEnrollment = async () => {
      if (isAuthenticated) {
        try {
          const res = await api.get('/students/enrollments/status/');
          if (res.data.status === 'PENDING') {
            setStep('success'); // Muestra: Tu solicitud está en revisión
            return;
          } else if (res.data.status === 'APPROVED') {
            setStep('already_enrolled');
            return;
          }
        } catch (e) {
          // not enrolled or error
        }
        
        if (sessionStorage.getItem('dojo_email_verified') === 'true') {
          setStep('form');
        } else {
          setStep('verify_email');
        }
      } else {
        setStep('check');
      }
    };
    checkEnrollment();
  }, [isAuthenticated]);

  const handleSendCode = async () => {
    setSendingCode(true);
    setVerifyError('');
    try {
      const res = await api.post('/auth/send-email-otp/');
      if (res.data.error) throw new Error(res.data.error);
      setCodeSent(true);
      sessionStorage.setItem('dojo_code_sent', 'true');
    } catch (error: any) {
      setVerifyError(error.response?.data?.error || error.message || 'Error al enviar el código al correo.');
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    setVerifyError('');
    try {
      const res = await api.post('/auth/verify-email-otp/', { code: verifyCode });
      if (res.data.error) throw new Error(res.data.error);
      sessionStorage.setItem('dojo_email_verified', 'true');
      setStep('form');
    } catch (error: any) {
      setVerifyError(error.response?.data?.error || error.message || 'Código incorrecto. Intenta de nuevo.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idDocument || !medicalCertificate) {
      setVerifyError('Por favor sube ambos documentos (INE y Certificado Médico).');
      return;
    }

    setFormStatus('loading');
    setVerifyError('');
    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => data.append(key, value as string));
      data.append('id_document', idDocument);
      data.append('medical_certificate', medicalCertificate);

      await api.post('/students/enrollments/', data);
      setStep('success');
      sessionStorage.removeItem('dojo_email_verified');
      sessionStorage.removeItem('dojo_code_sent');
      sessionStorage.removeItem('dojo_form_data');
    } catch (error: any) {
      console.error(error);
      const serverError = error.response?.data;
      let errorMsg = 'Error al enviar la solicitud.';
      if (serverError) {
        if (typeof serverError === 'string') errorMsg = serverError;
        else if (serverError.error) errorMsg = serverError.error;
        else if (serverError.detail) errorMsg = serverError.detail;
        else errorMsg = JSON.stringify(serverError);
      } else if (error.message) {
        errorMsg = error.message;
      }
      setVerifyError(errorMsg);
      setFormStatus('error');
    }
  };

  return (
    <div className="bg-black min-h-screen text-white pt-24 pb-24">

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-5xl md:text-8xl font-black uppercase tracking-tighter mb-6">
            SCW <span className="text-red-600">DOJO</span>
          </h1>
          <p className="text-xl md:text-2xl text-zinc-400 font-light max-w-4xl mx-auto">
            SCW DOJO es el centro de entrenamiento de SCW. Nacimos con el objetivo de crear un espacio serio y profesional donde cualquier persona apasionada por la lucha libre pueda desarrollar su talento.
          </p>
        </motion.div>
      </section>

      {/* Benefits */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Target, title: 'Técnica Profesional', desc: 'Llaves, caídas, movimientos aéreos y psicología del ring.' },
            { icon: Users, title: 'Grupos Reducidos', desc: 'Atención personalizada para que avances más rápido en el ring.' },
            { icon: CheckCircle, title: 'Debut en Eventos', desc: 'Sube al ring en eventos reales de SCW ante nuestro público.' },
            { icon: ShieldAlert, title: 'Horarios Flexibles', desc: 'Varios días y horarios para que puedas combinar con tu vida.' }
          ].map((item, i) => (
            <motion.div key={item.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="bg-zinc-950 p-8 rounded-2xl border border-white/5 text-center hover:border-red-500/50 transition-colors">
              <item.icon className="w-12 h-12 text-red-600 mx-auto mb-6" />
              <h3 className="text-lg font-bold uppercase tracking-widest mb-3">{item.title}</h3>
              <p className="text-zinc-400 text-sm">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black uppercase tracking-tight">Preguntas Frecuentes</h2>
        </div>
        <div className="space-y-4">
          {[
            { q: '¿Necesito experiencia previa?', a: 'No. Recibimos a personas de todos los niveles, desde principiantes hasta quienes ya tienen algo de experiencia. Lo importante es la disposición para aprender.' },
            { q: '¿Cuál es la edad mínima?', a: 'Generalmente a partir de los 16 años. Para menores de edad se requiere autorización de padres o tutores.' },
            { q: '¿Qué necesito llevar?', a: 'Ropa deportiva cómoda y ganas de aprender. Nosotros te orientamos en todo lo demás al inicio.' },
            { q: '¿Puedo luchar en SCW si entreno ahí?', a: 'Sí. Los alumnos más avanzados tienen la oportunidad de participar en eventos reales de SCW.' }
          ].map((faq, i) => (
            <div key={i} className="bg-zinc-900 border border-white/5 p-6 rounded-xl">
              <h3 className="text-lg font-bold text-red-500 mb-2">{faq.q}</h3>
              <p className="text-zinc-300">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== APPLICATION FLOW ===== */}
      <section className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 mb-24">
        <div className="bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden">

          {/* Steps indicator */}
          <div className="flex border-b border-white/10">
            {[
              { label: 'Cuenta', n: 1, active: step === 'check' },
              { label: 'Verificar', n: 2, active: step === 'verify_email' },
              { label: 'Solicitud', n: 3, active: step === 'form' },
            ].map((s, i) => (
              <div key={s.label} className={`flex-1 py-4 text-center text-xs font-bold uppercase tracking-widest transition-colors ${s.active ? 'text-white bg-zinc-800' : 'text-zinc-600'}`}>
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full mr-2 text-xs font-black ${s.active ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-500'}`}>{s.n}</span>
                {s.label}
              </div>
            ))}
          </div>

          <div className="p-8 md:p-12">
            <AnimatePresence mode="wait">

              {/* STEP: Already Enrolled */}
              {step === 'already_enrolled' && (
                <motion.div key="already_enrolled" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="text-center p-8">
                  <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">Ya estás inscrito</h3>
                  <p className="text-zinc-400">
                    Ya hemos recibido tu solicitud o ya formas parte de SCW DOJO. Puedes ver el estado de tu suscripción en tu panel de alumno.
                  </p>
                  <Link href="/dashboard">
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold uppercase tracking-widest transition-colors">
                      Ir a mi Panel
                    </motion.button>
                  </Link>
                </motion.div>
              )}

              {/* STEP 1: Must be logged in */}
              {step === 'check' && (
                <motion.div key="check" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="text-center space-y-6">
                  <Lock className="w-16 h-16 text-red-500 mx-auto" />
                  <h2 className="text-2xl font-black uppercase tracking-tight">Acceso Requerido</h2>
                  <p className="text-zinc-400">Para postularte a SCW DOJO necesitas una cuenta registrada. Esto nos permite verificar tu identidad y darte seguimiento a tu solicitud.</p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                    <Link href="/login" className="flex-1 bg-white text-black py-3 px-6 font-bold uppercase tracking-widest rounded-xl hover:bg-zinc-200 transition-colors text-center">
                      Iniciar Sesión
                    </Link>
                    <Link href="/register" className="flex-1 border border-white/20 text-white py-3 px-6 font-bold uppercase tracking-widest rounded-xl hover:border-white/40 transition-colors text-center">
                      Crear Cuenta
                    </Link>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: Email Verification */}
              {step === 'verify_email' && (
                <motion.div key="verify" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center">
                      <Mail className="w-6 h-6 text-red-500" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black uppercase tracking-tight">Verificar Correo</h2>
                      <p className="text-zinc-400 text-sm mt-1">Te enviaremos un código de 6 dígitos para confirmar tu identidad.</p>
                    </div>
                  </div>

                  <div className="bg-zinc-800/50 rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-white">{user?.first_name?.charAt(0) || 'U'}</span>
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{user?.first_name} {user?.last_name}</p>
                      <p className="text-zinc-400 text-xs">{user?.email}</p>
                    </div>
                  </div>

                  {!codeSent ? (
                    <button
                      onClick={handleSendCode}
                      disabled={sendingCode}
                      className="w-full bg-red-600 hover:bg-red-500 text-white py-4 font-bold uppercase tracking-widest rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
                    >
                      <Mail className="w-5 h-5" />
                      {sendingCode ? 'Enviando...' : 'Enviar Código al Correo'}
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-red-400 text-sm font-medium text-center">✅ Código enviado. Revisa tu correo electrónico.</p>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Código de 6 dígitos</label>
                        <input
                          type="text"
                          maxLength={6}
                          value={verifyCode}
                          onChange={e => setVerifyCode(e.target.value.replace(/\D/, ''))}
                          className="w-full bg-black border border-white/20 rounded-xl p-4 text-white text-center text-2xl font-black tracking-[0.5em] focus:outline-none focus:border-red-500 transition-colors"
                          placeholder="000000"
                        />
                      </div>
                      <button
                        onClick={handleVerifyCode}
                        className="w-full bg-white text-black py-4 font-bold uppercase tracking-widest rounded-xl hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-5 h-5" />
                        Verificar e Ingresar
                      </button>
                      <button onClick={handleSendCode} className="w-full text-zinc-500 text-sm hover:text-white transition-colors py-2">
                        Reenviar código
                      </button>
                    </div>
                  )}

                  {verifyError && <p className="text-red-500 text-sm text-center">{verifyError}</p>}
                </motion.div>
              )}

              {/* STEP 3: Enrollment Form */}
              {step === 'form' && (
                <motion.div key="form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <div className="text-center mb-8">
                    <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight">Da el Primer Paso</h2>
                    <p className="text-zinc-400 mt-2 text-sm">Llena el formulario y nos pondremos en contacto contigo pronto.</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Nombre Completo</label>
                        <input required type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full bg-black border border-white/20 rounded-xl p-4 text-white focus:outline-none focus:border-red-500 transition-colors" placeholder="Tu nombre..." />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Edad</label>
                        <input required type="number" min="12" value={formData.age} onChange={(e) => setFormData({ ...formData, age: e.target.value })} className="w-full bg-black border border-white/20 rounded-xl p-4 text-white focus:outline-none focus:border-red-500 transition-colors" placeholder="18" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Email</label>
                        <input required type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full bg-black border border-white/20 rounded-xl p-4 text-white focus:outline-none focus:border-red-500 transition-colors bg-zinc-900/50" readOnly />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">WhatsApp / Teléfono</label>
                        <input required type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-black border border-white/20 rounded-xl p-4 text-white focus:outline-none focus:border-red-500 transition-colors" placeholder="Tu número de celular" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Experiencia Previa</label>
                      <select value={formData.experience} onChange={(e) => setFormData({ ...formData, experience: e.target.value })} className="w-full bg-black border border-white/20 rounded-xl p-4 text-white focus:outline-none focus:border-red-500 transition-colors">
                        {Object.entries(EXPERIENCE_LABELS).map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Mensaje (Opcional)</label>
                      <textarea rows={4} value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} className="w-full bg-black border border-white/20 rounded-xl p-4 text-white focus:outline-none focus:border-red-500 transition-colors resize-none" placeholder="Cuéntanos por qué quieres ser luchador..." />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border border-red-500/30 rounded-xl bg-red-500/5">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-red-500 mb-2">📄 Identificación (INE/Pasaporte)</label>
                        <input required type="file" accept=".pdf,image/*" onChange={(e) => setIdDocument(e.target.files?.[0] || null)} className="w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-red-500/10 file:text-red-500 hover:file:bg-red-500/20" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-red-500 mb-2">🏥 Certificado Médico</label>
                        <input required type="file" accept=".pdf,image/*" onChange={(e) => setMedicalCertificate(e.target.files?.[0] || null)} className="w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-red-500/10 file:text-red-500 hover:file:bg-red-500/20" />
                      </div>
                    </div>

                    <button disabled={formStatus === 'loading'} type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white p-5 font-black uppercase tracking-widest text-lg transition-colors rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
                      <span className="relative z-10 flex items-center justify-center gap-2">
                      {formStatus === 'loading' ? 'Enviando...' : 'Aplicar a SCW DOJO'}
                      </span>
                    </button>
                    {formStatus === 'error' && <p className="text-red-500 text-center mt-4">Hubo un error. Intenta de nuevo.</p>}
                    {verifyError && <p className="text-red-500 text-center mt-4">{verifyError}</p>}
                  </form>
                </motion.div>
              )}

              {/* SUCCESS */}
              {step === 'success' && (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}>
                    <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-6" />
                  </motion.div>
                  <h3 className="text-3xl font-black uppercase mb-3">¡Solicitud Enviada!</h3>
                  <p className="text-zinc-400 text-lg">Un entrenador de SCW se pondrá en contacto contigo por WhatsApp muy pronto.</p>
                  <p className="text-zinc-500 text-sm mt-4">Prepárate para empezar tu camino en el ring. 🥊</p>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </section>
    </div>
  );
}
