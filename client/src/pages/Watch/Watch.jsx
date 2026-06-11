import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchBroadcasters } from '../../services/api';
import './Watch.css';

export default function Watch() {
  const [selectedCountry, setSelectedCountry] = useState(
    () => localStorage.getItem('wc_country') || 'US'
  );

  const { data: broadcasters = [], isLoading } = useQuery({
    queryKey: ['broadcasters'],
    queryFn: fetchBroadcasters,
  });

  const handleCountryChange = (code) => {
    setSelectedCountry(code);
    localStorage.setItem('wc_country', code);
  };

  const current = broadcasters.find((b) => b.code === selectedCountry) || broadcasters[0];

  return (
    <div className="page-container watch-page">
      <h1 className="page-title">Where to Watch</h1>
      <p className="page-subtitle">
        Official FIFA World Cup 2026 broadcasters — legal streams only
      </p>

      <div className="legal-notice glass-card">
        <strong>📺 Official broadcasts only</strong>
        <p>
          We link to licensed rights holders and FIFA+. We do not host or embed unauthorized streams.
        </p>
      </div>

      <div className="country-select">
        <label htmlFor="country">Your country</label>
        <select
          id="country"
          value={selectedCountry}
          onChange={(e) => handleCountryChange(e.target.value)}
        >
          {broadcasters.map((b) => (
            <option key={b.code} value={b.code}>{b.country}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="skeleton-line" style={{ height: 120 }} />
      ) : current && (
        <div className="broadcaster-card glass-card">
          <h2>{current.country}</h2>
          <div className="network-list">
            {current.networks.map((n, i) => (
              <div key={n} className="network-item">
                <span className="network-name">{n}</span>
                {current.links[i] && (
                  <a
                    href={current.links[i]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                  >
                    Watch on {n}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="all-broadcasters">
        <h3>All Regions</h3>
        <div className="broadcaster-grid">
          {broadcasters.map((b) => (
            <button
              key={b.code}
              className={`broadcaster-tile glass-card ${selectedCountry === b.code ? 'active' : ''}`}
              onClick={() => handleCountryChange(b.code)}
            >
              <strong>{b.country}</strong>
              <span>{b.networks.join(' · ')}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="fifa-plus glass-card">
        <h3>FIFA+</h3>
        <p>Highlights, documentaries, and selected live coverage worldwide.</p>
        <a
          href="https://www.fifa.com/fifaplus"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
        >
          Go to FIFA+
        </a>
      </div>
    </div>
  );
}
