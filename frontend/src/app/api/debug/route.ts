import { NextResponse } from 'next/server';
import { eventsService } from '@/services/events.services';
import api from '@/services/api';

export async function GET() {
  try {
    const events = await eventsService.getEvents();
    return NextResponse.json({
      success: true,
      env: process.env.NEXT_PUBLIC_API_URL,
      baseUrl: api.defaults.baseURL,
      events: events.map((e: any) => ({ id: e.id, title: e.title })),
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      env: process.env.NEXT_PUBLIC_API_URL,
      baseUrl: api.defaults.baseURL,
      error: error.message,
    });
  }
}
