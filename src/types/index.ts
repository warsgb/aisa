// User and Authentication Types
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'ADMIN' | 'MEMBER';
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
}

export interface SkillParameter {
  name: string;
  type: string;
  label: string;
  required: boolean;
  default?: any;
  options?: string[];
  placeholder?: string;
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
