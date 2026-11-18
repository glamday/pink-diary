'use strict';
/* Щоденник: «Сьогодні», «Планер», «Прогрес», «Ще». Працює поверх коду нотаток з index.html. */

Object.assign(I, {
  cal: '<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/>',
  chart: '<path d="M5 20v-8M12 20V5M19 20v-5"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>',
  music: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
  right: '<path d="m9 5 7 7-7 7"/>',
  ok: '<path d="m5 12.5 4.5 4.5L19 7.5"/>'
});

/* ================= data ================= */
const LDEF = () => ({ tasks: [], mood: {}, water: {}, habits: [], habitLog: {}, grat: {}, joys: [], capsules: [], dreams: [], goals: [], cycle: { starts: [], len: 28, period: 5 }, visits: {}, seen: {} });
const isDate = k => typeof k === 'string' && /^\d{4}-\d\d-\d\d$/.test(k);
function normLife(o) {
  const d = LDEF();
  if (!o || typeof o !== 'object') return d;
  for (const k in d) {
    const v = o[k];
    if (Array.isArray(d[k])) { if (Array.isArray(v)) d[k] = v.filter(x => x && typeof x === 'object'); }
    else if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(d[k], v);
  }
  d.tasks = d.tasks.filter(t => isDate(t.date)).map(t => ({ id: String(t.id || uid()), date: t.date, text: String(t.text || '').slice(0, 120), cat: String(t.cat || 'personal'), done: !!t.done }));
  d.habits = d.habits.map(h => ({ id: String(h.id || uid()), name: String(h.name || '').slice(0, 40), emoji: String(h.emoji || '🌱').slice(0, 8) }));
  d.joys = d.joys.map(j => ({ id: String(j.id || uid()), text: String(j.text || '').slice(0, 300), date: isDate(j.date) ? j.date : dkey() }));
  d.capsules = d.capsules.filter(c => isDate(c.open)).map(c => ({ id: String(c.id || uid()), text: String(c.text || '').slice(0, 4000), created: isDate(c.created) ? c.created : dkey(), open: c.open, opened: !!c.opened }));
  d.dreams = d.dreams.map(x => ({ id: String(x.id || uid()), text: String(x.text || '').slice(0, 120), done: !!x.done, doneAt: isDate(x.doneAt) ? x.doneAt : '' }));
  d.goals = d.goals.map(g => ({ id: String(g.id || uid()), text: String(g.text || '').slice(0, 80), per: g.per === 'month' ? 'month' : 'year', key: String(g.key || ''), target: Math.max(1, Math.min(9999, +g.target || 1)), count: Math.max(0, +g.count || 0) }));
  d.cycle.starts = Array.isArray(d.cycle.starts) ? d.cycle.starts.filter(isDate) : [];
  for (const k in d.habitLog) if (!Array.isArray(d.habitLog[k])) delete d.habitLog[k];
  for (const k in d.grat) if (!Array.isArray(d.grat[k])) delete d.grat[k];
  return d;
}
const pad = n => String(n).padStart(2, '0');
const dkey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dparse = k => { const [y, m, d] = String(k).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const addDays = (k, n) => { const d = dparse(k); d.setDate(d.getDate() + n); return dkey(d); };
const diff = (a, b) => Math.round((dparse(b) - dparse(a)) / 864e5);
const dayIdx = k => { const d = dparse(k); return Math.floor((d.getTime() - d.getTimezoneOffset() * 6e4) / 864e5); };
const fD = (k, o) => dparse(k).toLocaleDateString('uk-UA', o);
const wd = k => fD(k, { weekday: 'short' }).slice(0, 2);

let L = normLife((() => { try { return JSON.parse(localStorage.getItem('notatky.life')); } catch (e) { return null; } })());
const saveL = () => { try { localStorage.setItem('notatky.life', JSON.stringify(L)); } catch (e) { toast('Не вдалося зберегти: бракує місця'); } };
function lifeData() { return L; }
function lifeImport(life, prefs) {
  if (life) { L = normLife(life); L.visits[dkey()] = 1; saveL(); }
  if (prefs && typeof prefs === 'object') {
    if (typeof prefs.name === 'string') cfg.name = prefs.name.slice(0, 24);
    if (+prefs.waterGoal) cfg.waterGoal = Math.max(1, Math.min(20, Math.round(+prefs.waterGoal)));
    if (isDate(prefs.birthday)) cfg.birthday = prefs.birthday;
    saveCfg();
  }
  lifeRefresh();
}

const CATS = { personal: ['Особисте', '#e56b8f'], work: ['Робота', '#3d9be9'], home: ['Дім', '#d9a21b'], health: ['Здоровʼя', '#3fae82'], study: ['Навчання', '#8f7ae5'] };
const cat = k => CATS[k] || CATS.personal;
const MOODS = [['great', '😍', 'Чудово'], ['good', '🙂', 'Добре'], ['ok', '😐', 'Так собі'], ['tired', '😴', 'Втома'], ['sad', '😢', 'Сумно']];
const moodOf = k => MOODS.find(m => m[0] === L.mood[k]);
const DAYCOL = [['пудровий рожевий', '#f4b6c2'], ['лавандовий', '#b79cf2'], ['мʼятний', '#7ed6a5'], ['небесний', '#7cc4f5'], ['персиковий', '#ffb86b'], ['сонячний жовтий', '#f5d547'], ['кораловий', '#ff7f6e'], ['бузковий', '#c8a2e8'], ['смарагдовий', '#2fa67a'], ['молочний', '#f6efe4'], ['вишневий', '#b3274c'], ['бірюзовий', '#3cc6c0']];
const SUPPORT = ['Сумувати — нормально. Тобі не треба нічого виправляти просто зараз.', 'Цей день мине, а ти залишишся — і тобі стане легше.', 'Ти не одна. Тебе люблять навіть у найсіріші дні.', 'Дозволь собі бути не в настрої. Це теж частина життя.', 'Обійми себе подумки. Ти робиш усе, що можеш.', 'Навіть після найдовшого дощу виходить сонце.', 'Сьогодні досить просто бути. Решта зачекає.', 'Твої почуття важливі. Дай їм трохи часу й тепла.'];
/* Тексти дня складаються з двох речень. Списки мають 46 і 45 рядків (взаємно прості числа),
   тому пара не повторюється 46 × 45 = 2070 днів, тобто понад п'ять років. */
PRED.push('Сьогодні хтось зробить тобі комплімент, який запамʼятається.', 'На тебе чекає день без поспіху, навіть якщо справ багато.', 'Сьогодні знайдеться те, що давно загубилося, — річ або відповідь.', 'Хтось сьогодні згадає про тебе й усміхнеться.', 'Сьогодні тобі вдасться зробити когось щасливішим.', 'Вечір приготував для тебе щось затишне.');
MOTIV.push('Сьогодні ти зробила більше, ніж тобі здається.', 'Цей день уже позаду, і ти пройшла його гідно.', 'Навіть маленький крок сьогодні — це рух уперед.', 'Ти заслужила цей вечір і цей спокій.', 'Те, що ти сьогодні не здалася, важить багато.', 'Сьогодні ти була собою — і це найкраще, що можна зробити.');
const PRED_B = ['Просто будь собою — цього достатньо.', 'Усміхнись дзеркалу перед виходом.', 'Не поспішай: усе найкраще приходить вчасно.', 'Зверни увагу на дрібниці — у них сьогодні магія.', 'Візьми з собою гарний настрій.', 'Дозволь собі трохи більше, ніж зазвичай.', 'Скажи «так» тому, що тебе тішить.', 'Це твій день, навіть якщо він здається звичайним.', 'Довіряй собі.', 'Залиш місце для приємних несподіванок.', 'Одягни те, у чому почуваєшся найкраще.', 'Почни з маленького кроку.', 'Не забудь про улюблену каву чи чай.', 'Всесвіт сьогодні на твоєму боці.', 'Прислухайся до серця — воно знає дорогу.', 'Будь ніжною до себе.', 'Сміливіше, у тебе все вийде.', 'Зроби сьогодні щось лише для себе.', 'Подаруй комусь добре слово — воно повернеться.', 'Тримай голову високо.', 'Хай сьогодні буде більше сміху.', 'Запиши це, щоб увечері перевірити.', 'Ти заслуговуєш на все найкраще.', 'Відчини вікно і вдихни цей день.', 'Не відкладай радість на потім.', 'Сьогодні можна мріяти вголос.', 'Іди туди, де тобі тепло.', 'Подивись на небо хоча б раз.', 'Нехай ніщо не зіпсує тобі настрій.', 'Увімкни дорогою улюблену пісню.', 'Ти готова до цього дня більше, ніж думаєш.', 'Дякуй собі за кожен крок.', 'Обери сьогодні легкість.', 'Не бійся просити про те, чого хочеш.', 'Гарні речі люблять тих, хто на них чекає.', 'Залишайся такою ж світлою.', 'Сьогодні варто довіритися випадку.', 'Нехай цей день буде добрим до тебе.', 'Зроби паузу й помилуйся моментом.', 'Твоя усмішка — найкраща прикраса дня.', 'Памʼятай: ти чиєсь диво.', 'Почни день із доброї думки про себе.', 'Будь там, де тебе цінують.', 'Усе складається на твою користь.', 'І памʼятай: тебе дуже люблять.'];
const MOTIV_B = ['Відпочинь, завтра буде новий день.', 'Тепер час подбати про себе.', 'Обійми себе подумки й видихни.', 'Нехай сон буде міцним і солодким.', 'Завтра ти прокинешся трішки сильнішою.', 'Відклади телефон і побудь у тиші.', 'Завари чай і нікуди не поспішай.', 'Усе важливе зачекає до ранку.', 'Ти на правильному шляху.', 'Пишайся собою хоча б хвилинку.', 'Дозволь собі сьогодні нічого не вирішувати.', 'Завтра все здасться простішим.', 'Залиш тривоги за дверима спальні.', 'Згадай одну мить, яка сьогодні потішила.', 'Ти достатня — саме така, як є.', 'Нехай ця ніч поверне тобі сили.', 'Усміхнись: день прожито недарма.', 'Ранок принесе нові можливості.', 'Будь до себе лагідною.', 'Тебе люблять — із цим і засинай.', 'Вимкни світло й відпусти цей день.', 'Завтра буде шанс спробувати ще раз.', 'Подякуй собі за сьогодні.', 'Нехай тобі насняться твої мрії.', 'Твій спокій зараз важливіший за справи.', 'Дихай повільно — все гаразд.', 'Ти робиш більше, ніж сама помічаєш.', 'Сьогодні можна просто відпочити.', 'Добрі сни вже чекають на тебе.', 'Маленькі кроки теж ведуть до великих мрій.', 'Залиш завтрашнє на завтра.', 'Ти не мусиш усе встигати.', 'Тепла ковдра й спокійне серце — саме те, що треба.', 'Завтра ти знову засяєш.', 'Ти важлива для цього світу.', 'Хай вечір буде тихим і добрим.', 'Ти вже перемогла, бо не зупинилась.', 'Відпусти те, на що не можеш вплинути.', 'Нехай завтра почнеться з усмішки.', 'Твоє серце заслуговує на відпочинок.', 'Усе твоє обовʼязково до тебе прийде.', 'Засинай із думкою про хороше.', 'Ти сильніша, ніж учора.', 'Завтра буде трохи легше.', 'Солодких снів, сонечко.'];
const predText = di => PRED[(di * 5 + 3) % PRED.length] + ' ' + PRED_B[(di * 7 + 2) % PRED_B.length];
const motivText = di => MOTIV[(di * 5 + 3) % MOTIV.length] + ' ' + MOTIV_B[(di * 7 + 2) % MOTIV_B.length];
const HEMO = ['🌱', '📖', '🏃‍♀️', '🧘‍♀️', '🥗', '😴', '💊', '🧴', '✍️', '🎨', '🚶‍♀️', '🦷'];
const STARS = [[14, 62, 14, 0], [30, 84, 9, 1.1], [62, 92, 12, .5], [80, 70, 8, 1.8], [8, 40, 7, 2.3]].map(([t, l, s, dl]) => `<i class="st" style="top:${t}%;left:${l}%;width:${s}px;height:${s}px;animation-delay:${dl}s">${ico('spark')}</i>`).join('');

const wgoal = () => Math.max(1, Math.min(20, +cfg.waterGoal || 8));
const tasksOf = k => L.tasks.filter(t => t.date === k);
const pct = k => { const a = tasksOf(k); return a.length ? Math.round(a.filter(t => t.done).length / a.length * 100) : null; };
const hlog = k => Array.isArray(L.habitLog[k]) ? L.habitLog[k] : [];
const hdone = (id, k) => hlog(k).includes(id);
const gratHas = k => Array.isArray(L.grat[k]) && L.grat[k].some(x => x && String(x).trim());
function streak() { let n = 0, k = dkey(); while (L.visits[k]) { n++; k = addDays(k, -1); } return n; }
function bestStreak() { const ks = Object.keys(L.visits).filter(isDate).sort(); let best = 0, run = 0, prev = ''; ks.forEach(k => { run = prev && diff(prev, k) === 1 ? run + 1 : 1; best = Math.max(best, run); prev = k; }); return best; }
function hstreak(id) { let k = dkey(), n = 0; if (!hdone(id, k)) k = addDays(k, -1); while (hdone(id, k)) { n++; k = addDays(k, -1); } return n; }
const tile = (v, l) => `<div class="tile"><b>${v}</b><span>${l}</span></div>`;
const head = (emo, title, meta = '') => `<div class="c-head"><i class="c-ico">${emo}</i><h2>${title}</h2>${meta ? `<span>${meta}</span>` : ''}</div>`;

/* ================= in-place DOM patching ================= */
// Замість заміни всього екрана змінюємо лише те, що відрізняється: вузли лишаються на місці,
// тож анімація появи не програється заново, а CSS-переходи (смужки, кільце, галочки) йдуть плавно.
const keyOf = n => (n.nodeType === 1 ? n.getAttribute('data-id') || n.getAttribute('data-key') || '' : '');
const alike = (a, b) => a.nodeType === b.nodeType && (a.nodeType !== 1 || (a.tagName === b.tagName && keyOf(a) === keyOf(b)));
function patchNode(x, y) {
  if (x.nodeType !== 1) { if (x.nodeValue !== y.nodeValue) x.nodeValue = y.nodeValue; return; }
  for (const at of [...x.attributes]) if (!y.hasAttribute(at.name)) x.removeAttribute(at.name);
  for (const at of [...y.attributes]) if (x.getAttribute(at.name) !== at.value) { x.setAttribute(at.name, at.value); if (at.name === 'value' && 'value' in x && x.value !== at.value) x.value = at.value; }
  // Текст, який людина набирає в полі, не чіпаємо; оновлюємо лише поле з готовим кодом.
  if (x.tagName === 'TEXTAREA') { if (x.readOnly) x.value = y.value; return; }
  patchKids(x, y);
}
function patchKids(a, b) {
  let x = a.firstChild, y = b.firstChild;
  while (y) {
    const ny = y.nextSibling;
    if (x && alike(x, y)) { patchNode(x, y); x = x.nextSibling; }
    else {
      let found = null;
      if (x && keyOf(y)) for (let m = x.nextSibling; m; m = m.nextSibling) if (alike(m, y)) { found = m; break; }
      if (found) { while (x !== found) { const nx = x.nextSibling; a.removeChild(x); x = nx; } patchNode(x, y); x = x.nextSibling; }
      else a.insertBefore(y, x);
    }
    y = ny;
  }
  while (x) { const nx = x.nextSibling; a.removeChild(x); x = nx; }
}
function morph(root, html) { const t = document.createElement('template'); t.innerHTML = html; patchKids(root, t.content); }

/* ================= tabs ================= */
const TABS = [['today', 'sun', 'Сьогодні'], ['plan', 'cal', 'Планер'], ['stats', 'chart', 'Прогрес'], ['notes', 'edit', 'Нотатки'], ['more', 'grid', 'Ще']];
let TAB = 'today', PAGE = null;
function go(t) {
  TAB = t;
  $$('#app>.tab').forEach(e => e.classList.toggle('on', e.dataset.tab === t));
  $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
  draw();
  const pg = $(`#app>.tab[data-tab="${t}"] .pg`);
  if (pg) { pg.classList.remove('enter'); void pg.offsetWidth; pg.classList.add('enter'); pg.parentNode.scrollTop = 0; }
  if (t === 'notes') render(true);
}
function draw() { ({ today: drawToday, plan: drawPlan, stats: drawStats, more: drawMore })[TAB]?.(); }
function lifeRefresh() { draw(); if (PAGE) drawPage(); }

/* ================= today ================= */
function taskRow(t) {
  const c = cat(t.cat);
  return `<li class="task${t.done ? ' done' : ''}" data-id="${esc(t.id)}"><button class="chk" data-a="t-toggle" aria-label="Виконано">${ico('ok')}</button><div class="t-main"><span>${esc(t.text)}</span><em style="--k:${c[1]}">${c[0]}</em></div><button class="t-x" data-a="t-del" aria-label="Видалити">${ico('x')}</button></li>`;
}
function ring(p) {
  const c = 2 * Math.PI * 44;
  return `<svg viewBox="0 0 100 100" class="ring"><circle cx="50" cy="50" r="44" class="r0"/><circle cx="50" cy="50" r="44" class="r1" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - p / 100)).toFixed(1)}" transform="rotate(-90 50 50)"/></svg>`;
}
function drawToday() {
  const k = dkey(), h = new Date().getHours(), ts = tasksOf(k), dn = ts.filter(t => t.done).length, p = ts.length ? Math.round(dn / ts.length * 100) : 0;
  const goal = wgoal(), w = Math.min(L.water[k] | 0, goal), di = dayIdx(k), st = streak();
  const g = h < 5 ? 'Доброї ночі' : h < 12 ? 'Доброго ранку' : h < 18 ? 'Добрий день' : 'Добрий вечір';
  const doy = Math.round((dparse(k) - new Date(dparse(k).getFullYear(), 0, 0)) / 864e5);
  let o = `<header class="t-head"><div><p class="t-date">${fD(k, { weekday: 'long', day: 'numeric', month: 'long' })}</p><h1>${g}${cfg.name ? ', ' + esc(cfg.name) : ''}</h1></div><button class="rb${Sea.on ? ' on' : ''}" data-a="sea" aria-label="Звуки моря">${ico('music')}</button><button class="rb" data-a="settings" aria-label="Налаштування">${ico('set')}</button></header>`;

  if (isDate(cfg.birthday) && cfg.birthday.slice(5) === k.slice(5)) o += `<div class="banner" data-key="bday"><i>🎂</i><div><b>З днем народження${cfg.name ? ', ' + esc(cfg.name) : ''}!</b><span>Нехай цей рік буде найщасливішим. Сьогодні твій день.</span></div></div>`;
  const ready = L.capsules.filter(c => !c.opened && c.open <= k);
  if (ready.length) o += `<button class="banner" data-a="cap-read" data-id="${esc(ready[0].id)}"><i>💌</i><div><b>Відкрився лист із капсули часу</b><span>Ти написала його ${fD(ready[0].created, { day: 'numeric', month: 'long', year: 'numeric' })}. Торкнись, щоб прочитати.</span></div></button>`;
  if (codeDue()) o += `<button class="banner" data-key="code" data-a="code-share"><i>🔑</i><div><b>Онови код відновлення</b><span>Збережи свіжий код у Нотатки — це два дотики. Він знадобиться, якщо застосунок зникне.</span></div></button>`;

  o += `<section class="box hero" data-key="hero"><div class="ringw">${ring(p)}<div><b>${p}%</b><span>справ за день</span></div></div><div class="stats4"><div><b>${dn}/${ts.length}</b><span>справи</span></div><div><b>🔥 ${st}</b><span>${pl(st, ['день поспіль', 'дні поспіль', 'днів поспіль'])}</span></div><div><b>💧 ${w}/${goal}</b><span>вода</span></div><div><b>${doy}</b><span>день року</span></div></div></section>`;

  const col = DAYCOL[(di * 5 + 1) % DAYCOL.length], num = (di * 13 + 7) % 99 + 1;
  o += `<section data-key="pred" class="daily morn${L.seen.pred === k ? '' : ' closed'}">${STARS}<div class="d-top">${ico('sun')}<b>Передбачення дня</b><span>${fD(k, { day: 'numeric', month: 'long' })}</span></div><p class="d-text">${esc(predText(di))}</p><div class="d-act"><span class="pl"><i style="background:${col[1]}"></i>Колір дня: ${col[0]}</span><span class="pl">Щасливе число: ${num}</span></div><button class="d-open" data-a="pred-open"><span>${ico('spark')}Відкрити передбачення</span></button></section>`;

  o += `<section class="box">${head('✅', 'Справи на сьогодні', ts.length ? `${dn} з ${ts.length}` : '')}${ts.length ? `<div class="bar" data-key="bar"><i style="width:${p}%"></i></div><ul class="tasks" data-key="list">${ts.map(taskRow).join('')}</ul>` : '<p class="none" data-key="none">Поки що порожньо. Додай першу справу на сьогодні.</p>'}<form class="quick" data-key="form" data-f="task" data-date="${k}" data-cat="personal"><input name="t" placeholder="Нова справа…" maxlength="120" autocomplete="off" enterkeyhint="done"><button aria-label="Додати">${ico('plus')}</button></form></section>`;

  const md = L.mood[k];
  o += `<section class="box">${head('💭', 'Настрій дня')}<div class="moods">${MOODS.map(m => `<button class="${md === m[0] ? 'on' : ''}" data-a="mood" data-v="${m[0]}"><b>${m[1]}</b>${m[2]}</button>`).join('')}</div>${md === 'sad' ? `<div class="support"><p>${SUPPORT[di % SUPPORT.length]}</p><div class="btnrow"><button class="pillb pri" data-a="breath">Подихати разом</button><button class="pillb" data-a="joy-rand">Відкрити банку радості</button></div></div>` : ''}</section>`;

  o += photoCard(k);

  o += `<section class="box">${head('💧', 'Вода', `${w} з ${goal} склянок`)}<div class="glasses">${Array.from({ length: goal }, (_, i) => `<button class="${i < w ? 'on' : ''}" data-a="water" data-i="${i}" aria-label="Склянка ${i + 1}"><svg viewBox="0 0 24 30"><path d="M4 3h16l-2 24H6z"/></svg></button>`).join('')}</div></section>`;

  const hd = L.habits.filter(x => hdone(x.id, k)).length;
  o += `<section class="box">${head('🌱', 'Звички', L.habits.length ? `${hd} з ${L.habits.length}` : '')}${L.habits.length ? `<div class="hchips">${L.habits.map(x => `<button class="${hdone(x.id, k) ? 'on' : ''}" data-a="habit" data-id="${esc(x.id)}">${esc(x.emoji)} ${esc(x.name)}</button>`).join('')}</div>` : `<p class="none" data-key="none">Звичок ще немає.</p><button class="ghost" data-a="page" data-p="habits">Додати першу звичку</button>`}</section>`;

  if (h >= 18) {
    const gr = Array.isArray(L.grat[k]) ? L.grat[k] : [];
    o += `<section data-key="eve" class="daily eve${L.seen.motiv === k ? '' : ' closed'}">${STARS}<div class="d-top">${ico('moon')}<b>Мотивація на вечір</b><span>${fD(k, { day: 'numeric', month: 'long' })}</span></div><p class="d-text">${esc(motivText(di))}</p><button class="d-open" data-a="motiv-open"><span>${ico('spark')}Відкрити мотивацію</span></button></section>`;
    o += `<section class="box">${head('🙏', 'За що я вдячна сьогодні')}${[0, 1, 2].map(i => `<input class="inp" data-g="${i}" value="${esc(gr[i] || '')}" placeholder="${i + 1}. Я вдячна за…" maxlength="120" autocomplete="off">`).join('')}</section>`;
  } else {
    o += `<section class="box locked" data-key="locked"><i class="c-ico">🌙</i><div><b>Вечірня мотивація</b><span>Відкриється о 18:00 разом із трьома полями вдячності</span></div></section>`;
  }
  morph($('#pgToday'), o);
}

/* ================= planner ================= */
const P = { sel: dkey(), cat: 'personal' };
const monday = k => addDays(k, -((dparse(k).getDay() + 6) % 7));
function drawPlan() {
  const t = dkey(), ws = monday(P.sel), ts = tasksOf(P.sel), dn = ts.filter(x => x.done).length, p = ts.length ? Math.round(dn / ts.length * 100) : 0;
  let o = `<header class="p-head"><h1>Планер</h1><button class="rb" data-a="wk-prev" aria-label="Попередній тиждень">${ico('back')}</button><button class="pillb" data-a="wk-today">Сьогодні</button><button class="rb" data-a="wk-next" aria-label="Наступний тиждень">${ico('right')}</button></header>`;
  o += `<div class="week">${Array.from({ length: 7 }, (_, i) => { const k = addDays(ws, i), pc = pct(k); return `<button class="${k === P.sel ? 'on' : ''}${k === t ? ' today' : ''}" data-a="day" data-k="${k}">${wd(k)}<b>${dparse(k).getDate()}</b><i><u style="width:${pc || 0}%"></u></i></button>`; }).join('')}</div>`;
  o += `<section class="box">${head('🗓️', (P.sel === t ? 'Сьогодні, ' : '') + fD(P.sel, { weekday: P.sel === t ? undefined : 'long', day: 'numeric', month: 'long' }), ts.length ? p + '%' : '')}${ts.length ? `<div class="bar" data-key="bar"><i style="width:${p}%"></i></div><ul class="tasks" data-key="list">${ts.map(taskRow).join('')}</ul>` : '<p class="none" data-key="none">На цей день справ немає.</p>'}<div class="cats" data-key="cats">${Object.keys(CATS).map(c => `<button class="${P.cat === c ? 'on' : ''}" style="--k:${CATS[c][1]}" data-a="pcat" data-v="${c}">${CATS[c][0]}</button>`).join('')}</div><form class="quick" data-key="form" data-f="task" data-date="${P.sel}" data-cat="${P.cat}"><input name="t" placeholder="Нова справа…" maxlength="120" autocomplete="off" enterkeyhint="done"><button aria-label="Додати">${ico('plus')}</button></form>${ts.some(x => !x.done) ? '<button class="ghost" data-key="carry" data-a="carry">Перенести незроблене на завтра</button>' : ''}</section>`;
  morph($('#pgPlan'), o);
}

/* ================= progress ================= */
const SM = { y: new Date().getFullYear(), m: new Date().getMonth() };
function statsFor(pre) {
  const ks = o => Object.keys(o).filter(k => k.startsWith(pre));
  const ts = L.tasks.filter(t => t.date.startsWith(pre)), done = ts.filter(t => t.done).length, moods = {};
  ks(L.mood).forEach(k => { moods[L.mood[k]] = (moods[L.mood[k]] || 0) + 1; });
  const top = Object.keys(moods).sort((a, b) => moods[b] - moods[a])[0];
  return { total: ts.length, done, pct: ts.length ? Math.round(done / ts.length * 100) : 0, water: ks(L.water).reduce((s, k) => s + (L.water[k] | 0), 0), habits: ks(L.habitLog).reduce((s, k) => s + hlog(k).length, 0), grat: ks(L.grat).filter(gratHas).length, joys: L.joys.filter(j => j.date.startsWith(pre)).length, dreams: L.dreams.filter(d => d.done && d.doneAt.startsWith(pre)).length, photos: phCount(pre), mood: MOODS.find(m => m[0] === top) };
}
function achievements() {
  const best = bestStreak(), td = L.tasks.filter(t => t.done).length, goal = wgoal(), wdn = Object.values(L.water).filter(v => v >= goal).length, gd = Object.keys(L.grat).filter(gratHas).length;
  return [['🔥', '3 дні поспіль', best, 3], ['⚡', 'Тиждень поспіль', best, 7], ['🏆', '30 днів поспіль', best, 30], ['✅', '10 виконаних справ', td, 10], ['💪', '50 виконаних справ', td, 50], ['👑', '200 виконаних справ', td, 200], ['💧', '7 днів із нормою води', wdn, 7], ['🌊', '30 днів із нормою води', wdn, 30], ['🙏', '7 днів вдячності', gd, 7], ['💖', '30 днів вдячності', gd, 30]];
}
const WDH = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
function monthGrid(y, m, cell) {
  const off = (new Date(y, m, 1).getDay() + 6) % 7, n = new Date(y, m + 1, 0).getDate();
  return `<div class="calh">${WDH.map(x => `<span>${x}</span>`).join('')}</div><div class="cal">${'<div class="x"></div>'.repeat(off)}${Array.from({ length: n }, (_, i) => cell(`${y}-${pad(m + 1)}-${pad(i + 1)}`, i + 1)).join('')}</div>`;
}
const monthName = (y, m) => { const s = new Date(y, m, 1).toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' }); return s[0].toUpperCase() + s.slice(1); };
function drawStats() {
  const t = dkey();
  let o = `<header class="p-head"><h1>Прогрес</h1></header>`;
  o += `<section class="box">${head('📈', 'Останні 7 днів', 'виконання справ')}<div class="chart">${Array.from({ length: 7 }, (_, i) => { const k = addDays(t, i - 6), pc = pct(k); return `<div class="${k === t ? 'now' : ''}"><b>${pc === null ? '–' : pc + '%'}</b><u style="height:${pc ? Math.max(6, pc) : 0}%"></u>${wd(k)}</div>`; }).join('')}</div></section>`;
  o += `<section class="box"><div class="c-head"><i class="c-ico">🗓️</i><h2>${monthName(SM.y, SM.m)}</h2><div class="calnav"><button class="t-x" data-a="m-prev" aria-label="Попередній місяць">${ico('back')}</button><button class="t-x" data-a="m-next" aria-label="Наступний місяць">${ico('right')}</button></div></div>${monthGrid(SM.y, SM.m, (k, d) => { const pc = pct(k), md = moodOf(k), mix = pc === null ? 0 : Math.round(16 + pc * .84); return `<div class="${k === t ? 'now' : ''}${k > t ? ' fut' : ''}" style="${pc === null ? '' : `background:color-mix(in srgb,var(--acc) ${mix}%,var(--surface2));${mix > 55 ? 'color:#fff' : ''}`}">${d}${md ? `<small>${md[1]}</small>` : ''}</div>`; })}<div class="legend"><span><i style="background:var(--surface2)"></i>без справ</span><span><i style="background:color-mix(in srgb,var(--acc) 40%,var(--surface2))"></i>частково</span><span><i style="background:var(--acc)"></i>усе зроблено</span><span>🙂 настрій дня</span></div></section>`;
  const s = statsFor(`${SM.y}-${pad(SM.m + 1)}`);
  o += `<section class="box">${head('📊', 'Статистика місяця')}<div class="tiles">${tile(s.done, 'справ зроблено')}${tile(s.pct + '%', 'виконання')}${tile(s.water, 'склянок води')}${tile(s.habits, 'відміток звичок')}${tile(s.grat, 'днів вдячності')}${tile(s.mood ? s.mood[1] + ' ' + s.mood[2] : '—', 'частий настрій')}</div></section>`;
  const ac = achievements(), got = ac.filter(a => a[2] >= a[3]).length;
  o += `<section class="box">${head('🏅', 'Досягнення', `${got} з ${ac.length}`)}${ac.map(([e, n, v, need]) => `<div class="ach ${v >= need ? 'got' : 'off'}"><i>${e}</i><div><b>${n}</b><span>${v >= need ? 'Отримано' : `Ще ${need - v}`}</span></div><em>${Math.min(v, need)}/${need}</em></div>`).join('')}</section>`;
  morph($('#pgStats'), o);
}

/* ================= more ================= */
function drawMore() {
  const items = [['photos', '📸', 'Фото дня', `${PH.size} фото`], ['habits', '🌱', 'Звички', `${L.habits.length} ${pl(L.habits.length, ['звичка', 'звички', 'звичок'])}`], ['goals', '🎯', 'Цілі', 'На рік і місяць'], ['joy', '🫙', 'Банка радості', `${L.joys.length} ${pl(L.joys.length, ['момент', 'моменти', 'моментів'])}`], ['capsule', '💌', 'Капсула часу', 'Лист собі в майбутнє'], ['dreams', '✨', 'Мрії', `${L.dreams.filter(d => d.done).length} з ${L.dreams.length} здійснилось`], ['cycle', '🌸', 'Цикл', 'Календар і прогноз'], ['summary', '📊', 'Підсумки', 'Місяць і рік'], ['backup', '☁️', 'Резервна копія', 'Зберегти й відновити'], ['settings', '⚙️', 'Налаштування', 'Імʼя, вода, вигляд']];
  morph($('#pgMore'), `<header class="p-head"><h1>Ще</h1></header><div class="more">${items.map(([p, e, n, s]) => `<button data-a="${p === 'settings' ? 'settings' : 'page'}" data-p="${p}"><i>${e}</i><b>${n}</b><span>${s}</span></button>`).join('')}</div>`);
}

/* ================= pages ================= */
const PT = { photos: 'Фото дня', habits: 'Звички', goals: 'Цілі', joy: 'Банка радості', capsule: 'Капсула часу', dreams: 'Мрії', cycle: 'Цикл', summary: 'Підсумки', backup: 'Резервна копія' };
let hemo = 0, GP = 'year', CP = 3, SP = 'month', BK = '';
const CM = { y: new Date().getFullYear(), m: new Date().getMonth() };
const gkey = () => GP === 'year' ? String(new Date().getFullYear()) : dkey().slice(0, 7);
const segs = (a, cur, list) => `<div class="seg" style="margin-bottom:14px">${list.map(([v, l]) => `<button data-a="${a}" data-v="${v}" class="${String(cur) === String(v) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
function openPage(p) { PAGE = p; BK = ''; $('#page').innerHTML = ''; drawPage(); const el = $('#page'); el.scrollTop = 0; el.classList.add('in'); history.pushState({ pg: 1 }, ''); }
function closePage() { if (!PAGE) return; PAGE = null; $('#page').classList.remove('in'); draw(); }
addEventListener('popstate', () => { if (PAGE && !cur) closePage(); });
function drawPage() {
  if (!PAGE) return;
  morph($('#page'), `<div class="pbar"><button class="ib" data-a="back" aria-label="Назад">${ico('back')}</button><h2>${PT[PAGE]}</h2></div><div class="pg">${PAGES[PAGE]()}</div>`);
}
function cycleInfo() {
  const s = [...new Set(L.cycle.starts)].sort(), t = dkey();
  if (!s.length) return null;
  let len = Math.max(18, Math.min(45, +L.cycle.len || 28));
  const ds = [];
  for (let i = 1; i < s.length; i++) { const d = diff(s[i - 1], s[i]); if (d >= 18 && d <= 45) ds.push(d); }
  if (ds.length) { const last = ds.slice(-6); len = Math.round(last.reduce((a, b) => a + b, 0) / last.length); }
  const last = s[s.length - 1], per = Math.max(1, Math.min(10, +L.cycle.period || 5));
  let next = addDays(last, len);
  const late = next < t ? diff(next, t) : 0;
  return { s, len, per, last, day: diff(last, t) + 1, next, late, ov: addDays(next, -14), measured: ds.length > 0 };
}
function cycleMark(k, c) {
  if (c.s.some(x => { const d = diff(x, k); return d >= 0 && d < c.per; })) return 'per';
  for (let n = 1; n <= 6; n++) {
    const st = addDays(c.last, c.len * n), d = diff(st, k), ov = addDays(st, -14), od = diff(ov, k);
    if (od === 0) return 'ovu';
    if (od >= -5 && od <= 1) return 'fer';
    if (d >= 0 && d < c.per) return 'perp';
  }
  return '';
}
const PAGES = {
  photos() { return photosPage(); },
  habits() {
    const t = dkey();
    return `<p class="lead">Маленькі щоденні кроки. Відмічай їх одним дотиком на вкладці «Сьогодні».</p><section class="box" style="padding-top:6px"><form class="quick" data-key="form" data-f="habit"><button type="button" class="emo" data-a="h-emoji" aria-label="Змінити значок">${HEMO[hemo]}</button><input name="t" placeholder="Нова звичка, напр. «Читати»" maxlength="40" autocomplete="off"><button aria-label="Додати">${ico('plus')}</button></form></section>` + L.habits.map(x => {
      const st = hstreak(x.id); let c30 = 0;
      for (let i = 0; i < 30; i++) if (hdone(x.id, addDays(t, -i))) c30++;
      return `<section class="box" data-id="${esc(x.id)}"><div class="c-head"><i class="c-ico">${esc(x.emoji)}</i><h2>${esc(x.name)}</h2><button class="t-x" data-a="h-del" aria-label="Видалити">${ico('trash')}</button></div><div class="h7">${Array.from({ length: 7 }, (_, i) => { const k = addDays(t, i - 6); return `<i class="${hdone(x.id, k) ? 'on' : ''}">${wd(k)}</i>`; }).join('')}</div><div class="tiles" style="margin-top:14px">${tile('🔥 ' + st, pl(st, ['день поспіль', 'дні поспіль', 'днів поспіль']))}${tile(Math.round(c30 / 30 * 100) + '%', 'за 30 днів')}</div></section>`;
    }).join('');
  },
  goals() {
    const key = gkey(), a = L.goals.filter(g => g.per === GP && g.key === key);
    return segs('g-per', GP, [['year', `Рік ${new Date().getFullYear()}`], ['month', monthName(new Date().getFullYear(), new Date().getMonth()).split(' ')[0]]]) + `<section class="box">${head('🎯', GP === 'year' ? 'Цілі на рік' : 'Цілі на місяць', a.length ? `${a.filter(g => g.count >= g.target).length} з ${a.length}` : '')}${a.length ? a.map(g => `<div class="item" data-id="${esc(g.id)}"><div><p>${esc(g.text)}</p><div class="cnt"><button data-a="goal-dec" aria-label="Мінус">−</button><b>${g.count} / ${g.target}</b><button data-a="goal-inc" aria-label="Плюс">+</button><div class="bar" data-key="bar"><i style="width:${Math.min(100, Math.round(g.count / g.target * 100))}%"></i></div></div></div><button class="t-x" data-a="goal-del" aria-label="Видалити">${ico('trash')}</button></div>`).join('') : '<p class="none" data-key="none">Цілей ще немає. Наприклад: «Прочитати 12 книг».</p>'}<form class="quick" data-key="form" data-f="goal"><input name="t" placeholder="Нова ціль" maxlength="80" autocomplete="off"><input name="n" class="num" type="number" inputmode="numeric" min="1" max="9999" placeholder="Скільки" aria-label="Скільки разів"><button aria-label="Додати">${ico('plus')}</button></form><p class="hintp" data-key="hint">Друге поле — скільки разів треба зробити (наприклад, 12 книг). Якщо лишити порожнім, буде 1.</p></section>`;
  },
  joy() {
    return `<section class="box jar"><i>🫙</i><b>${L.joys.length} ${pl(L.joys.length, ['хороший момент', 'хороші моменти', 'хороших моментів'])}</b><button class="pillb pri" data-a="joy-rand">Дістати випадковий момент</button></section><section class="box">${head('✍️', 'Додати момент')}<form data-f="joy"><textarea class="area" name="t" maxlength="300" placeholder="Що хорошого сталося?"></textarea><button class="main-btn">Покласти в банку</button></form></section>${L.joys.length ? `<section class="box">${head('💛', 'Усі моменти')}${L.joys.map(j => `<div class="item" data-id="${esc(j.id)}"><div><p>${esc(j.text)}</p><small>${fD(j.date, { day: 'numeric', month: 'long', year: 'numeric' })}</small></div><button class="t-x" data-a="joy-del" aria-label="Видалити">${ico('trash')}</button></div>`).join('')}</section>` : ''}`;
  },
  capsule() {
    const t = dkey(), a = [...L.capsules].sort((x, y) => x.open < y.open ? -1 : 1);
    return `<p class="lead">Напиши лист собі в майбутнє. Він запечатається й відкриється у вибраний день.</p><section class="box">${head('💌', 'Новий лист')}<form data-f="capsule"><textarea class="area" name="t" maxlength="4000" placeholder="Привіт, майбутня я…"></textarea><div style="height:12px"></div>${segs('c-per', CP, [[1, 'Місяць'], [3, '3 місяці'], [6, 'Пів року'], [12, 'Рік']])}<button class="main-btn" style="margin-top:0">Запечатати</button></form></section>${a.length ? `<section class="box">${head('📮', 'Мої листи')}${a.map(c => { const rdy = c.open <= t; return `<div class="item" data-id="${esc(c.id)}"><div>${rdy ? `<p><b>${c.opened ? 'Прочитаний лист' : 'Лист відкрився!'}</b></p><small>Написано ${fD(c.created, { day: 'numeric', month: 'long', year: 'numeric' })}</small><div style="margin-top:8px"><button class="pillb${c.opened ? '' : ' pri'}" data-a="cap-read" data-id="${esc(c.id)}">Прочитати</button></div>` : `<p><b>🔒 Запечатано</b></p><small>Відкриється ${fD(c.open, { day: 'numeric', month: 'long', year: 'numeric' })} · через ${diff(t, c.open)} ${pl(diff(t, c.open), ['день', 'дні', 'днів'])}</small>`}</div><button class="t-x" data-a="cap-del" aria-label="Видалити">${ico('trash')}</button></div>`; }).join('')}</section>` : ''}`;
  },
  dreams() {
    const dn = L.dreams.filter(d => d.done).length, p = L.dreams.length ? Math.round(dn / L.dreams.length * 100) : 0;
    return `<section class="box">${head('✨', 'Мої мрії', L.dreams.length ? `${dn} з ${L.dreams.length} здійснилось` : '')}${L.dreams.length ? `<div class="bar" data-key="bar"><i style="width:${p}%"></i></div><ul class="tasks" data-key="list">${L.dreams.map(d => `<li class="task${d.done ? ' done' : ''}" data-id="${esc(d.id)}"><button class="chk" data-a="dream-toggle" aria-label="Здійснилось">${ico('ok')}</button><div class="t-main"><span>${esc(d.text)}</span>${d.done && d.doneAt ? `<small style="font-size:12px;color:var(--muted)">Здійснилось ${fD(d.doneAt, { day: 'numeric', month: 'long', year: 'numeric' })}</small>` : ''}</div><button class="t-x" data-a="dream-del" aria-label="Видалити">${ico('x')}</button></li>`).join('')}</ul>` : '<p class="none" data-key="none">Запиши першу мрію — із цього все починається.</p>'}<form class="quick" data-key="form" data-f="dream"><input name="t" placeholder="Про що ти мрієш?" maxlength="120" autocomplete="off"><button aria-label="Додати">${ico('plus')}</button></form></section>`;
  },
  cycle() {
    const c = cycleInfo(), t = dkey(), dl = k => fD(k, { day: 'numeric', month: 'long' });
    let o = '';
    if (c) {
      const until = diff(t, c.next);
      o += `<section class="box">${head('🌸', 'Сьогодні')}<div class="big">${c.day}</div><p class="none" data-key="none" style="margin-top:6px">день циклу</p><div style="margin-top:8px"><div class="kv"><span>Наступні місячні</span><b>${c.late ? `очікувались ${dl(c.next)} · затримка ${c.late} ${pl(c.late, ['день', 'дні', 'днів'])}` : `${dl(c.next)} · через ${until} ${pl(until, ['день', 'дні', 'днів'])}`}</b></div><div class="kv"><span>Овуляція, приблизно</span><b>${dl(c.ov)}</b></div><div class="kv"><span>Довжина циклу</span><b>${c.len} ${pl(c.len, ['день', 'дні', 'днів'])}${c.measured ? ' (середня)' : ''}</b></div></div></section>`;
      o += `<section class="box"><div class="c-head"><i class="c-ico">🗓️</i><h2>${monthName(CM.y, CM.m)}</h2><div class="calnav"><button class="t-x" data-a="cm-prev" aria-label="Попередній місяць">${ico('back')}</button><button class="t-x" data-a="cm-next" aria-label="Наступний місяць">${ico('right')}</button></div></div>${monthGrid(CM.y, CM.m, (k, d) => `<div class="${cycleMark(k, c)}${k === t ? ' now' : ''}">${d}</div>`)}<div class="legend"><span><i style="background:#e5484d"></i>місячні</span><span><i style="background:color-mix(in srgb,#e5484d 26%,var(--surface2))"></i>прогноз</span><span><i style="background:color-mix(in srgb,#3fae82 24%,var(--surface2))"></i>фертильні дні</span><span><i style="background:#3fae82"></i>овуляція</span></div></section>`;
    } else o += `<p class="lead">Відміть перший день останніх місячних — і зʼявиться день циклу, прогноз і календар.</p>`;
    o += `<section class="box">${head('➕', 'Відмітити початок місячних')}<button class="main-btn" style="margin-top:0" data-a="cyc-today">Почалися сьогодні</button><form class="quick" data-key="form" data-f="cycle"><input name="d" type="date" max="${t}" aria-label="Інша дата"><button aria-label="Додати">${ico('plus')}</button></form><p class="hintp" data-key="hint">Або вибери іншу дату й натисни «+».</p></section>`;
    o += `<section class="box">${head('⚙️', 'Мій цикл')}<div class="two"><label>Довжина циклу, днів<input class="inp" data-c="len" type="number" inputmode="numeric" min="18" max="45" value="${+L.cycle.len || 28}"></label><label>Тривалість місячних<input class="inp" data-c="period" type="number" inputmode="numeric" min="1" max="10" value="${+L.cycle.period || 5}"></label></div><p class="hintp" data-key="hint">Коли відмічено два й більше циклів, довжина рахується як середня з останніх.</p></section>`;
    if (c) o += `<section class="box">${head('📋', 'Відмічені дати')}${[...c.s].reverse().map(k => `<div class="item"><div><p>${fD(k, { day: 'numeric', month: 'long', year: 'numeric' })}</p></div><button class="t-x" data-a="cyc-del" data-k="${k}" aria-label="Видалити">${ico('trash')}</button></div>`).join('')}</section>`;
    return o + `<p class="hintp" data-key="hint" style="margin:0 4px">Прогноз приблизний і рахується за календарним методом. Він не підходить для контрацепції чи діагностики.</p>`;
  },
  summary() {
    const now = new Date(), pre = SP === 'month' ? dkey().slice(0, 7) : String(now.getFullYear()), s = statsFor(pre);
    const title = SP === 'month' ? monthName(now.getFullYear(), now.getMonth()) : `${now.getFullYear()} рік`;
    return segs('s-per', SP, [['month', 'Місяць'], ['year', 'Рік']]) + `<section class="box hero" style="display:block"><p class="t-date" style="opacity:.9">Підсумки</p><h1 style="color:#fff;text-shadow:none">${title}</h1><p style="margin:10px 0 0;font-size:15px;position:relative;z-index:1">${s.total ? `Виконано ${s.done} із ${s.total} справ — це ${s.pct}%.` : 'Справ за цей період ще не було.'} ${s.mood ? `Найчастіший настрій: ${s.mood[1]} ${s.mood[2].toLowerCase()}.` : ''}</p></section><section class="box">${head('📊', 'У цифрах')}<div class="tiles">${tile(s.done, 'справ зроблено')}${tile(s.pct + '%', 'виконання')}${tile(s.water, 'склянок води')}${tile(s.habits, 'відміток звичок')}${tile(s.grat, 'днів вдячності')}${tile(s.joys, 'моментів радості')}${tile(s.dreams, 'мрій здійснилось')}${tile(s.photos, 'днів у фото')}${tile(bestStreak(), 'рекорд днів поспіль')}</div></section>`;
  },
  backup() {
    return `<p class="lead">Усі дані зберігаються тільки на цьому телефоні. Резервна копія допоможе перенести їх на інший пристрій або відновити.</p><section class="box">${head('🔄', 'Автоматична копія', 'раз на день')}<p class="none" data-key="none">${Auto.info ? `Остання копія: ${new Date(Auto.info.at).toLocaleString('uk-UA', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}, нотаток у ній: ${Auto.info.notes}.` : 'Першу копію буде створено, щойно зʼявляться дані.'} Створюється сама, нова копія замінює стару.</p><div class="btnrow"><button class="pillb pri" data-a="au-make">Оновити зараз</button>${Auto.info ? '<button class="pillb" data-a="au-restore">Відновити з неї</button>' : ''}</div><p class="hintp" data-key="hint">Копія лежить у памʼяті застосунку на цьому телефоні. Вона врятує після помилки чи невдалого відновлення, але зникне разом із застосунком, якщо його видалити або очистити дані сайтів у Safari. Для такого випадку збережи код або файл нижче.</p></section><section class="box">${head('🔑', 'Копія кодом')}<p class="none" data-key="none">Код містить справи, звички, настрій, цілі, мрії, цикл і тексти нотаток (без фото).</p><button class="main-btn" data-a="code-share">Зберегти код у Нотатки</button><p class="hintp" data-key="hint">Відкриється меню «Поділитися» — вибери «Нотатки» і натисни «Зберегти».${L.seen.codeAt ? ` Востаннє зберігала ${new Date(+L.seen.codeAt).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })}.` : ''}</p><button class="ghost" data-a="bk-make">Показати код тут</button>${BK ? `<textarea class="area code" readonly style="margin-top:12px">${esc(BK)}</textarea><button class="ghost" data-a="bk-copy">Скопіювати код</button><p class="hintp" data-key="hint">Збережи код у надійному місці, наприклад надішли собі в месенджері.</p>` : ''}</section><section class="box">${head('↩️', 'Відновити з коду')}<form data-f="restore"><textarea class="area code" name="t" placeholder="Встав сюди код"></textarea><button class="main-btn">Відновити</button></form><p class="hintp" data-key="hint">Дані щоденника буде замінено даними з коду.</p></section><section class="box">${head('📁', 'Копія файлом')}<p class="none" data-key="none">Повна копія: усі дані, фото в нотатках і фото дня.</p><div class="btnrow"><button class="pillb" data-a="bk-file">Зберегти файл</button><button class="pillb" data-a="bk-import">Відновити з файлу</button></div></section>`;
  }
};

/* ================= backup by code ================= */
async function pipe(bytes, stream) { return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer()); }
async function makeCode() {
  const data = { app: 'notatky', v: 2, life: L, prefs: { name: cfg.name, waterGoal: cfg.waterGoal, birthday: cfg.birthday }, folders: cfg.folders, notes: notes.map(n => ({ ...n, html: n.html.replace(/<img[^>]*>/g, '') })) };
  let out = new TextEncoder().encode(JSON.stringify(data)), tag = 'NTK0.';
  if (window.CompressionStream) { try { out = await pipe(out, new CompressionStream('gzip')); tag = 'NTK1.'; } catch (e) { } }
  let s = '';
  for (let i = 0; i < out.length; i += 8192) s += String.fromCharCode.apply(null, out.subarray(i, i + 8192));
  return tag + btoa(s);
}
async function readCode(code) {
  code = code.replace(/\s+/g, '');
  const tag = code.slice(0, 5);
  if (tag !== 'NTK0.' && tag !== 'NTK1.') throw new Error('bad code');
  let bytes = Uint8Array.from(atob(code.slice(5)), c => c.charCodeAt(0));
  if (tag === 'NTK1.') bytes = await pipe(bytes, new DecompressionStream('gzip'));
  const d = JSON.parse(new TextDecoder().decode(bytes));
  if (!d || d.app !== 'notatky') throw new Error('bad data');
  return d;
}
async function applyCode(d) {
  (Array.isArray(d.folders) ? d.folders : []).forEach(x => { if (x && x.id && x.name && !cfg.folders.some(y => y.id === x.id)) cfg.folders.push({ id: String(x.id).replace(/[^\w-]/g, '').slice(0, 40), name: String(x.name).slice(0, 40) }); });
  saveCfg();
  for (const raw of Array.isArray(d.notes) ? d.notes : []) {
    const n = cleanNote(raw); if (!n) continue;
    const old = notes.find(x => x.id === n.id);
    if (old) continue;
    notes.push(n); await DB.put(n);
  }
  lifeImport(d.life, d.prefs);
}

/* ================= recovery code -> system share sheet (Apple Notes) ================= */
// Код готуємо заздалегідь, щоб «Поділитися» відкривалось одразу з дотику (цього вимагає iOS).
let CODE = '';
const warmCode = () => makeCode().then(c => { CODE = c; }).catch(() => { });
const codeDue = () => (lifeHas(L) || notes.filter(n => !n.deleted).length > 1) && Object.keys(L.visits).length >= 3 && Date.now() - (+L.seen.codeAt || 0) > 7 * 864e5;
function shareCode() {
  const send = c => {
    const text = `Код відновлення щоденника від ${fD(dkey(), { day: 'numeric', month: 'long' })}\nСтарий код можна видалити.\n\n${c}`;
    const done = () => { L.seen.codeAt = Date.now(); saveL(); lifeRefresh(); };
    if (navigator.share) navigator.share({ title: 'Код відновлення щоденника', text }).then(done, () => { });
    else navigator.clipboard.writeText(text).then(() => { toast('Код скопійовано — встав його в нотатки'); done(); }, () => toast('Не вдалося скопіювати'));
    warmCode();
  };
  if (CODE) send(CODE); else makeCode().then(send, () => toast('Не вдалося створити код'));
}

/* ================= automatic backup ================= */
// Одна копія в окремій базі застосунку: створюється раз на день, нова замінює стару.
const lifeHas = l => !!(l && ((l.tasks || []).length || (l.habits || []).length || (l.joys || []).length || (l.dreams || []).length || (l.goals || []).length || (l.capsules || []).length || Object.keys(l.mood || {}).length || ((l.cycle || {}).starts || []).length));
const Auto = {
  db: null, info: null,
  open() { return this.db ? Promise.resolve(this.db) : new Promise((res, rej) => { const r = indexedDB.open('notatky-backup', 1); r.onupgradeneeded = () => r.result.createObjectStore('snap', { keyPath: 'id' }); r.onsuccess = () => res(this.db = r.result); r.onerror = () => rej(r.error); }); },
  async get() { const db = await this.open(); return new Promise((res, rej) => { const r = db.transaction('snap').objectStore('snap').get('auto'); r.onsuccess = () => res(r.result || null); r.onerror = () => rej(r.error); }); },
  async put(v) { const db = await this.open(); return new Promise((res, rej) => { const t = db.transaction('snap', 'readwrite'); t.objectStore('snap').put(v); t.oncomplete = () => res(); t.onerror = () => rej(t.error); }); },
  // «Порожньо» = немає даних щоденника і щонайбільше одна (вітальна) нотатка.
  fresh() { return !lifeHas(L) && notes.filter(n => !n.deleted).length <= 1; },
  note(s) { this.info = s ? { at: s.at, notes: (s.notes || []).filter(n => !n.deleted).length } : null; },
  async make() {
    const s = { id: 'auto', at: Date.now(), day: dkey(), life: L, prefs: { name: cfg.name, waterGoal: cfg.waterGoal, birthday: cfg.birthday }, folders: cfg.folders, notes };
    await this.put(s); this.note(s);
  },
  async restore() {
    const s = await this.get(); if (!s) { toast('Автокопії ще немає'); return; }
    (Array.isArray(s.folders) ? s.folders : []).forEach(x => { if (x && x.id && x.name && !cfg.folders.some(y => y.id === x.id)) cfg.folders.push({ id: String(x.id).replace(/[^\w-]/g, '').slice(0, 40), name: String(x.name).slice(0, 40) }); });
    saveCfg();
    for (const raw of Array.isArray(s.notes) ? s.notes : []) {
      const n = cleanNote(raw); if (!n) continue;
      const old = notes.find(x => x.id === n.id);
      if (old) { if (old.updated >= n.updated) continue; notes[notes.indexOf(old)] = n; } else notes.push(n);
      await DB.put(n);
    }
    lifeImport(s.life, s.prefs); render(); toast('Відновлено з автокопії');
  },
  async tick() {
    try {
      const s = await this.get(); this.note(s);
      if (this.fresh()) {
        // Дані зникли, а копія є: пропонуємо відновити. Порожнім станом копію не перезаписуємо.
        if (s && (lifeHas(s.life) || (s.notes || []).length > 1) && !this.asked) {
          this.asked = true;
          const when = new Date(s.at).toLocaleString('uk-UA', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
          if (await confirmBox('Знайдено автокопію', `Схоже, дані застосунку зникли. Є автоматична копія від ${when}. Відновити її?`, 'Відновити', false)) await this.restore();
        }
      } else if (!s || s.day !== dkey()) await this.make();
    } catch (e) { }
    warmCode();
    if (PAGE === 'backup') drawPage(); else if (TAB === 'today' && !$('#app :focus')) drawToday();
  }
};

/* ================= effects ================= */
function confetti() {
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  const c = document.createElement('canvas');
  c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:90;pointer-events:none';
  document.body.append(c);
  const W = c.width = innerWidth, H = c.height = innerHeight, x = c.getContext('2d'), cols = [cfg.accent, ACC2[cfg.accent] || '#f08a5d', '#f5d547', '#7ed6a5', '#7cc4f5', '#b79cf2'];
  const ps = Array.from({ length: 130 }, () => ({ x: W / 2 + (Math.random() - .5) * W * .5, y: H * .38, vx: (Math.random() - .5) * 14, vy: -Math.random() * 13 - 4, s: 6 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: cols[Math.random() * cols.length | 0] }));
  const t0 = performance.now();
  setTimeout(() => c.remove(), 4000);
  (function f(t) {
    const e = t - t0; x.clearRect(0, 0, W, H);
    ps.forEach(p => { p.vy += .35; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.globalAlpha = Math.max(0, 1 - e / 2600); x.fillStyle = p.c; x.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); x.restore(); });
    if (e < 2600 && c.isConnected) requestAnimationFrame(f);
  })(t0);
}
const Sea = {
  on: false, ctx: null, out: null,
  build() {
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return false;
    const c = this.ctx = new C(), len = c.sampleRate * 6, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    let last = 0; for (let i = 0; i < len; i++) { last = (last + .02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    this.out = c.createGain(); this.out.gain.value = 0; this.out.connect(c.destination);
    [[.09, 420, .5], [.137, 900, .28]].forEach(([rate, freq, vol], i) => {
      const s = c.createBufferSource(); s.buffer = buf; s.loop = true; s.playbackRate.value = 1 + i * .13;
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
      const g = c.createGain(); g.gain.value = vol * .55;
      const l = c.createOscillator(); l.frequency.value = rate;
      const lg = c.createGain(); lg.gain.value = vol * .45; l.connect(lg); lg.connect(g.gain);
      const lf = c.createGain(); lf.gain.value = freq * .5; l.connect(lf); lf.connect(f.frequency);
      s.connect(f); f.connect(g); g.connect(this.out); s.start(0, i * 2); l.start();
    });
    return true;
  },
  toggle() {
    if (!this.ctx && !this.build()) { toast('Звук недоступний на цьому пристрої'); return; }
    const c = this.ctx, t = c.currentTime, g = this.out.gain; this.on = !this.on;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
    if (this.on) { c.resume(); g.linearRampToValueAtTime(.9, t + 1.2); toast('Звуки моря увімкнено'); }
    else { g.linearRampToValueAtTime(0, t + .6); setTimeout(() => { if (!this.on) c.suspend(); }, 750); }
  }
};
function breath() {
  const el = document.createElement('div'); el.id = 'breath';
  el.innerHTML = `<button class="rb" style="position:absolute;top:calc(var(--st) + 14px);right:16px" aria-label="Закрити">${ico('x')}</button><div class="bcirc"></div><div class="btxt"><b>Приготуйся</b><span>5 спокійних вдихів</span></div>`;
  document.body.append(el);
  const c = $('.bcirc', el), b = $('b', el), s = $('span', el); let n = 0, dead = false, tm = 0;
  const close = () => { dead = true; clearTimeout(tm); el.remove(); };
  $('button', el).onclick = close;
  const step = (txt, scale, dur, next) => { if (dead) return; b.textContent = txt; c.style.transitionDuration = dur + 's'; c.style.transform = `scale(${scale})`; tm = setTimeout(next, dur * 1000); };
  const cycle = () => { if (n >= 5) { b.textContent = 'Ти молодець'; s.textContent = 'Сподіваюся, стало трохи легше'; tm = setTimeout(close, 2600); return; } n++; s.textContent = `Вдих ${n} з 5`; step('Вдих…', 1, 4, () => step('Затримай', 1, 4, () => step('Видих…', .55, 6, cycle))); };
  tm = setTimeout(cycle, 1200);
}
function showJoy() {
  if (!L.joys.length) { toast('Банка ще порожня — додай перший момент'); if (PAGE !== 'joy') openPage('joy'); return; }
  const j = L.joys[Math.random() * L.joys.length | 0];
  sheet(() => `<h3>🫙 З банки радості</h3><p class="quote">${esc(j.text)}</p><p class="note">${fD(j.date, { day: 'numeric', month: 'long', year: 'numeric' })}</p>`);
}
function readCapsule(id) {
  const c = L.capsules.find(x => x.id === id); if (!c || c.open > dkey()) return;
  c.opened = true; saveL();
  const w = sheet(() => `<h3>💌 Лист із минулого</h3><p class="note" style="margin:0 4px 12px">Написано ${fD(c.created, { day: 'numeric', month: 'long', year: 'numeric' })}</p><p class="quote">${esc(c.text)}</p>`);
  w.onclose = lifeRefresh;
}

/* ================= actions ================= */
function act(a, el) {
  const id = el.dataset.id || el.closest('[data-id]')?.dataset.id, k = dkey();
  const find = arr => arr.find(x => x.id === id), drop = key => { L[key] = L[key].filter(x => x.id !== id); };
  switch (a) {
    case 'tab': go(el.dataset.tab); return;
    case 'settings': openSettings(); return;
    case 'sea': Sea.toggle(); el.classList.toggle('on', Sea.on); return;
    case 'page': openPage(el.dataset.p); return;
    case 'back': history.state && history.state.pg ? history.back() : closePage(); return;
    case 'breath': breath(); return;
    case 'joy-rand': showJoy(); return;
    case 'cap-read': readCapsule(id); return;
    case 'pred-open': L.seen.pred = k; saveL(); el.closest('.daily').classList.remove('closed'); return;
    case 'motiv-open': L.seen.motiv = k; saveL(); el.closest('.daily').classList.remove('closed'); return;
    case 't-toggle': { const t = find(L.tasks); if (!t) return; t.done = !t.done; const all = tasksOf(t.date); if (t.done && all.every(x => x.done)) { confetti(); toast('Усі справи дня зроблено! 🎉'); } break; }
    case 't-del': drop('tasks'); break;
    case 'mood': if (L.mood[k] === el.dataset.v) delete L.mood[k]; else L.mood[k] = el.dataset.v; break;
    case 'water': { const i = +el.dataset.i, w = L.water[k] | 0; L.water[k] = w === i + 1 ? i : i + 1; if (L.water[k] === wgoal() && w < wgoal()) toast('Норму води виконано 💧'); break; }
    case 'habit': { const a2 = hlog(k); L.habitLog[k] = a2.includes(id) ? a2.filter(x => x !== id) : [...a2, id]; break; }
    case 'wk-prev': P.sel = addDays(P.sel, -7); break;
    case 'wk-next': P.sel = addDays(P.sel, 7); break;
    case 'wk-today': P.sel = k; break;
    case 'day': P.sel = el.dataset.k; break;
    case 'pcat': P.cat = el.dataset.v; break;
    case 'carry': { const todo = tasksOf(P.sel).filter(t => !t.done), nx = addDays(P.sel, 1); todo.forEach(t => { t.date = nx; }); toast(`Перенесено на завтра: ${todo.length}`); break; }
    case 'm-prev': case 'm-next': { const d = new Date(SM.y, SM.m + (a === 'm-next' ? 1 : -1), 1); SM.y = d.getFullYear(); SM.m = d.getMonth(); break; }
    case 'cm-prev': case 'cm-next': { const d = new Date(CM.y, CM.m + (a === 'cm-next' ? 1 : -1), 1); CM.y = d.getFullYear(); CM.m = d.getMonth(); break; }
    case 'h-emoji': hemo = (hemo + 1) % HEMO.length; el.textContent = HEMO[hemo]; return;
    case 'h-del': confirmBox('Видалити звичку?', 'Історія її відміток теж зникне.', 'Видалити').then(y => { if (!y) return; drop('habits'); for (const d in L.habitLog) L.habitLog[d] = hlog(d).filter(x => x !== id); saveL(); lifeRefresh(); }); return;
    case 'g-per': GP = el.dataset.v; break;
    case 'goal-inc': case 'goal-dec': { const g = find(L.goals); if (!g) return; const was = g.count; g.count = Math.max(0, Math.min(g.target, g.count + (a === 'goal-inc' ? 1 : -1))); if (g.count === g.target && was < g.target) { confetti(); toast('Ціль досягнуто! 🎯'); } break; }
    case 'goal-del': drop('goals'); break;
    case 'joy-del': drop('joys'); break;
    case 'c-per': CP = +el.dataset.v; $$('[data-a=c-per]').forEach(b => b.classList.toggle('on', b === el)); return;
    case 'cap-del': confirmBox('Видалити лист?', 'Його не можна буде відновити.', 'Видалити').then(y => { if (!y) return; drop('capsules'); saveL(); lifeRefresh(); }); return;
    case 'dream-toggle': { const d = find(L.dreams); if (!d) return; d.done = !d.done; d.doneAt = d.done ? k : ''; if (d.done) { confetti(); toast('Мрія здійснилась ✨'); } break; }
    case 'dream-del': drop('dreams'); break;
    case 'cyc-today': if (!L.cycle.starts.includes(k)) L.cycle.starts.push(k); toast('Відмічено'); break;
    case 'cyc-del': L.cycle.starts = L.cycle.starts.filter(x => x !== el.dataset.k); break;
    case 's-per': SP = el.dataset.v; break;
    case 'bk-make': makeCode().then(c => { BK = c; drawPage(); }).catch(() => toast('Не вдалося створити код')); return;
    case 'bk-copy': navigator.clipboard.writeText(BK).then(() => toast('Код скопійовано'), () => toast('Не вдалося скопіювати — виділи код вручну')); return;
    case 'ph-add': pickPhoto(el.dataset.k); return;
    case 'ph-view': Viewer.open(el.dataset.k); return;
    case 'ph-collage': collageSheet(PM.y, PM.m); return;
    case 'pm-prev': case 'pm-next': { const d = new Date(PM.y, PM.m + (a === 'pm-next' ? 1 : -1), 1); if (d > new Date()) return; PM.y = d.getFullYear(); PM.m = d.getMonth(); break; }
    case 'code-share': shareCode(); return;
    case 'au-make': Auto.make().then(() => { toast('Автокопію оновлено'); drawPage(); }, () => toast('Не вдалося створити копію')); return;
    case 'au-restore': confirmBox('Відновити з автокопії?', 'Дані щоденника буде замінено даними з копії. Новіші нотатки залишаться.', 'Відновити', false).then(y => { if (y) Auto.restore().catch(() => toast('Не вдалося відновити')); }); return;
    case 'bk-file': exportAll(); return;
    case 'bk-import': $('#impFile').click(); return;
    default: return;
  }
  saveL(); lifeRefresh();
}
function formAct(f) {
  const v = (f.elements.t ? f.elements.t.value : '').trim();
  switch (f.dataset.f) {
    case 'task': if (!v) return; L.tasks.push({ id: uid(), date: f.dataset.date, text: v.slice(0, 120), cat: f.dataset.cat || 'personal', done: false }); break;
    case 'habit': if (!v) return; L.habits.push({ id: uid(), name: v.slice(0, 40), emoji: HEMO[hemo] }); break;
    case 'goal': if (!v) return; L.goals.push({ id: uid(), text: v.slice(0, 80), per: GP, key: gkey(), target: Math.max(1, Math.min(9999, Math.round(+f.elements.n.value) || 1)), count: 0 }); break;
    case 'joy': if (!v) return; L.joys.unshift({ id: uid(), text: v.slice(0, 300), date: dkey() }); toast('Момент у банці 💛'); break;
    case 'capsule': { if (!v) return; const d = new Date(); d.setMonth(d.getMonth() + CP); L.capsules.push({ id: uid(), text: v.slice(0, 4000), created: dkey(), open: dkey(d), opened: false }); toast('Лист запечатано 💌'); break; }
    case 'dream': if (!v) return; L.dreams.push({ id: uid(), text: v.slice(0, 120), done: false, doneAt: '' }); break;
    case 'cycle': { const d = f.elements.d.value; if (!isDate(d) || d > dkey()) { toast('Обери дату не пізніше сьогодні'); return; } if (!L.cycle.starts.includes(d)) L.cycle.starts.push(d); toast('Відмічено'); break; }
    case 'restore': if (!v) return; readCode(v).then(async d => { if (!await confirmBox('Відновити з коду?', 'Поточні дані щоденника буде замінено даними з коду. Нотатки додадуться до наявних.', 'Відновити', false)) return; await applyCode(d); render(); toast('Дані відновлено'); }).catch(() => toast('Код не підходить або пошкоджений')); return;
    default: return;
  }
  if (f.isConnected) f.reset();
  saveL(); lifeRefresh();
  if (f.dataset.f === 'task') { const i = $(`#app>.tab.on form[data-f=task] input`); if (i) i.focus(); }
}
document.addEventListener('click', e => { const el = e.target.closest('[data-a]'); if (el && el.closest('#app>.tab:not(#list),#tabs,#page')) act(el.dataset.a, el); });
document.addEventListener('submit', e => { const f = e.target.closest('form[data-f]'); if (f) { e.preventDefault(); formAct(f); } });
document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.g !== undefined) { const k = dkey(), a = Array.isArray(L.grat[k]) ? L.grat[k] : ['', '', '']; a[+t.dataset.g] = t.value.slice(0, 120); L.grat[k] = a; saveL(); }
  if (t.dataset.cap !== undefined) capInput(t);
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.cap !== undefined) capFlush();
  if (t.dataset.c === 'len') { L.cycle.len = Math.max(18, Math.min(45, Math.round(+t.value) || 28)); saveL(); drawPage(); }
  if (t.dataset.c === 'period') { L.cycle.period = Math.max(1, Math.min(10, Math.round(+t.value) || 5)); saveL(); drawPage(); }
});
document.addEventListener('visibilitychange', () => { if (!document.hidden) { L.visits[dkey()] = 1; saveL(); if (!$('#app :focus')) lifeRefresh(); } Auto.tick(); });
setTimeout(() => Auto.tick(), 2500);

/* Шрифти рожевого стилю кладемо в окремий кеш, щоб без інтернету вигляд не змінювався. */
async function warmFonts() {
  try {
    if (!('caches' in window) || !navigator.onLine) return;
    const link = $('link[href*="fonts.googleapis.com"]'); if (!link) return;
    const c = await caches.open('notatky-fonts');
    if (await c.match(link.href, { ignoreVary: true })) return;
    const r = await fetch(link.href); if (!r.ok) return;
    const css = await r.clone().text();
    const urls = [...new Set([...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map(m => m[1]))];
    await Promise.all(urls.map(u => fetch(u).then(x => (x.ok ? c.put(u, x) : null))));
    await c.put(link.href, r);
  } catch (e) { }
}
setTimeout(warmFonts, 4000);

/* ================= photo of the day ================= */
// Фото зберігаються в окремій базі: мініатюра для календаря і стиснене повне фото для перегляду.
I.cam = '<path d="M4 8.5h3.2L9 6h6l1.8 2.5H20v10.5H4z"/><circle cx="12" cy="13.5" r="3.6"/>';
const PH = new Map(), PHURL = {}, PHload = new Set();
const PM = { y: new Date().getFullYear(), m: new Date().getMonth() };
const DATAIMG = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const PHDB = {
  db: null,
  open() { return this.db ? Promise.resolve(this.db) : new Promise((res, rej) => { const r = indexedDB.open('notatky-photos', 1); r.onupgradeneeded = () => { const d = r.result; d.createObjectStore('meta', { keyPath: 'd' }); d.createObjectStore('full', { keyPath: 'd' }); }; r.onsuccess = () => res(this.db = r.result); r.onerror = () => rej(r.error); }); },
  async tx(stores, mode, fn) { const db = await this.open(); return new Promise((res, rej) => { const t = db.transaction(stores, mode); let out; const r = fn(t); if (r) r.onsuccess = () => { out = r.result; }; t.oncomplete = () => res(out); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); }); },
  full(k) { return this.tx('full', 'readonly', t => t.objectStore('full').get(k)).then(r => (r && r.buf ? new Blob([r.buf], { type: 'image/jpeg' }) : null)); }
};
function photoCount() { return PH.size; }
const phCount = pre => { let n = 0; for (const k of PH.keys()) if (k.startsWith(pre)) n++; return n; };
function dropURL(k) { if (PHURL[k]) URL.revokeObjectURL(PHURL[k]); delete PHURL[k]; PHload.delete(k); }
function phSrc(k) {
  if (PHURL[k]) return PHURL[k];
  if (!PHload.has(k)) {
    PHload.add(k);
    PHDB.full(k).then(b => { if (b && PH.has(k)) { PHURL[k] = URL.createObjectURL(b); if (TAB === 'today' && !$('#app :focus')) drawToday(); } }).catch(() => { });
  }
  return PH.get(k).thumb;
}

/* стиснення: повне фото до 1600 px, мініатюра 300×300 */
function loadImage(blob) { return new Promise((res, rej) => { const u = URL.createObjectURL(blob), im = new Image(); im.onload = () => { URL.revokeObjectURL(u); res(im); }; im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('image')); }; im.src = u; }); }
const canvasBlob = (c, q) => new Promise((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('blob'))), 'image/jpeg', q));
async function prepPhoto(file) {
  const im = await loadImage(file), W = im.naturalWidth, H = im.naturalHeight;
  if (!W || !H) throw new Error('image');
  const k = Math.min(1, 1600 / Math.max(W, H)), c = document.createElement('canvas');
  c.width = Math.round(W * k); c.height = Math.round(H * k);
  const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
  const full = await canvasBlob(c, 0.82);
  const s = Math.min(W, H), t = document.createElement('canvas'); t.width = t.height = 300;
  const y = t.getContext('2d'); y.fillStyle = '#fff'; y.fillRect(0, 0, 300, 300); y.drawImage(im, (W - s) / 2, (H - s) / 2, s, s, 0, 0, 300, 300);
  const thumb = t.toDataURL('image/jpeg', 0.75);
  c.width = c.height = t.width = t.height = 0;
  return { full, thumb };
}
async function putPhoto(meta, buf) {
  await PHDB.tx(['meta', 'full'], 'readwrite', t => { t.objectStore('meta').put(meta); t.objectStore('full').put({ d: meta.d, buf }); });
  PH.set(meta.d, meta); dropURL(meta.d);
}
async function addPhoto(k, file) {
  try {
    const { full, thumb } = await prepPhoto(file), old = PH.get(k);
    await putPhoto({ d: k, thumb, cap: old ? old.cap : '', at: Date.now() }, await full.arrayBuffer());
    toast(old ? 'Фото замінено' : 'Фото дня збережено 📸');
    lifeRefresh(); Viewer.refresh();
  } catch (e) { toast(e && e.name === 'QuotaExceededError' ? 'Бракує місця для фото' : 'Не вдалося додати це фото'); }
}
async function delPhoto(k) {
  await PHDB.tx(['meta', 'full'], 'readwrite', t => { t.objectStore('meta').delete(k); t.objectStore('full').delete(k); });
  PH.delete(k); dropURL(k);
}
const phInput = document.createElement('input');
phInput.type = 'file'; phInput.accept = 'image/*'; phInput.hidden = true; document.body.append(phInput);
let phTarget = '';
phInput.addEventListener('change', () => { const f = phInput.files && phInput.files[0]; phInput.value = ''; if (f && isDate(phTarget)) addPhoto(phTarget, f); });
function pickPhoto(k) { if (!isDate(k) || k > dkey()) return; phTarget = k; phInput.click(); }

/* підпис до фото */
let capT = 0, capP = null;
function capFlush() { clearTimeout(capT); if (capP) { const p = capP; capP = null; PHDB.tx('meta', 'readwrite', t => t.objectStore('meta').put(p)).catch(() => { }); } }
function capInput(t) { const p = PH.get(t.dataset.cap); if (!p) return; p.cap = t.value.slice(0, 120); capP = p; clearTimeout(capT); capT = setTimeout(capFlush, 400); }
document.addEventListener('visibilitychange', () => { if (document.hidden) capFlush(); });
addEventListener('pagehide', capFlush);
document.addEventListener('keydown', e => { const t = e.target; if (e.key === 'Enter' && t && t.dataset && t.dataset.cap !== undefined) t.blur(); });

/* картка на вкладці «Сьогодні» */
function photoCard(k) {
  const p = PH.get(k);
  return `<section class="box" data-key="photo">${head('📸', 'Фото дня')}${p
    ? `<button class="phimg" data-key="ph-has" data-a="ph-view" data-k="${k}" aria-label="Відкрити фото дня"><img src="${phSrc(k)}" alt="Фото дня"></button><div class="phrow" data-key="ph-row"><input class="inp" data-cap="${k}" value="${esc(p.cap || '')}" placeholder="Підпис до фото…" maxlength="120" autocomplete="off" enterkeyhint="done"><button data-a="ph-add" data-k="${k}" aria-label="Замінити фото">${ico('cam')}</button></div>`
    : `<button class="phadd" data-key="ph-none" data-a="ph-add" data-k="${k}">${ico('cam')}<b>Додати фото дня</b><span>Момент, який хочеться запамʼятати</span></button>`}</section>`;
}

/* сторінка «Фото дня»: календар місяця з мініатюрами */
function photosPage() {
  const t = dkey(), pre = `${PM.y}-${pad(PM.m + 1)}`, n = phCount(pre);
  const off = (new Date(PM.y, PM.m, 1).getDay() + 6) % 7, days = new Date(PM.y, PM.m + 1, 0).getDate();
  const cells = '<div class="x"></div>'.repeat(off) + Array.from({ length: days }, (_, i) => {
    const k = `${pre}-${pad(i + 1)}`, p = PH.get(k), now = k === t ? ' now' : '';
    if (p) return `<button class="has${now}" data-key="c${k}" data-a="ph-view" data-k="${k}" aria-label="Фото за ${i + 1} число"><img src="${p.thumb}" alt=""><span>${i + 1}</span></button>`;
    if (k <= t) return `<button class="add${now}" data-key="c${k}" data-a="ph-add" data-k="${k}" aria-label="Додати фото за ${i + 1} число">${i + 1}</button>`;
    return `<div class="fut" data-key="c${k}">${i + 1}</div>`;
  }).join('');
  const isNow = PM.y === new Date().getFullYear() && PM.m === new Date().getMonth();
  return `<p class="lead">Одне фото на день — і в кінці місяця готовий колаж. Торкнись порожнього дня, щоб додати фото, або мініатюри, щоб її відкрити.</p><section class="box"><div class="c-head"><i class="c-ico">📸</i><h2>${monthName(PM.y, PM.m)}</h2><div class="calnav"><button class="t-x" data-a="pm-prev" aria-label="Попередній місяць">${ico('back')}</button>${isNow ? '' : `<button class="t-x" data-a="pm-next" aria-label="Наступний місяць">${ico('right')}</button>`}</div></div><div class="calh">${WDH.map(x => `<span>${x}</span>`).join('')}</div><div class="phgrid">${cells}</div><p class="none" data-key="phn" style="margin-top:12px">${n ? `${n} ${pl(n, ['день', 'дні', 'днів'])} у фото цього місяця` : 'Цього місяця ще немає фото.'}</p>${n ? `<button class="main-btn" data-key="phc" data-a="ph-collage">Створити колаж місяця</button>` : ''}</section>`;
}

/* перегляд фото на весь екран */
function sharePhoto(k, blob) { if (!blob) { toast('Фото ще завантажується'); return; } saveFile(new File([blob], `foto-${k}.jpg`, { type: 'image/jpeg' })); }
const Viewer = {
  el: null, k: '', url: '', blob: null,
  keys() { return [...PH.keys()].sort(); },
  build() {
    const el = this.el = document.createElement('div'); el.id = 'phv'; el.hidden = true;
    el.innerHTML = `<div class="phv-top"><button data-v="close" aria-label="Закрити">${ico('x')}</button><b></b></div><div class="phv-img"><img alt="Фото дня"><button class="phv-nav prev" data-v="prev" aria-label="Попереднє фото">${ico('back')}</button><button class="phv-nav next" data-v="next" aria-label="Наступне фото">${ico('right')}</button></div><p class="phv-cap"></p><div class="phv-bot"><button data-v="share">${ico('share')}Поділитися</button><button data-v="replace">${ico('cam')}Замінити</button><button data-v="del" class="del" aria-label="Видалити фото">${ico('trash')}</button></div>`;
    document.body.append(el);
    el.addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b) this.act(b.dataset.v); });
    let sx = 0; const box = $('.phv-img', el);
    box.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) this.act(dx < 0 ? 'next' : 'prev'); }, { passive: true });
  },
  open(k) { if (!PH.has(k)) return; if (!this.el) this.build(); this.k = k; this.el.hidden = false; this.load(); },
  async load() {
    const k = this.k, p = PH.get(k); if (!p) { this.close(); return; }
    const img = $('img', this.el), l = this.keys(), i = l.indexOf(k);
    if (this.url) { URL.revokeObjectURL(this.url); this.url = ''; }
    this.blob = null; img.src = p.thumb;
    $('b', this.el).textContent = fD(k, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    $('.phv-cap', this.el).textContent = p.cap || '';
    $('.prev', this.el).hidden = i <= 0; $('.next', this.el).hidden = i >= l.length - 1;
    const b = await PHDB.full(k).catch(() => null);
    if (this.k !== k || !b || this.el.hidden) return;
    this.blob = b; this.url = URL.createObjectURL(b); img.src = this.url;
  },
  act(v) {
    const l = this.keys(), i = l.indexOf(this.k);
    if (v === 'close') this.close();
    else if (v === 'prev' && i > 0) { this.k = l[i - 1]; this.load(); }
    else if (v === 'next' && i >= 0 && i < l.length - 1) { this.k = l[i + 1]; this.load(); }
    else if (v === 'replace') pickPhoto(this.k);
    else if (v === 'share') sharePhoto(this.k, this.blob);
    else if (v === 'del') {
      const k = this.k;
      confirmBox('Видалити фото?', 'Фото за цей день зникне назавжди.', 'Видалити').then(async y => {
        if (!y) return;
        const nx = l[i + 1] || l[i - 1];
        try { await delPhoto(k); toast('Фото видалено'); } catch (e) { toast('Не вдалося видалити'); return; }
        if (nx && PH.has(nx)) { this.k = nx; this.load(); lifeRefresh(); } else this.close();
      });
    }
  },
  close() { if (!this.el || this.el.hidden) return; this.el.hidden = true; if (this.url) { URL.revokeObjectURL(this.url); this.url = ''; } this.blob = null; lifeRefresh(); },
  refresh() { if (this.el && !this.el.hidden) this.load(); }
};

/* колаж місяця */
const rr = (x, a, b, w, h, r) => { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); };
async function makeCollage(y, m) {
  const pre = `${y}-${pad(m + 1)}`, ks = [...PH.keys()].filter(k => k.startsWith(pre)).sort(), n = ks.length;
  if (!n) return null;
  const cols = n === 1 ? 1 : n <= 4 ? 2 : n <= 9 ? 3 : 4, W = 1080, P = 56, G = 18;
  const cell = Math.floor((W - 2 * P - (cols - 1) * G) / cols), rows = Math.ceil(n / cols), HEAD = 210, FOOT = 110, H = HEAD + rows * cell + (rows - 1) * G + FOOT;
  const cs = getComputedStyle(document.documentElement), v = (name, d) => cs.getPropertyValue(name).trim() || d;
  const acc = v('--acc', '#D4107A'), bg = v('--bg', '#FFE1EF'), txt = v('--text', '#4A0A2E'), glam = document.documentElement.dataset.style !== 'classic';
  try { await Promise.all([document.fonts.load('84px Pacifico'), document.fonts.load('800 30px Nunito')]); } catch (e) { }
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  if (glam) { x.fillStyle = 'rgba(212,16,122,.10)'; for (let yy = 14; yy < H; yy += 34) for (let xx = 14; xx < W; xx += 34) { x.beginPath(); x.arc(xx, yy, 3.5, 0, 7); x.fill(); } }
  x.textAlign = 'center'; x.fillStyle = acc;
  x.font = glam ? '84px Pacifico, cursive' : '700 70px Georgia, serif';
  x.fillText(monthName(y, m).replace(/\s*р\.?$/, ''), W / 2, 140);
  for (let i = 0; i < n; i++) {
    const k = ks[i], cx = P + (i % cols) * (cell + G), cy = HEAD + Math.floor(i / cols) * (cell + G);
    let im = null;
    try { const b = await PHDB.full(k); im = await loadImage(b || await (await fetch(PH.get(k).thumb)).blob()); } catch (e) { }
    x.save(); x.shadowColor = 'rgba(0,0,0,.18)'; x.shadowBlur = 18; x.shadowOffsetY = 6; rr(x, cx, cy, cell, cell, 26); x.fillStyle = '#fff'; x.fill(); x.restore();
    x.save(); rr(x, cx, cy, cell, cell, 26); x.clip();
    if (im) { const s = Math.min(im.naturalWidth, im.naturalHeight); x.drawImage(im, (im.naturalWidth - s) / 2, (im.naturalHeight - s) / 2, s, s, cx, cy, cell, cell); }
    x.restore();
    const lab = String(dparse(k).getDate()), fs = Math.round(Math.max(22, cell * 0.1));
    x.font = `800 ${fs}px Nunito, system-ui, sans-serif`;
    const bw = x.measureText(lab).width + fs * 0.9, bh = fs * 1.5, bx = cx + 14, by = cy + cell - bh - 14;
    x.fillStyle = 'rgba(255,255,255,.92)'; rr(x, bx, by, bw, bh, bh / 2); x.fill();
    x.fillStyle = acc; x.fillText(lab, bx + bw / 2, by + bh * 0.7);
  }
  x.fillStyle = txt; x.globalAlpha = 0.75; x.font = '700 30px Nunito, system-ui, sans-serif';
  x.fillText(`${n} ${pl(n, ['день', 'дні', 'днів'])} у фото`, W / 2, H - 46); x.globalAlpha = 1;
  const blob = await canvasBlob(c, 0.9); c.width = c.height = 0;
  return blob;
}
async function collageSheet(y, m) {
  toast('Створюю колаж…');
  let blob = null;
  try { blob = await makeCollage(y, m); } catch (e) { }
  if (!blob) { toast('Не вдалося створити колаж'); return; }
  const url = URL.createObjectURL(blob), file = new File([blob], `kolazh-${y}-${pad(m + 1)}.jpg`, { type: 'image/jpeg' });
  const w = sheet(() => `<h3>Колаж: ${monthName(y, m)}</h3><img class="colprev" src="${url}" alt="Колаж фото за місяць"><div class="btns"><button class="btn" data-c="no">Закрити</button><button class="btn pri" data-c="ok">Зберегти колаж</button></div><p class="note">Відкриється «Поділитися» — вибери «Зберегти зображення».</p>`);
  w.onclose = () => setTimeout(() => URL.revokeObjectURL(url), 400);
  w.addEventListener('click', e => { const c = e.target.closest('[data-c]')?.dataset.c; if (c === 'no') w.close(); if (c === 'ok') saveFile(file); });
}

/* фото дня в резервній копії файлом */
const blobURL = b => new Promise((res, rej) => { const f = new FileReader(); f.onload = () => res(f.result); f.onerror = () => rej(f.error); f.readAsDataURL(b); });
async function photoBackupParts() {
  const out = [];
  for (const k of [...PH.keys()].sort()) {
    const p = PH.get(k), b = await PHDB.full(k);
    if (b) out.push(JSON.stringify({ d: k, cap: p.cap || '', at: p.at || 0, thumb: p.thumb, full: await blobURL(b) }));
  }
  return out;
}
async function photosImport(arr) {
  let n = 0;
  for (const p of arr) {
    try {
      if (!p || !isDate(p.d) || typeof p.full !== 'string' || !DATAIMG.test(p.full)) continue;
      const old = PH.get(p.d); if (old && (old.at || 0) >= (+p.at || 0)) continue;
      const blob = await (await fetch(p.full)).blob();
      const thumb = typeof p.thumb === 'string' && DATAIMG.test(p.thumb) ? p.thumb : (await prepPhoto(blob)).thumb;
      await putPhoto({ d: p.d, thumb, cap: String(p.cap || '').slice(0, 120), at: +p.at || Date.now() }, await blob.arrayBuffer());
      n++;
    } catch (e) { }
  }
  if (n) lifeRefresh();
  return n;
}
PHDB.tx('meta', 'readonly', t => t.objectStore('meta').getAll())
  .then(a => { (a || []).forEach(p => { if (p && isDate(p.d) && typeof p.thumb === 'string') PH.set(p.d, p); }); if (PH.size) lifeRefresh(); })
  .catch(() => { });

/* ================= start ================= */
if (cfg.waterGoal == null) cfg.waterGoal = 8;
if (cfg.birthday == null) cfg.birthday = '';
L.visits[dkey()] = 1; saveL();
$('#tabs').innerHTML = TABS.map(([t, ic, l]) => `<button data-a="tab" data-tab="${t}" class="${t === TAB ? 'on' : ''}"><span>${ico(ic)}</span>${l}</button>`).join('');
go('today');
if (isDate(cfg.birthday) && cfg.birthday.slice(5) === dkey().slice(5) && L.seen.bday !== dkey()) { L.seen.bday = dkey(); saveL(); setTimeout(confetti, 600); }
