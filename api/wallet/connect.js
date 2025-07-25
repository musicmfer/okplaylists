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
    // NFT contract addresses with their respective blockchains
    const contracts = {
      "OK COMPUTERS": {
        address: "0xce2830932889c7fb5e5206287c43554e673dcc88", // Correct OK COMPUTERS contract on Base
        rpcUrl: "https://mainnet.base.org", // Base mainnet RPC
        blockchain: "Base",
      },
      MFERS: {
        address: "0x79FCDEF22feeD20eDDacbB2587640e45491b757f", // MFERS on Ethereum
        rpcUrl: "https://eth.llamarpc.com", // Ethereum mainnet RPC
        blockchain: "Ethereum",
      },
    }

    const communities = []
    const debugInfo = []

    // Check each contract for NFT ownership
    for (const [communityName, contractInfo] of Object.entries(contracts)) {
      try {
        console.log(`🔍 Checking ${communityName} on ${contractInfo.blockchain}...`)
        console.log(`📍 Contract: ${contractInfo.address}`)
        console.log(`🌐 RPC: ${contractInfo.rpcUrl}`)
        console.log(`👤 Wallet: ${walletAddress}`)

        // ERC-721 balanceOf function signature
        const balanceOfSignature = "0x70a08231" // balanceOf(address)
        const paddedAddress = walletAddress.slice(2).padStart(64, "0")
        const callData = balanceOfSignature + paddedAddress

        console.log(`📞 Call data: ${callData}`)

        const rpcPayload = {
          jsonrpc: "2.0",
          id: 1,
          method: "eth_call",
          params: [
            {
              to: contractInfo.address,
              data: callData,
            },
            "latest",
          ],
        }

        console.log(`📤 RPC Payload:`, JSON.stringify(rpcPayload, null, 2))

        const response = await fetch(contractInfo.rpcUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(rpcPayload),
        })

        console.log(`📥 Response status: ${response.status}`)

        if (response.ok) {
          const data = await response.json()
          console.log(`📊 ${communityName} response:`, JSON.stringify(data, null, 2))

          debugInfo.push({
            community: communityName,
            blockchain: contractInfo.blockchain,
            contract: contractInfo.address,
            response: data,
            status: "success",
          })

          if (data.error) {
            console.error(`❌ RPC Error for ${communityName}:`, data.error)
            debugInfo[debugInfo.length - 1].error = data.error
          } else if (
            data.result &&
            data.result !== "0x" &&
            data.result !== "0x0000000000000000000000000000000000000000000000000000000000000000"
          ) {
            // Convert hex result to decimal
            const nftCount = Number.parseInt(data.result, 16)
            console.log(`🎯 ${communityName} NFT count: ${nftCount}`)

            if (nftCount > 0) {
              communities.push({
                name: communityName,
                contract: contractInfo.address,
                blockchain: contractInfo.blockchain,
              })
              console.log(`✅ Found ${nftCount} ${communityName} NFTs!`)
            } else {
              console.log(`❌ No ${communityName} NFTs found (count: 0)`)
            }
          } else {
            console.log(`❌ No ${communityName} NFTs found (empty/zero result)`)
            console.log(`Result was: ${data.result}`)
          }
        } else {
          const errorText = await response.text()
          console.error(`❌ Failed to check ${communityName}:`, response.status, errorText)
          debugInfo.push({
            community: communityName,
            blockchain: contractInfo.blockchain,
            contract: contractInfo.address,
            status: "failed",
            httpStatus: response.status,
            error: errorText,
          })
        }
      } catch (error) {
        console.error(`💥 Error checking ${communityName}:`, error)
        debugInfo.push({
          community: communityName,
          blockchain: contractInfo.blockchain,
          contract: contractInfo.address,
          status: "error",
          error: error.message,
        })
        // Continue checking other contracts even if one fails
      }
    }

    console.log("🏁 Final communities found:", communities)
    console.log("🐛 Debug info:", JSON.stringify(debugInfo, null, 2))

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
      debugInfo, // Include debug info in response for troubleshooting
      message:
        communities.length > 0
          ? `Connected! Found ${communities.length} community membership(s)`
          : "Connected! No community memberships found",
    })
  } catch (error) {
    console.error("💥 Wallet connection error:", error)
    res.status(500).json({
      error: "Failed to verify wallet",
      details: error.message,
    })
  }
}
