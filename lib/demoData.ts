import { addDays, format, parseISO, differenceInCalendarDays } from "date-fns";
import type { AttractionResult, HotelResult, LocationResult, WeatherDay } from "@/types/trip";
import { getDemoProperties } from "@/lib/properties";
import { haversineDistanceKm } from "@/lib/geo";

const CITY_COORDS: Record<string, { lat: number; lon: number; country: string }> = {
  // Pakistan
  lahore: { lat: 31.5204, lon: 74.3587, country: "Pakistan" },
  karachi: { lat: 24.8607, lon: 67.0011, country: "Pakistan" },
  islamabad: { lat: 33.6844, lon: 73.0479, country: "Pakistan" },
  // UAE
  dubai: { lat: 25.2048, lon: 55.2708, country: "United Arab Emirates" },
  "abu dhabi": { lat: 24.4539, lon: 54.3773, country: "United Arab Emirates" },
  // India
  delhi: { lat: 28.6139, lon: 77.209, country: "India" },
  mumbai: { lat: 19.076, lon: 72.8777, country: "India" },
  // Europe
  london: { lat: 51.5072, lon: -0.1276, country: "United Kingdom" },
  paris: { lat: 48.8566, lon: 2.3522, country: "France" },
  barcelona: { lat: 41.3874, lon: 2.1686, country: "Spain" },
  rome: { lat: 41.9028, lon: 12.4964, country: "Italy" },
  amsterdam: { lat: 52.3676, lon: 4.9041, country: "Netherlands" },
  prague: { lat: 50.0755, lon: 14.4378, country: "Czech Republic" },
  vienna: { lat: 48.2082, lon: 16.3738, country: "Austria" },
  istanbul: { lat: 41.0082, lon: 28.9784, country: "Turkey" },
  madrid: { lat: 40.4168, lon: -3.7038, country: "Spain" },
  lisbon: { lat: 38.7223, lon: -9.1393, country: "Portugal" },
  athens: { lat: 37.9838, lon: 23.7275, country: "Greece" },
  berlin: { lat: 52.52, lon: 13.405, country: "Germany" },
  munich: { lat: 48.1351, lon: 11.582, country: "Germany" },
  frankfurt: { lat: 50.1109, lon: 8.6821, country: "Germany" },
  zurich: { lat: 47.3769, lon: 8.5417, country: "Switzerland" },
  geneva: { lat: 46.2044, lon: 6.1432, country: "Switzerland" },
  brussels: { lat: 50.8503, lon: 4.3517, country: "Belgium" },
  stockholm: { lat: 59.3293, lon: 18.0686, country: "Sweden" },
  copenhagen: { lat: 55.6761, lon: 12.5683, country: "Denmark" },
  helsinki: { lat: 60.1699, lon: 24.9384, country: "Finland" },
  oslo: { lat: 59.9139, lon: 10.7522, country: "Norway" },
  warsaw: { lat: 52.2297, lon: 21.0122, country: "Poland" },
  budapest: { lat: 47.4979, lon: 19.0402, country: "Hungary" },
  bucharest: { lat: 44.4268, lon: 26.1025, country: "Romania" },
  kyiv: { lat: 50.4501, lon: 30.5234, country: "Ukraine" },
  moscow: { lat: 55.7558, lon: 37.6173, country: "Russia" },
  baku: { lat: 40.4093, lon: 49.8671, country: "Azerbaijan" },
  tbilisi: { lat: 41.7151, lon: 44.8271, country: "Georgia" },
  // Asia
  tokyo: { lat: 35.6762, lon: 139.6503, country: "Japan" },
  bangkok: { lat: 13.7563, lon: 100.5018, country: "Thailand" },
  singapore: { lat: 1.3521, lon: 103.8198, country: "Singapore" },
  bali: { lat: -8.3405, lon: 115.092, country: "Indonesia" },
  phuket: { lat: 7.8804, lon: 98.3923, country: "Thailand" },
  "hong kong": { lat: 22.3193, lon: 114.1694, country: "China" },
  seoul: { lat: 37.5665, lon: 126.978, country: "South Korea" },
  taipei: { lat: 25.033, lon: 121.5654, country: "Taiwan" },
  "kuala lumpur": { lat: 3.139, lon: 101.6869, country: "Malaysia" },
  jakarta: { lat: -6.2088, lon: 106.8456, country: "Indonesia" },
  manila: { lat: 14.5995, lon: 120.9842, country: "Philippines" },
  "ho chi minh city": { lat: 10.8231, lon: 106.6297, country: "Vietnam" },
  hanoi: { lat: 21.0278, lon: 105.8342, country: "Vietnam" },
  beijing: { lat: 39.9042, lon: 116.4074, country: "China" },
  shanghai: { lat: 31.2304, lon: 121.4737, country: "China" },
  colombo: { lat: 6.9271, lon: 79.8612, country: "Sri Lanka" },
  kathmandu: { lat: 27.7172, lon: 85.324, country: "Nepal" },
  maldives: { lat: 3.2028, lon: 73.2207, country: "Maldives" },
  // Middle East
  doha: { lat: 25.2854, lon: 51.531, country: "Qatar" },
  riyadh: { lat: 24.7136, lon: 46.6753, country: "Saudi Arabia" },
  muscat: { lat: 23.588, lon: 58.3829, country: "Oman" },
  "kuwait city": { lat: 29.3759, lon: 47.9774, country: "Kuwait" },
  amman: { lat: 31.9454, lon: 35.9284, country: "Jordan" },
  beirut: { lat: 33.8938, lon: 35.5018, country: "Lebanon" },
  "tel aviv": { lat: 32.0853, lon: 34.7818, country: "Israel" },
  // Africa
  cairo: { lat: 30.0444, lon: 31.2357, country: "Egypt" },
  nairobi: { lat: -1.2921, lon: 36.8219, country: "Kenya" },
  "cape town": { lat: -33.9249, lon: 18.4241, country: "South Africa" },
  johannesburg: { lat: -26.2041, lon: 28.0473, country: "South Africa" },
  casablanca: { lat: 33.5731, lon: -7.5898, country: "Morocco" },
  tunis: { lat: 36.8065, lon: 10.1815, country: "Tunisia" },
  algiers: { lat: 36.7538, lon: 3.0588, country: "Algeria" },
  accra: { lat: 5.6037, lon: -0.187, country: "Ghana" },
  lagos: { lat: 6.5244, lon: 3.3792, country: "Nigeria" },
  "dar es salaam": { lat: -6.7924, lon: 39.2083, country: "Tanzania" },
  "addis ababa": { lat: 9.0222, lon: 38.7468, country: "Ethiopia" },
  // Americas
  "new york": { lat: 40.7128, lon: -74.006, country: "United States" },
  "los angeles": { lat: 34.0522, lon: -118.2437, country: "United States" },
  miami: { lat: 25.7617, lon: -80.1918, country: "United States" },
  "las vegas": { lat: 36.1699, lon: -115.1398, country: "United States" },
  chicago: { lat: 41.8781, lon: -87.6298, country: "United States" },
  toronto: { lat: 43.6532, lon: -79.3832, country: "Canada" },
  vancouver: { lat: 49.2827, lon: -123.1207, country: "Canada" },
  "mexico city": { lat: 19.4326, lon: -99.1332, country: "Mexico" },
  cancun: { lat: 21.1619, lon: -86.8515, country: "Mexico" },
  "buenos aires": { lat: -34.6037, lon: -58.3816, country: "Argentina" },
  bogota: { lat: 4.711, lon: -74.0721, country: "Colombia" },
  lima: { lat: -12.0464, lon: -77.0428, country: "Peru" },
  santiago: { lat: -33.4489, lon: -70.6693, country: "Chile" },
  // Oceania
  sydney: { lat: -33.8688, lon: 151.2093, country: "Australia" },
  melbourne: { lat: -37.8136, lon: 144.9631, country: "Australia" },
};

const CITY_ATTRACTIONS: Record<string, string[]> = {
  lahore: [
    "Badshahi Mosque", "Lahore Fort", "Shalimar Gardens", "Minar-e-Pakistan",
    "Walled City Food Street", "Lahore Museum", "Emporium Mall", "Anarkali Bazaar",
    "Jilani Park", "Heritage Trail Walk", "Old City Gate", "Lahore Zoo",
  ],
  karachi: [
    "Clifton Beach", "Mazar-e-Quaid", "Port Grand", "Empress Market",
    "Frere Hall", "Seaview Beach", "DHA Golf Club", "Karachi Zoo",
    "Mohatta Palace", "Do Darya", "Pakistan Maritime Museum", "Bagh Ibn Qasim",
  ],
  islamabad: [
    "Faisal Mosque", "Pakistan Monument", "Margalla Hills Trail", "Daman-e-Koh",
    "Rose & Jasmine Garden", "Lok Virsa Museum", "Shakarparian Park", "F-9 Park",
    "Saidpur Village", "Centaurus Mall", "Rawal Lake", "Pir Sohawa",
  ],
  dubai: [
    "Burj Khalifa", "Dubai Mall", "Palm Jumeirah", "Dubai Museum",
    "Gold Souk", "Dubai Creek", "Jumeirah Beach", "Burj Al Arab Viewpoint",
    "Dubai Frame", "Global Village", "Miracle Garden", "Al Fahidi District",
  ],
  paris: [
    "Eiffel Tower", "Louvre Museum", "Notre-Dame Cathedral", "Champs-Élysées",
    "Musée d'Orsay", "Sacré-Cœur Basilica", "Palace of Versailles", "Montmartre",
    "Seine River Cruise", "Arc de Triomphe", "Centre Pompidou", "Luxembourg Gardens",
  ],
  london: [
    "Big Ben", "Tower of London", "Buckingham Palace", "British Museum",
    "London Eye", "Tower Bridge", "Hyde Park", "National Gallery",
    "Westminster Abbey", "Tate Modern", "St. Paul's Cathedral", "Camden Market",
  ],
  delhi: [
    "Red Fort", "Qutub Minar", "India Gate", "Humayun's Tomb",
    "Akshardham Temple", "Chandni Chowk", "Lotus Temple", "National Museum",
    "Connaught Place", "Old Delhi Spice Market", "Rashtrapati Bhavan", "Lodi Garden",
  ],
  mumbai: [
    "Gateway of India", "Marine Drive", "Elephanta Caves", "Colaba Causeway",
    "Juhu Beach", "Haji Ali Dargah", "Chhatrapati Shivaji Terminus", "Bollywood Studio Tour",
    "Bandra-Worli Sea Link", "Siddhivinayak Temple", "Dharavi Heritage Walk", "Worli Fort",
  ],
  moscow: [
    "Red Square", "St. Basil's Cathedral", "Moscow Kremlin", "Bolshoi Theatre",
    "Tretyakov Gallery", "Gorky Park", "GUM Department Store", "Arbat Street",
    "Cathedral of Christ the Saviour", "VDNH Exhibition Center", "Moscow Metro Tour", "Sparrow Hills",
  ],
  istanbul: [
    "Hagia Sophia", "Blue Mosque", "Topkapi Palace", "Grand Bazaar",
    "Galata Tower", "Spice Bazaar", "Bosphorus Cruise", "Basilica Cistern",
    "Dolmabahçe Palace", "Taksim Square", "Süleymaniye Mosque", "Istiklal Avenue",
  ],
  baku: [
    "Flame Towers", "Old City (Icherisheher)", "Maiden Tower", "Heydar Aliyev Center",
    "Baku Boulevard", "Palace of the Shirvanshahs", "Azerbaijan Carpet Museum", "Highland Park",
    "Baku Ferris Wheel", "Nizami Street", "Gobustan Rock Art", "Yanar Dag (Burning Mountain)",
  ],
  tokyo: [
    "Senso-ji Temple", "Shibuya Crossing", "Tokyo Tower", "Meiji Shrine",
    "Akihabara Electric Town", "Tsukiji Outer Market", "Shinjuku Gyoen", "Imperial Palace",
    "Odaiba Island", "Ueno Park", "Harajuku", "Roppongi Hills",
  ],
  bangkok: [
    "Grand Palace", "Wat Phra Kaew", "Wat Arun", "Chatuchak Weekend Market",
    "Khao San Road", "Jim Thompson House", "Floating Markets", "Chinatown",
    "Lumpini Park", "MBK Center", "Erawan Shrine", "Wat Pho",
  ],
  singapore: [
    "Marina Bay Sands", "Gardens by the Bay", "Sentosa Island", "Merlion Park",
    "Chinatown Heritage Centre", "Little India", "Singapore Zoo", "Orchard Road",
    "Clarke Quay", "Botanic Gardens", "Hawker Centre Tour", "ArtScience Museum",
  ],
  barcelona: [
    "Sagrada Familia", "Park Güell", "La Rambla", "Gothic Quarter",
    "Casa Batlló", "La Boqueria Market", "Barceloneta Beach", "Montjuïc Castle",
    "Camp Nou", "Casa Milà", "Picasso Museum", "El Born District",
  ],
  rome: [
    "Colosseum", "Roman Forum", "Vatican Museums", "Trevi Fountain",
    "Pantheon", "Spanish Steps", "St. Peter's Basilica", "Piazza Navona",
    "Trastevere District", "Borghese Gallery", "Palatine Hill", "Campo de' Fiori",
  ],
  "new york": [
    "Statue of Liberty", "Central Park", "Times Square", "Empire State Building",
    "Brooklyn Bridge", "Metropolitan Museum", "Fifth Avenue", "Broadway Show",
    "High Line", "One World Observatory", "Grand Central Terminal", "SoHo District",
  ],
  cairo: [
    "Pyramids of Giza", "Great Sphinx", "Egyptian Museum", "Khan el-Khalili Bazaar",
    "Al-Azhar Mosque", "Citadel of Saladin", "Coptic Cairo", "Nile River Cruise",
    "Islamic Cairo Walking Tour", "Mohammed Ali Mosque", "Old Cairo", "Cairo Tower",
  ],
  "abu dhabi": [
    "Sheikh Zayed Grand Mosque", "Louvre Abu Dhabi", "Yas Island", "Corniche Beach",
    "Ferrari World", "Qasr Al Watan", "Emirates Palace", "Saadiyat Island",
    "Heritage Village", "Mangrove National Park", "Yas Waterworld", "Al Ain Oasis",
  ],
};

function normalizeCity(city?: string): string {
  return (city || "").trim().toLowerCase();
}

function safeDateOrToday(dateStr?: string): Date {
  if (!dateStr) return new Date();
  try {
    return parseISO(dateStr);
  } catch {
    return new Date();
  }
}

function buildDayCount(startDate?: string, endDate?: string): number {
  const cfg = getDemoProperties();
  if (!startDate || !endDate) return cfg.weatherDaysDefault;
  const start = safeDateOrToday(startDate);
  const end = safeDateOrToday(endDate);
  const diff = differenceInCalendarDays(end, start);
  return Math.max(1, diff);
}

export function getMockLocation(city?: string): LocationResult {
  const cityName = (city || "").trim();
  const cityKey = normalizeCity(cityName);
  const cityInfo = CITY_COORDS[cityKey];

  if (cityInfo) {
    return {
      name: cityName || cityKey,
      lat: cityInfo.lat,
      lon: cityInfo.lon,
      country: cityInfo.country,
      displayName: `${cityName || cityKey}, ${cityInfo.country}`,
    };
  }

  // City not found in our map — return coords with the city name as-is
  // rather than defaulting to Dubai, use a neutral central location
  const cfg = getDemoProperties();
  return {
    name: cityName || cfg.destination,
    lat: cfg.lat,
    lon: cfg.lon,
    country: cfg.country,
    displayName: `${cityName || cfg.destination}, ${cfg.country}`,
  };
}

export function getMockHotels(lat: number, lon: number): HotelResult[] {
  const cfg = getDemoProperties();
  const names = [
    "Heritage Residency Hotel",
    "City Central Suites",
    "Canal View Inn",
    "Royal Garden Hotel",
    "Metro Palace Stay",
    "Old City Boutique Hotel",
    "Lakeside Business Hotel",
    "Grand Crescent Lodge",
    "Park Avenue Residency",
    "Capital Comfort Hotel",
  ];

  return names.slice(0, cfg.hotelsCount).map((name, idx) => ({
    id: `mock-hotel-${idx + 1}`,
    name,
    lat: lat + (idx % 3) * 0.01,
    lon: lon + (idx % 4) * 0.01,
    type: idx % 4 === 0 ? "resort" : "hotel",
    stars: 3 + (idx % 3),
    source: "DemoData",
  }));
}

/** Build generic attraction names using the city name for cities not in the map. */
function getGenericAttractions(cityName: string): string[] {
  return [
    `${cityName} City Center Walk`,
    `${cityName} National Museum`,
    `${cityName} Historic Old Town`,
    `${cityName} Central Market`,
    `${cityName} Botanical Garden`,
    `${cityName} Waterfront Promenade`,
    `${cityName} Art Gallery`,
    `${cityName} Grand Mosque/Cathedral`,
    `${cityName} Heritage Quarter`,
    `${cityName} Main Square`,
    `${cityName} Sunset Viewpoint`,
    `${cityName} Local Food Street`,
  ];
}

/** Resolve the best city key for a given lat/lon from CITY_COORDS. */
function findNearestCityKey(lat: number, lon: number): string | null {
  let bestCity: string | null = null;
  let bestDist = Infinity;
  for (const [cityKey, coords] of Object.entries(CITY_COORDS)) {
    const dist = haversineDistanceKm(lat, lon, coords.lat, coords.lon);
    if (dist < bestDist) {
      bestDist = dist;
      bestCity = cityKey;
    }
  }
  // Only return a match if the nearest city is within a reasonable distance
  return bestDist < 200 ? bestCity : null;
}

export function getMockAttractions(lat: number, lon: number): AttractionResult[] {
  const cfg = getDemoProperties();

  const nearestCity = findNearestCityKey(lat, lon);
  const names = nearestCity && CITY_ATTRACTIONS[nearestCity]
    ? CITY_ATTRACTIONS[nearestCity]
    : getGenericAttractions(nearestCity || "City");

  return names.slice(0, cfg.attractionsCount).map((name, idx) => ({
    id: `mock-attraction-${idx + 1}`,
    name,
    kind: idx % 2 === 0 ? "sightseeing" : "culture",
    lat: lat + (idx % 5) * 0.008,
    lon: lon - (idx % 5) * 0.007,
    rating: 4 + ((idx % 8) / 10),
    source: "DemoData",
  }));
}

export function getMockWeather(startDate?: string, endDate?: string): WeatherDay[] {
  const start = safeDateOrToday(startDate);
  const days = buildDayCount(startDate, endDate);
  const summaries = ["Clear", "Warm", "Cloudy", "Mild", "Sunny"];

  return Array.from({ length: days }, (_, idx) => {
    const date = format(addDays(start, idx), "yyyy-MM-dd");
    return {
      date,
      tempMax: 29 + (idx % 5),
      tempMin: 20 + (idx % 4),
      summary: summaries[idx % summaries.length],
    };
  });
}
