/** Extracts a YouTube video ID from common link formats. Returns null if invalid. */
export function parseYouTubeId(input) {
  if (!input) return null;
  const s = String(input).trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s; // bare ID
  const patterns = [
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/))([A-Za-z0-9_-]{11})/,
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = s.match(p);
    if (m) return m[1];
  }
  return null;
}

export function youtubeEmbedUrl(id) {
  return `https://www.youtube.com/embed/${id}`;
}