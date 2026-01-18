import React, { useEffect, useState } from "react"

type Listing = {
  id: string
  title: string
  targetPrice?: string
  priceReason?: string
  pageUrl?: string
}

function getStorage<T>(key: string, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (res) => {
      resolve((res?.[key] as T) ?? fallback)
    })
  })
}

function setStorage(key: string, value: unknown): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, () => resolve())
  })
}

export default function Popup() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState("")

  const loadListings = async () => {
    setLoading(true)
    const data = await getStorage<Listing[]>("neg_listings", [])
    setListings(data)
    setLoading(false)
  }

  useEffect(() => {
    loadListings()
  }, [])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(""), 2000)
  }

  const saveListing = async (listing: Listing, targetPrice: string, priceReason: string) => {
    const updated = listings.map((l) =>
      l.id === listing.id ? { ...l, targetPrice, priceReason } : l
    )
    await setStorage("neg_listings", updated)
    setListings(updated)
    showToast("Saved")
  }

  const removeListing = async (id: string) => {
    const filtered = listings.filter((l) => l.id !== id)
    await setStorage("neg_listings", filtered)
    setListings(filtered)
  }

  return (
    <div style={{ padding: "12px", fontFamily: "system-ui, sans-serif", width: "350px", minHeight: "200px" }}>
      <h2 style={{ marginBottom: "12px", fontSize: "18px" }}>Negotiating Agent</h2>

      {loading ? (
        <p>Loading...</p>
      ) : listings.length === 0 ? (
        <p style={{ color: "#666" }}>No captured listings yet. Use the side panel to add listings.</p>
      ) : (
        listings.map((listing) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            onSave={saveListing}
            onRemove={removeListing}
          />
        ))
      )}

      <button
        onClick={loadListings}
        style={{
          marginTop: "12px",
          padding: "8px 12px",
          cursor: "pointer",
          background: "#f0f0f0",
          border: "1px solid #ccc",
          borderRadius: "4px"
        }}
      >
        Refresh
      </button>

      {toast && (
        <div
          style={{
            position: "fixed",
            left: "50%",
            transform: "translateX(-50%)",
            bottom: "24px",
            background: "#111",
            color: "#fff",
            padding: "8px 12px",
            borderRadius: "6px"
          }}
        >
          {toast}
        </div>
      )}
    </div>
  )
}

function ListingCard({
  listing,
  onSave,
  onRemove
}: {
  listing: Listing
  onSave: (listing: Listing, targetPrice: string, priceReason: string) => void
  onRemove: (id: string) => void
}) {
  const [targetPrice, setTargetPrice] = useState(listing.targetPrice || "")
  const [priceReason, setPriceReason] = useState(listing.priceReason || "")

  return (
    <div
      style={{
        border: "1px solid #eee",
        padding: "10px",
        borderRadius: "6px",
        marginBottom: "10px"
      }}
    >
      <div style={{ fontWeight: 600 }}>{listing.title}</div>
      {listing.pageUrl && (
        <div style={{ fontSize: "12px", color: "#666", marginBottom: "6px" }}>
          {listing.pageUrl}
        </div>
      )}

      <label style={{ display: "block", marginTop: "6px", fontSize: "12px" }}>
        Target price
      </label>
      <input
        value={targetPrice}
        onChange={(e) => setTargetPrice(e.target.value)}
        style={{ width: "100%", padding: "4px", marginBottom: "6px" }}
      />

      <label style={{ display: "block", fontSize: "12px" }}>Why this price</label>
      <textarea
        value={priceReason}
        onChange={(e) => setPriceReason(e.target.value)}
        rows={2}
        style={{ width: "100%", padding: "4px" }}
      />

      <div style={{ textAlign: "right", marginTop: "8px" }}>
        <button
          onClick={() => onRemove(listing.id)}
          style={{ marginRight: "8px", padding: "4px 8px", cursor: "pointer" }}
        >
          Remove
        </button>
        <button
          onClick={() => onSave(listing, targetPrice, priceReason)}
          style={{ padding: "4px 8px", cursor: "pointer" }}
        >
          Save
        </button>
      </div>
    </div>
  )
}
