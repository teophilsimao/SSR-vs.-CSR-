import music from '../../public/music.png'
import { Album as AlbumDetails } from './AlbumInterface';

// Define the types more accurately
interface Album {
  id: string;
  title: string;
  date?: string;
  country?: string;
  'artist-credit'?: {
    name?: string;
  }[];
  'label-info'?: {
    label?: {
      id: string;
      name: string;
    };
  }[];
  'track-count'?: number;
}

// Make it work in both client and server environments
export async function getAlbums(): Promise<AlbumDetails[]> {
  const res = await fetch(
    'https://musicbrainz.org/ws/2/release?query=primarytype:album&fmt=json&limit=100',
    {
      cache: 'no-store',
      headers: {
        'User-Agent': 'TechPhoenixComparisonProject/1.0 (teophilsimao@gmail.com)',
      },
    }
  );
  
  if (!res.ok) throw new Error('Failed to fetch album data');
  const data = await res.json();
  
  // Process albums with proper error handling
  const albumsWithDetails = await Promise.all(
    data.releases.map(async (album: Album) => {
      try {
        // Attempt to fetch cover art
        const coverRes = await fetch(
          `https://coverartarchive.org/release/${album.id}`,
          {
            cache: 'no-store',
            redirect: 'follow',
          }
        );
        
        // Default to placeholder image
        let coverUrl = typeof music === 'object' ? music.src : '/placeholder-album.jpg';
        
        // If cover art fetched successfully, use it
        if (coverRes.ok) {
          const coverData = await coverRes.json();
          if (coverData.images?.length > 0) {
            coverUrl = coverData.images[0].thumbnails.small || coverData.images[0].image;
          }
        }
        
        // Extract label name properly or use default
        const labelName = album['label-info']?.[0]?.label?.name || 'Unknown';
        
        // Return the album details
        return {
          id: album.id,
          title: album.title,
          artist: album['artist-credit']?.[0]?.name || 'Unknown Artist',
          date: album.date || 'Unknown Date',
          label: labelName,
          country: album.country || 'Unknown',
          coverUrl,
          trackCount: album['track-count'] || 0
        };
      } catch (error) {
        console.error(`Error fetching details for album ${album.id}:`, error);
        // Return album with placeholder image in case of error
        return {
          id: album.id,
          title: album.title,
          artist: album['artist-credit']?.[0]?.name || 'Unknown Artist',
          date: album.date || 'Unknown Date',
          label: 'Unknown',
          country: album.country || 'Unknown',
          coverUrl: typeof music === 'object' ? music.src : '/placeholder-album.jpg',
          trackCount: album['track-count'] || 0
        };
      }
    })
  );
  
  return albumsWithDetails;
}