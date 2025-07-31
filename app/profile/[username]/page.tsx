import Link from "next/link"
import Image from "next/image"

interface UserProfileData {
  profile: {
    walletAddress: string
    farcasterUsername: string
    farcasterPfpUrl: string | null
    spotifyDisplayName: string | null
    createdAt: string
  }
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
  communities: string[] | null
  created_at: string
}

async function getUserProfile(username: string): Promise<UserProfileData | null> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/profile/${username}`, {
      next: { revalidate: 60 }, // Revalidate every 60 seconds
    })
    if (!res.ok) {
      if (res.status === 404) {
        return null // User not found
      }
      throw new Error(`Failed to fetch user profile: ${res.statusText}`)
    }
    return res.json()
  } catch (error) {
    console.error(`Error fetching user profile ${username}:`, error)
    return null
  }
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

export default async function UserProfilePage({ params }: { params: { username: string } }) {
  const userData = await getUserProfile(params.username)

  if (!userData) {
    return (
      <div className="container">
        <div className="header">
          <div className="title">OK-' PLAYLISTS</div>
          <div className="subtitle">USER NOT FOUND</div>
          <div className="description">
            {">"} THE USER PROFILE YOU ARE LOOKING FOR DOES NOT EXIST
            <br />
            {">"} PLEASE CHECK THE USERNAME OR BROWSE COMMUNITIES
          </div>
        </div>
        <div className="dashboard-card">
          <div className="empty-state">
            <span className="state-icon">🚫</span>
            User profile not found.
            <br />
            <Link href="/communities" className="retry-btn" style={{ textDecoration: "none" }}>
              Browse Communities
            </Link>
          </div>
        </div>
        <div className="footer">OK PLAYLISTS © 2025 | OWN YOUR PLAYLISTS</div>
      </div>
    )
  }

  const { profile, playlists } = userData

  return (
    <div className="container">
      <div className="header">
        <div className="title">OK-' PLAYLISTS</div>
        <div className="subtitle">
          {profile.farcasterPfpUrl ? (
            <Image
              src={profile.farcasterPfpUrl || "/placeholder.svg"}
              alt={`${profile.farcasterUsername}'s PFP`}
              width={48}
              height={48}
              className="rounded-full inline-block mr-2"
            />
          ) : (
            <span className="inline-block mr-2 text-3xl">👤</span>
          )}
          @{profile.farcasterUsername}
        </div>
        <div className="description">
          {">"} WALLET: {profile.walletAddress.slice(0, 6)}...{profile.walletAddress.slice(-4)}
          <br />
          {profile.spotifyDisplayName && (
            <>
              {">"} SPOTIFY: {profile.spotifyDisplayName}
              <br />
            </>
          )}
          {">"} JOINED: {new Date(profile.createdAt).toLocaleDateString()}
        </div>
      </div>

      <div className="dashboard-card">
        <h3 className="expandable-header active">🎵 Shared Playlists ({playlists.length})</h3>
        <div className="expandable-content active">
          {playlists.length === 0 ? (
            <div className="empty-state">
              <span className="state-icon">🎵</span>
              This user hasn't shared any onchain playlists yet.
            </div>
          ) : (
            <ul className="item-list">
              {playlists.map((playlist) => (
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
                        {playlist.total_tracks} tracks • {getTimeAgo(playlist.created_at)}
                      </div>
                      {playlist.communities && playlist.communities.length > 0 && (
                        <div className="communities-line" style={{ marginTop: "4px", textAlign: "left" }}>
                          {playlist.communities.map((community, index) => (
                            <span key={index} className="community-tag">
                              {community}
                            </span>
                          ))}
                        </div>
                      )}
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
