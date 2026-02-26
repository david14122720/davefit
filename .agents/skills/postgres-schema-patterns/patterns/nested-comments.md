---
title: Nested Comments (Self-Referential)
category: content
complexity: medium
tags: comments, replies, threads, self-referential, tree
---

# Nested Comments Pattern

**Use when:** Building comment threads, nested replies, discussion forums

## Schema

```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 10000),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_comments_parent ON comments(parent_comment_id);
CREATE INDEX idx_comments_user ON comments(user_id);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER comments_updated_at
BEFORE UPDATE ON comments
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

## Row Level Security

```sql
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Anyone can read comments
CREATE POLICY "Anyone can read comments" ON comments
  FOR SELECT USING (true);

-- Authenticated users can comment
CREATE POLICY "Users can comment" ON comments
  FOR INSERT
  TO authenticated
  WITH CHECK (uid() = user_id);

-- Users can edit their own comments
CREATE POLICY "Users can edit own comments" ON comments
  FOR UPDATE
  TO authenticated
  USING (uid() = user_id)
  WITH CHECK (uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments" ON comments
  FOR DELETE
  TO authenticated
  USING (uid() = user_id);
```

## SDK Usage

```javascript
// Get top-level comments with author info
const { data: comments } = await client.database
  .from('comments')
  .select('*, author:user_id(id, profile)')
  .eq('post_id', postId)
  .is('parent_comment_id', null)
  .order('created_at', { ascending: false });

// Get replies to a comment
const { data: replies } = await client.database
  .from('comments')
  .select('*, author:user_id(id, profile)')
  .eq('parent_comment_id', commentId)
  .order('created_at', { ascending: true });

// Get comments with reply count
const { data: comments } = await client.database
  .from('comments')
  .select(`
    *,
    author:user_id(id, profile),
    reply_count:comments(count)
  `)
  .eq('post_id', postId)
  .is('parent_comment_id', null)
  .order('created_at', { ascending: false });

// Create a top-level comment
await client.database
  .from('comments')
  .insert([{
    post_id: postId,
    user_id: currentUserId,
    content: commentText
  }]);

// Reply to a comment
await client.database
  .from('comments')
  .insert([{
    post_id: postId,
    user_id: currentUserId,
    parent_comment_id: parentCommentId,
    content: replyText
  }]);

// Edit a comment
await client.database
  .from('comments')
  .update({ content: newContent })
  .eq('id', commentId)
  .eq('user_id', currentUserId);  // Extra safety

// Delete a comment
await client.database
  .from('comments')
  .delete()
  .eq('id', commentId);

// Get comment count for a post
const { count } = await client.database
  .from('comments')
  .select('*', { count: 'exact', head: true })
  .eq('post_id', postId);
```

## Best Practices

### Indexing
- **Index post_id** - Primary access pattern (all comments for a post)
- **Index parent_comment_id** - For fetching replies
- **Consider partial index for top-level comments**:
  ```sql
  CREATE INDEX idx_comments_toplevel ON comments(post_id, created_at)
  WHERE parent_comment_id IS NULL;
  ```

### Performance
- **Limit nesting depth** - Deep threads are hard to display; consider max 3-5 levels
- **Paginate at each level** - Don't fetch all replies at once
- **Lazy-load replies** - Fetch top-level first, then replies on expand

### Loading Strategies

**Strategy 1: Two-Query (Recommended)**
```javascript
// 1. Get top-level comments
const { data: topLevel } = await client.database
  .from('comments')
  .select('*, author:user_id(id, profile), reply_count:comments(count)')
  .eq('post_id', postId)
  .is('parent_comment_id', null)
  .order('created_at', { ascending: false })
  .range(0, 19);

// 2. Get first few replies for each (lazy load more on expand)
const topLevelIds = topLevel.map(c => c.id);
const { data: replies } = await client.database
  .from('comments')
  .select('*, author:user_id(id, profile)')
  .in('parent_comment_id', topLevelIds)
  .order('created_at', { ascending: true });

// Group replies by parent
const repliesByParent = replies.reduce((acc, reply) => {
  acc[reply.parent_comment_id] = acc[reply.parent_comment_id] || [];
  acc[reply.parent_comment_id].push(reply);
  return acc;
}, {});
```

**Strategy 2: Recursive CTE (All at once)**
```sql
-- Get full thread in one query (use sparingly)
WITH RECURSIVE comment_tree AS (
  SELECT *, 0 as depth
  FROM comments
  WHERE post_id = $1 AND parent_comment_id IS NULL

  UNION ALL

  SELECT c.*, ct.depth + 1
  FROM comments c
  JOIN comment_tree ct ON c.parent_comment_id = ct.id
  WHERE ct.depth < 5  -- Limit depth
)
SELECT * FROM comment_tree ORDER BY depth, created_at;
```

### Handling Deleted Comments

Option A: Hard delete (replies also deleted via CASCADE)
Option B: Soft delete (preserve thread structure):
```sql
ALTER TABLE comments ADD COLUMN deleted_at TIMESTAMPTZ;

-- Update RLS to hide deleted
CREATE POLICY "Hide deleted comments" ON comments
  FOR SELECT USING (deleted_at IS NULL OR user_id = uid());
```

### Common Mistakes
- ❌ Fetching entire comment tree at once → paginate and lazy-load
- ❌ No depth limit → infinite nesting causes display issues
- ❌ Forgetting `post_id` when creating replies → orphaned comments
- ❌ Not indexing `parent_comment_id` → slow reply lookups
