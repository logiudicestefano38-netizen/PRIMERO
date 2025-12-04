import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { sendMessageToGemini } from '../services/geminiService';
import type { Content } from '@google/genai';

const STORAGE_KEY = 'fany_chat_history';

const INITIAL_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'model',
  text: '¡Hola! Soy Fany IA, tu asistente técnico. ¿En qué puedo ayudarte hoy con respecto a programación, soporte técnico o IA?',
  timestamp: new Date() // Placeholder, will be refreshed on init
};

const ChatInterface: React.FC = () => {
  // Initialize state from localStorage if available
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          // Validate that it is an array before mapping
          if (Array.isArray(parsed)) {
            return parsed.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            }));
          }
        }
      } catch (error) {
        console.error("Error cargando historial:", error);
        // If data is corrupt, we could clear it: localStorage.removeItem(STORAGE_KEY);
      }
    }
    // Return a fresh instance of the initial message
    return [{ ...INITIAL_MESSAGE, timestamp: new Date() }];
  });

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Save to localStorage whenever messages change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  const handleClearHistory = () => {
    if (window.confirm('¿Estás seguro de que deseas borrar todo el historial de chat?')) {
      const resetState = [{ ...INITIAL_MESSAGE, timestamp: new Date() }];
      setMessages(resetState);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(resetState));
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userText = inputValue;
    setInputValue('');
    
    // Add User Message
    const newUserMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: userText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newUserMsg]);
    setIsLoading(true);

    try {
      // Prepare history for Gemini
      const history: Content[] = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        }));

      // Get response
      const responseText = await sendMessageToGemini(userText, history);

      const newModelMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, newModelMsg]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "Lo siento, hubo un error procesando tu solicitud.",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors duration-300">
      {/* Header */}
      <div className="bg-brand-600 dark:bg-brand-700 p-4 text-white flex items-center justify-between transition-colors">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
             <i className="fas fa-robot text-xl"></i>
          </div>
          <div>
            <h3 className="font-bold">Fany IA Chat</h3>
            <p className="text-brand-100 text-xs flex items-center">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-1"></span>
              En línea
            </p>
          </div>
        </div>
        <button 
          onClick={handleClearHistory}
          className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors text-sm flex items-center gap-2"
          title="Borrar historial de conversación"
        >
          <i className="fas fa-trash-alt"></i>
          <span className="hidden sm:inline">Borrar Historial</span>
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-5 py-3 shadow-sm transition-colors ${
                msg.role === 'user'
                  ? 'bg-brand-600 text-white rounded-br-none'
                  : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-600 rounded-bl-none'
              }`}
            >
               {msg.role === 'model' ? (
                   <div className="markdown-body text-sm leading-relaxed whitespace-pre-wrap">
                       {msg.text}
                   </div>
               ) : (
                   <p className="text-sm">{msg.text}</p>
               )}
               <span className={`text-[10px] block mt-1 ${
                 msg.role === 'user' ? 'text-brand-200' : 'text-gray-400 dark:text-gray-400'
               }`}>
                 {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
               </span>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="bg-white dark:bg-gray-700 px-4 py-3 rounded-2xl rounded-bl-none border border-gray-100 dark:border-gray-600 shadow-sm flex items-center gap-3 transition-colors">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s'}}></div>
                  <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s'}}></div>
                </div>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 animate-pulse">
                  Fany IA está escribiendo...
                </span>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 transition-colors">
        <div className="flex items-end space-x-2 bg-gray-50 dark:bg-gray-700 p-2 rounded-xl border border-gray-200 dark:border-gray-600 focus-within:border-brand-300 dark:focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100 dark:focus-within:ring-brand-900 transition-all">
          <textarea
            className="flex-1 bg-transparent border-0 focus:ring-0 text-gray-800 dark:text-white text-sm resize-none max-h-32 py-3 px-2 placeholder-gray-400 dark:placeholder-gray-400"
            rows={1}
            placeholder="Escribe tu consulta técnica aquí..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue.trim()}
            className={`p-3 rounded-lg flex-shrink-0 transition-colors ${
              isLoading || !inputValue.trim()
                ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'bg-brand-600 text-white hover:bg-brand-700 shadow-md'
            }`}
          >
            <i className="fas fa-paper-plane"></i>
          </button>
        </div>
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-2">
          Fany IA puede cometer errores. Verifica la información importante.
        </p>
      </div>
    </div>
  );
};

export default ChatInterface;