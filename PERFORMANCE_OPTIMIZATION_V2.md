# Additional Performance Optimizations

## Additional Optimizations Applied

### 1. Parallelized Queries in `getSessionModificationStatuses`
**File**: `src/services/sessionModificationService.ts`

- **Before**: 3 sequential queries (modifs → validations → entry badges)
- **After**: 2 queries in parallel (modifs + entry badges), then validations
- **Impact**: Reduces query time by ~33% for status fetching

### 2. Optimized `fetchSessionsWithModifications`
**File**: `src/services/sessionService.ts`

- Added limits to prevent fetching excessive data:
  - Max 100 modifications per user
  - Max 50 sessions returned
- **Impact**: Prevents slow queries when users have many modifications

### 3. Non-blocking Status Fetch
**File**: `src/components/UserPortal.tsx`

- Status fetching now runs asynchronously and doesn't block the UI
- Sessions display immediately, statuses update when ready
- **Impact**: Perceived performance improvement - UI feels faster

## Additional Recommendations

### Option 1: Create a Materialized View (Advanced)
If performance is still slow, consider converting `appbadge_v_sessions` to a materialized view:

```sql
-- Create materialized view
CREATE MATERIALIZED VIEW appbadge_v_sessions_materialized AS
SELECT * FROM appbadge_v_sessions;

-- Create indexes on materialized view
CREATE INDEX idx_sessions_materialized_user_date 
ON appbadge_v_sessions_materialized (utilisateur_id, jour_local DESC);

-- Refresh periodically (via cron or trigger)
REFRESH MATERIALIZED VIEW appbadge_v_sessions_materialized;
```

**Trade-off**: Faster reads, but requires periodic refresh (can be done via Supabase cron jobs).

### Option 2: Create an RPC Function (Best Performance)
Create a single PostgreSQL function that does all the work server-side:

```sql
CREATE OR REPLACE FUNCTION get_user_sessions_with_status(
  p_utilisateur_id uuid,
  p_limit integer DEFAULT 10,
  p_before_date date DEFAULT NULL
)
RETURNS TABLE (
  -- session fields
  entree_id uuid,
  jour_local date,
  entree_ts timestamptz,
  sortie_ts timestamptz,
  duree_minutes numeric,
  lieux text,
  -- status fields
  modif_status text,
  modif_id uuid,
  proposed_entree_ts timestamptz,
  proposed_sortie_ts timestamptz
) AS $$
BEGIN
  -- Single query with JOINs instead of multiple round trips
  RETURN QUERY
  SELECT 
    s.entree_id,
    s.jour_local,
    s.entree_ts,
    s.sortie_ts,
    s.duree_minutes,
    s.lieux,
    CASE 
      WHEN b.commentaire LIKE 'Oubli de badgeage validé%' THEN 'approved'
      WHEN v.approuve = true THEN 'approved'
      WHEN v.approuve = false THEN 'rejected'
      WHEN m.id IS NOT NULL THEN 'pending'
      ELSE 'none'
    END as modif_status,
    m.id as modif_id,
    m.proposed_entree_ts,
    m.proposed_sortie_ts
  FROM appbadge_v_sessions s
  LEFT JOIN appbadge_badgeages b ON b.id = s.entree_id AND b.type_action = 'entrée'
  LEFT JOIN appbadge_session_modifs m ON m.entree_id = s.entree_id
  LEFT JOIN appbadge_session_modif_validations v ON v.modif_id = m.id
  WHERE s.utilisateur_id = p_utilisateur_id
    AND (p_before_date IS NULL OR s.jour_local < p_before_date)
  ORDER BY s.jour_local DESC, s.entree_ts DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Impact**: Single database round-trip instead of 5-6 queries. Could reduce load time by 50-70%.

### Option 3: Add Query Result Caching
Implement client-side caching for session data:

```typescript
// Simple cache with 30-second TTL
const sessionCache = new Map<string, { data: UserSession[], timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

export const fetchUserSessionsCached = async (
  utilisateurId: string,
  limit: number = 10,
  beforeDate?: string
): Promise<UserSession[]> => {
  const cacheKey = `${utilisateurId}-${limit}-${beforeDate || 'latest'}`;
  const cached = sessionCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const data = await fetchUserSessions(utilisateurId, limit, beforeDate);
  sessionCache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
};
```

**Impact**: Instant loading for repeat visits within 30 seconds.

## Monitoring Performance

To identify remaining bottlenecks:

1. **Check Supabase Query Performance Dashboard**
   - Go to Database → Query Performance
   - Look for queries taking > 500ms

2. **Use Browser DevTools**
   - Network tab: Check individual query times
   - Performance tab: Identify render blocking

3. **Add Performance Logging**
   ```typescript
   const start = performance.now();
   await fetchSessions();
   console.log(`Fetch took ${performance.now() - start}ms`);
   ```

## Expected Results

With all optimizations:
- **Initial load**: 0.5-1.5 seconds (down from 2-5 seconds)
- **Subsequent loads**: 0.2-0.5 seconds (with caching)
- **Status updates**: Non-blocking, appear when ready

