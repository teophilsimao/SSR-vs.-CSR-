import React, {Suspense} from 'react'
import Link from 'next/link'
import Image from 'next/image';
import { getAlbums } from '../components/getAlbums';

interface Album {
  id: string;
  title: string;
  artist: string;
  date: string;
  country: string;
  coverUrl: string;
}

function Loading() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Albums (SSR Version)</h1>
      <Link href="/csr" className="text-blue-500 hover:underline mb-4 inline-block">
        View CSR Version
      </Link>
      <div className="flex justify-center items-center h-64">
        <p className="text-xl">Loading albums...</p>
      </div>
    </div>
  );
}

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
          <div key={album.id} className="border rounded-lg overflow-hidden shadow-lg">
            <div className="h-48 bg-gray-200 relative">
              {album.coverUrl && (
                  <Image
                    src={album.coverUrl}
                    alt={`${album.title} cover`}
                    fill // Replaces w-full h-full
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" // Optional: adjust based on your grid layout
                    priority={false} // Set to true for above-the-fold images
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
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <SSRPage />
    </Suspense>
  );
}