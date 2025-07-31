import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request, { params }: { params: { slug: string } }) {
  const { slug } = params

  if (!slug) {
    return NextResponse.json({ error: "Community slug is required" }, { status: 400 })
  }

  try {
    // Fetch community details
    const [community] = await sql`
      SELECT id, name, slug, description, contract_address, blockchain
      FROM communities
      WHERE slug = ${slug}
    `

    if (!community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 })
    }

    // Fetch onchain playlists for this community
    // We'll filter by communities array containing the community name
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
        created_at
      FROM onchain_playlists
      WHERE ${community.name} = ANY(communities)
      ORDER BY created_at DESC
    `

    return NextResponse.json({
      ...community,
      playlists: onchainPlaylists,
    })
  } catch (error: any) {
    console.error(`Error fetching community ${slug}:`, error)
    return NextResponse.json({ error: `Failed to fetch community ${slug}`, details: error.message }, { status: 500 })
  }
}
