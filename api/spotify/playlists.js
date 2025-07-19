// Get user's Spotify playlists
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const accessToken = req.cookies.spotify_access_token

  if (!accessToken) {
    return res.status(401).json({ error: "Not authenticated" })
  }

  try {
    console.log("Fetching playlists from Spotify API...")

    const response = await fetch("https://api.spotify.com/v1/me/playlists?limit=50", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      console.error("Spotify API error:", response.status, response.statusText)
      if (response.status === 401) {
        // Token expired, try to refresh
        return res.status(401).json({ error: "Token expired" })
      }
      throw new Error(`Spotify API error: ${response.status}`)
    }

    const data = await response.json()
    console.log(`Successfully fetched ${data.items.length} playlists`)

    // Transform data for frontend
    const playlists = data.items.map((playlist) => ({
      id: playlist.id,
      name: playlist.name,
      description: playlist.description || "No description available",
      tracks: playlist.tracks.total,
      cover: playlist.images[0]?.url || null,
      spotifyUrl: playlist.external_urls.spotify,
      owner: playlist.owner.display_name,
      public: playlist.public,
    }))

    res.json({ playlists })
  } catch (error) {
    console.error("Playlists fetch error:", error)
    res.status(500).json({ error: "Failed to fetch playlists" })
  }
}
