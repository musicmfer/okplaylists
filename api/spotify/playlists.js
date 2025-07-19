// Get user's Spotify playlists with pagination and filtering
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
    console.log("Playlists API: Fetching user profile to get user ID for filtering...")
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

    let allPlaylists = []
    let nextUrl = "https://api.spotify.com/v1/me/playlists?limit=50" // Max limit per request

    console.log("Playlists API: Starting pagination to fetch all playlists...")
    while (nextUrl) {
      const playlistsResponse = await fetch(nextUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!playlistsResponse.ok) {
        const errorBody = await playlistsResponse.text()
        console.error(
          "Playlists API: Spotify Playlists API error during pagination:",
          playlistsResponse.status,
          playlistsResponse.statusText,
          errorBody,
        )
        if (playlistsResponse.status === 401) {
          throw new Error("Token expired or invalid during playlist fetch.")
        }
        throw new Error(`Spotify Playlists API error: ${playlistsResponse.status} - ${errorBody}`)
      }

      const data = await playlistsResponse.json()
      allPlaylists = allPlaylists.concat(data.items)
      nextUrl = data.next // Get the URL for the next page, or null if no more pages
      console.log(
        `Playlists API: Fetched ${data.items.length} playlists. Total so far: ${allPlaylists.length}. Next URL: ${nextUrl ? "Yes" : "No"}`,
      )
    }

    console.log(`Playlists API: Finished fetching all raw playlists. Total: ${allPlaylists.length}`)

    // Filter playlists: only public and owned by the current user
    const filteredPlaylists = allPlaylists.filter((playlist) => {
      const isPublic = playlist.public === true
      const isOwnedByUser = playlist.owner.id === currentUserId

      if (!isPublic) {
        // console.log(`Playlists API: Filtering out private playlist: "${playlist.name}" (ID: ${playlist.id})`)
      }
      if (!isOwnedByUser) {
        // console.log(
        //   `Playlists API: Filtering out playlist not owned by user: "${playlist.name}" (ID: ${playlist.id}) owned by ${playlist.owner.display_name}`,
        // )
      }
      return isPublic && isOwnedByUser
    })

    console.log(`Playlists API: ${filteredPlaylists.length} playlists after filtering (public and owned by user).`)

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
