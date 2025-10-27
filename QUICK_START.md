# Quick Start - Two-Table Schema

## ✅ All Code Updated!

Your codebase is now fully compatible with the two-table schema:
- `users` table (stores Clerk auth)
- `profiles` table (stores profile data)

## 🚀 One More Step

### Run This SQL in Supabase

Execute `complete_schema_setup.sql` in **Supabase SQL Editor** to add the `updated_at` triggers:

```sql
-- Just run this part if you already created the tables:
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

## 🧪 Test It

1. **Refresh http://localhost:3000**
2. **Log in** - Modal should appear if profile incomplete
3. **Fill form** and submit
4. **Modal closes** and never appears again

## 🔍 Verify Data

```sql
SELECT 
  u.clerk_user_id,
  u.name,
  p.opted_in,
  p.looking_for,
  p.open_to
FROM users u
LEFT JOIN profiles p ON p.user_id = u.id
LIMIT 5;
```

## 📋 What Changed

| Component | Change |
|-----------|--------|
| OnboardingModal | Now queries `users` first, then `profiles` |
| Onboard Page | Same two-step process |
| Chat Page | Creates user in `users` table on login |
| Database | Two tables with FK relationship |

## 🎉 You're Done!

The onboarding modal will:
- ✅ Auto-appear for new users
- ✅ Be non-dismissible until complete
- ✅ Save to correct tables
- ✅ Never show again after completion

---

**Questions?** Check `TWO_TABLE_SCHEMA_SUMMARY.md` for details.

