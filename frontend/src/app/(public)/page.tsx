"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, ChevronLeft, Calendar, MapPin, Ticket } from 'lucide-react';
import { eventsService } from '@/services/events.services';

// Always-present promotional slides
const staticSlides = [
  {
    id: null,
    title: "Lucha Extrema",
    subtitle: "Siente el impacto. Vive la gloria. La plataforma oficial de SCW Strong Classic Wrestling.",
    image: "/images/logoring.png",
    date: null,
    location: null,
    cta: [
      { label: "Comprar Boletos", href: "/eventos", primary: true },
      { label: "Ver Cartelera", href: "/eventos", primary: false },
    ],
  },
  {
    id: null,
    title: "SCW Premium",
    subtitle: "Accede a contenido exclusivo, PPVs en vivo y el archivo histórico de nuestras mejores luchas.",
    image: "/images/scwpremium.jpeg",
    date: null,
    location: null, 
    cta: [
      { label: "Acceder a Premium", href: "/premium", primary: true },
      { label: "Suscribirse Ahora", href: "/register", primary: false },
    ],
  },
  {
    id: null,
    title: "SCW Dojo",
    subtitle: "Únete a nuestra escuela oficial. Aprende de los profesionales y conviértete en la próxima estrella.",
    image: "/images/logoring2.png",
    date: null,
    location: null,
    cta: [
      { label: "Unirse al Dojo", href: "/escuela", primary: true },
      { label: "Saber Más", href: "/escuela", primary: false },
    ],
  },
];

export default function Home() {
  const [events, setEvents] = useState<any[]>([]);
  const [roster, setRoster] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slides, setSlides] = useState(staticSlides as any[]);

  // Build slides from events once loaded
  useEffect(() => {
    const loadData = async () => {
      try {
        const [eventsData, fightersData] = await Promise.all([
          eventsService.getEvents(),
          eventsService.getFighters()
        ]);

        const upcoming = eventsData.slice(0, 5);
        setEvents(eventsData.slice(0, 3));
        setRoster(fightersData.slice(0, 4));

        if (upcoming.length > 0) {
          // Append event slides to the static promotional slides
          const eventSlides = upcoming.map((ev: any) => ({
            id: ev.id,
            title: ev.title,
            subtitle: ev.description || `${ev.location}`,
            image: ev.banner_url || '/images/logoring.png',
            date: ev.date_time,
            location: ev.location,
            cta: [
              { label: 'Comprar Boletos', href: `/eventos/${ev.id}`, primary: true },
              { label: 'Todos los Eventos', href: '/eventos', primary: false },
            ],
          }));
          setSlides([...staticSlides, ...eventSlides]);
        }
      } catch (error) {
        console.error("Error loading home data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Auto-play carousel
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const goTo = (index: number) => setCurrentSlide((index + slides.length) % slides.length);
  const slide = slides[currentSlide];

  return (
    <div className="bg-black text-white selection:bg-zinc-500 selection:text-white">

      {/* Hero Section Carousel */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">

        {/* Background: full-screen for static slides, dark for event slides */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4, ease: "easeInOut" }}
            className="absolute inset-0 z-0"
          >
            {slide.id ? (
              // Event slide: solid dark background, poster on the right
              <>
                <div className="absolute inset-0 bg-zinc-950" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,_#18181b_0%,_#000_60%)]" />
              </>
            ) : (
              // Static slide: full bleed background image
              <>
                <div
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{ backgroundImage: `url(${slide.image})`, filter: 'brightness(0.35)' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60" />
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full -mt-8 md:mt-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={`content-${currentSlide}`}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className={`flex flex-col-reverse lg:flex-row items-center gap-6 lg:gap-12 ${slide.id ? 'justify-between' : 'justify-start'}`}
            >
              {/* Left: Text content */}
              <div className="w-full max-w-2xl flex-shrink-0 text-center lg:text-left flex flex-col items-center lg:items-start">
                {/* Event badge */}
                {slide.date && (
                  <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mb-4 lg:mb-6">
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

                <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter uppercase leading-none mb-4 md:mb-6">
                  {slide.title.split(' ').map((word: string, i: number) => (
                    <span key={i}>
                      {i === slide.title.split(' ').length - 1
                        ? <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-500">{word}</span>
                        : <span>{word} </span>
                      }
                    </span>
                  ))}
                </h1>

                <p className="text-sm sm:text-base md:text-xl text-zinc-300 font-light max-w-xl mb-6 md:mb-10 line-clamp-none">
                  {slide.subtitle}
                </p>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4">
                  {(slide.cta || []).map((btn: any) => (
                    btn.primary ? (
                      <Link
                        key={btn.label}
                        href={btn.href}
                        className="group inline-flex justify-center items-center gap-2 px-6 py-3 md:px-8 md:py-4 text-xs sm:text-sm md:text-base font-black uppercase tracking-widest text-black bg-white hover:bg-zinc-100 transition-all hover:scale-105 rounded-sm"
                      >
                        <Ticket className="w-4 h-4 md:w-5 md:h-5" />
                        {btn.label}
                        <ChevronRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    ) : (
                      <Link
                        key={btn.label}
                        href={btn.href}
                        className="inline-flex justify-center items-center gap-2 px-6 py-3 md:px-8 md:py-4 text-xs sm:text-sm md:text-base font-bold uppercase tracking-widest text-white border border-white/30 bg-white/5 hover:bg-white/10 backdrop-blur-sm transition-all hover:scale-105 rounded-sm"
                      >
                        {btn.label}
                      </Link>
                    )
                  ))}
                </div>
              </div>

              {/* Right: Event poster (only for event slides) */}
              {slide.id && slide.image && (
                <motion.div
                  initial={{ opacity: 0, x: 60 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 60 }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                  className="block flex-shrink-0 relative w-48 sm:w-64 lg:w-96 xl:w-[420px] mx-auto lg:mx-0"
                >
                  {/* Glow effect behind poster */}
                  <div className="absolute -inset-4 sm:-inset-8 bg-red-600/15 blur-2xl sm:blur-3xl rounded-full" />
                  {/* Poster image */}
                  <div className="relative w-full aspect-[2/3] rounded-xl sm:rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.9)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={slide.image}
                      alt={slide.title}
                      className="w-full h-full object-cover"
                    />
                    {/* Subtle gradient overlay on poster */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    {/* Red accent line */}
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-600" />
                    {/* Event title at bottom of poster */}
                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <p className="text-xs font-black uppercase tracking-widest text-red-400 mb-1">Próximo Evento</p>
                      <p className="text-white font-black text-xl uppercase tracking-tight leading-tight">{slide.title}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation arrows (hidden on mobile to prevent text overlap) */}
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

        {/* Slide thumbnails / indicators at bottom */}
        <div className="absolute bottom-28 left-0 right-0 z-20">
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
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${s.image})`, filter: 'brightness(0.6)' }}
                  />
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

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center text-zinc-500"
        >
          <span className="text-xs uppercase tracking-widest mb-2 font-bold">Descubre Más</span>
          <div className="w-[1px] h-10 bg-gradient-to-b from-zinc-500 to-transparent" />
        </motion.div>
      </section>

      {/* Upcoming Events Section */}
      <section className="py-24 bg-zinc-950 relative border-t border-white/5">
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
            {loading ? (
              <div className="col-span-3 text-center text-zinc-500 py-12">Cargando eventos...</div>
            ) : events.length === 0 ? (
              <div className="col-span-3 text-center text-zinc-500 py-12">No hay eventos programados.</div>
            ) : (
              events.map((event, i) => (
                <Link key={event.id} href={`/eventos/${event.id}`} className="block">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="group relative h-96 bg-zinc-900 overflow-hidden cursor-pointer"
                  >
                    <div className="absolute inset-0 bg-zinc-800 transition-transform duration-700 group-hover:scale-105" style={{ backgroundImage: `url(${event.banner_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
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

      {/* Roster Section */}
      <section className="py-24 bg-black relative border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tight">El Roster</h2>
          <p className="text-zinc-500 mt-4 max-w-2xl mx-auto">Conoce a los atletas que dejan el alma en el cuadrilátero.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4">
          {loading ? (
            <div className="col-span-4 text-center text-zinc-500 py-12">Cargando roster...</div>
          ) : roster.length === 0 ? (
            <div className="col-span-4 text-center text-zinc-500 py-12">Roster no disponible.</div>
          ) : (
            roster.map((fighter, i) => (
              <motion.div
                key={fighter.id}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group relative aspect-[3/4] bg-zinc-900 overflow-hidden cursor-pointer grayscale hover:grayscale-0 transition-all duration-500"
              >
                <div className="absolute inset-0 bg-zinc-800" style={{ backgroundImage: `url(${fighter.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                <div className="absolute bottom-0 left-0 p-4 w-full transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                  <span className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1 block">
                    {fighter.alignment}
                  </span>
                  <h3 className="text-xl font-black uppercase tracking-tighter">
                    {fighter.name}
                  </h3>
                </div>
              </motion.div>
            ))
          )}
        </div>

        <div className="mt-12 text-center">
          <Link href="/roster" className="inline-flex items-center text-sm font-bold uppercase tracking-widest hover:text-zinc-300 transition-colors border-b border-white pb-1 hover:border-zinc-500">
            Ver Roster Completo
          </Link>
        </div>
      </section>
    </div>
  );
}
