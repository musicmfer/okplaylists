// Wallet connection and NFT verification endpoint
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const { walletAddress } = req.body

  if (!walletAddress) {
    return res.status(400).json({ error: "Wallet address is required" })
  }

  // Validate Ethereum address format
  const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/
  if (!ethAddressRegex.test(walletAddress)) {
    return res.status(400).json({ error: "Invalid wallet address format" })
  }

  try {
    // NFT contract addresses
    const contracts = {
      "OK COMPUTERS": "0x4E1f41613c9084FdB9E34E11fAE9412427480e56", // OK COMPUTERS contract
      MFERS: "0x79FCDEF22feeD20eDDacbB2587640e45491b757f", // MFERS contract
    }

    const communities = []

    // Check each contract for NFT ownership using free Ethereum RPC
    for (const [communityName, contractAddress] of Object.entries(contracts)) {
      try {
        // Use free Ethereum RPC endpoint
        const rpcUrl = "https://eth.llamarpc.com" // Free public RPC

        // ERC-721 balanceOf function signature
        const balanceOfSignature = "0x70a08231" // balanceOf(address)
        const paddedAddress = walletAddress.slice(2).padStart(64, "0")
        const callData = balanceOfSignature + paddedAddress

        const response = await fetch(rpcUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "eth_call",
            params: [
              {
                to: contractAddress,
                data: callData,
              },
              "latest",
            ],
          }),
        })

        if (response.ok) {
          const data = await response.json()

          if (data.result && data.result !== "0x") {
            // Convert hex result to decimal
            const nftCount = Number.parseInt(data.result, 16)

            if (nftCount > 0) {
              communities.push({
                name: communityName,
                contract: contractAddress,
              })
            }
          }
        }
      } catch (error) {
        console.error(`Error checking ${communityName}:`, error)
        // Continue checking other contracts even if one fails
      }
    }

    // Store wallet connection in cookies (simplified approach)
    const cookieOptions = "HttpOnly; Secure; SameSite=None; Path=/; Max-Age=86400" // 24 hours

    res.setHeader("Set-Cookie", [
      `wallet_address=${walletAddress}; ${cookieOptions}`,
      `wallet_communities=${JSON.stringify(communities)}; ${cookieOptions}`,
    ])

    res.json({
      success: true,
      walletAddress,
      communities,
      message:
        communities.length > 0
          ? `Connected! Found ${communities.length} community membership(s)`
          : "Connected! No community memberships found",
    })
  } catch (error) {
    console.error("Wallet connection error:", error)
    res.status(500).json({
      error: "Failed to verify wallet",
      details: error.message,
    })
  }
}
