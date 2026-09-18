/**
 * Curated Royalty-Free Travel & Road Trip Music Library
 */

export interface MusicTrack {
  id: string;
  title: string;
  genre: string;
  description: string;
  vibeTag: string;
  url: string;
  durationSeconds: number;
}

export const CURATED_TRACKS: MusicTrack[] = [
  {
    id: 'acoustic-journey',
    title: 'Acoustic Journey',
    genre: 'Folk / Indie',
    description: 'Warm acoustic guitar and rhythmic handclaps. Perfect for road trips and scenic routes.',
    vibeTag: 'Alegre • Carretera',
    url: 'https://cdn.freesound.org/previews/565/565985_11861866-lq.mp3',
    durationSeconds: 45,
  },
  {
    id: 'cinematic-horizon',
    title: 'Cinematic Horizon',
    genre: 'Orchestral',
    description: 'Sweeping atmospheric strings and piano. Ideal for epic flights and landmark overviews.',
    vibeTag: 'Épico • Documental',
    url: 'https://cdn.freesound.org/previews/612/612095_5674468-lq.mp3',
    durationSeconds: 60,
  },
  {
    id: 'lofi-wanderlust',
    title: 'Lo-Fi Wanderlust',
    genre: 'Chillhop',
    description: 'Relaxing lo-fi hip-hop beats with vinyl warmth. Great for modern reels and city walks.',
    vibeTag: 'Chill • Moderno',
    url: 'https://cdn.freesound.org/previews/495/495574_10672051-lq.mp3',
    durationSeconds: 52,
  },
  {
    id: 'vintage-nostalgia',
    title: 'Route 66 Americana',
    genre: 'Country / Blues',
    description: 'Vintage slide guitar and retro highway rhythm. Matches vintage Americana and Route 66.',
    vibeTag: 'Retro • Clásico',
    url: 'https://cdn.freesound.org/previews/665/665181_1660144-lq.mp3',
    durationSeconds: 40,
  },
];
