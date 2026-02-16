async function requestToken(payload) {
  const res = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: new URLSearchParams(payload)
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Kakao token error: ${JSON.stringify(data)}`);
  return data;
}

export async function exchangeAuthCode({ restApiKey, redirectUri, authCode, clientSecret = '' }) {
  const payload = {
    grant_type: 'authorization_code',
    client_id: restApiKey,
    redirect_uri: redirectUri,
    code: authCode
  };
  if (clientSecret) payload.client_secret = clientSecret;
  return requestToken(payload);
}

export async function refreshAccessToken({ restApiKey, refreshToken, clientSecret = '' }) {
  const payload = {
    grant_type: 'refresh_token',
    client_id: restApiKey,
    refresh_token: refreshToken
  };
  if (clientSecret) payload.client_secret = clientSecret;
  return requestToken(payload);
}

export async function sendMemo({ accessToken, text }) {
  const templateObject = {
    object_type: 'text',
    text,
    link: {
      web_url: 'https://news.hada.io',
      mobile_web_url: 'https://news.hada.io'
    }
  };

  const res = await fetch('https://kapi.kakao.com/v2/api/talk/memo/default/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
    },
    body: new URLSearchParams({
      template_object: JSON.stringify(templateObject)
    })
  });

  const data = await res.json();
  if (!res.ok || data.result_code !== 0) {
    throw new Error(`Kakao send error: ${JSON.stringify(data)}`);
  }

  return data;
}
