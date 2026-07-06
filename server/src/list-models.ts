import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || '';
console.log('Using API key:', apiKey ? 'Loaded' : 'Not loaded');
const genAI = new GoogleGenerativeAI(apiKey);

async function run() {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = (await response.json()) as any;
    if (data && data.models) {
      const filtered = data.models.filter((m: any) => 
        m.name.includes('gemini') && 
        m.supportedGenerationMethods.includes('generateContent')
      ).map((m: any) => m.name);
      console.log('Available Gemini Models:', filtered);
    } else {
      console.log('No models key found:', data);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

run();
