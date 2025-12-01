# Row Level Security (RLS) Implementation Guide

## Overview

This guide explains how to implement and test the Row Level Security (RLS) policies for the Badgeuse OTI application. These policies ensure that:

- **Admins/Managers** can access all data (read/write)
- **Regular users** can only access their own data
- The application continues to work as expected

## Prerequisites

1. **Supabase Project** with all tables created
2. **Authentication Setup**: Users must authenticate via Supabase Auth (Google OAuth)
3. **User ID Matching**: The Supabase Auth user ID (`auth.uid()`) must match the `appbadge_utilisateurs.id` for each user

## Important: User ID Matching

For RLS to work correctly, **each user's Supabase Auth user ID must match their `appbadge_utilisateurs.id`**.

### How to Ensure Matching IDs

When creating users in `appbadge_utilisateurs`, you have two options:

1. **Option A: Use Supabase Auth user ID as the primary key**
   - Create the user in Supabase Auth first
   - Use the returned `user.id` as the `id` in `appbadge_utilisateurs`

2. **Option B: Update existing users**
   - If you have existing users, you'll need to update their `appbadge_utilisateurs.id` to match their Supabase Auth user ID
   - This requires a migration script

### Migration Script for Existing Users

If you have existing users with mismatched IDs, run this script **before** applying RLS policies:

```sql
-- WARNING: This script updates user IDs to match Supabase Auth IDs
-- Only run this if you're sure about the email matching
-- Backup your database first!

-- Example: Update user ID based on email matching
-- You'll need to manually match each user's email with their Supabase Auth email
UPDATE appbadge_utilisateurs u
SET id = (
  SELECT id FROM auth.users au
  WHERE au.email = u.email
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM auth.users au
  WHERE au.email = u.email
);
```

## Applying RLS Policies

### Step 1: Review the Policies

Open `rls_policies.sql` and review the policies to ensure they match your requirements.

### Step 2: Apply Policies in Supabase

1. Open your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy the entire contents of `rls_policies.sql`
4. Paste into the SQL Editor
5. Click **Run** to execute

### Step 3: Verify Policies Were Created

Run this query to verify all policies were created:

```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename LIKE 'appbadge_%'
ORDER BY tablename, policyname;
```

You should see policies for all tables:
- `appbadge_utilisateurs`
- `appbadge_badgeages`
- `appbadge_badges`
- `appbadge_horaires_standards`
- `appbadge_oubli_badgeages`
- `appbadge_session_modifs`
- `appbadge_session_modif_validations`
- `appbadge_lieux` (if it exists)

## Testing RLS Policies

### Test 1: Public (Unauthenticated) Access

1. Open the app without signing in
2. Verify that the list of active users is visible
3. Click a user card and confirm the badge lookup works (Supabase logs show reads on `appbadge_utilisateurs` and `appbadge_badges` with `role=anon`)

These policies intentionally allow read-only access to active users/badges so the pre-authentication UX keeps working.

### Test 2: Regular User Can Read Own Data

1. Authenticate as a regular user (not Admin/Manager)
2. Try to read your own badgeages:
   ```sql
   SELECT * FROM appbadge_badgeages 
   WHERE utilisateur_id = auth.uid();
   ```
   ✅ Should succeed

3. Try to read another user's badgeages:
   ```sql
   SELECT * FROM appbadge_badgeages 
   WHERE utilisateur_id != auth.uid()
   LIMIT 1;
   ```
   ❌ Should return empty (or error if RLS is strict)

### Test 3: Regular User Can Insert Own Data

1. Authenticate as a regular user
2. Try to insert a badgeage for yourself:
   ```sql
   INSERT INTO appbadge_badgeages (utilisateur_id, type_action, code)
   VALUES (auth.uid(), 'entrée', 'TEST123');
   ```
   ✅ Should succeed

3. Try to insert a badgeage for another user:
   ```sql
   INSERT INTO appbadge_badgeages (utilisateur_id, type_action, code)
   VALUES ('<another-user-id>', 'entrée', 'TEST123');
   ```
   ❌ Should fail with permission error

### Test 4: Admin Can Access All Data

1. Authenticate as an Admin or Manager
2. Try to read all badgeages:
   ```sql
   SELECT * FROM appbadge_badgeages;
   ```
   ✅ Should return all records

3. Try to update any user:
   ```sql
   UPDATE appbadge_utilisateurs 
   SET nom = 'Test'
   WHERE id = '<any-user-id>';
   ```
   ✅ Should succeed

### Test 5: Unauthenticated Users Are Blocked (Other Tables)

1. Sign out or use an unauthenticated session
2. Try to read a restricted table (e.g., modification requests):
   ```sql
   SELECT * FROM appbadge_session_modifs;
   ```
   ❌ Should return empty or error

### Test 6: Public Data (Schedules, Locations)

1. Authenticate as any user (regular or admin)
2. Try to read schedules:
   ```sql
   SELECT * FROM appbadge_horaires_standards;
   ```
   ✅ Should succeed for all authenticated users

3. Try to insert a schedule as a regular user:
   ```sql
   INSERT INTO appbadge_horaires_standards (lieux, heure_debut)
   VALUES ('Test Location', '08:00');
   ```
   ❌ Should fail (only admins can insert)

## Troubleshooting

### Issue: "Permission denied for table"

**Cause**: RLS is enabled but no policies match the query.

**Solution**: 
1. Check that you're authenticated: `SELECT auth.uid();`
2. Verify your user exists in `appbadge_utilisateurs` with matching ID
3. Check that `is_admin()` function works: `SELECT is_admin();`
4. Review the policies to ensure they match your use case

### Issue: Users can't see their own data

**Cause**: User ID mismatch between Supabase Auth and `appbadge_utilisateurs`.

**Solution**:
1. Check the user's Supabase Auth ID: `SELECT auth.uid();`
2. Check the user's record: `SELECT * FROM appbadge_utilisateurs WHERE email = '<user-email>';`
3. Ensure the IDs match
4. If not, update the `appbadge_utilisateurs.id` to match `auth.uid()`

### Issue: Admins can't access all data

**Cause**: The `is_admin()` function is not returning true.

**Solution**:
1. Check the user's role: `SELECT role FROM appbadge_utilisateurs WHERE id = auth.uid();`
2. Verify the role is exactly 'Admin' or 'Manager' (case-sensitive)
3. Test the function: `SELECT is_admin();`
4. Check that the user is active: `SELECT actif FROM appbadge_utilisateurs WHERE id = auth.uid();`

### Issue: Policies not applying

**Cause**: RLS might not be enabled on the table.

**Solution**:
1. Check if RLS is enabled: 
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public' 
     AND tablename LIKE 'appbadge_%';
   ```
2. If `rowsecurity` is false, enable it:
   ```sql
   ALTER TABLE appbadge_<table_name> ENABLE ROW LEVEL SECURITY;
   ```

## Policy Details

### Helper Functions

- **`get_current_user_id()`**: Returns the current user's ID from `appbadge_utilisateurs` if they exist and are active
- **`is_own_record(p_utilisateur_id)`**: Checks if the current user owns a record
- **`is_admin()`**: Already exists, checks if user has Admin or Manager role

### Policy Patterns

1. **Own Data Access**: Users can read/insert their own records using `is_own_record()`
2. **Admin Full Access**: Admins can access all data using `is_admin() = true`
3. **Public Read**: Some tables allow all authenticated users to read (schedules, locations)

## Security Considerations

1. **Never disable RLS** in production
2. **Test thoroughly** before deploying to production
3. **Monitor** for permission errors in application logs
4. **Keep policies updated** as the application evolves
5. **Document** any custom policies you add

## Rollback

If you need to disable RLS (for testing or emergency):

```sql
-- WARNING: This disables all RLS policies
-- Only use for testing or emergencies

ALTER TABLE appbadge_utilisateurs DISABLE ROW LEVEL SECURITY;
ALTER TABLE appbadge_badgeages DISABLE ROW LEVEL SECURITY;
ALTER TABLE appbadge_badges DISABLE ROW LEVEL SECURITY;
ALTER TABLE appbadge_horaires_standards DISABLE ROW LEVEL SECURITY;
ALTER TABLE appbadge_oubli_badgeages DISABLE ROW LEVEL SECURITY;
ALTER TABLE appbadge_session_modifs DISABLE ROW LEVEL SECURITY;
ALTER TABLE appbadge_session_modif_validations DISABLE ROW LEVEL SECURITY;
```

**Note**: Disabling RLS removes all security. Re-enable it immediately after testing.

## Next Steps

After applying RLS policies:

1. Test all application features
2. Monitor for any permission errors
3. Update application code if needed to handle permission errors gracefully
4. Document any custom policies or exceptions

## Support

If you encounter issues:

1. Check the Supabase logs for detailed error messages
2. Review the policy definitions in `rls_policies.sql`
3. Test individual policies using the SQL queries above
4. Consult Supabase RLS documentation: https://supabase.com/docs/guides/auth/row-level-security

