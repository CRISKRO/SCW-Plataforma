import HomeCarousel from '@/components/HomeCarousel';

async function safeFetch(url: string) {
  try {
    const res = await fetch(url, { next: { revalidate: 10 } });
    if (res.ok) return res;
  } catch (err) {
    console.error(`Fetch HTTPS error for ${url}:`, err);
  }

  if (url.startsWith('https://')) {
    const httpUrl = url.replace('https://', 'http://');
    try {
      const res = await fetch(httpUrl, { next: { revalidate: 10 } });
      if (res.ok) return res;
    } catch (err) {
      console.error(`Fetch HTTP fallback error for ${httpUrl}:`, err);
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
      safeFetch(`${apiUrl}/events/events/`),
      safeFetch(`${apiUrl}/events/fighters/`),
      safeFetch(`${apiUrl}/events/chronicles/`),
      safeFetch(`${apiUrl}/premium/videos/`),
      safeFetch(`${apiUrl}/events/sponsors/`),
      safeFetch(`${apiUrl}/raffles/`),
      safeFetch(`${apiUrl}/events/posts/`),
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

