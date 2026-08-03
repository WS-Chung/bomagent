// =============================================================================
// mock/api.js — 정적 시연용 API 목(mock) 레이어
// -----------------------------------------------------------------------------
// 백엔드 없이 화면만 시연하기 위한 모듈.  ``window.fetch`` 를 가로채서
// ``/api/*`` 요청을 미리 받아둔 JSON 스냅샷으로 응답한다.  페이지·컴포넌트
// 코드는 원본 그대로이며 한 줄도 수정하지 않았다.
//
//   · 조회(GET)  — 스냅샷에서 응답.  검색어·페이지네이션·필터는 여기서 계산.
//   · 쓰기       — 시연에서는 사용하지 않는다.  실수로 눌렸을 때 콘솔 오류
//                  대신 안내 문구가 뜨도록 표준 오류 형식으로 돌려준다.
//   · 챗봇       — 로컬 LLM 이 없으므로 안내 문구만 반환.
//
// 기준일은 배포된 날짜와 무관하게 스냅샷 시점으로 고정되므로, 화면에 보이는
// 날짜(now_date / now)만 접속 당일로 바꿔서 최신처럼 보이게 한다.
// =============================================================================

const DATA_BASE = "/static/mock/data";

const FILES = [
  "part_classes",
  "manufacturers",
  "suppliers",
  "products",
  "plan_months",
  "production_plan",
  "warehouse_markers",
  "parts",
  "boms",
  "forecast",
  "notices",
  "receiving",
  "audit_log",
  "next_number",
];

const db = {};

// 시연 페이지임을 알리는 표준 오류 envelope (app 전역 핸들러와 같은 형태).
const DEMO_READONLY = {
  code: "DEMO_READ_ONLY",
  message:
    "시연용 화면입니다. 데이터를 변경하는 기능은 동작하지 않습니다. / " +
    "This is a demo build — data cannot be changed here.",
  details: null,
};

const CHAT_REPLY = {
  ko:
    "이 페이지는 화면 시연용 정적 버전이라 AI 답변이 생성되지 않습니다.\n" +
    "실제 제품에서는 사내 PC 의 로컬 LLM 이 재고·양산계획·수급 위험도 데이터를 " +
    "근거로 답변합니다.",
  en:
    "This is a static demo page, so no AI answer is generated here.\n" +
    "In the real product a local LLM answers using live stock, production-plan " +
    "and supply-risk data.",
};

function todayISO() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function shiftISO(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function num(v, fallback) {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

// ── 조회 라우팅 ─────────────────────────────────────────────────────────
function handleParts(url) {
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();
  const limit = num(url.searchParams.get("limit"), 50);
  const offset = num(url.searchParams.get("offset"), 0);
  let items = db.parts;
  if (q) {
    items = items.filter((p) =>
      [
        p.self_part_number,
        p.mfr_part_number,
        p.cad_partname,
        p.value,
        p.package,
        p.supplier && p.supplier.name,
        p.manufacturer && p.manufacturer.name,
        p.class && p.class.name,
      ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q)),
    );
  }
  return json({ total: items.length, items: items.slice(offset, offset + limit) });
}

function handleForecast(url) {
  const risk = url.searchParams.get("risk");
  const supplierId = num(url.searchParams.get("supplier_id"), null);
  const body = clone(db.forecast);
  body.now_date = todayISO();
  body.rows = body.rows.filter((row) => {
    if (risk && row.risk !== risk) return false;
    if (supplierId && (!row.supplier || row.supplier.id !== supplierId)) return false;
    return true;
  });
  return json(body);
}

function handleNotices(url) {
  const days = Math.min(7, Math.max(1, num(url.searchParams.get("days"), 7)));
  const body = clone(db.notices[String(days)]);
  body.now = todayISO();
  body.since = shiftISO(days);
  return json(body);
}

function handleReceiving(url) {
  const limit = num(url.searchParams.get("limit"), 50);
  const offset = num(url.searchParams.get("offset"), 0);
  return json({
    total: db.receiving.length,
    items: db.receiving.slice(offset, offset + limit),
  });
}

function handleAuditLog(url) {
  const limit = num(url.searchParams.get("limit"), 50);
  const offset = num(url.searchParams.get("offset"), 0);
  const tables = (url.searchParams.get("target_table") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const rowId = (url.searchParams.get("target_row_id") || "").trim();
  const from = (url.searchParams.get("from") || "").trim();
  const to = (url.searchParams.get("to") || "").trim();

  let items = db.audit_log;
  if (tables.length) items = items.filter((r) => tables.includes(r.target_table));
  if (rowId) items = items.filter((r) => String(r.target_row_id) === rowId);
  if (from) items = items.filter((r) => r.changed_at >= from);
  if (to) items = items.filter((r) => r.changed_at <= to);
  return json({ total: items.length, items: items.slice(offset, offset + limit) });
}

function route(url) {
  const path = url.pathname;

  if (path === "/api/part-classes") return json(db.part_classes);
  if (path === "/api/manufacturers") return json(db.manufacturers);
  if (path === "/api/suppliers") return json(db.suppliers);
  if (path === "/api/products") return json(db.products);
  if (path === "/api/plan-months") return json(db.plan_months);
  if (path === "/api/production-plan") return json(db.production_plan);
  if (path === "/api/warehouse-markers") return json(db.warehouse_markers);
  if (path === "/api/parts") return handleParts(url);
  if (path === "/api/dashboard/forecast") return handleForecast(url);
  if (path === "/api/notices") return handleNotices(url);
  if (path === "/api/receiving") return handleReceiving(url);
  if (path === "/api/audit-log") return handleAuditLog(url);

  if (path === "/api/parts/next-number") {
    const prefix = (url.searchParams.get("prefix") || "").toUpperCase();
    const hit = db.next_number[prefix];
    return hit
      ? json(hit)
      : json({ code: "NOT_FOUND", message: "Unknown prefix", details: null }, 404);
  }

  let m = path.match(/^\/api\/parts\/(\d+)$/);
  if (m) {
    const part = db.parts.find((p) => String(p.id) === m[1]);
    return part
      ? json(part)
      : json({ code: "NOT_FOUND", message: "Part not found", details: null }, 404);
  }

  m = path.match(/^\/api\/products\/(\d+)\/bom$/);
  if (m) {
    const bom = db.boms[m[1]];
    return bom
      ? json(bom)
      : json({ code: "NOT_FOUND", message: "BOM not found", details: null }, 404);
  }

  return json({ code: "NOT_FOUND", message: `No mock for ${path}`, details: null }, 404);
}

// ── fetch 가로채기 ──────────────────────────────────────────────────────
let ready = null;

function load() {
  if (ready) return ready;
  ready = Promise.all(
    FILES.map((name) =>
      fetch(`${DATA_BASE}/${name}.json`, { cache: "force-cache" })
        .then((r) => r.json())
        .then((data) => {
          db[name] = data;
        }),
    ),
  );
  return ready;
}

const passthrough = window.fetch.bind(window);

window.fetch = async function (input, init) {
  const raw = typeof input === "string" ? input : input && input.url;
  if (!raw) return passthrough(input, init);

  let url;
  try {
    url = new URL(raw, window.location.origin);
  } catch (_e) {
    return passthrough(input, init);
  }
  if (!url.pathname.startsWith("/api/")) return passthrough(input, init);

  const method = ((init && init.method) || "GET").toUpperCase();

  // 챗봇 — 안내 문구만 돌려준다.  화면 언어(i18n 레이어가 body 에 넣는
  // ``lang``)에 맞춰 한 가지 언어로만 답한다.
  if (url.pathname === "/api/chat") {
    let lang = "ko";
    try {
      if (init && typeof init.body === "string") {
        lang = JSON.parse(init.body).lang === "en" ? "en" : "ko";
      }
    } catch (_e) {
      lang = "ko";
    }
    await new Promise((ok) => setTimeout(ok, 400));
    return json({ reply: CHAT_REPLY[lang] });
  }

  // 쓰기 — 시연에서는 사용하지 않는다.
  if (method !== "GET") return json(DEMO_READONLY, 405);

  await load();
  // 실제 서버처럼 아주 짧은 지연을 준다(로딩 표시가 자연스럽게 보이도록).
  await new Promise((ok) => setTimeout(ok, 60));
  return route(url);
};

// 첫 화면 렌더 전에 스냅샷을 미리 받아 둔다.
load();
