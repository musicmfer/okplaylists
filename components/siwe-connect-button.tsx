"use client"

import { useState, useEffect, useCallback } from "react"
import { SiweMessage } from "siwe"
import { ethers } from "ethers" // Using ethers for simplicity, as per existing project
import Link from "next/link" // Import Link component

interface SiweConnectButtonProps {
  onConnect: (walletAddress: string, farcasterUsername?: string, farcasterPfpUrl?: string) => void
  onDisconnect: () => void
}

export default function SiweConnectButton({ onConnect, onDisconnect }: SiweConnectButtonProps) {
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [farcasterUsername, setFarcasterUsername] = useState<string | null>(null)
  const [farcasterPfpUrl, setFarcasterPfpUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const checkConnectionStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/siwe?action=status")
      const data = await res.json()
      if (data.connected) {
        setConnected(true)
        setWalletAddress(data.walletAddress)
        setFarcasterUsername(data.farcasterUsername)
        setFarcasterPfpUrl(data.farcasterPfpUrl)
        onConnect(data.walletAddress, data.farcasterUsername, data.farcasterPfpUrl)
      } else {
        setConnected(false)
        setWalletAddress(null)
        setFarcasterUsername(null)
        setFarcasterPfpUrl(null)
        onDisconnect()
      }
    } catch (err: any) {
      console.error("Failed to check SIWE status:", err)
      setError("Failed to check connection status.")
      setConnected(false)
      setWalletAddress(null)
      setFarcasterUsername(null)
      setFarcasterPfpUrl(null)
      onDisconnect()
    } finally {
      setLoading(false)
    }
  }, [onConnect, onDisconnect])

  useEffect(() => {
    checkConnectionStatus()
  }, [checkConnectionStatus])

  const handleConnect = async () => {
    setError(null)
    if (typeof window.ethereum === "undefined") {
      setError("No Ethereum wallet detected. Please install MetaMask or similar.")
      return
    }

    try {
      setLoading(true)
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const address = await signer.getAddress()

      // 1. Get nonce from backend
      const nonceRes = await fetch("/api/auth/siwe?action=nonce")
      if (!nonceRes.ok) {
        throw new Error("Failed to get nonce.")
      }
      const { nonce } = await nonceRes.json()

      // 2. Create SIWE message
      const message = new SiweMessage({
        domain: window.location.host,
        address: address,
        statement: "Sign in to OK PLAYLISTS Communities with your wallet.",
        uri: window.location.origin,
        version: "1",
        chainId: (await provider.getNetwork()).chainId,
        nonce: nonce,
      })

      // 3. Sign the message
      const signature = await signer.signMessage(message.prepareMessage())

      // 4. Verify with backend
      const verifyRes = await fetch("/api/auth/siwe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message, signature }),
      })

      if (!verifyRes.ok) {
        const errorData = await verifyRes.json()
        throw new Error(errorData.error || "SIWE verification failed.")
      }

      // Success! Re-check status to get updated Farcaster info
      await checkConnectionStatus()
      setError(null)
    } catch (err: any) {
      console.error("SIWE connection error:", err)
      setError(err.message || "Failed to connect wallet.")
      setConnected(false)
      setWalletAddress(null)
      setFarcasterUsername(null)
      setFarcasterPfpUrl(null)
      onDisconnect()
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async () => {
    setError(null)
    try {
      setLoading(true)
      const res = await fetch("/api/auth/siwe", { method: "DELETE" })
      if (!res.ok) {
        throw new Error("Failed to disconnect.")
      }
      setConnected(false)
      setWalletAddress(null)
      setFarcasterUsername(null)
      setFarcasterPfpUrl(null)
      onDisconnect()
      setError(null)
    } catch (err: any) {
      console.error("SIWE disconnect error:", err)
      setError(err.message || "Failed to disconnect wallet.")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <button className="connect-btn wallet-btn" disabled>
        LOADING WALLET...
      </button>
    )
  }

  return (
    <>
      {connected ? (
        <>
          <button className="connect-btn wallet-btn" onClick={handleDisconnect}>
            DISCONNECT WALLET
          </button>
          <div className="status-line">
            WALLET: <span className="status-connected">CONNECTED</span>
          </div>
          {farcasterUsername && (
            <div className="communities-line">
              <span id="communityLabel">FARCASTER:</span>{" "}
              <Link href={`/profile/${farcasterUsername}`} className="community-tag" style={{ textDecoration: "none" }}>
                @{farcasterUsername}
              </Link>
            </div>
          )}
        </>
      ) : (
        <>
          <button className="connect-btn wallet-btn" onClick={handleConnect}>
            CONNECT WALLET
          </button>
          <div className="status-line">
            WALLET: <span className="status-disconnected">DISCONNECTED</span>
          </div>
        </>
      )}
      {error && <div className="error">{error}</div>}
    </>
  )
}
