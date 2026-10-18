"use strict";
function newGame({ selftest = false, tutorial = false } = {}) {
const def = settings.mode === "family" ? FAMILY : HOESIK;
document.documentElement.dataset.mode = def.key;
const n = tutorial ? 4 : settings.n;
const lv = LEVEL[tutorial ? "easy" : settings.level];
const names = shuffle([...def.names]).slice(0, n - 1);
S = {
def, n, selftest, tutorial, coached: new Set(), attn: lv.attn, keen: lv.keen, deck: buildDeck(def), discard: [], reshuffles: 0,
p: [def.me, ...names].map((name) => ({ name, gas: def.start, warn: 0, hand: [], away: false, hist: [], liar: pick([0.1, 0.45, 0.85]), sus: pick([0.6, 1, 1.4]) })),
log: [], played: [], playedNote: "", stackBack: 0, tell: "", pendingExtra: 0, turn: 0, cur: -1, loser: null, endReason: null,
bbungTarget: null, stats: { bbung: 0, missed: 0, actions: 0, hide: 0, hidden: 0, suspect: 0, caught: 0 },
};
if (tutorial) {
const want = def.key === "family"
? ["미역국", "콜라", "나 빼고 다 같이 건배!", "화장실", "산책 나가기", "치킨"]
: ["맥주", "폭탄주", "소주", "해장국", "물 좀 주세요", "한 잔 받아"];
for (const w of want) { const k = S.deck.findIndex((c) => c.name === w); if (k >= 0) P(0).hand.push(S.deck.splice(k, 1)[0]); }
const pre = (k, g) => { P(k).hist.push({ v: g - def.start, label: "연습용 미리 먹음" }); P(k).gas = g; };
pre(1, def.key === "family" ? 15 : 14);
pre(n - 1, def.start + 2);
}
for (const p of S.p) while (p.hand.length < def.hand) p.hand.push(S.deck.pop());
if (tutorial) S.first = 0;
else S.first = session.lastFirst == null ? Math.floor(rnd() * n) : (session.lastFirst + 1) % n;
if (!selftest && !tutorial) session.lastFirst = S.first;
}
async function runGame() {
let i = S.first;
log(`${S.def.name} 시작! ${nm(i)}부터 시계 방향.`, "sys");
if (S.tutorial) {
await coach("start", `연습 판이에요. 위쪽 네모가 상대들, 맨 아래가 내 자리예요. '옆사람' 표시가 붙은 ${nm(1)}, ${nm(S.n - 1)} 두 사람이 내가 감시할 사람이고, 저 둘도 나를 감시해요. 가스 막대의 빨간 선이 16, 위험선이에요.`);
}
try {
for (;;) {
S.turn++; S.cur = i;
if (S.turn > 600) { S.endReason = "마감"; throw END; }
log(`${nm(i)}의 차례`, "tn");
await sleep(500);
await (isFam() ? famTurn(i) : hoeTurn(i));
i = (i + 1) % S.n;
await sleep(900);
}
} catch (e) {
if (e !== END) throw e;
}
UI.prompt = null;
if (S.loser == null) S.loser = [...Array(S.n).keys()].reduce((a, b) => (P(b).warn > P(a).warn || (P(b).warn === P(a).warn && P(b).gas > P(a).gas) ? b : a));
S.over = true;
render();
}
function ranking() {
const handGas = (p) => p.hand.filter((c) => "FDS".includes(c.t)).reduce((a, c) => a + c.v, 0);
const rest = [...Array(S.n).keys()].filter((k) => k !== S.loser)
.sort((a, b) => P(a).warn - P(b).warn || P(a).gas - P(b).gas || handGas(P(a)) - handGas(P(b)));
return [...rest, S.loser];
}
const esc = (s) => String(s).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
function cardHTML(c, { cls = "", attrs = "", mini = false, proj = null } = {}) {
const v = c.t === "A" ? "" : `<span class="v">${c.v > 0 ? "+" : ""}${c.v}</span>`;
const pj = proj == null ? "" : `<span class="proj ${proj >= DANGER ? "dg" : ""}">${c.t === "S" ? "마시면" : "먹으면"} 가스 ${proj}${proj >= DANGER ? " 위험!" : ""}</span>`;
return `<button class="card ${c.t} ${mini ? "mini" : ""} ${c.fresh ? "fresh" : ""} ${cls}" ${attrs}>
<span class="k">${KIND[c.t]}</span><span class="n">${esc(c.name)}</span>
<span>${v}${pj}${c.desc ? `<span class="d">${esc(c.desc)}</span>` : ""}</span></button>`;
}
function gauge(g) {
const w = Math.min(100, (g / 20) * 100);
return `<div class="gauge ${g >= DANGER ? "dg" : g >= 13 ? "hi" : ""}" role="img" aria-label="가스 ${g}, 위험선 16"><i style="width:${w}%"></i></div>`;
}
function histHTML(p, n = 3) {
if (!p.hist.length) return `<div class="hist"><span>시작 ${S.def.start}</span></div>`;
return `<div class="hist">${p.hist.slice(-n).map((h) => `<span class="${h.v > 0 ? "up" : h.v < 0 ? "dn" : ""}">${esc(h.label)} ${h.v > 0 ? "+" : ""}${h.v}</span>`).join("")}</div>`;
}
function dangerLine(k) {
const p = P(k);
if (p.gas < DANGER) return "";
if (outOfSeat(k)) return `<div class="dz safe">위험하지만 산책 중이라 뿡 면제</div>`;
const callers = nb(k).filter((j) => !outOfSeat(j)).map((j) => (j === 0 ? "나" : nm(j)));
return `<div class="dz">위험! ${callers.join("·")}만 뿡 가능</div>`;
}
function render() {
if (TUT) return renderSlides();
if (!S) return renderIntro();
if (S.selftest) return;
if (S.over) return renderEnd();
const pr = UI.prompt;
const myNb = nb(0);
const order = [...Array(S.n).keys()].map((k) => (k === 0 ? "나" : nm(k))).join(" → ");
const seatHTML = [...Array(S.n).keys()].filter((k) => k !== 0).map((k) => {
const p = P(k);
const pickable = pr && pr.type === "player" && pr.cands.includes(k);
const bb = pr && pr.type === "timed" && S.bbungTarget === k;
const side = k === 1 ? "왼쪽 옆사람" : k === S.n - 1 ? "오른쪽 옆사람" : "";
return `<div class="seat ${S.cur === k ? "turn" : ""} ${p.gas >= DANGER ? "danger" : ""} ${p.away ? "out" : ""} ${pickable ? "pick" : ""}" data-seat="${k}" ${pickable ? `data-player="${k}" role="button" tabindex="0"` : ""}>
<div class="nm"><b>${esc(p.name)}</b><span>${S.cur === k ? '<span class="chip turnc">차례</span> ' : ""}${myNb.includes(k) ? `<span class="chip nb">${side || "옆사람"}</span>` : ""}${p.away ? ` <span class="chip away">${S.def.away} 중</span>` : ""}</span></div>
<div class="nm"><span class="gasnum">${p.gas}</span><span class="warns" aria-label="경고 ${p.warn}장">${"●".repeat(p.warn)}${"○".repeat(2 - p.warn)}</span></div>
${gauge(p.gas)}
${histHTML(p)}
${dangerLine(k)}
<div class="stats"><span>손패 ${p.hand.length}장</span></div>
${bb ? `<button class="bbung-btn" data-act="timed">뿡!</button>` : ""}
</div>`;
}).join("");
const outs = S.p.filter((p) => p.away);
const zone = isFam()
? `<div class="zone ${outs.length ? "" : "empty"}"><b>산책 구역</b><span class="who">${outs.map((p) => `<span>${esc(p.name)}</span>`).join("") || '<span class="none">비어 있음</span>'}</span><span class="muted">여기 있는 사람은 뿡을 받지도 외치지도 않고, 다음 자기 차례에 돌아와요.</span></div>`
: outs.length ? `<div class="zone"><b>화장실</b><span class="who">${outs.map((p) => `<span>${esc(p.name)}</span>`).join("")}</span><span class="muted">다음 자기 차례까지 카드 대상에서 빠져요 (뿡은 받아요).</span></div>` : "";
const me = P(0);
let promptHTML = "";
if (pr) {
if (pr.type === "card") promptHTML = `<div class="q">${esc(pr.q)}</div>${pr.optional ? `<div class="row"><button class="pbtn" data-act="skip">${esc(pr.skip)}</button></div>` : ""}`;
else if (pr.type === "cards") promptHTML = `<div class="q">${esc(pr.q)}</div><div class="row"><button class="pbtn main" data-act="confirm">${pr.chosen.length ? `${pr.chosen.length}장 흘리고 마시기` : esc(pr.skip)}</button></div>`;
else if (pr.type === "player") promptHTML = `<div class="q">${esc(pr.q)}</div><div class="muted">위쪽 자리에서 사람을 누르세요.</div>${pr.optional ? `<div class="row"><button class="pbtn" data-act="skip">안 한다</button></div>` : ""}`;
else if (pr.type === "opts") promptHTML = `<div class="q">${esc(pr.q)}</div><div class="row">${pr.opts.map(([l, v, c], k) => `<button class="pbtn ${c || ""}" data-opt="${k}">${esc(l)}</button>`).join("")}</div>`;
else if (pr.type === "timed") promptHTML = `<div class="q">${esc(pr.q)}</div>${pr.extra ? `<div class="tell">단서: ${esc(pr.extra)}</div>` : ""}<div class="row"><button class="pbtn main big" data-act="timed">${esc(pr.label)}</button></div><div class="timer"><i id="timerbar"></i></div>`;
} else promptHTML = `<div class="muted">${S.cur < 0 ? "카드를 나누는 중…" : S.cur === 0 ? "처리 중…" : `${esc(nm(S.cur))}의 차례를 지켜보는 중. 옆사람이 위험해지면 뿡 버튼이 떠요.`}</div>`;
const handHTML = me.hand.map((c) => {
let cls = "", attrs = `data-card="${c.id}"`;
if (pr && (pr.type === "card" || pr.type === "cards")) {
const ok = pr.filter(c) && !(pr.type === "card" && c.fresh);
cls = ok ? "sel" : "dim";
if (pr.type === "cards" && pr.chosen.includes(c)) cls += " on";
if (pr.hint === c) cls += " hint";
if (!ok) attrs += " disabled";
} else attrs += ' tabindex="-1"';
const proj = "FDS".includes(c.t) && c.sp !== "elder" ? me.gas + c.v : null;
return cardHTML(c, { cls, attrs, proj });
}).join("");
const played = S.played.length
? `${S.playedNote ? `<div class="note">${esc(S.playedNote)}</div>` : ""}<div class="stack">${S.played.map((c) => cardHTML(c, { mini: true, attrs: 'tabindex="-1"' })).join("")}${S.stackBack && S.cur === 0 ? `<span class="muted">밑에 ${S.stackBack}장 숨김</span>` : ""}</div>${S.tell ? `<div class="tell">${esc(S.tell)}</div>` : ""}`
: `<div class="stack"></div><div class="muted">아직 낸 카드가 없어요.</div>`;
const logHTML = S.log.slice(-60).map((l) => `<p class="${l.cls}">${esc(l.text)}</p>`).join("");
const myCallers = nb(0).filter((j) => !outOfSeat(j)).map(nm).join("·");
const myWarn = me.gas >= DANGER
? (outOfSeat(0) ? `<div class="mywarn safe">내 가스 ${me.gas}, 하지만 산책 중이라 뿡을 받지 않아요. 돌아오기 전에 낮추세요.</div>`
: `<div class="mywarn">내 가스 ${me.gas}! 양옆(${myCallers})이 뿡을 외치면 경고예요.</div>`)
: me.gas >= 13 ? `<div class="mywarn safe">가스 ${me.gas}. 16부터 위험해요. 회복 카드나 ${isFam() ? "산책" : "화장실"}을 생각해 보세요.</div>` : "";
app.innerHTML = `
<div class="topbar">
<span class="title">${isFam() ? "예의를 지켜라, 뿡!" : "뿡! 회식 Edition"} <span class="tag">${esc(S.def.name)}${S.tutorial ? " · 연습 판" : ""}</span></span>
<span class="meta"><span>턴 ${S.turn}</span><span>더미 ${S.deck.length}장</span><span>섞은 횟수 ${S.reshuffles}/2</span>
<button class="linkbtn" data-act="speed">속도 ${(SPEEDS.find(([v]) => v === settings.speed) || [0, "테스트"])[1]}</button>
<button class="linkbtn" data-act="explain">설명 창 ${settings.explain ? "켜짐" : "꺼짐"}</button>
<button class="linkbtn" data-act="quit">그만하기</button></span>
</div>
<div class="table">
<div class="order">차례 순서: ${esc(order)} → 나</div>
<div class="seats">${seatHTML}</div>
${zone}
<div class="center">
<div class="played"><span class="tag">${isFam() ? "방금 나온 카드" : "지금 잔"}</span>${played}</div>
<div class="log" id="log" aria-live="polite">${logHTML}</div>
</div>
</div>
<div class="me ${S.cur === 0 ? "turn" : ""} ${me.gas >= DANGER ? "danger" : ""} ${me.away ? "out" : ""}" data-seat="0">
<div class="mehead">
<b>나</b>${S.cur === 0 ? '<span class="chip turnc">내 차례</span>' : ""}${me.away ? `<span class="chip away">${S.def.away} 중</span>` : ""}
<span class="gasnum">${me.gas}</span><span class="tag">가스 (빨간 선 16부터 위험)</span>
${gauge(me.gas)}
<span class="warns" aria-label="경고 ${me.warn}장">${"●".repeat(me.warn)}${"○".repeat(2 - me.warn)}</span>
</div>
<div><span class="tag">내 가스 내역</span>${histHTML(me, 6)}</div>
${myWarn}
<div class="prompt">${promptHTML}</div>
<div class="hand">${handHTML}</div>
</div>`;
const lg = document.getElementById("log"); if (lg) lg.scrollTop = lg.scrollHeight;
const tb = document.getElementById("timerbar");
if (tb && pr && pr.type === "timed") {
const left = Math.max(0, (pr.until || (pr.until = performance.now() + pr.ms)) - performance.now());
tb.style.transition = "none"; tb.style.transform = `scaleX(${left / pr.ms})`;
requestAnimationFrame(() => { tb.style.transition = `transform ${left}ms linear`; tb.style.transform = "scaleX(0)"; });
}
runFX();
}
function renderModal() {
const m = UI.modal;
if (!m) { modalEl.innerHTML = ""; return; }
if (m.kind === "coach") {
modalEl.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><div class="mbox">
<div class="coach"><span class="face" aria-hidden="true">뿡</span><p>${esc(m.text)}</p></div>
<div class="row"><button class="pbtn main" data-close>알겠어요</button></div></div></div>`;
} else {
modalEl.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><div class="mbox">
<h3 class="bb">${esc(m.title)}</h3>
${m.lines.map(([k, v]) => `<div class="ln"><b>${esc(k)}</b><p>${esc(v)}</p></div>`).join("")}
<div class="row"><button class="pbtn main" data-close>계속</button></div></div></div>`;
}
const b = modalEl.querySelector("[data-close]"); if (b) b.focus();
}
modalEl.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeModal(); });
function renderIntro() {
document.documentElement.dataset.mode = settings.mode;
const seg = (key, vals) => `<div class="seg" role="group">${vals.map(([v, l]) => `<button data-set="${key}" data-val="${v}" aria-pressed="${settings[key] == v}">${l}</button>`).join("")}</div>`;
app.innerHTML = `
<section class="intro">
<span class="tag">파티 카드게임 · 1등이 아니라 꼴찌를 면하는 게임</span>
<h1>예의를 지켜라, <span class="pp">뿡!</span></h1>
<p>가스는 무조건 차오른다. 가스가 16 이상인 사람을 옆사람이 눈치채면 "뿡!" 경고 2장이면 꼴찌. 나머지는 경고가 적고 가스가 낮은 순으로 순위가 갈린다.</p>
<div class="modes">
<button class="mode" data-set="mode" data-val="family" aria-pressed="${settings.mode === "family"}"><b>가족판 · 할머니 생신잔치</b><small>정직한 게임. 먹고, 산책 나가고, 옆사람을 감시한다. 시작 가스 10.</small></button>
<button class="mode" data-set="mode" data-val="hoesik" aria-pressed="${settings.mode === "hoesik"}"><b>회식판 · 술자리를 버텨라</b><small>거짓말 가능. 한 잔 낸 척 잔 밑으로 술을 흘리고, 수상하면 의심한다. 시작 가스 6.</small></button>
</div>
<div class="opts">
<div class="opt"><span class="tag">인원 (나 포함)</span>${seg("n", [[3, "3명"], [4, "4명"], [5, "5명"], [6, "6명"]])}</div>
<div class="opt"><span class="tag">상대 눈치</span>${seg("level", [["easy", "둔함"], ["normal", "보통"], ["hard", "예리함"]])}</div>
<div class="opt"><span class="tag">진행 속도</span>${seg("speed", SPEEDS)}</div>
</div>
<div class="gobar">
<button class="go" data-act="start">${settings.mode === "family" ? "잔치 시작" : "회식 시작"}</button>
<button class="go ghost" data-act="tutorial">처음이에요 (튜토리얼)</button>
</div>
<details class="rules"><summary>규칙 요약 (v1.1)</summary>
${settings.mode === "family" ? `<ul>
<li>내 차례: 손에 음식/음료가 있으면 1장은 반드시 먹는다. 그다음 행동 카드 1장을 더 쓸 수 있다.</li>
<li>가스 16 이상이면 위험. 바로 양옆 사람만 "뿡!"을 외칠 수 있다. 뿡을 맞으면 경고 1장, 가스는 10으로.</li>
<li>위험한데 아무도 안 외치면, 다음 턴이 시작될 때 양옆이 둘 다 벌칙(손패 무작위 공개, 올리는 카드면 그대로, 아니면 +1).</li>
<li>산책 중에는 뿡을 받지도 외치지도 않는다. 다음 내 차례에 돌아온다.</li>
<li>경고 2장이면 꼴찌, 즉시 게임 끝. 카드 더미를 세 번째로 다 쓰면 마감.</li></ul>` : `<ul>
<li>내 차례: 술 1장을 잔에 낸다. 이때 손패 최대 2장을 잔 밑에 몰래 흘릴 수 있다. 숨기지 않은 술은 전부 마신다.</li>
<li>다른 사람은 다음 차례 전에 "의심!"할 수 있다. 걸리면 숨긴 술을 전부 마시고, 헛의심이면 의심한 사람 +3.</li>
<li>술을 마신 턴에만 안주 1장. 행동 카드 1장. 턴 끝에 2장을 뽑고, 8장을 넘으면 버린다 (술이면 마신다).</li>
<li>가스 16 이상은 양옆이 "뿡!" 경고 2장이면 꼴찌. 뿡을 맞으면 가스 6으로.</li>
<li>실제 음주는 필요 없다. 물이나 음료로 즐기세요.</li></ul>`}
</details>
</section>`;
}
function slidesFor(mode) {
const g = (v, label) => `<div class="demo-row"><span class="gasnum">${v}</span><div style="flex:1 1 160px">${gauge(v)}</div><span class="muted">${label}</span></div>`;
const mini = (t, name, v) => cardHTML({ t, name, v, desc: "" }, { mini: true, attrs: 'tabindex="-1"' });
const common = [
{ t: "꼴찌만 피하면 돼요", p: "이 게임은 1등을 가리지 않아요. 경고 카드 2장을 먼저 받는 한 사람이 꼴찌가 되고 게임이 끝나요. 나머지는 경고가 적은 순, 같으면 가스가 낮은 순으로 순위가 정해져요.",
d: `<div class="demo-row"><span class="pill">경고 0장</span><span class="pill">경고 1장</span><span class="pill dg">경고 2장 = 꼴찌</span></div>` },
{ t: "가스는 계속 차올라요", p: `${mode === "family" ? "음식과 음료를 먹으면" : "술을 마시면"} 가스가 올라가요. 막대의 빨간 선이 16이에요. 16 이상이 되면 위험 상태예요. 위험 상태라고 바로 벌을 받는 건 아니고, 옆사람이 눈치채야 해요.`,
d: g(mode === "family" ? 10 : 6, "시작") + g(14, "조심") + g(17, "위험! 16 이상") },
{ t: "뿡은 바로 양옆만 외쳐요", p: "누군가 위험해지면, 그 사람의 바로 왼쪽과 오른쪽 사람만 \"뿡!\"을 외칠 수 있어요. 뿡을 맞으면 경고 1장을 받고 가스가 처음 값으로 돌아가요. 양옆이 둘 다 못 외치면 다음 턴 시작에 양옆이 벌칙을 받아요.",
d: `<div class="demo-row"><span class="pill nbp">왼쪽 옆사람: 뿡 가능</span><span class="pill dg">위험한 사람 17</span><span class="pill nbp">오른쪽 옆사람: 뿡 가능</span><span class="pill">건너편: 못 외침</span></div>` },
];
const fam = [
{ t: "내 차례에 할 일", p: "1) 음식이나 음료 1장을 반드시 먹어요. 2) 그다음 행동 카드 1장을 더 쓸 수 있어요. 3) 손패를 6장으로 채워요. 행동 카드로 내 가스를 낮추거나(화장실 -5), 남의 가스를 올려(건배 +2) 옆사람을 위험하게 만들 수 있어요.",
d: `<div class="demo-row">${mini("F", "미역국", 0)}${mini("A", "화장실", 0)}${mini("A", "다 같이 건배!", 0)}</div>` },
{ t: "산책 나가기", p: "'산책 나가기'를 쓰면 가스 -1, 그리고 다음 내 차례까지 산책 구역에 있어요. 산책 중에는 뿡을 받지도 외치지도 않아요. 하지만 누가 '할머니! 얘들 없어요!'를 외치면 끌려와요.",
d: `<div class="zone"><b>산책 구역</b><span class="who"><span>삼촌</span></span><span class="muted">다음 자기 차례에 돌아옴</span></div>` },
];
const hoe = [
{ t: "술 한 잔, 그리고 흘리기", p: "내 차례엔 술 1장을 잔에 내요. 이때 손패 최대 2장을 잔 밑에 몰래 흘릴 수 있어요. 숨기지 않은 술은 이번 턴에 전부 마셔요. 그래서 센 술을 흘리는 게 핵심이에요.",
d: `<div class="demo-row">${mini("S", "맥주", 2)}<span class="muted">잔 밑에 몰래 →</span>${mini("S", "폭탄주", 5)}</div>` },
{ t: "의심!", p: "누가 잔을 내면 다음 사람 차례 전까지 누구나 \"의심!\"할 수 있어요. 잔 밑에서 카드가 나오면 숨긴 술을 전부 마셔요. 아무것도 없으면 의심한 사람이 벌주 +3이에요. 단서와 손패 장수를 보고 판단하세요.",
d: `<div class="demo-row"><span class="pill dg">걸림: 숨긴 술 전부 마심</span><span class="pill">헛의심: 의심한 사람 +3</span></div>` },
];
return [...common, ...(mode === "family" ? fam : hoe),
{ t: "연습 판으로 해 봐요", p: "이제 실제로 한 판 해 봐요. 처음 나오는 장면마다 코치가 잠깐 멈춰서 설명해 줘요. 상대는 눈치가 둔한 편이라 뿡 버튼을 누를 시간이 넉넉해요.", d: "" }];
}
function renderSlides() {
const sl = slidesFor(TUT.mode);
const s = sl[TUT.step];
document.documentElement.dataset.mode = TUT.mode;
const last = TUT.step === sl.length - 1;
app.innerHTML = `
<section class="slides">
<span class="tag">튜토리얼 · ${TUT.mode === "family" ? "가족판" : "회식판"} · ${TUT.step + 1}/${sl.length}</span>
<h2>${esc(s.t)}</h2>
<p>${esc(s.p)}</p>
${s.d ? `<div class="demo">${s.d}</div>` : ""}
<div class="dots" aria-hidden="true">${sl.map((_, k) => `<i class="${k === TUT.step ? "on" : ""}"></i>`).join("")}</div>
<div class="gobar">
${TUT.step ? '<button class="pbtn" data-act="tprev">이전</button>' : '<button class="pbtn" data-act="menu">처음 화면</button>'}
<button class="go" data-act="${last ? "tplay" : "tnext"}">${last ? "연습 판 시작" : "다음"}</button>
</div>
</section>`;
}
function renderEnd() {
const r = ranking();
const L = P(S.loser);
const rows = r.map((k, idx) => `<tr class="${k === S.loser ? "last" : ""}"><td>${k === S.loser ? "꼴찌" : idx + 1 + "위"}</td><td>${esc(nm(k))}</td><td>${P(k).warn}장</td><td>${P(k).gas}</td></tr>`).join("");
const st = S.stats;
app.innerHTML = `
<section class="result">
<span class="tag">${S.endReason === "마감" ? "마감! 카드 더미를 세 번째로 다 썼다" : "경고 2장째"}${S.tutorial ? " · 연습 판 끝" : ""}</span>
<h2>${S.loser === 0 ? "당신이 꼴찌예요. 뿡!" : `${josa(L.name, "이", "가")} 꼴찌! 당신은 ${r.indexOf(0) + 1}위`}</h2>
<div class="tblwrap"><table class="rank"><thead><tr><th>순위</th><th>이름</th><th>경고</th><th>가스</th></tr></thead><tbody>${rows}</tbody></table></div>
<p class="muted">${S.turn}턴 동안 뿡 ${st.bbung}번, 놓친 벌칙 ${st.missed}번${isFam() ? "" : `, 흘리기 ${st.hide}번, 의심 ${st.suspect}번 중 적발 ${st.caught}번`}. 순위는 경고가 적은 순, 같으면 가스가 낮은 순이에요.</p>
<div class="gobar">
<button class="go" data-act="again">${S.tutorial ? "진짜 게임 시작" : "한 판 더 (시작 순서는 왼쪽으로)"}</button>
<button class="pbtn" data-act="menu">처음 화면</button>
</div>
</section>`;
}
function stopGame() { if (UI.prompt && UI.prompt.timer) clearTimeout(UI.prompt.timer); UI.prompt = null; UI.modal = null; renderModal(); S = null; }
app.addEventListener("click", (e) => {
const t = e.target.closest("[data-act],[data-card],[data-player],[data-opt],[data-set]");
if (!t) return;
if (t.dataset.set) {
const k = t.dataset.set, v = t.dataset.val;
settings[k] = k === "n" || k === "speed" ? Number(v) : v;
saveSettings(); renderIntro(); return;
}
const act = t.dataset.act;
if (act === "start" || act === "again") { stopGame(); TUT = null; newGame(); render(); runGame(); return; }
if (act === "tutorial") { TUT = { mode: settings.mode, step: 0 }; render(); return; }
if (act === "tnext") { TUT.step++; render(); return; }
if (act === "tprev") { TUT.step--; render(); return; }
if (act === "tplay") { TUT = null; newGame({ tutorial: true }); render(); runGame(); return; }
if (act === "menu" || act === "quit") { stopGame(); TUT = null; renderIntro(); return; }
if (act === "speed") { const k = SPEEDS.findIndex(([v]) => v === settings.speed); settings.speed = SPEEDS[(k + 1) % SPEEDS.length][0]; saveSettings(); render(); return; }
if (act === "explain") { settings.explain = !settings.explain; saveSettings(); render(); return; }
const pr = UI.prompt;
if (!pr) return;
if (act === "timed" && pr.type === "timed") return answer(true);
if (act === "skip") return answer(null);
if (t.dataset.opt != null && pr.type === "opts") return answer(pr.opts[Number(t.dataset.opt)][1]);
if (t.dataset.player != null && pr.type === "player") return answer(Number(t.dataset.player));
if (t.dataset.card != null) {
const c = P(0).hand.find((x) => x.id === Number(t.dataset.card));
if (!c || !pr.filter || !pr.filter(c)) return;
if (pr.type === "card") { if (!c.fresh) answer(c); return; }
if (pr.type === "cards") {
const k = pr.chosen.indexOf(c);
if (k >= 0) pr.chosen.splice(k, 1); else if (pr.chosen.length < pr.max) pr.chosen.push(c);
render(); return;
}
}
if (act === "confirm" && pr.type === "cards") return answer([...pr.chosen]);
});
app.addEventListener("keydown", (e) => {
if ((e.key === "Enter" || e.key === " ") && e.target.dataset && e.target.dataset.player != null) { e.preventDefault(); e.target.click(); }
});
async function selftest() {
const out = {};
for (const mode of ["family", "hoesik"]) for (const n of [3, 4, 5, 6]) {
settings.mode = mode; settings.n = n;
const res = { games: 0, turns: 0, warn2: 0, close: 0, errors: 0 };
for (let g = 0; g < 300; g++) {
newGame({ selftest: true });
try { await runGame(); } catch (err) { res.errors++; console.error(err); }
res.games++; res.turns += S.turn; if (S.endReason === "경고2") res.warn2++; else res.close++;
}
out[`${mode}-${n}`] = { ...res, avgTurns: +(res.turns / res.games).toFixed(1) };
}
window.__selftest = out;
S = null;
app.innerHTML = `<pre>${esc(JSON.stringify(out, null, 1))}</pre>`;
}
if (location.hash === "#selftest") selftest(); else render();
