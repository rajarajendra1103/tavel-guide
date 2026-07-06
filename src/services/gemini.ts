import axios from 'axios';
import { getBackendApiUrl } from './apiConfig';

// Backend server URL
const BACKEND_URL = getBackendApiUrl();

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
  category: 'Documents' | 'Clothing' | 'Electronics' | 'Medicine' | 'Accessories' | 'Travel Essentials';
  items: { name: string; checked: boolean }[];
}

export const generateTripPlan = async (
  destination: string,
  budget: string,
  duration: number,
  startDate: string,
  groupType: string,
  interests: string[],
  specialReqs?: string
): Promise<TripPlanResult> => {
  try {
    const response = await axios.post(`${BACKEND_URL}/generate-plan`, {
      destination,
      budget,
      duration,
      startDate,
      groupType,
      interests,
      specialReqs
    });
    return response.data;
  } catch (error: any) {
    console.error('Error generating plan from backend:', error);
    throw new Error(error.response?.data?.error || 'Failed to generate trip plan itinerary.');
  }
};

export const generatePackingList = async (
  destination: string,
  weather: string,
  duration: number,
  season: string,
  activities: string[]
): Promise<PackingListCategory[]> => {
  try {
    const response = await axios.post(`${BACKEND_URL}/generate-packing`, {
      destination,
      weather,
      duration,
      season,
      activities
    });
    return response.data;
  } catch (error: any) {
    console.error('Error generating packing list from backend:', error);
    throw new Error(error.response?.data?.error || 'Failed to generate packing list.');
  }
};

export const chatWithAssistant = async (
  message: string,
  chatHistory: { role: 'user' | 'model'; parts: string[] }[] = []
): Promise<string> => {
  try {
    const response = await axios.post(`${BACKEND_URL}/chat`, {
      message,
      chatHistory
    });
    return response.data.reply;
  } catch (error: any) {
    console.error('Error in Gemini Assistant Chat via backend:', error);
    throw new Error(error.response?.data?.error || 'Failed to get chat response.');
  }
};
