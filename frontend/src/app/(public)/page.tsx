import HomeCarousel from '@/components/HomeCarousel';

export const revalidate = 60; // Cache on Vercel Edge CDN for 60 seconds for instant 20ms page loads

async function safeFetchJson(url: string) {
  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (res && res.ok) {
      return await res.json();
    }
  } catch {
    // Ignore fetch errors during build time
  }

  if (url.startsWith('https://')) {
    const httpUrl = url.replace('https://', 'http://');
    try {
      const res = await fetch(httpUrl, { next: { revalidate: 60 } });
      if (res && res.ok) {
        return await res.json();
      }
    } catch {
      // Ignore HTTP fallback errors during build time
    }
  }

  return null;
}

export default async function Home() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://renescw.pythonanywhere.com/api';

  let eventsData = [];
  let fightersData = [];
  let chroniclesData = [];
  let premiumVideos = [];
  let sponsorsData = [];
  let rafflesData: any[] = [];
  let eventPostsData: any[] = [];

  try {
    const [eventsRes, fightersRes, chroniclesRes, videosRes, sponsorsRes, rafflesRes, postsRes] = await Promise.all([
      safeFetchJson(`${apiUrl}/events/events/`),
      safeFetchJson(`${apiUrl}/events/fighters/`),
      safeFetchJson(`${apiUrl}/events/chronicles/`),
      safeFetchJson(`${apiUrl}/premium/videos/`),
      safeFetchJson(`${apiUrl}/events/sponsors/`),
      safeFetchJson(`${apiUrl}/raffles/`),
      safeFetchJson(`${apiUrl}/events/posts/`),
    ]);

    if (eventsRes && Array.isArray(eventsRes)) eventsData = eventsRes;
    if (fightersRes && Array.isArray(fightersRes)) fightersData = fightersRes;
    if (chroniclesRes && Array.isArray(chroniclesRes)) chroniclesData = chroniclesRes;
    if (videosRes) {
      premiumVideos = videosRes.results || videosRes.data || (Array.isArray(videosRes) ? videosRes : []);
    }
    if (sponsorsRes && Array.isArray(sponsorsRes)) sponsorsData = sponsorsRes;
    if (rafflesRes && Array.isArray(rafflesRes)) rafflesData = rafflesRes;
    if (postsRes) {
      eventPostsData = postsRes.results || (Array.isArray(postsRes) ? postsRes : []);
    }
  } catch (error) {
    console.error("Error fetching data for Home Server Component:", error);
  }

  const publishedEvents = eventsData.filter((ev: any) => ev.status !== 'DRAFT');
  const upcomingEvents = publishedEvents.slice(0, 5);
  const events = publishedEvents.slice(0, 3);
  const roster = fightersData.slice(0, 4);
  const chronicles = chroniclesData.slice(0, 3);
  const sponsors = sponsorsData.filter((s: any) => s.is_active);
  const activeRaffles = rafflesData.filter((r: any) => r.is_active);
  const activeEventPosts = eventPostsData.filter((p: any) => p.is_active && p.event_status !== 'DRAFT');

  return (
    <main>
      <HomeCarousel 
        upcomingEvents={upcomingEvents}
        events={events}
        roster={roster}
        chronicles={chronicles}
        premiumVideos={premiumVideos}
        sponsors={sponsors}
        raffles={activeRaffles}
        eventPosts={activeEventPosts}
      />
    </main>
  );
}


