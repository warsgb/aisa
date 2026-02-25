// User and Authentication Types
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'SYSTEM_ADMIN' | 'ADMIN' | 'MEMBER';
}

export interface AuthResponse {
  user: User;
  team?: TeamBasic;
  access_token: string;
  refresh_token: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  full_name: string;
  team_name: string;
}

// Team Types
export interface Team {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  role: TeamRole;
  created_at: string;
  members?: TeamMember[];
  default_member_role?: IronTriangleRole | null;
  role_skill_configs?: TeamRoleSkillConfig[];
}

export interface InviteMemberData {
  email: string;
  full_name?: string;
  role: 'MEMBER' | 'ADMIN';
  password?: string;
}

export interface TeamBasic {
  id: string;
  name: string;
}

export type TeamRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export interface TeamMember {
  id: string;
  email: string;
  full_name: string;
  role: TeamRole;
  joined_at: string;
}

// Customer Types
export interface Customer {
  id: string;
  team_id: string;
  name: string;
  industry?: string;
  company_size?: string;
  description?: string;
  contact_info?: {
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
  };
  metadata?: Record<string, any>;
  ltc_context?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Skill Types
export interface Skill {
  id: string;
  slug: string;
  name: string;
  description: string;
  category?: string;
  usage_hint?: string;
  parameters?: SkillParameter[];
  system_prompt: string;
  supports_streaming: boolean;
  supports_multi_turn: boolean;
  iron_triangle_role?: 'AR' | 'SR' | 'FR' | null;
  // 文件管理字段
  source?: 'file' | 'database';
  file_path?: string | null;
  is_enabled?: boolean;
  last_synced_at?: string | null;
}

export interface SkillParameterOption {
  label: string;
  value: string;
}

export interface SkillParameter {
  name: string;
  type: string;
  label: string;
  required: boolean;
  default?: any;
  options?: (string | SkillParameterOption)[];
  placeholder?: string;
  description?: string;
}

// Interaction Types
export type InteractionStatus = 'PENDING' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface SkillInteraction {
  id: string;
  team_id: string;
  customer_id?: string;
  skill_id: string;
  user_id: string;
  status: InteractionStatus;
  parameters?: Record<string, any>;
  title?: string;
  summary?: string;
  context?: Record<string, any>;
  node_id?: string;
  reference_document_id?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  skill?: Skill;
  customer?: Customer;
  messages?: InteractionMessage[];
}

export type MessageRole = 'SYSTEM' | 'USER' | 'ASSISTANT';

export interface InteractionMessage {
  id: string;
  interaction_id: string;
  role: MessageRole;
  content: string;
  turn: number;
  metadata?: {
    token_count?: number;
    model?: string;
    finish_reason?: string;
  };
  created_at: string;
}

// Document Types
export interface Document {
  id: string;
  team_id: string;
  customer_id?: string;
  interaction_id?: string;
  title: string;
  content: string;
  format: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  versions?: DocumentVersion[];
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  content: string;
  created_by: string;
  change_description?: string;
  created_at: string;
}

// Reference Material Types
export type MaterialType = 'PDF' | 'DOCX' | 'TXT' | 'MD' | 'OTHER';

export interface ReferenceMaterial {
  id: string;
  team_id: string;
  customer_id?: string;
  filename: string;
  original_filename: string;
  file_size: number;
  file_type: MaterialType;
  file_path: string;
  extracted_text?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  customer?: Customer;
}

// Shared Framework Types
export interface SharedFramework {
  id: string;
  team_id?: string;
  slug: string;
  name: string;
  description?: string;
  content: string;
  scope: 'global' | 'team';
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// WebSocket Events
export interface SkillExecutionStart {
  interactionId: string;
}

export interface ResponseChunk {
  chunk: string;
}

export interface ResponseComplete {
  interactionId: string;
  documentId?: string;
  content: string;
}

export interface ResponseError {
  message: string;
}

// Form Types
export interface CreateTeamDto {
  name: string;
  description?: string;
  logo_url?: string;
}

export interface CreateCustomerDto {
  name: string;
  industry?: string;
  company_size?: string;
  description?: string;
  contact_info?: {
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
  };
  metadata?: Record<string, any>;
}

export interface ExecuteSkillDto {
  skillId: string;
  teamId: string;
  customerId?: string;
  parameters?: Record<string, any>;
  message?: string;
  interactionId?: string;
}

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// System Admin Types
export interface SystemUser {
  id: string;
  email: string;
  full_name: string;
  role: 'SYSTEM_ADMIN' | 'ADMIN' | 'MEMBER';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  teams: Array<{
    id: string;
    name: string;
    role: 'OWNER' | 'ADMIN' | 'MEMBER';
  }>;
}

export interface SystemTeam {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
  member_count: number;
  owner: {
    id: string;
    email: string;
    full_name: string;
  } | null;
}

export interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalTeams: number;
  totalTeamMembers: number;
}

export interface DashboardStats {
  overview: {
    userCount: number;
    teamCount: number;
    customerCount: number;
    interactionCount: number;
  };
  topCustomers: Array<{
    customerId: string;
    customerName: string;
    interactionCount: number;
  }>;
  topTeams: Array<{
    teamId: string;
    teamName: string;
    interactionCount: number;
  }>;
  recentInteractions: SkillInteraction[];
}

export interface UpdateUserStatusDto {
  is_active: boolean;
}

export interface ResetPasswordDto {
  new_password: string;
}

// Create System User/Team DTOs
export interface CreateSystemUserDto {
  email: string;
  full_name: string;
  password: string;
  role?: 'SYSTEM_ADMIN' | 'ADMIN' | 'MEMBER';
  is_active?: boolean;
}

export interface CreateSystemTeamDto {
  name: string;
  description?: string;
  logo_url?: string;
  owner_id: string;
}

// Team Application Types
export interface TeamApplication {
  id: string;
  name: string;
  description?: string;
  status: 'pending' | 'approved' | 'rejected';
  user?: {
    id: string;
    email: string;
    full_name: string;
  };
  reviewer?: {
    id: string;
    full_name: string;
  } | null;
  reviewed_at?: string;
  rejection_reason?: string;
  created_at: string;
}

export interface SubmitTeamApplicationDto {
  name: string;
  description?: string;
}

export interface ReviewTeamApplicationDto {
  status: 'approved' | 'rejected';
  rejectionReason?: string;
}

// LTC (Lead To Cash) Types
export interface LtcNode {
  id: string;
  team_id: string;
  name: string;
  order: number;
  description?: string;
  created_at: string;
  updated_at: string;
  source?: 'SYSTEM' | 'CUSTOM';
  system_node_id?: string;
  skills?: Skill[];
}

export interface NodeSkillBinding {
  id: string;
  node_id: string;
  skill_id: string;
  order: number;
  skill?: Skill;
}

export interface CustomerProfile {
  id: string;
  customer_id: string;
  background_info?: string;
  decision_chain?: string;
  history_notes?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Iron Triangle Role: AR (Account Representative), SR (Solution Representative), FR (Fulfillment Representative)
export type IronTriangleRole = 'AR' | 'SR' | 'FR';

export interface TeamMemberPreference {
  id: string;
  team_member_id: string;
  iron_triangle_role?: IronTriangleRole;
  favorite_skill_ids: string[];
  created_at: string;
  updated_at: string;
}

// Extended Customer with LTC context
export interface CustomerWithLtc extends Customer {
  ltc_context?: Record<string, any>;
  profile?: CustomerProfile;
}

// Extended SkillInteraction with node_id
export interface SkillInteractionWithNode extends SkillInteraction {
  node_id?: string;
}

// Home Page Data
export interface HomePageData {
  customers: Customer[];
  ltcNodes: LtcNode[];
  favoriteSkills: Skill[];
  recentInteractions: SkillInteraction[];
}

// LTC DTOs
export interface CreateLtcNodeDto {
  name: string;
  description?: string;
  order?: number;
}

export interface UpdateLtcNodeDto {
  name?: string;
  description?: string;
  order?: number;
}

export interface ReorderLtcNodesDto {
  node_ids: string[];
}

export interface CreateNodeSkillBindingDto {
  skill_id: string;
  order?: number;
}

export interface UpdateCustomerProfileDto {
  background_info?: string;
  decision_chain?: string;
  history_notes?: string;
  metadata?: Record<string, any>;
}

export interface UpdateTeamMemberPreferenceDto {
  iron_triangle_role?: IronTriangleRole;
  favorite_skill_ids?: string[];
}

// Skill Filter Type
export type SkillFilterType = 'FAVORITE' | 'ALL';

// Team Role Skill Config
export interface TeamRoleSkillConfig {
  id: string;
  team_id: string;
  role: IronTriangleRole;
  default_skill_ids: string[];
  created_at: string;
  updated_at: string;
  source?: 'SYSTEM' | 'CUSTOM';
}

// System-Level Configuration Types
export interface SystemLtcNode {
  id: string;
  name: string;
  description: string | null;
  order: number;
  default_skill_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface SystemRoleSkillConfig {
  id: string;
  role: IronTriangleRole;
  default_skill_ids: string[];
  created_at: string;
  updated_at: string;
}

// Sync Result Types
export interface TeamSyncChanges {
  hasChanges: boolean;
  changes: {
    ltcNodes: { added: number; updated: number; skipped: number };
    roleConfigs: { updated: number; skipped: number };
  };
}

export interface SyncResult {
  success: number;
  skipped: number;
  errors: number;
  details: Array<{
    teamId: string;
    teamName?: string;
    changes?: TeamSyncChanges;
    error?: string;
  }>;
}
