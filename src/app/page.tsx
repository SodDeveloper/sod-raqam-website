const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

export default function RootRedirect() {
  return (
    <html lang="en">
      <head>
        <meta httpEquiv="refresh" content={`0; url=${BASE}/en/`} />
        <link rel="canonical" href="https://sodraqam.com/en/" />
      </head>
      <body>
        <p>
          Redirecting to <a href={`${BASE}/en/`}>SOD Raqam</a>…
        </p>
      </body>
    </html>
  );
}
