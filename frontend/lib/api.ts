/**
 * HAPIE API Client
 * TypeScript client for communicating with the HAPIE backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

// System Interfaces
export interface SystemCapability {
  cpu_cores: number;
  cpu_threads: number;
  cpu_arch: string;
  cpu_brand: string;
  total_ram_gb: number;
  available_ram_gb: number;
  gpu_vendor: string;
  gpu_name: string | null;
  gpu_vram_gb: number | null;
  gpu_count: number;
  platform_system: string;
  platform_release: string;
}

export interface ExecutionPolicy {
  backend: string;
  max_batch_size: number;
  max_context_length: number;
  use_quantization: boolean;
  quantization_bits: number;
  gpu_layers: number;
  max_threads: number;
}

export interface SystemInfo {
  capability: SystemCapability;
  policy: ExecutionPolicy;
}

// Model Interfaces
export interface Model {
  id: string;
  name: string;
  type: string;
  provider: string | null;
  size_mb: number | null;
  backend: string;
  is_active: boolean;
  is_base_model: boolean;
  model_path: string | null;
  cloud_model_name?: string;
  metadata: Record<string, any> | null;
  created_at: number;
}

export interface PullModelRequest {
  repo_id: string;
  filename: string;
  model_id?: string;
  name?: string;
}

export interface RegisterCloudModelRequest {
  model_id: string;
  name: string;
  provider: string;
  cloud_model_name: string;
  description?: string;
}

// Chat Interfaces
export interface ChatRequest {
  prompt: string;
  model_id?: string;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  conversation_id?: string;
}

export interface ChatMetrics {
  latency_ms: number;
  tokens_generated: number;
  tokens_per_sec: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  provider?: string;
  model?: string;
  estimated_cost_usd?: number;
}

export interface ChatResponse {
  text: string;
  model_id: string;
  conversation_id: string;
  message_id: string;
  metrics: ChatMetrics;
}

export interface ComparisonRequest {
  prompt: string;
  model_ids: string[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  acknowledge_cost?: boolean;
}

export interface ComparisonResult {
  model_id: string;
  model_name: string;
  text: string;
  metrics: ChatMetrics;
  execution_type: string;
}

export interface ComparisonResponse {
  results: ComparisonResult[];
}

export interface Conversation {
  id: string;
  title: string;
  model_id: string;
  created_at: number;
  updated_at: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  model_id: string;
  created_at: number;
}

// API Key Interfaces
export interface ApiKeyData {
  provider: string;
  key_preview: string;
  created_at: number;
  last_used: number | null;
}

export interface SaveApiKeyRequest {
  api_key: string;
}

// Image Generation Interfaces
export interface ImageGenRequest {
  prompt: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  guidance_scale?: number;
}

export interface ImageResponse {
  image_base64: string;
  metadata: {
    model_used: string;
    generation_time_ms: number;
    width: number;
    height: number;
    steps: number;
  };
}



// ============================================================================
// API Client Functions
// ============================================================================

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // System API
  async getSystemInfo(): Promise<SystemInfo> {
    return this.request<SystemInfo>('/api/system/info');
  }

  async getCapability(): Promise<SystemCapability> {
    return this.request<SystemCapability>('/api/system/capability');
  }

  async getPolicy(): Promise<ExecutionPolicy> {
    return this.request<ExecutionPolicy>('/api/system/policy');
  }

  async refreshHardware(): Promise<SystemCapability> {
    return this.request<SystemCapability>('/api/system/capability/refresh', {
      method: 'POST',
    });
  }

  async getSystemMetrics(): Promise<{ cpu_percent: number; memory_percent: number; memory_used_gb: number; memory_total_gb: number }> {
    return this.request('/api/system/metrics');
  }

  // Models API
  async listModels(): Promise<Model[]> {
    return this.request<Model[]>('/api/models/');
  }

  async getModel(modelId: string): Promise<Model> {
    return this.request<Model>(`/api/models/${modelId}`);
  }

  async getActiveModel(): Promise<Model | null> {
    return this.request<Model | null>('/api/models/active/current');
  }

  async setActiveModel(modelId: string): Promise<{ status: string; active_model: string }> {
    return this.request(`/api/models/active/${modelId}`, {
      method: 'POST',
    });
  }

  async pullCustomModel(data: { repo_id: string; filename: string; model_id?: string; name?: string }): Promise<any> {
    return this.request('/api/models/pull-custom', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async pullModel(request: PullModelRequest): Promise<Model> {
    return this.request<Model>('/api/models/pull', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async registerCloudModel(data: {
    model_id: string;
    name: string;
    provider: string;
    api_endpoint: string;
    cloud_model_name?: string;
    api_key?: string;
  }): Promise<Model> {
    return this.request<Model>('/api/models/cloud', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async validateCloudModel(data: {
    provider: string;
    api_key: string;
    model_id?: string;
    base_url?: string;
  }): Promise<{ valid: boolean; provider: string; model_id?: string; error?: string }> {
    return this.request('/api/models/cloud/validate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteModel(modelId: string): Promise<{ status: string; message: string }> {
    return this.request(`/api/models/${modelId}`, {
      method: 'DELETE',
    });
  }

  async pullIntent(data: { query: string }): Promise<{ status: string; model: Model; now_active: boolean; message: string }> {
    return this.request('/api/models/pull-intent', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async recommendModels(data: { query: string; hardware?: any }): Promise<{ recommendations: any[] }> {
    return this.request('/api/models/recommend', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Chat API
  async chatSingle(request: ChatRequest): Promise<ChatResponse> {
    return this.request<ChatResponse>('/api/chat/single', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async chatCompare(request: ComparisonRequest): Promise<ComparisonResponse> {
    return this.request<ComparisonResponse>('/api/chat/compare', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getConversations(): Promise<Conversation[]> {
    return this.request<Conversation[]>('/api/chat/conversations');
  }

  async getConversationMessages(conversationId: string): Promise<Message[]> {
    return this.request<Message[]>(`/api/chat/conversations/${conversationId}/messages`);
  }

  // API Keys (Settings)
  async listApiKeys(): Promise<ApiKeyData[]> {
    return this.request<ApiKeyData[]>('/api/settings/api-keys');
  }

  async saveApiKey(provider: string, apiKey: string): Promise<{ status: string; provider: string }> {
    return this.request(`/api/settings/api-keys/${provider}`, {
      method: 'POST',
      body: JSON.stringify({ api_key: apiKey }),
    });
  }

  async validateApiKey(provider: string): Promise<{ valid: boolean; provider: string }> {
    return this.request(`/api/settings/api-keys/${provider}/validate`, {
      method: 'POST',
    });
  }

  async deleteApiKey(provider: string): Promise<{ status: string; provider: string }> {
    return this.request(`/api/settings/api-keys/${provider}`, {
      method: 'DELETE',
    });
  }

  async factoryReset(): Promise<{ status: string }> {
    return this.request('/api/settings/system/reset', {
      method: 'POST',
    });
  }

  // Image Generation API
  async generateImage(request: ImageGenRequest): Promise<ImageResponse> {
    return this.request<ImageResponse>('/api/image/generate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }


}

// Singleton instance
const apiClient = new ApiClient();

export default apiClient;

// Named exports for convenience
export const {
  getSystemInfo,
  getCapability,
  getPolicy,
  refreshHardware,
  listModels,
  getModel,
  getActiveModel,
  setActiveModel,
  pullModel,
  registerCloudModel,
  validateCloudModel,
  deleteModel,
  chatSingle,
  chatCompare,
  getConversations,
  getConversationMessages,
  listApiKeys,
  saveApiKey,
  validateApiKey,
  deleteApiKey,
  factoryReset,
  generateImage,

} = apiClient;
