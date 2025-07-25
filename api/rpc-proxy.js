// Securely forwards JSON-RPC requests to an Ethereum node.
// This prevents exposing your RPC URL and API key on the frontend.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  // Use a secure RPC URL from environment variables.
  // Fallback to the public Cloudflare RPC for demonstration purposes.
  const RPC_URL = process.env.RPC_URL || "https://cloudflare-eth.com"

  try {
    const response = await fetch(RPC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req.body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("RPC call failed:", response.status, errorText)
      return res.status(response.status).json({ error: "Failed to call RPC node", details: errorText })
    }

    const data = await response.json()
    res.status(200).json(data)
  } catch (error) {
    console.error("Error in RPC proxy:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}
