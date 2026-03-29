import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const MONGO_URI = process.env.MONGO_URI!;
let client: MongoClient | null = null;

async function getDb() {
  if (!client) {
    client = new MongoClient(MONGO_URI);
    await client.connect();
  }
  return client.db();
}

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email');
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });

  const db = await getDb();

  // Find all rooms where this user participated
  const rooms = await db.collection('rooms').find({
    'participants.userId': email,
  }).toArray();

  const conversations = [];

  for (const room of rooms) {
    // Get all chats in this room
    const messages = await db.collection('chats')
      .find({ roomId: room.roomId })
      .sort({ createdAt: 1 })
      .toArray();

    if (messages.length === 0) continue; // skip rooms with no messages

    // Unique participants
    const seen = new Set<string>();
    const participants = (room.participants as any[])
      .filter(p => { if (seen.has(p.userId)) return false; seen.add(p.userId); return true; })
      .map(p => ({ email: p.userId, name: p.userName }));

    conversations.push({
      roomId: room.roomId,
      participants,
      messages: messages.map(m => ({
        id: m._id.toString(),
        senderEmail: m.userEmail,
        senderName: m.userName,
        text: m.message,
        timestamp: m.createdAt,
      })),
      lastMessage: {
        text: (messages[messages.length - 1] as any).message,
        senderName: (messages[messages.length - 1] as any).userName,
        timestamp: (messages[messages.length - 1] as any).createdAt,
      },
      messageCount: messages.length,
    });
  }

  // Sort by most recent activity
  conversations.sort((a, b) =>
    new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime()
  );

  return NextResponse.json({ success: true, conversations });
}
