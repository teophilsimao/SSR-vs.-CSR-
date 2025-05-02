import Image from 'next/image';
import { Album } from './AlbumInterface';

const AlbumCard = ({ album }: { album: Album }) => {
  return (
    <div className="border rounded-lg overflow-hidden shadow-lg bg-white h-auto min-h-96">
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
        <h2 className="text-xl font-bold line-clamp-2">{album.title}</h2>
        <p className="text-gray-700">Artist: {album.artist}</p>
        <p className="text-gray-600">Released: {album.date}</p>
        <p className="text-gray-600">Country: {album.country}</p>
        <div className="mt-4 text-sm text-gray-800">
          <p><strong>Track Count:</strong> {album.trackCount}</p>
          <p><strong>Label:</strong> {album.label}</p>
        </div>
      </div>
    </div>
  );
};

export default AlbumCard;