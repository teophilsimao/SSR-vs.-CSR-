'use client';

import React, { useState, useEffect } from 'react';
import { getAlbums } from '../components/getAlbums';
import ClientAlbumCard from '../components/ClientAlbumCard';
import AlbumCard from '../components/AlbumCard';
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {albums.map((album: Album) => (
          <AlbumCard key={album.id} album={album}/>
        ))}
      </div>
  );
};

export default CSRpage;