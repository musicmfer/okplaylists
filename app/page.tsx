"use client" // This page needs to be a client component to use useState and useEffect

import { useState } from "react"
import SiweConnectButton from "@/components/siwe-connect-button"

export default function CommunityHomePage() {
  const [walletConnected, setWalletConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [farcasterUsername, setFarcasterUsername] = useState<string | null>(null)
  const [farcasterPfpUrl, setFarcasterPfpUrl] = useState<string | null>(null)

  const handleWalletConnect = (address: string, username?: string, pfpUrl?: string) => {
    setWalletConnected(true)
    setWalletAddress(address)
    setFarcasterUsername(username || null)
    setFarcasterPfpUrl(pfpUrl || null)
    // In a real app, you'd fetch user-specific data here
  }

  const handleWalletDisconnect = () => {
    setWalletConnected(false)
    setWalletAddress(null)
    setFarcasterUsername(null)
    setFarcasterPfpUrl(null)
  }

  return (
    <div className="container">
      <div className="header">
        <div className="title">OK-' PLAYLISTS</div>
        <div className="subtitle">COMMUNITY PORTAL</div>
        <div className="description">
          {">"} EXPLORE ONCHAIN PLAYLISTS FROM YOUR NFT COMMUNITIES
          <br />
          {">"} DISCOVER MEMBERS AND THEIR MUSIC TASTES
          <br />
          {">"} CONNECT YOUR WALLET TO JOIN THE CONVERSATION
        </div>
      </div>

      <div className="panel" id="connectionPanel">
        {/* Spotify buttons (placeholder for now, will be in main app) */}
        <button className="connect-btn" id="spotifyBtn" style={{ display: "none" }}>
          CONNECT SPOTIFY
        </button>
        <button className="connect-btn" id="spotifyLogoutBtn" style={{ display: "none" }}>
          LOGOUT SPOTIFY
        </button>

        <SiweConnectButton onConnect={handleWalletConnect} onDisconnect={handleWalletDisconnect} />

        <div className="status-line" id="connectionStatus">
          SPOTIFY: <span className="status-disconnected">DISCONNECTED</span>
        </div>
        {/* Wallet status is handled by SiweConnectButton */}
        <div className="communities-line" id="communitiesStatus" style={{ display: "none" }}>
          <span id="communityLabel">COMMUNITY:</span> <span id="communitiesList"></span>
        </div>
        <div className="error" id="errorMessage" style={{ display: "none" }}></div>
        <div className="success" id="successMessage" style={{ display: "none" }}></div>
      </div>

      <div className="dashboard-card">
        <h3 className="expandable-header active">🏛️ Community Features</h3>
        <div className="expandable-content active">
          <div className="coming-soon">
            <div className="coming-soon-icon">🚀</div>
            <div className="coming-soon-text">Building the Future of Onchain Music</div>
            <div className="coming-soon-desc">
              This is the dedicated portal for OK PLAYLISTS communities.
              <br />
              Here, you'll find member profiles, community-curated playlists,
              <br />
              and exclusive features for NFT holders.
            </div>
          </div>
        </div>
      </div>

      <div className="footer">OK PLAYLISTS © 2025 | OWN YOUR PLAYLISTS</div>
    </div>
  )
}
