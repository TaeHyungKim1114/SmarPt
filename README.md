# SmarPt

PT 트레이너와 회원을 연결하는 운동·식단 기록 및 채팅 웹앱입니다.  
번핏(BurnFit) 스타일의 캘린더 UI로 날짜별 운동·식단을 기록합니다.

## 기능

### 회원
- 캘린더에서 날짜별 **운동 기록** (종목, 세트, kg, 횟수, 메모)
- PT가 없는 날에도 자유롭게 기록 → 트레이너 열람 가능
- 날짜별 **식단 기록** (아침/점심/저녁/간식, 칼로리)
- 연결된 트레이너와 **실시간 채팅**

### 트레이너
- **초대 코드**로 회원 연결
- 회원별 운동·식단 캘린더 열람
- 회원별 **채팅**

## 기술 스택

- **Frontend**: Next.js 16, React 19, Tailwind CSS 4
- **Backend**: Supabase (Auth, PostgreSQL, Realtime)
- **배포**: Vercel

## 시작하기

### 1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. **SQL Editor**에서 `supabase/schema.sql` 전체 실행
3. **Authentication → Providers**에서 Email 활성화
4. **Project Settings → API**에서 URL과 `anon` key 복사

### 2. 환경 변수

```bash
cp .env.example .env.local
```

`.env.local`에 Supabase URL과 anon key를 입력합니다.

### 3. 로컬 실행

```bash
npm install
npm run dev
```

http://localhost:3000 에서 확인합니다.

### 4. Vercel 배포

1. GitHub에 저장소 push
2. [Vercel](https://vercel.com)에서 Import
3. Environment Variables에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 추가
4. Deploy

### 5. Supabase Auth 리다이렉트 (배포 후)

Supabase **Authentication → URL Configuration**에 추가:

- Site URL: `https://your-app.vercel.app`
- Redirect URLs: `https://your-app.vercel.app/**`

## 사용 흐름

1. **트레이너** 회원가입 → 대시보드에서 **초대 코드** 확인
2. **회원** 회원가입 시 초대 코드 입력 (또는 내 정보에서 나중에 연결)
3. 회원: 캘린더에서 운동/식단 기록
4. 트레이너: 회원 목록 → 상세에서 기록 확인 및 채팅

## 프로젝트 구조

```
src/
  app/
    member/          # 회원 화면
    trainer/         # 트레이너 화면
    login, signup/   # 인증
  components/        # Calendar, WorkoutEditor, DietEditor, Chat
  lib/               # Supabase 클라이언트, 타입
supabase/
  schema.sql         # DB 스키마 및 RLS
```

## 라이선스

MIT
