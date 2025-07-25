// Mock lyrics endpoint (since Spotify doesn't provide lyrics directly)
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const { track, artist } = req.query

  if (!track || !artist) {
    return res.status(400).json({ error: "Missing track or artist parameter" })
  }

  // For now, return a message about lyrics
  // In a real app, you'd integrate with a lyrics API like Genius or LyricFind
  res.json({
    track,
    artist,
    lyrics: `🎵 Lyrics for "${track}" by ${artist}\n\n[Lyrics would be displayed here]\n\nNote: This is a demo. In production, you would integrate with a lyrics API like Genius, Musixmatch, or LyricFind to display actual lyrics.`,
    source: "demo",
  })
}
