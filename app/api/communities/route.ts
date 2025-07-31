import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const communities =
      await sql`SELECT id, name, slug, description, contract_address, blockchain FROM communities ORDER BY name ASC`
    return NextResponse.json(communities)
  } catch (error: any) {
    console.error("Error fetching communities:", error)
    return NextResponse.json({ error: "Failed to fetch communities", details: error.message }, { status: 500 })
  }
}
