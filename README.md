# BOM Agent · 소개 사이트

BOM 자재관리 에이전트 프로젝트를 업체 대상으로 소개하기 위한 프론트엔드 전용 프레젠테이션 SPA. 15개 슬라이드 구성으로 문제 진단(현황) → 솔루션(BOM Agent) → 임팩트(Before/After) → 로드맵(확장) 흐름을 담았다.

## 스택

- Next.js 14 (App Router)
- TypeScript 5
- Tailwind CSS 3.4 (다크 모드 강제)
- Pretendard 우선 폰트 스택
- 순수 CSS 애니메이션 (framer-motion 없음)

`../DA_WEB_darkUI_KIT.md` v1.3 디자인 시스템을 그대로 적용했다. 좌측 사이드바 + 슬라이드 SPA · Glass 카드 · 그라디언트 텍스트 · dash-flow 화살표 · 키보드 네비게이션(←/→) 포함.

## 로컬 개발

```bash
cd manual/intro-site
npm install
npm run dev
# http://localhost:3000
```

## Vercel 배포

이 폴더를 Vercel 프로젝트의 root directory로 지정하면 zero-config로 배포된다.

- Framework Preset: **Next.js**
- Root Directory: `manual/intro-site`
- Build Command: `next build` (기본)
- Output Directory: `.next` (기본)
- Install Command: `npm install` (기본)

또는 Vercel CLI로:

```bash
npm install -g vercel
vercel        # preview
vercel --prod # production
```

## 슬라이드 구성

| # | Group | ID | Title |
|---|---|---|---|
| 01 | INTRO | overview | Overview (Hero) |
| 02 | PROBLEM | value-chain | 제조 밸류체인 순환 구조 |
| 03 | PROBLEM | design-bom | 설계·부품 선정: BOM의 사장 |
| 04 | PROBLEM | procurement-gap | 구매·소싱: 오퍼레이터화의 한계 |
| 05 | PROBLEM | mass-production | 양산·발주: 납기 리스크 vs 과잉 재고 |
| 06 | PROBLEM | invisible-issues | 자산 관리 사각지대 |
| 07 | PROBLEM | ssot-absent | SSOT 부재 |
| 08 | PROBLEM | comm-overhead | 커뮤니케이션 오버헤드 |
| 09 | SOLUTION | solution-overview | 솔루션 개요 |
| 10 | SOLUTION | architecture | 시스템 아키텍처 |
| 11 | SOLUTION | features | 핵심 기능 맵 |
| 12 | SOLUTION | forecast-engine | Forecast Engine |
| 13 | IMPACT | before-after | Before / After 워크플로우 |
| 14 | IMPACT | expected-impact | 기대 효과 |
| 15 | ROADMAP | roadmap | 시니어 관점 확장 로드맵 |

특정 슬라이드로 이동하려면 URL 해시를 붙인다. 예: `/#forecast-engine`.

## 조작

- `←` / `PageUp` — 이전 슬라이드
- `→` / `PageDown` — 다음 슬라이드
- 좌측 사이드바 · 우하단 페이지 인디케이터로도 이동 가능
- 모바일: 우하단 햄버거 버튼으로 사이드바 토글

## 폴더 구조

```
manual/intro-site/
├─ app/
│  ├─ layout.tsx           # <html lang="ko" class="dark">
│  ├─ page.tsx             # HomeShell 렌더
│  ├─ globals.css          # 디자인 시스템 CSS (§7.3)
│  ├─ HomeShell.tsx        # SPA 본체 · 키보드/URL 해시 sync
│  ├─ data/nav.ts          # 15개 슬라이드 nav 정의
│  ├─ components/
│  │  ├─ Sidebar.tsx
│  │  ├─ SlideShell.tsx
│  │  ├─ Card.tsx
│  │  ├─ Callout.tsx
│  │  ├─ BlockFlow.tsx     # 가로 블록 + 늘어나는 dash 화살표
│  │  └─ FlowDiagram.tsx   # 세로 번호 카드
│  └─ slides/
│     ├─ index.tsx
│     └─ 01_Overview.tsx ~ 15_Roadmap.tsx
├─ tailwind.config.ts
├─ tsconfig.json
├─ next.config.js
├─ postcss.config.js
└─ package.json
```
