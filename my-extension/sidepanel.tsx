import { ChevronDown, RefreshCw, Settings, Wand2 } from "lucide-react"
import { useState, useEffect, useRef } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from "@/components/ui/popover"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { ShimmeringText } from "@/components/ui/shimmering-text"
import { cn } from "@/lib/utils"

import "./style.css"


function SidePanel() {
    // Merged State
    const [messages, setMessages] = useState<{ text: string, sender: "me" | "them" }[]>([])
    const [metadata, setMetadata] = useState<{ itemInfo: string | null, personName: string | null }>({ itemInfo: null, personName: null })
    const [isThinking, setIsThinking] = useState(false)
    const [input, setInput] = useState("") // Controlled input
    const [loadingText, setLoadingText] = useState("Agent is working...")
    const [isConnected, setIsConnected] = useState(false)
    const [autoNegotiate, setAutoNegotiate] = useState(true) // Default to true for demo
    const [priceDeviation, setPriceDeviation] = useState(10)
    const [tone, setTone] = useState<"friendly" | "professional" | "firm">("friendly")
    const [role, setRole] = useState<"buyer" | "seller">("buyer")
    const [address, setAddress] = useState("")
    const [authorizeAddress, setAuthorizeAddress] = useState(false)
    const [draftReply, setDraftReply] = useState<string | null>(null)
    const [lastError, setLastError] = useState<string | null>(null)

    // Load settings from storage on mount
    useEffect(() => {
        chrome.storage.local.get(["autoNegotiate", "priceDeviation", "tone", "address", "authorizeAddress"], (result) => {
            if (result.autoNegotiate !== undefined) setAutoNegotiate(result.autoNegotiate)
            if (result.priceDeviation !== undefined) setPriceDeviation(result.priceDeviation)
            if (result.tone !== undefined) setTone(result.tone)
            if (result.role !== undefined) setRole(result.role)
            if (result.address !== undefined) setAddress(result.address)
            if (result.authorizeAddress !== undefined) setAuthorizeAddress(result.authorizeAddress)
        })
    }, [])

    // Save settings to storage whenever they change
    useEffect(() => {
        chrome.storage.local.set({
            autoNegotiate,
            priceDeviation,
            tone,
            role,
            address,
            authorizeAddress
        })
    }, [autoNegotiate, priceDeviation, tone, role, address, authorizeAddress])

    const lastProcessedMessageRef = useRef<string | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages, isThinking])

    // Loading text cycle
    useEffect(() => {
        if (!isThinking) return

        const texts = ["Agent is working...", "Thinking...", "Negotiating..."]
        let index = 0

        const interval = setInterval(() => {
            index = (index + 1) % texts.length
            setLoadingText(texts[index])
        }, 2000)

        return () => clearInterval(interval)
    }, [isThinking])

    // Auto-negotiate trigger
    // Auto-negotiate trigger
    useEffect(() => {
        if (messages.length > 0) {
            const lastMsg = messages[messages.length - 1]
            const msgSignature = `${lastMsg.sender}-${lastMsg.text}-${messages.length}`

            console.log("SidePanel: Checking auto-trigger. Last sender:", lastMsg.sender, "Signature:", msgSignature)

            // Trigger if:
            // 1. Last message is from "them"
            // 2. We haven't processed this exact message yet
            // 3. We aren't currently thinking
            // 4. We don't already have a draft waiting (unless we want to overwrite, but safer not to)
            if (lastMsg.sender === "them" && lastProcessedMessageRef.current !== msgSignature && !isThinking && !draftReply) {
                console.log("SidePanel: Auto-triggering AI for new message...")
                lastProcessedMessageRef.current = msgSignature
                setLastError(null) // Clear previous errors
                handleAutoReply()
            } else {
                console.log("SidePanel: Skipping auto-trigger.", {
                    isThem: lastMsg.sender === "them",
                    isNew: lastProcessedMessageRef.current !== msgSignature,
                    notThinking: !isThinking,
                    noDraft: !draftReply
                })
            }
        }
    }, [messages, isThinking, draftReply])

    // Listen for messages from the content script and request initial history
    useEffect(() => {
        // 1. Listen for incoming messages
        const messageListener = (request: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
            if (request.type === "FULL_MESSAGE_HISTORY") {
                console.log("AI Negotiator: Received full history:", request.messages)
                setMessages(request.messages)
                setIsConnected(true)
            }
            if (request.type === "NEW_MESSAGES") {
                console.log("AI Negotiator: Received NEW messages:", request.messages)
                setMessages(prev => [...prev, ...request.messages])
                setIsConnected(true)
            }
            if (request.type === "CHAT_METADATA") {
                setMetadata(request.metadata)
                setIsConnected(true)
            }
        }
        chrome.runtime.onMessage.addListener(messageListener)

        // 2. Request initial history from any open Facebook tab
        const fetchHistory = async () => {
            try {
                const tabs = await chrome.tabs.query({ url: "*://*.facebook.com/*" })
                if (tabs.length > 0) {
                    console.log("AI Negotiator: Found Facebook tabs:", tabs.length)
                    setIsConnected(true)
                    // Send to all found Facebook tabs just to be safe
                    for (const tab of tabs) {
                        if (tab.id) {
                            chrome.tabs.sendMessage(tab.id, { type: "GET_CHAT_HISTORY" }).catch(() => {
                                // Ignore errors (e.g. if content script isn't ready)
                            })
                        }
                    }
                } else {
                    console.log("AI Negotiator: No Facebook tabs found")
                    setIsConnected(false)
                }
            } catch (error) {
                console.error("Failed to query tabs:", error)
                setIsConnected(false)
            }
        }

        fetchHistory()

        return () => chrome.runtime.onMessage.removeListener(messageListener)
    }, [])

    const handleAutoReply = async () => {
        remoteLog("🤖 handleAutoReply triggered")
        setIsThinking(true)
        try {
            // Dynamically import the AI client to avoid load-time issues if env vars missing
            const { generateNegotiationSuggestions } = await import("~lib/ai-client")

            // We still use the same function but we'll take the best suggestion (or modify ai-client to return just one)
            // For now, let's assume we take the "Counter" or the first one if available.
            const settings = { autoNegotiate, priceDeviation, tone, role, address, authorizeAddress }
            const results = await generateNegotiationSuggestions(messages, metadata, settings)
            remoteLog(`✅ AI Results: ${JSON.stringify(results)}`)

            if (results && results.length > 0) {
                const bestReply = results[0].text

                // Add realistic delay (5-10 seconds)
                const delay = Math.random() * (10000 - 5000) + 5000
                remoteLog(`⏳ Waiting ${Math.round(delay / 1000)}s to mimic human...`)
                await new Promise(resolve => setTimeout(resolve, delay))

                if (autoNegotiate) {
                    remoteLog(`📤 Auto-sending reply: ${bestReply}`)
                    sendToPage(bestReply)
                } else {
                    remoteLog(`📝 Drafting reply: ${bestReply}`)
                    setDraftReply(bestReply)
                }
            } else {
                setLastError("AI returned no suggestions")
            }
        } catch (error: any) {
            remoteLog(`❌ Failed to generate reply: ${error}`)
            console.error("SidePanel: Failed to generate reply:", error)
            setLastError(error.message || "Unknown error")
        } finally {
            setIsThinking(false)
        }
    }

    const sendToPage = (text: string) => {
        // Target Facebook tabs specifically, not just the active tab
        chrome.tabs.query({ url: "*://*.facebook.com/*" }, (tabs) => {
            if (tabs.length > 0) {
                // Send to all Facebook tabs to ensure the active chat receives it
                tabs.forEach(tab => {
                    if (tab.id) {
                        chrome.tabs.sendMessage(tab.id, {
                            type: "INSERT_TEXT",
                            text: text
                        }).catch((err) => {
                            console.log("SidePanel: Failed to send to tab", tab.id, err)
                        })
                    }
                })
            } else {
                console.warn("SidePanel: No Facebook tabs found")
            }
        })
    }

    const remoteLog = (message: string) => {
        console.log(message) // Local log
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: "LOG",
                    message: message
                }).catch(() => { })
            }
        })
    }

    return (
        <div className="flex flex-col h-screen w-screen bg-background text-foreground p-4 font-sans">
            {/* Header Section */}
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-normal tracking-tight">Negotiagent</h2>
                    <div className={cn("w-2 h-2 rounded-full", isConnected ? "bg-green-500 animate-pulse" : "bg-red-500")} title={isConnected ? "Connected" : "Disconnected"} />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                            // Manually trigger fetch history
                            const fetchHistory = async () => {
                                try {
                                    const tabs = await chrome.tabs.query({ url: "*://*.facebook.com/*" })
                                    if (tabs.length > 0) {
                                        for (const tab of tabs) {
                                            if (tab.id) {
                                                chrome.tabs.sendMessage(tab.id, { type: "GET_CHAT_HISTORY" }).catch(() => { })
                                            }
                                        }
                                    }
                                } catch (error) {
                                    console.error("Failed to query tabs:", error)
                                }
                            }
                            fetchHistory()
                        }}
                    >
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>

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
                                        onCheckedChange={setAutoNegotiate}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="price-deviation">Max Price Deviation (+/- $)</Label>
                                    <Input
                                        id="price-deviation"
                                        type="number"
                                        value={priceDeviation}
                                        onChange={(e) => setPriceDeviation(Number(e.target.value))}
                                        className="h-8"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="tone">Tone</Label>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" className="w-full justify-between h-8 font-normal">
                                                {tone.charAt(0).toUpperCase() + tone.slice(1)}
                                                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-[240px]">
                                            <DropdownMenuItem onClick={() => setTone("friendly")}>
                                                Friendly
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setTone("professional")}>
                                                Professional
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setTone("firm")}>
                                                Firm
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>

                                    </DropdownMenu>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="role">Role</Label>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" className="w-full justify-between h-8 font-normal">
                                                {role.charAt(0).toUpperCase() + role.slice(1)}
                                                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-[240px]">
                                            <DropdownMenuItem onClick={() => setRole("buyer")}>
                                                Buyer
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setRole("seller")}>
                                                Seller
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between space-x-2">
                                        <Label htmlFor="authorize-address">
                                            Authorize agent to reveal address
                                        </Label>
                                        <Switch
                                            id="authorize-address"
                                            checked={authorizeAddress}
                                            onCheckedChange={setAuthorizeAddress}
                                        />
                                    </div>
                                    {authorizeAddress && (
                                        <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                            <Label htmlFor="address">Pickup Address</Label>
                                            <Input
                                                id="address"
                                                placeholder="e.g. 123 Main St"
                                                value={address}
                                                onChange={(e) => setAddress(e.target.value)}
                                                className="h-8"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>



            {/* Info Box - Moved here and added consistent mb-4 spacing */}
            {
                (metadata.personName || metadata.itemInfo) && (
                    <div className="mb-4 space-y-1 bg-muted/50 p-3 rounded-lg border animate-in fade-in slide-in-from-top-2 duration-500">
                        {metadata.personName && (
                            <p className="text-sm text-muted-foreground">
                                Negotiating with <span className="font-medium text-foreground">{metadata.personName}</span>
                            </p>
                        )}
                        {metadata.itemInfo && (
                            <p className="text-sm font-medium text-primary truncate max-w-[220px]">
                                {metadata.itemInfo}
                            </p>
                        )}
                    </div>
                )
            }

            {/* Message Display Area */}
            <div className="flex-1 overflow-y-auto mb-4 border rounded-md p-4 space-y-2">
                {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-sm font-normal text-muted-foreground animate-in fade-in duration-700">
                        Awaiting incoming messages
                    </div>
                ) : (
                    messages.map((msg, index) => (
                        <div
                            key={index}
                            className={cn(
                                "px-4 py-2 rounded-2xl text-sm max-w-[80%] animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both",
                                msg.sender === "me"
                                    ? "bg-primary text-primary-foreground ml-auto"
                                    : "bg-muted text-foreground mr-auto"
                            )}
                            style={{ animationDelay: `${index * 100}ms` }}
                        >
                            {msg.text}
                        </div>
                    ))
                )}

                {/* Draft Reply UI */}
                {draftReply && (
                    <div className="mb-4 mx-2 p-3 rounded-lg border border-dashed border-muted-foreground/50 bg-muted/30 animate-in fade-in slide-in-from-bottom-2">
                        <p className="text-sm text-muted-foreground mb-2">Draft Reply</p>
                        <p className="text-sm text-foreground mb-3">{draftReply}</p>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => {
                                    sendToPage(draftReply)
                                    setDraftReply(null)
                                }}
                            >
                                Confirm
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="flex-1"
                                onClick={() => {
                                    setDraftReply(null)
                                    handleAutoReply()
                                }}
                            >
                                Rewrite
                            </Button>
                        </div>
                    </div>
                )}

                {/* Loading State */}
                {isThinking && (
                    <div className="flex justify-center p-4 animate-in fade-in duration-300">
                        <ShimmeringText text={loadingText} className="text-sm font-medium" duration={1.5} repeatDelay={1} />
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Status / Error Line - Removed as per request */}
            {lastError && (
                <div className="mb-2 px-1 text-xs text-red-500 font-medium truncate" title={lastError}>
                    Error: {lastError}
                </div>
            )}

            {/* Input Area */}
            <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                    <Input
                        placeholder="Type a message..."
                        value={input}
                        onChange={(e: any) => setInput(e.target.value)}
                        onKeyDown={(e: any) => {
                            if (e.key === "Enter") {
                                sendToPage(input)
                                setInput("")
                            }
                        }}
                        className="pr-10 rounded-full"
                    />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full hover:bg-muted"
                        onClick={handleAutoReply}
                        title="Generate AI Reply"
                        disabled={isThinking}
                    >
                        <Wand2 className="h-4 w-4" />
                    </Button>
                </div>
                <Button
                    onClick={() => {
                        sendToPage(input)
                        setInput("")
                    }}
                    className="rounded-full"
                >
                    Send
                </Button>
            </div>
        </div >
    )
}

export default SidePanel