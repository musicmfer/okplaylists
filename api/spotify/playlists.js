// Get user's Spotify playlists
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const accessToken = req.cookies.spotify_access_token
  console.log("Playlists API: Access Token from cookies:", accessToken ? "Present" : "Missing")

  if (!accessToken) {
    console.log("Playlists API: No access token found in cookies. Returning 401.")
    return res.status(401).json({ error: "Not authenticated" })
  }

  try {
    console.log("Playlists API: Fetching playlists from Spotify API with token...")

    const response = await fetch("https://api.spotify.com/v1/me/playlists?limit=50", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error("Playlists API: Spotify API error:", response.status, response.statusText, errorBody)
      if (response.status === 401) {
        // Token expired, try to refresh
        return res.status(401).json({ error: "Token expired or invalid" })
      }
      throw new Error(`Spotify API error: ${response.status} - ${errorBody}`)
    }

    const data = await response.json()
    console.log(`Playlists API: Successfully fetched ${data.items.length} playlists`)

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
    console.error("Playlists API: Playlists fetch error:", error)
    res.status(500).json({ error: "Failed to fetch playlists", details: error.message })
  }
}
