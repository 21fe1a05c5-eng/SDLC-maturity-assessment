import { NextResponse } from 'next/server';
import { getAssessments, saveAssessment } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';

export async function GET(request) {
  try {
    const userPayload = getUserIdFromRequest(request);
    if (!userPayload) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Admins can see all assessments, regular users only their own
    const userId = userPayload.role === 'admin' ? null : userPayload.id;
    const assessments = await getAssessments(userId);

    return NextResponse.json({ assessments });
  } catch (error) {
    console.error('Assessments GET API Error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const userPayload = getUserIdFromRequest(request);
    if (!userPayload) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const assessmentData = await request.json();
    if (!assessmentData.projectName || !assessmentData.answers) {
      return NextResponse.json({ message: 'Missing required assessment fields' }, { status: 400 });
    }

    // Set owner
    assessmentData.userId = userPayload.id;
    assessmentData.userEmail = userPayload.email;

    const saved = await saveAssessment(assessmentData);
    return NextResponse.json({ message: 'Assessment saved successfully', assessment: saved });
  } catch (error) {
    console.error('Assessments POST API Error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
