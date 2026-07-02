const endpoints = [
  { href: "/api/health", label: "GET /api/health" },
  { href: "/api/topics", label: "POST /api/topics" },
  { href: "/api/script", label: "POST /api/script" },
  { href: "/api/images", label: "POST /api/images" },
  { href: "/api/audio", label: "POST /api/audio" },
  { href: "/api/compose", label: "POST /api/compose" },
  { href: "/api/video", label: "POST /api/video" }
];

export default function ApiHomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#fffaf2",
        color: "#141414",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        padding: "40px 20px"
      }}
    >
      <section
        style={{
          maxWidth: 720,
          margin: "0 auto",
          border: "1px solid rgba(20, 20, 20, 0.12)",
          borderRadius: 12,
          background: "#fff",
          boxShadow: "0 12px 30px rgba(20, 20, 20, 0.08)",
          padding: 24
        }}
      >
        <p style={{ margin: 0, color: "#f24f35", fontWeight: 900 }}>API 정상 실행 중</p>
        <h1 style={{ margin: "8px 0 10px", fontSize: 28, lineHeight: 1.2 }}>
          골때리는 건강 가이드 스튜디오 API
        </h1>
        <p style={{ margin: 0, color: "rgba(20, 20, 20, 0.68)", lineHeight: 1.6 }}>
          웹 앱은{" "}
          <a href="https://golddaegeon-health-guide-studio-web.vercel.app">
            golddaegeon-health-guide-studio-web.vercel.app
          </a>
          에서 열 수 있습니다.
        </p>
        <div style={{ display: "grid", gap: 8, marginTop: 20 }}>
          {endpoints.map((endpoint) => (
            <a
              key={endpoint.label}
              href={endpoint.href}
              style={{
                border: "1px solid rgba(20, 20, 20, 0.12)",
                borderRadius: 8,
                color: "#141414",
                fontWeight: 800,
                padding: "10px 12px",
                textDecoration: "none"
              }}
            >
              {endpoint.label}
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
