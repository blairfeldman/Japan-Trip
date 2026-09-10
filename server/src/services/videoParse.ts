import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const execFileAsync = promisify(execFile);

export class MissingToolError extends Error {
  constructor(public tool: string) {
    super(`${tool} is not installed on this server`);
  }
}

async function hasBinary(name: string): Promise<boolean> {
  try {
    await execFileAsync(process.platform === 'win32' ? 'where' : 'which', [name]);
    return true;
  } catch {
    return false;
  }
}

export interface VideoMeta {
  title: string;
  description: string;
  uploader: string;
  thumbnailUrl?: string;
}

/**
 * Pulls the caption/description and uploader handle via yt-dlp's metadata
 * dump — this alone covers most cases, since creators usually put the
 * place name in the caption or pinned comment. Full video download + OCR
 * of on-screen text is a further step (see extractOnScreenText) for the
 * cases where the location is only shown as text baked into the video.
 */
export async function fetchVideoMeta(url: string): Promise<VideoMeta> {
  if (!(await hasBinary('yt-dlp'))) throw new MissingToolError('yt-dlp');
  const { stdout } = await execFileAsync('yt-dlp', ['--dump-json', '--no-playlist', '--skip-download', url], {
    maxBuffer: 1024 * 1024 * 20,
  });
  const json = JSON.parse(stdout);
  return {
    title: json.title ?? '',
    description: json.description ?? '',
    uploader: json.uploader ?? json.channel ?? 'unknown',
    thumbnailUrl: json.thumbnail,
  };
}

/**
 * Downloads the clip and OCRs a handful of sampled frames for on-screen
 * text (captions overlaid by the creator, which often carry the address).
 * Best-effort: returns '' if ffmpeg/tesseract aren't available rather than
 * failing the whole pipeline — the caption text alone is often enough.
 */
export async function extractOnScreenText(url: string): Promise<string> {
  const hasFfmpeg = await hasBinary('ffmpeg');
  const hasTesseract = await hasBinary('tesseract');
  const hasYtDlp = await hasBinary('yt-dlp');
  if (!hasFfmpeg || !hasTesseract || !hasYtDlp) return '';

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jt-share-'));
  try {
    const videoPath = path.join(tmpDir, 'clip.mp4');
    await execFileAsync('yt-dlp', ['-f', 'mp4', '--no-playlist', '-o', videoPath, url], { maxBuffer: 1024 * 1024 * 50 });
    const framePattern = path.join(tmpDir, 'frame-%02d.png');
    await execFileAsync('ffmpeg', ['-i', videoPath, '-vf', 'fps=1/2', '-frames:v', '6', framePattern]);
    const frames = fs.readdirSync(tmpDir).filter((f) => f.startsWith('frame-'));
    const texts: string[] = [];
    for (const frame of frames) {
      const { stdout } = await execFileAsync('tesseract', [path.join(tmpDir, frame), 'stdout']).catch(() => ({ stdout: '' }));
      if (stdout.trim()) texts.push(stdout.trim());
    }
    return texts.join('\n');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

export interface ExtractedLocation {
  placeName: string;
  cityOrArea: string;
  category: string;
}

/**
 * Asks Claude to pull a single concrete place name + area out of the
 * caption/on-screen text. Requires ANTHROPIC_API_KEY; without it, falls
 * back to a much weaker heuristic (first capitalized phrase near a
 * location-ish keyword) so the pipeline still produces *something* to
 * geocode rather than failing outright.
 */
export async function extractLocation(text: string): Promise<ExtractedLocation | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    const model = process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5-20251001';
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content:
              'A traveler shared a TikTok/Instagram clip about a restaurant, cafe, shop, or sight in Japan. ' +
              'From the caption and any on-screen text below, extract the single specific place being featured. ' +
              'Reply with ONLY compact JSON: {"placeName": "...", "cityOrArea": "...", "category": "one of ramen, sushi, matcha, food, shopping, hotel, sightseeing"}. ' +
              'If you cannot identify a specific real place, reply with {"placeName": null}.\n\n---\n' +
              text.slice(0, 4000),
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API error ${res.status}`);
    const json = await res.json();
    const raw = json.content?.[0]?.text ?? '{}';
    const match = raw.match(/\{[\s\S]*\}/);
    const parsed = match ? JSON.parse(match[0]) : {};
    if (!parsed.placeName) return null;
    return { placeName: parsed.placeName, cityOrArea: parsed.cityOrArea ?? '', category: parsed.category ?? 'food' };
  }

  // No LLM key configured — weak fallback so the pipeline degrades instead of dying.
  const m = text.match(/(?:at|@)\s+([A-Z][\w'&. -]{2,40})/);
  if (!m) return null;
  return { placeName: m[1].trim(), cityOrArea: '', category: 'food' };
}
