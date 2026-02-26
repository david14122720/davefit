---
title: Multi-Tenant (Organization Scoped)
category: architecture
complexity: advanced
tags: multi-tenant, saas, organizations, workspaces, teams
---

# Multi-Tenant Pattern

**Use when:** Building SaaS apps where data is scoped to organizations, workspaces, or teams

## Schema

```sql
-- Organizations/Workspaces
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization membership with roles
CREATE TABLE organization_members (
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (organization_id, user_id)
);

-- Example: Projects scoped to organization
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_projects_org ON projects(organization_id);
CREATE INDEX idx_organizations_slug ON organizations(slug);
```

## Row Level Security

```sql
-- Helper function: Check if user is member of org
CREATE OR REPLACE FUNCTION is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id AND user_id = uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper function: Check if user has role in org
CREATE OR REPLACE FUNCTION has_org_role(org_id UUID, allowed_roles TEXT[])
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id
    AND user_id = uid()
    AND role = ANY(allowed_roles)
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Organizations RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their orgs" ON organizations
  FOR SELECT
  TO authenticated
  USING (is_org_member(id));

CREATE POLICY "Anyone can create orgs" ON organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Owners can update org" ON organizations
  FOR UPDATE
  TO authenticated
  USING (has_org_role(id, ARRAY['owner']));

CREATE POLICY "Owners can delete org" ON organizations
  FOR DELETE
  TO authenticated
  USING (has_org_role(id, ARRAY['owner']));

-- Organization Members RLS
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org members" ON organization_members
  FOR SELECT
  TO authenticated
  USING (is_org_member(organization_id));

CREATE POLICY "Admins can add members" ON organization_members
  FOR INSERT
  TO authenticated
  WITH CHECK (has_org_role(organization_id, ARRAY['owner', 'admin']));

CREATE POLICY "Admins can remove members" ON organization_members
  FOR DELETE
  TO authenticated
  USING (
    has_org_role(organization_id, ARRAY['owner', 'admin'])
    OR user_id = uid()  -- Users can leave
  );

-- Projects RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org projects" ON projects
  FOR SELECT
  TO authenticated
  USING (is_org_member(organization_id));

CREATE POLICY "Admins can create projects" ON projects
  FOR INSERT
  TO authenticated
  WITH CHECK (has_org_role(organization_id, ARRAY['owner', 'admin']));

CREATE POLICY "Admins can update projects" ON projects
  FOR UPDATE
  TO authenticated
  USING (has_org_role(organization_id, ARRAY['owner', 'admin']));

CREATE POLICY "Admins can delete projects" ON projects
  FOR DELETE
  TO authenticated
  USING (has_org_role(organization_id, ARRAY['owner', 'admin']));
```

## Auto-Add Creator as Owner

```sql
-- Trigger to add creator as owner when org is created
CREATE OR REPLACE FUNCTION add_org_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (NEW.id, uid(), 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_org_created
AFTER INSERT ON organizations
FOR EACH ROW EXECUTE FUNCTION add_org_owner();
```

## SDK Usage

```javascript
// Create organization (creator auto-added as owner)
const { data: org } = await client.database
  .from('organizations')
  .insert([{ name: 'Acme Inc', slug: 'acme' }])
  .select()
  .single();

// Get user's organizations
const { data: memberships } = await client.database
  .from('organization_members')
  .select('role, organization:organization_id(*)')
  .eq('user_id', currentUserId);

// Get organization by slug
const { data: org } = await client.database
  .from('organizations')
  .select('*')
  .eq('slug', 'acme')
  .single();

// Get organization members
const { data: members } = await client.database
  .from('organization_members')
  .select('role, joined_at, user:user_id(id, profile)')
  .eq('organization_id', orgId)
  .order('joined_at', { ascending: true });

// Invite user to organization
const { error } = await client.database
  .from('organization_members')
  .insert([{
    organization_id: orgId,
    user_id: invitedUserId,
    role: 'member'
  }]);

// Update member role
await client.database
  .from('organization_members')
  .update({ role: 'admin' })
  .eq('organization_id', orgId)
  .eq('user_id', userId);

// Remove member
await client.database
  .from('organization_members')
  .delete()
  .eq('organization_id', orgId)
  .eq('user_id', userId);

// Leave organization
await client.database
  .from('organization_members')
  .delete()
  .eq('organization_id', orgId)
  .eq('user_id', currentUserId);

// Get projects for organization
const { data: projects } = await client.database
  .from('projects')
  .select('*')
  .eq('organization_id', orgId)
  .order('created_at', { ascending: false });

// Create project
await client.database
  .from('projects')
  .insert([{
    organization_id: orgId,
    name: 'New Project',
    created_by: currentUserId
  }]);

// Switch organization context (store in app state)
const [currentOrgId, setCurrentOrgId] = useState(null);

// All subsequent queries filter by currentOrgId
const { data: projects } = await client.database
  .from('projects')
  .select('*')
  .eq('organization_id', currentOrgId);
```

## Best Practices

### Indexing
- **Always index organization_id** on tenant-scoped tables - every query will filter by it
- **Index user_id on membership table** - for "my organizations" queries
- **Consider composite indexes** for common query patterns:
  ```sql
  CREATE INDEX idx_projects_org_created ON projects(organization_id, created_at DESC);
  ```

### Performance
- **Use SECURITY DEFINER functions** for role checks - avoids repeated subqueries
- **Cache membership in app state** - don't re-fetch on every request
- **Consider materialized roles** for complex permission systems

### RLS Performance Tips

```sql
-- Bad: Inline subquery (runs for every row)
CREATE POLICY "slow_policy" ON projects
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = uid()
    )
  );

-- Good: Function with SECURITY DEFINER (evaluated once)
CREATE POLICY "fast_policy" ON projects
  FOR SELECT USING (is_org_member(organization_id));
```

### Preventing Owner Lock-Out

```sql
-- Prevent removing last owner
CREATE OR REPLACE FUNCTION prevent_last_owner_removal()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.role = 'owner' THEN
    IF NOT EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = OLD.organization_id
      AND role = 'owner'
      AND user_id != OLD.user_id
    ) THEN
      RAISE EXCEPTION 'Cannot remove the last owner';
    END IF;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_last_owner
BEFORE DELETE ON organization_members
FOR EACH ROW EXECUTE FUNCTION prevent_last_owner_removal();
```

### Invitation System (Optional)

```sql
CREATE TABLE organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, email)
);
```

### Common Mistakes
- ❌ Not indexing `organization_id` on scoped tables → slow queries
- ❌ Inline RLS subqueries → use SECURITY DEFINER functions
- ❌ Forgetting to add creator as owner → orphaned organizations
- ❌ No protection against removing last owner → locked out orgs
- ❌ Checking permissions in app code instead of RLS → security holes
