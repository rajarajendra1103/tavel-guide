import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini SDK using server-side process environment key
const getApiKey = (): string => {
  return process.env.GEMINI_API_KEY || '';
};

// Generic retry wrapper for Gemini transient errors (503 and 429)
const withRetry = async <T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 2000
): Promise<T> => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      const isTransient = 
        error.message?.includes('503') || 
        error.message?.includes('Service Unavailable') || 
        error.message?.includes('429') || 
        error.message?.includes('Too Many Requests');
        
      if (isTransient && i < retries - 1) {
        console.warn(`[Gemini] Transient error (${error.message}). Retrying in ${delay}ms (attempt ${i + 1}/${retries})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // exponential backoff
      } else {
        throw error;
      }
    }
  }
  throw new Error('Retries failed');
};

// Interface definitions
export interface ItineraryItem {
  name: string;
  type: 'landmark' | 'hotel' | 'restaurant' | 'entertainment' | 'museum' | 'park' | 'shopping' | 'beach';
  timeSlot: string; // e.g. "09:00 - 11:30"
  estimatedCost: number;
  description: string;
  transportSuggestion: string;
}

export interface DayItinerary {
  day: number;
  places: ItineraryItem[];
  restaurantSuggestions: string[];
}

export interface TripPlanResult {
  destination: string;
  currencySymbol?: string;
  itinerary: DayItinerary[];
  budgetSummary: {
    transport: number;
    food: number;
    tickets: number;
    accommodation: number;
    total: number;
  };
}

export interface PackingListCategory {
  category: 'Documents' | 'Clothing' | 'Electronics' | 'Medicine' | 'Travel Essentials';
  items: { name: string; checked: boolean }[];
}

const getPlannerSystemPrompt = () => `
You are an expert travel planner AI. Generate a detailed, realistic, day-wise itinerary and budget summary for the destination.
You must respond ONLY with a raw JSON object matching the following structure:
{
  "destination": "Destination Name",
  "currencySymbol": "$", // e.g. ¥ for Japan, ₹ for India, $ for USA, £ for UK, € for Eurozone
  "itinerary": [
    {
      "day": 1,
      "places": [
        {
          "name": "Name of Place",
          "type": "landmark | hotel | restaurant | entertainment | museum | park | shopping | beach",
          "timeSlot": "09:00 - 11:30",
          "estimatedCost": 15,
          "description": "Short details of what to see or do.",
          "transportSuggestion": "Walk or local taxi"
        }
      ],
      "restaurantSuggestions": ["Name of Restaurant 1 (Cuisine)", "Name of Restaurant 2 (Cuisine)"]
    }
  ],
  "budgetSummary": {
    "transport": 120,
    "food": 150,
    "tickets": 80,
    "accommodation": 350,
    "total": 700
  }
}
Provide all estimatedCost and budgetSummary values in the destination's local currency. Ensure currencySymbol matches that currency.
Do not wrap your response in markdown code blocks like \`\`\`json. Ensure numbers are formatted as digits.
`;

const getPackingSystemPrompt = () => `
You are a smart travel packer AI. Generate a packing list customized for the trip.
You must respond ONLY with a raw JSON object matching the following structure:
{
  "categories": [
    {
      "category": "Documents | Clothing | Electronics | Medicine | Accessories | Travel Essentials",
      "items": [
        { "name": "Item Name", "checked": false }
      ]
    }
  ]
}
Return 6 categories exactly: "Documents", "Clothing", "Electronics", "Medicine", "Accessories", and "Travel Essentials".
Do not wrap your response in markdown code blocks like \`\`\`json.
`;

export const extractDestinationData = async (
  destinationName: string,
  scrapedText: string,
  userCountry?: string
): Promise<any> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Server GEMINI_API_KEY is not configured in environment variables.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });

  let domesticInstruction = "";
  if (userCountry) {
    domesticInstruction = `
- The user planning this trip is currently located in/from "${userCountry}".
- If the destination country is the same as "${userCountry}" (domestic travel), customize the "rules.visa" to "Domestic travel. No visa required." and list domestic required documents (such as government photo ID, Aadhaar card, driver's license, etc. depending on local country standards) in the "rules.documents" array instead of requiring a passport or international visa.`;
  }

  const systemPrompt = `
You are a master travel data architect. Your task is to analyze raw scraped travel guides and extract a highly structured, accurate destination profile.
You must respond ONLY with a raw JSON object fitting this schema:
{
  "id": "destination name lowercase, e.g. paris",
  "name": "Destination Name",
  "country": "Country Name",
  "currencySymbol": "$", // e.g. ¥ for Japan, ₹ for India, $ for USA, £ for UK, € for Eurozone
  "latitude": 48.8566, // Estimate coordinates from context
  "longitude": 2.3522, // Estimate coordinates from context
  "imageUrl": "Unsplash query matching name, e.g. https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80",
  "rating": 4.7,
  "description": "Short overview text",
  "entryFee": 0,
  "averageDailyCost": 150,
  "bestTimeToVisit": "June to August",
  "openingHours": "24/7",
  "places": [
    {
      "id": "place_id_slug",
      "name": "Attraction/Hotel/Restaurant Name",
      "type": "landmark | hotel | restaurant | entertainment | museum | park | shopping | beach",
      "latitude": 48.8584, // Estimate close to center coordinates
      "longitude": 2.2945, // Estimate close to center coordinates
      "imageUrl": "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=600&q=80",
      "description": "Short overview details",
      "history": "Architectural or historical overview",
      "rating": 4.8,
      "timings": "Open timings",
      "entryFee": 25,
      "avgVisitTime": 120, // in minutes
      "transportRules": ["Metro Line 6 stop Bir-Hakeim", "RER C"],
      "hotels": [], // if type is hotel, provide: { name: string, priceRange: "budget | moderate | luxury", amenities: string[], starRating: number }
      "restaurants": [] // if type is restaurant, provide: { name: string, cuisine: string, priceRange: "$, $$, $$$", specialties: string[] }
    }
  ],
  "transportRoutes": [
    {
      "serviceNumber": "1",
      "routeName": "Line description",
      "type": "Bus | Metro | Train | Ferry | Tram",
      "source": "Origin Station",
      "routeDest": "End Station",
      "frequency": "Every 5 mins",
      "duration": 30, // in minutes
      "pricing": [
        { "tier": "Single ride", "fare": 2.10 }
      ],
      "stops": [
        { "name": "Stop A", "etaOffset": 0, "latitude": 48.8919, "longitude": 2.2384 },
        { "name": "Stop B", "etaOffset": 5, "latitude": 48.8738, "longitude": 2.2950 }
      ]
    }
  ],
  "rules": {
    "visa": "Visa entry parameters",
    "documents": ["Valid Passport"],
    "laws": ["Alcohol in public is banned"],
    "restrictedProducts": ["Agriculture imports"],
    "restrictedActions": ["Temple shoe restrictions"]
  },
  "emergency": {
    "police": "112",
    "ambulance": "112",
    "fire": "112",
    "helpline": "112",
    "hospitals": ["Central Medical Clinic"]
  }
}

Ensure all latitude/longitude coordinates are valid floating-point numbers.
Ensure all entryFee and averageDailyCost values (both in the main object and in places or transport routes) are numeric figures representing costs in the destination's local currency (not USD).
Ensure 'currencySymbol' contains the correct local currency symbol (e.g., ¥ for Japan, ₹ for India, $ for USA, £ for UK, € for Eurozone).
${domesticInstruction}

Response MUST be only valid JSON. Do not wrap in markdown \`\`\`json blocks.
`;

  const userPrompt = `
Extract details for destination: ${destinationName}
Scraped Source Data:
---
${scrapedText}
---
`;

  const result = await withRetry(() => model.generateContent([
    { text: systemPrompt },
    { text: userPrompt }
  ]));

  const text = result.response.text().trim();
  const cleanedText = text.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  return JSON.parse(cleanedText);
};

export const generateTripPlanOnServer = async (
  destination: string,
  budget: string,
  duration: number,
  startDate: string,
  groupType: string,
  interests: string[],
  specialReqs?: string
): Promise<TripPlanResult> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Server GEMINI_API_KEY is not configured.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });

  const userPrompt = `
    Create a ${duration}-day trip itinerary for ${destination}.
    Details:
    - Budget level: ${budget}
    - Start Date: ${startDate}
    - Group Type: ${groupType}
    - Interests: ${interests.join(', ')}
    - Special Requirements: ${specialReqs || 'None'}
  `;

  const result = await withRetry(() => model.generateContent([
    { text: getPlannerSystemPrompt() },
    { text: userPrompt }
  ]));

  const text = result.response.text().trim();
  const cleanedText = text.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  return JSON.parse(cleanedText) as TripPlanResult;
};

export const generatePackingListOnServer = async (
  destination: string,
  weather: string,
  duration: number,
  season: string,
  activities: string[]
): Promise<PackingListCategory[]> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Server GEMINI_API_KEY is not configured.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });

  const userPrompt = `
    Generate a packing checklist for a ${duration}-day trip to ${destination}.
    Trip context:
    - Weather: ${weather}
    - Season: ${season}
    - Activities/Interests: ${activities.join(', ')}
  `;

  const result = await withRetry(() => model.generateContent([
    { text: getPackingSystemPrompt() },
    { text: userPrompt }
  ]));

  const text = result.response.text().trim();
  const cleanedText = text.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  const parsed = JSON.parse(cleanedText);
  return parsed.categories as PackingListCategory[];
};

export const chatWithAssistantOnServer = async (
  message: string,
  chatHistory: { role: 'user' | 'model'; parts: string[] }[] = []
): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Server GEMINI_API_KEY is not configured.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });

  const chat = model.startChat({
    history: chatHistory.map(h => ({
      role: h.role,
      parts: [{ text: h.parts[0] }]
    })),
    generationConfig: {
      maxOutputTokens: 500,
    }
  });

  const result = await withRetry(() => chat.sendMessage(message));
  return result.response.text();
};

export const extractTransitRouteData = async (
  routeNumber: string,
  scrapedText: string,
  city?: string
): Promise<any> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Server GEMINI_API_KEY is not configured.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });

  const systemPrompt = `
You are an expert transit data extraction AI. Analyze the raw scraped web page text and extract the timetable and stop details for route number/line "${routeNumber}"${city ? ` in the city of "${city}"` : ''}.
IMPORTANT FALLBACK RULE: If the raw scraped text does not contain any specific stops, route alignment, or timings for route number "${routeNumber}"${city ? ` in the city of "${city}"` : ''} (e.g., it is just general website navigation, contact forms, or unrelated text), please IGNORE the scraped text and reconstruct the accurate public transit details for route number "${routeNumber}"${city ? ` in the city of "${city}"` : ''} using your pre-existing knowledge base.

Respond ONLY with a raw JSON object matching the following structure:
{
  "serviceNumber": "${routeNumber}",
  "routeName": "Route Name (e.g. Line 1 / Yamanote Line / Munich to Berlin ICE)",
  "type": "Bus | Metro | Train | Ferry | Tram | Airplane",
  "source": "Origin Station Name",
  "destination": "Terminal Station Name",
  "frequency": "Frequency of service, e.g. Every 10 mins, or schedule departure times",
  "duration": 45, // Total journey duration in minutes, as an integer
  "estimatedFare": 3.50, // Average single trip fare as a float number
  "operatingHours": "Operating hours, e.g., 05:30 - 23:30",
  "travelNotes": "Important notes for travelers, ticketing guidelines, etc.",
  "stops": [
    { "name": "Stop A", "etaOffset": 0, "latitude": 48.8566, "longitude": 2.3522 },
    { "name": "Stop B", "etaOffset": 10, "latitude": 48.8738, "longitude": 2.2950 }
  ]
}
If no coordinates are specified in the text, estimate logical latitude and longitude coordinates based on the location names.
Response MUST be valid raw JSON. Do not wrap in markdown \`\`\`json blocks.
`;

  const userPrompt = `
Extract details for transit route: ${routeNumber}
Scraped Timetable Data:
---
${scrapedText}
---
`;

  const result = await withRetry(() => model.generateContent([
    { text: systemPrompt },
    { text: userPrompt }
  ]));

  const text = result.response.text().trim();
  const cleanedText = text.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  return JSON.parse(cleanedText);
};

export const extractCityToCityTransit = async (
  from: string,
  to: string,
  scrapedText: string
): Promise<any> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Server GEMINI_API_KEY is not configured.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });

  const systemPrompt = `
You are an expert travel coordinator AI. Analyze the scraped web text describing transit options from "${from}" to "${to}".
Compare routes and options (Trains, Flights, Buses, Ferries) and structure them.
IMPORTANT FALLBACK RULE: If the scraped text does not contain actual routes, fares, timings, or options connecting "${from}" and "${to}" (e.g., it is empty or is just a website navigation header), please IGNORE the scraped text and reconstruct realistic travel options (train, bus, flight, or ferry) connecting "${from}" and "${to}" using your pre-existing knowledge database.

Respond ONLY with a raw JSON object matching the following structure:
{
  "bestOption": {
    "type": "Bus | Metro | Train | Ferry | Tram | Airplane",
    "serviceNumber": "Route number or operator, e.g. Shinkansen Nozomi / Flight JL6 / ICE 72",
    "routeName": "Route identifier",
    "source": "Departure point",
    "destination": "Arrival point",
    "duration": 135, // in minutes
    "fare": 130.00, // estimated cost in local currency or USD
    "advice": "Brief recommendation details"
  },
  "cheapestOption": {
    "type": "Bus | Metro | Train | Ferry | Tram | Airplane",
    "serviceNumber": "E.g., Willer Express Bus",
    "routeName": "Highway Bus Route",
    "source": "Departure point",
    "destination": "Arrival point",
    "duration": 480, // in minutes
    "fare": 40.00,
    "advice": "Brief warning or tip"
  },
  "fastestOption": {
    "type": "Bus | Metro | Train | Ferry | Tram | Airplane",
    "serviceNumber": "E.g. ANA flight",
    "routeName": "Direct Flight Route",
    "source": "Departure point",
    "destination": "Arrival point",
    "duration": 60, // in minutes
    "fare": 110.00,
    "advice": "Brief warning or tip"
  },
  "alternatives": [
    {
      "type": "Bus | Metro | Train | Ferry | Tram | Airplane",
      "serviceNumber": "Alternative route identifier",
      "routeName": "Alternative route name",
      "source": "Departure point",
      "destination": "Arrival point",
      "duration": 180,
      "fare": 90.0,
      "advice": "Notes"
    }
  ],
  "estimatedCost": "Approx range, e.g. $40 - $140",
  "journeyDuration": "Approx duration, e.g. 2.5h to 8h",
  "travelAdvice": "Overall tip for choosing the best option"
}
Response MUST be valid raw JSON. Do not wrap in markdown \`\`\`json.
`;

  const userPrompt = `
Analyze travel options from ${from} to ${to}.
Scraped Transit Options:
---
${scrapedText}
---
`;

  const result = await withRetry(() => model.generateContent([
    { text: systemPrompt },
    { text: userPrompt }
  ]));

  const text = result.response.text().trim();
  const cleanedText = text.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  return JSON.parse(cleanedText);
};

export interface CityTransitDiscovery {
  city: string;
  state: string;
  country: string;
  transitTypes: string[];
  searchQueries: {
    type: string;
    officialQuery: string;
    blogQuery: string;
  }[];
}

export const discoverCityTransitWebsites = async (
  city: string
): Promise<CityTransitDiscovery> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Server GEMINI_API_KEY is not configured.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });

  const systemPrompt = `
You are an expert transit directory builder. Given a city name, identify the:
1. Country it belongs to.
2. State, province, region, or territory it belongs to.
3. Available types of public transportation systems in that city (e.g. Bus, Metro, Train, Tram, Ferry).
4. Highly optimized Yahoo search query strings designed to locate the official websites, timetables, and local travel guides for each transport type.
Include queries to find the official transit authority AND trusted unofficial blogs/travel guide timetables.

You must respond ONLY with a raw JSON object matching the following structure:
{
  "city": "resolved city name",
  "state": "state or province",
  "country": "country name",
  "transitTypes": ["Bus", "Metro", "Train"],
  "searchQueries": [
    {
      "type": "Metro",
      "officialQuery": "Paris RATP metro official website routes timetable map",
      "blogQuery": "how to use Paris metro tickets fares travel guide blog"
    },
    {
      "type": "Bus",
      "officialQuery": "Paris city bus official routes schedule map",
      "blogQuery": "Paris bus route timings schedule ticket pricing blogs"
    }
  ]
}

Response MUST be valid raw JSON. Do not wrap in markdown \`\`\`json.
`;

  const userPrompt = `Discover public transit directory and search queries for the city: ${city}`;

  const result = await withRetry(() => model.generateContent([
    { text: systemPrompt },
    { text: userPrompt }
  ]));

  const text = result.response.text().trim();
  const cleanedText = text.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  return JSON.parse(cleanedText) as CityTransitDiscovery;
};

export const extractCityTransitGuide = async (
  city: string,
  country: string,
  state: string,
  scrapedText: string
): Promise<any> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Server GEMINI_API_KEY is not configured.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });

  const systemPrompt = `
You are a master public transit data architect. Your task is to analyze raw scraped public transit websites, schedules, blogs, and timetables for "${city}" in "${state}, ${country}", and extract a list of structured transit routes/lines.
You must extract real routes/lines, their timings, pricing, and stops. Estimate logical coordinates (latitude & longitude) for each stop if they are not present in the text, ensuring they are near the city center.

You must respond ONLY with a raw JSON object matching this structure:
{
  "routes": [
    {
      "serviceNumber": "Route/Line number, e.g. 42 or Line 1 or M4",
      "routeName": "Name of the route (e.g. Gare du Nord - Opéra or East Bound)",
      "type": "Bus | Metro | Train | Ferry | Tram | Airplane",
      "source": "Name of origin/departure station",
      "destination": "Name of terminal/arrival station",
      "frequency": "Frequency (e.g. Every 10 mins or list specific timings)",
      "duration": 45, // journey duration in minutes as an integer
      "pricing": [
        { "tier": "Single Ticket", "fare": 2.10 }
      ],
      "stops": [
        { "name": "Stop A", "etaOffset": 0, "latitude": 48.8566, "longitude": 2.3522 },
        { "name": "Stop B", "etaOffset": 10, "latitude": 48.8738, "longitude": 2.2950 }
      ]
    }
  ]
}

Response MUST be valid raw JSON. Do not wrap in markdown \`\`\`json.
`;

  const userPrompt = `
Scraped Transit Content for ${city}, ${state}, ${country}:
---
${scrapedText}
---
`;

  const result = await withRetry(() => model.generateContent([
    { text: systemPrompt },
    { text: userPrompt }
  ]));

  const text = result.response.text().trim();
  const cleanedText = text.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  return JSON.parse(cleanedText);
};

export const processTransitAgentData = async (
  cityName: string,
  scrapedText: string
): Promise<any> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Server GEMINI_API_KEY is not configured.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });

  const systemPrompt = `
You are the core Processing Agent for an autonomous global Travel Guide application. Your job is to take a raw city name along with unstructured, messy web-scraped text or HTML data, resolve the geography, identify all active transport modes, and structure the information into a strict JSON payload.

### Execution Rules:
1. GEOGRAPHICAL RESOLUTION: Verify and resolve the input city name to its official administrative state/province/prefecture and country.
2. AVAILABLE MODES ARBITRATION: Create a top-level array called "available_modes". Populated ONLY with transport types explicitly confirmed as active in the scraped text (e.g., ["Bus", "Auto-Rickshaw"] if Metro/Train are absent). If a mode does not exist in this city, DO NOT list it here.
3. STRICT TRUTH DATA: Extract ONLY the factual data present within the provided scraped text. If specific stop sequences, arrival intervals, service numbers, or exact ticket prices are missing from the raw text, populate them as null or 0. Do not hallucinate or invent scheduling timelines.
4. NODAL SEQUENCE: Reconstruct the linear progression of the route sequentially for the "line_map_stops" array. Calculate the "expected_reaching_time_minutes_from_start" by accumulating travel intervals between intermediate stops.
5. LANGUAGE & ALIASES: Include both the local native language names and English translations where available to assist international travelers.
6. NO WRAPPERS: Output your response strictly as a structured JSON object. Do not include markdown code blocks (like \`\`\`json), backticks, or conversational text.

### Expected JSON Output Schema:
{
  "source_city": "string",
  "state_province": "string",
  "country": "string",
  "available_modes": ["string (e.g., Bus, Metro, Tram, Ferry, Auto-Rickshaw)"],
  "services": [
    {
      "service_number": "string (e.g., 308, 01, Route A)",
      "transport_mode": "string (e.g., Bus)",
      "service_type": "string (e.g., Metro Express, Local, Limited)",
      "origin": "string (Starting terminal stop name)",
      "destination": "string (Ending terminal stop name)",
      "base_ticket_price": 0.0,
      "currency_code": "string (3-letter ISO code, e.g., INR, VND, USD)",
      "timings": {
        "frequency_minutes": 0,
        "first_service_time": "string (HH:MM format)",
        "last_service_time": "string (HH:MM format)"
      },
      "line_map_stops": [
        {
          "stop_sequence": 1,
          "stop_name": "string",
          "expected_reaching_time_minutes_from_start": 0,
          "accumulated_fare_to_this_point": 0.0
        }
      ]
    }
  ]
}
`;

  const userPrompt = `
Input City Name: ${cityName}
Scraped Data / HTML Source:
---
${scrapedText}
---
`;

  const result = await withRetry(() => model.generateContent([
    { text: systemPrompt },
    { text: userPrompt }
  ]));

  const text = result.response.text().trim();
  const cleanedText = text.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  return JSON.parse(cleanedText);
};


