export default function BackendPage() {
  return (
    <main style={{ fontFamily: "monospace", padding: "2rem" }}>
      <h1>Veshtit Backend API</h1>
      <p>This is the API server. All endpoints are under <code>/api/</code></p>
      <ul>
        <li>POST /api/auth/login</li>
        <li>POST /api/auth/logout</li>
        <li>GET /api/accounts</li>
        <li>POST /api/accounts</li>
        <li>GET/PUT/DELETE /api/accounts/:id</li>
        <li>GET /api/providers</li>
        <li>POST /api/import</li>
        <li>POST /api/import/resolve</li>
        <li>GET /api/export</li>
        <li>GET /api/seed</li>
      </ul>
    </main>
  );
}
