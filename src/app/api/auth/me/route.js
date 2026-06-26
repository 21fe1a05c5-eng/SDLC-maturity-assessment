import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { getUserById } from '@/lib/db';
import { cookies } from 'next/headers';

export async function GET(request) {
  try {
    const userPayload = getUserIdFromRequest(request);

    if (!userPayload) {
      return NextResponse.json({ user: null, message: 'Not authenticated' }, { status: 200 });
    }

    const dbUser = await getUserById(userPayload.id);
    if (!dbUser) {
      return NextResponse.json({ user: null, message: 'User not found' }, { status: 200 });
    }

    let token = null;
    try {
      const cookieStore = cookies();
      token = cookieStore.get('token')?.value || null;
    } catch (_) {}
    if (!token) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    return NextResponse.json({
      token,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
        name: dbUser.name || '',
        gender: dbUser.gender || ''
      }
    });
  } catch (error) {
    console.error('Me API Error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
