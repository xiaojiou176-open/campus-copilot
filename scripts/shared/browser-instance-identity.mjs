import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ensureDirectory } from '../lib/cache-governance.mjs';

export const BROWSER_IDENTITY_RUNTIME_DIRNAME = 'browser-identity';
const DEFAULT_IDENTITY_TITLE_SUFFIX = 'browser lane';
const HEX_COLOR_PATTERN = /^#(?:[\da-f]{3}|[\da-f]{6})$/i;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function hashString(value) {
  let hash = 0;
  for (const character of String(value)) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return hash;
}

function deriveIdentityAccent(label) {
  const hue = hashString(label) % 360;
  return `hsl(${hue} 76% 46%)`;
}

function deriveIdentityMonogram(label) {
  const tokens = String(label)
    .split(/[^a-zA-Z0-9]+/)
    .map((value) => value.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return 'CC';
  }
  if (tokens.length === 1) {
    return tokens[0].slice(0, 2).toUpperCase();
  }
  return `${tokens[0][0] || ''}${tokens[1][0] || ''}`.toUpperCase();
}

function buildIdentityFavicon({ accent, monogram }) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill="${accent}" />
      <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
        font-family="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        font-size="26" font-weight="700" fill="white">${escapeHtml(monogram)}</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function buildBrowserIdentityPageHtml({
  repoLabel,
  repoRoot,
  cdpUrl,
  cdpPort,
  userDataDir,
  profileDisplayName,
  profileDirectory,
  accent,
  monogram,
  primarySiteUrl,
  attachSummary,
}) {
  const title = `${repoLabel} · ${cdpPort} · ${DEFAULT_IDENTITY_TITLE_SUFFIX}`;
  const faviconUrl = buildIdentityFavicon({ accent, monogram });
  const quickLinks = [{ label: 'Primary site', url: primarySiteUrl }].filter((entry) => entry.url);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <link rel="icon" href="${faviconUrl}" />
    <style>
      :root {
        --accent: ${accent};
        --accent-soft: color-mix(in srgb, ${accent} 15%, white);
        --border: rgba(15, 23, 42, 0.12);
        --surface: rgba(255, 255, 255, 0.92);
        --surface-strong: rgba(255, 255, 255, 0.98);
        --text: #0f172a;
        --muted: #475569;
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        min-height: 100vh;
        font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: var(--text);
        background:
          radial-gradient(circle at top left, color-mix(in srgb, var(--accent) 22%, white), transparent 32%),
          linear-gradient(160deg, #f8fafc 0%, #eef2ff 40%, #ecfeff 100%);
      }

      main {
        width: min(1040px, calc(100vw - 40px));
        margin: 32px auto;
        padding: 28px;
        border-radius: 28px;
        background: rgba(255, 255, 255, 0.76);
        border: 1px solid var(--border);
        backdrop-filter: blur(12px);
        box-shadow: 0 24px 60px rgba(15, 23, 42, 0.12);
      }

      .hero {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 18px;
        align-items: center;
        margin-bottom: 24px;
      }

      .badge {
        width: 72px;
        height: 72px;
        border-radius: 22px;
        display: grid;
        place-items: center;
        background: var(--accent);
        color: white;
        font-size: 24px;
        font-weight: 800;
        letter-spacing: 0.06em;
        box-shadow: 0 18px 34px color-mix(in srgb, var(--accent) 35%, transparent);
      }

      h1 {
        margin: 0 0 8px;
        font-size: clamp(28px, 3.8vw, 40px);
        line-height: 1.02;
      }

      .lede {
        margin: 0;
        color: var(--muted);
        font-size: 15px;
        line-height: 1.6;
      }

      .callout {
        margin: 18px 0 0;
        padding: 14px 16px;
        border-radius: 18px;
        background: var(--accent-soft);
        border: 1px solid color-mix(in srgb, var(--accent) 26%, white);
        font-size: 14px;
        line-height: 1.55;
      }

      .grid {
        display: grid;
        gap: 16px;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        margin-top: 24px;
      }

      .card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 22px;
        padding: 18px;
      }

      .eyebrow {
        margin: 0 0 10px;
        font-size: 12px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--muted);
      }

      .value {
        margin: 0;
        font-size: 22px;
        font-weight: 700;
        line-height: 1.25;
      }

      .stack {
        display: grid;
        gap: 12px;
      }

      .kv {
        padding: 12px 14px;
        border-radius: 16px;
        background: var(--surface-strong);
        border: 1px solid var(--border);
      }

      .kv label {
        display: block;
        margin-bottom: 6px;
        font-size: 12px;
        color: var(--muted);
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .kv code {
        display: block;
        word-break: break-word;
        font-family: "SFMono-Regular", SFMono-Regular, ui-monospace, Menlo, monospace;
        font-size: 13px;
        line-height: 1.55;
      }

      ul {
        margin: 10px 0 0;
        padding-left: 18px;
      }

      li { margin: 8px 0; }

      a {
        color: var(--accent);
        text-decoration: none;
        font-weight: 600;
      }

      a:hover { text-decoration: underline; }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <div class="badge">${escapeHtml(monogram)}</div>
        <div>
          <h1>${escapeHtml(repoLabel)}</h1>
          <p class="lede">
            This is the repo-owned browser lane identity tab. Keep it visible as the human-facing anchor so this
            Campus Copilot Chrome window stays easy to spot when several repos are open at once.
          </p>
          <p class="callout">
            Manual one-time polish: pin this tab if you want a tighter visual anchor. Browser avatar/theme changes
            stay manual on purpose so the repo does not depend on fragile Chrome-private settings.
          </p>
        </div>
      </section>

      <section class="grid">
        <article class="card">
          <p class="eyebrow">CDP lane</p>
          <p class="value">${escapeHtml(cdpUrl)}</p>
          <div class="stack" style="margin-top: 14px;">
            <div class="kv">
              <label>Repo label</label>
              <code>${escapeHtml(repoLabel)}</code>
            </div>
            <div class="kv">
              <label>CDP port</label>
              <code>${escapeHtml(String(cdpPort))}</code>
            </div>
            <div class="kv">
              <label>Attach lane summary</label>
              <code>${escapeHtml(attachSummary)}</code>
            </div>
          </div>
        </article>

        <article class="card">
          <p class="eyebrow">Browser root</p>
          <div class="stack">
            <div class="kv">
              <label>Repo root</label>
              <code>${escapeHtml(repoRoot)}</code>
            </div>
            <div class="kv">
              <label>Browser user-data-dir</label>
              <code>${escapeHtml(userDataDir)}</code>
            </div>
            <div class="kv">
              <label>Profile display name</label>
              <code>${escapeHtml(profileDisplayName)}</code>
            </div>
            <div class="kv">
              <label>Profile directory</label>
              <code>${escapeHtml(profileDirectory)}</code>
            </div>
          </div>
        </article>

        <article class="card">
          <p class="eyebrow">Quick links</p>
          <ul>
            ${quickLinks
              .map((entry) => `<li><a href="${escapeHtml(entry.url)}">${escapeHtml(entry.label)}</a></li>`)
              .join('')}
          </ul>
          <div class="stack" style="margin-top: 14px;">
            <div class="kv">
              <label>Identity accent</label>
              <code>${escapeHtml(accent)}</code>
            </div>
            <div class="kv">
              <label>Purpose</label>
              <code>Human-facing badge for the canonical Campus Copilot browser lane.</code>
            </div>
          </div>
        </article>
      </section>
    </main>
  </body>
</html>`;
}

export function writeBrowserIdentityPage({
  repoRoot,
  env = process.env,
  cdpPort,
  cdpUrl,
  browserProfile,
  primarySiteUrl,
  attachSummary = 'repo-owned Chrome single-instance attach lane',
}) {
  const repoLabel = env.CAMPUS_COPILOT_BROWSER_IDENTITY_LABEL?.trim() || path.basename(repoRoot);
  const accent =
    env.CAMPUS_COPILOT_BROWSER_IDENTITY_ACCENT?.trim() &&
    HEX_COLOR_PATTERN.test(env.CAMPUS_COPILOT_BROWSER_IDENTITY_ACCENT.trim())
      ? env.CAMPUS_COPILOT_BROWSER_IDENTITY_ACCENT.trim()
      : deriveIdentityAccent(repoLabel);
  const monogram = deriveIdentityMonogram(repoLabel);
  const identityDir = path.join(repoRoot, '.runtime-cache', BROWSER_IDENTITY_RUNTIME_DIRNAME);
  const identityPath = path.join(identityDir, 'index.html');
  ensureDirectory(identityDir);

  const html = buildBrowserIdentityPageHtml({
    repoLabel,
    repoRoot,
    cdpUrl,
    cdpPort,
    userDataDir: browserProfile.userDataDir,
    profileDisplayName: browserProfile.profileDisplayName,
    profileDirectory: browserProfile.profileDirectory,
    accent,
    monogram,
    primarySiteUrl,
    attachSummary,
  });

  fs.writeFileSync(identityPath, html, 'utf8');

  return {
    repoLabel,
    accent,
    monogram,
    identityPath,
    identityUrl: pathToFileURL(identityPath).href,
    title: `${repoLabel} · ${cdpPort} · ${DEFAULT_IDENTITY_TITLE_SUFFIX}`,
  };
}
