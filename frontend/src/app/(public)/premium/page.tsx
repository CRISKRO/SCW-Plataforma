"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Lock, PlayCircle, Video, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';

function getYoutubeId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;

  // 1. Match ?v= or &v= parameter anywhere in the query string
  const vMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (vMatch && vMatch[1]) return vMatch[1];

  // 2. Match path-based formats (live/, shorts/, embed/, v/, watch/, youtu.be/)
  const pathMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|shorts\/|live\/|v\/|watch\/))([a-zA-Z0-9_-]{11})/i);
  if (pathMatch && pathMatch[1]) return pathMatch[1];

  // 3. Fallback for any 11-char ID in YouTube link
  if (url.toLowerCase().includes('youtu')) {
    const fallbackMatch = url.match(/([a-zA-Z0-9_-]{11})/);
    if (fallbackMatch && fallbackMatch[1]) return fallbackMatch[1];
  }

  return null;
}

function getYoutubeThumbnail(url: string): string {
  const id = getYoutubeId(url);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '';
}

import PageBackButton from '@/components/PageBackButton';

export default function PremiumPage() {
  const { isAuthenticated, user } = useAuthStore();
  const [videos, setVideos] = useState<any[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [plan, setPlan] = useState<any>(null);

  const isPremium = isAuthenticated && (user?.is_premium || ['PREMIUM', 'ADMIN', 'SUPERADMIN'].includes(user?.role || ''));

  useEffect(() => {
    setLoadingVideos(true);
    api.get(`/premium/videos/?t=${new Date().getTime()}`)
      .then(res => setVideos(res.data))
      .catch(() => setVideos([]))
      .finally(() => setLoadingVideos(false));

    api.get(`/premium/plans/?t=${new Date().getTime()}`)
      .then(res => {
        if (res.data && res.data.length > 0) {
          setPlan(res.data[0]);
        }
      })
      .catch(console.error);
  }, []);

  return (
    <div className="bg-black min-h-screen text-white pt-20">
      {/* Hero Section */}
      <section className="relative pt-6 pb-12 overflow-hidden border-b border-red-900/30">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-900/40 via-black to-black z-0"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <PageBackButton />
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mt-6">
          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-6xl md:text-8xl font-black tracking-tighter uppercase"
          >
            SCW <span className="text-transparent bg-clip-text bg-gradient-to-b from-red-400 to-red-700">Premium</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="mt-6 text-xl md:text-2xl text-zinc-300 max-w-3xl mx-auto font-light leading-relaxed"
          >
            El lugar definitivo para el verdadero fan. Detrás de escena, documentales exclusivos y la bóveda histórica de SCW.
          </motion.p>
          
          {isPremium && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="mt-10 inline-flex items-center gap-3 bg-gradient-to-r from-red-600 to-red-800 text-white px-8 py-4 rounded-full text-lg font-black uppercase tracking-widest shadow-[0_0_30px_rgba(220,38,38,0.5)]"
            >
              <Video className="w-6 h-6" />
              Suscripción Activa
            </motion.div>
          )}
        </div>
      </section>

      {/* Pricing / VIP Card for non-members */}
      {!isAuthenticated && (
        <section className="py-24 relative overflow-hidden bg-black">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <motion.div 
              initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="bg-black border border-white/5 p-8 md:p-12 text-center rounded-3xl shadow-2xl relative"
            >
                <h2 className="text-3xl font-black uppercase tracking-widest text-white mb-2">SCW Premium</h2>
                <p className="text-zinc-400 mb-8 font-medium">{plan?.name || "Membresía Mensual"}</p>
                
                <div className="flex justify-center items-baseline mb-10">
                  <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400">
                    ${plan?.price ? Math.floor(plan.price) : '199'}
                  </span>
                  <span className="text-zinc-500 ml-2 font-bold tracking-widest">MXN / MES</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left max-w-2xl mx-auto mb-12">
                  {[
                    'Acceso ilimitado al VOD', 
                    'Transmisiones en vivo sin anuncios', 
                    'Material exclusivo Backstage', 
                    '15% de Descuento en Tienda'
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-3 bg-zinc-900/50 p-4 rounded-xl border border-white/5">
                      <div className="bg-red-950/50 p-2 rounded-lg">
                        <Check className="w-5 h-5 text-red-500" />
                      </div>
                      <span className="text-zinc-200 font-medium text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
                
                <Link href="/register" className="inline-flex justify-center w-full sm:w-auto px-8 py-3 bg-white text-black hover:bg-zinc-200 font-bold uppercase tracking-widest transition-colors rounded-xl mt-4">
                  Suscribirse Ahora
                </Link>
            </motion.div>
          </div>
        </section>
      )}

      {/* Video Catalog */}
      <section className="py-24 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between mb-12 border-b border-white/10 pb-6">
            <h2 className="text-3xl font-black uppercase tracking-tight flex items-center gap-4">
              La Bóveda SCW
              {!isPremium && <span className="bg-zinc-900 text-zinc-500 text-xs px-3 py-1 rounded-full border border-white/10 tracking-widest"><Lock className="w-3 h-3 inline mr-1 -mt-0.5" /> BLOQUEADO</span>}
            </h2>
          </div>

          {loadingVideos ? (
            <div className="flex justify-center py-20">
              <div className="w-12 h-12 border-t-2 border-red-600 rounded-full animate-spin"></div>
            </div>
          ) : videos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {videos.map((video, i) => {
                const thumb = video.youtube_id ? `https://img.youtube.com/vi/${video.youtube_id}/maxresdefault.jpg` : (video.youtube_id ? `https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg` : '');
                const isLocked = !video.video_url;

                if (isLocked) {
                  return (
                    <motion.div
                      key={video.id}
                      initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                      className="group relative bg-zinc-950 rounded-2xl overflow-hidden border border-white/5 cursor-not-allowed select-none"
                    >
                      <div className="relative aspect-video bg-zinc-950 overflow-hidden">
                        {thumb ? (
                          <Image src={thumb} alt={video.title} fill className="object-cover transition-all duration-700" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" priority={i < 3} />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Video className="w-12 h-12 text-zinc-800" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="absolute inset-0 flex items-center justify-center transition-all duration-300">
                          <div className="w-16 h-16 rounded-full bg-black/80 flex items-center justify-center backdrop-blur-xl border border-white/10 shadow-2xl group-hover:scale-110 transition-transform">
                            <Lock className="w-8 h-8 text-zinc-300" />
                          </div>
                        </div>
                        <div className="absolute top-4 left-4 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded">
                          PREMIUM
                        </div>
                      </div>
                      <div className="p-6 relative">
                        <h3 className="text-xl font-black text-zinc-500 line-clamp-1 mb-2">{video.title}</h3>
                        {video.description && (
                          <p className="text-zinc-600 text-sm line-clamp-2 leading-relaxed">{video.description}</p>
                        )}
                        <div className="mt-4 flex items-center justify-between text-xs font-bold tracking-widest text-zinc-600 uppercase">
                          <span>
                            {video.release_date ? new Date(video.release_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : 'VOD'}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                }

                return (
                  <motion.a
                    key={video.id}
                    href={video.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                    className="group relative bg-zinc-900 rounded-2xl overflow-hidden border border-white/10 hover:border-red-500/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_10px_30px_rgba(220,38,38,0.2)]"
                  >
                    <div className="relative aspect-video bg-zinc-950 overflow-hidden">
                      {thumb ? (
                        <Image src={thumb} alt={video.title} fill className="object-cover group-hover:scale-110 group-hover:rotate-1 transition-all duration-700" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" priority={i < 3} />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Video className="w-12 h-12 text-zinc-800" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100">
                        <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-[0_0_20px_rgba(220,38,38,0.6)]">
                          <PlayCircle className="w-8 h-8 text-white ml-1" />
                        </div>
                      </div>
                      <div className="absolute top-4 left-4 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded">
                        PREMIUM
                      </div>
                    </div>
                    <div className="p-6 relative">
                      <h3 className="text-xl font-black text-white group-hover:text-red-400 transition-colors line-clamp-1 mb-2">{video.title}</h3>
                      {video.description && (
                        <p className="text-zinc-400 text-sm line-clamp-2 leading-relaxed">{video.description}</p>
                      )}
                      <div className="mt-4 flex items-center justify-between text-xs font-bold tracking-widest text-zinc-500 uppercase">
                        <span>
                          {video.release_date ? new Date(video.release_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : 'VOD'}
                        </span>
                        <span className="flex items-center gap-1 text-red-500">
                          Ver en YouTube <ExternalLink className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </motion.a>
                );
              })}
            </div>
          ) : (
            <div className="text-zinc-500 py-12 text-center border border-white/5 rounded-2xl bg-zinc-950/50">
              <p className="font-bold uppercase tracking-widest">No hay contenido disponible por el momento.</p>
            </div>
          )}

          {isAuthenticated && !isPremium && (
            <div className="mt-16 bg-gradient-to-r from-zinc-900 to-zinc-950 border border-red-900/30 rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-[60px]"></div>
              <Lock className="w-12 h-12 text-zinc-700 mx-auto mb-6" />
              <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-4">Desbloquea La Bóveda SCW</h3>
              <p className="text-zinc-400 max-w-xl mx-auto mb-8">Únete a SCW Premium para obtener acceso inmediato a todo el catálogo de videos y transmisiones en vivo.</p>
              <Link 
                href="/premium/checkout"
                className="inline-block px-10 py-4 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest rounded-full transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(220,38,38,0.4)]"
              >
                Suscribirse por ${plan?.price ? Math.floor(plan.price) : '199'} MXN
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
