import music from '../../public/music.png'

export async function getAlbums() {
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
  
    const albumsWithDetails = await Promise.all(
      data.releases.map(async (album: any) => {
        try {
          const coverRes = await fetch(
            `https://coverartarchive.org/release/${album.id}`,
            {
              cache: 'no-store',
              redirect: 'follow',
            }
          );
  
          let coverUrl = {music};
  
          if (!coverRes.ok) {
            return {
              id: album.id,
              title: album.title,
              artist: album['artist-credit']?.[0]?.name || 'Unknown Artist',
              date: album.date || 'Unknown Date',
              country: album.country || 'Unknown',
              coverUrl,
            };
          }
  
          const coverData = await coverRes.json();
          if (coverData.images?.length > 0) {
            coverUrl = coverData.images[0].thumbnails.small || coverData.images[0].image;
          }
  
          return {
            id: album.id,
            title: album.title,
            artist: album['artist-credit']?.[0]?.name || 'Unknown Artist',
            date: album.date || 'Unknown Date',
            country: album.country || 'Unknown',
            coverUrl,
          };
        } catch (error) {
          console.error(`Error fetching details for album ${album.id}:`, error);
          return {
            id: album.id,
            title: album.title,
            artist: album['artist-credit']?.[0]?.name || 'Unknown Artist',
            date: album.date || 'Unknown Date',
            country: album.country || 'Unknown',
            coverUrl: {music},
          };
        }
      })
    );
  
    return albumsWithDetails;
  }