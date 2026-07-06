import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Send, Sparkles, Mic, MicOff, AlertCircle, Train, Plane, Compass, DollarSign, Clock
} from 'lucide-react';
import { chatWithAssistant } from '../services/gemini';
import { GlassCard } from '../components/common/GlassCard';
import axios from 'axios';
import { getBackendApiUrl } from '../services/apiConfig';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  transitOptions?: {
    bestOption: any;
    cheapestOption: any;
    fastestOption: any;
    alternatives: any[];
    estimatedCost: string;
    journeyDuration: string;
    travelAdvice: string;
  };
}

export const AssistantChatScreen: React.FC = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "Hello! I'm your AI Travel Assistant. Ask me anything about destinations, local customs, safety guidelines, packing checklists, or transit routing options!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll to bottom of chat history
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Set up Speech Recognition on component mount
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      rec.onresult = (event: any) => {
        const resultText = event.results[0][0].transcript;
        setInputText(resultText);
      };

      rec.onerror = (err: any) => {
        console.error('Speech recognition error:', err);
        setSpeechError('Speech recognition failed. Try speaking closer to the microphone.');
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  // Handle Speech recognition trigger
  const toggleSpeechRecognition = () => {
    if (!recognitionRef.current) {
      alert('Speech Recognition is not supported by your browser or platform. Try using Google Chrome.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: 'user',
      text: inputText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      // 1. Check if user typed a transit routing request (e.g. "Tokyo to Kyoto")
      const transitMatch = userMsg.text.match(/^\s*([a-zA-Z\s,]+)\s+to\s+([a-zA-Z\s,]+)\s*$/i);
      if (transitMatch) {
        const from = transitMatch[1].trim();
        const to = transitMatch[2].trim();
        
        const response = await axios.get(`${getBackendApiUrl()}/scrape-transit?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
        const transitData = response.data;

        const assistantMsg: ChatMessage = {
          id: `msg_${Date.now() + 1}`,
          sender: 'assistant',
          text: `I've analyzed available transit data from ${from} to ${to}:`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          transitOptions: transitData
        };

        setMessages(prev => [...prev, assistantMsg]);
        setIsTyping(false);
        return;
      }

      // 2. Standard Gemini Chat fallback
      const chatHistory = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({
          role: (m.sender === 'user' ? 'user' : 'model') as 'user' | 'model',
          parts: [m.text]
        }));

      const reply = await chatWithAssistant(userMsg.text, chatHistory);

      const assistantMsg: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        sender: 'assistant',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Chat session failed:', err);
      const assistantMsg: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        sender: 'assistant',
        text: "I'm sorry, I couldn't process that query. Make sure you are connected to the internet or try searching with city names like 'Tokyo to Kyoto'.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, assistantMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-between transition-colors duration-300">
      
      {/* Clickable Project Name */}
      <div className="px-6 pt-4 pb-2 bg-slate-50 dark:bg-slate-950 max-w-md mx-auto w-full flex justify-between items-center transition-colors">
        <div 
          onClick={() => navigate('/')} 
          className="flex items-center gap-1.5 font-sans font-extrabold tracking-widest text-xs text-green-600 dark:text-green-400 hover:opacity-85 cursor-pointer transition-opacity"
        >
          <Compass className="w-4 h-4 text-green-500 animate-spin-slow" />
          <span>TRAVEL GUIDE</span>
        </div>
      </div>

      {/* Top Header */}
      <div className="px-6 pt-4 pb-4 flex justify-between items-center max-w-md mx-auto w-full shrink-0">
        <div>
          <span className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider">AI Travel Assistant</span>
          <h1 className="text-2xl font-extrabold tracking-tight mt-0">Ask Advisor</h1>
        </div>
        <div className="w-10 h-10 bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/25 flex items-center justify-center rounded-2xl">
          <Sparkles className="w-5 h-5 animate-pulse-soft" />
        </div>
      </div>

      {/* Main Messaging Area */}
      <div className="flex-1 overflow-y-auto px-6 py-2 max-w-md mx-auto w-full flex flex-col gap-4">
        {messages.map((m) => {
          const isUser = m.sender === 'user';
          return (
            <div 
              key={m.id}
              className={`flex flex-col max-w-[92%] ${
                isUser ? 'ml-auto items-end' : 'mr-auto items-start animate-slide-up'
              }`}
            >
              <div 
                className={`py-3 px-4 rounded-2xl text-xs font-medium leading-relaxed font-sans shadow-sm border ${
                  isUser 
                    ? 'bg-green-500 text-white border-green-500 rounded-tr-none' 
                    : 'bg-white dark:bg-slate-900 border-slate-200/50 dark:border-slate-800/50 text-slate-800 dark:text-slate-100 rounded-tl-none'
                }`}
              >
                {m.text}

                {/* Transit Options structured display */}
                {m.transitOptions && (
                  <div className="mt-3 flex flex-col gap-3 text-slate-800 dark:text-slate-100 max-w-xs font-sans">
                    
                    {/* Summary row */}
                    <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-800/50 p-2 rounded-xl text-[10px] font-bold border border-slate-200/40 dark:border-slate-700/40">
                      <span className="flex items-center gap-1"><Clock size={12} /> {m.transitOptions.journeyDuration}</span>
                      <span className="flex items-center gap-0.5"><DollarSign size={12} /> {m.transitOptions.estimatedCost}</span>
                    </div>

                    {/* Best option card */}
                    {m.transitOptions.bestOption && (
                      <GlassCard hoverEffect={false} className="p-3 border-l-4 border-l-green-500 bg-white/70 dark:bg-slate-900/70">
                        <div className="flex justify-between items-center">
                          <span className="text-[8px] bg-green-500 text-white font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">Best Option</span>
                          <span className="text-xs font-extrabold text-green-600 dark:text-green-400">${m.transitOptions.bestOption.fare.toFixed(2)}</span>
                        </div>
                        <h4 className="text-xs font-bold mt-1.5 flex items-center gap-1 capitalize">
                          {m.transitOptions.bestOption.type === 'Airplane' ? <Plane size={12} /> : <Train size={12} />}
                          <span>{m.transitOptions.bestOption.routeName}</span>
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                          From {m.transitOptions.bestOption.source} to {m.transitOptions.bestOption.destination} ({Math.round(m.transitOptions.bestOption.duration / 60)}h {m.transitOptions.bestOption.duration % 60}m)
                        </p>
                        <p className="text-[9px] text-slate-500 italic mt-1.5 border-t border-slate-100 dark:border-slate-800 pt-1">
                          Tip: {m.transitOptions.bestOption.advice}
                        </p>
                      </GlassCard>
                    )}

                    {/* Cheapest option card */}
                    {m.transitOptions.cheapestOption && (
                      <GlassCard hoverEffect={false} className="p-3 border-l-4 border-l-blue-500 bg-white/70 dark:bg-slate-900/70">
                        <div className="flex justify-between items-center">
                          <span className="text-[8px] bg-blue-500 text-white font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">Cheapest Option</span>
                          <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400">${m.transitOptions.cheapestOption.fare.toFixed(2)}</span>
                        </div>
                        <h4 className="text-xs font-bold mt-1.5 flex items-center gap-1 capitalize">
                          <Compass size={12} />
                          <span>{m.transitOptions.cheapestOption.routeName}</span>
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Duration: {Math.round(m.transitOptions.cheapestOption.duration / 60)}h {m.transitOptions.cheapestOption.duration % 60}m
                        </p>
                        <p className="text-[9px] text-slate-500 italic mt-1.5 border-t border-slate-100 dark:border-slate-800 pt-1">
                          Tip: {m.transitOptions.cheapestOption.advice}
                        </p>
                      </GlassCard>
                    )}

                    {/* Fastest option card */}
                    {m.transitOptions.fastestOption && (
                      <GlassCard hoverEffect={false} className="p-3 border-l-4 border-l-purple-500 bg-white/70 dark:bg-slate-900/70">
                        <div className="flex justify-between items-center">
                          <span className="text-[8px] bg-purple-500 text-white font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">Fastest Option</span>
                          <span className="text-xs font-extrabold text-purple-600 dark:text-purple-400">${m.transitOptions.fastestOption.fare.toFixed(2)}</span>
                        </div>
                        <h4 className="text-xs font-bold mt-1.5 flex items-center gap-1 capitalize">
                          <Plane size={12} />
                          <span>{m.transitOptions.fastestOption.routeName}</span>
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Duration: {Math.round(m.transitOptions.fastestOption.duration / 60)}h {m.transitOptions.fastestOption.duration % 60}m
                        </p>
                        <p className="text-[9px] text-slate-500 italic mt-1.5 border-t border-slate-100 dark:border-slate-800 pt-1">
                          Tip: {m.transitOptions.fastestOption.advice}
                        </p>
                      </GlassCard>
                    )}

                    {/* Overall advice */}
                    <div className="bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 p-2.5 rounded-xl text-[10px] leading-relaxed">
                      <strong>AI Travel Advice:</strong> {m.transitOptions.travelAdvice}
                    </div>

                  </div>
                )}
              </div>
              <span className="text-[9px] text-slate-400 mt-1 px-1 font-bold">
                {m.timestamp}
              </span>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-center gap-1.5 mr-auto max-w-[80%] bg-white dark:bg-slate-900 border border-slate-200/40 dark:border-slate-800/40 py-2.5 px-4 rounded-2xl rounded-tl-none animate-pulse">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce delay-100" />
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce delay-200" />
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce delay-300" />
          </div>
        )}

        {/* Speech Error Banner */}
        {speechError && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-2.5 rounded-xl flex items-center gap-2 text-[10px] my-1">
            <AlertCircle size={14} className="shrink-0" />
            <span>{speechError}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Message Form */}
      <div className="px-6 py-4 max-w-md mx-auto w-full mb-20 shrink-0">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          
          {/* Voice Search Button */}
          <button
            type="button"
            onClick={toggleSpeechRecognition}
            className={`p-3 rounded-2xl flex items-center justify-center cursor-pointer transition-all border shadow-sm ${
              isListening
                ? 'bg-red-500 border-red-500 text-white animate-pulse'
                : 'bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800/60 text-slate-500 dark:text-slate-400'
            }`}
            title="Speech Voice Input"
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          {/* Text Input */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder={isListening ? "Listening..." : "Ask about landmarks, restaurants..."}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/70 text-xs focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-3 bg-green-500 hover:bg-green-600 disabled:bg-slate-200 dark:disabled:bg-slate-900 text-white disabled:text-slate-400 rounded-2xl flex items-center justify-center cursor-pointer shadow-md hover:scale-105 active:scale-95 transition-all"
          >
            <Send size={16} />
          </button>
        </form>
      </div>

    </div>
  );
};
