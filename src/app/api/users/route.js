import { NextResponse } from 'next/server';
import { getUsers } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';

export async function GET(request) {
  try {
    const userPayload = getUserIdFromRequest(request);
    if (!userPayload || userPayload.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const users = await getUsers();
    return NextResponse.json({ users });
  } catch (error) {
    console.error('Users GET API Error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
