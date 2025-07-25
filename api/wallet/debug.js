// Debug endpoint to test NFT detection manually
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const { wallet, contract } = req.query

  if (!wallet || !contract) {
    return res.status(400).json({
      error: "Missing parameters",
      usage: "/api/wallet/debug?wallet=0x...&contract=okcomputers|mfers",
    })
  }

  const contracts = {
    okcomputers: {
      address: "0xce2830932889c7fb5e5206287c43554e673dcc88",
      rpcUrl: "https://mainnet.base.org",
      blockchain: "Base",
    },
    mfers: {
      address: "0x79FCDEF22feeD20eDDacbB2587640e45491b757f",
      rpcUrl: "https://eth.llamarpc.com",
      blockchain: "Ethereum",
    },
  }

  const contractInfo = contracts[contract.toLowerCase()]
  if (!contractInfo) {
    return res.status(400).json({
      error: "Invalid contract",
      available: Object.keys(contracts),
    })
  }

  try {
    // ERC-721 balanceOf function signature
    const balanceOfSignature = "0x70a08231"
    const paddedAddress = wallet.slice(2).padStart(64, "0")
    const callData = balanceOfSignature + paddedAddress

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

    console.log("Debug RPC call:", JSON.stringify(rpcPayload, null, 2))

    const response = await fetch(contractInfo.rpcUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(rpcPayload),
    })

    const data = await response.json()

    let nftCount = 0
    if (data.result && data.result !== "0x") {
      nftCount = Number.parseInt(data.result, 16)
    }

    res.json({
      wallet,
      contract: contract.toLowerCase(),
      contractAddress: contractInfo.address,
      blockchain: contractInfo.blockchain,
      rpcUrl: contractInfo.rpcUrl,
      rpcPayload,
      rpcResponse: data,
      nftCount,
      hasNFTs: nftCount > 0,
      rawResult: data.result,
    })
  } catch (error) {
    res.status(500).json({
      error: "Debug failed",
      details: error.message,
    })
  }
}
