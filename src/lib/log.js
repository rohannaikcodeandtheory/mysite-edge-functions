// Safe logging: do not serialize request headers, URL query strings, or secrets.
export function log(req, resp) {
  const pathname = new URL(req.url).pathname;
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), level: 'info', event: 'edge.response', method: req.method, pathname, status: resp.status }));
}
