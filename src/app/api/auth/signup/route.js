import { NextResponse } from 'next/server';
import { createUser } from '@/lib/db';
import { signToken } from '@/lib/auth';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, message: 'Email and password are required' }, { status: 200 });
    }

    if (password.length < 6) {
      return NextResponse.json({ success: false, message: 'Password must be at least 6 characters' }, { status: 200 });
    }

    const newUser = await createUser(email, password);
    const token = signToken(newUser);

    const response = NextResponse.json(
      { token, message: 'User created successfully', user: { id: newUser.id, email: newUser.email } },
      { status: 201 }
    );

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/'
    });

    return response;
  } catch (error) {
    console.warn('Signup API warning:', error.message || error);
    return NextResponse.json({ success: false, message: error.message || 'Error creating user' }, { status: 200 });
  }
}
