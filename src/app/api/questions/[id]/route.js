import { NextResponse } from 'next/server';
import { deleteQuestion } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';

export async function DELETE(request, { params }) {
  try {
    const userPayload = getUserIdFromRequest(request);
    if (!userPayload || userPayload.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ message: 'Missing question ID' }, { status: 400 });
    }

    const success = await deleteQuestion(id);
    if (!success) {
      return NextResponse.json({ message: 'Question not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Questions DELETE API Error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
