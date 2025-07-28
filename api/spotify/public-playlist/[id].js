// Get detailed information for any public Spotify playlist (no user auth required)
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const { id } = req.query // Get playlist ID from the URL

  if (!id) {
    return res.status(400).json({ error: "Missing playlist ID" })
  }

  try {
    const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID
    const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET

    if (!CLIENT_ID || !CLIENT_SECRET) {
      console.error("Missing Spotify configuration")
      return res.status(500).json({ error: "Missing Spotify configuration" })
    }

    // Get access token using Client Credentials flow (no user auth needed)
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error("Token request failed:", tokenResponse.status, errorText)
      throw new Error(`Token request failed: ${tokenResponse.status}`)
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    // 1. Fetch playlist details
    const playlistDetailsResponse = await fetch(`https://api.spotify.com/v1/playlists/${id}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!playlistDetailsResponse.ok) {
      const errorBody = await playlistDetailsResponse.text()
      if (playlistDetailsResponse.status === 404) {
        return res.status(404).json({ error: "Playlist not found or is private" })
      }
      return res.status(playlistDetailsResponse.status).json({
        error: `Failed to fetch playlist details: ${playlistDetailsResponse.statusText}`,
        details: errorBody,
      })
    }
    const playlistData = await playlistDetailsResponse.json()

    // Check if playlist is public
    if (!playlistData.public) {
      return res.status(403).json({
        error: "This playlist is private and cannot be accessed",
        details: "Only public playlists can be explored without authentication",
      })
    }

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
      cover: playlistData.images?.[0]?.url || null,
      tracks: trackList,
    })
  } catch (error) {
    console.error("Public Playlist API: Error fetching playlist details:", error)
    res.status(500).json({ error: "Failed to fetch playlist details", details: error.message })
  }
}
