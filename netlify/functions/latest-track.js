const fetch = require('node-fetch');

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const ARTIST_ID = '1nZ7dtTkCiDnQidTP2agxm'; // Your artist ID

async function getAccessToken() {
  const auth = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${auth}`
    },
    body: 'grant_type=client_credentials'
  });
  const data = await response.json();
  return data.access_token;
}

async function getLatestTrack(token) {
  // Get artist's albums/singles
  const albumsResponse = await fetch(
    `https://api.spotify.com/v1/artists/${ARTIST_ID}/albums?include_groups=album,single&market=US&limit=50`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  const albumsData = await albumsResponse.json();
  const albums = albumsData.items || [];

  // Sort by release date (newest first)
  albums.sort((a, b) => new Date(b.release_date) - new Date(a.release_date));

  // Get tracks from the latest album/single
  if (albums.length > 0) {
    const latestAlbum = albums[0];
    const tracksResponse = await fetch(
      `https://api.spotify.com/v1/albums/${latestAlbum.id}/tracks`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const tracksData = await tracksResponse.json();
    const tracks = tracksData.items || [];
    
    if (tracks.length > 0) {
      return {
        trackId: tracks[0].id,
        trackName: tracks[0].name,
        albumArt: latestAlbum.images[0]?.url || '',
        albumName: latestAlbum.name
      };
    }
  }
  return null;
}

exports.handler = async (event, context) => {
  try {
    const token = await getAccessToken();
    const trackInfo = await getLatestTrack(token);
    
    if (trackInfo) {
      return {
        statusCode: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
        },
        body: JSON.stringify(trackInfo)
      };
    }
    
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'No tracks found' })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal error' })
    };
  }
};
