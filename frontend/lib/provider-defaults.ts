/**
 * Cloud Provider Configuration
 * Default model IDs API base URLs for supported cloud providers
 */

export interface ProviderDefaults {
  name: string;
  model: string;
  url: string;
  apiKeyPlaceholder: string;
  description: string;
}

export const PROVIDER_DEFAULTS: Record<string, ProviderDefaults> = {
  openai: {
    name: "OpenAI",
    model: "gpt-4o-mini",
    url: "https://api.openai.com/v1",
    apiKeyPlaceholder: "sk-...",
    description: "GPT-4, GPT-4o, GPT-3.5 Turbo models"
  },
  grok: {
    name: "Grok (xAI)",
    model: "grok-beta",
    url: "https://api.x.ai/v1",
    apiKeyPlaceholder: "xai-...",
    description: "Grok and Grok-2 models by xAI"
  },
  gemini: {
    name: "Gemini (Google)",
    model: "gemini-1.5-pro",
    url: "https://generativelanguage.googleapis.com/v1beta",
    apiKeyPlaceholder: "AIzaSy...",
    description: "Gemini Pro and Flash models"
  },
  anthropic: {
    name: "Anthropic",
    model: "claude-3-5-sonnet-20241022",
    url: "https://api.anthropic.com/v1",
    apiKeyPlaceholder: "sk-ant-...",
    description: "Claude 3.5 Sonnet, Haiku, Opus models"
  },
  groq: {
    name: "Groq",
    model: "llama3-70b-8192",
    url: "https://api.groq.com/openai/v1",
    apiKeyPlaceholder: "gsk_...",
    description: "Ultra-fast Llama 3 and Mixtral models"
  },
  custom: {
    name: "Custom",
    model: "",
    url: "",
    apiKeyPlaceholder: "Enter API key",
    description: "Custom OpenAI-compatible API"
  }
};

export const PROVIDER_OPTIONS = Object.keys(PROVIDER_DEFAULTS).map(key => ({
  value: key,
  label: PROVIDER_DEFAULTS[key].name
}));
