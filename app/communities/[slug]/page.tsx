import Link from "next/link"
import Image from "next/image"

interface CommunityDetail {
  id: string
  name: string
  slug: string
  description: string
  contract_address: string
  blockchain: string
  playlists: OnchainPlaylist[]
}

interface OnchainPlaylist {
  id: string
  playlist_name: string
  spotify_url: string
  farcaster_cast_url: string | null
  cover_image_url: string | null
  description: string | null
  total_tracks: number
  total_duration: string | null
  owner_display_name: string
  created_at: string
}

async function getCommunityDetails(slug: string): Promise<CommunityDetail | null> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/communities/${slug}`, {
      next: { revalidate: 60 }, // Revalidate every 60 seconds
    })
    if (!res.ok) {
      if (res.status === 404) {
        return null // Community not found
      }
      throw new Error(`Failed to fetch community details: ${res.statusText}`)
    }
    return res.json()
  } catch (error) {
    console.error(`Error fetching community ${slug}:`, error)
    return null
  }
}

function getCommunityIcon(communityName: string) {
  const icons: { [key: string]: string } = {
    "OK COMPUTERS": "💻",
    MFERS: "🐸",
    PUNKS: "💀",
    BAYC: "🐵",
    General: "🎵",
  }
  return icons[communityName] || "🏛️"
}

function getTimeAgo(timestamp: string): string {
  if (!timestamp) return "Unknown"

  const now = new Date()
  const time = new Date(timestamp)
  const diffMs = now.getTime() - time.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return time.toLocaleDateString()
}

export default async function CommunityDetailPage({ params }: { params: { slug: string } }) {
  const community = await getCommunityDetails(params.slug)

  if (!community) {
    return (
      <div className="container">
        <div className="header">
          <div className="title">OK-' PLAYLISTS</div>
          <div className="subtitle">COMMUNITY NOT FOUND</div>
          <div className="description">
            {">"} THE COMMUNITY YOU ARE LOOKING FOR DOES NOT EXIST
            <br />
            {">"} PLEASE CHECK THE URL OR BROWSE ALL COMMUNITIES
          </div>
        </div>
        <div className="dashboard-card">
          <div className="empty-state">
            <span className="state-icon">🚫</span>
            Community not found.
            <br />
            <Link href="/communities" className="retry-btn" style={{ textDecoration: "none" }}>
              Browse All Communities
            </Link>
          </div>
        </div>
        <div className="footer">OK PLAYLISTS © 2025 | OWN YOUR PLAYLISTS</div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="header">
        <div className="title">OK-' PLAYLISTS</div>
        <div className="subtitle">
          {getCommunityIcon(community.name)} {community.name} GALLERY
        </div>
        <div className="description">
          {">"} EXPLORE PLAYLISTS CURATED BY THE {community.name} COMMUNITY
          <br />
          {">"} CONTRACT: {community.contract_address} ON {community.blockchain}
          <br />
          {">"} {community.description}
        </div>
      </div>

      <div className="dashboard-card">
        <h3 className="expandable-header active">🎵 Community Playlists ({community.playlists.length})</h3>
        <div className="expandable-content active">
          {community.playlists.length === 0 ? (
            <div className="empty-state">
              <span className="state-icon">🎵</span>
              No playlists found for this community yet.
              <br />
              <span style={{ fontSize: "8px", color: "#666", marginTop: "4px", display: "block" }}>
                Share playlists to Farcaster with community tags to populate this gallery
              </span>
            </div>
          ) : (
            <ul className="item-list">
              {community.playlists.map((playlist) => (
                <li key={playlist.id} className="playlist-item">
                  <div className="playlist-item-header">
                    {playlist.cover_image_url ? (
                      <Image
                        src={playlist.cover_image_url || "/placeholder.svg"}
                        alt={playlist.playlist_name}
                        width={28}
                        height={28}
                        className="rounded-sm"
                      />
                    ) : (
                      <div className="playlist-cover-placeholder">🎵</div>
                    )}
                    <div className="item-info">
                      <div className="item-name">{playlist.playlist_name}</div>
                      <div className="item-detail">
                        {playlist.total_tracks} tracks • by {playlist.owner_display_name} •{" "}
                        {getTimeAgo(playlist.created_at)}
                      </div>
                    </div>
                    <div className="playlist-actions">
                      {playlist.spotify_url && (
                        <a
                          href={playlist.spotify_url}
                          target="_blank"
                          className="playlist-action-btn spotify-btn"
                          rel="noreferrer"
                        >
                          Spotify
                        </a>
                      )}
                      {playlist.farcaster_cast_url && (
                        <a
                          href={playlist.farcaster_cast_url}
                          target="_blank"
                          className="playlist-action-btn fc-btn"
                          rel="noreferrer"
                        >
                          FC
                        </a>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="footer">OK PLAYLISTS © 2025 | OWN YOUR PLAYLISTS</div>
    </div>
  )
}
