// Logout from Spotify
export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  console.log("Logging out from Spotify...")

  // Clear all Spotify cookies
  const clearCookie = "HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/"

  res.setHeader("Set-Cookie", [
    `spotify_access_token=; ${clearCookie}`,
    `spotify_refresh_token=; ${clearCookie}`,
    `spotify_expires_in=; ${clearCookie}`,
    `spotify_state=; ${clearCookie}`,
  ])

  res.json({ success: true })
}
