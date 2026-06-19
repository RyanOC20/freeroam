# Freeroam

**Your routes, all of them.**

Drop your Strava bulk-export archive onto the page and see every GPS route you've ever recorded as a full-screen, pannable, zoomable heatmap. No account, no login, no server — your GPS data never leaves your browser.

---

## How to get your Strava archive

1. Log in to Strava and go to **Settings → My Account**.
2. Scroll to **"Download or Delete Your Account"** and click **"Get Started"**.
3. Under **"Download Your Data"**, click **"Request Your Archive"**.
4. Strava will email you a download link (usually within a few minutes).
5. Download the ZIP — **you do not need to delete your account** to request it.

The ZIP contains an `activities/` folder with one file per activity in GPX, TCX, or FIT format (some gzip-compressed). Drop that ZIP directly onto Freeroam.

---

## Run locally

**Prerequisites:** Node 18+ and npm.

```bash
git clone https://github.com/RyanOC20/freeroam.git
cd freeroam
npm install
cp .env.example .env.local        # then fill in your key (see below)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### MapTiler API key

Freeroam uses [MapTiler](https://www.maptiler.com/) for the dark basemap. The free tier covers personal use.

1. Sign up at maptiler.com → **API Keys** → copy your default key.
2. Paste it into `.env.local`:
   ```
   VITE_MAPTILER_KEY=your_key_here
   ```
3. In the MapTiler dashboard, restrict the key to your domain (e.g. `*.pages.dev`, `localhost`) to prevent misuse.

The key is baked into the client bundle at build time (standard practice for client-side map keys).

---

## Deploy to Cloudflare Pages (free)

Cloudflare Pages hosts static sites for free with automatic HTTPS on a `*.pages.dev` URL — no credit card required.

### Option A — Git-connected (auto-deploy on push)

1. Push this repo to GitHub.
2. Log in to the [Cloudflare dashboard](https://dash.cloudflare.com/) → **Pages** → **Create a project** → **Connect to Git**.
3. Select your repo. Set:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Under **Settings → Environment variables**, add `VITE_MAPTILER_KEY` with your key.
5. Click **Save and Deploy**. Every `git push` to `main` triggers a new deploy automatically.

### Option B — Manual deploy

```bash
npm run build
npx wrangler pages deploy dist
```

Follow the prompts to link or create a Pages project. Re-run to deploy updates.

---

## Privacy

All parsing and rendering happens entirely in your browser. No GPS data, filenames, or activity metadata is ever sent to a server. The only network requests are to MapTiler for map tiles (tile requests include bounding-box coordinates, which is standard for any map application).

---

## License

MIT © Ryan O'Connor
