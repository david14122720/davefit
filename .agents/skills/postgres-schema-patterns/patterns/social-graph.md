---
title: Social Graph (Follows)
category: relationships
complexity: medium
tags: follows, followers, social, connections
---

# Social Graph Pattern

**Use when:** Building social features like Twitter follows, Instagram connections, LinkedIn networks

## Schema

```sql
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)  -- Prevent self-follow
);

-- Indexes for fast lookups
CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);
```

## Row Level Security

```sql
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Anyone can see who follows whom
CREATE POLICY "Anyone can read follows" ON follows
  FOR SELECT USING (true);

-- Users can only create follows as themselves
CREATE POLICY "Users can follow others" ON follows
  FOR INSERT
  TO authenticated
  WITH CHECK (uid() = follower_id);

-- Users can only delete their own follows
CREATE POLICY "Users can unfollow" ON follows
  FOR DELETE
  TO authenticated
  USING (uid() = follower_id);
```

## SDK Usage

```javascript
// Get users I follow
const { data: following } = await client.database
  .from('follows')
  .select('following_id, created_at')
  .eq('follower_id', currentUserId);

// Get my followers
const { data: followers } = await client.database
  .from('follows')
  .select('follower_id, created_at')
  .eq('following_id', currentUserId);

// Get followers with profile info
const { data: followers } = await client.database
  .from('follows')
  .select('follower_id, follower:follower_id(id, profile)')
  .eq('following_id', currentUserId);

// Check if user1 follows user2
const { data } = await client.database
  .from('follows')
  .select('id')
  .eq('follower_id', user1Id)
  .eq('following_id', user2Id)
  .single();
const isFollowing = !!data;

// Follow a user
await client.database
  .from('follows')
  .insert([{ follower_id: currentUserId, following_id: targetUserId }]);

// Unfollow a user
await client.database
  .from('follows')
  .delete()
  .eq('follower_id', currentUserId)
  .eq('following_id', targetUserId);

// Get follower/following counts
const { count: followerCount } = await client.database
  .from('follows')
  .select('*', { count: 'exact', head: true })
  .eq('following_id', userId);

const { count: followingCount } = await client.database
  .from('follows')
  .select('*', { count: 'exact', head: true })
  .eq('follower_id', userId);
```

## Best Practices

### Indexing
- **Always index both foreign keys** - Queries go both directions (who do I follow, who follows me)
- The `UNIQUE(follower_id, following_id)` constraint creates a composite index automatically
- For large tables, consider a covering index if you frequently select `created_at`:
  ```sql
  CREATE INDEX idx_follows_follower_covering ON follows(follower_id) INCLUDE (following_id, created_at);
  ```

### Performance
- **Use `count: 'exact', head: true`** for counts - avoids fetching all rows
- **Avoid N+1 queries** - Use foreign key expansion (`follower:follower_id(...)`) instead of separate queries
- **Paginate large follower lists** - Use `.range(0, 49)` for pagination

### RLS Considerations
- `uid()` function is optimized and indexed by InsForge
- The SELECT policy uses `true` (public reads) - change to `auth.uid() IS NOT NULL` if follows should be private to authenticated users only
- INSERT/DELETE policies ensure users can only manage their own relationships

### Common Mistakes
- ❌ Forgetting the self-follow CHECK constraint
- ❌ Not indexing the `following_id` column (slow "who follows me" queries)
- ❌ Using `.single()` to check if following (throws error if not found) - use `!!data` pattern instead
