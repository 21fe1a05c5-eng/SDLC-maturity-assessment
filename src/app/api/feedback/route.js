import { NextResponse } from 'next/server';
import { getFeedback, saveFeedback, getAssessmentById, saveAssessment } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';

export async function GET(request) {
  try {
    const userPayload = getUserIdFromRequest(request);
    if (!userPayload || userPayload.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const feedback = await getFeedback();
    return NextResponse.json({ feedback });
  } catch (error) {
    console.error('Feedback GET API Error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const userPayload = getUserIdFromRequest(request);
    if (!userPayload) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const feedbackData = await request.json();
    if (!feedbackData.assessmentId || !feedbackData.rating) {
      return NextResponse.json({ message: 'Missing feedback rating or assessment ID' }, { status: 400 });
    }

    feedbackData.userId = userPayload.id;
    feedbackData.userEmail = userPayload.email;

    const saved = await saveFeedback(feedbackData);

    // Also update the assessment record with feedback info
    const assessment = await getAssessmentById(feedbackData.assessmentId);
    if (assessment) {
      assessment.feedback = {
        rating: feedbackData.rating,
        comments: feedbackData.comments || '',
        createdAt: saved.createdAt
      };
      await saveAssessment(assessment);
    }

    return NextResponse.json({ message: 'Feedback submitted successfully', feedback: saved });
  } catch (error) {
    console.error('Feedback POST API Error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
