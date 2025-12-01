# Performance Optimization for Session Loading

## Problem
The "Mes sessions" (My sessions) loading is slow, likely due to:
1. **Sequential database queries** - Multiple queries running one after another
2. **Missing database indexes** - Queries scanning large tables without proper indexes
3. **Complex view queries** - The `appbadge_v_sessions` view performs multiple JOINs

## Solutions Implemented

### 1. Parallel Query Execution
**File**: `src/components/UserPortal.tsx`

Changed sequential queries to run in parallel using `Promise.all()`:
- `fetchSessionsWithModifications()` 
- `fetchUserSessions()`
- `fetchUserPendingOubliRequests()`

These queries don't depend on each other, so they can run simultaneously, reducing total load time.

### 2. Database Indexes
**File**: `performance_indexes.sql`

Created indexes to optimize the most common query patterns:

#### Critical Indexes:
- `idx_session_modifs_utilisateur_id` - For fetching user modification requests
- `idx_session_modifs_entree_id` - For joining modifications with sessions
- `idx_session_modifs_user_entree` - Composite index for common lookup pattern
- `idx_session_modif_validations_modif_id_covering` - Covering index for validation lookups
- `idx_badgeages_id_type_action` - For checking entry badges in status queries
- `idx_oubli_badgeages_utilisateur_pending` - For pending oubli badgeage requests
- `idx_badgeages_utilisateur_type_date` - For optimizing session view queries

## How to Apply

### Step 1: Run the Index Creation Script
1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `performance_indexes.sql`
4. Execute the script

### Step 2: Verify Indexes Were Created
Run this query in Supabase SQL Editor:
```sql
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN (
    'appbadge_session_modifs',
    'appbadge_session_modif_validations',
    'appbadge_badgeages',
    'appbadge_oubli_badgeages'
)
ORDER BY tablename, indexname;
```

### Step 3: Test Performance
1. Clear browser cache
2. Load the "Mon espace" page
3. Check the Network tab in browser DevTools to see query times
4. Session loading should be noticeably faster

## Expected Performance Improvement

- **Before**: 2-5 seconds (sequential queries + table scans)
- **After**: 0.5-1.5 seconds (parallel queries + index scans)

The exact improvement depends on:
- Database size
- Network latency
- Number of sessions per user

## Additional Optimization Opportunities

If performance is still slow after applying indexes, consider:

1. **Materialized Views**: Convert `appbadge_v_sessions` to a materialized view that refreshes periodically
2. **Query Optimization**: Review and optimize the view definition in `appbadge_full_monolithic.sql`
3. **Pagination**: Limit initial load to fewer sessions (currently loads all modified sessions)
4. **Caching**: Implement client-side caching for session data

## Monitoring

To monitor query performance in Supabase:
1. Go to Database → Query Performance
2. Look for slow queries on:
   - `appbadge_v_sessions`
   - `appbadge_session_modifs`
   - `appbadge_session_modif_validations`

If queries are still slow after indexes, check the query execution plan:
```sql
EXPLAIN ANALYZE
SELECT * FROM appbadge_v_sessions 
WHERE utilisateur_id = 'your-user-id' 
ORDER BY jour_local DESC 
LIMIT 10;
```

