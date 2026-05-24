"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Mail, ArrowRight } from 'lucide-react';
import { authService } from '@/services/auth.services';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const setAuth = useAuthStore(state => state.setAuth);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await authService.login({ email, password });
      // Fetch profile after login
      const profile = await authService.getProfile();
      setAuth(profile, data.access);
      router.push('/dashboard'); // Default redirect
    } catch (err: any) {
      setError('Credenciales inválidas. Intenta de nuevo.');
    } finally {
      setLoading(false);
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
              <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 bg-zinc-900 border-zinc-700 rounded text-white focus:ring-white accent-white" />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-zinc-400">
                Recordarme
              </label>
            </div>
            <div className="text-sm">
              <a href="#" className="font-medium text-white hover:text-zinc-300 transition-colors">
                ¿Olvidaste tu contraseña?
              </a>
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
          
          <div className="text-center text-sm text-zinc-400 mt-4">
            ¿No tienes cuenta?{' '}
            <Link href="/register" className="font-medium text-white hover:underline">
              Regístrate aquí
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
