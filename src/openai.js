export async function buildKeyPoint(
  item,
  { useOpenAI, apiKey, model, maxCharsPerItem },
) {
  if (!useOpenAI || !apiKey) {
    return fallbackKeyPoint(item, maxCharsPerItem);
  }

  const context = pickBestContext(item);

  const draftPrompt = [
    "다음 글의 핵심을 한국어로 정리하세요.",
    "조건:",
    "- 과장/추측 금지",
    "- 제목 반복 금지",
    "- 불필요한 인삿말 금지",
    "- 핵심 사실 위주로 4~7문장",
    "",
    `[제목] ${item.title}`,
    `[요약원문] ${item.description || "N/A"}`,
    `[추가문맥] ${context || "N/A"}`,
  ].join("\n");

  const draft = await callOpenAI({ apiKey, model, prompt: draftPrompt });
  if (!draft) return fallbackKeyPoint(item, maxCharsPerItem);

  const refinePrompt = [
    "아래 텍스트를 카카오 알림용 핵심 요약으로 재작성하세요.",
    "출력 규칙:",
    "- 정확히 5줄",
    "- 각 줄은 '- '로 시작",
    "- 각 줄은 1문장, 18~55자",
    "- 서로 중복 금지",
    "- 인삿말/잡담 금지",
    "- 문장 끝은 마침표",
    "- 반드시 한국어",
    "- 줄 외 다른 텍스트 금지",
    "",
    `[제목] ${item.title}`,
    `[초안] ${normalizeSpacing(draft)}`,
    `[보조문맥] ${normalizeSpacing(context)}`,
  ].join("\n");

  const refined = await callOpenAI({ apiKey, model, prompt: refinePrompt });
  if (!refined) return fallbackKeyPoint(item, maxCharsPerItem);

  const bullets = normalizeBulletLines(refined);
  const unique = dedupeBullets(bullets);
  const filled = fillMissingBullets(unique, context, item.description);
  return fitBulletsToLength(filled, maxCharsPerItem);
}

async function callOpenAI({ apiKey, model, prompt }) {
  const body = {
    model,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: "당신은 기술 글 요약 편집자입니다. 사실 기반으로, 간결하고 읽기 좋은 문장만 작성합니다.",
          },
        ],
      },
      {
        role: "user",
        content: [{ type: "input_text", text: prompt }],
      },
    ],
    max_output_tokens: 500,
    temperature: 0.2,
  };

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.output_text?.trim() || "";
}

function fallbackKeyPoint(item, maxCharsPerItem) {
  const context = pickBestContext(item);
  const lines = toSentenceCandidates(context)
    .filter((x) => !isGreetingSentence(x))
    .slice(0, 5)
    .map((x) => ensureSentenceEnding(clampSentence(x, 55)));

  const bullets = lines.length > 0 ? lines : ["핵심 내용을 요약했습니다."];
  return fitBulletsToLength(bullets, maxCharsPerItem);
}

function pickBestContext(item) {
  return normalizeSpacing(item.context || item.description || item.title || "");
}

function normalizeSpacing(text) {
  return (text || "")
    .replace(/\s+/g, " ")
    .replace(/([.!?。])(?!\s|$)/g, "$1 ")
    .replace(/([가-힣])([A-Z])/g, "$1 $2")
    .replace(/([a-z])([가-힣])/g, "$1 $2")
    .trim();
}

function normalizeBulletLines(text) {
  const raw = (text || "")
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => x.replace(/^[-*]\s*/, "").replace(/^\d+\.\s*/, ""));

  if (raw.length > 0) {
    return raw.map((x) => ensureSentenceEnding(clampSentence(normalizeSpacing(x), 55)));
  }

  return toSentenceCandidates(text)
    .slice(0, 5)
    .map((x) => ensureSentenceEnding(clampSentence(x, 55)));
}

function toSentenceCandidates(text) {
  const cleaned = normalizeSpacing(text)
    .replace(/\b\d+\.\s*$/g, "")
    .trim();

  return cleaned
    .split(/(?<=[.!?。])\s+|\s*·\s*|\s*\/\s*|\s*\|\s*/)
    .map((x) => x.trim())
    .filter((x) => x.length >= 8)
    .filter((x) => !isNoiseSentence(x));
}

function dedupeBullets(lines) {
  const out = [];
  for (const line of lines) {
    if (isGreetingSentence(line)) continue;
    if (out.some((x) => isNearDuplicate(x, line))) continue;
    out.push(line);
    if (out.length >= 5) break;
  }
  return out;
}

function fillMissingBullets(lines, ...extras) {
  const out = [...lines];
  if (out.length >= 5) return out.slice(0, 5);

  for (const extra of extras) {
    for (const s of toSentenceCandidates(extra || "")) {
      const line = ensureSentenceEnding(clampSentence(s, 55));
      if (out.some((x) => isNearDuplicate(x, line))) continue;
      out.push(line);
      if (out.length >= 5) return out;
    }
  }

  while (out.length < 5) {
    out.push("핵심 내용을 요약해 전달합니다.");
  }
  return out.slice(0, 5);
}

function fitBulletsToLength(lines, maxCharsPerItem) {
  let chosen = [...lines].slice(0, 5);

  while (chosen.length > 3 && formatBullets(chosen).length > maxCharsPerItem) {
    chosen.pop();
  }

  while (formatBullets(chosen).length > maxCharsPerItem) {
    const idx = chosen.findIndex((x) => x.length > 28);
    if (idx === -1) break;
    chosen[idx] = ensureSentenceEnding(clampSentence(chosen[idx], chosen[idx].length - 8));
  }

  if (formatBullets(chosen).length > maxCharsPerItem) {
    const first = ensureSentenceEnding(clampSentence(chosen[0], Math.max(24, maxCharsPerItem - 8)));
    return formatBullets([first]);
  }

  return formatBullets(chosen);
}

function formatBullets(lines) {
  return lines.map((x) => `- ${x}`).join("\n");
}

function clampSentence(text, maxLen) {
  if (!text) return "";
  if (text.length <= maxLen) return text;
  const hard = text.slice(0, maxLen);
  const lastSpace = hard.lastIndexOf(" ");
  const cut = lastSpace > Math.floor(maxLen * 0.55) ? hard.slice(0, lastSpace) : hard;
  return `${cut.trim()}…`;
}

function ensureSentenceEnding(text) {
  if (!text) return text;
  const t = text.trim();
  if (/[.!?。]$/.test(t)) return t;
  if (t.endsWith("…")) return t;
  return `${t}.`;
}

function isGreetingSentence(text) {
  return /^(안녕하세요|반갑습니다|안녕|이번 글(?:에서는)?|오늘은|저는|제가)\b/.test(
    normalizeSpacing(text),
  );
}

function isNoiseSentence(text) {
  return /(요약원문|추가문맥|세\s*가지에\s*집중했습니다1\.)/i.test(normalizeSpacing(text));
}

function isNearDuplicate(a, b) {
  const na = normalizeForCompare(a);
  const nb = normalizeForCompare(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.length >= 20 && nb.includes(na)) return true;
  if (nb.length >= 20 && na.includes(nb)) return true;
  return overlapScore(na, nb) >= 0.8;
}

function normalizeForCompare(text) {
  return normalizeSpacing(text).toLowerCase().replace(/[^a-z0-9가-힣\s]/g, " ").replace(/\s+/g, " ").trim();
}

function overlapScore(a, b) {
  const sa = new Set(a.split(" ").filter((x) => x.length >= 2));
  const sb = new Set(b.split(" ").filter((x) => x.length >= 2));
  if (sa.size === 0 || sb.size === 0) return 0;
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter += 1;
  return inter / Math.min(sa.size, sb.size);
}
