// =============================================================================
// dropdown.js — Reusable select control with inline "+ 신규 추가"
// -----------------------------------------------------------------------------
// Source: design.md §9.5 InventoryPage, §10.2 ReceivingModal
// Validates: Requirements 4.7, 5.1, 5.2, 5.6, 5.7
//
// The same dropdown widget powers every (분류 / 제조사 / 공급사) selector inside
// the Receiving and Edit-Part modals. The widget is a thin wrapper around a
// native <select> element plus an inline "+ 신규 추가" affordance:
//
//   ┌──────────────────────────┐
//   │ Capacitor              ▾ │
//   │ Resistor                 │
//   │ IC-MCU                   │
//   │ ───────────              │
//   │ + 신규 추가              │   ← always last
//   └──────────────────────────┘
//
// Selecting "+ 신규 추가" reveals an inline name input + [추가] [취소] buttons.
// On [추가] the host calls `onCreate(name)`, which is expected to perform the
// POST request (e.g. POST /api/manufacturers) and resolve to the created
// record `{id, label}`. The dropdown then appends the new option and selects
// it automatically — no second click needed.
//
// Keyboard accessibility:
//   - The trigger is a real <select>, so tab order and arrow-key behaviour
//     are inherited from the browser (Req 5.x acceptance: "키보드 접근성").
//   - In the inline-create state, Enter on the name input submits and Esc
//     cancels (matches the modal's own Esc handling).
// =============================================================================

const CREATE_VALUE = "__create__";

/**
 * Create a dropdown widget instance.
 *
 * @template T
 * @param {object} cfg
 * @param {Array<{id: T, label: string}>} cfg.options
 *   Initial options. May be empty. Order is preserved as the visual order.
 * @param {T | null} [cfg.value=null]
 *   Currently selected option id. When null the placeholder row "선택" is
 *   shown as a disabled, pre-selected entry.
 * @param {(id: T | null) => void} [cfg.onChange]
 *   Called whenever the user selects an existing option (NOT called for the
 *   special "+ 신규 추가" sentinel).
 * @param {(name: string) => Promise<{id: T, label: string}>} [cfg.onCreate]
 *   Async creator. Resolve with the newly-created record; the dropdown then
 *   appends it and selects it. If you omit this callback the "+ 신규 추가"
 *   row is hidden — useful for read-only selectors.
 * @param {string} [cfg.placeholder="선택"]
 *   Placeholder shown when value === null. When ``allowClear`` is true
 *   the recommended value is ``"(선택 안 함)"`` — a visible + selectable
 *   entry that lets the user revert to a null selection at any time.
 * @param {boolean} [cfg.allowClear=false]
 *   When true, the placeholder row is ALWAYS rendered as the first option
 *   (not hidden, not disabled) and re-selecting it sets currentValue back
 *   to null. Used by optional dropdowns (분류 / 제조사 / 공급사 in the
 *   receiving modal) so the user can un-choose after an accidental pick.
 * @param {string} [cfg.ariaLabel]
 *   Accessible label for the <select>. Recommended when there is no
 *   visible <label> bound to the widget.
 * @returns {{
 *   el: HTMLElement,
 *   getValue: () => T | null,
 *   setValue: (id: T | null) => void,
 *   setOptions: (opts: Array<{id: T, label: string}>) => void,
 *   addOption: (opt: {id: T, label: string}, select?: boolean) => void,
 *   destroy: () => void,
 * }}
 */
export function createDropdown(cfg) {
  const {
    options = [],
    value = null,
    onChange = null,
    onCreate = null,
    placeholder = "선택",
    allowClear = false,
    ariaLabel = null,
  } = cfg || {};

  let currentValue = value;
  let currentOptions = options.slice();

  // ── DOM scaffold ──────────────────────────────────────────────────────
  const root = document.createElement("div");
  root.className = "dropdown";

  const select = document.createElement("select");
  select.className = "dropdown__select";
  if (ariaLabel) select.setAttribute("aria-label", ariaLabel);

  // Inline-create UI (hidden by default). Promoted to flex when active.
  const createBox = document.createElement("div");
  createBox.className = "dropdown__create";
  createBox.hidden = true;

  const createInput = document.createElement("input");
  createInput.type = "text";
  createInput.className = "dropdown__create-input";
  createInput.maxLength = 100;
  createInput.placeholder = "이름 입력 후 추가";

  const createSubmit = document.createElement("button");
  createSubmit.type = "button";
  createSubmit.className = "dropdown__create-submit";
  createSubmit.textContent = "추가";

  const createCancel = document.createElement("button");
  createCancel.type = "button";
  createCancel.className = "dropdown__create-cancel";
  createCancel.textContent = "취소";

  const createError = document.createElement("span");
  createError.className = "dropdown__create-error";
  createError.hidden = true;
  createError.setAttribute("role", "alert");

  createBox.append(createInput, createSubmit, createCancel, createError);

  root.append(select, createBox);

  // ── Rendering ─────────────────────────────────────────────────────────
  function render() {
    // Tear down and rebuild — the option count is small (≤ 100s) so
    // re-rendering is cheaper than diffing.
    select.replaceChildren();

    if (allowClear) {
      // "(선택 안 함)" — always the first option, selectable and NOT
      // disabled/hidden.  Re-selecting this entry resets currentValue
      // to null via the change handler.  This is how the receiving
      // modal offers a "no supplier / no class / no manufacturer"
      // choice while keeping the rest of the option list intact.
      const clear = document.createElement("option");
      clear.value = "";
      clear.textContent = placeholder;
      if (currentValue === null || currentValue === undefined) {
        clear.selected = true;
      }
      select.appendChild(clear);
    } else if (currentValue === null || currentValue === undefined) {
      // Legacy behaviour — placeholder rendered as a disabled/hidden
      // pre-selected row.  Kept for the edit_part_modal.js call sites
      // that expect the user to make a selection before saving.
      const ph = document.createElement("option");
      ph.value = "";
      ph.textContent = placeholder;
      ph.disabled = true;
      ph.selected = true;
      ph.hidden = true;
      select.appendChild(ph);
    }

    for (const opt of currentOptions) {
      const node = document.createElement("option");
      node.value = String(opt.id);
      node.textContent = opt.label;
      if (currentValue !== null && String(opt.id) === String(currentValue)) {
        node.selected = true;
      }
      select.appendChild(node);
    }

    // Always-last "+ 신규 추가" row. Hidden when no onCreate handler.
    if (typeof onCreate === "function") {
      const divider = document.createElement("option");
      divider.disabled = true;
      divider.textContent = "──────────";
      select.appendChild(divider);

      const createOpt = document.createElement("option");
      createOpt.value = CREATE_VALUE;
      createOpt.textContent = "+ 신규 추가";
      select.appendChild(createOpt);
    }
  }

  // ── Inline-create state machine ───────────────────────────────────────
  function showCreate() {
    createBox.hidden = false;
    createBox.style.display = "flex";
    createError.hidden = true;
    createInput.value = "";
    createInput.focus();
  }

  function hideCreate() {
    createBox.hidden = true;
    createBox.style.display = "none";
    createInput.value = "";
    createError.hidden = true;
    createError.textContent = "";
  }

  function setError(msg) {
    createError.textContent = msg;
    createError.hidden = false;
  }

  async function submitCreate() {
    const raw = createInput.value.trim();
    if (raw.length === 0) {
      setError("이름을 입력하세요");
      return;
    }
    if (typeof onCreate !== "function") return;

    createSubmit.disabled = true;
    createCancel.disabled = true;
    createInput.disabled = true;
    try {
      const created = await onCreate(raw);
      if (
        !created ||
        created.id === undefined ||
        created.id === null ||
        typeof created.label !== "string"
      ) {
        // Defensive: a creator that resolves with something unexpected
        // should not crash the widget — surface a generic error.
        setError("생성 응답이 올바르지 않습니다");
        return;
      }
      currentOptions.push({ id: created.id, label: created.label });
      currentValue = created.id;
      hideCreate();
      render();
      if (typeof onChange === "function") onChange(currentValue);
    } catch (err) {
      // Allow the host to surface a server-side error message via the
      // thrown error. We coerce to string so the dropdown doesn't expose
      // raw exception objects to the DOM.
      const msg =
        err && typeof err.message === "string" && err.message
          ? err.message
          : "추가에 실패했습니다";
      setError(msg);
    } finally {
      createSubmit.disabled = false;
      createCancel.disabled = false;
      createInput.disabled = false;
    }
  }

  // ── Event wiring ──────────────────────────────────────────────────────
  function onSelectChange() {
    const raw = select.value;
    if (raw === CREATE_VALUE) {
      // Restore the previous selection in the <select> so the visible label
      // matches `currentValue` while the inline-create UI is open.
      render();
      showCreate();
      return;
    }
    if (raw === "") {
      currentValue = null;
    } else {
      // Find the original id type from currentOptions (preserve numeric ids).
      const match = currentOptions.find((o) => String(o.id) === raw);
      currentValue = match ? match.id : raw;
    }
    if (typeof onChange === "function") onChange(currentValue);
  }

  select.addEventListener("change", onSelectChange);
  createSubmit.addEventListener("click", submitCreate);
  createCancel.addEventListener("click", () => hideCreate());
  createInput.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      submitCreate();
    } else if (ev.key === "Escape") {
      ev.preventDefault();
      ev.stopPropagation();
      hideCreate();
    }
  });

  // Initial paint
  render();

  // ── Public API ────────────────────────────────────────────────────────
  return {
    el: root,
    getValue: () => currentValue,
    setValue: (id) => {
      currentValue = id ?? null;
      render();
    },
    setOptions: (opts) => {
      currentOptions = Array.isArray(opts) ? opts.slice() : [];
      render();
    },
    addOption: (opt, select_ = false) => {
      currentOptions.push(opt);
      if (select_) currentValue = opt.id;
      render();
    },
    destroy: () => {
      select.removeEventListener("change", onSelectChange);
      root.remove();
    },
  };
}
