# BOM Agent — 화면 시연용 정적 빌드

BOM 자재관리 에이전트의 **화면 구성만** 보여주기 위한 정적 버전입니다.
백엔드(FastAPI · SQLite · 로컬 LLM) 없이 브라우저만으로 동작합니다.

- 데이터: 실제 앱에서 뽑은 **스냅샷 JSON** (모두 임의 생성한 더미 데이터)
- 조회 전용: 검색 · 필터 · 정렬 · 페이지네이션 · 모달은 모두 동작
- 쓰기 동작(입고 · 저장 · 삭제)은 동작하지 않음 — 누르면 안내 문구만 표시
- AI 챗봇은 안내 문구만 반환 (실제 제품은 사내 로컬 LLM 사용)
- 우측 하단 사이드바의 **[KR | EN]** 토글로 화면 언어 전환

원본 프로젝트: `BOM_Agent` (FastAPI + SQLite + Vanilla JS)

---

## 로컬에서 열어보기

빌드 스텝이 없습니다. 정적 서버로 폴더를 서빙하기만 하면 됩니다.

```bash
python -m http.server 8130
```

브라우저에서 `http://127.0.0.1:8130` 접속.

> `index.html` 을 파일로 직접 여는 방식(`file://`)은 동작하지 않습니다.
> ES 모듈과 `fetch` 가 http 스킴을 요구하기 때문에 반드시 서버로 열어야 합니다.

---

## Vercel 배포

1. 이 폴더를 GitHub 저장소로 올립니다.
2. Vercel → **Add New… → Project** → 해당 저장소 Import.
3. 설정은 아래 그대로 둡니다 (빌드 스텝이 없습니다).

   | 항목 | 값 |
   |---|---|
   | Framework Preset | **Other** |
   | Build Command | *(비움)* |
   | Output Directory | *(비움 — 저장소 루트)* |
   | Install Command | *(비움)* |

4. Deploy.

`vercel.json` 은 캐시 헤더만 지정합니다. 셸(`index.html`)은 `no-store`,
정적 자산은 짧은 캐시를 두어 재배포가 즉시 반영되도록 했습니다.

---

## 구조

```
BOM_Agent_Front/
├─ index.html                  SPA 셸 (원본과 동일 + mock 스크립트 1줄)
├─ vercel.json                 캐시 헤더
├─ .gitignore
├─ README.md
├─ tools/
│  └─ build_front.py           스냅샷 · 자산 갱신 스크립트
└─ static/
   ├─ app.js                   해시 라우터 (원본 그대로)
   ├─ i18n.js                  KR/EN 표시 전환 (원본 그대로)
   ├─ pages/       (7)         화면
   ├─ components/  (13)        모달 · 드롭다운 · 챗봇 패널
   ├─ styles/      (19 css)    tokens.css 기반 스타일
   ├─ images/                  창고 도면 · 마커
   └─ mock/
      ├─ api.js                fetch 가로채기 (백엔드 대체)
      └─ data/     (14 json)   스냅샷 데이터
```

**페이지 · 컴포넌트 코드는 원본에서 한 줄도 수정하지 않았습니다.**
`mock/api.js` 가 `window.fetch` 를 가로채 `/api/*` 요청에 스냅샷으로
응답하는 방식이라, 원본이 바뀌어도 파일만 다시 복사하면 됩니다.

---

## 스냅샷 데이터

| 파일 | 내용 |
|---|---|
| `parts.json` | 부품 마스터 96건 |
| `boms.json` | 제품 12종의 BOM (총 782 라인) |
| `production_plan.json` | 제품 × 월 매트릭스 |
| `plan_months.json` · `products.json` | 양산월 · 제품 |
| `forecast.json` | 예측 결과 96건 (위험도 · 추천 발주량) |
| `notices.json` | 공지사항 (기간 1~7일) |
| `suppliers.json` · `manufacturers.json` · `part_classes.json` | 기준 정보 |
| `receiving.json` | 입고 이력 60건 |
| `audit_log.json` | 감사 로그 1,242건 |
| `warehouse_markers.json` · `next_number.json` | 창고 마커 · 채번 |

검색어 · 페이지네이션 · 위험도/공급사 필터는 `mock/api.js` 가 이 데이터
위에서 계산하므로 실제 앱과 동일하게 반응합니다.

### 데이터 갱신

원본 프로젝트에서 서버를 띄운 뒤 아래를 실행하면 스냅샷과 정적 자산이
최신 상태로 교체됩니다.

```bash
python tools/build_front.py --base http://127.0.0.1:8000
```

`--skip-assets` 를 주면 데이터만 갱신합니다. `index.html`,
`static/mock/api.js`, `vercel.json` 은 건드리지 않습니다.

---

## 알아둘 점

- **기준일**: 대시보드의 "기준일"과 공지사항의 기간은 접속 당일 날짜로
  표시되지만, 예측 대상 월(26Y'9 ~ 27Y'2)은 스냅샷 시점 기준입니다.
  시연 시점이 스냅샷과 많이 떨어지면 월 표기가 과거로 보일 수 있습니다.
- **발주서 인쇄**와 **대체품 메일(mailto)** 은 브라우저 기능이라 그대로 동작합니다.
- 데이터는 전부 임의 생성한 더미 값입니다.
