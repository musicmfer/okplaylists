// Refresh Spotify access token
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const refreshToken = req.cookies.spotify_refresh_token

  if (!refreshToken) {
    return res.status(401).json({ error: "No refresh token" })
  }

  try {
    const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID
    const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET

    console.log("Refreshing Spotify token...")

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    })

    if (!response.ok) {
      console.error("Token refresh failed:", response.status)
      throw new Error(`Token refresh failed: ${response.status}`)
    }

    const tokenData = await response.json()
    console.log("Token refresh successful")

    // Update access token cookie
    const cookieOptions = "HttpOnly; Secure; SameSite=Strict; Max-Age=3600; Path=/"
    res.setHeader("Set-Cookie", `spotify_access_token=${tokenData.access_token}; ${cookieOptions}`)

    res.json({ success: true })
  } catch (error) {
    console.error("Token refresh error:", error)
    res.status(500).json({ error: "Failed to refresh token" })
  }
}
