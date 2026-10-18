"use strict";
const DANGER = 16;
const FAMILY = {
key: "family", name: "할머니 생신잔치", start: 10, hand: 6, away: "산책",
me: "나", names: ["엄마", "아빠", "삼촌", "고모", "사촌동생"],
cards: [
["F", "치킨", 3, 2, "chain", "다음 사람은 턴 시작에 음식 1장을 더 먹는다"],
["F", "삼겹살", 3, 2, "chain", "다음 사람은 턴 시작에 음식 1장을 더 먹는다"],
["F", "잔치국수", 2, 2], ["F", "갈비찜", 3, 2], ["F", "전", 3, 2], ["F", "흰쌀밥", 1, 2],
["F", "미역국", 0, 2], ["F", "만두", 1, 2], ["F", "초코 케이크", 3, 2], ["F", "아이스크림", 2, 2], ["F", "젤리 폭탄", 2, 2],
["D", "콜라", 3, 2], ["D", "스트롱 사이다!", 4, 2], ["D", "초코우유 원샷", 2, 2], ["D", "딸기우유", 2, 2],
["D", "포도주스", 2, 2], ["D", "오렌지주스", 2, 2], ["D", "보리차", 0, 2], ["D", "매실차", -3, 1], ["D", "물", 0, 1],
["D", "할아버지 몫", 3, 1, "elder", "내가 아닌 어른 1명을 지목해 그 사람이 +3"],
["A", "복부 마사지", -3, 2, "heal", "내 가스 -3"],
["A", "트름", -2, 2, "heal", "내 가스 -2"],
["A", "화장실", -5, 2, "heal", "내 가스 -5"],
["A", "다 같이 건배!", 0, 2, "toast", "잔치 자리의 모두 +2"],
["A", "나 빼고 다 같이 건배!", 0, 2, "toastx", "나를 뺀 잔치 자리의 모두 +1"],
["A", "민망한 침묵", 0, 2, "silence", "산책 중 포함 모두 +1"],
["A", "배꼽 잡고 웃는다", 0, 2, "laugh", "나와 내 양옆 +2"],
["A", "그거 좀 줘", 0, 2, "steal", "다른 사람 손패 1장을 무작위로 뽑아 내가 바로 쓴다"],
["A", "산책 나가기", 0, 3, "walk", "가스 -1, 다음 내 차례까지 산책 (뿡을 받지 않음)"],
["A", "나 잠깐 안 보일게", 0, 2, "r_block", "반응: 나에게 오는 행동 카드 효과 1번 무효"],
["A", "어! 나도 나갈게!", 0, 3, "r_join", "반응: 누가 산책 나갈 때 같이 나가고 가스 -1"],
["A", "할머니! 얘들 없어요!", 0, 2, "grandma", "산책 중인 사람 전원 복귀. 방금 나간 사람은 +1 (반응/내 차례)"],
],
};
const HOESIK = {
key: "hoesik", name: "술자리를 버텨라", start: 6, hand: 6, away: "화장실",
me: "나", names: ["김부장", "이과장", "박대리", "최주임", "정인턴"],
cards: [
["S", "맥주", 2, 4], ["S", "소주", 3, 4], ["S", "막걸리", 2, 3], ["S", "하이볼", 3, 3], ["S", "와인", 2, 2],
["S", "소맥", 4, 2], ["S", "폭탄주", 5, 2], ["S", "원샷!", 4, 2],
["J", "삼겹살", -1, 3], ["J", "치킨", -1, 3], ["J", "어묵탕", -2, 2], ["J", "계란말이", -1, 2], ["J", "감자튀김", 0, 2],
["J", "과일 안주", 0, 2], ["J", "물 한 잔", -2, 2], ["J", "해장국", -3, 2],
["A", "증거 인멸", 0, 2, "r_destroy", "반응: 의심받았을 때 숨긴 카드 1장을 몰래 버린다"],
["A", "한 잔 받아", 0, 2, "pour", "1명 지목, 그 사람은 손패의 술 1장을 바로 마신다 (없으면 +2)"],
["A", "건배!", 0, 2, "cheers", "화장실 간 사람 빼고 모두 +2"],
["A", "나 화장실 좀", 0, 2, "toilet", "가스 -3, 다음 내 차례까지 카드 대상이 되지 않음"],
["A", "물 좀 주세요", 0, 2, "water", "가스 -2"],
["A", "2차 가자!", 0, 2, "round2", "모두 손패 1장을 왼쪽 사람에게 넘긴다"],
["A", "오늘 내가 쏜다", 0, 2, "treat", "내 술 1장을 다른 사람이 바로 마신다. 대신 나도 +1"],
["A", "술잔 바꾸기", 0, 2, "r_swap", "반응: 나에게 오는 '한 잔 받아'·'내가 쏜다'를 양옆 1명에게 돌린다"],
["A", "안 마신 척", 0, 2, "r_fake", "반응: 의심받았을 때 버틴다. 의심한 사람이 철회하면 판정 없음"],
["A", "분위기 왜 이래", 0, 2, "mood", "가스가 가장 낮은 사람 +2"],
],
};
const KIND = { F: "음식", D: "음료", A: "행동", S: "술", J: "안주" };
const app = document.getElementById("app");
const modalEl = document.getElementById("modal");
const END = { end: true };
let S = null;              // 게임 상태
let UI = { prompt: null }; // 지금 사람에게 묻는 것
let TUT = null;            // 튜토리얼 슬라이드 상태
let FX = [];               // 다음 화면 갱신 때 띄울 가스 변화 숫자
let settings = { mode: "family", n: 4, level: "normal", speed: 0.7, explain: true };
let session = { lastFirst: null };
const SPEEDS = [[0.45, "느리게"], [0.7, "보통"], [1.3, "빠르게"]];
const LEVEL = { easy: { attn: 0.6, keen: 0.55 }, normal: { attn: 0.8, keen: 0.8 }, hard: { attn: 0.95, keen: 1.05 } };
try {
const s = JSON.parse(localStorage.getItem("ppung-settings2") || "null");
if (s) settings = { ...settings, ...s };
} catch (e) {}
if (!SPEEDS.some(([v]) => v === settings.speed)) settings.speed = 0.7;
function saveSettings() { try { localStorage.setItem("ppung-settings2", JSON.stringify(settings)); } catch (e) {} }
const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const rnd = () => Math.random();
const pick = (a) => a[Math.floor(rnd() * a.length)];
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function sleep(ms) {
if (S && S.selftest) return Promise.resolve();
const g = S;
return new Promise((r) => setTimeout(() => { if (S === g) r(); }, ms / settings.speed));
}
let cardSeq = 0;
function buildDeck(def) {
const d = [];
for (const [t, name, v, n, sp, desc] of def.cards) for (let i = 0; i < n; i++) d.push({ id: ++cardSeq, t, name, v, sp: sp || "", desc: desc || "" });
return shuffle(d);
}
const P = (i) => S.p[i];
const human = (i) => i === 0 && !S.selftest;
const nm = (i) => P(i).name;
const isFam = () => S.def.key === "family";
function josa(w, a, b) {
const c = w.charCodeAt(w.length - 1);
const has = c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 > 0;
return w + (has ? a : b);
}
const sbj = (i) => josa(nm(i), "이", "가");
const eunNeun = (i) => josa(nm(i), "은", "는");
const outOfSeat = (i) => isFam() && P(i).away;
function nb(i) { const n = S.n; return [...new Set([(i + n - 1) % n, (i + 1) % n])]; }
function log(text, cls = "") { S.log.push({ text, cls }); if (S.log.length > 160) S.log.shift(); render(); }
function addGas(i, v, label, quiet = false) {
const p = P(i), before = p.gas;
p.gas = Math.max(0, p.gas + v);
const d = p.gas - before;
p.hist.push({ v: d, label: label || "변화" });
if (p.hist.length > 12) p.hist.shift();
if (d !== 0) FX.push({ i, v: d });
if (!quiet) log(`${nm(i)} ${label ? label + " " : ""}${d >= 0 ? "+" : ""}${d} → 가스 ${p.gas}`, d < 0 ? "gd" : "");
else render();
return d;
}
function draw() {
if (!S.deck.length) {
if (S.reshuffles >= 2) { S.endReason = "마감"; throw END; }
S.reshuffles++;
S.deck = shuffle(S.discard); S.discard = [];
log(`카드 더미를 섞었다 (${S.reshuffles}번째). 세 번째로 다 쓰면 마감!`, "sys");
if (!S.deck.length) { S.endReason = "마감"; throw END; }
}
return S.deck.pop();
}
function discard(c) { if (c) S.discard.push(c); }
function takeCard(i, c) { const h = P(i).hand; const k = h.indexOf(c); if (k >= 0) h.splice(k, 1); return c; }
function findSp(i, sp) { return P(i).hand.find((c) => c.sp === sp); }
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
async function fly(i, c, verb) {
S.played = [c];
S.playedNote = `${sbj(i)} ${verb}`;
if (S.selftest) return;
render();
const from = document.querySelector(`[data-seat="${i}"]`);
const to = document.querySelector(".played .stack");
if (!from || !to) return;
const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
const el = document.createElement("div");
el.className = "flyer";
el.innerHTML = cardHTML(c, { mini: true, attrs: 'tabindex="-1"' }) + `<span class="flylabel">${esc(nm(i))} ${esc(verb)}</span>`;
const x0 = a.left + a.width / 2 - 42, y0 = a.top + Math.min(a.height / 2, 60) - 50;
el.style.left = x0 + "px"; el.style.top = y0 + "px";
document.body.appendChild(el);
if (!reduced) {
await nextFrame();
el.style.transitionDuration = `${0.75 / settings.speed}s`;
el.style.transform = `translate(${b.left - x0}px, ${b.top - y0}px)`;
}
await sleep(reduced ? 500 : 900);
el.remove();
render();
}
function runFX() {
if (!FX.length || S.selftest) { FX = []; return; }
for (const { i, v } of FX) {
const g = document.querySelector(`[data-seat="${i}"] .gauge`);
if (!g) continue;
const r = g.getBoundingClientRect();
const el = document.createElement("div");
el.className = `float ${v > 0 ? "up" : "dn"}`;
el.textContent = `${v > 0 ? "+" : ""}${v}`;
el.style.left = r.left + Math.min(r.width, (P(i).gas / 20) * r.width) - 10 + "px";
el.style.top = r.top - 30 + "px";
document.body.appendChild(el);
setTimeout(() => el.remove(), 1500);
}
FX = [];
}
function splash(text) {
if (S.selftest) return;
const el = document.createElement("div"); el.className = "splash"; el.textContent = text;
document.body.appendChild(el); setTimeout(() => el.remove(), 1100);
}
function ask(prompt) { return new Promise((resolve) => { UI.prompt = { ...prompt, resolve }; render(); }); }
function answer(v) { const p = UI.prompt; if (!p) return; UI.prompt = null; if (p.timer) clearTimeout(p.timer); p.resolve(v); render(); }
function askCard(q, filter, { optional = false, skip = "건너뛰기", hint = null } = {}) { return ask({ type: "card", q, filter, optional, skip, hint }); }
function askCards(q, filter, max, { skip = "숨기지 않기", hint = null } = {}) { return ask({ type: "cards", q, filter, max, chosen: [], skip, hint }); }
function askPlayer(q, cands, { optional = false } = {}) { return ask({ type: "player", q, cands, optional }); }
function askYesNo(q, yes = "쓴다", no = "안 쓴다") { return ask({ type: "opts", q, opts: [[yes, true, "main"], [no, false]] }); }
function timedWindow(q, label, limit, aiTime, extra = "") {
const wait = (aiTime == null ? limit : Math.min(limit, aiTime)) * (S.tutorial ? 2.2 : 1);
return new Promise((resolve) => {
const prompt = { type: "timed", q, label, extra, ms: wait / settings.speed, resolve };
prompt.timer = setTimeout(() => { if (UI.prompt === prompt) { UI.prompt = null; render(); resolve(false); } }, wait / settings.speed);
UI.prompt = prompt; render();
});
}
function showModal(m) {
if (S && S.selftest) return Promise.resolve();
return new Promise((resolve) => { UI.modal = { ...m, resolve }; renderModal(); });
}
function closeModal() { const m = UI.modal; if (!m) return; UI.modal = null; renderModal(); m.resolve(); }
async function coach(key, text) {
if (!S.tutorial || S.coached.has(key)) return;
S.coached.add(key);
await showModal({ kind: "coach", text });
}
async function check() {
for (let i = 0; i < S.n; i++) {
const p = P(i);
if (p.gas < DANGER || outOfSeat(i)) continue;
const callers = nb(i).filter((j) => !outOfSeat(j));
if (!callers.length) continue;
const attn = S.tutorial && !S.coached.has("firstbbung") ? 0.25 : S.attn;
let ai = null;
for (const j of callers) {
if (human(j)) continue;
if (rnd() < attn) { const t = 900 + rnd() * 1900; if (!ai || t < ai.t) ai = { j, t }; }
}
if (i === 0 && !S.selftest) await coach("mydanger", `내 가스가 ${p.gas}이 됐어요. 16 이상이면 위험! 양옆 사람이 "뿡!"을 외치면 경고 1장이에요. 안 들켰다면 내 차례에 회복 카드로 낮추세요.`);
let caller = null;
if (callers.some(human)) {
await coach("nbdanger", `옆자리 ${sbj(i)} 가스 ${p.gas}이 됐어요. 위험한 사람의 바로 양옆만 "뿡!"을 외칠 수 있어요. 빨간 뿡 버튼을 누르세요! 다른 옆사람이 먼저 외칠 수도 있어요.`);
S.bbungTarget = i;
const hit = await timedWindow(`${sbj(i)} 가스 ${p.gas}! 옆자리인 당신은 뿡을 외칠 수 있어요.`, "뿡!", 3000, ai ? ai.t : null);
S.bbungTarget = null;
caller = hit ? 0 : ai ? ai.j : null;
} else if (ai) { await sleep(700); caller = ai.j; }
if (caller !== null) await bbung(i, caller);
else if (p.gas >= DANGER) log(`${nm(i)}의 가스 ${p.gas}… 아무도 눈치채지 못했다. (다음 턴 시작에 양옆이 벌칙)`, "sys");
}
}
function histText(p) {
return p.hist.slice(-6).map((h) => `${h.label} ${h.v >= 0 ? "+" : ""}${h.v}`);
}
async function bbung(i, caller) {
const p = P(i);
S.stats.bbung++;
splash("뿡!");
const gas = p.gas, hist = histText(p), callers = nb(i).filter((j) => !outOfSeat(j));
log(`${nm(caller)}: "뿡!" ${nm(i)} 경고 ${p.warn + 1}장째`, "bb");
p.warn++;
p.gas = S.def.start;
p.hist = [];
FX.push({ i, v: S.def.start - gas });
S.coached.add("firstbbung");
await sleep(1100);
if (settings.explain || S.tutorial) {
await showModal({
kind: "bbung",
title: `뿡! ${eunNeun(i)} 경고 ${p.warn}장`,
lines: [
["왜?", `${nm(i)}의 가스가 ${gas}이 됐어요. 16 이상이면 위험 상태예요.`],
["무엇 때문에?", hist.length ? `최근 가스 변화: ${hist.join(", ")}` : "이전부터 가스가 높았어요."],
["누가?", `옆자리 ${sbj(caller)} 외쳤어요. 위험한 사람의 바로 양옆(${callers.map(nm).join(", ")})만 외칠 수 있어요.`],
["결과", `경고 ${p.warn}장${p.warn >= 2 ? "이라 꼴찌, 게임 끝!" : `. 2장이면 꼴찌예요. 가스는 ${S.def.start}으로 돌아가요.`}`],
...(i === 0 && p.warn < 2 ? [["요령", isFam() ? "가스 13쯤부터 화장실·마사지·트름·산책으로 미리 낮추세요." : "센 술은 잔 밑으로 흘리거나, 화장실·물로 미리 낮추세요."]] : []),
],
});
}
if (p.warn >= 2) { S.loser = i; S.endReason = "경고2"; throw END; }
}
async function missedPenalty() {
for (let i = 0; i < S.n; i++) {
if (P(i).gas < DANGER || outOfSeat(i)) continue;
const results = [];
for (const j of nb(i)) {
if (outOfSeat(j)) continue;
const h = P(j).hand;
S.stats.missed++;
if (!h.length) { addGas(j, 1, "놓친 벌칙"); results.push(`${nm(j)}: 손패가 없어 +1`); continue; }
const c = h.splice(Math.floor(rnd() * h.length), 1)[0];
discard(c);
const raises = "FDS".includes(c.t) && c.v > 0;
log(`${eunNeun(j)} ${nm(i)}의 뿡을 놓쳤다! 손패 무작위 공개: ${c.name}`, "bb");
const d = addGas(j, raises ? c.v : 1, raises ? `벌칙(${c.name})` : "벌칙");
results.push(`${nm(j)}: '${c.name}' 공개 → ${raises ? "가스를 올리는 카드라 그대로" : "올리는 카드가 아니라 대신"} +${d}`);
await sleep(600);
}
if (results.length && (settings.explain || S.tutorial)) {
await showModal({
kind: "bbung",
title: "뿡을 놓쳤다!",
lines: [
["무슨 일?", `${nm(i)}의 가스가 ${P(i).gas}(16 이상)인데 지난 턴에 아무도 "뿡!"을 외치지 않았어요.`],
["벌칙", `옆사람 둘 다 손패 1장을 무작위로 공개해요. ${results.join(" / ")}`],
["그다음", `${eunNeun(i)} 여전히 위험해요. 양옆은 지금도 뿡을 외칠 수 있어요.`],
],
});
}
}
await check();
}
const famIsFD = (c) => c.t === "F" || c.t === "D";
const famOwnTurnAction = (c) => c.t === "A" && !["r_block", "r_join"].includes(c.sp) && !c.fresh;
async function famPlayFD(i, c, verb = "먹었다") {
discard(c);
await fly(i, c, verb);
if (c.sp === "elder") {
const cands = [...Array(S.n).keys()].filter((k) => k !== i);
const k = human(i) ? await askPlayer("할아버지 몫을 받을 어른을 지목하세요", cands) : cands.reduce((a, b) => (P(b).gas > P(a).gas ? b : a));
log(`${nm(i)}: "할아버지 몫이에요!" ${nm(k)}에게 넘겼다`);
addGas(k, c.v, "할아버지 몫");
} else {
addGas(i, c.v, c.name);
}
if (c.sp === "chain") {
S.pendingExtra++;
log(`${eunNeun((i + 1) % S.n)} 다음 턴 시작에 음식을 1장 더 먹어야 한다`, "sys");
await coach("chain", `${c.name}! 다음 사람(${nm((i + 1) % S.n)})은 자기 턴이 시작될 때 음식을 1장 더 먹어야 해요. 다음 사람 가스가 높을 때 쓰면 효과 만점.`);
}
await sleep(500);
}
async function tryBlock(k, v, cardName) {
const c = findSp(k, "r_block");
if (!c) return false;
let use;
if (human(k)) use = await askYesNo(`'${cardName}' 효과가 당신에게 온다 (+${v}). '나 잠깐 안 보일게'로 막을까요?`, "막는다", "그냥 받는다");
else use = P(k).gas + v >= DANGER - 1;
if (!use) return false;
takeCard(k, c); discard(c);
log(`${nm(k)}: "나 잠깐 안 보일게!" 효과 무효`, "gd");
return true;
}
async function famGlobal(i, c) {
const here = [...Array(S.n).keys()].filter((k) => !P(k).away);
let tg, v;
if (c.sp === "toast") { tg = here; v = 2; }
else if (c.sp === "toastx") { tg = here.filter((k) => k !== i); v = 1; }
else if (c.sp === "silence") { tg = [...Array(S.n).keys()]; v = 1; }
else { tg = [...new Set([i, ...nb(i)])]; v = 2; }
const hit = [];
for (const k of tg) {
if (k !== i && (await tryBlock(k, v, c.name))) continue;
addGas(k, v, c.name, true); hit.push(k);
}
log(`${c.name}: ${hit.map(nm).join(", ")} 가스 +${v}`);
if (c.sp === "toast" || c.sp === "toastx") {
const outs = [...Array(S.n).keys()].filter((k) => P(k).away);
if (outs.length) log(`(${outs.map(nm).join(", ")}: 산책 중이라 건배를 피했다)`, "sys");
}
await sleep(700);
}
