import { Coordinates } from '../../types/geo';
import { GeocodingProvider, GeocodingResult } from '../../types/providers';
import { searchOfflineSeeds } from './offlineSeedProvider';

export class NominatimGeocodingProvider implements GeocodingProvider {
  name = 'Nominatim (OpenStreetMap)';

  async search(query: string): Promise<GeocodingResult[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    // Check offline seeds first for instant high-accuracy results
    const offlineMatches = searchOfflineSeeds(trimmed);

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        trimmed
      )}&addressdetails=1&limit=8`;

      const response = await fetch(url, {
        headers: {
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      if (!response.ok) {
        return offlineMatches;
      }

      const data = await response.json();
      const results: GeocodingResult[] = data.map((item: any, idx: number) => {
        const address = item.address || {};
        const country = address.country || '';
        const region = address.state || address.region || address.county || '';
        const city = address.city || address.town || address.village || address.municipality || item.name;

        return {
          id: `nom_${item.place_id || idx}_${Date.now()}`,
          canonicalName: item.display_name,
          displayName: city ? (region ? `${city}, ${region}` : city) : item.display_name.split(',')[0],
          coordinates: {
            lng: parseFloat(item.lon),
            lat: parseFloat(item.lat),
          },
          country,
          region,
          type: item.type,
        };
      });

      // Merge results avoiding duplicate locations
      const combined = [...offlineMatches];
      for (const res of results) {
        if (!combined.some(c => Math.abs(c.coordinates.lng - res.coordinates.lng) < 0.05 && Math.abs(c.coordinates.lat - res.coordinates.lat) < 0.05)) {
          combined.push(res);
        }
      }

      return combined.length > 0 ? combined : results;
    } catch (err) {
      console.warn('Online geocoding failed, using offline seed provider:', err);
      return offlineMatches;
    }
  }

  async reverse(coordinates: Coordinates): Promise<GeocodingResult | null> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coordinates.lat}&lon=${coordinates.lng}`;
      const response = await fetch(url);
      if (!response.ok) return null;
      const data = await response.json();
      return {
        id: `nom_rev_${Date.now()}`,
        canonicalName: data.display_name,
        displayName: data.name || data.display_name.split(',')[0],
        coordinates,
      };
    } catch {
      return null;
    }
  }
}
