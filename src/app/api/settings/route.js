import { NextResponse } from 'next/server';
import { getSettings, updateSettings } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';

export async function GET(request) {
  try {
    const userPayload = getUserIdFromRequest(request);
    if (!userPayload || userPayload.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const settings = await getSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Settings GET API Error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const userPayload = getUserIdFromRequest(request);
    if (!userPayload || userPayload.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const settingsData = await request.json();
    const { activeAIProvider } = settingsData;

    // Validate that the selected provider's API key is present in the .env file
    if (activeAIProvider === 'openai') {
      const key = process.env.OPENAI_API_KEY;
      if (!key || !key.trim()) {
        return NextResponse.json({ message: 'OpenAI API key (OPENAI_API_KEY) is not present in the .env file.' }, { status: 400 });
      }
    } else if (activeAIProvider === 'gemini') {
      const key = process.env.GEMINI_API_KEY;
      if (!key || !key.trim()) {
        return NextResponse.json({ message: 'Google Gemini API key (GEMINI_API_KEY) is not present in the .env file.' }, { status: 400 });
      }
    } else if (activeAIProvider === 'claude') {
      const key = process.env.CLAUDE_API_KEY;
      if (!key || !key.trim()) {
        return NextResponse.json({ message: 'Anthropic Claude API key (CLAUDE_API_KEY) is not present in the .env file.' }, { status: 400 });
      }
    }

    const updated = await updateSettings(settingsData);
    return NextResponse.json({ message: 'Settings updated successfully', settings: updated });
  } catch (error) {
    console.error('Settings POST API Error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
