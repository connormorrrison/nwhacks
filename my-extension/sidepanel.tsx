import { Settings } from "lucide-react"
import { useState, useEffect } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

import "./style.css"



function SidePanel() {
    const [messages, setMessages] = useState<{ text: string, sender: "me" | "them" }[]>([])
    const [metadata, setMetadata] = useState<{ itemInfo: string | null, personName: string | null }>({ itemInfo: null, personName: null })
    const [suggestions, setSuggestions] = useState<{ label: string, text: string }[]>([])
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
    const [input, setInput] = useState("") // Controlled input

    // Listen for messages from the content script
    useEffect(() => {
        const messageListener = (request, sender, sendResponse) => {
            if (request.type === "FULL_MESSAGE_HISTORY") {
                console.log("AI Negotiator: Received full history:", request.messages)
                setMessages(request.messages)
            }
            if (request.type === "CHAT_METADATA") {
                setMetadata(request.metadata)
            }
        }
        chrome.runtime.onMessage.addListener(messageListener)
        return () => chrome.runtime.onMessage.removeListener(messageListener)
    }, [])

    const handleGenerateSuggestions = async () => {
        setIsLoadingSuggestions(true)
        try {
            // Dynamically import the AI client to avoid load-time issues if env vars missing
            const { generateNegotiationSuggestions } = await import("~lib/ai-client")
            const results = await generateNegotiationSuggestions(messages, metadata)
            setSuggestions(results)
        } catch (error) {
            console.error("Failed to generate suggestions:", error)
        } finally {
            setIsLoadingSuggestions(false)
        }
    }

    const sendToPage = (text: string) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: "INSERT_TEXT",
                    text: text
                })
            }
        })
    }

    return (
        <div className="flex flex-col h-screen w-screen bg-background text-foreground p-4 font-sans">
            <div className="flex justify-between items-start mb-6">
                <div className="space-y-4">
                    <h2 className="text-2xl font-normal tracking-tight">AI Negotiator</h2>

                    {(metadata.personName || metadata.itemInfo) && (
                        <div className="space-y-1 bg-muted/50 p-3 rounded-lg border">
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
                    )}
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
                        </div>
                    </PopoverContent>
                </Popover>
            </div>

            {/* Message Display Area */}
            <div className="flex-1 overflow-y-auto mb-4 border rounded-md p-2 space-y-2">
                {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        Select an item to negotiate
                    </div>
                ) : (
                    messages.map((msg, index) => (
                        <div
                            key={index}
                            className={cn(
                                "p-2 rounded-lg text-sm max-w-[80%]",
                                msg.sender === "me"
                                    ? "bg-primary text-primary-foreground ml-auto"
                                    : "bg-muted text-foreground mr-auto"
                            )}
                        >
                            {msg.text}
                        </div>
                    ))
                )}
            </div>

            {/* Suggestions Area */}
            <div className="mb-4">
                {suggestions.length === 0 ? (
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleGenerateSuggestions}
                        disabled={messages.length === 0 || isLoadingSuggestions}
                    >
                        {isLoadingSuggestions ? "Thinking..." : "✨ Suggest Replies"}
                    </Button>
                ) : (
                    <div className="grid gap-2">
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">AI Suggestions</span>
                            <button onClick={() => setSuggestions([])} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>
                        </div>
                        {suggestions.map((suggestion, idx) => (
                            <button
                                key={idx}
                                className="text-left p-3 rounded-md border hover:bg-muted/50 transition-colors text-sm flex flex-col gap-1"
                                onClick={() => {
                                    setInput(suggestion.text)
                                    sendToPage(suggestion.text) // Auto-fill on click
                                }}
                            >
                                <span className={cn(
                                    "text-xs font-bold px-2 py-0.5 rounded-full w-fit",
                                    suggestion.label === "Accept" ? "bg-green-100 text-green-700" :
                                        suggestion.label === "Counter" ? "bg-blue-100 text-blue-700" :
                                            "bg-red-100 text-red-700"
                                )}>
                                    {suggestion.label}
                                </span>
                                <span className="line-clamp-2">{suggestion.text}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="flex gap-2">
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
                />
                <Button
                    onClick={() => {
                        sendToPage(input)
                        setInput("")
                    }}
                >
                    Send
                </Button>
            </div>
        </div>
    )
}

export default SidePanel
