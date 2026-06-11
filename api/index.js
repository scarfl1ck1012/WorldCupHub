import { routeRequest } from './lib/router.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Parse URL. E.g. /api/matches?year=2026 -> /api/matches
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    let pathname = parsedUrl.pathname;
    
    // Remove /api prefix if present
    if (pathname.startsWith('/api/')) {
      pathname = pathname.slice(5);
    } else if (pathname === '/api') {
      pathname = '';
    }

    const segments = pathname ? pathname.split('/').filter(Boolean) : [];
    await routeRequest(req, res, segments);
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
