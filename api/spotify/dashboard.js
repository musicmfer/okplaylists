// Comprehensive Spotify dashboard data endpoint
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const accessToken = req.cookies.spotify_access_token

  if (!accessToken) {
    return res.status(401).json({ error: "Not authenticated" })
  }

  try {
    // Fetch ALL the data in parallel for maximum speed
    const [
      profileResponse,
      topArtistsResponse,
      topTracksResponse,
      recentlyPlayedResponse,
      currentlyPlayingResponse,
      savedTracksResponse,
      savedAlbumsResponse,
      followedArtistsResponse,
      playlistsResponse,
    ] = await Promise.all([
      fetch("https://api.spotify.com/v1/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      fetch("https://api.spotify.com/v1/me/top/artists?time_range=medium_term&limit=20", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      fetch("https://api.spotify.com/v1/me/top/tracks?time_range=medium_term&limit=20", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      fetch("https://api.spotify.com/v1/me/player/recently-played?limit=20", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      fetch("https://api.spotify.com/v1/me/player/currently-playing", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      fetch("https://api.spotify.com/v1/me/tracks?limit=1", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      fetch("https://api.spotify.com/v1/me/albums?limit=1", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      fetch("https://api.spotify.com/v1/me/following?type=artist&limit=1", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      fetch("https://api.spotify.com/v1/me/playlists?limit=50", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    ])

    // Process all responses
    const profileData = await profileResponse.json()
    const topArtistsData = await topArtistsResponse.json()
    const topTracksData = await topTracksResponse.json()
    const recentlyPlayedData = await recentlyPlayedResponse.json()
    const currentlyPlayingData = currentlyPlayingResponse.status === 200 ? await currentlyPlayingResponse.json() : null
    const savedTracksData = await savedTracksResponse.json()
    const savedAlbumsData = await savedAlbumsResponse.json()
    const followedArtistsData = await followedArtistsResponse.json()
    const playlistsData = await playlistsResponse.json()

    // PROCESS TOP ARTISTS & GENRES
    const topArtists =
      topArtistsData.items?.slice(0, 10).map((artist) => ({
        name: artist.name,
        image: artist.images?.[0]?.url,
        popularity: artist.popularity,
        genres: artist.genres,
      })) || []

    // Calculate genre diversity and popularity scores
    const allGenres = topArtistsData.items?.flatMap((artist) => artist.genres) || []
    const genreCounts = {}
    allGenres.forEach((genre) => {
      genreCounts[genre] = (genreCounts[genre] || 0) + 1
    })

    const topGenres = Object.entries(genreCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([genre, count]) => ({
        name: genre.charAt(0).toUpperCase() + genre.slice(1),
        count,
      }))

    // Calculate music taste insights
    const avgPopularity =
      topArtistsData.items?.reduce((sum, artist) => sum + artist.popularity, 0) / (topArtistsData.items?.length || 1)
    const genreDiversity = Object.keys(genreCounts).length
    const mainstreamScore = Math.round(avgPopularity)
    const adventurousnessScore = Math.min(100, genreDiversity * 5)

    // PROCESS TOP TRACKS
    const topTracks =
      topTracksData.items?.slice(0, 10).map((track) => ({
        name: track.name,
        artist: track.artists[0].name,
        album: track.album.name,
        image: track.album.images?.[0]?.url,
        duration: track.duration_ms,
        popularity: track.popularity,
      })) || []

    // PROCESS RECENTLY PLAYED
    const recentlyPlayed =
      recentlyPlayedData.items?.slice(0, 15).map((item) => ({
        name: item.track.name,
        artist: item.track.artists[0].name,
        playedAt: item.played_at,
        image: item.track.album.images?.[0]?.url,
      })) || []

    // PROCESS CURRENTLY PLAYING
    const currentlyPlaying = currentlyPlayingData?.item
      ? {
          name: currentlyPlayingData.item.name,
          artist: currentlyPlayingData.item.artists[0].name,
          album: currentlyPlayingData.item.album.name,
          image: currentlyPlayingData.item.album.images?.[0]?.url,
          isPlaying: currentlyPlayingData.is_playing,
          progress: currentlyPlayingData.progress_ms,
          duration: currentlyPlayingData.item.duration_ms,
        }
      : null

    // CALCULATE LISTENING STATS
    const totalPlaylists = playlistsData.total || 0
    const totalSavedTracks = savedTracksData.total || 0
    const totalSavedAlbums = savedAlbumsData.total || 0
    const totalFollowedArtists = followedArtistsData.artists?.total || 0

    // Estimate total listening time from playlists
    let totalPlaylistDuration = 0
    if (playlistsData.items) {
      totalPlaylistDuration = playlistsData.items.reduce((sum, playlist) => {
        // Rough estimate: average song is 3.5 minutes
        return sum + playlist.tracks.total * 3.5 * 60 * 1000
      }, 0)
    }

    const totalHours = Math.round(totalPlaylistDuration / (1000 * 60 * 60))

    // BUILD FINAL DASHBOARD OBJECT
    const dashboard = {
      // Basic Profile
      profile: {
        displayName: profileData.display_name,
        followers: profileData.followers?.total || 0,
        imageUrl: profileData.images?.[0]?.url,
        country: profileData.country,
        spotifyUrl: profileData.external_urls?.spotify,
      },

      // Music Taste Analysis
      musicTaste: {
        topArtists,
        topGenres,
        topTracks,
        mainstreamScore,
        adventurousnessScore,
        genreDiversity,
      },

      // Listening Activity
      activity: {
        currentlyPlaying,
        recentlyPlayed,
      },

      // Library Stats
      library: {
        totalSavedTracks,
        totalSavedAlbums,
        totalPlaylists,
        totalFollowedArtists,
        estimatedListeningHours: totalHours,
      },
    }

    res.status(200).json(dashboard)
  } catch (error) {
    console.error("Dashboard API fetch error:", error)
    res.status(500).json({ error: "Failed to fetch dashboard data", details: error.message })
  }
}
