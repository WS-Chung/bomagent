# BOM Agent · 세미나 발표자료

제조 자재관리 서비스(BOM Agent)를 소개하는 **웹 기반 슬라이드 발표자료**입니다.
`DA_WEB_darkUI_KIT` 다크 UI 디자인 시스템 · Next.js 14 · Tailwind CSS 기반.

- AS-IS / To-Be 흐름, 슬라이드 SPA (좌측 목차 + `←`/`→` 키보드)
- 세미나 현장에서 이 사이트 하나만 띄워놓고 진행

## 로컬 실행

```bash
npm install
npm run dev      # http://localhost:3000
```

## 빌드

```bash
npm run build
npm run start
```

## Vercel 배포

1. 이 폴더를 GitHub 저장소로 push
   ```bash
   git init
   git add -A
   git commit -m "seminar deck"
   git branch -M main
   git remote add origin https://github.com/<계정>/<repo>.git
   git push -u origin main
   ```
2. https://vercel.com → **New Project** → 해당 GitHub 저장소 선택
3. 프레임워크는 **Next.js** 자동 감지 → 그대로 **Deploy** (별도 설정 불필요)
4. 배포 완료 후 발급된 URL을 세미나에서 사용

## 구조

```
app/
├─ layout.tsx · globals.css   # 다크 테마 + mesh 배경
├─ page.tsx · HomeShell.tsx   # 슬라이드 SPA (해시 라우팅 · 키보드)
├─ data/nav.ts               # 목차(9개 슬라이드)
├─ components/               # Sidebar / SlideShell / Card / Callout /
│                            #   BlockFlow / FlowDiagram / StatShift
└─ slides/                   # Overview → Problem → Root → ToBe →
                             #   Impact → Compare → Deliverables →
                             #   Questions → Closing
```

슬라이드 내용을 수정하려면 `app/slides/*.tsx` 만 편집하면 됩니다.
