import { SiweMessage } from "siwe"
import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

// Initialize Neon DB client
const sql = neon(process.env.DATABASE_URL!)

// Helper to set session cookie
async function setSessionCookie(res: NextResponse, userId: string, walletAddress: string) {
  const sessionToken = Buffer.from(JSON.stringify({ userId, walletAddress })).toString("base64")
  res.cookies.set("session_token", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 1 week
  })
}

// Helper to clear session cookie
async function clearSessionCookie(res: NextResponse) {
  res.cookies.set("session_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0, // Expire immediately
  })
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get("action")

  if (action === "nonce") {
    // Generate a random nonce
    const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    const res = NextResponse.json({ nonce })
    res.cookies.set("siwe_nonce", nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 5, // 5 minutes
    })
    return res
  }

  if (action === "status") {
    const sessionToken = headers()
      .get("cookie")
      ?.split("; ")
      .find((row) => row.startsWith("session_token="))
      ?.split("=")[1]
    if (sessionToken) {
      try {
        const { userId, walletAddress } = JSON.parse(Buffer.from(sessionToken, "base64").toString())
        const [user] =
          await sql`SELECT wallet_address, farcaster_username, farcaster_pfp_url FROM users WHERE id = ${userId}`
        if (user) {
          return NextResponse.json({
            connected: true,
            walletAddress: user.wallet_address,
            farcasterUsername: user.farcaster_username,
            farcasterPfpUrl: user.farcaster_pfp_url,
          })
        }
      } catch (error) {
        console.error("Error parsing session token:", error)
      }
    }
    return NextResponse.json({ connected: false })
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}

export async function POST(req: Request) {
  const { message, signature } = await req.json()
  const res = new NextResponse()

  try {
    const siweMessage = new SiweMessage(message)
    const nonceCookie = headers()
      .get("cookie")
      ?.split("; ")
      .find((row) => row.startsWith("siwe_nonce="))
      ?.split("=")[1]

    if (!nonceCookie || siweMessage.nonce !== nonceCookie) {
      return NextResponse.json({ error: "Invalid nonce" }, { status: 403 })
    }

    await siweMessage.verify({ signature })

    const walletAddress = siweMessage.address

    // Check if user exists, create if not
    let [user] = await sql`SELECT id FROM users WHERE wallet_address = ${walletAddress}`
    if (!user) {
      ;[user] = await sql`INSERT INTO users (wallet_address) VALUES (${walletAddress}) RETURNING id`
    }

    // Fetch Farcaster profile and update user
    try {
      const farcasterRes = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/farcaster/profile?walletAddress=${walletAddress}`,
      )
      if (farcasterRes.ok) {
        const farcasterData = await farcasterRes.json()
        if (farcasterData.fid) {
          await sql`
            UPDATE users
            SET
              farcaster_id = ${farcasterData.fid},
              farcaster_username = ${farcasterData.username},
              farcaster_pfp_url = ${farcasterData.pfpUrl},
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ${user.id}
          `
          console.log(`Updated user ${user.id} with Farcaster profile: @${farcasterData.username}`)
        } else {
          console.log(`No Farcaster profile found for wallet ${walletAddress}`)
        }
      } else {
        console.error("Failed to fetch Farcaster profile from internal API:", farcasterRes.status)
      }
    } catch (farcasterError) {
      console.error("Error during Farcaster profile fetch/update:", farcasterError)
    }

    await setSessionCookie(res, user.id, walletAddress)
    res.cookies.set("siwe_nonce", "", { maxAge: 0 }) // Clear nonce after successful verification

    return res
  } catch (error: any) {
    console.error("SIWE verification failed:", error)
    return NextResponse.json({ error: error.message || "SIWE verification failed" }, { status: 401 })
  }
}

export async function DELETE(req: Request) {
  const res = new NextResponse()
  await clearSessionCookie(res)
  return res
}
