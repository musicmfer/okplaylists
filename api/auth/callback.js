// Spotify OAuth callback endpoint
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const { code, state, error } = req.query

  if (error) {
    return res.redirect(`/?error=${encodeURIComponent(error)}`)
  }

  if (!code || !state) {
    return res.redirect("/?error=missing_parameters")
  }

  // Validate state parameter
  const storedState = req.cookies.spotify_state
  if (state !== storedState) {
    return res.redirect("/?error=invalid_state")
  }

  try {
    const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID
    const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET
    const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI

    // Exchange code for access token
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: REDIRECT_URI,
      }),
    })

    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${tokenResponse.status}`)
    }

    const tokenData = await tokenResponse.json()

    // Set secure cookies with tokens
    const cookieOptions = "HttpOnly; Secure; SameSite=Strict; Max-Age=3600" // 1 hour

    res.setHeader("Set-Cookie", [
      `spotify_access_token=${tokenData.access_token}; ${cookieOptions}`,
      `spotify_refresh_token=${tokenData.refresh_token}; ${cookieOptions}; Max-Age=2592000`, // 30 days
      `spotify_expires_in=${tokenData.expires_in}; ${cookieOptions}`,
    ])

    // Redirect back to main app with success
    res.redirect("/?spotify_connected=true")
  } catch (error) {
    console.error("Spotify callback error:", error)
    res.redirect(`/?error=${encodeURIComponent("authentication_failed")}`)
  }
}
