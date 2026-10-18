"use strict";
async function famWalk(i) {
P(i).away = true;
log(`${nm(i)}: "잠깐 바람 좀 쐬고 올게." 산책 구역으로 이동`);
addGas(i, -1, "산책");
await coach("walk", `${sbj(i)} 산책을 나갔어요. 산책 중에는 뿡을 받지도 외치지도 않고, '잔치 자리' 대상 카드도 피해요. 다음 자기 차례가 시작되면 돌아와요. 단, '할머니! 얘들 없어요!'로 끌려올 수 있어요.`);
await sleep(600);
const walkers = [i];
for (let d = 1; d < S.n; d++) {
const k = (i + d) % S.n;
if (P(k).away) continue;
const c = findSp(k, "r_join");
if (!c) continue;
const use = human(k) ? await askYesNo(`${sbj(i)} 산책을 나간다. '어! 나도 나갈게!'로 따라 나갈까요? (가스 -1, 다음 내 차례까지 뿡 면제)`, "따라 나간다", "남는다") : P(k).gas >= 12;
if (!use) continue;
takeCard(k, c); discard(c);
P(k).away = true; walkers.push(k);
log(`${nm(k)}: "어! 나도 나갈게!" 같이 산책`);
addGas(k, -1, "산책");
await sleep(600);
}
for (let d = 1; d < S.n; d++) {
const k = (i + d) % S.n;
if (P(k).away) continue;
const c = findSp(k, "grandma");
if (!c) continue;
const use = human(k)
? await askYesNo(`${walkers.map(nm).join(", ")} 산책 중. '할머니! 얘들 없어요!'로 전원 끌고 올까요? (${nm(i)} +1)`, "할머니!", "봐준다")
: Math.max(...walkers.map((w) => P(w).gas)) >= 14;
if (!use) continue;
takeCard(k, c); discard(c);
await fly(k, c, "외쳤다");
log(`${nm(k)}: "할머니! 얘들 없어요!" 산책 중인 사람 전원 복귀`, "bb");
for (let w = 0; w < S.n; w++) P(w).away = false;
addGas(i, 1, "나가다 잡힘");
await coach("grandma", "'할머니! 얘들 없어요!' 산책 중인 사람이 모두 잔치 자리로 끌려왔어요. 방금 나가려던 사람은 +1. 이제 다시 뿡을 받을 수 있어요.");
break;
}
await sleep(500);
}
async function famAction(i, c, depth = 0) {
discard(c);
S.stats.actions++;
await fly(i, c, depth ? "뺏어서 썼다" : "썼다");
if (c.sp === "heal") addGas(i, c.v, c.name);
else if (["toast", "toastx", "silence", "laugh"].includes(c.sp)) await famGlobal(i, c);
else if (c.sp === "walk") await famWalk(i);
else if (c.sp === "grandma") {
const ws = S.p.filter((p) => p.away);
for (const p of S.p) p.away = false;
log(ws.length ? `"할머니! 얘들 없어요!" 산책 중이던 ${ws.map((p) => p.name).join(", ")} 복귀` : "산책 중인 사람이 없었다", ws.length ? "bb" : "sys");
} else if (c.sp === "steal") {
const cands = [...Array(S.n).keys()].filter((k) => k !== i && P(k).hand.length);
if (!cands.length) return;
const k = human(i) ? await askPlayer("누구의 카드를 뺏어 쓸까요? (무작위 1장)", cands) : cands.reduce((a, b) => (P(b).hand.length > P(a).hand.length ? b : a));
const h = P(k).hand;
const g = h.splice(Math.floor(rnd() * h.length), 1)[0];
log(`${nm(k)}의 손패에서 뽑았다: ${g.name}`, "sys");
await sleep(500);
if (famIsFD(g)) await famPlayFD(i, g, "뺏어 먹었다");
else if (["r_block", "r_join"].includes(g.sp) || depth >= 3) { discard(g); log("반응 카드라 그냥 버린다", "sys"); }
else await famAction(i, g, depth + 1);
}
await sleep(400);
}
function famAiFD(i, fd) {
const nxt = (i + 1) % S.n;
const eff = (c) => (c.sp === "elder" ? -1 : c.v);
const chains = fd.filter((c) => c.sp === "chain");
if (chains.length && P(i).gas <= 11 && P(nxt).gas >= 13) return chains[0];
return fd.reduce((a, b) => (eff(b) < eff(a) || (eff(b) === eff(a) && a.sp === "chain") ? b : a));
}
function famAiAction(i) {
const acts = P(i).hand.filter(famOwnTurnAction);
const by = (sp) => acts.find((c) => c.sp === sp);
const g = P(i).gas;
const others = S.p.filter((_, k) => k !== i).map((p) => p.gas);
if (g >= 13) {
const heal = acts.filter((c) => c.sp === "heal").sort((a, b) => a.v - b.v)[0];
if (heal) return heal;
if (by("walk")) return by("walk");
}
if (g <= 12) {
if (by("toastx") && Math.max(...others) >= 13) return by("toastx");
if (by("toast") && g + 2 <= Math.min(...others) && Math.max(...others) >= 12) return by("toast");
if (by("laugh") && g <= 11 && Math.max(...nb(i).map((k) => P(k).gas)) >= 13) return by("laugh");
if (by("silence") && g <= 11 && Math.max(...others) >= 14) return by("silence");
if (by("steal") && g <= 11) return by("steal");
if (by("grandma") && S.p.some((p) => p.away && p.gas >= 13)) return by("grandma");
}
if (g >= 11) { const b = acts.find((c) => c.name === "트름"); if (b) return b; }
return null;
}
async function famTurn(i) {
const p = P(i);
if (p.away) { p.away = false; log(`${sbj(i)} 산책에서 돌아왔다 (이제 다시 뿡 대상)`, "sys"); await sleep(500); }
await missedPenalty();
if (S.pendingExtra > 0) {
S.pendingExtra--;
const foods = p.hand.filter((c) => c.t === "F");
if (foods.length) {
const c = human(i) ? await askCard("치킨/삼겹살 때문에 음식 1장을 더 먹어야 해요", (c) => c.t === "F") : foods.reduce((a, b) => (b.v < a.v ? b : a));
takeCard(i, c);
await famPlayFD(i, c, "추가로 먹었다");
} else addGas(i, 1, "먹을 음식이 없어서");
await check();
}
const fd = p.hand.filter(famIsFD);
if (!fd.length) {
const c = draw(); c.fresh = true; p.hand.push(c);
log(`${nm(i)}: 먹을 게 없어서 1장 뽑음 (이번 턴엔 못 씀)`, "sys");
} else {
let c;
if (human(i)) {
const lowest = fd.reduce((a, b) => (b.v < a.v ? b : a));
await coach("eat", "내 차례예요! 음식이나 음료 1장은 반드시 먹어야 해요. 카드 아래에 '먹으면 가스 몇'이 보여요. 낮은 카드를 먹는 게 안전해요.");
c = await askCard("음식이나 음료 1장을 먹으세요 (필수)", famIsFD, { hint: S.tutorial ? lowest : null });
} else c = famAiFD(i, fd);
takeCard(i, c);
await famPlayFD(i, c);
await check();
}
let a = null;
if (human(i)) {
if (p.hand.some(famOwnTurnAction)) {
if (p.gas >= 13 && p.hand.some((c) => famOwnTurnAction(c) && (c.sp === "heal" || c.sp === "walk")))
await coach("high", `내 가스가 ${p.gas}이에요. 16부터 위험하니 화장실(-5)·복부 마사지(-3)·트름(-2)로 낮추거나 산책을 나가세요.`);
else await coach("action", "이제 행동 카드 1장을 더 쓸 수 있어요 (선택). 남의 가스를 올려서 옆사람을 위험하게 만들거나, 내 가스를 낮출 수 있어요. 옆자리 사람 가스가 15라면 '나 빼고 다 같이 건배!' 한 장이면 16이 돼요.");
const hint = S.tutorial ? p.hand.find((c) => famOwnTurnAction(c) && (p.gas >= 13 ? c.sp === "heal" || c.sp === "walk" : c.sp === "toastx")) : null;
a = await askCard("행동 카드 1장을 더 쓸 수 있어요", famOwnTurnAction, { optional: true, skip: "턴 끝내기", hint });
}
} else a = famAiAction(i);
if (a) { takeCard(i, a); await famAction(i, a); await check(); }
for (const c of p.hand) delete c.fresh;
while (p.hand.length < S.def.hand) p.hand.push(draw());
}
const hoeOwnTurnAction = (c) => c.t === "A" && !c.sp.startsWith("r_");
async function hoeForcedTarget(src, k, label, amount) {
const c = findSp(k, "r_swap");
if (!c) return k;
let use;
if (human(k)) use = await askYesNo(`${nm(src)}의 '${label}'가 당신에게 왔다. '술잔 바꾸기'로 양옆에게 돌릴까요?`, "돌린다", "마신다");
else use = P(k).gas + amount >= 14;
if (!use) return k;
takeCard(k, c); discard(c);
const opts = nb(k).filter((x) => !P(x).away);
if (!opts.length) return k;
const to = human(k) ? await askPlayer("누구에게 돌릴까요?", opts) : opts.reduce((a, b) => (P(b).gas > P(a).gas ? b : a));
log(`${nm(k)}: "술잔 바꾸기!" ${nm(to)}에게 돌렸다`, "bb");
return to;
}
async function hoeDrinkFromHand(k, fallback, why) {
const sul = P(k).hand.filter((c) => c.t === "S");
if (!sul.length) { addGas(k, fallback, `${why}(술이 없어서)`); return; }
const c = human(k) ? await askCard(`${why}: 마실 술 1장을 고르세요`, (c) => c.t === "S") : sul.reduce((a, b) => (b.v < a.v ? b : a));
takeCard(k, c); discard(c);
await fly(k, c, "받아 마셨다");
addGas(k, c.v, `${why}: ${c.name}`);
}
function tellFor(hidden) {
const n = hidden.length;
const thick = rnd() < (n ? 0.3 + 0.2 * n : 0.15);
return pick(thick
? ["잔 밑이 묘하게 두툼해 보인다…", "카드를 내려놓는 손이 좀 느렸다.", "눈을 안 마주친다."]
: ["평범하게 한 잔 내려놨다.", "아무렇지 않게 웃고 있다.", "자연스럽게 잔을 비웠다."]);
}
async function hoeSuspicion(i, hidden) {
const nh = hidden.length;
const avgHand = S.p.reduce((a, p) => a + p.hand.length, 0) / S.n;
let ai = null;
for (let d = 1; d < S.n; d++) {
const k = (i + d) % S.n;
if (human(k)) continue;
let pr = S.keen * P(k).sus * (nh ? 0.06 + 0.22 * nh : 0.06);
if (P(i).hand.length <= avgHand - 2) pr += 0.08 * P(k).sus;
if (P(k).gas >= 13) pr *= 0.5;
if (rnd() < pr) { const t = 1000 + rnd() * 2000; if (!ai || t < ai.t) ai = { k, t }; }
}
let sus = null;
if (!human(i) && !S.selftest) {
await coach("suspect", `${sbj(i)} 술을 잔에 냈어요. 몰래 잔 밑에 카드를 흘렸을 수도 있어요. 수상하면 '의심!'을 누르세요. 맞으면 상대가 숨긴 술을 전부 마시고, 틀리면 내가 벌주 +3이에요. 단서와 손패 장수를 참고하세요.`);
const hit = await timedWindow(`${sbj(i)} 술 한 잔을 냈다. 혹시 몰래 흘렸을까?`, "의심!", 3400, ai ? ai.t : null, S.tell);
sus = hit ? 0 : ai ? ai.k : null;
} else if (ai) { await sleep(600); sus = ai.k; }
if (sus === null) return;
S.stats.suspect++;
splash("의심!");
log(`${nm(sus)}: "잠깐, 방금 흘렸지?" ${nm(i)} 의심!`, "bb");
await sleep(900);
if (nh) {
const fake = findSp(i, "r_fake");
if (fake && (human(i) ? await askYesNo("의심받았다! '안 마신 척'으로 버틸까요? 상대가 철회하면 판정 없이 넘어가요", "버틴다", "그냥 연다") : true)) {
takeCard(i, fake); discard(fake);
log(`${nm(i)}: "나 진짜 안 마셨는데?" (안 마신 척)`);
const withdraw = human(sus) ? await askYesNo(`${sbj(i)} 버틴다. 의심을 철회할까요? 철회하면 벌칙도 판정도 없어요`, "철회한다", "까보자") : rnd() < 0.4;
if (withdraw) { log(`${nm(sus)}: "…아니야, 내가 잘못 봤나 봐." 의심 철회`, "sys"); return; }
}
const des = findSp(i, "r_destroy");
if (des && hidden.length && (human(i) ? await askYesNo("'증거 인멸'로 숨긴 카드 1장을 몰래 버릴까요? (가장 센 술부터)", "인멸한다", "안 한다") : true)) {
takeCard(i, des); discard(des);
hidden.sort((a, b) => (a.t === "S" ? a.v : -9) - (b.t === "S" ? b.v : -9));
discard(hidden.pop());
log(`${nm(i)}: 증거 인멸! 숨긴 카드 1장이 사라졌다`, "sys");
}
}
const caught = hidden.length > 0;
const names = hidden.map((c) => c.name).join(", ");
if (caught) {
S.stats.caught++;
log(`잔 밑에서 나왔다: ${names}`, "bb");
for (const c of hidden) if (c.t === "S") addGas(i, c.v, `적발: ${c.name}`);
} else {
log(`잔 밑엔 아무것도 없었다. ${nm(sus)} 벌주 한 잔!`, "bb");
addGas(sus, 3, "헛의심 벌주");
}
if (settings.explain || S.tutorial) {
await showModal({
kind: "bbung", title: caught ? "적발!" : "헛의심!",
lines: caught
? [["무슨 일?", `${sbj(sus)} ${nm(i)}에게 의심을 걸었고, 잔 밑에서 ${names}${josa(names, "이", "가")} 나왔어요.`.replace(names + names, names)],
["결과", `${eunNeun(i)} 숨긴 술을 전부 마셔요 (가스 ${P(i).gas}). 행동·안주 카드는 효과 없이 버려요.`]]
: [["무슨 일?", `${sbj(sus)} ${nm(i)}에게 의심을 걸었지만 잔 밑에 아무것도 없었어요.`],
["결과", `의심한 ${sbj(sus)} 벌주 한 잔, 가스 +3 (가스 ${P(sus).gas}).`]],
});
}
await sleep(600);
}
function hoeAiHide(i, rest) {
const want = P(i).liar * (P(i).gas >= 12 ? 1.3 : 0.8);
return rest.filter((c) => c.t === "S").sort((a, b) => b.v - a.v).slice(0, 2).filter((c) => c.v >= 3 && rnd() < want);
}
async function hoeAction(i, c) {
discard(c); S.stats.actions++;
await fly(i, c, "썼다");
const others = [...Array(S.n).keys()].filter((k) => k !== i && !P(k).away);
const hiOther = () => others.reduce((a, b) => (P(b).gas > P(a).gas ? b : a));
if (c.sp === "toilet") { addGas(i, -3, c.name); P(i).away = true; log(`${eunNeun(i)} 화장실에 갔다 (다음 차례까지 카드 대상 제외, 뿡은 받는다)`, "sys"); }
else if (c.sp === "water") addGas(i, -2, c.name);
else if (c.sp === "cheers") { const t = [...Array(S.n).keys()].filter((k) => !P(k).away); for (const k of t) addGas(k, 2, "건배", true); log(`건배! ${t.map(nm).join(", ")} 가스 +2`); }
else if (c.sp === "mood") {
const pool = [...Array(S.n).keys()].filter((k) => !P(k).away);
const low = pool.reduce((a, b) => (P(b).gas < P(a).gas ? b : a));
addGas(low, 2, "분위기 왜 이래");
} else if (c.sp === "pour") {
if (!others.length) return;
let k = human(i) ? await askPlayer("누구에게 한 잔 줄까요?", others) : hiOther();
k = await hoeForcedTarget(i, k, "한 잔 받아", 3);
await hoeDrinkFromHand(k, 2, "한 잔 받아");
} else if (c.sp === "treat") {
const sul = P(i).hand.filter((x) => x.t === "S");
if (!sul.length || !others.length) { log("쏠 술이 없다", "sys"); return; }
const s = human(i) ? await askCard("쏠 술 1장을 고르세요", (x) => x.t === "S") : sul.reduce((a, b) => (b.v > a.v ? b : a));
takeCard(i, s);
let k = human(i) ? await askPlayer(`누구에게 ${s.name}을 쏠까요?`, others) : hiOther();
k = await hoeForcedTarget(i, k, "오늘 내가 쏜다", s.v);
discard(s);
addGas(k, s.v, `${s.name} 받아 마심`);
addGas(i, 1, "쏜 사람도 한 모금");
} else if (c.sp === "round2") {
const passed = [];
for (let k = 0; k < S.n; k++) {
const h = P(k).hand;
if (!h.length || P(k).away) { passed.push(null); continue; }
let g;
if (human(k)) g = await askCard("2차! 왼쪽 사람에게 넘길 카드 1장", () => true);
else { const s = h.filter((x) => x.t === "S"); g = s.length ? s.reduce((a, b) => (b.v > a.v ? b : a)) : h[0]; }
takeCard(k, g); passed.push(g);
}
passed.forEach((g, k) => { if (g) P((k + 1) % S.n).hand.push(g); });
log("모두 손패 1장을 왼쪽으로 넘겼다", "sys");
}
await sleep(500);
}
function hoeAiAction(i) {
const h = P(i).hand, g = P(i).gas;
const by = (sp) => h.find((c) => c.sp === sp);
const others = [...Array(S.n).keys()].filter((k) => k !== i && !P(k).away);
const hi = others.length ? others.reduce((a, b) => (P(b).gas > P(a).gas ? b : a)) : null;
if (g >= 13 && by("toilet")) return by("toilet");
if (g >= 12 && by("water")) return by("water");
if (by("treat") && hi !== null && P(hi).gas >= 12 && h.some((c) => c.t === "S")) return by("treat");
if (by("pour") && hi !== null && P(hi).gas >= 12) return by("pour");
if (by("cheers") && others.length && g + 2 <= Math.min(...others.map((k) => P(k).gas))) return by("cheers");
if (by("mood")) { const low = [...Array(S.n).keys()].reduce((a, b) => (P(b).gas < P(a).gas ? b : a)); if (low !== i) return by("mood"); }
if (by("round2") && h.some((c) => c.t === "S" && c.v >= 4)) return by("round2");
return null;
}
async function hoeTurn(i) {
const p = P(i);
if (p.away) { p.away = false; log(`${sbj(i)} 화장실에서 돌아왔다`, "sys"); }
await missedPenalty();
const sul = p.hand.filter((c) => c.t === "S");
let drank = false;
if (sul.length) {
let cover, hidden;
if (human(i)) {
await coach("cover", "내 차례예요! 술 1장을 잔에 내야 해요 (앞면으로 마셔요). 가장 약한 술을 내는 게 보통이에요.");
cover = await askCard("잔에 낼 술 1장을 고르세요 (앞면으로 마신다)", (c) => c.t === "S", { hint: S.tutorial ? sul.reduce((a, b) => (b.v < a.v ? b : a)) : null });
takeCard(i, cover);
const rest = p.hand.filter((c) => c.t === "S");
if (rest.length) await coach("hide", `여기가 회식판의 핵심! 손에 남은 술(${rest.map((c) => c.name).join(", ")})은 이번 턴에 전부 마셔야 해요. 대신 최대 2장을 잔 밑으로 몰래 흘릴 수 있어요. 센 술을 골라 흘려 보세요. 들키면 숨긴 술을 전부 마셔요.`);
hidden = await askCards("잔 밑으로 몰래 흘릴 카드를 최대 2장 고르세요. 숨기지 않은 술은 이번 턴에 전부 마셔요", () => true, 2,
{ hint: S.tutorial && rest.length ? rest.reduce((a, b) => (b.v > a.v ? b : a)) : null });
} else {
cover = sul.reduce((a, b) => (b.v < a.v ? b : a));
takeCard(i, cover);
hidden = hoeAiHide(i, p.hand);
}
for (const c of hidden) takeCard(i, c);
if (hidden.length) { S.stats.hide++; S.stats.hidden += hidden.length; }
S.stackBack = hidden.length;
S.tell = human(i) ? "" : tellFor(hidden);
discard(cover);
await fly(i, cover, "잔에 냈다");
addGas(i, cover.v, cover.name);
drank = true;
const rest = p.hand.filter((c) => c.t === "S");
for (const c of rest) { takeCard(i, c); discard(c); await fly(i, c, "마저 마셨다"); addGas(i, c.v, `${c.name}도`); }
if (human(i) && hidden.length) log(`(몰래 잔 밑에 숨김: ${hidden.map((c) => c.name).join(", ")})`, "sys");
await sleep(500);
await hoeSuspicion(i, hidden);
hidden.forEach(discard);
S.stackBack = 0; S.tell = "";
await check();
} else log(`${nm(i)}: 마실 술이 없다 (이번 턴은 흘리기도 못 한다)`, "sys");
if (drank && p.hand.some((c) => c.t === "J")) {
let a;
if (human(i)) { await coach("anju", "술을 마신 턴에만 안주 1장을 먹을 수 있어요. 안주는 가스를 낮춰요."); a = await askCard("안주 1장을 먹을 수 있어요", (c) => c.t === "J", { optional: true, skip: "안 먹기" }); }
else a = p.hand.filter((c) => c.t === "J").reduce((a, b) => (b.v < a.v ? b : a));
if (a) { takeCard(i, a); discard(a); await fly(i, a, "안주를 먹었다"); addGas(i, a.v, `안주 ${a.name}`); }
}
let act = null;
if (human(i)) { if (p.hand.some(hoeOwnTurnAction)) act = await askCard("행동 카드 1장을 쓸 수 있어요", hoeOwnTurnAction, { optional: true, skip: "턴 끝내기" }); }
else act = hoeAiAction(i);
if (act) { takeCard(i, act); await hoeAction(i, act); }
await check();
p.hand.push(draw(), draw());
while (p.hand.length > 8) {
const c = human(i)
? await askCard("손패가 8장을 넘었어요. 버릴 카드 1장 (술이면 마셔요)", () => true)
: p.hand.filter((x) => x.t !== "S").sort((a, b) => b.v - a.v)[0] || p.hand.reduce((a, b) => (b.v < a.v ? b : a));
takeCard(i, c); discard(c);
if (c.t === "S") addGas(i, c.v, `버리려던 ${c.name}`);
else log(`${nm(i)}: ${c.name} 버림`, "sys");
}
await check();
}
