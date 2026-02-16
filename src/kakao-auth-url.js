import { getConfig, required } from './config.js';

const config = getConfig();
const { restApiKey, redirectUri } = config.kakao;

required(restApiKey, 'KAKAO_REST_API_KEY');
required(redirectUri, 'KAKAO_REDIRECT_URI');

const authUrl = new URL('https://kauth.kakao.com/oauth/authorize');
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('client_id', restApiKey);
authUrl.searchParams.set('redirect_uri', redirectUri);
authUrl.searchParams.set('scope', 'talk_message');

console.log('Open this URL in browser and approve:');
console.log(authUrl.toString());
console.log('');
console.log('After redirect, copy `code` from the URL and set KAKAO_AUTH_CODE in .env');
