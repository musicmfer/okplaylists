// Disconnect wallet
export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  console.log("Disconnecting wallet...")

  // Clear wallet cookies
  const clearCookie = "HttpOnly; Secure; SameSite=None; Max-Age=0; Path=/"

  res.setHeader("Set-Cookie", [`wallet_address=; ${clearCookie}`, `wallet_communities=; ${clearCookie}`])

  res.json({ success: true, message: "Wallet disconnected" })
}
