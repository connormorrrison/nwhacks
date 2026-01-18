import { useEffect, useState } from "react"

import "./style.css"

function OptionsPage() {
  const [apiKey, setApiKey] = useState("")
  const [endpoint, setEndpoint] = useState("")
  const [model, setModel] = useState("gemini-1.5-flash")
  const [systemPrompt, setSystemPrompt] = useState("")
  const [saved, setSaved] = useState("")

  useEffect(() => {
    chrome.storage.local.get(
      ["llm_api_key", "llm_endpoint", "llm_model", "llm_system_prompt"],
      (res) => {
        setApiKey(res.llm_api_key || "")
        setEndpoint(res.llm_endpoint || "")
        setModel(res.llm_model || "gemini-1.5-flash")
        setSystemPrompt(res.llm_system_prompt || "")
      }
    )
  }, [])

  const onSave = () => {
    chrome.storage.local.set(
      {
        llm_api_key: apiKey.trim(),
        llm_endpoint: endpoint.trim(),
        llm_model: model.trim(),
        llm_system_prompt: systemPrompt.trim()
      },
      () => {
        setSaved("Saved.")
        setTimeout(() => setSaved(""), 2000)
      }
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6 font-sans">
      <div className="max-w-xl space-y-4">
        <h1 className="text-2xl font-normal">AI Negotiator Options</h1>

        <div className="space-y-2">
          <label className="text-sm font-medium">Gemini API Key</label>
          <input
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Paste Gemini API key"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Endpoint (optional)</label>
          <input
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            placeholder="Leave blank for default Gemini endpoint"
          />
          <p className="text-xs text-muted-foreground">
            Use {`{API_KEY}`} in a custom endpoint if you want to inject the key
            into the URL.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Model (optional)</label>
          <input
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="gemini-1.5-flash"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            System prompt (used every reply)
          </label>
          <textarea
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            rows={6}
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Describe tone, constraints, and negotiation rules."
          />
        </div>

        <div className="text-xs text-muted-foreground">
          Keys are stored in Chrome local extension storage on this device only.
        </div>

        <button
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
          onClick={onSave}
        >
          Save
        </button>
        {saved && <span className="ml-3 text-sm text-green-600">{saved}</span>}
      </div>
    </div>
  )
}

export default OptionsPage
