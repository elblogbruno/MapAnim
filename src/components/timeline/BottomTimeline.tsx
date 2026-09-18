import React from 'react';
import { PlaybackControls } from './PlaybackControls';
import { TimelineTracks } from './TimelineTracks';

export const BottomTimeline: React.FC = () => {
  return (
    <div className="h-28 md:h-36 bg-studio-900 border-t border-studio-800/80 flex flex-col z-30 flex-shrink-0">
      <PlaybackControls />
      <TimelineTracks />
    </div>
  );
};
