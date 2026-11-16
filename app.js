// 退货中心逻辑
(function () {
  "use strict";
  const $ = (s) => document.querySelector(s);

  // 状态：售后单存储
  const rmas = load("returns-rmas", []);
  function load(k, fb) { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } }
  function save() { localStorage.setItem("returns-rmas", JSON.stringify(rmas)); }

  let currentOrder = null;
  let selected = {}; // itemId -> qty
  let activeRma = null;

  const views = ["viewLookup", "viewSelect", "viewTrack"];
  function show(v) {
    views.forEach(id => $("#" + id).hidden = id !== v);
    renderRmaList();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---------- 查订单 ---------- */
  $("#lookupBtn").addEventListener("click", lookup);
  $("#orderNoInput").addEventListener("keydown", e => e.key === "Enter" && lookup());
  document.querySelectorAll(".demo-no").forEach(b =>
    b.addEventListener("click", () => { $("#orderNoInput").value = b.dataset.no; lookup(); }));

  function lookup() {
    const no = $("#orderNoInput").value.trim().toUpperCase();
    const order = MOCK_ORDERS[no];
    $("#lookupErr").hidden = !!order;
    if (!order) return;
    currentOrder = order;
    selected = {};
    renderSelect();
    show("viewSelect");
  }

  /* ---------- 选商品 ---------- */
  $("#reasonSelect").innerHTML = RETURN_REASONS.map(r => `<option>${r}</option>`).join("");

  function renderSelect() {
    $("#orderMeta").innerHTML = `订单 <b class="mono">${currentOrder.no}</b> · ${currentOrder.date} · ${currentOrder.buyer}`;
    $("#itemList").innerHTML = currentOrder.items.map(it => `
      <div class="item-row" data-item="${it.id}">
        <input type="checkbox" id="cb-${it.id}">
        <div class="item-thumb" style="background:hsl(${it.hue},70%,92%)">${it.emoji}</div>
        <div class="item-info">
          <p class="item-name">${it.name}</p>
          <p class="item-spec">${it.spec}</p>
        </div>
        <div class="item-qty">
          退 <select id="qty-${it.id}">${Array.from({ length: it.qty }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join("")}</select> 件
        </div>
        <span class="item-price">¥${it.price}</span>
      </div>
    `).join("");
  }

  $("#itemList").addEventListener("click", (e) => {
    const row = e.target.closest("[data-item]");
    if (!row || e.target.tagName === "SELECT") return;
    const cb = row.querySelector("input");
    cb.checked = !cb.checked;
    row.classList.toggle("checked", cb.checked);
  });

  $("#backToLookup").addEventListener("click", () => show("viewLookup"));

  $("#submitRma").addEventListener("click", () => {
    const items = currentOrder.items
      .filter(it => $("#cb-" + it.id)?.checked)
      .map(it => ({ ...it, returnQty: +$("#qty-" + it.id).value }));
    $("#selectErr").hidden = items.length > 0;
    if (!items.length) return;

    const refundAmount = items.reduce((s, it) => s + it.price * it.returnQty, 0);
    const now = new Date().toISOString();
    activeRma = {
      no: "RMA" + Date.now().toString().slice(-8),
      orderNo: currentOrder.no,
      items,
      reason: $("#reasonSelect").value,
      desc: $("#descInput").value.trim(),
      refundMethod: document.querySelector('input[name="refund"]:checked').value,
      refundAmount,
      status: "applied",
      history: [{ to: "applied", at: now, note: "用户提交申请" }],
      tracking: null,
    };
    rmas.unshift(activeRma);
    save();
    renderTrack();
    show("viewTrack");
  });

  /* ---------- 进度跟踪 ---------- */
  function flowOf(rma) {
    if (rma.status === "rejected") {
      // 申请后被拒：展示 applied → rejected
      return [RMA_FLOW[0], RMA_REJECTED];
    }
    return RMA_FLOW;
  }

  function statusIndex(rma) {
    if (rma.status === "rejected") return 1;
    return RMA_FLOW.findIndex(f => f.key === rma.status);
  }

  function renderTrack() {
    const rma = activeRma;
    if (!rma) return;
    $("#rmaNo").textContent = rma.no;
    $("#trackSummary").innerHTML =
      `订单 ${rma.orderNo} · 退 ${rma.items.reduce((s, i) => s + i.returnQty, 0)} 件 ·
       退款 <b style="color:var(--accent)">¥${rma.refundAmount.toFixed(2)}</b>
       （${rma.refundMethod === "original" ? "原路退回" : "退至余额"}）` +
      (rma.tracking ? `<br>寄回物流：${rma.tracking.carrier} ${rma.tracking.no}` : "");

    const flow = flowOf(rma);
    const idx = statusIndex(rma);
    const historyByKey = {};
    rma.history.forEach(h => { historyByKey[h.to] = h; });

    $("#timeline").innerHTML = flow.map((f, i) => {
      const h = historyByKey[f.key];
      const cls = i < idx ? "done" : i === idx ? (f.key === "rejected" ? "rejected" : "current") : "";
      return `<div class="tl-item ${cls}">
        <p class="tl-label">${f.label}</p>
        <p class="tl-desc">${i === idx ? f.desc : (h?.note || "")}</p>
        ${h ? `<p class="tl-time">${new Date(h.at).toLocaleString("zh-CN")}</p>` : ""}
      </div>`;
    }).join("");

    // 寄回表单只在审核通过且未填单号时出现
    $("#shipForm").hidden = !(rma.status === "approved" && !rma.tracking);
    renderSimBtns();
  }

  /* ---------- 寄回物流 ---------- */
  $("#shipBtn").addEventListener("click", () => {
    const no = $("#trackingInput").value.trim();
    if (!no) { $("#trackingInput").focus(); return; }
    transition("shipped", `用户寄回：${$("#carrierSelect").value} ${no}`);
    activeRma.tracking = { carrier: $("#carrierSelect").value, no };
    save();
    renderTrack();
  });

  /* ---------- 状态机 ---------- */
  const ALLOWED = {
    applied: ["approved", "rejected"],
    approved: ["shipped"],
    shipped: ["received"],
    received: ["refunded"],
    refunded: [],
    rejected: [],
  };

  function transition(to, note) {
    if (!ALLOWED[activeRma.status].includes(to)) return;
    activeRma.history.push({ to, at: new Date().toISOString(), note });
    activeRma.status = to;
    save();
  }

  // 演示用商家动作按钮
  function renderSimBtns() {
    const map = {
      applied: [["approved", "✔ 审核通过"], ["rejected", "✖ 审核拒绝"]],
      approved: [],
      shipped: [["received", "📥 确认收货"]],
      received: [["refunded", "💰 退款打款"]],
      refunded: [], rejected: [],
    };
    $("#simBtns").innerHTML = (map[activeRma.status] || [])
      .map(([to, label]) => `<button data-sim="${to}">${label}</button>`).join("")
      || `<span style="font-size:12px">（当前状态无可用动作）</span>`;
  }

  $("#simBtns").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-sim]");
    if (!btn) return;
    const notes = {
      approved: "商家审核通过，已发送退货地址",
      rejected: "商家拒绝：商品已超 7 天无理由期限",
      received: "商家已签收退货包裹",
      refunded: "退款已原路退回，1-3 个工作日到账",
    };
    transition(btn.dataset.sim, notes[btn.dataset.sim]);
    renderTrack();
  });

  /* ---------- 我的售后记录 ---------- */
  function renderRmaList() {
    const box = $("#myRmas");
    box.hidden = rmas.length === 0;
    $("#rmaList").innerHTML = rmas.map(r => {
      const flowLabel = (r.status === "rejected" ? RMA_REJECTED : RMA_FLOW.find(f => f.key === r.status))?.label || r.status;
      return `<div class="rma-row" data-open="${r.no}">
        <span class="mono">${r.no}</span>
        <span>¥${r.refundAmount.toFixed(2)}</span>
        <span class="rma-badge ${r.status}">${flowLabel}</span>
      </div>`;
    }).join("");
  }

  $("#rmaList").addEventListener("click", (e) => {
    const row = e.target.closest("[data-open]");
    if (!row) return;
    activeRma = rmas.find(r => r.no === row.dataset.open);
    renderTrack();
    show("viewTrack");
  });

  renderRmaList();
})();
