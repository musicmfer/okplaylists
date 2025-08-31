export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { name, description, image, attributes } = req.body

    if (!name || !description || !image) {
      return res.status(400).json({ error: "Missing required fields: name, description, image" })
    }

    // Upload image to IPFS first
    const imageFormData = new FormData()

    // If image is a URL, fetch it first
    let imageBlob
    if (image.startsWith("http")) {
      const imageResponse = await fetch(image)
      imageBlob = await imageResponse.blob()
    } else {
      // Assume it's base64 data
      const base64Data = image.split(",")[1]
      const buffer = Buffer.from(base64Data, "base64")
      imageBlob = new Blob([buffer], { type: "image/jpeg" })
    }

    imageFormData.append("file", imageBlob, "playlist-cover.jpg")

    const pinataMetadata = JSON.stringify({
      name: `${name}-cover`,
    })
    imageFormData.append("pinataMetadata", pinataMetadata)

    // Upload image to Pinata
    const imageUploadResponse = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PINATA_JWT}`,
      },
      body: imageFormData,
    })

    if (!imageUploadResponse.ok) {
      throw new Error("Failed to upload image to IPFS")
    }

    const imageResult = await imageUploadResponse.json()
    const imageIpfsUrl = `https://gateway.pinata.cloud/ipfs/${imageResult.IpfsHash}`

    // Create NFT metadata
    const metadata = {
      name,
      description,
      image: imageIpfsUrl,
      attributes: attributes || [],
      external_url: attributes?.find((attr) => attr.trait_type === "Spotify URL")?.value || "",
    }

    // Upload metadata to IPFS
    const metadataResponse = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.PINATA_JWT}`,
      },
      body: JSON.stringify({
        pinataContent: metadata,
        pinataMetadata: {
          name: `${name}-metadata`,
        },
      }),
    })

    if (!metadataResponse.ok) {
      throw new Error("Failed to upload metadata to IPFS")
    }

    const metadataResult = await metadataResponse.json()
    const metadataIpfsUrl = `https://gateway.pinata.cloud/ipfs/${metadataResult.IpfsHash}`

    res.status(200).json({
      success: true,
      imageUrl: imageIpfsUrl,
      metadataUrl: metadataIpfsUrl,
      ipfsHash: metadataResult.IpfsHash,
    })
  } catch (error) {
    console.error("Error uploading to IPFS:", error)
    res.status(500).json({
      error: "Failed to upload to IPFS",
      details: error.message,
    })
  }
}
