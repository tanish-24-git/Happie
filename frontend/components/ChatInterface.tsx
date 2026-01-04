'use client';

import { useState, useRef, useEffect } from 'react';
import { api, type ChatResponse, type Model } from '@/lib/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  model_id?: string;
  metrics?: {
    latency_ms: number;
    tokens_per_sec: number;
  };
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeModel, setActiveModel] = useState<Model | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadModels();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadModels = async () => {
    try {
      const [modelsList, active] = await Promise.all([
        api.listModels(),
        api.getActiveModel(),
      ]);
      setModels(modelsList);
      setActiveModel(active);
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response: ChatResponse = await api.chat({
        prompt: userMessage.content,
        max_tokens: 512,
      });

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.text,
        model_id: response.model_id,
        metrics: {
          latency_ms: response.metrics.latency_ms,
          tokens_per_sec: response.metrics.tokens_per_sec,
        },
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleModelChange = async (modelId: string) => {
    try {
      await api.setActiveModel(modelId);
      const newActive = models.find((m) => m.id === modelId);
      setActiveModel(newActive || null);
    } catch (error) {
      console.error('Failed to change model:', error);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-primary">
      {/* Header */}
      <header className="border-b border-color bg-primary px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-primary">HAPIE</h1>
        
        {/* Model Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-secondary">Model:</span>
          <select
            value={activeModel?.id || ''}
            onChange={(e) => handleModelChange(e.target.value)}
            className="bg-secondary text-primary border border-color rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-primary mb-2">
                Welcome to HAPIE
              </h2>
              <p className="text-secondary">
                Hardware-Aware Performance Inference Engine
              </p>
              <p className="text-tertiary text-sm mt-2">
                Start a conversation with your AI model
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto py-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`px-4 py-6 ${
                  message.role === 'assistant' ? 'bg-secondary' : ''
                }`}
              >
                <div className="max-w-3xl mx-auto flex gap-4">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <div
                      className={`w-8 h-8 rounded-sm flex items-center justify-center text-white font-semibold ${
                        message.role === 'user'
                          ? 'bg-accent'
                          : 'bg-gradient-to-br from-purple-500 to-pink-500'
                      }`}
                    >
                      {message.role === 'user' ? 'U' : 'AI'}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 space-y-2">
                    <div className="text-primary whitespace-pre-wrap">
                      {message.content}
                    </div>

                    {/* Metrics */}
                    {message.metrics && (
                      <div className="text-xs text-tertiary flex gap-4">
                        <span>
                          {message.metrics.latency_ms.toFixed(0)}ms
                        </span>
                        <span>
                          {message.metrics.tokens_per_sec.toFixed(1)} tok/s
                        </span>
                        {message.model_id && (
                          <span className="text-accent">{message.model_id}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="px-4 py-6 bg-secondary">
                <div className="max-w-3xl mx-auto flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-sm flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 text-white font-semibold">
                      AI
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-text-tertiary rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-text-tertiary rounded-full animate-bounce delay-100"></div>
                      <div className="w-2 h-2 bg-text-tertiary rounded-full animate-bounce delay-200"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-color bg-primary px-4 py-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Send a message..."
              disabled={loading}
              className="flex-1 bg-secondary text-primary border border-color rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-accent text-white px-6 py-3 rounded-lg font-medium hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
