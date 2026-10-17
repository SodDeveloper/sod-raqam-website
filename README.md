# SOD Raqam — Marketing Website

Premium marketing site for **SOD Raqam**, SOD's Laravel/PHP web ERP
(live product: https://erp.sodraqam.com · https://raqam.soderp.com).

Built with **Next.js (App Router) + TypeScript**, **Tailwind CSS v4**,
**Framer Motion**, **next-intl** (English + Arabic, full RTL), shadcn-style UI.
Output is a **fully static export** — a folder of HTML/CSS/JS with no server runtime.

- Site URL / canonical: **https://sodraqam.com**
- Languages: `/en/` and `/ar/` (Arabic is RTL, IBM Plex Sans Arabic; English uses Poppins)
- SEO: per-locale metadata, OpenGraph image, `hreflang` (en / ar / x-default), JSON-LD
  (`SoftwareApplication` + `FAQPage`), `sitemap.xml`, `robots.txt`, web manifest.

---

## 1. Requirements

- **Node.js 20 LTS** (built and tested on Node 20.19). Node 18.18+ also works.
- npm 10+.

## 2. Build (static export)

```bash
npm ci
npm run build
```

The static site is emitted to **`out/`** (configured via `output: "export"` in
`next.config.ts`). `trailingSlash: true`, so routes are folders:
`out/en/index.html`, `out/ar/index.html`, plus `out/index.html` which redirects to `/en/`.

Preview locally (any static server, e.g.):

```bash
npx serve out            # or: python3 -m http.server --directory out 4312
```

## 3. Lead endpoint configuration (before building for production)

The contact form POSTs JSON to a lead endpoint. Set it at build time:

```bash
# .env.production (or shell env before `npm run build`)
NEXT_PUBLIC_LEAD_ENDPOINT=https://erp.sodraqam.com/api/website-lead
```

If unset it defaults to `https://erp.sodraqam.com/api/website-lead`.
The endpoint itself is **not** part of this static bundle — see section 6.

## 4. Hosting (for Ragesh)

The `out/` folder is plain static files. Serve it from any web server/CDN at
`https://sodraqam.com`. Point `www.sodraqam.com` at the same content (redirect to apex).

### nginx example

```nginx
server {
    listen 80;
    server_name sodraqam.com www.sodraqam.com;
    return 301 https://sodraqam.com$request_uri;   # force https + apex (after TLS is set up)
}

server {
    listen 443 ssl http2;
    server_name sodraqam.com;

    ssl_certificate     /etc/letsencrypt/live/sodraqam.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sodraqam.com/privkey.pem;

    root /var/www/sodraqam.com/out;   # the exported folder from this repo
    index index.html;

    # Static export uses trailing-slash folders; try the folder's index.html
    location / {
        try_files $uri $uri/ $uri/index.html /index.html;
    }

    # Long-cache the hashed Next.js assets
    location /_next/static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    error_page 404 /404.html;
}
```

### Apache example (`.htaccess` in the site root)

```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_FILENAME}/index.html -f
RewriteRule ^(.*)$ $1/index.html [L]
ErrorDocument 404 /404.html

<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
</IfModule>
```

Deploy = copy the contents of `out/` to the web root. No Node runtime is needed on the host.

## 5. Project structure

```
src/
  app/
    layout.tsx                 # root passthrough
    page.tsx                   # / -> redirects to /en/
    [locale]/layout.tsx        # <html lang/dir>, fonts, metadata, next-intl provider
    [locale]/page.tsx          # home page (all sections) + JSON-LD
    sitemap.ts robots.ts manifest.ts
    globals.css                # Tailwind v4 theme tokens + brand utilities
  components/                  # header, footer, ui/, sections/
  i18n/                        # next-intl routing + request config
  messages/en.json ar.json     # all site copy (EN + professional Arabic)
public/
  brand/                       # SOD Raqam logos (official 2A)
  screens/                     # product screenshots in browser frames
  og.png favicon* icon-*       # social + favicons
server/
  website-lead.php             # lead endpoint — deployed on the Raqam server, NOT in the static zip
```

## 6. Lead endpoint (server-side — on the Raqam server, not in the static zip)

> **Deployment status:** This endpoint is already deployed and live on the Raqam
> server at `POST https://erp.sodraqam.com/api/website-lead`. It reuses the
> existing POC Odoo API user/key (copied server-to-server, never committed).
> A verified TEST lead was created in Odoo during QA. No action is needed from
> Ragesh for the endpoint; Ragesh only hosts the static `out/` folder.

Because the site is static and the host (Ragesh) is untrusted with secrets, the
contact form submits to a small endpoint hosted on **our** Raqam server:

- URL: `POST https://erp.sodraqam.com/api/website-lead`
- Source: `server/website-lead.php` in this repo.
- It creates a `crm.lead` in Odoo at **https://odoo.soderp.com**, mirroring the
  existing POC lead flow (`poc.soderp.com`).
- **CORS** is restricted to `https://sodraqam.com`, `https://www.sodraqam.com`
  (and `localhost` for testing). A **honeypot** field (`website`) and **nginx
  `limit_req`** rate limiting protect it. Input is validated server-side.

### Odoo fields written (mirrors the POC integration)

| Odoo model | Field | Value |
|---|---|---|
| `crm.lead` | `name` | `Website demo: SOD Raqam – <name> (<company>)` |
| `crm.lead` | `type` | `lead` |
| `crm.lead` | `contact_name` | submitter name |
| `crm.lead` | `partner_name` | company |
| `crm.lead` | `email_from` | email |
| `crm.lead` | `phone` | phone |
| `crm.lead` | `description` | company, country, interest, phone, email, language, message (HTML) |
| `crm.lead` | `tag_ids` | tag **SOD Raqam** (`crm.tag`, created if missing) |
| `crm.lead` | `source_id` | **Website - sodraqam.com** (`utm.source`, created if missing) |
| `crm.lead` | `team_id` | Sales team (if present) |

Auth uses Odoo's external API (JSON-RPC `common.authenticate` + `object.execute_kw`).

### Demo request flow ("Try live demo")

All "Try live demo" buttons (header, mobile menu, hero, CTA, contact card, footer) open an
in-site modal instead of linking to poc.soderp.com. It asks for the same fields as the
poc.soderp.com SOD Raqam card (full name, phone with country code, email, honeypot) and POSTs
`{"type":"demo","product":"SOD Raqam",name,phone,email,website,locale}` to the same endpoint.

The endpoint mirrors the POC demo-lead service: open lead with the same email -> add tag +
post a note; otherwise create `crm.lead` "Website demo: SOD Raqam – <name>" (type lead, tag
**SOD Raqam**, source **Website - sodraqam.com**, team **Sales**, salesperson = team leader,
"Requested product: SOD Raqam" in the description). The demo login is returned only in the
success response, from the optional `"demo"` key of the server config
(`{"product","url","username","password"}`) — it is never in the static bundle. If Odoo is
unreachable the request is appended to `/var/lib/sod-raqam-lead/pending-demo-leads.jsonl` and
the login is still shown (same as the POC queue). Contact-form requests are unchanged.

### Credentials (filled in by Ragesh / Anas — never committed)

The endpoint reads a **root-only JSON config outside the web root**, default
path `/etc/sod-raqam/website-lead.json` (override with env `SOD_LEAD_CONFIG`):

```json
{
  "crm": {
    "url": "https://odoo.soderp.com",
    "db": "sod",
    "login": "api_user",
    "api_key": "<<< PASTE THE EXISTING POC ODOO API KEY HERE >>>",
    "tag": "SOD Raqam",
    "source": "Website - sodraqam.com",
    "team": "Sales"
  }
}
```

- Reuse the **existing POC Odoo API user/key** (same `api_user` the POC lead
  service uses). Anas will share the key privately; paste it into the file above.
  `chmod 600` the file, owned by root.
- The site never sees these values; only the server-side PHP reads them.

### nginx snippet on the Raqam server

```nginx
# http {} block:
limit_req_zone $binary_remote_addr zone=websitelead:10m rate=5r/m;

# inside the erp.sodraqam.com server {} block:
location = /api/website-lead {
    limit_except POST OPTIONS { deny all; }
    limit_req zone=websitelead burst=5 nodelay;
    client_max_body_size 16k;
    include snippets/fastcgi-php.conf;      # or fastcgi_pass to your PHP-FPM socket
    fastcgi_param SCRIPT_FILENAME /var/www/sod-raqam-lead/website-lead.php;
    fastcgi_pass unix:/run/php/php8.3-fpm.sock;
}
```

(Place `website-lead.php` at `/var/www/sod-raqam-lead/`, outside the ERP app root.)

## 7. Brand

- Colours: Indigo `#3B2A8F`, Violet `#7B4DDB`, Midnight `#1C1640`, Lavender Mist `#F5F3FC`.
- Fonts: Poppins (English), IBM Plex Sans Arabic (Arabic).
- Logos/favicons: SOD Raqam official **2A** set.

---

_A product of SOD Technologies._
