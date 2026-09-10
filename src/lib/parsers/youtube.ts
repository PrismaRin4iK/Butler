import { YouTubeMetadata } from '../../types';

export function isYouTubeUrl(input: string): boolean {
  try {
    const trimmed = input.trim();
    if (!trimmed) return false;
    const withProto = trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `https://${trimmed}`;
    const url = new URL(withProto);
    return (
      url.hostname.includes('youtube.com') ||
      url.hostname.includes('youtu.be')
    );
  } catch {
    return false;
  }
}

export function extractYouTubeVideoId(input: string): string | null {
  try {
    const trimmed = input.trim();
    if (!trimmed) return null;

    // 1. Comprehensive regex for 11-char video ID across YouTube formats
    const regexMatch = trimmed.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|live\/|watch\/?\?v=|watch\/?\?.+&v=))([\w-]{11})/i
    );
    if (regexMatch && regexMatch[1]) {
      return regexMatch[1];
    }

    const withProto = trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `https://${trimmed}`;

    if (!isYouTubeUrl(withProto)) return null;

    const url = new URL(withProto);

    // 2. Query parameter 'v'
    const vParam = url.searchParams.get('v');
    if (vParam) {
      const clean = vParam.split('&')[0];
      return clean && clean.length >= 11 ? clean.slice(0, 11) : clean || null;
    }

    // 3. youtu.be/<id>
    if (url.hostname.includes('youtu.be')) {
      const path = url.pathname.replace(/^\/+/, '');
      const id = path.split('/')[0]?.split('?')[0];
      return id ? (id.length >= 11 ? id.slice(0, 11) : id) : null;
    }

    // 4. Paths: /shorts/<id>, /live/<id>, /embed/<id>, /v/<id>
    const segments = url.pathname.split('/').filter(Boolean);
    if (segments.length >= 2 && ['shorts', 'live', 'embed', 'v'].includes(segments[0])) {
      const id = segments[1].split('?')[0];
      return id ? (id.length >= 11 ? id.slice(0, 11) : id) : null;
    }

    return null;
  } catch {
    return null;
  }
}

export function extractYouTubePlaylistId(input: string): string | null {
  try {
    const trimmed = input.trim();
    if (!trimmed) return null;

    const regexMatch = trimmed.match(/[?&]list=([\w-]+)/i);
    if (regexMatch && regexMatch[1]) {
      return regexMatch[1];
    }

    const withProto = trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `https://${trimmed}`;

    if (!isYouTubeUrl(withProto)) return null;

    const url = new URL(withProto);
    return url.searchParams.get('list');
  } catch {
    return null;
  }
}

/**
 * Converts ISO 8601 duration (e.g. PT1H15M30S, PT4M20S, PT45S) into minutes.
 */
export function parseIsoDurationToMinutes(isoDuration: string): number {
  if (!isoDuration || typeof isoDuration !== 'string') return 15;

  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 15;

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  const totalSeconds = hours * 3600 + minutes * 60 + seconds;
  return Math.max(1, Math.round(totalSeconds / 60));
}

export interface ParsedYouTubeVideo {
  title: string;
  videoId: string;
  channelTitle: string;
  thumbnailUrl: string;
  estimatedMinutes: number;
  metadata: YouTubeMetadata;
}

export async function fetchYouTubeVideoInfo(
  videoId: string,
  apiKey?: string
): Promise<ParsedYouTubeVideo> {
  const key = apiKey || process.env.YOUTUBE_API_KEY;

  if (key) {
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${key}`
      );

      if (res.ok) {
        const data = await res.json();
        const item = data.items?.[0];
        if (item) {
          const title = item.snippet?.title || 'YouTube Video';
          const channelTitle = item.snippet?.channelTitle || 'YouTube';
          const thumbnail =
            item.snippet?.thumbnails?.maxres?.url ||
            item.snippet?.thumbnails?.high?.url ||
            item.snippet?.thumbnails?.medium?.url ||
            `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
          const durationIso = item.contentDetails?.duration || 'PT15M';
          const estimatedMinutes = parseIsoDurationToMinutes(durationIso);

          return {
            title,
            videoId,
            channelTitle,
            thumbnailUrl: thumbnail,
            estimatedMinutes,
            metadata: {
              video_id: videoId,
              channel: channelTitle,
              thumbnail,
              duration_iso: durationIso,
            },
          };
        }
      }
    } catch (err) {
      console.warn('YouTube Data API error, falling back to oEmbed:', err);
    }
  }

  // Fallback: YouTube oEmbed
  try {
    const oembedRes = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );
    if (oembedRes.ok) {
      const oembed = await oembedRes.json();
      const title = oembed.title || 'YouTube Video';
      const channel = oembed.author_name || 'YouTube';
      const thumbnail =
        oembed.thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

      return {
        title,
        videoId,
        channelTitle: channel,
        thumbnailUrl: thumbnail,
        estimatedMinutes: 15, // Default duration fallback
        metadata: {
          video_id: videoId,
          channel,
          thumbnail,
        },
      };
    }
  } catch (err) {
    console.warn('YouTube oEmbed fallback failed:', err);
  }

  // Ultimate fallback
  const fallbackThumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  return {
    title: `YouTube Video (${videoId})`,
    videoId,
    channelTitle: 'YouTube',
    thumbnailUrl: fallbackThumbnail,
    estimatedMinutes: 15,
    metadata: {
      video_id: videoId,
      channel: 'YouTube',
      thumbnail: fallbackThumbnail,
    },
  };
}

export async function fetchYouTubePlaylistVideos(
  playlistId: string,
  apiKey?: string
): Promise<ParsedYouTubeVideo[]> {
  const key = apiKey || process.env.YOUTUBE_API_KEY;
  if (!key) return [];

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=25&playlistId=${playlistId}&key=${key}`
    );
    if (!res.ok) return [];

    const data = await res.json();
    const items = data.items || [];
    const results: ParsedYouTubeVideo[] = [];

    for (const item of items) {
      const videoId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
      if (!videoId) continue;

      const title = item.snippet?.title || 'YouTube Video';
      const channelTitle = item.snippet?.channelTitle || 'YouTube';
      const thumbnail =
        item.snippet?.thumbnails?.high?.url ||
        item.snippet?.thumbnails?.medium?.url ||
        `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

      results.push({
        title,
        videoId,
        channelTitle,
        thumbnailUrl: thumbnail,
        estimatedMinutes: 15,
        metadata: {
          video_id: videoId,
          channel: channelTitle,
          thumbnail,
        },
      });
    }

    return results;
  } catch (err) {
    console.warn('Error fetching playlist items:', err);
    return [];
  }
}
