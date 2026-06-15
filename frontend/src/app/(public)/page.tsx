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

  try {
    // We use next: { revalidate: 60 } to cache these responses for 60 seconds
    const [eventsRes, fightersRes, chroniclesRes, videosRes] = await Promise.all([
      fetch(`${apiUrl}/events/events/`, { next: { revalidate: 60 } }).catch(() => null),
      fetch(`${apiUrl}/events/fighters/`, { next: { revalidate: 60 } }).catch(() => null),
      fetch(`${apiUrl}/events/chronicles/`, { next: { revalidate: 60 } }).catch(() => null),
      fetch(`${apiUrl}/premium/videos/`, { next: { revalidate: 60 } }).catch(() => null),
    ]);

    if (eventsRes && eventsRes.ok) eventsData = await eventsRes.json();
    if (fightersRes && fightersRes.ok) fightersData = await fightersRes.json();
    if (chroniclesRes && chroniclesRes.ok) chroniclesData = await chroniclesRes.json();
    if (videosRes && videosRes.ok) {
      const vData = await videosRes.json();
      premiumVideos = vData.data || vData || [];
    }
  } catch (error) {
    console.error("Error fetching data for Home Server Component:", error);
  }

  const upcomingEvents = eventsData.slice(0, 5);
  const events = eventsData.slice(0, 3);
  const roster = fightersData.slice(0, 4);
  const chronicles = chroniclesData.slice(0, 3);
  premiumVideos = premiumVideos.slice(0, 2);

  return (
    <main>
      <HomeCarousel 
        upcomingEvents={upcomingEvents}
        events={events}
        roster={roster}
        chronicles={chronicles}
        premiumVideos={premiumVideos}
      />
    </main>
  );
}
