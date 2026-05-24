"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Lock, PlayCircle, Video, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';

function getYoutubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function getYoutubeThumbnail(url: string): string {
  const id = getYoutubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : '';
}

export default function PremiumPage() {
  const { isAuthenticated, user } = useAuthStore();
  const [videos, setVideos] = useState<any[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);

  const isPremium = isAuthenticated && ['PREMIUM', 'ADMIN', 'SUPERADMIN'].includes(user?.role || '');

  useEffect(() => {
    if (isAuthenticated) {
      setLoadingVideos(true);
      api.get('/premium/videos/')
        .then(res => setVideos(res.data))
        .catch(() => setVideos([]))
        .finally(() => setLoadingVideos(false));
    }
  }, [isAuthenticated]);

  return (
    <div className="bg-black min-h-screen text-white pt-20">
      {/* Hero */}
      <section className="relative py-24 overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-b from-red-900/20 to-black z-0"></div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-black tracking-tight uppercase"
          >
            SCW <span className="text-red-500">Premium</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="mt-6 text-xl text-zinc-400 max-w-2xl mx-auto"
          >
            Acceso total al contenido detrás de escena, documentales exclusivos, y la videoteca histórica de la mejor lucha libre del mundo.
          </motion.p>
          {isPremium && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              className="mt-6 inline-flex items-center gap-2 bg-red-600/20 border border-red-500/30 text-red-400 px-5 py-2 rounded-full text-sm font-bold uppercase tracking-widest"
            >
              <Video className="w-4 h-4" />
              Acceso Premium Activo
            </motion.div>
          )}
        </div>
      </section>

      {/* Pricing / CTA for non-members */}
      {!isAuthenticated && (
        <section className="py-20 bg-zinc-950">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="glass-panel p-8 md:p-12 rounded-3xl text-center relative overflow-hidden border-red-500/30">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent"></div>
              <h2 className="text-3xl font-bold uppercase mb-4">Membresía Mensual VIP</h2>
              <div className="flex justify-center items-baseline mb-8">
                <span className="text-5xl font-black">$199</span>
                <span className="text-zinc-400 ml-2">MXN / mes</span>
              </div>
              <ul className="space-y-4 text-left max-w-sm mx-auto mb-10">
                {['Acceso ilimitado al catálogo VOD', 'Transmisiones en vivo sin anuncios', 'Contenido Backstage exclusivo', 'Descuento 15% en Tienda Oficial'].map((feature, i) => (
                  <li key={i} className="flex items-center text-zinc-300">
                    <Check className="w-5 h-5 text-red-500 mr-3 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="inline-block w-full sm:w-auto px-10 py-4 bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-widest transition-colors rounded-xl">
                Suscribirse Ahora
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Video Catalog */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-12">
            <h2 className="text-3xl font-bold uppercase">Catálogo Exclusivo</h2>
            {!isPremium && <Lock className="w-6 h-6 text-zinc-500" />}
          </div>

          {loadingVideos ? (
            <div className="text-zinc-500 py-12 text-center">Cargando videos...</div>
          ) : isPremium && videos.length > 0 ? (
            // Premium user — show real videos with YouTube links
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos.map((video, i) => {
                const thumb = getYoutubeThumbnail(video.video_url);
                return (
                  <motion.a
                    key={video.id}
                    href={video.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    className="group relative bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden hover:border-red-500/50 transition-all"
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-video bg-zinc-900">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Video className="w-14 h-14 text-zinc-700" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-14 h-14 rounded-full bg-red-600/90 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                          <PlayCircle className="w-8 h-8 text-white" />
                        </div>
                      </div>
                      <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs text-white font-bold">
                        <Video className="w-3.5 h-3.5 text-red-500" />
                        YouTube
                        <ExternalLink className="w-3 h-3 text-zinc-400" />
                      </div>
                    </div>
                    {/* Info */}
                    <div className="p-5">
                      <h3 className="font-bold text-white group-hover:text-red-400 transition-colors">{video.title}</h3>
                      {video.description && (
                        <p className="text-zinc-500 text-sm mt-1.5 line-clamp-2">{video.description}</p>
                      )}
                      <p className="text-zinc-600 text-xs mt-3">
                        {video.release_date && new Date(video.release_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </motion.a>
                );
              })}
            </div>
          ) : (
            // Non-premium or no videos — blurred preview
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: 'Documental: El Origen de la Sangre', duration: '45 min' },
                { title: 'Backstage: NO WAY OUT', duration: '22 min' },
                { title: 'Entrevista Exclusiva: El Matador', duration: '15 min' },
                { title: 'Clásicos: Final Campeonato 2025', duration: '55 min' },
              ].map((video, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                  className="group relative aspect-video bg-zinc-900 rounded-xl overflow-hidden cursor-pointer"
                >
                  <div className="absolute inset-0 bg-zinc-800 transition-transform duration-500 group-hover:scale-105 filter blur-[2px]"></div>
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[1px]">
                    <PlayCircle className="w-12 h-12 text-white/50 group-hover:text-white transition-colors" />
                  </div>
                  <div className="absolute bottom-0 left-0 p-4 w-full bg-gradient-to-t from-black to-transparent">
                    <h3 className="text-sm font-bold text-white truncate">{video.title}</h3>
                    <p className="text-xs text-zinc-400 mt-1">{video.duration}</p>
                  </div>
                  <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/80 flex items-center justify-center backdrop-blur-md border border-white/10">
                    <Lock className="w-4 h-4 text-zinc-400" />
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {isAuthenticated && !isPremium && (
            <div className="mt-12 text-center">
              <p className="text-zinc-500 mb-4">Tu cuenta no tiene acceso Premium activo.</p>
              <Link 
                href="/premium/checkout"
                className="inline-block px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-widest rounded-xl transition-colors"
              >
                Activar Membresía Premium ($199)
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
