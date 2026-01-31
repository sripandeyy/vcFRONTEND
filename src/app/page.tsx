"use client";

import React, { useState } from 'react';
import LandingPage from '@/components/LandingPage';
import VideoRoom from '@/components/VideoRoom';

export default function Home() {
  const [roomData, setRoomData] = useState<{ userName: string; roomId: string } | null>(null);

  const handleJoin = (data: { userName: string; roomId: string }) => {
    setRoomData(data);
  };

  const handleLeave = () => {
    setRoomData(null);
  };

  if (!roomData) {
    return <LandingPage onJoin={handleJoin} />;
  }

  return (
    <VideoRoom
      roomId={roomData.roomId}
      userName={roomData.userName}
      onLeave={handleLeave}
    />
  );
}
