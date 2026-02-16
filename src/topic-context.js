function decodeEntities(input = "") {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function pickMetaDescription(html) {
  const patterns = [
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+name=["']twitter:description["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["'][^>]*>/i,
  ];

  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1]) return decodeEntities(m[1]);
  }

  return "";
}

function pickExternalSourceLink(html, pageUrl) {
  const links = [
    ...html.matchAll(/<a[^>]+href=["'](https?:\/\/[^"']+)["'][^>]*>/gi),
  ]
    .map((m) => m[1])
    .filter(Boolean);

  for (const href of links) {
    try {
      const url = new URL(href);
      if (url.hostname.endsWith("news.hada.io")) continue;
      if (url.hostname.endsWith("kakao.com")) continue;
      return href;
    } catch {
      // ignore invalid URL
    }
  }

  return pageUrl;
}

export async function fetchTopicContext(pageUrl) {
  try {
    const res = await fetch(pageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 geeknews-kakao-bot",
      },
    });

    if (!res.ok) return { summary: "", sourceLink: pageUrl };

    const html = await res.text();
    const metaDesc = pickMetaDescription(html);
    const summary = metaDesc;
    const sourceLink = pickExternalSourceLink(html, pageUrl);

    return {
      summary: summary.slice(0, 300),
      sourceLink,
    };
  } catch {
    return { summary: "", sourceLink: pageUrl };
  }
}
