import { NextResponse } from 'next/server';
import { getAssessmentById, updateAssessmentRemarks } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    const userPayload = getUserIdFromRequest(request);
    if (!userPayload) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const assessment = await getAssessmentById(id);

    if (!assessment) {
      return NextResponse.json({ message: 'Assessment not found' }, { status: 404 });
    }

    if (userPayload.role !== 'admin' && assessment.userId !== userPayload.id) {
      return NextResponse.json({ message: 'Unauthorized to view this assessment' }, { status: 403 });
    }

    return NextResponse.json({ assessment });
  } catch (error) {
    console.error('Assessments GET ID API Error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// PATCH — update only the remarks field (called from report page after async AI generation)
export async function PATCH(request, { params }) {
  try {
    const userPayload = getUserIdFromRequest(request);
    if (!userPayload) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const assessment = await getAssessmentById(id);
    if (!assessment) {
      return NextResponse.json({ message: 'Assessment not found' }, { status: 404 });
    }
    if (userPayload.role !== 'admin' && assessment.userId !== userPayload.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { remarks, provider } = body;
    const updated = await updateAssessmentRemarks(id, remarks, provider || 'llama3.2');
    return NextResponse.json({ assessment: updated });
  } catch (error) {
    console.error('Assessments PATCH Error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
