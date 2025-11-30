import { getApiUrl } from '@/constants/api';

export interface Source {
  title: string;
  url: string;
  checked: boolean;
}

export interface IdeaAnalysis {
  problem_statement: string;
  summary: string;
  strengths: string;
  weaknesses: string;
  opportunities: string;
  threats: string;
  actionable_items: string[];
  validation_priority: string;
  saturation_score: number;
  juicy_score: number;
  sources: Source[];
}

export interface Idea {
  id: number;
  user_id: string;
  project_id: number | null;
  transcribed_text: string;
  analysis: IdeaAnalysis;
  created_at: string;
  updated_at: string;
}

export interface AnalyzeIdeaRequest {
  transcribed_text: string;
  project_id?: number | null;
}

export type AnalyzeIdeaResponse = Idea;

export interface Project {
  id: number;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectCreateRequest {
  name: string;
  description?: string | null;
}

export interface GenerateProjectDetailsRequest {
  transcribed_text: string;
}

export interface ProjectDetailsResponse {
  name: string;
  description: string;
}

export interface TikiTakaMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface TikiTakaRequest {
  transcribed_text: string;
  conversation_history?: TikiTakaMessage[];
  idea_context?: string | null;
}

export interface TikiTakaResponse {
  advisor_message: string;
  conversation_history: TikiTakaMessage[];
}

export interface TTSRequest {
  text: string;
  inference_steps?: number;
  style_id?: number;
  sample_rate?: number;
}

export interface TTSResponse {
  audio_base64: string;
  text: string;
  sample_rate: number;
}

export interface GenerateSurveyPostsRequest {
  idea_id: number;
  platform?: 'x' | 'threads';
  count?: number;
}

export interface PollOption {
  text: string;
}

export interface SurveyPostMessage {
  id: string;
  text: string;
  poll_options: PollOption[];
}

export interface GenerateSurveyPostsResponse {
  messages: SurveyPostMessage[];
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = getApiUrl();
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add authentication token if available
    // For now, we're using anonymous access, so no token needed
    // const token = await getAuthToken();
    // if (token) {
    //   headers['Authorization'] = `Bearer ${token}`;
    // }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async analyzeIdea(data: AnalyzeIdeaRequest): Promise<AnalyzeIdeaResponse> {
    return this.request<AnalyzeIdeaResponse>('/api/v1/ideas/analyze', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getIdeas(projectId?: number): Promise<Idea[]> {
    const params = projectId ? `?project_id=${projectId}` : '';
    return this.request<Idea[]>(`/api/v1/ideas${params}`);
  }

  async getIdea(ideaId: number): Promise<Idea> {
    return this.request<Idea>(`/api/v1/ideas/${ideaId}`);
  }

  async getProjects(): Promise<Project[]> {
    return this.request<Project[]>('/api/v1/projects');
  }

  async getProject(projectId: number): Promise<Project> {
    return this.request<Project>(`/api/v1/projects/${projectId}`);
  }

  async createProject(data: ProjectCreateRequest): Promise<Project> {
    return this.request<Project>('/api/v1/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async generateProjectDetails(data: GenerateProjectDetailsRequest): Promise<ProjectDetailsResponse> {
    return this.request<ProjectDetailsResponse>('/api/v1/projects/generate-details', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async healthCheck(): Promise<{ status: string; message: string }> {
    return this.request<{ status: string; message: string }>('/health');
  }

  async tikiTakaConversation(data: TikiTakaRequest): Promise<TikiTakaResponse> {
    return this.request<TikiTakaResponse>('/api/v1/ideas/tiki-taka', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async synthesizeSpeech(data: TTSRequest): Promise<TTSResponse> {
    return this.request<TTSResponse>('/api/v1/tts/synthesize', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getSpeechAudio(text: string, inferenceSteps: number = 2, styleId: number = 0): Promise<Blob> {
    const encodedText = encodeURIComponent(text);
    const url = `${this.baseUrl}/api/v1/tts/audio/${encodedText}?inference_steps=${inferenceSteps}&style_id=${styleId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || errorData.message || `HTTP error! status: ${response.status}`
      );
    }

    return await response.blob();
  }

  async generateSurveyPosts(data: GenerateSurveyPostsRequest): Promise<GenerateSurveyPostsResponse> {
    return this.request<GenerateSurveyPostsResponse>('/api/v1/ideas/generate-survey-posts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const apiService = new ApiService();

