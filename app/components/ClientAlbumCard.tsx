'use client';
import React, { useState } from 'react'
import Image from 'next/image';
import { Album } from './AlbumInterface';

const ClientAlbumCard = ({ album }: { album: Album }) => {
  const [expanded, setExpanded] = useState(false)
  
  return (
    <div 
      className="border rounded-lg overflow-hidden shadow-lg bg-white"
      style={{ 
        height: expanded ? 'auto' : '350px',
        transition: 'height 0.3s ease',
        gridRowEnd: expanded ? 'span 2' : 'auto'
      }}
      onClick={() => setExpanded((prev) => !prev)}
    >
      <div className="h-48 bg-gray-200 relative">
        {album.coverUrl && (
          <Image
            src={album.coverUrl}
            alt={`${album.title} cover`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority={false}
          />
        )}
      </div>
      <div className="p-4">
        <h2 className="text-xl font-bold">{album.title}</h2>
        <p className="text-gray-700">Artist: {album.artist}</p>
        <p className="text-gray-600">Released: {album.date}</p>
        <p className="text-gray-600">Country: {album.country}</p>
        
        {expanded && (
          <div className="mt-4 text-sm text-gray-800">
            <p><strong>Track Count:</strong> {album.trackCount} </p>
            <p><strong>Label:</strong> {album.label} </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ClientAlbumCard