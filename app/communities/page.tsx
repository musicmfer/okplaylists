import Link from "next/link"

interface Community {
  id: string
  name: string
  slug: string
  description: string
  contract_address: string
  blockchain: string
}

async function getCommunities(): Promise<Community[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/communities`, {
      next: { revalidate: 60 }, // Revalidate every 60 seconds
    })
    if (!res.ok) {
      throw new Error(`Failed to fetch communities: ${res.statusText}`)
    }
    return res.json()
  } catch (error) {
    console.error("Error fetching communities:", error)
    return []
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

export default async function CommunitiesPage() {
  const communities = await getCommunities()

  return (
    <div className="container">
      <div className="header">
        <div className="title">OK-' PLAYLISTS</div>
        <div className="subtitle">COMMUNITY DIRECTORY</div>
        <div className="description">
          {">"} BROWSE ONCHAIN PLAYLISTS BY NFT COMMUNITY
          <br />
          {">"} DISCOVER MUSIC CURATED BY FELLOW HOLDERS
          <br />
          {">"} CLICK A COMMUNITY TO EXPLORE ITS GALLERY
        </div>
      </div>

      <div className="dashboard-card">
        <h3 className="expandable-header active">🏛️ All Communities</h3>
        <div className="expandable-content active">
          {communities.length === 0 ? (
            <div className="empty-state">
              <span className="state-icon">🎵</span>
              No communities found yet.
            </div>
          ) : (
            <div className="communities-summary">
              {communities.map((community) => (
                <Link href={`/communities/${community.slug}`} key={community.id} className="community-summary-item">
                  <span className="community-icon">{getCommunityIcon(community.name)}</span>
                  <span className="community-name">{community.name}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="footer">OK PLAYLISTS © 2025 | OWN YOUR PLAYLISTS</div>
    </div>
  )
}
