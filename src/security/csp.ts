/**
 * Content Security Policy for the production build.
 * - Scripts only from this site (no inline or third-party scripts).
 * - No network connections to any other server (blocks data exfiltration).
 * - Inline styles are allowed because the chart library sets style attributes.
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

/** Vite plugin: adds the CSP and a strict referrer policy to index.html at build time only. */
export function securityHeadersPlugin() {
  return {
    name: 'security-headers',
    apply: 'build' as const,
    transformIndexHtml(html: string) {
      return html.replace(
        '<meta charset="UTF-8" />',
        `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CONTENT_SECURITY_POLICY}" />\n    <meta name="referrer" content="no-referrer" />`,
      );
    },
  };
}
