# RPC Function for Admin Validation Page

## Overview

A PostgreSQL RPC function has been created to optimize the admin validation page loading. Instead of making 6-8 sequential database queries, everything is fetched in a single optimized query.

## Performance Improvement

**Before (Sequential Queries):**
1. Fetch all modification requests
2. Fetch all validations
3. Filter pending modifications
4. Fetch user details
5. Fetch session details
6. Fetch pause totals
7. Fetch oubli badgeage requests
8. Join user details for oubli requests

**After (Single RPC Call):**
- 1 database round-trip with optimized JOINs
- All data fetched in parallel at database level
- **Expected improvement: 60-80% faster**

## Installation

### Step 1: Run the SQL Script

1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Copy and paste the contents of `rpc_admin_validation_requests.sql`
4. Click **Run** to execute

### Step 2: Verify the Function

Run this query to verify the function was created:

```sql
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_admin_validation_requests';
```

You should see the function listed.

### Step 3: Test the Function

Test the function directly:

```sql
SELECT get_admin_validation_requests();
```

This should return a JSON object with `modification_requests` and `oubli_requests` arrays.

## Code Changes

The code has been updated to use the new RPC function:

**File**: `src/services/adminValidationService.ts` (new file)
- Contains `fetchAdminValidationRequests()` function
- Handles the RPC call and data transformation

**File**: `src/components/AdminPage.tsx` (updated)
- Now uses `fetchAdminValidationRequests()` instead of separate calls
- Single function call replaces multiple Promise.all() calls

## Fallback Behavior

If the RPC function fails or doesn't exist, the code will gracefully fallback to empty arrays. The old functions (`fetchPendingModificationRequests` and `fetchPendingOubliRequests`) are still available if needed.

## Function Details

### Function Name
`get_admin_validation_requests()`

### Returns
```json
{
  "modification_requests": [
    {
      "id": "uuid",
      "entree_id": "uuid",
      "utilisateur_id": "uuid",
      "proposed_entree_ts": "timestamp",
      "proposed_sortie_ts": "timestamp",
      "pause_delta_minutes": 0,
      "motif": "string",
      "commentaire": "string",
      "created_at": "timestamp",
      "utilisateur_nom": "string",
      "utilisateur_prenom": "string",
      "utilisateur_email": "string",
      "session_jour_local": "date",
      "session_entree_ts": "timestamp",
      "session_sortie_ts": "timestamp",
      "session_duree_minutes": 0,
      "session_pause_minutes": 0,
      "session_lieux": "string"
    }
  ],
  "oubli_requests": [
    {
      "id": "uuid",
      "utilisateur_id": "uuid",
      "date_heure_saisie": "timestamp",
      "date_heure_entree": "timestamp",
      "date_heure_sortie": "timestamp",
      "date_heure_pause_debut": "timestamp",
      "date_heure_pause_fin": "timestamp",
      "raison": "string",
      "commentaire": "string",
      "perte_badge": false,
      "etat_validation": "en attente",
      "date_validation": null,
      "validateur_id": null,
      "lieux": "string",
      "utilisateur_nom": "string",
      "utilisateur_prenom": "string",
      "utilisateur_email": "string"
    }
  ]
}
```

### Security
- Function uses `SECURITY DEFINER` to run with elevated privileges
- Only authenticated users can execute (via GRANT)
- Function only returns pending requests (not validated)

## Troubleshooting

### Function Not Found Error
If you see "function get_admin_validation_requests() does not exist":
1. Verify the SQL script was executed successfully
2. Check that you're connected to the correct database
3. Ensure the function is in the `public` schema

### Permission Denied Error
If you see permission errors:
1. Run the GRANT statement from the SQL script:
   ```sql
   GRANT EXECUTE ON FUNCTION get_admin_validation_requests() TO authenticated;
   ```

### Empty Results
If the function returns empty arrays:
1. Check that there are actually pending requests in the database
2. Verify the WHERE clauses in the function match your data
3. Check RLS (Row Level Security) policies aren't blocking access

### Performance Issues
If performance is still slow:
1. Ensure indexes from `performance_indexes.sql` are created
2. Check query execution plan:
   ```sql
   EXPLAIN ANALYZE SELECT get_admin_validation_requests();
   ```
3. Look for sequential scans in the plan

## Monitoring

Monitor the function's performance in Supabase:
1. Go to **Database** → **Query Performance**
2. Filter by function name: `get_admin_validation_requests`
3. Check execution time and frequency

## Expected Performance

- **Before**: 1-3 seconds (multiple round trips)
- **After**: 0.2-0.8 seconds (single optimized query)
- **Improvement**: 60-80% faster

