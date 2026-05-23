import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { db } from '@/lib/db';
import { getSessionFromCookie } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; postId: string }> }
) {
  try {
    const session = getSessionFromCookie(request.headers.get('cookie'));
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { postId } = await params;
    const id = parseInt(postId);

    const post = await db.getWorkoutPostById(id);
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Only the author or an admin can delete
    if (post.user_id !== session.id && !session.is_admin) {
      return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
    }

    if (post.image_url) {
      try {
        await del(post.image_url);
      } catch (e) {
        console.error('Failed to delete blob:', e);
      }
    }

    await db.deleteWorkoutPost(id);
    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    console.error('Delete post error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
