import type {
  AuthResponse,
  LoginDto,
  RegisterDto,
  Team,
  Customer,
  Skill,
  SkillParameter,
  SkillInteraction,
  Document,
  ReferenceMaterial,
  SharedFramework,
  CreateTeamDto,
  CreateCustomerDto,
  User,
  TeamMember,
  InviteMemberData,
  SystemUser,
  SystemTeam,
  SystemStats,
  PaginatedResponse,
  UpdateUserStatusDto,
  ResetPasswordDto,
  CreateSystemUserDto,
  CreateSystemTeamDto,
  TeamApplication,
  SubmitTeamApplicationDto,
  ReviewTeamApplicationDto,
  LtcNode,
  NodeSkillBinding,
  CustomerProfile,
  TeamMemberPreference,
  CreateLtcNodeDto,
  UpdateLtcNodeDto,
  ReorderLtcNodesDto,
  CreateNodeSkillBindingDto,
  UpdateCustomerProfileDto,
  UpdateTeamMemberPreferenceDto,
  HomePageData,
  TeamRoleSkillConfig,
  IronTriangleRole,
  SystemLtcNode,
  SystemRoleSkillConfig,
  SyncResult,
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

    // Always get the latest token from localStorage
    const token = safeStorage.getItem('access_token');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response = await fetch(url, { ...options, headers });

    // Try to refresh token if unauthorized
    const refreshToken = safeStorage.getItem('refresh_token');
    if (response.status === 401 && refreshToken) {
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

  async getUserById(userId: string): Promise<{ user: User; teams: Array<{ id: string; name: string; role: string }> }> {
    return this.request<{ user: User; teams: Array<{ id: string; name: string; role: string }> }>(`/system/users/${userId}`);
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

  async updateTeamMemberPassword(teamId: string, memberId: string, password: string): Promise<void> {
    return this.request<void>(`/teams/${teamId}/members/${memberId}/password`, {
      method: 'PUT',
      body: JSON.stringify({ password }),
    });
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
  async getSkills(includeDisabled: boolean = true): Promise<Skill[]> {
    return this.request<Skill[]>(`/skills?includeDisabled=${includeDisabled}`);
  }

  async getSkill(id: string): Promise<Skill> {
    return this.request<Skill>(`/skills/${id}`);
  }

  async updateSkill(id: string, data: Partial<Skill>): Promise<Skill> {
    return this.request<Skill>(`/skills/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async syncSkills(): Promise<void> {
    return this.request<void>('/skills/sync', { method: 'POST' });
  }

  async getSkillContent(id: string): Promise<{ content: string; filePath: string }> {
    return this.request<{ content: string; filePath: string }>(`/skills/${id}/content`);
  }

  async toggleSkill(id: string): Promise<Skill> {
    return this.request<Skill>(`/skills/${id}/toggle`, { method: 'PUT' });
  }

  async deleteSkill(id: string): Promise<void> {
    return this.request<void>(`/skills/${id}`, { method: 'DELETE' });
  }

  async importSkill(data: { content: string; originalName: string; targetFolder?: string }): Promise<Skill> {
    return this.request<Skill>('/skills/import', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createSkill(data: {
    slug: string;
    name: string;
    description: string;
    category?: string;
    usage_hint?: string;
    parameters?: SkillParameter[];
    supports_multi_turn?: boolean;
    role?: string;
    system_prompt: string;
  }): Promise<Skill> {
    return this.request<Skill>('/skills', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Get skill files (for multi-file skills)
  async getSkillFiles(id: string): Promise<any[]> {
    return this.request<any[]>(`/skills/${id}/files`);
  }

  // Get skill file content
  async getSkillFileContent(id: string, filePath: string): Promise<{ content: string }> {
    return this.request<{ content: string }>(`/skills/${id}/files/content?path=${encodeURIComponent(filePath)}`);
  }

  // Update skill file content
  async updateSkillFile(id: string, filePath: string, content: string): Promise<void> {
    return this.request<void>(`/skills/${id}/files/content`, {
      method: 'PUT',
      body: JSON.stringify({ path: filePath, content }),
    });
  }

  // Update skill parameter labels in SKILL.md
  async updateSkillParameterLabels(id: string, parameters: any[]): Promise<void> {
    return this.request<void>(`/skills/${id}/parameter-labels`, {
      method: 'PUT',
      body: JSON.stringify({ parameters }),
    });
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

  async updateInteractionMessage(
    teamId: string,
    interactionId: string,
    messageId: string,
    data: { content: string }
  ): Promise<void> {
    return this.request<void>(`/teams/${teamId}/interactions/${interactionId}/messages/${messageId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
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

  // System Admin endpoints
  async getAllSystemUsers(page: number = 1, pageSize: number = 20, search?: string): Promise<PaginatedResponse<SystemUser>> {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    });
    if (search) params.append('search', search);
    return this.request<PaginatedResponse<SystemUser>>(`/system/users?${params.toString()}`);
  }

  async getSystemUser(id: string): Promise<SystemUser> {
    return this.request<SystemUser>(`/system/users/${id}`);
  }

  async updateUserStatus(id: string, dto: UpdateUserStatusDto): Promise<SystemUser> {
    return this.request<SystemUser>(`/system/users/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
  }

  async resetUserPassword(id: string, dto: ResetPasswordDto): Promise<{ id: string; email: string; message: string }> {
    return this.request<{ id: string; email: string; message: string }>(`/system/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async getAllSystemTeams(page: number = 1, pageSize: number = 20, search?: string): Promise<PaginatedResponse<SystemTeam>> {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    });
    if (search) params.append('search', search);
    return this.request<PaginatedResponse<SystemTeam>>(`/system/teams?${params.toString()}`);
  }

  async getSystemTeamMembers(teamId: string): Promise<TeamMember[]> {
    return this.request<TeamMember[]>(`/system/teams/${teamId}/members`);
  }

  async deleteSystemTeam(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/system/teams/${id}`, { method: 'DELETE' });
  }

  async changeTeamOwner(teamId: string, dto: { owner_id: string }): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/system/teams/${teamId}/owner`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  }

  async getSystemStats(): Promise<SystemStats> {
    return this.request<SystemStats>('/system/stats');
  }

  // System admin - get all data across teams
  async getSystemCustomers(page: number = 1, pageSize: number = 100, search?: string): Promise<PaginatedResponse<Customer>> {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search) params.append('search', search);
    return this.request<PaginatedResponse<Customer>>(`/system/customers?${params}`);
  }

  async getSystemSkills(page: number = 1, pageSize: number = 100, search?: string): Promise<PaginatedResponse<Skill>> {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search) params.append('search', search);
    return this.request<PaginatedResponse<Skill>>(`/system/skills?${params}`);
  }

  async getSystemInteractions(page: number = 1, pageSize: number = 100, search?: string): Promise<PaginatedResponse<SkillInteraction>> {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search) params.append('search', search);
    return this.request<PaginatedResponse<SkillInteraction>>(`/system/interactions?${params}`);
  }

  async getSystemDocuments(page: number = 1, pageSize: number = 100, search?: string): Promise<PaginatedResponse<Document>> {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search) params.append('search', search);
    return this.request<PaginatedResponse<Document>>(`/system/documents?${params}`);
  }

  // Create user by system admin
  async createSystemUser(dto: CreateSystemUserDto): Promise<SystemUser> {
    return this.request<SystemUser>('/system/users', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  // Create team by system admin
  async createSystemTeam(dto: CreateSystemTeamDto): Promise<SystemTeam> {
    return this.request<SystemTeam>('/system/teams', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  // Update user teams
  async updateUserTeams(userId: string, dto: { team_ids: string[] }): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/system/users/${userId}/teams`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
  }

  // Switch current team
  async switchTeam(teamId: string): Promise<{ access_token: string; refresh_token: string }> {
    return this.request<{ access_token: string; refresh_token: string }>('/auth/switch-team', {
      method: 'POST',
      body: JSON.stringify({ team_id: teamId }),
    });
  }

  // Team applications
  async submitTeamApplication(dto: SubmitTeamApplicationDto): Promise<TeamApplication> {
    return this.request<TeamApplication>('/system/team-applications', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async getMyTeamApplications(): Promise<TeamApplication[]> {
    return this.request<TeamApplication[]>('/system/team-applications/my');
  }

  async getSystemTeamApplications(
    page: number = 1,
    pageSize: number = 20,
    status?: string
  ): Promise<PaginatedResponse<TeamApplication>> {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    });
    if (status) params.append('status', status);
    return this.request<PaginatedResponse<TeamApplication>>(`/system/team-applications?${params.toString()}`);
  }

  async reviewTeamApplication(
    id: string,
    dto: ReviewTeamApplicationDto
  ): Promise<{ id: string; status: string; team: { id: string; name: string } | null }> {
    return this.request<{ id: string; status: string; team: { id: string; name: string } | null }>(
      `/system/team-applications/${id}/review`,
      {
        method: 'PUT',
        body: JSON.stringify(dto),
      }
    );
  }

  // ========== LTC (Lead To Cash) API ==========

  // LTC Nodes
  async getLtcNodes(teamId: string): Promise<LtcNode[]> {
    return this.request<LtcNode[]>(`/teams/${teamId}/ltc-nodes`);
  }

  async createLtcNode(teamId: string, data: CreateLtcNodeDto): Promise<LtcNode> {
    return this.request<LtcNode>(`/teams/${teamId}/ltc-nodes`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateLtcNode(teamId: string, id: string, data: UpdateLtcNodeDto): Promise<LtcNode> {
    return this.request<LtcNode>(`/teams/${teamId}/ltc-nodes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteLtcNode(teamId: string, id: string): Promise<void> {
    return this.request<void>(`/teams/${teamId}/ltc-nodes/${id}`, { method: 'DELETE' });
  }

  async reorderLtcNodes(teamId: string, data: ReorderLtcNodesDto): Promise<LtcNode[]> {
    return this.request<LtcNode[]>(`/teams/${teamId}/ltc-nodes/reorder`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async resetLtcNodes(teamId: string): Promise<LtcNode[]> {
    return this.request<LtcNode[]>(`/teams/${teamId}/ltc-nodes/reset`, {
      method: 'POST',
    });
  }

  // Node-Skill Bindings
  async getNodeSkillBindings(teamId: string, nodeId: string): Promise<NodeSkillBinding[]> {
    return this.request<NodeSkillBinding[]>(`/teams/${teamId}/ltc-nodes/${nodeId}/bindings`);
  }

  async createNodeSkillBinding(
    teamId: string,
    nodeId: string,
    data: CreateNodeSkillBindingDto
  ): Promise<NodeSkillBinding> {
    return this.request<NodeSkillBinding>(`/teams/${teamId}/ltc-nodes/${nodeId}/bindings`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteNodeSkillBinding(teamId: string, nodeId: string, bindingId: string): Promise<void> {
    return this.request<void>(`/teams/${teamId}/ltc-nodes/${nodeId}/bindings/${bindingId}`, {
      method: 'DELETE',
    });
  }

  // Customer Profile
  async getCustomerProfile(teamId: string, customerId: string): Promise<CustomerProfile> {
    return this.request<CustomerProfile>(`/teams/${teamId}/customers/${customerId}/profile`);
  }

  async updateCustomerProfile(
    teamId: string,
    customerId: string,
    data: UpdateCustomerProfileDto
  ): Promise<CustomerProfile> {
    return this.request<CustomerProfile>(`/teams/${teamId}/customers/${customerId}/profile`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Team Member Preference (Iron Triangle Role)
  async getTeamMemberPreference(teamId: string, memberId: string): Promise<TeamMemberPreference> {
    return this.request<TeamMemberPreference>(`/teams/${teamId}/members/${memberId}/preference`);
  }

  async updateTeamMemberPreference(
    teamId: string,
    memberId: string,
    data: UpdateTeamMemberPreferenceDto
  ): Promise<TeamMemberPreference> {
    return this.request<TeamMemberPreference>(`/teams/${teamId}/members/${memberId}/preference`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Home Page Data
  async getHomePageData(teamId: string): Promise<HomePageData> {
    return this.request<HomePageData>(`/teams/${teamId}/home`);
  }

  // ========== Team Role Skill Configuration API ==========

  // Get all role skill configurations for a team
  async getTeamRoleSkillConfigs(teamId: string): Promise<TeamRoleSkillConfig[]> {
    return this.request<TeamRoleSkillConfig[]>(`/teams/${teamId}/role-skill-configs`);
  }

  // Get a specific role's skill configuration
  async getTeamRoleSkillConfig(teamId: string, role: IronTriangleRole): Promise<TeamRoleSkillConfig> {
    return this.request<TeamRoleSkillConfig>(`/teams/${teamId}/role-skill-configs/${role}`);
  }

  // Update a role's default skill list
  async updateTeamRoleSkillConfig(
    teamId: string,
    role: IronTriangleRole,
    skillIds: string[]
  ): Promise<TeamRoleSkillConfig> {
    return this.request<TeamRoleSkillConfig>(`/teams/${teamId}/role-skill-configs/${role}`, {
      method: 'PUT',
      body: JSON.stringify({ skill_ids: skillIds }),
    });
  }

  // Get team's default member role
  async getTeamDefaultRole(teamId: string): Promise<{ default_role: IronTriangleRole | null }> {
    return this.request<{ default_role: IronTriangleRole | null }>(`/teams/${teamId}/default-role`);
  }

  // Set team's default member role
  async setTeamDefaultRole(teamId: string, role: IronTriangleRole): Promise<Team> {
    return this.request<Team>(`/teams/${teamId}/default-role`, {
      method: 'PUT',
      body: JSON.stringify({ default_role: role }),
    });
  }

  // ========== System-Level Configuration API (Admin Only) ==========

  // System LTC Nodes
  async getSystemLtcNodes(): Promise<SystemLtcNode[]> {
    return this.request<SystemLtcNode[]>('/system/ltc-nodes');
  }

  async createSystemLtcNode(data: {
    name: string;
    description?: string;
    order?: number;
    default_skill_ids?: string[];
  }): Promise<SystemLtcNode> {
    return this.request<SystemLtcNode>('/system/ltc-nodes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSystemLtcNode(
    id: string,
    data: {
      name?: string;
      description?: string;
      order?: number;
      default_skill_ids?: string[];
    }
  ): Promise<SystemLtcNode> {
    return this.request<SystemLtcNode>(`/system/ltc-nodes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSystemLtcNode(id: string): Promise<void> {
    return this.request<void>(`/system/ltc-nodes/${id}`, { method: 'DELETE' });
  }

  async reorderSystemLtcNodes(nodes: Array<{ id: string; order: number }>): Promise<SystemLtcNode[]> {
    return this.request<SystemLtcNode[]>('/system/ltc-nodes/reorder', {
      method: 'PUT',
      body: JSON.stringify(nodes),
    });
  }

  // System Role Skill Configs
  async getSystemRoleSkillConfigs(): Promise<SystemRoleSkillConfig[]> {
    return this.request<SystemRoleSkillConfig[]>('/system/role-skill-configs');
  }

  async updateSystemRoleSkillConfig(
    role: IronTriangleRole,
    skillIds: string[]
  ): Promise<SystemRoleSkillConfig> {
    return this.request<SystemRoleSkillConfig>(`/system/role-skill-configs/${role}`, {
      method: 'PUT',
      body: JSON.stringify({ skill_ids: skillIds }),
    });
  }

  // Sync Operations
  async syncSystemToAllTeams(): Promise<SyncResult> {
    return this.request<SyncResult>('/system/sync-to-all-teams', {
      method: 'POST',
    });
  }

  // Reset Operations (Team Level)
  async resetTeamLtcNodes(teamId: string): Promise<LtcNode[]> {
    return this.request<LtcNode[]>(`/teams/${teamId}/ltc-nodes/reset`, {
      method: 'POST',
    });
  }

  async resetTeamRoleSkillConfigs(teamId: string): Promise<TeamRoleSkillConfig[]> {
    return this.request<TeamRoleSkillConfig[]>(`/teams/${teamId}/role-skill-configs/reset`, {
      method: 'POST',
    });
  }
}

export const apiService = new ApiService();
