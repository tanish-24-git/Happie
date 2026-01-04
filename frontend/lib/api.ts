/**
 * API client for HAPIE backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
  metadata: Record<string, any> | null;
  created_at: number;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  model_id: string | null;
  created_at: number;
}

export interface ChatResponse {
  text: string;
  model_id: string;
  conversation_id: string;
  message_id: string;
  metrics: {
    latency_ms: number;
    tokens_generated: number;
    tokens_per_sec: number;
  };
}

export interface ComparisonResult {
  model_id: string;
  model_name: string;
  text: string;
  metrics: {
    latency_ms: number;
    tokens_generated: number;
    tokens_per_sec: number;
  };
}

class APIClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // System endpoints
  async getSystemInfo(): Promise<SystemInfo> {
    return this.request<SystemInfo>('/api/system/info');
  }

  async getCapability(): Promise<SystemCapability> {
    return this.request<SystemCapability>('/api/system/capability');
  }

  async getPolicy(): Promise<ExecutionPolicy> {
    return this.request<ExecutionPolicy>('/api/system/policy');
  }

  // Model endpoints
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

  async pullModel(data: {
    repo_id: string;
    filename: string;
    model_id?: string;
    name?: string;
  }): Promise<Model> {
    return this.request<Model>('/api/models/pull', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async removeModel(modelId: string): Promise<{ status: string; message: string }> {
    return this.request(`/api/models/${modelId}`, {
      method: 'DELETE',
    });
  }

  // Chat endpoints
  async chat(data: {
    prompt: string;
    model_id?: string;
    max_tokens?: number;
    temperature?: number;
    top_p?: number;
    conversation_id?: string;
  }): Promise<ChatResponse> {
    return this.request<ChatResponse>('/api/chat/single', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async compareModels(data: {
    prompt: string;
    model_ids: string[];
    max_tokens?: number;
    temperature?: number;
    top_p?: number;
  }): Promise<{ results: ComparisonResult[] }> {
    return this.request<{ results: ComparisonResult[] }>('/api/chat/compare', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getConversations(): Promise<any[]> {
    return this.request<any[]>('/api/chat/conversations');
  }

  async getConversationMessages(conversationId: string): Promise<ChatMessage[]> {
    return this.request<ChatMessage[]>(`/api/chat/conversations/${conversationId}/messages`);
  }
}

export const api = new APIClient();
