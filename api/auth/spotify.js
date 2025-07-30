// Spotify OAuth initiation endpoint
export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID
  const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI

  // ADD DEBUGGING LOGS
  console.log("🔍 Spotify OAuth Debug Info:")
  console.log("CLIENT_ID:", CLIENT_ID ? "✅ Set" : "❌ Missing")
  console.log("REDIRECT_URI:", REDIRECT_URI)
  console.log("Request Host:", req.headers.host)
  console.log("Request Protocol:", req.headers["x-forwarded-proto"] || "http")

  if (!CLIENT_ID || !REDIRECT_URI) {
    console.error("Missing Spotify configuration:", { CLIENT_ID: !!CLIENT_ID, REDIRECT_URI: !!REDIRECT_URI })
    return res.status(500).json({ error: "Missing Spotify configuration" })
  }

  // ALL THE SCOPES for maximum data access
  const scopes = [
    "playlist-read-private",
    "playlist-read-collaborative",
    "user-read-private",
    "user-read-email",
    "user-top-read",
    "user-read-recently-played",
    "user-read-currently-playing",
    "user-read-playback-state",
    "user-read-playback-position",
    "user-modify-playback-state",
    "user-library-read",
    "user-follow-read",
  ].join(" ")

  const state = `okplaylists_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`

  const authUrl = new URL("https://accounts.spotify.com/authorize")
  authUrl.searchParams.append("client_id", CLIENT_ID)
  authUrl.searchParams.append("response_type", "code")
  authUrl.searchParams.append("redirect_uri", REDIRECT_URI)
  authUrl.searchParams.append("scope", scopes)
  authUrl.searchParams.append("state", state)
  authUrl.searchParams.append("show_dialog", "true")

  const cookieOptions = "HttpOnly; Secure; SameSite=None; Max-Age=600; Path=/"
  res.setHeader("Set-Cookie", `spotify_state=${state}; ${cookieOptions}`)

  console.log("Generated state:", state)
  console.log("🚀 Redirecting to Spotify auth:", authUrl.toString())

  res.redirect(authUrl.toString())
}
