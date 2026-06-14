"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, ChevronLeft, Calendar, MapPin, Ticket, PlayCircle, Video } from 'lucide-react';
import { eventsService } from '@/services/events.services';
import api from '@/services/api';

import { TicketSelectionModal } from '@/components/TicketSelectionModal';

// Always-present promotional slides
const staticSlides = [
  {
    id: null,
    title: "Lucha Extrema",
    subtitle: "Siente el impacto. Vive la gloria. La plataforma oficial de SCW Strong Classic Wrestling.",
    image: "/images/logoring.png",
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
    image: "/images/logoring2.png", // Or a specific store image if available
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
    title: "SCW DOJO",
    subtitle: "Únete a nuestro centro de entrenamiento oficial. Aprende de los profesionales y conviértete en la próxima estrella.",
    image: "/images/logoring2.png",
    date: null,
    location: null,
    cta: [
      { label: "Unirse a SCW DOJO", href: "/escuela", primary: true },
      { label: "Saber Más", href: "/escuela", primary: false },
    ],
  },
];

export default function Home() {
  const [events, setEvents] = useState<any[]>([]);
  const [roster, setRoster] = useState<any[]>([]);
  const [chronicles, setChronicles] = useState<any[]>([]);
  const [premiumVideos, setPremiumVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slides, setSlides] = useState(staticSlides as any[]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Build slides from events once loaded
  useEffect(() => {
    const loadData = async () => {
      try {
        const [eventsData, fightersData, chroniclesData, videosResponse] = await Promise.all([
          eventsService.getEvents(),
          eventsService.getFighters(),
          eventsService.getChronicles(),
          api.get('/premium/videos/').catch(() => ({ data: [] }))
        ]);

        const upcoming = eventsData.slice(0, 5);
        setEvents(eventsData.slice(0, 3));
        setRoster(fightersData.slice(0, 4));
        setChronicles(chroniclesData.slice(0, 3));
        
        const videosData = videosResponse.data || [];
        if (videosData.length > 0) {
          setPremiumVideos(videosData.slice(0, 2));
        }

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
              { label: 'Comprar Boletos', href: `/eventos/${ev.id}`, primary: true, isEventTicket: true, event: ev },
              { label: 'Todos los Eventos', href: '/eventos', primary: false },
            ],
          }));
          setSlides([...eventSlides, ...staticSlides]);
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
    }, 15000); // Also reduced to 15s to be more noticeable, but let's keep it close to original
    return () => clearInterval(timer);
  }, [slides.length, currentSlide]);

  const goTo = (index: number) => setCurrentSlide((index + slides.length) % slides.length);
  const slide = slides[currentSlide];

  return (
    <div className="bg-black text-white selection:bg-zinc-500 selection:text-white">

      {/* Hero Section Carousel */}
      <section className="relative min-h-[100svh] flex items-center justify-center overflow-hidden">

        {/* Background: full-screen for static slides, dark for event slides */}
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
              // Event slide: solid dark background, poster on the right
              <>
                <div className="absolute inset-0 bg-zinc-950" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,_#18181b_0%,_#000_60%)]" />
              </>
            ) : (
              // Static slide: full bleed background image (separated for mobile and desktop)
              <>
                {/* Desktop Background */}
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
                {/* Mobile Background */}
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

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full mt-4 md:mt-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={`content-${currentSlide}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className={`flex flex-col-reverse lg:flex-row items-center gap-4 sm:gap-6 lg:gap-12 ${slide.id ? 'justify-between pt-16 pb-28 md:py-0 w-full' : 'justify-center mt-[-15vh] md:mt-0 w-full'}`}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={(e, { offset }) => {
                const swipe = offset.x;
                if (swipe < -50) goTo(currentSlide + 1);
                else if (swipe > 50) goTo(currentSlide - 1);
              }}
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

                {!slide.id && (
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
                )}

                <p className="text-sm sm:text-base md:text-xl text-zinc-300 font-light max-w-xl mb-6 md:mb-10 line-clamp-none">
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
                        className="group inline-flex w-full sm:w-auto justify-center items-center gap-2 px-6 py-3 md:px-8 md:py-4 text-xs sm:text-sm md:text-base font-black uppercase tracking-widest text-black bg-white hover:bg-zinc-100 transition-all hover:scale-105 rounded-sm"
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

              {/* Right: Event poster (only for event slides) or spacer for static slides */}
              <div className="w-full lg:w-auto flex flex-col items-center lg:items-end">
                {slide.id && slide.image ? (
                  <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 30 }}
                    transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
                    className="block flex-shrink-0 relative mx-auto lg:mx-0 h-[40vh] sm:h-[50vh] lg:h-[70vh] xl:h-[75vh] max-h-[750px] aspect-[2/3]"
                  >
                    {/* Glow effect behind poster */}
                    <div className="absolute -inset-4 sm:-inset-8 bg-red-600/15 blur-2xl sm:blur-3xl rounded-full" />
                    {/* Poster image */}
                    <div className="relative h-full w-full">
                      <Image
                        src={slide.image}
                        alt={slide.title}
                        fill
                        className="object-cover rounded-sm border border-white/10 shadow-2xl"
                        priority={currentSlide === 0}
                      />
                      {/* Edge highlight */}
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-600" />
                    </div>
                  </motion.div>
                ) : (
                  <div className="block flex-shrink-0 lg:hidden h-[50vh] sm:h-[60vh] w-full" aria-hidden="true" />
                )}
              </div>
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
        <div className="absolute bottom-20 md:bottom-12 left-0 right-0 z-20">
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

      {/* Chronicles Section */}
      {chronicles && chronicles.length > 0 && (
        <section className="py-12 lg:py-16 bg-black relative border-t border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tight">Crónicas</h2>
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
                  <div className="relative aspect-square w-full bg-zinc-800">
                    <Image src={chronicle.image_url} alt={chronicle.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
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
                      <Image src="/images/scwpremium.jpeg" alt="SCW Premium" fill className="object-cover transform group-hover:scale-105 transition-transform duration-500" />
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
                  <Image src="/images/scwpremium.jpeg" alt="SCW Premium" fill className="object-cover transform group-hover:scale-105 transition-transform duration-500" />
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
                className="group relative aspect-[3/4] bg-zinc-900 overflow-hidden cursor-pointer transition-all duration-500"
              >
                <div className="absolute inset-0 bg-zinc-800">
                  <Image src={fighter.image_url || '/images/logoring.png'} alt={fighter.name} fill className="object-cover" sizes="(max-width: 768px) 50vw, 25vw" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                <div className="absolute bottom-0 left-0 p-4 w-full transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                  {fighter.social_network && (
                    <span className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1 block">
                      {fighter.social_network}
                    </span>
                  )}
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
                    <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-105">
                      <Image src={event.banner_url || '/images/logoring.png'} alt={event.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
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
