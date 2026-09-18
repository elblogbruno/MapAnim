import { GeocodingResult } from '../../types/providers';

export const OFFLINE_GEO_SEEDS: GeocodingResult[] = [
  // Route 66
  { id: 'seed_chicago', canonicalName: 'Chicago, Illinois, United States', displayName: 'Chicago, IL', coordinates: { lng: -87.6298, lat: 41.8781 }, region: 'Illinois', country: 'United States' },
  { id: 'seed_st_louis', canonicalName: 'St. Louis, Missouri, United States', displayName: 'St. Louis, MO', coordinates: { lng: -90.1994, lat: 38.6270 }, region: 'Missouri', country: 'United States' },
  { id: 'seed_carthage', canonicalName: 'Carthage, Missouri, United States', displayName: 'Carthage, MO', coordinates: { lng: -94.3094, lat: 37.1764 }, region: 'Missouri', country: 'United States' },
  { id: 'seed_clinton', canonicalName: 'Clinton, Oklahoma, United States', displayName: 'Clinton, OK', coordinates: { lng: -98.9665, lat: 35.5145 }, region: 'Oklahoma', country: 'United States' },
  { id: 'seed_tucumcari', canonicalName: 'Tucumcari, New Mexico, United States', displayName: 'Tucumcari, NM', coordinates: { lng: -103.7250, lat: 35.1717 }, region: 'New Mexico', country: 'United States' },
  { id: 'seed_grants', canonicalName: 'Grants, New Mexico, United States', displayName: 'Grants, NM', coordinates: { lng: -107.8514, lat: 35.1473 }, region: 'New Mexico', country: 'United States' },
  { id: 'seed_gallup', canonicalName: 'Gallup, New Mexico, United States', displayName: 'Gallup, NM', coordinates: { lng: -108.7426, lat: 35.5281 }, region: 'New Mexico', country: 'United States' },
  { id: 'seed_monument_valley', canonicalName: 'Monument Valley, Arizona/Utah, United States', displayName: 'Monument Valley, AZ/UT', coordinates: { lng: -110.1735, lat: 36.9980 }, region: 'Arizona/Utah', country: 'United States' },
  { id: 'seed_las_vegas', canonicalName: 'Las Vegas, Nevada, United States', displayName: 'Las Vegas, NV', coordinates: { lng: -115.1398, lat: 36.1699 }, region: 'Nevada', country: 'United States' },
  { id: 'seed_los_angeles', canonicalName: 'Los Angeles, California, United States', displayName: 'Los Angeles, CA', coordinates: { lng: -118.2437, lat: 34.0522 }, region: 'California', country: 'United States' },
  { id: 'seed_santa_monica', canonicalName: 'Santa Monica, California, United States', displayName: 'Santa Monica, CA', coordinates: { lng: -118.4912, lat: 34.0195 }, region: 'California', country: 'United States' },

  // US Major
  { id: 'seed_new_york', canonicalName: 'New York, New York, United States', displayName: 'New York, NY', coordinates: { lng: -74.0060, lat: 40.7128 }, region: 'New York', country: 'United States' },
  { id: 'seed_san_francisco', canonicalName: 'San Francisco, California, United States', displayName: 'San Francisco, CA', coordinates: { lng: -122.4194, lat: 37.7749 }, region: 'California', country: 'United States' },
  { id: 'seed_seattle', canonicalName: 'Seattle, Washington, United States', displayName: 'Seattle, WA', coordinates: { lng: -122.3321, lat: 47.6062 }, region: 'Washington', country: 'United States' },
  { id: 'seed_miami', canonicalName: 'Miami, Florida, United States', displayName: 'Miami, FL', coordinates: { lng: -80.1918, lat: 25.7617 }, region: 'Florida', country: 'United States' },
  { id: 'seed_denver', canonicalName: 'Denver, Colorado, United States', displayName: 'Denver, CO', coordinates: { lng: -104.9903, lat: 39.7392 }, region: 'Colorado', country: 'United States' },
  { id: 'seed_boston', canonicalName: 'Boston, Massachusetts, United States', displayName: 'Boston, MA', coordinates: { lng: -71.0589, lat: 42.3601 }, region: 'Massachusetts', country: 'United States' },
  { id: 'seed_washington', canonicalName: 'Washington, District of Columbia, United States', displayName: 'Washington, D.C.', coordinates: { lng: -77.0369, lat: 38.9072 }, region: 'DC', country: 'United States' },

  // Spain
  { id: 'seed_madrid', canonicalName: 'Madrid, Community of Madrid, Spain', displayName: 'Madrid, Spain', coordinates: { lng: -3.7038, lat: 40.4168 }, region: 'Madrid', country: 'Spain' },
  { id: 'seed_barcelona', canonicalName: 'Barcelona, Catalonia, Spain', displayName: 'Barcelona, Spain', coordinates: { lng: 2.1734, lat: 41.3851 }, region: 'Catalonia', country: 'Spain' },
  { id: 'seed_valencia', canonicalName: 'Valencia, Valencian Community, Spain', displayName: 'Valencia, Spain', coordinates: { lng: -0.3763, lat: 39.4699 }, region: 'Valencia', country: 'Spain' },
  { id: 'seed_seville', canonicalName: 'Seville, Andalusia, Spain', displayName: 'Seville, Spain', coordinates: { lng: -5.9845, lat: 37.3891 }, region: 'Andalusia', country: 'Spain' },
  { id: 'seed_malaga', canonicalName: 'Málaga, Andalusia, Spain', displayName: 'Málaga, Spain', coordinates: { lng: -4.4214, lat: 36.7213 }, region: 'Andalusia', country: 'Spain' },
  { id: 'seed_bilbao', canonicalName: 'Bilbao, Basque Country, Spain', displayName: 'Bilbao, Spain', coordinates: { lng: -2.9350, lat: 43.2630 }, region: 'Basque Country', country: 'Spain' },
  { id: 'seed_san_sebastian', canonicalName: 'San Sebastián, Basque Country, Spain', displayName: 'San Sebastián, Spain', coordinates: { lng: -1.9812, lat: 43.3183 }, region: 'Basque Country', country: 'Spain' },
  { id: 'seed_santander', canonicalName: 'Santander, Cantabria, Spain', displayName: 'Santander, Spain', coordinates: { lng: -3.8099, lat: 43.4623 }, region: 'Cantabria', country: 'Spain' },
  { id: 'seed_santiago', canonicalName: 'Santiago de Compostela, Galicia, Spain', displayName: 'Santiago de Compostela, Spain', coordinates: { lng: -8.5448, lat: 42.8782 }, region: 'Galicia', country: 'Spain' },

  // Europe & Global
  { id: 'seed_london', canonicalName: 'London, Greater London, United Kingdom', displayName: 'London, UK', coordinates: { lng: -0.1278, lat: 51.5074 }, region: 'England', country: 'United Kingdom' },
  { id: 'seed_paris', canonicalName: 'Paris, Île-de-France, France', displayName: 'Paris, France', coordinates: { lng: 2.3522, lat: 48.8566 }, region: 'Île-de-France', country: 'France' },
  { id: 'seed_rome', canonicalName: 'Rome, Lazio, Italy', displayName: 'Rome, Italy', coordinates: { lng: 12.4964, lat: 41.9028 }, region: 'Lazio', country: 'Italy' },
  { id: 'seed_lisbon', canonicalName: 'Lisbon, Portugal', displayName: 'Lisbon, Portugal', coordinates: { lng: -9.1393, lat: 38.7223 }, region: 'Lisbon', country: 'Portugal' },
  { id: 'seed_berlin', canonicalName: 'Berlin, Germany', displayName: 'Berlin, Germany', coordinates: { lng: 13.4050, lat: 52.5200 }, region: 'Berlin', country: 'Germany' },
  { id: 'seed_amsterdam', canonicalName: 'Amsterdam, North Holland, Netherlands', displayName: 'Amsterdam, Netherlands', coordinates: { lng: 4.9041, lat: 52.3676 }, region: 'North Holland', country: 'Netherlands' },
  { id: 'seed_tokyo', canonicalName: 'Tokyo, Japan', displayName: 'Tokyo, Japan', coordinates: { lng: 139.6917, lat: 35.6895 }, region: 'Kanto', country: 'Japan' },
  { id: 'seed_kyoto', canonicalName: 'Kyoto, Kansai, Japan', displayName: 'Kyoto, Japan', coordinates: { lng: 135.7681, lat: 35.0116 }, region: 'Kansai', country: 'Japan' },
  { id: 'seed_osaka', canonicalName: 'Osaka, Kansai, Japan', displayName: 'Osaka, Japan', coordinates: { lng: 135.5023, lat: 34.6937 }, region: 'Kansai', country: 'Japan' },
  { id: 'seed_sydney', canonicalName: 'Sydney, New South Wales, Australia', displayName: 'Sydney, Australia', coordinates: { lng: 151.2093, lat: -33.8688 }, region: 'NSW', country: 'Australia' },
  { id: 'seed_buenos_aires', canonicalName: 'Buenos Aires, Argentina', displayName: 'Buenos Aires, Argentina', coordinates: { lng: -58.3816, lat: -34.6037 }, region: 'Buenos Aires', country: 'Argentina' },
  { id: 'seed_mexico_city', canonicalName: 'Mexico City, Mexico', displayName: 'Mexico City, Mexico', coordinates: { lng: -99.1332, lat: 19.4326 }, region: 'CDMX', country: 'Mexico' },
];

export function searchOfflineSeeds(query: string): GeocodingResult[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return OFFLINE_GEO_SEEDS.filter(
    s =>
      s.displayName.toLowerCase().includes(q) ||
      s.canonicalName.toLowerCase().includes(q)
  );
}
