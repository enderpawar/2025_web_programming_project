# 🤖 AI 코드 힌트 기능 설치 가이드

## 개요
Gemini API를 활용한 AI 코드 힌트 기능이 추가되었습니다. 사용자가 문제를 풀 때 AI가 유용한 힌트를 제공합니다.

## 설치 단계

### 1. Gemini API 키 발급

1. [Google AI Studio](https://ai.google.dev/) 방문
2. Google 계정으로 로그인
3. "Get API Key" 클릭
4. 새 프로젝트 생성 또는 기존 프로젝트 선택
5. API 키 복사

### 2. 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성하거나 수정:

```bash
# .env 파일
GEMINI_API_KEY=여기에_실제_API_키_입력

# 기타 설정
PORT=4000
JWT_SECRET=your-secret-key-change-this-in-production
```

### 3. 서버 실행

```bash
npm run dev
```

## 사용 방법

1. 문제 페이지로 이동
2. 코드를 작성하거나 고민 중일 때
3. **"💡 Get AI Hint"** 버튼 클릭
4. AI가 분석한 힌트 확인

## 기능 상세

### AI가 제공하는 것:
- ✅ 문제 해결 방향 제시
- ✅ 적합한 자료구조/알고리즘 제안
- ✅ 현재 코드의 문제점 지적
- ✅ Edge case 고려 사항

### AI가 제공하지 않는 것:
- ❌ 완전한 정답 코드
- ❌ 복사-붙여넣기 가능한 솔루션

## API 비용

Gemini API는 무료 티어에서 다음을 제공합니다:
- **월 60 requests/분**
- **월 1,500 requests/일**
- **월 1,000,000 토큰**

자세한 내용: [Gemini API Pricing](https://ai.google.dev/pricing)

## 문제 해결

### "API key not configured" 에러
- `.env` 파일이 프로젝트 루트에 있는지 확인
- `GEMINI_API_KEY` 값이 올바른지 확인
- 서버 재시작 (`npm run dev`)

### "Failed to generate hint" 에러
- API 키가 유효한지 확인
- 무료 티어 할당량 초과 여부 확인
- 인터넷 연결 확인

## 코드 구조

```
server/index.js         → POST /api/hint 엔드포인트
api.js                  → getHint() 클라이언트 함수
components/
  RoomCompiler.jsx      → AI Hint UI 컴포넌트
.env                    → API 키 설정
```

## 향후 개선 사항

- [ ] 힌트 히스토리 저장
- [ ] 난이도별 힌트 강도 조절
- [ ] 코드 리뷰 기능
- [ ] 다국어 힌트 지원
- [ ] 사용량 통계 대시보드

---

**문의사항이나 버그 발견 시 이슈를 등록해주세요!**
