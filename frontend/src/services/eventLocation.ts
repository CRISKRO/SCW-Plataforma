// Enlaces de Google Maps de las sedes conocidas. Si la sede no está aquí,
// se hace una búsqueda en Maps con el nombre del lugar.
const VENUE_LINKS: { match: string; url: string }[] = [
  { match: 'dojo', url: 'https://share.google/zSjJUeXVE9kBjhAzr' },
  { match: 'bru', url: 'https://share.google/XC12tA4brVnhM3lbu' }, // Cervecería LA BRU
];

export function getEventMapUrl(location?: string | null): string {
  const name = (location || '').toLowerCase();
  const venue = VENUE_LINKS.find((v) => name.includes(v.match));
  if (venue) return venue.url;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location || '')}`;
}
