# My English Diary — 개인용 AI 영어 일기

GitHub Pages + Supabase Auth/PostgreSQL/Edge Functions + Gemini API. PC, 노트북, 스마트폰의 브라우저에서 같은 계정으로 접근합니다. 개인 서버를 계속 실행할 필요가 없습니다.

## 0. 웹 브라우저로 설치 (권장)
Git, Node.js, VS Code 설치 없이 진행하는 방법입니다.
1. ZIP을 풀고 GitHub에서 `ai-english-diary` 공개 저장소를 생성합니다. Add README는 선택하지 않습니다.
2. Upload files에서 압축 내부의 docs, supabase, tests 폴더와 README.md, package.json, .gitignore를 드래그하고 Commit changes를 누릅니다. ZIP 자체나 바깥쪽 폴더를 올리지 않습니다. 숨김 파일 docs/.nojekyll 및 .gitignore도 확인합니다. 빠졌다면 Add file → Create new file에서 직접 생성합니다.
3. 아래 2절대로 Supabase 계정과 SQL을 설정합니다. SQL은 GitHub에 올린 파일을 수정할 필요 없이 SQL Editor에 붙여넣은 복사본의 UUID만 바꿔 실행해도 됩니다.
4. GitHub에서 docs/config.js를 열어 연필(Edit) 버튼을 눌러 URL과 공개 키만 수정하고 Commit changes를 누릅니다.
5. Google AI Studio에서 API 키를 발급하고 아래 3절의 Secrets 4개를 Supabase에 등록합니다.
6. Supabase Dashboard → Edge Functions → Deploy a new function → Via Editor (메뉴명은 변경될 수 있음)에서 함수 이름을 correct-diary로 지정합니다. 이 저장소의 supabase/functions/correct-diary/index.ts 전체를 편집기의 index.ts에 복사하여 배포합니다. JWT 검증을 활성화하고 함수의 자체 토큰/UID 검증 코드를 유지합니다. 웹 편집기에서 배포가 지원되지 않는 경우 아래 CLI 절차를 사용합니다.
7. GitHub Settings → Pages → Deploy from a branch → main → /docs → Save. Actions 배포 성공 후 사이트에 접속합니다.
8. 로그인, 저장, AI 교정, 휴대폰 조회 및 로그아웃 상태의 접근 차단을 확인합니다.

## 1. 준비
- GitHub 계정, Supabase 계정, Google AI Studio 계정.
- Node.js 22 이상 및 Git (CLI로 배포할 경우).
- 무료 플랜을 선택하되 실제 한도는 각 서비스에서 확인합니다. Gemini 무료 티어에 보낸 일기는 서비스 개선에 쓰일 수 있습니다. 민감정보는 보내지 마세요.

## 2. Supabase — 본인 전용 계정
1. https://supabase.com/dashboard 에서 새 프로젝트를 만듭니다.
2. Authentication → Users → Add user에서 본인의 이메일/강력한 비밀번호로 계정을 생성하고 이메일 확인을 완료합니다 (관리자가 직접 생성할 경우 Auto Confirm 선택 가능).
3. 생성한 사용자 UID(UUID)를 복사합니다.
4. Authentication 설정에서 신규 회원가입(Allow new users to sign up)을 비활성화하고 사용하지 않는 외부 로그인 및 익명 로그인을 끕니다. 설정 명칭은 대시보드 버전에 따라 다를 수 있습니다.
5. SQL Editor에서 `supabase/schema.sql` 전체를 열고, `00000000-0000-0000-0000-000000000000` 두 곳을 본인의 UID로 바꾼 뒤 실행합니다. 신규 DB에서 한 번만 실행하세요.
6. 프로젝트 Connect 또는 Settings → API Keys에서 Project URL과 Publishable key(또는 legacy anon key)를 복사해 `docs/config.js`의 두 값을 변경합니다. service_role/secret key는 절대 넣지 않습니다. 이 공개 키는 RLS를 전제로 공개 가능하며 계정 비밀번호는 포함하지 않습니다.

## 3. Gemini API 연결 (웹 배포 또는 CLI 대안)
1. https://aistudio.google.com/apikey 에서 키를 발급합니다. 프로젝트의 무료 모델 및 쿼터를 확인합니다.
2. Supabase CLI에서 프로젝트 연결. 프로젝트 ref는 프로젝트 URL의 `https://<ref>.supabase.co` 중 ref 부분입니다.

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
```

3. Supabase Dashboard → Edge Functions → Secrets에서 아래 4개 값을 설정합니다 (비밀 값은 이 문서나 GitHub에 쓰지 않습니다).

| 이름 | 값 |
|---|---|
| GEMINI_API_KEY | 발급받은 Gemini 키 |
| GEMINI_MODEL | AI Studio에서 사용 가능한 모델 ID (예: gemini-2.5-flash, 현재 제공 여부 및 무료 한도 확인) |
| OWNER_USER_ID | 본인 사용자 UUID |
| ALLOWED_ORIGIN | https://YOUR_GITHUB_USERNAME.github.io |

Origin에는 저장소 경로나 끝 슬래시를 포함하지 않습니다. 모델명에는 `models/` 접두사를 넣지 마세요. 실제 배포할 모델이 JSON structured output을 지원하는지 확인하세요.

```bash
npx supabase functions deploy correct-diary
```

JWT 검증은 켠 상태로 유지합니다. 함수가 추가로 실제 사용자 토큰과 고정 OWNER_USER_ID를 검증합니다. 401 문제를 해결하려고 인증을 무조건 끄지 마세요. Supabase 함수 기본 환경 변수 SUPABASE_URL/SUPABASE_ANON_KEY가 있는지 확인하세요.

## 4. GitHub Pages (CLI 업로드 대안)
1. GitHub에서 `ai-english-diary`라는 새 공개 저장소를 만듭니다. GitHub Free에서 Pages를 쓰기 위한 선택입니다. 소스는 공개되지만 DB는 RLS로 보호됩니다. API 키, 계정 비밀번호, 일기, 백업은 커밋하지 마세요.
2. 압축을 해제하고 해당 폴더로 이동합니다. 위 설정을 적용한 뒤 다음 명령을 실행합니다.

```bash
git init
git add .
git diff --cached --stat
git commit -m "Initial private diary app"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/ai-english-diary.git
git push -u origin main
```

3. 저장소 Settings → Pages → Build and deployment → Deploy from a branch → main → /docs → Save.
4. https://YOUR_GITHUB_USERNAME.github.io/ai-english-diary/ 에 접속합니다.
5. 본인 이메일과 비밀번호로 로그인합니다. 메모와 영어 일기를 작성 → AI 교정 → 일기 저장. 다른 기기에서 같은 날짜를 선택하면 저장된 결과가 표시됩니다.

## 5. 테스트
- `npm test`: 날짜, 교정 JSON 검증, 단어 diff 테스트.
- `node --check docs/app.js`: 브라우저 JS 문법 검사.
- 배포 후 로그인 실패/성공, 새 날짜 저장, 새로고침, 다른 기기 조회, 교정 결과·IPA·TTS, 다른 기기에서 수정한 후 충돌 경고, 삭제, JSON 내보내기를 확인합니다.
- 로그인하지 않은 요청은 DB 조회 및 AI 함수에서 차단되어야 합니다. 다른 사용자 계정을 만들었다면 본인 UID 외의 조회/삽입 및 AI 교정 요청도 거부되는지 확인합니다. 테스트 계정은 삭제하세요.
- 429는 AI 한도 초과 가능성이 있습니다. 401/403은 인증/UID/Origin 확인, 502는 모델 또는 공급자 오류를 확인합니다.
- 브라우저에서 한국어 메모가 AI 요청 본문에 없는지 확인하세요.

## 6. 저장/보안 정책
- 날짜별 1개 일기, 선택 날짜 수동 저장, 과거 날짜 변경/삭제 가능. 날짜는 접속 기기의 현지 날짜입니다.
- DB가 원본이며 기기 간 자동 실시간 반영은 하지 않습니다. 다시 불러오기 또는 날짜 선택으로 동기화됩니다. 동시 수정은 updated_at 기반으로 저장 충돌을 검출합니다.
- 전체 백업은 다운로드만 지원합니다. 복원 기능은 포함하지 않았습니다. 백업 JSON은 민감정보이므로 보호하세요.
- GitHub Pages 주소 및 로그인 화면 자체는 공개입니다. RLS와 함수의 고정 UID를 사용해 내용 및 AI 호출을 개인 계정으로 제한합니다. Supabase 관리자에게는 데이터가 보일 수 있고 종단간 암호화는 적용하지 않았습니다.
- 로그인 세션은 브라우저에 저장됩니다. 공용 PC에서는 로그아웃하고 브라우저 데이터를 지우세요. 무료 Supabase 프로젝트의 휴면 및 사용량 제한을 확인하세요.
- TTS는 브라우저/OS 음성에 의존하며 로컬 음성을 우선 선택합니다. 일부 음성은 외부 서비스로 전송될 수 있습니다. AI IPA/문법 설명은 오류가 있을 수 있습니다.
- 현재 영어 전용 교정이며 한국어 메모는 AI로 전송하지 않습니다. 실제 클라우드 계정, 모델/API, 브라우저 배포는 연결하지 않았습니다.

## 파일 구성
```
docs/                GitHub Pages 공개 배포 파일
  index.html         로그인 및 일기 화면
  style.css          반응형 스타일
  config.js          공개 URL/키 설정
  app.js             인증/저장/교정/음성/UI
  logic.js           날짜, 교정 검증, 단어 diff
  .nojekyll          정적 파일 배포
supabase/
  schema.sql         DB/RLS/동시 수정 제어
  config.toml        함수 설정
  functions/correct-diary/index.ts  인증된 AI 중계
 tests/              단위 테스트
```

공식 문서:
- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/functions/deploy
- https://supabase.com/docs/guides/functions/auth
- https://ai.google.dev/gemini-api/docs/pricing
- https://ai.google.dev/gemini-api/docs/structured-output


## 디자인 업데이트
종이 일기장 스타일: 미색 배경, 줄 노트 입력창, 빨간 밑줄 및 아래쪽 교정 표현, 전체 교정문과 문법 설명. 기존 설정 및 데이터베이스 변경 없이 docs/index.html, docs/style.css, docs/app.js만 교체해도 됩니다.
