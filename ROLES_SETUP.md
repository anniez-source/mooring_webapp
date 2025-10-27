# User Roles Setup Guide

## Setting Up Roles in Your App

### Method 1: Via Clerk Dashboard (Easiest)

1. Go to **Clerk Dashboard** → **Users**
2. Click on a user
3. Scroll to **Public metadata**
4. Click **Edit**
5. Add:
   ```json
   {
     "role": "admin"
   }
   ```
   or
   ```json
   {
     "role": "member"
   }
   ```
6. Click **Save**

### Method 2: Via API (Programmatic)

Create an API route to set roles:

```typescript
// app/api/admin/set-role/route.ts
import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { userId } = auth();
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Check if current user is admin
  const currentUser = await clerkClient.users.getUser(userId);
  const currentRole = currentUser.publicMetadata?.role;
  
  if (currentRole !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  const { targetUserId, role } = await request.json();
  
  // Update target user's role
  await clerkClient.users.updateUserMetadata(targetUserId, {
    publicMetadata: {
      role: role // 'admin' or 'member'
    }
  });
  
  return NextResponse.json({ success: true });
}
```

### Method 3: Set Default Role on Sign Up

In your sign-up flow:

```typescript
// When creating a user, set default role
import { clerkClient } from '@clerk/nextjs/server';

// After user signs up
await clerkClient.users.updateUserMetadata(userId, {
  publicMetadata: {
    role: 'member' // Default role
  }
});
```

## Using Roles in Your App

### In React Components:

```typescript
import { useIsAdmin, useUserRole } from '@/lib/useUserRole';

function MyComponent() {
  const isAdmin = useIsAdmin();
  const role = useUserRole();
  
  return (
    <div>
      {isAdmin && (
        <button>Admin-only button</button>
      )}
      
      {role === 'member' && (
        <p>You are a member</p>
      )}
    </div>
  );
}
```

### In API Routes:

```typescript
import { auth, clerkClient } from '@clerk/nextjs/server';

export async function GET() {
  const { userId } = auth();
  
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  const user = await clerkClient.users.getUser(userId);
  const role = user.publicMetadata?.role;
  
  if (role !== 'admin') {
    return new Response('Forbidden', { status: 403 });
  }
  
  // Admin-only logic here
}
```

### In Supabase RLS Policies:

You can also check roles in your database policies by extracting them from the JWT:

```sql
-- In your RLS policies
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
USING (
  (current_setting('request.jwt.claims', true)::json->>'user_role') = 'admin'
);
```

## Role Hierarchy

- **admin**: Full access to everything
- **member**: Standard user access

## Security Best Practices

1. ✅ Always verify roles server-side (API routes, not just client)
2. ✅ Use RLS policies in Supabase for database-level security
3. ✅ Don't trust client-side role checks for sensitive operations
4. ✅ Store roles in `publicMetadata` (readable by user) not `privateMetadata` (only backend)

## Testing

To test admin features:
1. Set your own user role to 'admin' in Clerk Dashboard
2. Sign out and sign back in
3. The new role will be available in the JWT and user object

