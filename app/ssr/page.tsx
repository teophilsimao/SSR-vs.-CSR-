import React from 'react'
import Link from 'next/link'
import { getAlbums } from '../components/getAlbums';
import MetricsScript from '../components/MetricsScript';
import ServerAlbumCard from '../components/ServerAlbumCard';
import { Album } from '../components/AlbumInterface';

const SSRPage = async () => {
  const albums = await getAlbums();
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Albums (SSR Version)</h1>
      <Link href="/csr" className="text-blue-500 hover:underline mb-4 inline-block">
        View CSR Version
      </Link>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {albums.map((album: Album) => (
          <ServerAlbumCard key={album.id} album={album}/>
        ))}
      </div>
      <MetricsScript pageType='SSR' />
    </div>
  );
}

export default SSRPage