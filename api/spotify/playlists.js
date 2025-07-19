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
    console.log("Playlists API: Fetching user profile to get user ID...")
    // Fetch user profile to get the current user's ID
    const userProfileResponse = await fetch("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!userProfileResponse.ok) {
      const errorBody = await userProfileResponse.text()
      console.error(
        "Playlists API: Spotify User Profile API error:",
        userProfileResponse.status,
        userProfileResponse.statusText,
        errorBody,
      )
      throw new Error(`Spotify User Profile API error: ${userProfileResponse.status} - ${errorBody}`)
    }
    const userProfile = await userProfileResponse.json()
    const currentUserId = userProfile.id
    console.log("Playlists API: Current user ID:", currentUserId)

    console.log("Playlists API: Fetching playlists from Spotify API with token...")

    const playlistsResponse = await fetch("https://api.spotify.com/v1/me/playlists?limit=50", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!playlistsResponse.ok) {
      const errorBody = await playlistsResponse.text()
      console.error(
        "Playlists API: Spotify Playlists API error:",
        playlistsResponse.status,
        playlistsResponse.statusText,
        errorBody,
      )
      if (playlistsResponse.status === 401) {
        return res.status(401).json({ error: "Token expired or invalid" })
      }
      throw new Error(`Spotify Playlists API error: ${playlistsResponse.status} - ${errorBody}`)
    }

    const data = await playlistsResponse.json()
    console.log(`Playlists API: Successfully fetched ${data.items.length} raw playlists`)

    // Filter playlists: only public and owned by the current user
    const filteredPlaylists = data.items.filter((playlist) => {
      const isPublic = playlist.public === true
      const isOwnedByUser = playlist.owner.id === currentUserId

      if (!isPublic) {
        console.log(`Playlists API: Filtering out private playlist: "${playlist.name}" (ID: ${playlist.id})`)
      }
      if (!isOwnedByUser) {
        console.log(
          `Playlists API: Filtering out playlist not owned by user: "${playlist.name}" (ID: ${playlist.id}) owned by ${playlist.owner.display_name}`,
        )
      }
      return isPublic && isOwnedByUser
    })

    console.log(`Playlists API: ${filteredPlaylists.length} playlists after filtering.`)

    // Transform data for frontend
    const playlists = filteredPlaylists.map((playlist) => {
      const coverUrl = playlist.images && playlist.images.length > 0 ? playlist.images[0].url : null

      if (!playlist.images || playlist.images.length === 0) {
        console.warn(`Playlists API: Playlist "${playlist.name}" (ID: ${playlist.id}) has no images.`)
      }

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
