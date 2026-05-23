import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { db } from '@/lib/db';
import { getSessionFromCookie } from '@/lib/auth';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB safety cap

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSessionFromCookie(request.headers.get('cookie'));
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const workoutId = parseInt(id);

    const posts = await db.getWorkoutPosts(workoutId);
    return NextResponse.json({ posts });
  } catch (error) {
    console.error('Get posts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSessionFromCookie(request.headers.get('cookie'));
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const workoutId = parseInt(id);

    const formData = await request.formData();
    const message = (formData.get('message') as string | null)?.trim() || '';
    const image = formData.get('image') as File | null;

    if (!message && !image) {
      return NextResponse.json({ error: 'Add a message or photo' }, { status: 400 });
    }

    let imageUrl: string | null = null;
    if (image && image.size > 0) {
      if (image.size > MAX_IMAGE_BYTES) {
        return NextResponse.json({ error: 'Image too large (max 5MB)' }, { status: 400 });
      }
      if (!image.type.startsWith('image/')) {
        return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
      }

      const ext = image.name.split('.').pop() || 'jpg';
      const filename = `workout-${workoutId}/${Date.now()}-${session.id}.${ext}`;
      const blob = await put(filename, image, {
        access: 'public',
        addRandomSuffix: true,
      });
      imageUrl = blob.url;
    }

    const post = await db.createWorkoutPost(workoutId, session.id, message, imageUrl);
    return NextResponse.json({ post: { ...post, user_name: session.name } }, { status: 201 });
  } catch (error) {
    console.error('Create post error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
