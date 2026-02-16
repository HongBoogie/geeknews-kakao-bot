function decodeEntities(input) {
  return input
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTag(itemXml, tagName) {
  const regex = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const m = itemXml.match(regex);
  return m ? decodeEntities(m[1]) : "";
}

function extractAtomLink(entryXml) {
  const m = entryXml.match(/<link[^>]*href=["']([^"']+)["'][^>]*>/i);
  return m ? decodeEntities(m[1]) : "";
}

export async function fetchGeekNewsItems(rssUrl, topN = 7) {
  const res = await fetch(rssUrl);
  if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`);

  const xml = await res.text();
  const rssItems = [
    ...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi),
  ].map((m) => {
    const itemXml = m[1];
    return {
      title: extractTag(itemXml, "title"),
      link: extractTag(itemXml, "link"),
      pubDate: extractTag(itemXml, "pubDate"),
      description: extractTag(itemXml, "description"),
    };
  });

  const atomItems = [
    ...xml.matchAll(/<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/gi),
  ].map((m) => {
    const entryXml = m[1];
    return {
      title: extractTag(entryXml, "title"),
      link: extractAtomLink(entryXml),
      pubDate:
        extractTag(entryXml, "updated") || extractTag(entryXml, "published"),
      description:
        extractTag(entryXml, "summary") || extractTag(entryXml, "content"),
    };
  });

  const parsedItems = [...rssItems, ...atomItems]
    .filter((x) => x.title && x.link)
    .slice(0, topN);
  if (parsedItems.length === 0) {
    throw new Error(
      "RSS 파싱 결과가 0건입니다. RSS URL 응답 형식이 바뀌었는지 확인해 주세요.",
    );
  }

  return parsedItems;
}
