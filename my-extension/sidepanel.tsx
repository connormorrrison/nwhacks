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
                            <div className="grid gap-4">
                                <div className="flex items-center justify-between space-x-2">
                                    <Label htmlFor="auto-negotiate">Auto-negotiate</Label>
                                    <Switch id="auto-negotiate" />
                                </div>
                                <div className="flex items-center justify-between space-x-2">
                                    <Label htmlFor="aggressive">Be aggressive</Label>
                                    <Switch id="aggressive" />
                                </div>
                                <div className="flex items-center justify-between space-x-2">
                                    <Label htmlFor="background-mode">Background mode</Label>
                                    <Switch id="background-mode" />
                                </div>
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

            {/* Test Input Area */}
            <div className="flex gap-2">
                <Input
                    placeholder="Type a message..."
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            const target = e.target as HTMLInputElement
                            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                                if (tabs[0]?.id) {
                                    chrome.tabs.sendMessage(tabs[0].id, {
                                        type: "INSERT_TEXT",
                                        text: target.value
                                    })
                                    target.value = ""
                                }
                            })
                        }
                    }}
                />
                <Button
                    onClick={() => {
                        const input = document.querySelector('input') as HTMLInputElement
                        if (input && input.value) {
                            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                                if (tabs[0]?.id) {
                                    chrome.tabs.sendMessage(tabs[0].id, {
                                        type: "INSERT_TEXT",
                                        text: input.value
                                    })
                                    input.value = ""
                                }
                            })
                        }
                    }}
                >
                    Send
                </Button>
            </div>
        </div>
    )
}

export default SidePanel
