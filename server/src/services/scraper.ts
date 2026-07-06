import { chromium, Browser, BrowserContext } from 'playwright';
import * as cheerio from 'cheerio';

// Interface for raw scraped details
export interface ScrapeResult {
  destination: string;
  sourceText: string;
  sourceUrls: string[];
}

const isValidTravelLink = (url: string): boolean => {
  const lower = url.toLowerCase();
  if (!url.startsWith('http')) return false;
  
  const forbiddenDomains = [
    'yahoo.com', 'yahoo.co', 'yimg.com', 
    'wikipedia.org', 'wikivoyage.org',
    'microsoft.com', 'bing.com', 'google.com',
    'facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com', 'youtube.com'
  ];
  
  return !forbiddenDomains.some(domain => lower.includes(domain));
};

// Perform Yahoo Search via Playwright
const performYahooSearch = async (context: BrowserContext, query: string): Promise<string[]> => {
  let page;
  try {
    page = await context.newPage();
    const searchUrl = `https://search.yahoo.com/search?p=${encodeURIComponent(query)}`;
    console.log(`[Scraper] Searching Yahoo: ${searchUrl}`);
    
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
    const content = await page.content();
    const $ = cheerio.load(content);
    
    const links: string[] = [];
    $('a').each((_, el) => {
      const href = $(el).attr('href');
      if (href && isValidTravelLink(href)) {
        if (!links.includes(href)) {
          links.push(href);
        }
      }
    });
    
    console.log(`[Scraper] Search found ${links.length} links for "${query}"`);
    return links;
  } catch (err: any) {
    console.error(`[Scraper] Yahoo search failed for "${query}":`, err.message || err);
    return [];
  } finally {
    if (page) {
      await page.close();
    }
  }
};

// Scrape multiple URLs concurrently using a single Playwright browser instance
export const scrapeUrlsBatch = async (urls: string[]): Promise<Record<string, string>> => {
  let browser: Browser | null = null;
  const results: Record<string, string> = {};

  if (urls.length === 0) return results;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    });

    const scrapePromises = urls.map(async (url) => {
      let page;
      try {
        page = await context.newPage();
        
        // Optimisation: Block images, stylesheets, fonts, and media to make load extremely fast
        await page.route('**/*', (route) => {
          const type = route.request().resourceType();
          if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
            route.abort();
          } else {
            route.continue();
          }
        });

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 8000 });
        
        // Remove noise
        await page.evaluate(() => {
          const selectors = ['header', 'footer', 'nav', 'script', 'style', 'iframe', 'svg', 'noscript'];
          selectors.forEach(sel => {
            const elements = (globalThis as any).document.querySelectorAll(sel);
            elements.forEach((el: any) => el.remove());
          });
        });

        const bodyText = await page.innerText('body');
        results[url] = bodyText.replace(/\s+/g, ' ').trim().substring(0, 6000);
      } catch (err: any) {
        console.error(`[Batch Scraper] Failed to scrape ${url}:`, err.message || err);
      } finally {
        if (page) {
          await page.close();
        }
      }
    });

    await Promise.all(scrapePromises);
  } catch (error) {
    console.error('[Batch Scraper] Error in batch scrape:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  return results;
};

// Search and scrape travel blogs and official websites (Wikipedia completely bypassed)
export const searchAndScrapeWebLinks = async (
  query: string,
  officialSuffix: string = 'official tourism website',
  blogSuffix: string = 'travel guide blogs'
): Promise<{ text: string; urls: string[] }> => {
  const urls: string[] = [];
  let combinedText = '';
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    });

    // Run both Yahoo searches concurrently
    const [officialLinks, blogLinks] = await Promise.all([
      performYahooSearch(context, query ? `${query} ${officialSuffix}` : officialSuffix),
      performYahooSearch(context, query ? `${query} ${blogSuffix}` : blogSuffix)
    ]);

    const targetLinks: string[] = [];
    
    // Select top 2 unique tourism links
    officialLinks.forEach(link => {
      if (!targetLinks.includes(link)) {
        if (targetLinks.length < 2) targetLinks.push(link);
      }
    });
    
    // Select top 2 unique travel blog links
    blogLinks.forEach(link => {
      if (!targetLinks.includes(link)) {
        if (targetLinks.length < 4) targetLinks.push(link);
      }
    });

    console.log(`[Scraper] Targeted links for ${query}:`, targetLinks);

    if (targetLinks.length > 0) {
      // Scrape the target links concurrently using the same context
      const scrapePromises = targetLinks.map(async (url) => {
        let page;
        try {
          page = await context.newPage();
          
          // Optimisation: Block images, stylesheets, fonts, media
          await page.route('**/*', (route) => {
            const type = route.request().resourceType();
            if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
              route.abort();
            } else {
              route.continue();
            }
          });

          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 8000 });
          
          await page.evaluate(() => {
            const selectors = ['header', 'footer', 'nav', 'script', 'style', 'iframe', 'svg', 'noscript'];
            selectors.forEach(sel => {
              const elements = (globalThis as any).document.querySelectorAll(sel);
              elements.forEach((el: any) => el.remove());
            });
          });

          const bodyText = await page.innerText('body');
          const cleanText = bodyText.replace(/\s+/g, ' ').trim().substring(0, 6000);
          
          if (cleanText.length > 100) {
            combinedText += `=== SOURCE CONTENT FROM: ${url} ===\n${cleanText}\n\n`;
            urls.push(url);
          }
        } catch (err: any) {
          console.error(`[Scraper] Failed to scrape ${url}:`, err.message || err);
        } finally {
          if (page) {
            await page.close();
          }
        }
      });

      await Promise.all(scrapePromises);
    }
  } catch (error) {
    console.error('[Scraper] searchAndScrapeWebLinks failed:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  return { text: combinedText, urls };
};

// Kept for signature compatibility if imported elsewhere, but returns empty (Wikipedia is bypassed)
export const scrapeWikiTravelData = async (query: string): Promise<ScrapeResult> => {
  return {
    destination: query,
    sourceText: '',
    sourceUrls: []
  };
};

// Single URL helper kept for compatibility
export const scrapeCustomUrl = async (url: string): Promise<string> => {
  const batchRes = await scrapeUrlsBatch([url]);
  return batchRes[url] || '';
};
