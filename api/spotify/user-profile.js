// Get user's Spotify profile information, including top artists and genres.
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const accessToken = req.cookies.spotify_access_token

  if (!accessToken) {
    return res.status(401).json({ error: "Not authenticated" })
  }

  try {
    // Fetch basic user profile and top artists in parallel
    const [profileResponse, topArtistsResponse] = await Promise.all([
      fetch("https://api.spotify.com/v1/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      fetch("https://api.spotify.com/v1/me/top/artists?time_range=medium_term&limit=10", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    ])

    if (!profileResponse.ok) {
      throw new Error(`Spotify Profile API error: ${profileResponse.status}`)
    }
    if (!topArtistsResponse.ok) {
      throw new Error(`Spotify Top Artists API error: ${topArtistsResponse.status}`)
    }

    const profileData = await profileResponse.json()
    const topArtistsData = await topArtistsResponse.json()

    // Process top artists
    const topArtists = topArtistsData.items.slice(0, 5).map((artist) => artist.name)

    // Calculate top genres from all top artists
    const genreCounts = {}
    topArtistsData.items.forEach((artist) => {
      artist.genres.forEach((genre) => {
        genreCounts[genre] = (genreCounts[genre] || 0) + 1
      })
    })

    const topGenres = Object.entries(genreCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([genre]) => genre.charAt(0).toUpperCase() + genre.slice(1)) // Capitalize genres

    // Construct the final user profile object
    const userProfile = {
      displayName: profileData.display_name,
      followers: profileData.followers.total,
      imageUrl: profileData.images?.[0]?.url || null,
      spotifyUrl: profileData.external_urls.spotify,
      topArtists,
      topGenres,
    }

    res.status(200).json(userProfile)
  } catch (error) {
    console.error("User Profile API fetch error:", error)
    res.status(500).json({ error: "Failed to fetch user profile", details: error.message })
  }
}
