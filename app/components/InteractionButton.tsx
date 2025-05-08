'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import music from '../../public/music.png'
import MetricsScript from './MetricsScript';


const InteractionButton = () => {
  const [showImage, setShowImage] = useState(false);

  const handleClick = () => {
    setShowImage(true);
    console.log('🖱️ Button clicked - interaction detected for INP measurement');
  };

  return (
    <>
      <div className="mb-8 flex flex-col items-center">
        {showImage && (
          <div className="mb-6 w-full max-w-3xl">
            <Image 
              src={music} 
              alt="Random album cover" 
              className="w-full rounded-lg shadow-lg"
            />
          </div>
        )}
        
        <button
          onClick={handleClick}
          className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg shadow hover:bg-blue-700 transition-colors"
        >
          Click
        </button>
        
        <p className="mt-4 text-gray-600 text-sm">
          (shows a picture and sends metrics)
        </p>
      </div>

      <MetricsScript />
    </>
  );
};

export default InteractionButton;