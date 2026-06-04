"use client";

import { useState } from "react";
import { Search, Loader2 } from "lucide-react";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ title?: string }>>([]);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.results ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-nb-text">Search</h1>
      <p className="mt-1 text-sm text-nb-muted">Search files, members, and messages across the workspace.</p>
      <div className="mt-4 flex gap-2">
        <input
          className="h-10 flex-1 rounded-lg border border-nb-border bg-white px-3 text-sm text-nb-text outline-none focus:border-nb-green focus:ring-2 focus:ring-nb-green/20"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="Search files, members, messages..."
        />
        <button
          className="sl-btn sl-btn--primary"
          disabled={loading || !query.trim()}
          onClick={search}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Search
        </button>
      </div>
      <ul className="mt-4 space-y-2">
        {results.length === 0 && !loading && (
          <p className="text-sm text-nb-muted">{query ? "No results found." : "Enter a query to search."}</p>
        )}
        {results.map((r, i) => (
          <li key={i} className="rounded-lg border border-nb-border bg-white p-3 text-sm text-nb-text">
            {r.title ?? "Result"}
          </li>
        ))}
      </ul>
    </div>
  );
}
