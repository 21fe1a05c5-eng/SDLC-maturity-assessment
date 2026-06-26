import { NextResponse } from 'next/server';
import { updateUserProfile } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';

export async function POST(request) {
  try {
    const userPayload = getUserIdFromRequest(request);
    if (!userPayload) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { name, gender } = await request.json();
    
    // Validate inputs
    const cleanName = (name || '').trim();
    const cleanGender = (gender || '').trim();

    const updatedUser = await updateUserProfile(userPayload.id, cleanName, cleanGender);
    
    return NextResponse.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        name: updatedUser.name || '',
        gender: updatedUser.gender || ''
      }
    });
  } catch (error) {
    console.error('Profile Update API Error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
