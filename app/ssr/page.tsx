import React from 'react'
import { getAlbums } from '../components/getAlbums';
import AlbumCard from '../components/AlbumCard';
import { Album } from '../components/AlbumInterface';
import MetricsScript from '../components/MetricsScript';
import Head from 'next/head';

const SSRPage = async () => {
  let albums: Album[] = []

  try {
    albums = await getAlbums();
  } catch (error) {
    console.error('Error fetching albums:', error);
  }
  
  return (   
    <>
      <Head>
        <title>Music Album Catalog</title>
        <meta
          name="description"
          content="Browse a collection of music albums from various artists and labels."
        />
        <meta property="og:title" content="Music Album Catalog" />
        <meta
          property="og:description"
          content="Browse a collection of music albums from various artists and labels."
        />
        <meta property="og:image" content="/placeholder-album.jpg" />
      </Head>
      <MetricsScript />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {albums.map((album: Album) => (
          <AlbumCard key={album.id} album={album}/>
        ))}
      </div>
    </>   
  );
}

export default SSRPage