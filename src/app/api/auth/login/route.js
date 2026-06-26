import { NextResponse } from 'next/server';
import { authenticateUser, ensureAdminUser } from '@/lib/db';
import { signToken } from '@/lib/auth';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, message: 'Email and password are required' }, { status: 200 });
    }

    let authenticatedUser = await authenticateUser(email, password);

    // Bootstrap: allow default admin account if it isn't in DB yet
    if (!authenticatedUser && email.toLowerCase() === 'admin@sdlc.com' && password === 'admin123') {
      const bcrypt = await import('bcryptjs');
      const salt = await bcrypt.default.genSalt(10);
      const hashedPassword = await bcrypt.default.hash(password, salt);
      const adminUser = await ensureAdminUser(hashedPassword);

      const token = signToken({ id: adminUser.id, email: 'admin@sdlc.com', role: 'admin' });
      const response = NextResponse.json(
        { token, message: 'Admin login successful', user: { id: adminUser.id, email: 'admin@sdlc.com', role: 'admin' } },
        { status: 200 }
      );
      response.cookies.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60,
        path: '/'
      });
      return response;
    }

    if (!authenticatedUser) {
      return NextResponse.json({ success: false, message: 'Invalid email or password' }, { status: 200 });
    }

    const token = signToken(authenticatedUser);
    const response = NextResponse.json(
      { token, message: 'Login successful', user: { id: authenticatedUser.id, email: authenticatedUser.email, role: authenticatedUser.role, name: authenticatedUser.name || '', gender: authenticatedUser.gender || '' } },
      { status: 200 }
    );
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('Login API Error:', error);
    return NextResponse.json({ message: 'Error authenticating user' }, { status: 500 });
  }
}
