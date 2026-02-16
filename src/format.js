function limit(text, n) {
  return text.length > n ? `${text.slice(0, n - 1)}…` : text;
}

export function formatDigest(itemsWithKeyPoints) {
  const today = new Date().toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const lines = [`[GeekNews 핵심 브리핑] ${today}`];

  itemsWithKeyPoints.forEach((item, idx) => {
    lines.push("");
    lines.push(`${idx + 1}. ${limit(item.title, 70)}`);
    lines.push("핵심:");
    lines.push(item.keyPoint);
    lines.push(`링크: ${item.link}`);
    if (item.sourceLink && item.sourceLink !== item.link) {
      lines.push(`원문: ${item.sourceLink}`);
    }
  });

  return lines.join("\n");
}
