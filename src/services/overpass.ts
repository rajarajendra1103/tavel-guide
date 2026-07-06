import axios from 'axios';

export interface DestinationInfo {
  id: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
  imageUrl: string;
  rating: number;
  description: string;
  entryFee: number;
  averageDailyCost: number;
  bestTimeToVisit: string;
  openingHours: string;
  rules: {
    visa: string;
    documents: string[];
    laws: string[];
    restrictedProducts: string[];
    restrictedActions: string[];
  };
  emergency: {
    police: string;
    ambulance: string;
    fire: string;
    helpline: string;
  };
}

export interface PlaceInfo {
  id: string;
  destinationId: string;
  name: string;
  type: 'landmark' | 'hotel' | 'restaurant' | 'entertainment' | 'museum' | 'park' | 'shopping' | 'beach';
  lat: number;
  lon: number;
  imageUrl: string;
  description: string;
  history?: string;
  rating: number;
  timings: string;
  entryFee: number;
  avgVisitTime: number; // in minutes
  transportRules: string[];
  nearbyServices: string[];
}

// Popular preloaded destinations for instant loading & premium visual UI
export const PRELOADED_DESTINATIONS: DestinationInfo[] = [
  {
    id: 'paris',
    name: 'Paris',
    country: 'France',
    lat: 48.8566,
    lon: 2.3522,
    imageUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80',
    rating: 4.8,
    description: 'Paris, France\'s capital, is a major European city and a global center for art, fashion, gastronomy, and culture.',
    entryFee: 0,
    averageDailyCost: 180,
    bestTimeToVisit: 'June to August / September to October',
    openingHours: '24/7',
    rules: {
      visa: 'Schengen Visa required for non-EU citizens.',
      documents: ['Valid Passport', 'Travel Insurance', 'Proof of Accommodation'],
      laws: ['Littering and jaywalking carry direct fines.', 'Do not buy tickets from unauthorized street sellers.'],
      restrictedProducts: ['Counterfeit designer goods', 'Unpasteurized cheese (rules apply when exporting)'],
      restrictedActions: ['Covering the face in public spaces is legally restricted.', 'Feeding pigeons is banned in certain squares.']
    },
    emergency: {
      police: '17',
      ambulance: '15',
      fire: '18',
      helpline: '112 (European emergency)'
    }
  },
  {
    id: 'tokyo',
    name: 'Tokyo',
    country: 'Japan',
    lat: 35.6762,
    lon: 139.6503,
    imageUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=80',
    rating: 4.9,
    description: 'Tokyo, Japan\'s bustling capital, mixes ultramodern neon skyscrapers with historic Shinto shrines and temples.',
    entryFee: 0,
    averageDailyCost: 150,
    bestTimeToVisit: 'March to April (Cherry Blossom) / September to November',
    openingHours: '24/7',
    rules: {
      visa: 'Visa exemption for many nationalities up to 90 days.',
      documents: ['Passport (must be carried at all times)', 'Customs declaration QR code'],
      laws: ['Strict zero-tolerance on drug possession.', 'No smoking outdoors except in designated areas.'],
      restrictedProducts: ['Certain allergy medications (containing stimulants)', 'Fresh meat/poultry products'],
      restrictedActions: ['Do not tip in restaurants or taxis (considered rude).', 'Walk on the correct side on subways/escalators.']
    },
    emergency: {
      police: '110',
      ambulance: '119',
      fire: '119',
      helpline: '03-3501-0110 (English support)'
    }
  },
  {
    id: 'rome',
    name: 'Rome',
    country: 'Italy',
    lat: 41.9028,
    lon: 12.4964,
    imageUrl: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1200&q=80',
    rating: 4.7,
    description: 'Rome, Italy\'s capital, is a sprawling, cosmopolitan city with nearly 3,000 years of globally influential art, architecture, and culture.',
    entryFee: 0,
    averageDailyCost: 140,
    bestTimeToVisit: 'April to June / September to October',
    openingHours: '24/7',
    rules: {
      visa: 'Schengen Visa requirements apply.',
      documents: ['Passport', 'Medical Insurance coverage proof'],
      laws: ['Do not sit on the Spanish Steps.', 'Drinking from public historic fountains is permitted, but washing in them is heavily fined.'],
      restrictedProducts: ['Unlicensed goods purchased from street vendors'],
      restrictedActions: ['Men must wear shirts in public at all times.', 'Avoid taking pictures with costumed gladiators without negotiating a price first.']
    },
    emergency: {
      police: '113',
      ambulance: '118',
      fire: '115',
      helpline: '112'
    }
  },
  {
    id: 'london',
    name: 'London',
    country: 'United Kingdom',
    lat: 51.5074,
    lon: -0.1278,
    imageUrl: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1200&q=80',
    rating: 4.7,
    description: 'London, the capital of England and the United Kingdom, is a 21st-century city with history stretching back to Roman times.',
    entryFee: 0,
    averageDailyCost: 170,
    bestTimeToVisit: 'May to September',
    openingHours: '24/7',
    rules: {
      visa: 'ETA required for certain visitors; Standard Visitor Visa for others.',
      documents: ['Valid Passport', 'Return flight details'],
      laws: ['Strict laws against knife possession.', 'Fare evasion on public transit results in heavy penalty fares.'],
      restrictedProducts: ['Certain agricultural products', 'Meat/dairy products from outside the EU'],
      restrictedActions: ['Do not stand on the left side of escalators (keep right).', 'Avoid cut-throat street shell game scammers on bridges.']
    },
    emergency: {
      police: '999',
      ambulance: '999',
      fire: '999',
      helpline: '111 (Non-emergency medical)'
    }
  },
  {
    id: 'new-york',
    name: 'New York',
    country: 'United States',
    lat: 40.7128,
    lon: -74.0060,
    imageUrl: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=1200&q=80',
    rating: 4.8,
    description: 'New York City comprises 5 boroughs sitting where the Hudson River meets the Atlantic Ocean, with Manhattan at its core.',
    entryFee: 0,
    averageDailyCost: 220,
    bestTimeToVisit: 'September to November / April to June',
    openingHours: '24/7',
    rules: {
      visa: 'ESTA (Visa Waiver) or Visitor Visa required.',
      documents: ['Valid Passport', 'ESTA Approval document copy'],
      laws: ['Smoking is banned in all public parks and beaches.', 'Drinking alcohol in public is illegal.'],
      restrictedProducts: ['Plants, seeds, and raw agricultural imports'],
      restrictedActions: ['Do not purchase loose items or tickets from street hustlers.', 'Tipping of 18-22% is expected for food & drink services.']
    },
    emergency: {
      police: '911',
      ambulance: '911',
      fire: '911',
      helpline: '311 (Non-emergency information)'
    }
  }
];

// Perform coordinate lookup using OSM Nominatim API
export const geocodeDestination = async (query: string): Promise<Partial<DestinationInfo>[]> => {
  if (!query) return [];

  // Check prefix matches against our preloaded list
  const localMatches = PRELOADED_DESTINATIONS.filter(
    d => d.name.toLowerCase().includes(query.toLowerCase()) || 
         d.country.toLowerCase().includes(query.toLowerCase())
  );

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`;
    const response = await axios.get(url);
    
    const apiResults = response.data.map((item: any) => {
      const parts = item.display_name.split(', ');
      const name = parts[0];
      const country = parts[parts.length - 1];
      
      return {
        id: item.place_id.toString(),
        name,
        country,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        imageUrl: '', // Will populate via Wiki or static fallbacks
        rating: 4.5,
        description: `Stunning destination: ${item.display_name}`
      };
    });

    // Combine local preloads and geocoding results (prioritizing local for visual aesthetics)
    const combined = [...localMatches];
    apiResults.forEach((apiItem: any) => {
      if (!combined.some(c => Math.abs(c.lat - apiItem.lat) < 0.1 && Math.abs(c.lon - apiItem.lon) < 0.1)) {
        combined.push(apiItem);
      }
    });

    return combined;
  } catch (error) {
    console.error('Nominatim geocoding failed:', error);
    // Return local preloads matching query
    return localMatches.length > 0 ? localMatches : PRELOADED_DESTINATIONS.map(d => ({
      id: d.id,
      name: d.name,
      country: d.country,
      lat: d.lat,
      lon: d.lon,
      description: d.description,
      imageUrl: d.imageUrl,
      rating: d.rating
    }));
  }
};

// Generates highly styled, realistic places nearby a set of coordinates
export const getPlaces = async (
  lat: number,
  lon: number,
  destinationId: string
): Promise<PlaceInfo[]> => {
  // If it matches a preloaded destination, return its customized list of stunning sights
  if (destinationId === 'paris' || (Math.abs(lat - 48.8566) < 0.05 && Math.abs(lon - 2.3522) < 0.05)) {
    return getParisPlaces();
  }
  if (destinationId === 'tokyo' || (Math.abs(lat - 35.6762) < 0.05 && Math.abs(lon - 139.6503) < 0.05)) {
    return getTokyoPlaces();
  }
  if (destinationId === 'rome' || (Math.abs(lat - 41.9028) < 0.05 && Math.abs(lon - 12.4964) < 0.05)) {
    return getRomePlaces();
  }

  // Otherwise, dynamically generate realistic, beautiful places around these coordinates!
  return generateGenericPlaces(lat, lon, destinationId);
};

// Helper lists of custom preloaded places
const getParisPlaces = (): PlaceInfo[] => [
  {
    id: 'eiffel',
    destinationId: 'paris',
    name: 'Eiffel Tower',
    type: 'landmark',
    lat: 48.8584,
    lon: 2.2945,
    imageUrl: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=600&q=80',
    description: 'The Eiffel Tower is a wrought-iron lattice tower on the Champ de Mars in Paris, France.',
    history: 'Constructed from 1887 to 1889 as the centerpiece of the 1889 World\'s Fair, it was initially criticized by leading artists but has become a global cultural icon.',
    rating: 4.8,
    timings: '09:00 - 00:45',
    entryFee: 26.80,
    avgVisitTime: 120,
    transportRules: ['Metro: Bir-Hakeim (Line 6)', 'RER: Champ de Mars (RER C)'],
    nearbyServices: ['Le Jules Verne Restaurant (On-Site)', 'Seine River Cruises']
  },
  {
    id: 'louvre',
    destinationId: 'paris',
    name: 'Louvre Museum',
    type: 'museum',
    lat: 48.8606,
    lon: 2.3376,
    imageUrl: 'https://images.unsplash.com/photo-1601887389937-0b02c26b6c3c?auto=format&fit=crop&w=600&q=80',
    description: 'The world\'s largest art museum and a historic monument in Paris.',
    history: 'Originally built as the Louvre castle in the late 12th century under Philip II, it was converted into a museum during the French Revolution in 1793.',
    rating: 4.7,
    timings: '09:00 - 18:00 (Closed Tuesdays)',
    entryFee: 17.00,
    avgVisitTime: 180,
    transportRules: ['Metro: Palais Royal Musée du Louvre (Lines 1, 7)'],
    nearbyServices: ['Café Marly', 'Tuileries Gardens']
  },
  {
    id: 'notre_dame',
    destinationId: 'paris',
    name: 'Notre-Dame Cathedral',
    type: 'landmark',
    lat: 48.8530,
    lon: 2.3499,
    imageUrl: 'https://images.unsplash.com/photo-1478860121278-78aead3cd5f7?auto=format&fit=crop&w=600&q=80',
    description: 'A medieval Catholic cathedral on the Île de la Cité, widely considered one of the finest examples of French Gothic architecture.',
    history: 'Construction began in 1163 and was largely completed by 1260. Following a major fire in 2019, it has undergone meticulous restoration.',
    rating: 4.7,
    timings: 'Temporarily restricted, check official site',
    entryFee: 0,
    avgVisitTime: 60,
    transportRules: ['Metro: Cité (Line 4)', 'RER: Saint-Michel Notre-Dame (RER B, C)'],
    nearbyServices: ['Shakespeare and Company Bookstore', 'Le Petit Châtelet']
  },
  {
    id: 'paris_hotel_splendid',
    destinationId: 'paris',
    name: 'Hotel Regina Louvre',
    type: 'hotel',
    lat: 48.8632,
    lon: 2.3315,
    imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80',
    description: 'A historic five-star hotel in the heart of Paris, overlooking the Louvre Museum.',
    rating: 4.6,
    timings: '24/7 Check-in',
    entryFee: 350.00,
    avgVisitTime: 1440,
    transportRules: ['Metro: Tuileries (Line 1)'],
    nearbyServices: ['Louvre Museum', 'Tuileries Gardens']
  },
  {
    id: 'paris_rest_epicerie',
    destinationId: 'paris',
    name: 'L\'Ambroisie',
    type: 'restaurant',
    lat: 48.8552,
    lon: 2.3655,
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80',
    description: 'Renowned 3-star Michelin French restaurant located in the historic Place des Vosges.',
    rating: 4.9,
    timings: '12:00 - 13:45, 20:00 - 21:45',
    entryFee: 180.00,
    avgVisitTime: 120,
    transportRules: ['Metro: Chemin Vert (Line 8)'],
    nearbyServices: ['Place des Vosges', 'Maison de Victor Hugo']
  }
];

const getTokyoPlaces = (): PlaceInfo[] => [
  {
    id: 'sensoji',
    destinationId: 'tokyo',
    name: 'Senso-ji Temple',
    type: 'landmark',
    lat: 35.7148,
    lon: 139.7967,
    imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=600&q=80',
    description: 'Tokyo\'s oldest temple, dedicated to the Bodhisattva Kannon, featuring the iconic Kaminarimon Gate.',
    history: 'Founded in 645 AD, making it the oldest temple in Tokyo. The entrance gate features a giant red paper lantern.',
    rating: 4.8,
    timings: '06:00 - 17:00',
    entryFee: 0,
    avgVisitTime: 90,
    transportRules: ['Asakusa Station (Ginza Line, Asakusa Line)'],
    nearbyServices: ['Nakamise Shopping Street', 'Asakusa Kagurazaka Restaurant']
  },
  {
    id: 'shibuya_crossing',
    destinationId: 'tokyo',
    name: 'Shibuya Scramble Crossing',
    type: 'entertainment',
    lat: 35.6595,
    lon: 139.7006,
    imageUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&q=80',
    description: 'The world\'s busiest pedestrian intersection, a symbol of Tokyo\'s energy and modern lifestyle.',
    rating: 4.7,
    timings: '24/7',
    entryFee: 0,
    avgVisitTime: 30,
    transportRules: ['Shibuya Station (JR Yamanote Line, Hanzomon Line)'],
    nearbyServices: ['Hachiko Statue', 'MAGNET by SHIBUYA109']
  },
  {
    id: 'tokyo_hotel_park',
    destinationId: 'tokyo',
    name: 'Park Hyatt Tokyo',
    type: 'hotel',
    lat: 35.6896,
    lon: 139.6917,
    imageUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=600&q=80',
    description: 'Luxury hotel occupying the top floors of the Shinjuku Park Tower, famous for stunning vistas of Mount Fuji.',
    rating: 4.8,
    timings: '24/7 Check-in',
    entryFee: 450.00,
    avgVisitTime: 1440,
    transportRules: ['Shinjuku Station (10 mins walk)'],
    nearbyServices: ['New York Bar (On-Site)', 'Tokyo Metropolitan Government Building']
  }
];

const getRomePlaces = (): PlaceInfo[] => [
  {
    id: 'colosseum',
    destinationId: 'rome',
    name: 'The Colosseum',
    type: 'landmark',
    lat: 41.8902,
    lon: 12.4922,
    imageUrl: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=600&q=80',
    description: 'The Colosseum is an oval amphitheater in the center of the city of Rome, Italy, the largest ever built.',
    history: 'Built under the Flavian dynasty between 72 and 80 AD, it hosted gladiatorial combats, drama, and public spectacles.',
    rating: 4.9,
    timings: '08:30 - 19:00',
    entryFee: 16.00,
    avgVisitTime: 120,
    transportRules: ['Metro: Colosseo (Line B)'],
    nearbyServices: ['Roman Forum', 'Arch of Constantine']
  },
  {
    id: 'trevi',
    destinationId: 'rome',
    name: 'Trevi Fountain',
    type: 'landmark',
    lat: 41.9009,
    lon: 12.4833,
    imageUrl: 'https://images.unsplash.com/photo-1531572753726-0ff37ccb0755?auto=format&fit=crop&w=600&q=80',
    description: 'The largest Baroque fountain in the city and one of the most famous fountains in the world.',
    history: 'Designed by Italian architect Nicola Salvi and completed in 1762, throwing a coin ensures a return to Rome.',
    rating: 4.8,
    timings: '24/7',
    entryFee: 0,
    avgVisitTime: 40,
    transportRules: ['Metro: Barberini (Line A, 8 mins walk)'],
    nearbyServices: ['Gelateria Valentino', 'Palazzo Poli']
  }
];

// Generates highly accurate coordinates-based mock places for other searched coordinates
const generateGenericPlaces = (lat: number, lon: number, destinationId: string): PlaceInfo[] => {
  const categories: PlaceInfo['type'][] = ['landmark', 'hotel', 'restaurant', 'entertainment', 'museum', 'park', 'shopping', 'beach'];
  const results: PlaceInfo[] = [];

  const typeDetails: Record<PlaceInfo['type'], { names: string[]; images: string[]; desc: string; fee: number; duration: number }> = {
    landmark: {
      names: ['Heritage Palace', 'Ancient Citadel', 'Grand Plaza & Cathedral', 'Scenic Clocktower'],
      images: [
        'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1519074069444-1ba4e666310b?auto=format&fit=crop&w=600&q=80'
      ],
      desc: 'An iconic historic monument offering breathtaking vistas and rich architectural heritage.',
      fee: 10,
      duration: 60
    },
    hotel: {
      names: ['Grand Vista Resort', 'Boutique Garden Suites', 'Urban Glass Hotel', 'Sunset Lodge'],
      images: [
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80'
      ],
      desc: 'Comfortable luxury accommodation equipped with modern amenities and local hospitality.',
      fee: 120,
      duration: 1440
    },
    restaurant: {
      names: ['The Local Plate', 'Vibrant Bistro', 'Ocean Breeze Seafood', 'Chef\'s Table Tavern'],
      images: [
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80'
      ],
      desc: 'Award-winning gastronomy serving local delicacies prepared from fresh seasonal ingredients.',
      fee: 25,
      duration: 90
    },
    entertainment: {
      names: ['Amusement Hub & Pier', 'Culture Theater', 'Cinema Paradiso', 'Royal Opera House'],
      images: [
        'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1460889418202-138a8b2a4975?auto=format&fit=crop&w=600&q=80'
      ],
      desc: 'Live shows, performances, and fun thrills suitable for families and groups.',
      fee: 35,
      duration: 150
    },
    museum: {
      names: ['Metropolitan Art Museum', 'Science & Innovation Center', 'Natural History Vault', 'Modern Art Gallery'],
      images: [
        'https://images.unsplash.com/photo-1554907984-15263bfd63bd?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1580537659444-23067c24a25c?auto=format&fit=crop&w=600&q=80'
      ],
      desc: 'Expansive exhibits highlighting historical artifacts, scientific feats, or contemporary arts.',
      fee: 15,
      duration: 120
    },
    park: {
      names: ['Central Botanical Sanctuary', 'Memorial Gardens', 'Lakeview Green Belt', 'Riverside Park'],
      images: [
        'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=600&q=80'
      ],
      desc: 'Lush green fields, blooming flower beds, and quiet trails perfect for a morning run or picnic.',
      fee: 0,
      duration: 80
    },
    shopping: {
      names: ['Artisan Souvenir Market', 'Plaza Galleria Mall', 'Luxury Fashion Arcade', 'Old Town Bazaar'],
      images: [
        'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1567401893930-7beb7b18c0c1?auto=format&fit=crop&w=600&q=80'
      ],
      desc: 'A vibrant shopping strip hosting international brands, local designers, and souvenir shops.',
      fee: 0,
      duration: 100
    },
    beach: {
      names: ['Golden Sand Bay', 'Sunset Coastline', 'Rocky Cove Beach', 'Crystal Lagoon'],
      images: [
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=600&q=80'
      ],
      desc: 'Warm sands, surfing waves, and tropical drinks. Fully equipped with sunbeds and water sports.',
      fee: 0,
      duration: 180
    }
  };

  categories.forEach((type, index) => {
    const detail = typeDetails[type];
    const offsetLat = (index % 2 === 0 ? 1 : -1) * 0.008 * (index + 1);
    const offsetLon = (index % 3 === 0 ? 1 : -1) * 0.006 * (index + 1);
    const name = detail.names[index % detail.names.length];
    const image = detail.images[index % detail.images.length];

    results.push({
      id: `${destinationId}_place_${type}_${index}`,
      destinationId,
      name,
      type,
      lat: lat + offsetLat,
      lon: lon + offsetLon,
      imageUrl: image,
      description: `${detail.desc} Beautiful spot located near the heart of the region.`,
      history: 'Originally developed as a key public asset, it has recently been refurbished to attract tourists and locals alike.',
      rating: parseFloat((4.2 + (index % 8) * 0.1).toFixed(1)),
      timings: type === 'hotel' ? '24/7 Check-in' : '09:00 - 21:00',
      entryFee: detail.fee,
      avgVisitTime: detail.duration,
      transportRules: [`Bus line ${10 + index} stops right outside`, 'Taxi standard route'],
      nearbyServices: ['Cafe Nero', 'Tourist Information Kiosk']
    });
  });

  return results;
};
