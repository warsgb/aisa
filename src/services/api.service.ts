import type {
  AuthResponse,
  LoginDto,
  RegisterDto,
  Team,
  Customer,
  Skill,
  SkillInteraction,
  Document,
  ReferenceMaterial,
  SharedFramework,
  CreateTeamDto,
  CreateCustomerDto,
  User,
  TeamMember,
} from '../types';

// Support relative paths for same-origin deployment, fallback to localhost
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Safe localStorage wrapper to handle cases where localStorage is unavailable
const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('localStorage not available:', e);
      return null;
    }
  },
  setItem: (key: string, value: string): boolean => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.warn('localStorage not available:', e);
      return false;
    }
  },
  removeItem: (key: string): boolean => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.warn('localStorage not available:', e);
      return false;
    }
  },
};

class ApiService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    // Load tokens from localStorage on init
    this.accessToken = safeStorage.getItem('access_token');
    this.refreshToken = safeStorage.getItem('refresh_token');
  }

  setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    safeStorage.setItem('access_token', accessToken);
    safeStorage.setItem('refresh_token', refreshToken);
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    safeStorage.removeItem('access_token');
    safeStorage.removeItem('refresh_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    let response = await fetch(url, { ...options, headers });

    // Try to refresh token if unauthorized
    if (response.status === 401 && this.refreshToken) {
      try {
        const refreshData = await this.refreshAccessToken();
        if (refreshData.access_token) {
          this.setTokens(refreshData.access_token, refreshData.refresh_token);
          headers['Authorization'] = `Bearer ${refreshData.access_token}`;
          response = await fetch(url, { ...options, headers });
        }
      } catch {
        this.clearTokens();
        window.location.href = '/login';
        throw new Error('Session expired');
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  // Auth endpoints
  async login(data: LoginDto): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (response.access_token) {
      this.setTokens(response.access_token, response.refresh_token);
    }
    return response;
  }

  async register(data: RegisterDto): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (response.access_token) {
      this.setTokens(response.access_token, response.refresh_token);
    }
    return response;
  }

  private async refreshAccessToken(): Promise<{ access_token: string; refresh_token: string }> {
    return this.request<{ access_token: string; refresh_token: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: this.refreshToken }),
    });
  }

  logout() {
    this.clearTokens();
    window.location.href = '/login';
  }

  async getMe(): Promise<{ user: User; team: Team | null }> {
    return this.request<{ user: User; team: Team | null }>('/auth/me');
  }

  // Teams endpoints
  async getTeams(): Promise<Team[]> {
    return this.request<Team[]>('/teams');
  }

  async getTeam(id: string): Promise<Team> {
    return this.request<Team>(`/teams/${id}`);
  }

  async createTeam(data: CreateTeamDto): Promise<Team> {
    return this.request<Team>('/teams', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTeam(id: string, data: Partial<CreateTeamDto>): Promise<Team> {
    return this.request<Team>(`/teams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTeam(id: string): Promise<void> {
    return this.request<void>(`/teams/${id}`, { method: 'DELETE' });
  }

  // Team Members endpoints
  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    return this.request<TeamMember[]>(`/teams/${teamId}/members`);
  }

  async createTeamMember(teamId: string, data: InviteMemberData): Promise<TeamMember> {
    return this.request<TeamMember>(`/teams/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTeamMember(teamId: string, memberId: string, data: { role: 'MEMBER' | 'ADMIN' }): Promise<TeamMember> {
    return this.request<TeamMember>(`/teams/${teamId}/members/${memberId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async removeTeamMember(teamId: string, memberId: string): Promise<void> {
    return this.request<void>(`/teams/${teamId}/members/${memberId}`, { method: 'DELETE' });
  }

  // Customers endpoints
  async getCustomers(teamId: string, customerId?: string): Promise<Customer[]> {
    const params = customerId ? `?customerId=${customerId}` : '';
    return this.request<Customer[]>(`/teams/${teamId}/customers${params}`);
  }

  async getCustomer(teamId: string, id: string): Promise<Customer> {
    return this.request<Customer>(`/teams/${teamId}/customers/${id}`);
  }

  async createCustomer(teamId: string, data: CreateCustomerDto): Promise<Customer> {
    return this.request<Customer>(`/teams/${teamId}/customers`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCustomer(teamId: string, id: string, data: Partial<CreateCustomerDto>): Promise<Customer> {
    return this.request<Customer>(`/teams/${teamId}/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCustomer(teamId: string, id: string): Promise<void> {
    return this.request<void>(`/teams/${teamId}/customers/${id}`, { method: 'DELETE' });
  }

  // Skills endpoints
  async getSkills(): Promise<Skill[]> {
    return this.request<Skill[]>('/skills');
  }

  async getSkill(id: string): Promise<Skill> {
    return this.request<Skill>(`/skills/${id}`);
  }

  async syncSkills(): Promise<void> {
    return this.request<void>('/skills/sync', { method: 'POST' });
  }

  // Interactions endpoints
  async getInteractions(teamId: string, filters?: { customerId?: string; skillId?: string }): Promise<SkillInteraction[]> {
    const params = new URLSearchParams();
    if (filters?.customerId) params.append('customerId', filters.customerId);
    if (filters?.skillId) params.append('skillId', filters.skillId);
    const queryString = params.toString();
    return this.request<SkillInteraction[]>(`/teams/${teamId}/interactions${queryString ? `?${queryString}` : ''}`);
  }

  async getInteraction(teamId: string, id: string): Promise<SkillInteraction> {
    return this.request<SkillInteraction>(`/teams/${teamId}/interactions/${id}`);
  }

  async getInteractionMessages(teamId: string, id: string): Promise<any[]> {
    return this.request<any[]>(`/teams/${teamId}/interactions/${id}/messages`);
  }

  // Documents endpoints
  async getDocuments(teamId: string, customerId?: string): Promise<Document[]> {
    const params = customerId ? `?customerId=${customerId}` : '';
    return this.request<Document[]>(`/teams/${teamId}/documents${params}`);
  }

  async getDocument(teamId: string, id: string): Promise<Document> {
    return this.request<Document>(`/teams/${teamId}/documents/${id}`);
  }

  async createDocument(teamId: string, data: { title: string; content: string; format?: string }): Promise<Document> {
    return this.request<Document>(`/teams/${teamId}/documents`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDocument(teamId: string, id: string, data: { title?: string; content?: string; change_description?: string }): Promise<Document> {
    return this.request<Document>(`/teams/${teamId}/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteDocument(teamId: string, id: string): Promise<void> {
    return this.request<void>(`/teams/${teamId}/documents/${id}`, { method: 'DELETE' });
  }

  async getDocumentVersions(teamId: string, id: string): Promise<any[]> {
    return this.request<any[]>(`/teams/${teamId}/documents/${id}/versions`);
  }

  // Reference materials endpoints
  async getReferenceMaterials(teamId: string, customerId?: string): Promise<ReferenceMaterial[]> {
    const params = customerId ? `?customerId=${customerId}` : '';
    return this.request<ReferenceMaterial[]>(`/teams/${teamId}/references${params}`);
  }

  async uploadReferenceMaterial(teamId: string, customerId: string | undefined, file: File): Promise<ReferenceMaterial> {
    const formData = new FormData();
    formData.append('file', file);
    if (customerId) formData.append('customerId', customerId);

    const url = `${API_BASE_URL}/teams/${teamId}/references/upload`;

    const headers: Record<string, string> = {};
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(error.message || 'Upload failed');
    }

    return response.json();
  }

  async deleteReferenceMaterial(teamId: string, id: string): Promise<void> {
    return this.request<void>(`/teams/${teamId}/references/${id}`, { method: 'DELETE' });
  }

  // Frameworks endpoints
  async getFrameworks(): Promise<SharedFramework[]> {
    return this.request<SharedFramework[]>('/frameworks');
  }

  async getFramework(slug: string): Promise<SharedFramework> {
    return this.request<SharedFramework>(`/frameworks/${slug}`);
  }

  async createFramework(data: { slug: string; name: string; description?: string; content: string }): Promise<SharedFramework> {
    return this.request<SharedFramework>('/frameworks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateFramework(id: string, data: Partial<SharedFramework>): Promise<SharedFramework> {
    return this.request<SharedFramework>(`/frameworks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteFramework(id: string): Promise<void> {
    return this.request<void>(`/frameworks/${id}`, { method: 'DELETE' });
  }
}

export const apiService = new ApiService();
