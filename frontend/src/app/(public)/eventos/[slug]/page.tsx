import { Metadata, ResolvingMetadata } from 'next'
import EventDetailClient from './EventDetailClient'
import { eventsService } from '@/services/events.services'

export const revalidate = 300; // Cache event pages for 5 minutes on Vercel Edge CDN

type Props = {
  params: Promise<{ slug: string }>
}

async function getEventBySlug(slug: string) {
  try {
    const res = await fetch('http://renescw.pythonanywhere.com/api/events/events/', { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const events = await res.json();
    if (!Array.isArray(events)) return null;
    return events.find((e: any) => {
      if (!e || !e.title) return false;
      const genSlug = e.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      return genSlug === slug || e.id.toString() === slug;
    });
  } catch (error) {
    console.error("Error fetching event for SSR:", error);
    return null;
  }
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const resolvedParams = await params;
  const event = await getEventBySlug(resolvedParams.slug)
  
  if (!event) return { title: 'Evento no encontrado' }

  return {
    title: `${event.title} - SCW DOJO`,
    description: event.description,
    openGraph: {
      title: `${event.title} | SCW Lucha Libre`,
      description: event.description,
      images: [event.banner_url],
    },
  }
}

export default async function EventPage({ params }: Props) {
  const resolvedParams = await params;
  const event = await getEventBySlug(resolvedParams.slug)
  
  if (!event) {
    return <div className="min-h-screen bg-black text-white pt-32 text-center text-2xl">Evento no encontrado</div>
  }

  return <EventDetailClient event={event} />
}
