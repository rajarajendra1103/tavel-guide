import { Router, Request, Response } from 'express';
import { scrapeCustomUrl, searchAndScrapeWebLinks } from '../services/scraper.js';
import { 
  extractDestinationData, 
  generateTripPlanOnServer, 
  generatePackingListOnServer, 
  chatWithAssistantOnServer,
  extractTransitRouteData,
  extractCityToCityTransit,
  discoverCityTransitWebsites,
  extractCityTransitGuide,
  processTransitAgentData
} from '../services/gemini.js';
import axios from 'axios';

export const apiRouter = Router();

// Endpoint 1: Search & Scrape Official Tourism sites & Blogs with Gemini structuring (Wikipedia bypassed)
apiRouter.get('/scrape', async (req: Request, res: Response) => {
  const query = req.query.query as string;
  const userCountry = req.query.userCountry as string;
  if (!query) {
    res.status(400).json({ error: 'Missing query parameter.' });
    return;
  }

  try {
    console.log(`[Scraper] Initializing search scrape for: ${query} (user country: ${userCountry})`);
    
    // Search DDG and scrape official websites and travel blogs
    console.log(`[Scraper] Searching official tourism sites and travel blogs for: ${query}`);
    const searchRes = await searchAndScrapeWebLinks(query);

    let sourceText = searchRes.text.trim();
    const sourceUrls = searchRes.urls;

    // Fallback: If DDG search or scraping yielded no contents, let Gemini construct the profile 
    // using its own knowledge base instead of throwing a 500 error.
    if (!sourceText) {
      console.warn(`[Scraper] No external pages successfully scraped for: ${query}. Invoking generative AI database query.`);
      sourceText = `Name: ${query}. Please construct a highly accurate, structured travel guide profile for ${query} using your pre-existing knowledge. Ensure real landmarks, local cuisines, hotels, and public transport systems are included in your response.`;
    }

    // Extract into database JSON structure via Gemini
    console.log(`[Gemini] Processing unstructured source text (${sourceText.length} chars)...`);
    const structuredJSON = await extractDestinationData(query, sourceText, userCountry);

    // Return structured payload along with sources
    res.json({
      ...structuredJSON,
      sourceUrls
    });
  } catch (error: any) {
    console.error(`Scrape & extraction failed for ${query}:`, error);
    res.status(500).json({ 
      error: 'Failed to scrape and extract destination data.',
      details: error.message 
    });
  }
});

// Endpoint 2: Generate trip plan itinerary
apiRouter.post('/generate-plan', async (req: Request, res: Response) => {
  const { destination, budget, duration, startDate, groupType, interests, specialReqs } = req.body;
  if (!destination) {
    res.status(400).json({ error: 'Missing destination.' });
    return;
  }

  try {
    console.log(`[Gemini] Generating trip itinerary for: ${destination} (${duration} days)`);
    const plan = await generateTripPlanOnServer(
      destination,
      budget,
      Number(duration),
      startDate,
      groupType,
      interests || [],
      specialReqs
    );
    res.json(plan);
  } catch (error: any) {
    console.error(`Itinerary generation failed:`, error);
    res.status(500).json({ error: 'Failed to generate travel plan itinerary.', details: error.message });
  }
});

// Endpoint 3: Generate packing list
apiRouter.post('/generate-packing', async (req: Request, res: Response) => {
  const { destination, weather, duration, season, activities } = req.body;
  if (!destination) {
    res.status(400).json({ error: 'Missing destination.' });
    return;
  }

  try {
    console.log(`[Gemini] Generating packing list for: ${destination}`);
    const packingList = await generatePackingListOnServer(
      destination,
      weather || 'mild',
      Number(duration),
      season || 'summer',
      activities || []
    );
    res.json(packingList);
  } catch (error: any) {
    console.error(`Packing list generation failed:`, error);
    res.status(500).json({ error: 'Failed to generate packing list.', details: error.message });
  }
});

// Endpoint 4: Chat with AI Assistant
apiRouter.post('/chat', async (req: Request, res: Response) => {
  const { message, chatHistory } = req.body;
  if (!message) {
    res.status(400).json({ error: 'Missing message.' });
    return;
  }

  try {
    console.log(`[Gemini] Chat message received: ${message}`);
    const reply = await chatWithAssistantOnServer(message, chatHistory || []);
    res.json({ reply });
  } catch (error: any) {
    console.error(`Chat session failed:`, error);
    res.status(500).json({ error: 'Assistant failed to respond.', details: error.message });
  }
});

// Endpoint 5: Scrape any generic URL and extract with Gemini
apiRouter.post('/scrape-url', async (req: Request, res: Response) => {
  const { url, instruction } = req.body;
  if (!url) {
    res.status(400).json({ error: 'Missing URL parameter.' });
    return;
  }

  try {
    console.log(`[Scraper] Scraping custom URL: ${url}`);
    const rawText = await scrapeCustomUrl(url);

    // If instruction is provided, run it through Gemini to extract info
    if (instruction) {
      console.log(`[Gemini] Running custom extraction instruction: ${instruction}`);
      const reply = await extractDestinationData(
        url, 
        `Url Content:\n${rawText}\n\nExtraction Instruction: ${instruction}`
      );
      res.json({ data: reply, sourceUrl: url });
    } else {
      res.json({ text: rawText.substring(0, 5000), sourceUrl: url });
    }
  } catch (error: any) {
    console.error(`Custom URL scrape failed for ${url}:`, error);
    res.status(500).json({ 
      error: 'Failed to scrape custom URL.',
      details: error.message 
    });
  }
});

// Endpoint 6: Weather Proxy (Avoids frontend CORS blockages)
apiRouter.get('/weather', async (req: Request, res: Response) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) {
    res.status(400).json({ error: 'Missing lat or lon query parameters.' });
    return;
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error: any) {
    console.error('Weather proxy failed:', error);
    res.status(500).json({ error: 'Failed to fetch weather proxy.' });
  }
});

// Endpoint 7: Scrape specific transit route details by Route Number
apiRouter.get('/scrape-route', async (req: Request, res: Response) => {
  const routeNumber = req.query.routeNumber as string;
  const city = req.query.city as string;
  if (!routeNumber) {
    res.status(400).json({ error: 'Missing routeNumber parameter.' });
    return;
  }

  try {
    const officialQuery = city ? `${city} public transportation authority transit website` : `official public transportation transit website`;
    const blogQuery = city ? `${routeNumber} transit timetable route stops ${city}` : `${routeNumber} public transit timetable stops schedule`;
    console.log(`[Scraper] Searching Yahoo with official: "${routeNumber} ${officialQuery}" and blogs: "${routeNumber} ${blogQuery}"`);
    
    const searchRes = await searchAndScrapeWebLinks(routeNumber, officialQuery, blogQuery);
    let sourceText = searchRes.text.trim();

    if (!sourceText) {
      console.warn(`[Scraper] No external pages found for route ${routeNumber}. Using Gemini base knowledge.`);
      sourceText = `Route Number: ${routeNumber}. Please reconstruct the details for this route using your own knowledge database. Make sure it includes stops, type of transit, estimated duration, frequency, and fare.`;
    }

    const structuredRoute = await extractTransitRouteData(routeNumber, sourceText, city);
    res.json(structuredRoute);
  } catch (error: any) {
    console.error(`Route scrape failed for ${routeNumber}:`, error);
    res.status(500).json({ error: 'Failed to scrape transit route details.', details: error.message });
  }
});

// Endpoint 8: Scrape transit routes/options between two places (From -> To)
apiRouter.get('/scrape-transit', async (req: Request, res: Response) => {
  const from = req.query.from as string;
  const to = req.query.to as string;
  if (!from || !to) {
    res.status(400).json({ error: 'Missing from or to parameters.' });
    return;
  }

  try {
    const officialQuery = `how to travel public transit from ${from} to ${to} official transport website`;
    const blogQuery = `how to travel from ${from} to ${to} train bus flight timetable schedule ticket price`;
    console.log(`[Scraper] Searching city transit options with official: "${officialQuery}" and blogs: "${blogQuery}"`);

    const searchRes = await searchAndScrapeWebLinks('', officialQuery, blogQuery);
    let sourceText = searchRes.text.trim();

    if (!sourceText) {
      console.warn(`[Scraper] No travel routes found from ${from} to ${to}. Using Gemini knowledge.`);
      sourceText = `Analyze travel options from ${from} to ${to}. Please reconstruct logical travel routes (train, bus, or flights) using your own knowledge database.`;
    }

    const transitOptions = await extractCityToCityTransit(from, to, sourceText);
    res.json(transitOptions);
  } catch (error: any) {
    console.error(`Transit scrape failed from ${from} to ${to}:`, error);
    res.status(500).json({ error: 'Failed to scrape transit options.', details: error.message });
  }
});

// Endpoint 9: Scrape city transit guide (new automated workflow)
apiRouter.get('/city-transit-guide', async (req: Request, res: Response) => {
  const city = req.query.city as string;
  if (!city) {
    res.status(400).json({ error: 'Missing city parameter.' });
    return;
  }

  try {
    console.log(`[City Transit Guide] Discovering transit modes & queries for: ${city}`);
    // Phase 1: AI Discovery of transit sites
    const discovery = await discoverCityTransitWebsites(city);
    console.log(`[City Transit Guide] Discovered: ${discovery.city}, ${discovery.state}, ${discovery.country}`);
    console.log(`[City Transit Guide] Modes: ${discovery.transitTypes.join(', ')}`);

    let combinedScrapedText = '';
    const sourceUrls: string[] = [];

    // Phase 2: Concurrent Web Scraping
    if (discovery.searchQueries && discovery.searchQueries.length > 0) {
      console.log(`[City Transit Guide] Scraping transit websites concurrently for ${discovery.searchQueries.length} modes...`);
      
      const scrapePromises = discovery.searchQueries.map(async (queryItem) => {
        try {
          console.log(`[City Transit Guide] Scraping for ${queryItem.type}...`);
          const searchRes = await searchAndScrapeWebLinks(
            '',
            queryItem.officialQuery,
            queryItem.blogQuery
          );
          if (searchRes.text.trim()) {
            return {
              type: queryItem.type,
              text: searchRes.text.trim(),
              urls: searchRes.urls
            };
          }
        } catch (err: any) {
          console.error(`[City Transit Guide] Scrape failed for mode ${queryItem.type}:`, err.message || err);
        }
        return null;
      });

      const results = await Promise.all(scrapePromises);
      results.forEach((resItem) => {
        if (resItem) {
          combinedScrapedText += `=== PUBLIC TRANSIT DATA FOR TYPE: ${resItem.type} ===\n${resItem.text}\n\n`;
          sourceUrls.push(...resItem.urls);
        }
      });
    }

    // Fallback: if nothing scraped, Gemini constructs guide using its pre-existing knowledge
    if (!combinedScrapedText.trim()) {
      console.warn(`[City Transit Guide] No external websites successfully scraped. Invoking generative fallback.`);
      combinedScrapedText = `City: ${discovery.city}, State: ${discovery.state}, Country: ${discovery.country}. Please construct a highly accurate public transit route list for this city using your pre-existing knowledge. Ensure key routes, timings, prices, and stops are included.`;
    }

    // Phase 3: AI Structuring
    console.log(`[City Transit Guide] Structuring aggregate transit text (${combinedScrapedText.length} chars) with Gemini...`);
    const structuredGuide = await extractCityTransitGuide(
      discovery.city,
      discovery.country,
      discovery.state,
      combinedScrapedText
    );

    res.json({
      city: discovery.city,
      state: discovery.state,
      country: discovery.country,
      routes: structuredGuide.routes || [],
      sourceUrls
    });
  } catch (error: any) {
    console.error(`City transit guide generation failed for ${city}:`, error);
    res.status(500).json({
      error: 'Failed to generate city transit guide.',
      details: error.message
    });
  }
});

// Endpoint 10: Processing Agent endpoint to parse messy scraped transit data
apiRouter.post('/process-agent', async (req: Request, res: Response) => {
  const { city, raw_data } = req.body;
  if (!city || !raw_data) {
    res.status(400).json({ error: 'Missing city or raw_data parameters.' });
    return;
  }

  try {
    console.log(`[Processing Agent] Handling transit processing request for city: ${city}`);
    const processedPayload = await processTransitAgentData(city, raw_data);
    res.json(processedPayload);
  } catch (error: any) {
    console.error('[Processing Agent] Failed to parse transit text:', error);
    res.status(500).json({
      error: 'Transit data processing failed.',
      details: error.message
    });
  }
});

