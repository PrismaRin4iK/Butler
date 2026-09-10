import { extract } from '@extractus/article-extractor';
import * as cheerio from 'cheerio';
import { ArticleMetadata } from '../../types';

export function isHttpUrl(input: string): boolean {
  try {
    const url = new URL(input.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function extractDomain(urlStr: string): string {
  try {
    const url = new URL(urlStr.trim());
    return url.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export interface ParsedArticle {
  title: string;
  domain: string;
  favicon?: string;
  rawContent: string;
  estimatedMinutes: number;
  metadata: ArticleMetadata;
}

export async function parseArticle(url: string): Promise<ParsedArticle> {
  const domain = extractDomain(url);
  const defaultFavicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

  try {
    const article = await extract(url);

    if (article && article.content) {
      // Use cheerio to clean HTML and get pure text for word counting
      const $ = cheerio.load(article.content);
      const cleanText = $.text().replace(/\s+/g, ' ').trim();
      const wordCount = cleanText.length > 0 ? cleanText.split(/\s+/).length : 200;

      // Specification: estimated_minutes = Math.max(2, Math.ceil(wordCount / 200))
      const estimatedMinutes = Math.max(2, Math.ceil(wordCount / 200));

      const title = article.title || domain || 'Статья';
      const favicon = article.favicon || defaultFavicon;
      const author = article.author || undefined;
      const description = article.description || undefined;

      return {
        title,
        domain,
        favicon,
        rawContent: article.content, // HTML string for Reader Mode
        estimatedMinutes,
        metadata: {
          domain,
          favicon,
          author,
          description,
        },
      };
    }
  } catch (err) {
    console.warn('article-extractor error, attempting direct fetch fallback:', err);
  }

  // Direct fetch fallback with Cheerio
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (res.ok) {
      const html = await res.text();
      const $ = cheerio.load(html);

      const title =
        $('meta[property="og:title"]').attr('content') ||
        $('title').text().trim() ||
        domain ||
        'Статья';

      const description =
        $('meta[property="og:description"]').attr('content') ||
        $('meta[name="description"]').attr('content');

      const favicon =
        $('link[rel="icon"]').attr('href') ||
        $('link[rel="shortcut icon"]').attr('href') ||
        defaultFavicon;

      // Extract main article or body content
      $('script, style, nav, footer, header, noscript, svg, form').remove();
      const mainContent = $('article, main, .content, #content, body').first();
      const cleanText = mainContent.text().replace(/\s+/g, ' ').trim();
      const wordCount = cleanText.length > 0 ? cleanText.split(/\s+/).length : 300;
      const estimatedMinutes = Math.max(2, Math.ceil(wordCount / 200));

      return {
        title,
        domain,
        favicon,
        rawContent: mainContent.html() || `<p>${cleanText}</p>`,
        estimatedMinutes,
        metadata: {
          domain,
          favicon,
          description,
        },
      };
    }
  } catch (err) {
    console.warn('Fallback direct fetch failed:', err);
  }

  // Ultimate fallback if page cannot be fetched
  return {
    title: `Материал с ${domain}`,
    domain,
    favicon: defaultFavicon,
    rawContent: `<p>Материал доступен по ссылке: <a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a></p>`,
    estimatedMinutes: 10,
    metadata: {
      domain,
      favicon: defaultFavicon,
    },
  };
}
