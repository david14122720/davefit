---
title: Likes (Many-to-Many Junction)
category: relationships
complexity: simple
tags: likes, favorites, bookmarks, junction-table
---

# Likes Pattern

**Use when:** Users can like, favorite, or bookmark content (posts, comments, products, etc.)

## Schema

```sql
CREATE TABLE likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)  -- Prevent duplicate likes
);

-- Indexes for fast lookups
CREATE INDEX idx_likes_post ON likes(post_id);
CREATE INDEX idx_likes_user ON likes(user_id);
```

### Polymorphic Likes (Optional)

For liking multiple content types:

```sql
CREATE TABLE likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  likeable_type TEXT NOT NULL CHECK (likeable_type IN ('post', 'comment', 'product')),
  likeable_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, likeable_type, likeable_id)
);

CREATE INDEX idx_likes_likeable ON likes(likeable_type, likeable_id);
CREATE INDEX idx_likes_user ON likes(user_id);
```

## Row Level Security

```sql
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- Anyone can see likes (for counts)
CREATE POLICY "Anyone can read likes" ON likes
  FOR SELECT USING (true);

-- Users can only like as themselves
CREATE POLICY "Users can like" ON likes
  FOR INSERT
  TO authenticated
  WITH CHECK (uid() = user_id);

-- Users can only unlike their own likes
CREATE POLICY "Users can unlike" ON likes
  FOR DELETE
  TO authenticated
  USING (uid() = user_id);
```

## SDK Usage

```javascript
// Like a post
await client.database
  .from('likes')
  .insert([{ user_id: currentUserId, post_id: postId }]);

// Unlike a post
await client.database
  .from('likes')
  .delete()
  .eq('user_id', currentUserId)
  .eq('post_id', postId);

// Check if current user liked a post
const { data } = await client.database
  .from('likes')
  .select('id')
  .eq('user_id', currentUserId)
  .eq('post_id', postId)
  .single();
const hasLiked = !!data;

// Get like count for a post
const { count } = await client.database
  .from('likes')
  .select('*', { count: 'exact', head: true })
  .eq('post_id', postId);

// Get post with like count and user's like status in one query
const { data: post } = await client.database
  .from('posts')
  .select(`
    *,
    like_count:likes(count),
    user_liked:likes!inner(id)
  `)
  .eq('id', postId)
  .eq('likes.user_id', currentUserId)
  .single();

// Get all posts liked by a user
const { data: likedPosts } = await client.database
  .from('likes')
  .select('post_id, post:post_id(*)')
  .eq('user_id', userId)
  .order('created_at', { ascending: false });

// Toggle like (upsert pattern)
const { error } = await client.database
  .from('likes')
  .upsert([{ user_id: currentUserId, post_id: postId }], {
    onConflict: 'user_id,post_id',
    ignoreDuplicates: true
  });
```

## Best Practices

### Indexing
- **Index the post_id column** - Most queries filter by post ("how many likes does this post have")
- **Index user_id** - For "what posts did I like" queries
- The UNIQUE constraint creates a composite index automatically

### Performance
- **Use `count: 'exact', head: true`** - Never fetch all likes just to count them
- **Batch like status checks** - When showing a feed, check all posts at once:
  ```javascript
  const { data: userLikes } = await client.database
    .from('likes')
    .select('post_id')
    .eq('user_id', currentUserId)
    .in('post_id', postIds);
  const likedSet = new Set(userLikes.map(l => l.post_id));
  ```
- **Consider denormalization** - For high-traffic posts, store `like_count` on the posts table and update via trigger

### Denormalized Count (High Traffic)

```sql
-- Add count to posts table
ALTER TABLE posts ADD COLUMN like_count INT DEFAULT 0;

-- Trigger to maintain count
CREATE OR REPLACE FUNCTION update_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET like_count = like_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER likes_count_trigger
AFTER INSERT OR DELETE ON likes
FOR EACH ROW EXECUTE FUNCTION update_like_count();
```

### Common Mistakes
- ❌ Forgetting UNIQUE constraint → duplicate likes
- ❌ Fetching all likes to count them → use `count: 'exact', head: true`
- ❌ N+1 queries for like status → batch check with `.in()`
- ❌ Not handling upsert conflicts gracefully
