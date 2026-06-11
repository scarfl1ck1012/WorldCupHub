import { routeRequest } from '../api/lib/router.js';

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; },
    end() { return this; },
  };
  return res;
}

const req = { method: 'GET', url: '/api/health', query: {} };
const res = mockRes();
await routeRequest(req, res, ['health']);
console.log('health:', res.statusCode, res.body);

const req2 = { method: 'GET', url: '/api/matches?year=2026', query: { year: '2026' } };
const res2 = mockRes();
await routeRequest(req2, res2, ['matches']);
console.log('matches 2026:', res2.statusCode, Array.isArray(res2.body) ? res2.body.length + ' fixtures' : res2.body);
