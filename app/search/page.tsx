'use client';

import { useState } from 'react';

type Registration = {
  id: number;
  displayNumber: number;
  name: string;
  phone: string;
  playingRole: string;
  status: string;
  photoUrl: string;
  aadhaarUrl: string;
  paymentProofUrl: string;
  createdAt: string;
};

function formatDisplayNumber(value: number) {
  return `#${String(value).padStart(3, '0')}`;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setLoading(true);

    const response = await fetch(`/api/search?query=${encodeURIComponent(query.trim())}`);
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(data?.error || 'Search failed.');
      return;
    }

    setResults(data.registrations);
    if (data.registrations.length === 0) {
      setMessage('No players found.');
    }
  }

  return (
    <main>
      <section className="section-header">
        <div>
          <span className="eyebrow">Player Search</span>
          <h1>Find registered players</h1>
          <p>Search the SPL Stallions ledger by name or phone to confirm payment and approval status.</p>
        </div>
      </section>

      <div className="card">
        <form onSubmit={handleSearch}>
          <div className="field">
            <label htmlFor="query">Search by name or phone</label>
            <input
              id="query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              type="search"
              placeholder="Enter player name or phone"
              required
            />
          </div>
          <button type="submit" disabled={loading}>{loading ? 'Searching...' : 'Search roster'}</button>
        </form>
      </div>

      {message ? <p className="helper-text">{message}</p> : null}

      <div className="grid-list" style={{ marginTop: 24 }}>
        {results.map((item) => (
          <div className="card stadium-card" key={item.id}>
            <div className="registration-card">
              <img src={item.photoUrl} alt={`${item.name} photo`} />
              <div>
                <h2>{item.name}</h2>
                <p><strong>Display No:</strong> {formatDisplayNumber(item.displayNumber)}</p>
                <p><strong>Phone:</strong> {item.phone}</p>
                <p><strong>Playing Role:</strong> {item.playingRole}</p>
                <p><strong>Status:</strong> <span className={`status-badge ${item.status === 'verified' ? 'status-verified' : 'status-pending'}`}>{item.status}</span></p>
                <p><strong>Registered:</strong> {new Date(item.createdAt).toLocaleString()}</p>
              </div>
            </div>

            <div className="media-grid">
              <div>
                <strong>Aadhaar</strong>
                <img src={item.aadhaarUrl} alt="Aadhaar" />
              </div>
              <div>
                <strong>Payment proof</strong>
                <img src={item.paymentProofUrl} alt="Payment proof" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
