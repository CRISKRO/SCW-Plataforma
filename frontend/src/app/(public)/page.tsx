import HomeCarousel from '@/components/HomeCarousel';

export default async function Home() {
  // Try to fetch data on the server side
  // In Next.js App Router, fetch can be cached, but we'll use a standard fetch 
  // pointing to the API URL or fallback to empty arrays if backend is unreachable at build/render time.

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
  
  let eventsData = [];
  let fightersData = [];
  let chroniclesData = [];
  let premiumVideos = [];
  let sponsorsData = [];
  let rafflesData: any[] = [];
  let eventPostsData: any[] = [];

  try {
    // We use next: { revalidate: 10 } to cache these responses for 10 seconds
    const [eventsRes, fightersRes, chroniclesRes, videosRes, sponsorsRes, rafflesRes, postsRes] = await Promise.all([
      fetch(`${apiUrl}/events/events/`, { next: { revalidate: 10 } }).catch(() => null),
      fetch(`${apiUrl}/events/fighters/`, { next: { revalidate: 10 } }).catch(() => null),
      fetch(`${apiUrl}/events/chronicles/`, { next: { revalidate: 10 } }).catch(() => null),
      fetch(`${apiUrl}/premium/videos/`, { next: { revalidate: 10 } }).catch(() => null),
      fetch(`${apiUrl}/events/sponsors/`, { next: { revalidate: 10 } }).catch(() => null),
      fetch(`${apiUrl}/raffles/`, { next: { revalidate: 10 } }).catch(() => null),
      fetch(`${apiUrl}/events/posts/`, { next: { revalidate: 10 } }).catch(() => null),
    ]);

    if (eventsRes && eventsRes.ok) eventsData = await eventsRes.json();
    if (fightersRes && fightersRes.ok) fightersData = await fightersRes.json();
    if (chroniclesRes && chroniclesRes.ok) chroniclesData = await chroniclesRes.json();
    if (videosRes && videosRes.ok) {
      const vData = await videosRes.json();
      premiumVideos = vData.data || vData || [];
    }
    if (sponsorsRes && sponsorsRes.ok) sponsorsData = await sponsorsRes.json();
    if (rafflesRes && rafflesRes.ok) rafflesData = await rafflesRes.json();
    if (postsRes && postsRes.ok) {
      const pData = await postsRes.json();
      eventPostsData = pData.results || pData || [];
    }
  } catch (error) {
    console.error("Error fetching data for Home Server Component:", error);
  }

  const upcomingEvents = eventsData.slice(0, 5);
  const events = eventsData.slice(0, 3);
  const roster = fightersData.slice(0, 4);
  const chronicles = chroniclesData.slice(0, 3);
  premiumVideos = premiumVideos.slice(0, 2);
  const sponsors = sponsorsData.filter((s: any) => s.is_active);
  const activeRaffles = rafflesData.filter((r: any) => r.is_active);
  const activeEventPosts = eventPostsData.filter((p: any) => p.is_active);

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
