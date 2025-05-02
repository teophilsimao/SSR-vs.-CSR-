import React from 'react'
import { getAlbums } from '../components/getAlbums';
import AlbumCard from '../components/AlbumCard';
import { Album } from '../components/AlbumInterface';

const SSRPage = async () => {
  const albums = await getAlbums();
  
  return (      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {albums.map((album: Album) => (
          <AlbumCard key={album.id} album={album}/>
        ))}
      </div>
  );
}

export default SSRPage