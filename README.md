# geeknews-kakao-bot

GeekNews 최신 글을 가져와 각 글의 핵심 내용을 만들고 카카오톡 `나에게 보내기`로 전달하는 미니 프로젝트입니다.

## 1) n8n이 꼭 필요한가?

필수는 아닙니다.
- 공부 목적 + 커스터마이징: 이 코드 방식이 더 좋음
- 빠른 프로토타입/시각적 플로우: n8n이 편함

이 저장소는 **n8n 없이 코드로 구현**한 버전입니다.

## 2) 준비

- Node.js 18+
- 카카오 개발자 앱 생성
- 카카오 로그인 + `talk_message` 동의 설정
- `.env` 작성

```bash
cp .env.example .env
```

## 3) 카카오 최초 토큰 발급

1. `.env`에 최소 아래 값 입력

- `KAKAO_REST_API_KEY`
- `KAKAO_REDIRECT_URI` (카카오 개발자 콘솔에 등록한 Redirect URI와 동일해야 함)
- (선택) `KAKAO_CLIENT_SECRET` (클라이언트 시크릿 활성화한 경우 필수)

2. 인가 URL 생성

```bash
npm run kakao:auth-url
```

3. 출력된 URL을 브라우저에서 열고 로그인/동의
4. 리다이렉트된 URL의 `code` 값을 복사해서 `.env`의 `KAKAO_AUTH_CODE`에 입력
5. 토큰 교환 실행

```bash
npm run kakao:exchange
```

6. 출력된 `KAKAO_REFRESH_TOKEN`을 `.env`에 저장

## 4) 실행

```bash
npm run send
```

기본값은 `DRY_RUN=true`라서 카카오 전송 없이 결과 메시지 본문만 콘솔에 출력합니다.
카카오 전송까지 하려면 `.env`에서 `DRY_RUN=false`로 변경하세요.

## 5) 메시지 포맷

각 글마다 아래 형태로 발송됩니다.
- 제목
- 핵심: 3~5개 bullet
- 링크

## 6) 매일 자동 실행(예: macOS crontab)

```bash
crontab -e
```

```cron
0 9 * * * cd /Users/a1/Documents/geeknews-kakao-bot && /usr/bin/env node src/index.js >> /Users/a1/Documents/geeknews-kakao-bot/run.log 2>&1
```

## 7) OpenAI 사용 여부

- `USE_OPENAI=true`: OpenAI로 핵심 문장 생성
- `USE_OPENAI=false`: RSS description을 잘라서 핵심으로 사용

## 8) 주의

카카오 정책/동의 상태에 따라 메시지 API 호출이 실패할 수 있습니다. 실패 시 에러 응답(JSON)를 확인해 scope와 토큰 상태부터 점검하세요.
