// =============================================================================
// chat_panel.js — 전역 챗봇 패널 (2026-07)
// -----------------------------------------------------------------------------
// 모든 페이지 우측에 슬라이드 인/아웃되는 데이터 인지형 챗봇. AppShell 레벨
// 컴포넌트로 app.js 의 boot()에서 initChatPanel() 로 1회 생성되며,
// document.body 직하(= #page-body 밖)에 부착되므로 라우팅으로 페이지가 교체돼도
// 대화 내용과 열림 상태가 그대로 유지된다.
//
//   - 우하단 플로팅 토글 버튼(💬) — 항상 표시.
//   - 우측 패널: 평소 화면 밖(translateX(100%))으로 숨겨져 있다가 토글 시
//     슬라이드로 등장. 다시 토글/✕ 로 우측으로 숨김.
//   - POST /api/chat 로 로컬 LLM(Ollama)에 질의. 현재 시스템 현황을 서버가
//     시스템 프롬프트로 주입하므로 실제 수치 기반 답변을 받는다.
//   - Ollama 미가용(503 LLM_UNAVAILABLE) 시 친절한 안내 메시지 표시.
//
// Public API: initChatPanel()
// =============================================================================

const CHAT_URL = "/api/chat";
const OPEN_STATE_KEY = "bom_chat_open";
// 서버로 함께 보낼 직전 대화 최대 개수(프롬프트 비대화 방지, 서버도 재차 제한).
const MAX_HISTORY = 8;

let initialized = false;

async function apiFetch(url, init) {
  const merged = { cache: "no-store", ...(init || {}) };
  const resp = await fetch(url, merged);
  let body = null;
  try {
    body = await resp.json();
  } catch {
    body = null;
  }
  if (!resp.ok) {
    const err = new Error(
      (body && body.message) || `요청 실패 (HTTP ${resp.status})`,
    );
    err.status = resp.status;
    err.code = body && body.code;
    throw err;
  }
  return body;
}

/**
 * 전역 챗봇 패널을 1회 초기화한다. 재호출은 무시(멱등).
 */
export function initChatPanel() {
  if (initialized || document.getElementById("chat-panel-root")) return;
  initialized = true;

  // 대화 상태(모듈 수명 = SPA 수명 동안 유지).
  const messages = []; // [{ role: "user"|"assistant"|"system", content }]
  let busy = false;

  // ── 토글 버튼(플로팅) ───────────────────────────────────────────────
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.id = "chat-toggle-btn";
  toggle.className = "chat-toggle-btn";
  toggle.setAttribute("aria-label", "AI 도우미 열기");
  toggle.textContent = "💬";
  document.body.appendChild(toggle);

  // ── 패널 ────────────────────────────────────────────────────────────
  const panel = document.createElement("aside");
  panel.id = "chat-panel-root";
  panel.className = "chat-panel";
  panel.setAttribute("role", "complementary");
  panel.setAttribute("aria-label", "AI 도우미");

  const header = document.createElement("header");
  header.className = "chat-panel__header";
  const title = document.createElement("span");
  title.className = "chat-panel__title";
  title.textContent = "AI 도우미";
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "chat-panel__close";
  closeBtn.setAttribute("aria-label", "닫기");
  closeBtn.innerHTML = "&times;";
  header.append(title, closeBtn);

  const log = document.createElement("div");
  log.className = "chat-panel__log";
  log.setAttribute("aria-live", "polite");

  const form = document.createElement("form");
  form.className = "chat-panel__form";
  const input = document.createElement("textarea");
  input.className = "chat-panel__input";
  input.rows = 2;
  input.placeholder = "예) 지금 위험한 부품 몇 개야?";
  input.setAttribute("aria-label", "메시지 입력");
  const sendBtn = document.createElement("button");
  sendBtn.type = "submit";
  sendBtn.className = "chat-panel__send";
  sendBtn.textContent = "전송";
  form.append(input, sendBtn);

  panel.append(header, log, form);
  document.body.appendChild(panel);

  // ── 렌더 ────────────────────────────────────────────────────────────
  function appendBubble(role, text, opts) {
    const bubble = document.createElement("div");
    bubble.className = `chat-bubble chat-bubble--${role}`;
    if (opts && opts.pending) bubble.classList.add("is-pending");
    if (opts && opts.error) bubble.classList.add("is-error");
    bubble.textContent = text;
    log.appendChild(bubble);
    log.scrollTop = log.scrollHeight;
    return bubble;
  }

  function renderIntroIfEmpty() {
    if (messages.length === 0 && log.childElementCount === 0) {
      appendBubble(
        "assistant",
        "안녕하세요! 재고·양산계획·부품 수급 위험도 등 무엇이든 물어보세요.",
      );
    }
  }

  // ── 열기/닫기(슬라이드) ─────────────────────────────────────────────
  function setOpen(open) {
    panel.classList.toggle("is-open", open);
    toggle.classList.toggle("is-hidden", open);
    toggle.setAttribute("aria-label", open ? "AI 도우미 닫기" : "AI 도우미 열기");
    try {
      window.localStorage.setItem(OPEN_STATE_KEY, open ? "1" : "0");
    } catch {
      /* localStorage 사용 불가 환경 — 무시 */
    }
    if (open) {
      renderIntroIfEmpty();
      input.focus();
    }
  }

  toggle.addEventListener("click", () => setOpen(true));
  closeBtn.addEventListener("click", () => setOpen(false));

  // ── 전송 ────────────────────────────────────────────────────────────
  async function send() {
    const text = input.value.trim();
    if (text.length === 0 || busy) return;
    busy = true;
    input.value = "";
    sendBtn.disabled = true;

    messages.push({ role: "user", content: text });
    appendBubble("user", text);

    const pending = appendBubble("assistant", "생각 중…", { pending: true });

    try {
      const history = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-MAX_HISTORY - 1, -1); // 방금 넣은 user 메시지 제외
      const body = await apiFetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });
      const reply =
        body && typeof body.reply === "string"
          ? body.reply
          : "응답을 이해하지 못했습니다.";
      messages.push({ role: "assistant", content: reply });
      pending.classList.remove("is-pending");
      pending.textContent = reply;
      log.scrollTop = log.scrollHeight;
    } catch (err) {
      pending.classList.remove("is-pending");
      pending.classList.add("is-error");
      pending.textContent =
        err && err.message
          ? err.message
          : "답변을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.";
    } finally {
      busy = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }

  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    send();
  });
  // Enter = 전송, Shift+Enter = 줄바꿈.
  input.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && !ev.shiftKey) {
      ev.preventDefault();
      send();
    }
  });

  // ── 초기 열림 상태 복원 ─────────────────────────────────────────────
  let startOpen = false;
  try {
    startOpen = window.localStorage.getItem(OPEN_STATE_KEY) === "1";
  } catch {
    startOpen = false;
  }
  setOpen(startOpen);
}
