export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { walletAddress, metadataUrl, name, description, contractAddress } = req.body

    if (!walletAddress || !metadataUrl || !name) {
      return res.status(400).json({
        error: "Missing required fields: walletAddress, metadataUrl, name",
      })
    }

    // Verify wallet connection by checking cookies
    const walletCookie = req.cookies.wallet_connected
    if (!walletCookie || walletCookie !== "true") {
      return res.status(401).json({ error: "Wallet not connected" })
    }

    // For now, we'll use Manifold's claim-based minting
    // This will need to be updated based on your specific Manifold contract setup
    const manifoldApiUrl = process.env.MANIFOLD_API_URL || "https://api.manifold.xyz"

    // Create a claim on Manifold (this is a simplified example)
    const claimData = {
      contractAddress: contractAddress || process.env.MANIFOLD_CONTRACT_ADDRESS,
      tokenSpec: {
        tokenId: Date.now(), // Simple token ID generation
        uri: metadataUrl,
      },
      claimConditions: {
        merkleRoot: null, // Open claim
        startTime: Math.floor(Date.now() / 1000),
        endTime: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, // 1 year
        maxClaimableSupply: 1,
        supplyClaimed: 0,
        quantityLimitPerWallet: 1,
        pricePerToken: 0, // Free mint
        currency: "0x0000000000000000000000000000000000000000", // ETH
      },
    }

    // Note: This is a placeholder for Manifold API integration
    // You'll need to replace this with actual Manifold API calls based on their documentation
    const manifoldResponse = await fetch(`${manifoldApiUrl}/v1/claims`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MANIFOLD_API_KEY}`,
      },
      body: JSON.stringify(claimData),
    })

    if (!manifoldResponse.ok) {
      const errorData = await manifoldResponse.text()
      throw new Error(`Manifold API error: ${errorData}`)
    }

    const manifoldResult = await manifoldResponse.json()

    // Generate marketplace links
    const openseaUrl = `https://opensea.io/assets/ethereum/${contractAddress || process.env.MANIFOLD_CONTRACT_ADDRESS}/${manifoldResult.tokenId || "unknown"}`
    const looksrareUrl = `https://looksrare.org/collections/${contractAddress || process.env.MANIFOLD_CONTRACT_ADDRESS}/${manifoldResult.tokenId || "unknown"}`

    res.status(200).json({
      success: true,
      transactionHash: manifoldResult.transactionHash,
      tokenId: manifoldResult.tokenId,
      contractAddress: contractAddress || process.env.MANIFOLD_CONTRACT_ADDRESS,
      metadataUrl,
      marketplaceLinks: {
        opensea: openseaUrl,
        looksrare: looksrareUrl,
      },
      manifoldData: manifoldResult,
    })
  } catch (error) {
    console.error("Error minting NFT:", error)
    res.status(500).json({
      error: "Failed to mint NFT",
      details: error.message,
    })
  }
}
