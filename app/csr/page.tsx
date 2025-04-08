'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAlbums } from '../components/getAlbums';

const CSRpage = () => {
  const [albums, setAlbums] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const albumsData = await getAlbums();
        setAlbums(albumsData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching albums:', error);
        setAlbums([]);
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Albums (CSR Version)</h1>
      <Link href="/ssr" className="text-blue-500 hover:underline mb-4 inline-block">
        View SSR Version
      </Link>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-xl">Loading albums...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {albums.map((album) => (
            <div key={album.id} className="border rounded-lg overflow-hidden shadow-lg">
              <div className="h-48 bg-gray-200 relative">
                {album.coverUrl && (
                  <img
                    src={album.coverUrl}
                    alt={`${album.title} cover`}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="p-4">
                <h2 className="text-xl font-bold">{album.title}</h2>
                <p className="text-gray-700">Artist: {album.artist}</p>
                <p className="text-gray-600">Released: {album.date}</p>
                <p className="text-gray-600">Country: {album.country}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CSRpage;