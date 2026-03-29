"use client";

import React, { Suspense, useState } from 'react';
import LandingPage from '@/components/LandingPage';
import VideoRoom from '@/components/VideoRoom';

// Prevent Next.js from trying to statically prerender this page
// (it uses useSearchParams + useSession which require runtime context)
export const dynamic = 'force-dynamic';

function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
    </div>
  );
}

export default function Home() {
  const [roomData, setRoomData] = useState<{ userName: string; roomId: string } | null>(null);

  const handleJoin = (data: { userName: string; roomId: string }) => {
    setRoomData(data);
  };

  const handleLeave = () => {
    setRoomData(null);
  };

  if (!roomData) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <LandingPage onJoin={handleJoin} />
      </Suspense>
    );
  }

  return (
    <VideoRoom
      roomId={roomData.roomId}
      userName={roomData.userName}
      onLeave={handleLeave}
    />
  );
}
