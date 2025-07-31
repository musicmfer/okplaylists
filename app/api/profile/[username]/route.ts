import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request, { params }: { params: { username: string } }) {
  const { username } = params

  if (!username) {
    return NextResponse.json({ error: "Farcaster username is required" }, { status: 400 })
  }

  try {
    // Fetch user details by farcaster_username
    const [user] = await sql`
      SELECT
        id,
        wallet_address,
        farcaster_id,
        farcaster_username,
        farcaster_pfp_url,
        spotify_user_id,
        spotify_display_name,
        created_at
      FROM users
      WHERE farcaster_username = ${username}
    `

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Fetch onchain playlists shared by this user
    const onchainPlaylists = await sql`
      SELECT
        id,
        playlist_name,
        spotify_url,
        farcaster_cast_url,
        cover_image_url,
        description,
        total_tracks,
        total_duration,
        owner_display_name,
        communities,
        created_at
      FROM onchain_playlists
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
    `

    return NextResponse.json({
      profile: {
        walletAddress: user.wallet_address,
        farcasterUsername: user.farcaster_username,
        farcasterPfpUrl: user.farcaster_pfp_url,
        spotifyDisplayName: user.spotify_display_name,
        createdAt: user.created_at,
      },
      playlists: onchainPlaylists,
    })
  } catch (error: any) {
    console.error(`Error fetching profile for ${username}:`, error)
    return NextResponse.json(
      { error: `Failed to fetch profile for ${username}`, details: error.message },
      { status: 500 },
    )
  }
}
