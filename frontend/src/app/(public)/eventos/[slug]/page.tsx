import { Metadata, ResolvingMetadata } from 'next'
import EventDetailClient from './EventDetailClient'

type Props = {
  params: { slug: string }
}

async function getEventBySlug(slug: string) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://scw-plataforma-1.onrender.com/api'}/events/events/`, { next: { revalidate: 60 } })
    const events = await res.json()
    return events.find((e: any) => {
      const genSlug = e.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      return genSlug === slug || e.id.toString() === slug;
    })
  } catch (error) {
    console.error("Error fetching event for SSR:", error)
    return null
  }
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const event = await getEventBySlug(params.slug)
  
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
  const event = await getEventBySlug(params.slug)
  
  if (!event) {
    return <div className="min-h-screen bg-black text-white pt-32 text-center text-2xl">Evento no encontrado</div>
  }

  return <EventDetailClient event={event} />
}
