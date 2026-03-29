import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { MongoClient } from 'mongodb';

// Use the existing MONGO_URI from env — same DB the backend uses
const MONGO_URI = process.env.MONGO_URI!;
const EMAIL_USER = process.env.EMAIL_USER!;
const EMAIL_PASS = process.env.EMAIL_PASS!;

let client: MongoClient | null = null;

async function getDb() {
  if (!client) {
    client = new MongoClient(MONGO_URI);
    await client.connect();
  }
  return client.db(); // uses the default database from the URI
}

// Vercel (unlike Render free tier) does NOT block outbound SMTP port 587
function createTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    tls: { rejectUnauthorized: false },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, email, otp } = body;

  if (!email) {
    return NextResponse.json({ success: false, message: 'Email is required.' }, { status: 400 });
  }

  const db = await getDb();
  const otps = db.collection('otps');
  const users = db.collection('users');

  // ── SEND OTP ──────────────────────────────────────────────────────────────
  if (action === 'send') {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await otps.deleteMany({ email });
    await otps.insertOne({
      email,
      otp: code,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min
    });

    try {
      const transporter = createTransporter();
      await transporter.sendMail({
        from: EMAIL_USER,
        to: email,
        subject: 'Your Login OTP - Video Chat Room',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#09090b;color:#fff;padding:32px;border-radius:16px;">
            <h2 style="color:#a855f7;margin-bottom:8px;">ChatRoom Login</h2>
            <p style="color:#a1a1aa;">Your secure one-time login code is:</p>
            <div style="font-size:40px;font-weight:bold;letter-spacing:12px;color:#fff;background:#18181b;padding:24px;border-radius:12px;margin:24px 0;text-align:center;">${code}</div>
            <p style="color:#71717a;font-size:13px;">This code expires in <strong>5 minutes</strong>. Do not share it.</p>
          </div>`,
      });
      return NextResponse.json({ success: true, message: 'OTP sent successfully!' });
    } catch (err: any) {
      console.error('Email send error:', err);
      return NextResponse.json({ success: false, message: 'Failed to send email. Check EMAIL_USER and EMAIL_PASS.' }, { status: 500 });
    }
  }

  // ── VERIFY OTP ────────────────────────────────────────────────────────────
  if (action === 'verify') {
    if (!otp) return NextResponse.json({ success: false, message: 'OTP is required.' }, { status: 400 });

    const record = await otps.findOne({ email, otp });
    if (!record) {
      return NextResponse.json({ success: false, message: 'Invalid or expired OTP code.' }, { status: 401 });
    }
    if (record.expiresAt < new Date()) {
      await otps.deleteMany({ email });
      return NextResponse.json({ success: false, message: 'OTP has expired.' }, { status: 401 });
    }

    await otps.deleteMany({ email });

    // Upsert user in DB (same logic as NestJS backend)
    const derivedName = email.split('@')[0];
    const user = await users.findOneAndUpdate(
      { email },
      {
        $setOnInsert: { email, name: derivedName, authProvider: 'email' },
        $set: { isEmailVerified: true, lastSeenAt: new Date() },
      },
      { upsert: true, returnDocument: 'after' }
    );

    return NextResponse.json({
      success: true,
      user: { id: user?._id?.toString(), email: user?.email, name: (user as any)?.name || derivedName },
    });
  }

  return NextResponse.json({ success: false, message: 'Invalid action.' }, { status: 400 });
}
