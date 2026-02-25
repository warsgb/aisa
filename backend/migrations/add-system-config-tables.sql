-- Migration: Add system-level LTC and role-skill configuration tables
-- This migration creates the infrastructure for system-wide default configurations

-- System-level LTC node template table
CREATE TABLE IF NOT EXISTS system_ltc_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  "order" INT NOT NULL,
  default_skill_ids JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- System-level role skill configuration table
CREATE TABLE IF NOT EXISTS system_role_skill_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role VARCHAR(10) NOT NULL CHECK (role IN ('AR', 'SR', 'FR')) UNIQUE,
  default_skill_ids JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Extend ltc_nodes table with source tracking
ALTER TABLE ltc_nodes
  ADD COLUMN IF NOT EXISTS source VARCHAR(10) DEFAULT 'CUSTOM'
  CHECK (source IN ('SYSTEM', 'CUSTOM'));

ALTER TABLE ltc_nodes
  ADD COLUMN IF NOT EXISTS system_node_id UUID;

-- Extend team_role_skill_configs table with source tracking
ALTER TABLE team_role_skill_configs
  ADD COLUMN IF NOT EXISTS source VARCHAR(10) DEFAULT 'CUSTOM'
  CHECK (source IN ('SYSTEM', 'CUSTOM'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ltc_nodes_source ON ltc_nodes(source);
CREATE INDEX IF NOT EXISTS idx_ltc_nodes_system_node_id ON ltc_nodes(system_node_id);
CREATE INDEX IF NOT EXISTS idx_team_role_skill_configs_source ON team_role_skill_configs(source);
CREATE INDEX IF NOT EXISTS idx_system_ltc_nodes_order ON system_ltc_nodes("order");

-- Add comments for documentation
COMMENT ON TABLE system_ltc_nodes IS 'System-level default LTC node templates';
COMMENT ON TABLE system_role_skill_configs IS 'System-level default role-skill mappings';
COMMENT ON COLUMN ltc_nodes.source IS 'Indicates if node is from system template or team-customized';
COMMENT ON COLUMN ltc_nodes.system_node_id IS 'References the system template node if source is SYSTEM';
COMMENT ON COLUMN team_role_skill_configs.source IS 'Indicates if config is from system template or team-customized';
