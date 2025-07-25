// Get lyrics from Spotify API (if available) or fallback message
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const { trackId } = req.query
  const accessToken = req.cookies.spotify_access_token

  if (!accessToken) {
    return res.status(401).json({ error: "Not authenticated" })
  }

  if (!trackId) {
    return res.status(400).json({ error: "Missing trackId parameter" })
  }

  try {
    // Try to get lyrics from Spotify API (this endpoint may not be available in all regions)
    const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.status}`)
    }

    const trackData = await response.json()

    // Spotify doesn't provide lyrics directly through their public API
    // This would require a separate lyrics service integration
    res.json({
      track: trackData.name,
      artist: trackData.artists[0].name,
      lyrics: `🎵 "${trackData.name}" by ${trackData.artists[0].name}\n\n[Lyrics are not available through Spotify's public API]\n\nTo display lyrics, you would need to integrate with:\n• Genius API\n• Musixmatch API\n• LyricFind API\n• Or other lyrics providers\n\nThis is a demo showing where lyrics would appear.`,
      source: "spotify_demo",
    })
  } catch (error) {
    console.error("Lyrics API error:", error)
    res.status(500).json({
      error: "Failed to fetch lyrics",
      details: error.message,
      lyrics: "Sorry, lyrics could not be loaded at this time.",
    })
  }
}
