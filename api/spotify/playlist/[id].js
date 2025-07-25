// Get detailed information for a single Spotify playlist
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const { id } = req.query // Get playlist ID from the URL
  const accessToken = req.cookies.spotify_access_token

  if (!accessToken) {
    return res.status(401).json({ error: "Not authenticated" })
  }

  if (!id) {
    return res.status(400).json({ error: "Missing playlist ID" })
  }

  try {
    // 1. Fetch playlist details
    const playlistDetailsResponse = await fetch(`https://api.spotify.com/v1/playlists/${id}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!playlistDetailsResponse.ok) {
      const errorBody = await playlistDetailsResponse.text()
      if (playlistDetailsResponse.status === 401) {
        return res.status(401).json({ error: "Token expired or invalid" })
      }
      return res.status(playlistDetailsResponse.status).json({
        error: `Failed to fetch playlist details: ${playlistDetailsResponse.statusText}`,
        details: errorBody,
      })
    }
    const playlistData = await playlistDetailsResponse.json()

    // 2. Fetch playlist tracks
    let allTracks = []
    let tracksNextUrl = `https://api.spotify.com/v1/playlists/${id}/tracks?limit=100`

    while (tracksNextUrl) {
      const tracksResponse = await fetch(tracksNextUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!tracksResponse.ok) {
        const errorBody = await tracksResponse.text()
        throw new Error(`Spotify Tracks API error: ${tracksResponse.status} - ${errorBody}`)
      }

      const tracksData = await tracksResponse.json()
      allTracks = allTracks.concat(tracksData.items)
      tracksNextUrl = tracksData.next
    }

    // Calculate total duration
    const totalDurationMs = allTracks.reduce((sum, item) => sum + (item.track?.duration_ms || 0), 0)
    const totalDurationMinutes = Math.floor(totalDurationMs / 60000)
    const totalDurationSeconds = Math.floor((totalDurationMs % 60000) / 1000)
    const formattedDuration = `${totalDurationMinutes}m ${totalDurationSeconds}s`

    // Extract track names
    const trackList = allTracks.map((item) => ({
      name: item.track?.name || "Unknown Track",
      artist: item.track?.artists?.[0]?.name || "Unknown Artist",
    }))

    res.json({
      id: playlistData.id,
      name: playlistData.name,
      description: playlistData.description || "No description available.",
      totalTracks: playlistData.tracks.total,
      totalDuration: formattedDuration,
      spotifyUrl: playlistData.external_urls.spotify,
      owner: playlistData.owner.display_name,
      public: playlistData.public,
      tracks: trackList,
    })
  } catch (error) {
    console.error("Playlist Details API: Error fetching playlist details:", error)
    res.status(500).json({ error: "Failed to fetch playlist details", details: error.message })
  }
}
