import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const walletAddress = searchParams.get("walletAddress")

  if (!walletAddress) {
    return NextResponse.json({ error: "Wallet address is required" }, { status: 400 })
  }

  const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY

  if (!NEYNAR_API_KEY) {
    console.error("NEYNAR_API_KEY is not set in environment variables.")
    return NextResponse.json({ error: "Server configuration error: Neynar API key missing" }, { status: 500 })
  }

  try {
    // Use Neynar API to fetch Farcaster user by address
    // Endpoint: https://docs.neynar.com/reference/lookup-user-by-custody-address
    const neynarResponse = await fetch(
      `https://api.neynar.com/v2/farcaster/user/by_custody_address?custody_address=${walletAddress}`,
      {
        headers: {
          accept: "application/json",
          api_key: NEYNAR_API_KEY,
        },
      },
    )

    if (!neynarResponse.ok) {
      const errorBody = await neynarResponse.json()
      console.error("Neynar API error:", neynarResponse.status, errorBody)
      // If no user found, Neynar returns 404, which is not an error for us
      if (neynarResponse.status === 404) {
        return NextResponse.json({ message: "No Farcaster profile found for this wallet." }, { status: 200 })
      }
      throw new Error(`Failed to fetch Farcaster profile: ${neynarResponse.statusText}`)
    }

    const data = await neynarResponse.json()
    const user = data.user

    if (!user) {
      return NextResponse.json({ message: "No Farcaster profile found for this wallet." }, { status: 200 })
    }

    // Extract relevant Farcaster profile data
    const farcasterProfile = {
      fid: user.fid,
      username: user.username,
      displayName: user.display_name,
      pfpUrl: user.pfp_url,
      profileUrl: `https://warpcast.com/${user.username}`,
    }

    return NextResponse.json(farcasterProfile)
  } catch (error: any) {
    console.error("Error fetching Farcaster profile:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch Farcaster profile" }, { status: 500 })
  }
}
