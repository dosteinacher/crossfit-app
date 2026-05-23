import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { db } from '@/lib/db';

const RETENTION_DAYS = 365; // delete posts (and their photos) older than 1 year

export async function GET(request: NextRequest) {
  // Vercel Cron sends an Authorization header containing CRON_SECRET.
  // Without this guard, anyone could trigger the cleanup.
  const authHeader = request.headers.get('authorization');
  const expected = process.env.CRON_SECRET;
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const expired = await db.getExpiredWorkoutPosts(RETENTION_DAYS);

    let blobsDeleted = 0;
    let blobsFailed = 0;
    for (const post of expired) {
      if (post.image_url) {
        try {
          await del(post.image_url);
          blobsDeleted++;
        } catch (e) {
          console.error(`Failed to delete blob ${post.image_url}:`, e);
          blobsFailed++;
        }
      }
    }

    const rowsDeleted = await db.deleteExpiredWorkoutPosts(RETENTION_DAYS);

    return NextResponse.json({
      ok: true,
      retention_days: RETENTION_DAYS,
      blobs_deleted: blobsDeleted,
      blobs_failed: blobsFailed,
      rows_deleted: rowsDeleted,
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
