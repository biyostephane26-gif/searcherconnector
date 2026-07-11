// src/components/ApiKeyManager.tsx

import React, { useState, useEffect } from "react";

/**
 * Simple API‑Key manager UI.
 *
 * - For each configurable source we render an input field.
 * - Keys are persisted in `localStorage` under the key `scai_api_key_<source>`.
 * - On mount we pre‑fill the inputs with any stored key (premium user) or leave
 *   them empty (fallback to server‑side `.env`).
 * - Consumers can retrieve a key via the exported helper `getApiKey(sourceId)`.
 *   The helper first checks localStorage (user‑provided) then falls back to the
 *   environment variable that the backend already reads (`process.env.SERPER_API_KEY`
 *   etc.).
 */

export function getApiKey(sourceId: string): string | undefined {
  const stored = typeof window !== "undefined" ? localStorage.getItem(`scai_api_key_${sourceId}`) : null;
  if (stored) return stored;
  // Fallback to env – these are injected at build time for the client bundle.
  // We guard against undefined in the browser.
  if (typeof process !== "undefined" && process.env) {
    const envKey = process.env[`${sourceId.toUpperCase()}_API_KEY`];
    if (envKey) return envKey as string;
  }
  return undefined;
}

const ApiKeyManager: React.FC = () => {
  const [serperKey, setSerperKey] = useState<string>("");
  const [githubKey, setGithubKey] = useState<string>("");

  // Load any stored keys on first render
  useEffect(() => {
    const storedSerper = localStorage.getItem("scai_api_key_serper");
    const storedGit = localStorage.getItem("scai_api_key_github");
    if (storedSerper) setSerperKey(storedSerper);
    if (storedGit) setGithubKey(storedGit);
  }, []);

  const handleSave = () => {
    if (serperKey) localStorage.setItem("scai_api_key_serper", serperKey);
    else localStorage.removeItem("scai_api_key_serper");
    if (githubKey) localStorage.setItem("scai_api_key_github", githubKey);
    else localStorage.removeItem("scai_api_key_github");
    alert("Clés sauvegardées. Les appels API utiliseront désormais vos clés premium.");
  };

  return (
    <div style={{ padding: "1rem", background: "var(--background-alt)", borderRadius: "8px", maxWidth: "400px" }}>
      <h2 style={{ marginBottom: "0.5rem" }}>Gestionnaire de clés API</h2>
      <p style={{ fontSize: "0.9rem", marginBottom: "1rem" }}>
        Les clés renseignées ici seront prioritaires sur celles du fichier <code>.env</code>.
        Utilisez‑les pour lever les limitations de quota (utilisateurs premium).
      </p>
      <label htmlFor="serperKey" style={{ display: "block", marginBottom: "0.3rem" }}>
        Serper (Google) API Key
      </label>
      <input
        id="serperKey"
        type="password"
        value={serperKey}
        onChange={(e) => setSerperKey(e.target.value)}
        placeholder="Enter your Serper key"
        style={{ width: "100%", marginBottom: "0.8rem", padding: "0.4rem" }}
      />

      <label htmlFor="githubKey" style={{ display: "block", marginBottom: "0.3rem" }}>
        GitHub Token (optional)
      </label>
      <input
        id="githubKey"
        type="password"
        value={githubKey}
        onChange={(e) => setGithubKey(e.target.value)}
        placeholder="Enter your GitHub token"
        style={{ width: "100%", marginBottom: "1rem", padding: "0.4rem" }}
      />

      <button
        onClick={handleSave}
        style={{
          background: "var(--primary)",
          color: "white",
          border: "none",
          padding: "0.6rem 1.2rem",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Sauvegarder les clés
      </button>
    </div>
  );
};

export default ApiKeyManager;
