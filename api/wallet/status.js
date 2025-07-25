// Check wallet connection status
export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const walletAddress = req.cookies.wallet_address
  const communitiesData = req.cookies.wallet_communities

  if (!walletAddress) {
    return res.json({
      connected: false,
      walletAddress: null,
      communities: [],
    })
  }

  let communities = []
  try {
    communities = communitiesData ? JSON.parse(communitiesData) : []
  } catch (error) {
    console.error("Error parsing communities data:", error)
  }

  res.json({
    connected: true,
    walletAddress,
    communities,
  })
}
