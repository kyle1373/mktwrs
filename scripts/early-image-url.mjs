// Discord sometimes percent-encodes the Twitter image size suffix inside its proxy URL.
// Preserve the original proxy as a download fallback, but identify media by its source URL.
export function earlyImageURL(raw) {
  if (!/^https?:\/\//.test(raw)) return null;
  let value = raw;
  const proxy = value.match(/^https:\/\/images-ext-\d+\.discordapp\.net\/external\/[^/]+\/(https?)\/(pbs\.twimg\.com\/media\/[^?]+)/i);
  if (proxy) value = `${proxy[1]}://${decodeURIComponent(proxy[2])}`;
  if (!/(\/attachments\/|pbs\.twimg\.com\/media\/)/.test(value) || !/\.(png|jpe?g|webp|gif)(?::(?:large|orig))?(\?|$)/i.test(value)) return null;
  const url = new URL(value);
  if (url.hostname === 'media.discordapp.net') {
    for (const key of ['width', 'height', 'format', 'quality']) url.searchParams.delete(key);
  }
  return url.toString();
}
