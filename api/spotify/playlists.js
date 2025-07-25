// Get user's Spotify playlists with pagination and filtering
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const accessToken = req.cookies.spotify_access_token

  if (!accessToken) {
    return res.status(401).json({ error: "Not authenticated" })
  }

  try {
    // Fetch user profile to get the current user's ID
    const userProfileResponse = await fetch("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!userProfileResponse.ok) {
      const errorBody = await userProfileResponse.text()
      throw new Error(`Spotify User Profile API error: ${userProfileResponse.status} - ${errorBody}`)
    }
    const userProfile = await userProfileResponse.json()
    const currentUserId = userProfile.id

    let allPlaylists = []
    let nextUrl = "https://api.spotify.com/v1/me/playlists?limit=50"

    while (nextUrl) {
      const playlistsResponse = await fetch(nextUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!playlistsResponse.ok) {
        const errorBody = await playlistsResponse.text()
        throw new Error(`Spotify Playlists API error: ${playlistsResponse.status} - ${errorBody}`)
      }

      const data = await playlistsResponse.json()
      allPlaylists = allPlaylists.concat(data.items)
      nextUrl = data.next
    }

    // Filter playlists: only public and owned by the current user
    const filteredPlaylists = allPlaylists.filter((playlist) => {
      return playlist.public === true && playlist.owner.id === currentUserId
    })

    // Transform data for frontend
    const playlists = filteredPlaylists.map((playlist) => {
      const coverUrl = playlist.images && playlist.images.length > 0 ? playlist.images[0].url : null
      return {
        id: playlist.id,
        name: playlist.name,
        description: playlist.description || "No description available",
        tracks: playlist.tracks.total,
        cover: coverUrl,
        spotifyUrl: playlist.external_urls.spotify,
        owner: playlist.owner.display_name,
        public: playlist.public,
      }
    })

    res.json({ playlists })
  } catch (error) {
    console.error("Playlists API: Playlists fetch error:", error)
    res.status(500).json({ error: "Failed to fetch playlists", details: error.message })
  }
}
