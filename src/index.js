import { getConfig, required } from './config.js';
import { fetchGeekNewsItems } from './rss.js';
import { buildKeyPoint } from './openai.js';
import { exchangeAuthCode, refreshAccessToken, sendMemo } from './kakao.js';
import { formatDigest } from './format.js';
import { fetchTopicContext } from './topic-context.js';

async function getAccessToken(config) {
  const { restApiKey, clientSecret, redirectUri, authCode, refreshToken, accessToken } = config.kakao;

  required(restApiKey, 'KAKAO_REST_API_KEY');

  if (refreshToken) {
    const refreshed = await refreshAccessToken({ restApiKey, refreshToken, clientSecret });
    return {
      accessToken: refreshed.access_token,
      issuedBy: 'refresh_token',
      refreshToken: refreshed.refresh_token || refreshToken
    };
  }

  if (accessToken) return { accessToken, issuedBy: 'env_access_token' };

  required(redirectUri, 'KAKAO_REDIRECT_URI');
  required(authCode, 'KAKAO_AUTH_CODE');

  const firstToken = await exchangeAuthCode({ restApiKey, redirectUri, authCode, clientSecret });
  return {
    accessToken: firstToken.access_token,
    issuedBy: 'auth_code',
    refreshToken: firstToken.refresh_token || ''
  };
}

async function main() {
  const config = getConfig();
  const items = await fetchGeekNewsItems(config.rssUrl, config.topN);
  console.log(`Fetched ${items.length} article(s) from GeekNews RSS.`);

  const itemsWithKeyPoints = [];
  for (const item of items) {
    const topicContext = await fetchTopicContext(item.link);
    const keyPoint = await buildKeyPoint({ ...item, context: topicContext.summary }, {
      useOpenAI: config.useOpenAI,
      apiKey: config.openaiApiKey,
      model: config.openaiModel,
      maxCharsPerItem: config.maxCharsPerItem
    });

    itemsWithKeyPoints.push({
      ...item,
      keyPoint,
      sourceLink: topicContext.sourceLink
    });
  }

  const text = formatDigest(itemsWithKeyPoints);
  if (config.dryRun) {
    console.log('[DRY_RUN=true] 카카오 전송 없이 메시지 본문만 출력합니다.');
    console.log(text);
    return;
  }

  const token = await getAccessToken(config);
  await sendMemo({ accessToken: token.accessToken, text });

  console.log('Sent Kakao memo successfully.');
  console.log(`Token source: ${token.issuedBy}`);

  if (token.refreshToken) {
    console.log('Refresh token (save into .env):');
    console.log(`KAKAO_REFRESH_TOKEN=${token.refreshToken}`);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
