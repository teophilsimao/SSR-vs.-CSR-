'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAlbums } from '../components/getAlbums';
import MetricsScript from '../components/MetricsScript';
import ClientAlbumCard from '../components/ClientAlbumCard';
import { Album } from '../components/AlbumInterface';

const CSRpage = () => {
  const [albums, setAlbums] = useState<Album[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const albumsData = await getAlbums();
        setAlbums(albumsData);
      } catch (error) {
        console.error('Error fetching albums:', error);
        setAlbums([]);
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {albums.map((album: Album) => (
          <ClientAlbumCard key={album.id} album={album}/>
        ))}
      </div>

      <MetricsScript pageType='CSR' />
    </div>
  );
};

export default CSRpage;