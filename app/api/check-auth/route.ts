import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// List of allowed email addresses (you can also check against Supabase profiles)
const ALLOWED_EMAILS = [
  // Add your email addresses here
  'your-email@example.com',
  'annie@example.com',
];

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ authorized: false }, { status: 401 });
    }

    // Get user email from Clerk
    const { data } = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
      },
    }).then(res => res.json());

    const email = data?.email_addresses?.[0]?.email_address;

    if (!email) {
      return NextResponse.json({ authorized: false }, { status: 403 });
    }

    // Check if email is in allowlist (or check against Supabase profiles table)
    const isAuthorized = ALLOWED_EMAILS.includes(email.toLowerCase());

    if (!isAuthorized) {
      // Optionally: Delete the user from Clerk
      // await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      //   method: 'DELETE',
      //   headers: {
      //     Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
      //   },
      // });
      
      return NextResponse.json({ authorized: false }, { status: 403 });
    }

    return NextResponse.json({ authorized: true }, { status: 200 });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ authorized: false }, { status: 500 });
  }
}

