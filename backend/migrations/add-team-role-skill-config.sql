-- Migration: Add team role skill configuration feature
-- Description: Add support for team-level role-to-skill default mappings

-- Create team_role_skill_configs table
CREATE TABLE IF NOT EXISTS team_role_skill_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  role VARCHAR(10) NOT NULL CHECK (role IN ('AR', 'SR', 'FR')),
  default_skill_ids JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(team_id, role)
);

-- Add default_member_role column to teams table
ALTER TABLE teams ADD COLUMN IF NOT EXISTS default_member_role VARCHAR(10)
  CHECK (default_member_role IN ('AR', 'SR', 'FR'))
  NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_team_role_skill_configs_team ON team_role_skill_configs(team_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_team_role_skill_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_team_role_skill_configs_updated_at ON team_role_skill_configs;
CREATE TRIGGER update_team_role_skill_configs_updated_at
  BEFORE UPDATE ON team_role_skill_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_team_role_skill_configs_updated_at();
