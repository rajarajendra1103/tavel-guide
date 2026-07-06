import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { apiRouter } from './routes/api.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Log incoming request operations
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Mount Scraper API Routes
app.use('/api', apiRouter);

// Root path friendly message
app.get('/', (_req, res) => {
  res.json({ 
    message: '🚀 Travel Guide API is up and running!', 
    healthCheck: '/health', 
    endpoints: {
      scrape: '/api/scrape',
      generatePlan: '/api/generate-plan',
      generatePacking: '/api/generate-packing'
    } 
  });
});

// Health status check
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Travel Guide backend scraping server listening on port ${PORT}`);
});
