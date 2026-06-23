"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, ChevronLeft, Calendar, MapPin, Ticket, PlayCircle } from 'lucide-react';
import { TicketSelectionModal } from '@/components/TicketSelectionModal';

const InstagramIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
);

const TwitterIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
);

const FacebookIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
);

const TikTokIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5v3a3 3 0 0 1-3-3"/></svg>
);

const SocialLinks = ({ fighter }: { fighter: any }) => {
  const links = [
    { url: fighter.instagram, icon: <InstagramIcon />, name: 'Instagram' },
    { url: fighter.tiktok, icon: <TikTokIcon />, name: 'TikTok' },
    { url: fighter.twitter, icon: <TwitterIcon />, name: 'Twitter' },
    { url: fighter.facebook, icon: <FacebookIcon />, name: 'Facebook' },
  ].filter(link => link.url);

  if (links.length === 0) return null;

  return (
    <div className="flex items-center gap-3 mb-2">
      {links.map((link, i) => (
        <a 
          key={i} 
          href={link.url} 
          target="_blank" 
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-white hover:text-red-500 transition-colors hover:scale-110 transform"
          title={link.name}
        >
          {link.icon}
        </a>
      ))}
    </div>
  );
};

const staticSlides = [
  {
    id: null,
    title: "Lucha Extrema",
    subtitle: "Siente el impacto. Vive la gloria. La plataforma oficial de SCW Strong Classic Wrestling.",
    image: "/images/logoring.webp",
    mobileImage: "/images/logoring_mobile.jpg",
    date: null,
    location: null,
    cta: [
      { label: "Comprar Boletos", href: "/eventos", primary: true },
      { label: "Ver Cartelera", href: "/eventos", primary: false },
    ],
  },
  {
    id: null,
    title: "Tienda Oficial",
    subtitle: "Vístete con la mercancía oficial de tus Superestrellas favoritas de SCW y demuestra de qué lado estás.",
    image: "/images/logoring2.webp",
    mobileImage: "/images/logoring_mobile.jpg",
    date: null,
    location: null,
    cta: [
      { label: "Ir a la Tienda", href: "/tienda", primary: true },
    ],
  },
  {
    id: null,
    title: "SCW Premium",
    subtitle: "Accede a contenido exclusivo, PPVs en vivo y el archivo histórico de nuestras mejores luchas.",
    image: "/images/scwpremium.webp",
    date: null,
    location: null, 
    cta: [
      { label: "Acceder a Premium", href: "/premium", primary: true },
      { label: "Suscribirse Ahora", href: "/register", primary: false },
    ],
  },
  {
    id: null,
    title: "SCW DOJO",
    subtitle: "Únete a nuestro centro de entrenamiento oficial. Aprende de los profesionales y conviértete en la próxima estrella.",
    image: "/images/logoring2.webp",
    date: null,
    location: null,
    cta: [
      { label: "Unirse a SCW DOJO", href: "/escuela", primary: true },
      { label: "Saber Más", href: "/escuela", primary: false },
    ],
  },
];

interface HomeCarouselProps {
  events: any[];
  upcomingEvents: any[];
  roster: any[];
  chronicles: any[];
  premiumVideos: any[];
  sponsors?: any[];
  raffles?: any[];
}

export default function HomeCarousel({ events, upcomingEvents, roster, chronicles, premiumVideos, sponsors = [], raffles = [] }: HomeCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slides, setSlides] = useState<any[]>(staticSlides);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    let dynamicSlides: any[] = [];
    
    if (upcomingEvents && upcomingEvents.length > 0) {
      const eventSlides = upcomingEvents.map((ev: any) => ({
        id: ev.id,
        type: 'event',
        title: ev.title,
        subtitle: ev.description || `${ev.location}`,
        image: ev.banner_url || '/images/logoring.webp',
        date: ev.date_time,
        location: ev.location,
        cta: [
          { label: 'Comprar Boletos', href: `/eventos/${ev.id}`, primary: true, isEventTicket: true, event: ev },
          { label: 'Todos los Eventos', href: '/eventos', primary: false },
        ],
      }));
      dynamicSlides = [...dynamicSlides, ...eventSlides];
    }

    if (raffles && raffles.length > 0) {
      const raffleSlides = raffles.map((r: any) => ({
        id: `raffle-${r.id}`,
        type: 'raffle',
        title: r.title,
        subtitle: r.description,
        image: r.image || '/images/logoring.webp',
        date: null,
        location: null,
        cta: [
          { label: 'Ver Detalles y Participar', href: `/raffles/${r.id}`, primary: true },
        ],
      }));
      dynamicSlides = [...dynamicSlides, ...raffleSlides];
    }

    if (dynamicSlides.length > 0) {
      setSlides([...dynamicSlides, ...staticSlides]);
    } else {
      setSlides(staticSlides);
    }
  }, [upcomingEvents, raffles]);

  // Auto-play carousel
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 15000);
    return () => clearInterval(timer);
  }, [slides.length, currentSlide]);

  const goTo = (index: number) => setCurrentSlide((index + slides.length) % slides.length);
  const slide = slides[currentSlide];

  return (
    <div className="bg-black text-white selection:bg-zinc-500 selection:text-white">
      {/* Hero Section Carousel */}
      <section className="relative min-h-[100svh] flex items-center justify-center overflow-x-hidden">
        <AnimatePresence>
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: "easeInOut" }}
            className="absolute inset-0 z-0"
          >
            {slide.id ? (
              <>
                <div className="absolute inset-0 bg-zinc-950" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,_#18181b_0%,_#000_60%)]" />
              </>
            ) : (
              <>
                <div className="hidden md:block absolute inset-0">
                  <Image 
                    src={slide.image} 
                    alt={slide.title} 
                    fill 
                    priority={currentSlide === 0} 
                    className="object-cover" 
                    style={{ filter: 'brightness(0.35)' }} 
                  />
                </div>
                <div className="block md:hidden absolute inset-0">
                  <Image 
                    src={slide.mobileImage || slide.image} 
                    alt={slide.title} 
                    fill 
                    priority={currentSlide === 0} 
                    className="object-cover" 
                    style={{ filter: 'brightness(0.35)' }} 
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60" />
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full mt-4 md:mt-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={`content-${currentSlide}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className={`flex flex-col-reverse lg:flex-row items-center justify-center gap-4 lg:gap-12 pt-24 pb-44 md:py-0 w-full`}
              style={{ touchAction: 'pan-y' }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={(e, { offset }) => {
                const swipe = offset.x;
                if (swipe < -50) goTo(currentSlide + 1);
                else if (swipe > 50) goTo(currentSlide - 1);
              }}
            >
              <div className="w-full max-w-2xl flex-shrink-0 text-center lg:text-left flex flex-col items-center lg:items-start">

                {slide.date && (
                  <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mb-2 lg:mb-6">
                    <span className="inline-flex items-center gap-1.5 bg-red-600/90 backdrop-blur-sm text-white text-[10px] sm:text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full">
                      <Ticket className="w-3 h-3" />
                      Próximo Evento
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-zinc-300 text-[10px] sm:text-sm font-medium bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
                      <Calendar className="w-3 h-3 text-red-400" />
                      {new Date(slide.date).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                    {slide.location && (
                      <span className="inline-flex items-center gap-1.5 text-zinc-300 text-[10px] sm:text-sm font-medium bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
                        <MapPin className="w-3 h-3 text-red-400" />
                        {slide.location}
                      </span>
                    )}
                  </div>
                )}

                {(!slide.id || slide.type === 'event' || slide.type === 'raffle') && (
                  <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-6xl xl:text-7xl font-black tracking-tighter uppercase leading-none mb-2 md:mb-6">
                    {slide.title.split(' ').map((word: string, i: number) => (
                      <span key={i}>
                        {i === slide.title.split(' ').length - 1
                          ? <span className={`text-transparent bg-clip-text bg-gradient-to-r ${slide.type === 'raffle' ? 'from-yellow-400 to-amber-600' : 'from-white to-zinc-500'}`}>{word}</span>
                          : <span>{word} </span>
                        }
                      </span>
                    ))}
                  </h1>
                )}

                <p className={`text-sm sm:text-base md:text-xl font-light max-w-xl mb-4 md:mb-10 line-clamp-none ${slide.type === 'raffle' ? 'text-yellow-100/80' : 'text-zinc-300'}`}>
                  {slide.subtitle}
                </p>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4">
                  {(slide.cta || []).map((btn: any) => {
                    if (btn.isEventTicket) {
                      return (
                        <button
                          key={btn.label}
                          onClick={() => {
                            setSelectedEvent(btn.event);
                            setIsModalOpen(true);
                          }}
                          className="group inline-flex w-full sm:w-auto justify-center items-center gap-2 px-6 py-3 md:px-8 md:py-4 text-xs sm:text-sm md:text-base font-black uppercase tracking-widest text-black bg-white hover:bg-zinc-100 transition-all hover:scale-105 rounded-sm"
                        >
                          <Ticket className="w-4 h-4 md:w-5 md:h-5" />
                          {btn.label}
                          <ChevronRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                      );
                    }
                    return btn.primary ? (
                      <Link
                        key={btn.label}
                        href={btn.href}
                        className={`group inline-flex w-full sm:w-auto justify-center items-center gap-2 px-6 py-3 md:px-8 md:py-4 text-xs sm:text-sm md:text-base font-black uppercase tracking-widest transition-all hover:scale-105 rounded-sm shadow-xl ${slide.type === 'raffle' ? 'bg-gradient-to-r from-yellow-500 to-amber-600 text-black hover:from-yellow-400 hover:to-amber-500 shadow-yellow-900/50' : 'text-black bg-white hover:bg-zinc-100'}`}
                      >
                        <Ticket className="w-4 h-4 md:w-5 md:h-5" />
                        {btn.label}
                        <ChevronRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    ) : (
                      <Link
                        key={btn.label}
                        href={btn.href}
                        className="inline-flex w-full sm:w-auto justify-center items-center gap-2 px-6 py-3 md:px-8 md:py-4 text-xs sm:text-sm md:text-base font-bold uppercase tracking-widest text-white border border-white/30 bg-white/5 hover:bg-white/10 backdrop-blur-sm transition-all hover:scale-105 rounded-sm"
                      >
                        {btn.label}
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="w-full lg:w-auto flex flex-col items-center lg:items-end">
                {slide.id && slide.image ? (
                  <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 30 }}
                    transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
                    className="block flex-shrink-0 relative mx-auto lg:mx-0 w-[280px] sm:w-[320px] lg:w-[450px]"
                  >
                    <div className={`absolute -inset-4 sm:-inset-8 blur-2xl sm:blur-3xl rounded-full ${slide.type === 'raffle' ? 'bg-yellow-500/20' : 'bg-red-600/15'}`} />
                    <div className="relative w-full">
                      <Image
                        src={slide.image}
                        alt={slide.title}
                        width={800}
                        height={1200}
                        className={`w-full h-auto object-contain rounded-sm border shadow-2xl ${slide.type === 'raffle' ? 'border-yellow-500/30' : 'border-white/10'}`}
                        priority={currentSlide === 0}
                      />
                      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${slide.type === 'raffle' ? 'bg-gradient-to-b from-yellow-400 to-amber-600' : 'bg-red-600'}`} />
                    </div>
                  </motion.div>
                ) : (
                  <div className="block flex-shrink-0 lg:hidden h-[20vh] sm:h-[30vh] w-full" aria-hidden="true" />
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {slides.length > 1 && (
          <>
            <button
              onClick={() => goTo(currentSlide - 1)}
              className="hidden md:flex absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/50 border border-white/10 backdrop-blur-sm items-center justify-center text-white hover:bg-white hover:text-black transition-all"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={() => goTo(currentSlide + 1)}
              className="hidden md:flex absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/50 border border-white/10 backdrop-blur-sm items-center justify-center text-white hover:bg-white hover:text-black transition-all"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        <div className="absolute bottom-16 md:bottom-12 left-0 right-0 z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex gap-2 justify-center md:justify-start">
              {slides.map((s, index) => (
                <button
                  key={index}
                  onClick={() => goTo(index)}
                  className={`relative overflow-hidden transition-all duration-500 rounded ${
                    currentSlide === index
                      ? 'w-32 md:w-40 h-16 md:h-20 opacity-100 border-2 border-white'
                      : 'w-10 md:w-16 h-16 md:h-20 opacity-40 hover:opacity-70 border border-white/20'
                  }`}
                >
                  <div className="absolute inset-0">
                    <Image src={s.image} alt={s.title} fill className="object-cover" style={{ filter: 'brightness(0.6)' }} sizes="160px" />
                  </div>
                  {currentSlide === index && (
                    <div className="absolute inset-0 flex items-end p-2">
                      <span className="text-[10px] font-bold text-white uppercase tracking-wider leading-tight line-clamp-2">{s.title}</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Resultados Section */}
      {chronicles && chronicles.length > 0 && (
        <section id="resultados" className="py-12 lg:py-16 bg-black relative border-t border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tight">Resultados</h2>
            <p className="text-zinc-500 mt-4 max-w-2xl mx-auto">Reseñas y fotos exclusivas de nuestros eventos pasados.</p>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            {chronicles.map((chronicle: any, i: number) => (
              <motion.div
                key={chronicle.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-zinc-900 border border-white/5 rounded-xl overflow-hidden hover:border-zinc-700 transition-colors flex flex-col"
              >
                {chronicle.image_url && (
                  <div className="relative w-full bg-zinc-800 flex justify-center items-center overflow-hidden">
                    <Image 
                      src={chronicle.image_url} 
                      alt={chronicle.title} 
                      width={800} 
                      height={600} 
                      className="w-full h-auto object-contain" 
                      sizes="(max-width: 768px) 100vw, 33vw" 
                    />
                  </div>
                )}
                <div className="p-6 flex-1 flex flex-col">
                  <div className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-2 flex justify-between items-center">
                    <span>{new Date(chronicle.created_at).toLocaleDateString()}</span>
                    <span className="truncate max-w-[50%] text-right" title={chronicle.writer}>{chronicle.writer}</span>
                  </div>
                  <h3 className="text-xl font-bold uppercase mb-3 line-clamp-2" title={chronicle.title}>{chronicle.title}</h3>
                  <p className="text-zinc-400 text-sm line-clamp-3 mb-4 whitespace-pre-line flex-1">{chronicle.content}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Premium Video Section */}
      <section className="py-12 lg:py-16 bg-black relative border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center w-full max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-4">¿Quieres ver más acción?</h2>
            <p className="text-zinc-500 mb-8 max-w-2xl mx-auto">Disfruta de contenido exclusivo en nuestra plataforma SCW Premium.</p>
            <div className={`grid grid-cols-1 ${premiumVideos.length > 1 ? 'md:grid-cols-2' : ''} gap-6 mb-8`}>
              {premiumVideos.length > 0 ? (
                premiumVideos.map((video: any, idx: number) => (
                  <Link key={idx} href="/premium" className="block relative aspect-video w-full rounded-xl overflow-hidden group border border-white/10 hover:border-red-500/50 transition-colors bg-zinc-900">
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors z-10"></div>
                    {video.youtube_id ? (
                      <Image src={`https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg`} alt={video.title || "SCW Premium"} fill className="object-cover transform group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <Image src="/images/scwpremium.webp" alt="SCW Premium" fill className="object-cover transform group-hover:scale-105 transition-transform duration-500" />
                    )}
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center">
                      <div className="w-14 h-14 rounded-full bg-red-600/90 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg mb-3">
                        <PlayCircle className="w-8 h-8 text-white" />
                      </div>
                      <span className="bg-black/80 backdrop-blur-md text-white font-black uppercase tracking-widest px-4 py-2 rounded text-xs shadow-xl border border-white/10">Explora Premium</span>
                    </div>
                  </Link>
                ))
              ) : (
                <Link href="/premium" className="block relative aspect-video w-full max-w-md mx-auto rounded-xl overflow-hidden group border border-white/10 hover:border-red-500/50 transition-colors bg-zinc-900">
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors z-10"></div>
                  <Image src="/images/scwpremium.webp" alt="SCW Premium" fill className="object-cover transform group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-red-600/90 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg mb-3">
                      <PlayCircle className="w-8 h-8 text-white" />
                    </div>
                    <span className="bg-black/80 backdrop-blur-md text-white font-black uppercase tracking-widest px-4 py-2 rounded text-xs shadow-xl border border-white/10">Explora Premium</span>
                  </div>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Roster Section */}
      <section className="py-12 lg:py-16 bg-black relative border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tight">El Roster</h2>
          <p className="text-zinc-500 mt-4 max-w-2xl mx-auto">Conoce a los atletas que dejan el alma en el cuadrilátero.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4">
          {roster.length === 0 ? (
            <div className="col-span-4 text-center text-zinc-500 py-12">Roster no disponible.</div>
          ) : (
            roster.map((fighter: any, i: number) => (
              <motion.div
                key={fighter.id}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group relative aspect-[3/4] bg-zinc-900 overflow-hidden cursor-pointer transition-all duration-500"
              >
                <div className="absolute inset-0 bg-zinc-800">
                  <Image src={fighter.image_url || '/images/logoring.webp'} alt={fighter.name} fill className="object-cover" sizes="(max-width: 768px) 50vw, 25vw" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                <div className="absolute bottom-0 left-0 p-4 w-full transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                  <SocialLinks fighter={fighter} />
                  <h3 className="text-xl font-black uppercase tracking-tighter">
                    {fighter.name}
                  </h3>
                </div>
              </motion.div>
            ))
          )}
        </div>

        <div className="mt-12 flex flex-col items-center">
          <Link href="/roster" className="inline-flex items-center text-sm font-bold uppercase tracking-widest hover:text-zinc-300 transition-colors border-b border-white pb-1 hover:border-zinc-500">
            Ver Roster Completo
          </Link>
        </div>
      </section>

      {/* Upcoming Events Section */}
      <section className="py-12 lg:py-16 bg-black relative border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-4xl font-black uppercase tracking-tight">Próximos Eventos</h2>
              <p className="text-zinc-500 mt-2">Asegura tu lugar en la historia.</p>
            </div>
            <Link href="/eventos" className="hidden md:flex items-center text-sm font-bold uppercase tracking-widest hover:text-zinc-300 transition-colors">
              Ver Cartelera Completa <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {events.length === 0 ? (
              <div className="col-span-3 text-center text-zinc-500 py-12">No hay eventos programados.</div>
            ) : (
              events.map((event: any, i: number) => (
                <Link key={event.id} href={`/eventos/${event.id}`} className="block">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="group relative h-96 bg-zinc-900 overflow-hidden cursor-pointer"
                  >
                    <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-105">
                      <Image src={event.banner_url || '/images/logoring.webp'} alt={event.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/20" />

                    <div className="absolute bottom-0 left-0 p-6 w-full">
                      <div className="flex items-center gap-2 text-zinc-400 text-sm font-bold uppercase tracking-widest mb-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(event.date_time).toLocaleDateString('es-MX')}
                      </div>
                      <h3 className="text-3xl font-black uppercase italic mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-zinc-500 transition-all duration-300">
                        {event.title}
                      </h3>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-zinc-300 text-sm">
                          <MapPin className="w-4 h-4" />
                          {event.location}
                        </div>
                        <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                          <ChevronRight className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>
      
      {/* Patrocinadores Section */}
      {sponsors && sponsors.length > 0 && (
        <section className="py-12 bg-black relative border-t border-white/5 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-8">
            <h2 className="text-2xl font-black uppercase tracking-widest text-zinc-500">Patrocinadores Oficiales</h2>
          </div>
          
          <div className="relative flex overflow-x-hidden group">
            <div className="animate-marquee flex whitespace-nowrap items-center min-w-full">
              {/* Duplicate array for seamless infinite scroll */}
              {[...sponsors, ...sponsors, ...sponsors].map((sponsor: any, idx: number) => {
                const SponsorContent = (
                  <div className="flex flex-col items-center justify-center min-w-[150px]">
                    {sponsor.image_url ? (
                      <div className="relative w-32 h-20 sm:w-40 sm:h-24 transition-all duration-300">
                        <Image 
                          src={sponsor.image_url} 
                          alt={sponsor.name} 
                          fill 
                          className="object-contain"
                          sizes="(max-width: 768px) 150px, 200px"
                        />
                      </div>
                    ) : (
                      <span className="text-xl font-black uppercase text-zinc-400">
                        {sponsor.name}
                      </span>
                    )}
                    {(sponsor.description || sponsor.phone || sponsor.address) && (
                      <div className="mt-2 text-center hidden md:block">
                        {sponsor.phone && <p className="text-xs text-zinc-500">{sponsor.phone}</p>}
                      </div>
                    )}
                  </div>
                );

                return sponsor.url ? (
                  <a
                    key={`${sponsor.id}-${idx}`}
                    href={sponsor.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mx-8 sm:mx-16 opacity-70 hover:opacity-100 transition-opacity cursor-pointer block"
                  >
                    {SponsorContent}
                  </a>
                ) : (
                  <div
                    key={`${sponsor.id}-${idx}`}
                    className="mx-8 sm:mx-16 opacity-70 hover:opacity-100 transition-opacity"
                  >
                    {SponsorContent}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
      
      {selectedEvent && (
        <TicketSelectionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          eventId={selectedEvent.id}
          event={selectedEvent}
        />
      )}
    </div>
  );
}
