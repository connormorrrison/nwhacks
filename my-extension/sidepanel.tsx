import { Settings } from "lucide-react"
import { useEffect, useState } from "react"

import "./style.css"

// Simple button component
const Button = ({ children, onClick, className }: any) => (
  <button onClick={onClick} className={className} style={{ padding: "8px 12px", cursor: "pointer" }}>
    {children}
  </button>
)

// Simple input component
const Input = ({ value, onChange, placeholder, className }: any) => (
  <input value={value} onChange={onChange} placeholder={placeholder} className={className} style={{ padding: "6px", width: "100%" }} />
)

// Simple label component
const Label = ({ children }: any) => <label style={{ display: "block", marginBottom: "4px", fontWeight: "600" }}>{children}</label>

// Simple popover components
const Popover = ({ children }: any) => <div>{children}</div>
const PopoverTrigger = ({ children }: any) => <>{children}</>
const PopoverContent = ({ children }: any) => <div style={{ border: "1px solid #ccc", padding: "8px", marginTop: "4px" }}>{children}</div>

// Simple switch component
const Switch = ({ checked, onCheckedChange }: any) => (
  <input type="checkbox" checked={checked} onChange={(e: any) => onCheckedChange(e.target.checked)} style={{ cursor: "pointer" }} />
)

function SidePanel() {
    const [autoNegotiate, setAutoNegotiate] = useState(false)
    const [listing, setListing] = useState({
        id: "",
        title: "",
        targetPrice: "",
        priceReason: "",
        strategy: "friendly"
    })
    const [status, setStatus] = useState("")

    useEffect(() => {
        chrome.storage.local.get(["active_listing", "neg_auto"], (res) => {
            if (res.active_listing) {
                setListing({
                    id: res.active_listing.id || "",
                    title: res.active_listing.title || "",
                    targetPrice: res.active_listing.targetPrice || "",
                    priceReason: res.active_listing.priceReason || "",
                    strategy: res.active_listing.strategy || "friendly"
                })
            }
            setAutoNegotiate(!!res.neg_auto)
        })
    }, [])

    const saveListing = () => {
        if (!listing.title.trim()) {
            setStatus("Add a listing title to save.")
            return
        }
        const withId = {
            ...listing,
            id: listing.id || `lst_${Date.now()}`
        }
        chrome.storage.local.set(
            { active_listing: withId },
            () => {
                setListing(withId)
                setStatus("Listing saved.")
                setTimeout(() => setStatus(""), 2000)
            }
        )
    }

    const onToggleAuto = (checked: boolean) => {
        setAutoNegotiate(checked)
        chrome.storage.local.set({ neg_auto: checked })
    }

    return (
        <div className="flex flex-col h-screen w-screen bg-background text-foreground p-4 font-sans">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-normal">AI Negotiator</h2>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="icon">
                            <Settings className="h-5 w-5" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72" align="end">
                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <h4 className="font-medium leading-none text-sm">Settings</h4>
                                <p className="text-sm text-muted-foreground">
                                    Manage your negotiation preferences.
                                </p>
                            </div>
                            <div className="grid gap-4">
                                <div className="flex items-center justify-between space-x-2">
                                    <Label htmlFor="auto-negotiate">Auto-negotiate</Label>
                                    <Switch
                                        id="auto-negotiate"
                                        checked={autoNegotiate}
                                        onCheckedChange={onToggleAuto}
                                    />
                                </div>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
            <div className="flex-1 space-y-4">
                <div className="space-y-2">
                    <Label>Listing title</Label>
                    <Input
                        value={listing.title}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setListing({ ...listing, title: e.target.value })
                        }
                        placeholder="e.g. Mid-century desk"
                    />
                </div>

                <div className="space-y-2">
                    <Label>Target price (minimum)</Label>
                    <Input
                        value={listing.targetPrice}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setListing({ ...listing, targetPrice: e.target.value })
                        }
                        placeholder="$120"
                    />
                </div>

                <div className="space-y-2">
                    <Label>Why this price</Label>
                    <textarea
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        rows={4}
                        value={listing.priceReason}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                            setListing({ ...listing, priceReason: e.target.value })
                        }
                        placeholder="Condition, demand, original price, etc."
                    />
                </div>

                <div className="space-y-2">
                    <Label>Strategy</Label>
                    <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={listing.strategy}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                            setListing({ ...listing, strategy: e.target.value })
                        }
                    >
                        <option value="friendly">Friendly</option>
                        <option value="firm">Firm</option>
                        <option value="flexible">Flexible</option>
                    </select>
                </div>

                <Button onClick={saveListing}>Save listing</Button>
                {status && <div className="text-sm text-muted-foreground">{status}</div>}
            </div>
        </div>
    )
}

export default SidePanel
