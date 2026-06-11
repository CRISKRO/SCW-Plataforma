"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Mail, ArrowRight, X, Key } from 'lucide-react';
import { authService } from '@/services/auth.services';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GoogleLogin } from '@react-oauth/google';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const setAuth = useAuthStore(state => state.setAuth);
  const router = useRouter();

  // Forgot Password State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await authService.login({ email, password }, rememberMe);
      // Fetch profile after login
      const profile = await authService.getProfile();
      setAuth(profile, data.access, rememberMe);
      router.push('/dashboard'); // Default redirect
    } catch (err: any) {
      setError('Credenciales inválidas. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setLoading(true);
    setError('');
    try {
      if (credentialResponse.credential) {
        const data = await authService.googleLogin(credentialResponse.credential, rememberMe);
        const profile = await authService.getProfile();
        setAuth(profile, data.access, rememberMe);
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError('Error al autenticar con Google. ' + (err.response?.data?.error || ''));
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError('');
    try {
      await authService.sendPasswordResetOTP(forgotEmail);
      setForgotStep(2);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Error al enviar el correo. Intenta de nuevo.';
      setForgotError(errorMsg);
      if (errorMsg.includes('Para pruebas')) {
        setForgotStep(2);
      }
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError('');
    try {
      await authService.resetPasswordWithOTP({
        email: forgotEmail,
        code: forgotCode,
        new_password: newPassword
      });
      setForgotStep(3);
    } catch (err: any) {
      setForgotError('Código incorrecto o expirado.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-zinc-800 rounded-full mix-blend-screen filter blur-[100px] opacity-30"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-96 h-96 bg-zinc-800 rounded-full mix-blend-screen filter blur-[100px] opacity-30"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-md w-full space-y-8 glass-panel p-10 z-10"
      >
        <div>
          <motion.h2 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="mt-2 text-center text-4xl font-extrabold text-white tracking-tight"
          >
            SCW
          </motion.h2>
          <p className="mt-2 text-center text-sm text-zinc-400">
            Acceso al Sistema
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 bg-red-900/50 border border-red-500/50 rounded-lg text-red-200 text-sm text-center">
              {error}
            </motion.div>
          )}
          
          <div className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-zinc-500" />
              </div>
              <input
                id="email-address"
                name="email"
                type="email"
                required
                className="appearance-none rounded-xl relative block w-full px-3 py-3 pl-10 border border-zinc-700 bg-zinc-900/50 placeholder-zinc-500 text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-white focus:z-10 sm:text-sm transition-all"
                placeholder="Correo Electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-zinc-500" />
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-xl relative block w-full px-3 py-3 pl-10 border border-zinc-700 bg-zinc-900/50 placeholder-zinc-500 text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-white focus:z-10 sm:text-sm transition-all"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input 
                id="remember-me" 
                name="remember-me" 
                type="checkbox" 
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 bg-zinc-900 border-zinc-700 rounded text-white focus:ring-white accent-white cursor-pointer" 
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-zinc-400 cursor-pointer select-none">
                Recordarme
              </label>
            </div>
            <div className="text-sm">
              <button 
                type="button" 
                onClick={() => {
                  setShowForgotModal(true);
                  setForgotStep(1);
                  setForgotEmail('');
                  setForgotCode('');
                  setNewPassword('');
                  setForgotError('');
                }}
                className="font-medium text-white hover:text-zinc-300 transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          </div>

          <div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-black bg-white hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white focus:ring-offset-black transition-all"
            >
              {loading ? (
                <span className="flex items-center">Cargando...</span>
              ) : (
                <span className="flex items-center">
                  Entrar
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </motion.button>
          </div>

          <div className="mt-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-black text-zinc-400">O continuar con</span>
              </div>
            </div>

            <div className="mt-4 flex justify-center" style={{ colorScheme: 'light' }}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => {
                  setError('Error al iniciar sesión con Google.');
                }}
                theme="filled_black"
                shape="rectangular"
                width="340"
              />
            </div>
          </div>
          
          <div className="text-center text-sm text-zinc-400 mt-4">
            ¿No tienes cuenta?{' '}
            <Link href="/register" className="font-medium text-white hover:underline">
              Regístrate aquí
            </Link>
          </div>
        </form>
      </motion.div>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
              onClick={() => setShowForgotModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className="bg-zinc-950 border border-white/10 rounded-2xl p-8 w-full max-w-md shadow-2xl relative">
                <button 
                  onClick={() => setShowForgotModal(false)} 
                  className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
                
                <h2 className="text-2xl font-bold text-white mb-2">Recuperar Contraseña</h2>
                
                {forgotError && (
                  <div className="mb-4 p-3 bg-red-900/50 border border-red-500/50 rounded-lg text-red-200 text-sm text-center">
                    {forgotError}
                  </div>
                )}

                {forgotStep === 1 && (
                  <form onSubmit={handleSendOTP} className="space-y-4">
                    <p className="text-zinc-400 text-sm mb-4">Ingresa tu correo electrónico y te enviaremos un código de verificación.</p>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-zinc-500" />
                      </div>
                      <input
                        type="email"
                        required
                        className="appearance-none rounded-xl relative block w-full px-3 py-3 pl-10 border border-zinc-700 bg-zinc-900/50 placeholder-zinc-500 text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-white sm:text-sm"
                        placeholder="Correo Electrónico"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-black bg-white hover:bg-zinc-200 focus:outline-none transition-all disabled:opacity-50"
                    >
                      {forgotLoading ? 'Enviando...' : 'Enviar Código'}
                    </button>
                  </form>
                )}

                {forgotStep === 2 && (
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <p className="text-zinc-400 text-sm mb-4">Ingresa el código que enviamos a tu correo y tu nueva contraseña.</p>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Key className="h-5 w-5 text-zinc-500" />
                      </div>
                      <input
                        type="text"
                        required
                        className="appearance-none rounded-xl relative block w-full px-3 py-3 pl-10 border border-zinc-700 bg-zinc-900/50 placeholder-zinc-500 text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-white sm:text-sm"
                        placeholder="Código de 6 dígitos"
                        value={forgotCode}
                        onChange={(e) => setForgotCode(e.target.value)}
                        maxLength={6}
                      />
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-zinc-500" />
                      </div>
                      <input
                        type="password"
                        required
                        className="appearance-none rounded-xl relative block w-full px-3 py-3 pl-10 border border-zinc-700 bg-zinc-900/50 placeholder-zinc-500 text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-white sm:text-sm"
                        placeholder="Nueva Contraseña"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-black bg-white hover:bg-zinc-200 focus:outline-none transition-all disabled:opacity-50"
                    >
                      {forgotLoading ? 'Actualizando...' : 'Actualizar Contraseña'}
                    </button>
                  </form>
                )}

                {forgotStep === 3 && (
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Lock className="w-8 h-8" />
                    </div>
                    <p className="text-white font-medium">¡Contraseña actualizada con éxito!</p>
                    <button
                      onClick={() => setShowForgotModal(false)}
                      className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-black bg-white hover:bg-zinc-200 focus:outline-none transition-all"
                    >
                      Volver al Login
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
