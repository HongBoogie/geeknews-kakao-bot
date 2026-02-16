import { getConfig, required } from "./config.js";
import { exchangeAuthCode } from "./kakao.js";

async function main() {
  const config = getConfig();
  const { restApiKey, clientSecret, redirectUri, authCode } = config.kakao;

  required(restApiKey, "KAKAO_REST_API_KEY");
  required(redirectUri, "KAKAO_REDIRECT_URI");
  required(authCode, "KAKAO_AUTH_CODE");

  const token = await exchangeAuthCode({
    restApiKey,
    redirectUri,
    authCode,
    clientSecret,
  });

  console.log("Token exchange succeeded. Save below into .env");
  console.log(`KAKAO_ACCESS_TOKEN=${token.access_token || ""}`);
  console.log(`KAKAO_REFRESH_TOKEN=${token.refresh_token || ""}`);
  if (typeof token.expires_in === "number") {
    console.log(`KAKAO_ACCESS_TOKEN_EXPIRES_IN=${token.expires_in}`);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
