// =========================================
// あおぞら市 の動きをつけるファイル
// =========================================

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// a〜b の間で 0→1 に変わる数を返す（演出のタイミングを決める道具）
function range(p, a, b) {
  return Math.min(Math.max((p - a) / (b - a), 0), 1);
}

// 動きを「ゆっくり始まって、ゆっくり終わる」形にする
function ease(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// 速さがほぼ一定の、おだやかな動き方（雲を抜けるところ用）
function easeSine(t) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

// =========================================
// 全画面の演出（スライドのように1枚ずつ進む）
//  0：雲の上 → 1：雲を抜けて「AOZORA」 → 2〜5：4つの章
// =========================================
const cinema = document.querySelector('.cinema');
const chapters = [...document.querySelectorAll('.chapter')];
const dots = [...document.querySelectorAll('.dots button')];
const hint = document.querySelector('.cinema-hint');
const LAST = 1 + chapters.length; // 最後の画面の番号（5）

let pos = 0;            // 今どこにいるか（0〜5。途中は小数）
let gliding = false;    // 動いている途中か
let lockUntil = 0;      // 止まった直後の、余分なスワイプを無視する時間
let cinemaOn = true;    // 演出を見ているか（false＝便利なページを見ている）

// --- 1. 雲を抜けて街へ降りていく（p：0〜1） ---
const skyImg = document.querySelector('.sky img');
const sky = document.querySelector('.sky');
const sun = document.querySelector('.sun');
const town = document.querySelector('.town');
const townImg = document.querySelector('.town img');
const fog = document.querySelector('.fog');
const firstCopy = document.querySelector('.intro-copy.first');
const title = document.querySelector('.intro-copy.title');
const titleEn = document.querySelector('.h1-en');

// 雲ごとに、通り抜けるときに流れていく方向（横, 縦）
const clouds = [...document.querySelectorAll('.clouds .cloud')].map((el, i) => ({
  el,
  dir: [[-1, 0.3], [1, 0.2], [-0.4, 1], [0.6, -0.6], [-0.8, -0.7], [0.5, 1]][i],
}));

let lastP = -1; // 前回の p（同じなら描き直さない）

function updateIntro(p) {
  if (p === lastP) return; // 変わっていなければ何もしない（スマホの負担を減らす）
  lastP = p;

  // 最初の文字：進み始めると、上へ消えていく
  const out = range(p, 0.04, 0.2);
  firstCopy.style.opacity = 1 - out;
  firstCopy.style.transform = `translate3d(0, ${-out * 60}px, 0)`;

  // 空の写真：雲に向かって近づいていく（大きくなる）
  skyImg.style.transform = `scale3d(${1 + ease(range(p, 0, 0.6)) * 1.4}, ${1 + ease(range(p, 0, 0.6)) * 1.4}, 1)`;
  sky.style.opacity = 1 - range(p, 0.5, 0.62);
  sun.style.opacity = 1 - range(p, 0.25, 0.5);

  // 雲：手前に現れて大きくなり、左右に流れていく（通り抜ける感じ）
  const cIn = range(p, 0.1, 0.32);
  const cGo = ease(range(p, 0.15, 0.62));
  const cOut = 1 - range(p, 0.55, 0.68);
  clouds.forEach(({ el, dir }) => {
    el.style.opacity = Math.min(cIn, cOut);
    el.style.transform =
      `translate3d(${dir[0] * cGo * 55}vw, ${dir[1] * cGo * 35}vh, 0) scale(${1 + cGo * 3})`;
  });

  // 雲の中：一瞬、真っ白なもやに包まれる
  fog.style.opacity = Math.min(range(p, 0.36, 0.5), 1 - range(p, 0.58, 0.72));

  // 街：もやが晴れると見えてきて、少しずつ引いていく
  town.style.opacity = range(p, 0.55, 0.7);
  const z = 1.35 - ease(range(p, 0.55, 1)) * 0.35;
  townImg.style.transform = `scale3d(${z}, ${z}, 1)`;

  // 「AOZORA」の文字：少し大きい状態から、すっと浮かび上がって定位置へ
  // （ぼかしや文字の間隔を毎回変えるのは、スマホには重いので使わない）
  const t = ease(range(p, 0.7, 0.88));
  title.style.opacity = t;
  title.style.transform = `translate3d(0, ${(1 - t) * 30}px, 0) scale(${1.12 - t * 0.12})`;
}

// --- 2. 今の位置（pos）に合わせて、画面全体を描く ---
function render() {
  updateIntro(Math.min(Math.max(pos, 0), 1));

  // 章 k は、pos が k+1 → k+2 の間に、下から上へかぶさってくる
  chapters.forEach((ch, k) => {
    const t = Math.min(Math.max(pos - (k + 1), 0), 1);
    if (ch._t === t) return; // 変わっていない章は描き直さない
    ch._t = t;
    ch.style.transform = `translate3d(0, ${(1 - t) * 100}%, 0)`;
    ch.style.setProperty('--zoom', (1 + 0.15 * (1 - t)).toFixed(4)); // 入ってくるとき、写真が少し引いていく
    ch.classList.toggle('is-in', t > 0.6);
  });

  // 右の点：今いる画面に印をつける
  const now = Math.round(pos);
  dots.forEach((d, i) => d.setAttribute('aria-selected', i === now));

  // 「タップ・スワイプで次へ」は、最後の画面では消す
  hint.style.opacity = pos > LAST - 0.5 ? 0 : 1;
}

// --- 3. 指定した画面まで、ゆっくり進む ---
function glideTo(target) {
  target = Math.min(Math.max(target, 0), LAST);
  const start = pos;
  const distance = target - start;
  if (distance === 0) return;

  // 雲を抜ける部分（0↔1）は特にゆっくり。章は1枚あたり1.5秒
  const throughClouds = Math.min(start, target) < 1;
  const duration = reduceMotion ? 0 : throughClouds ? 5000 : 1500 * Math.min(Math.abs(distance), 2);
  const curve = throughClouds ? easeSine : ease;
  const t0 = performance.now();
  gliding = true;

  function step(now) {
    const t = duration === 0 ? 1 : Math.min((now - t0) / duration, 1);
    pos = start + distance * curve(t);
    render();
    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      gliding = false;
      lockUntil = performance.now() + 700;
    }
  }
  requestAnimationFrame(step);
}

// --- 4. 演出を終えて、便利なページを見る ／ 演出に戻る ---
function exitCinema(scrollTargetId) {
  cinemaOn = false;
  cinema.classList.add('is-out');
  document.documentElement.classList.remove('cinema-on');
  lockUntil = performance.now() + 1200;
  window.scrollTo({ top: 0, behavior: 'instant' });

  // 「子育ての手続きを見る」などを押したときは、その場所までスクロール
  if (scrollTargetId) {
    setTimeout(() => {
      document.getElementById(scrollTargetId)?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    }, reduceMotion ? 0 : 700);
  }
}

function enterCinema(toPos) {
  window.scrollTo({ top: 0, behavior: 'instant' });
  cinemaOn = true;
  cinema.classList.remove('is-out');
  document.documentElement.classList.add('cinema-on');
  lockUntil = performance.now() + 1200;
  if (toPos !== undefined) {
    pos = toPos;
    render();
  }
}

// --- 5. 次へ（dir=1）・前へ（dir=-1） ---
function go(dir) {
  if (gliding || performance.now() < lockUntil) return;

  if (cinemaOn) {
    if (dir > 0) {
      if (pos >= LAST - 0.01) exitCinema();       // 最後の画面の次は、便利なページへ
      else glideTo(Math.round(pos) + 1);
    } else if (pos > 0.01) {
      glideTo(Math.round(pos) - 1);
    }
  } else if (dir < 0 && window.scrollY <= 0) {
    enterCinema(); // 便利なページの一番上で、さらに上に戻すと演出に戻る
  }
}

// --- 6. 操作の受け取り ---
document.documentElement.classList.add('cinema-on');
render();

// 演出は、この端末で初めて開いたときだけ。2回目からは便利なページから始める
// （ページの一番上で、さらに上へ戻すと演出も見られます）
if (load('aozora-intro-seen')) {
  cinema.style.transition = 'none';
  exitCinema();
  requestAnimationFrame(() => requestAnimationFrame(() => { cinema.style.transition = ''; }));
} else {
  save('aozora-intro-seen', '1');
}

// マウスのホイール・トラックパッド
window.addEventListener('wheel', (e) => {
  if (Math.abs(e.deltaY) < 4) return;
  const dir = e.deltaY > 0 ? 1 : -1;
  if (cinemaOn || (dir < 0 && window.scrollY <= 0)) {
    e.preventDefault();
    go(dir);
  }
}, { passive: false });

// スマホのスワイプ
let touchY = null;
window.addEventListener('touchstart', (e) => { touchY = e.touches[0].clientY; }, { passive: true });

window.addEventListener('touchmove', (e) => {
  if (cinemaOn) e.preventDefault(); // 演出中は、画面がぐらぐら動かないように
}, { passive: false });

window.addEventListener('touchend', (e) => {
  if (touchY === null) return;
  const dy = touchY - e.changedTouches[0].clientY;
  touchY = null;
  if (Math.abs(dy) < 30) return; // 軽くさわっただけ（タップ）は、下の click で処理する
  const dir = dy > 0 ? 1 : -1;
  if (cinemaOn || (dir < 0 && window.scrollY <= 0)) go(dir);
});

// タップ（クリック）：ボタンやリンク以外の場所なら、次の画面へ
cinema.addEventListener('click', (e) => {
  if (e.target.closest('a, button')) return;
  go(1);
});

// 章の中のリンク（「子育ての手続きを見る」など）：演出を終えて、その場所へ
cinema.querySelectorAll('.chapter-link').forEach((a) => {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    exitCinema(a.getAttribute('href').slice(1));
  });
});

// スキップボタン
document.querySelector('.skip-intro').addEventListener('click', () => exitCinema());

// 右の点：押した画面へ
dots.forEach((d, i) => d.addEventListener('click', () => {
  if (!gliding) glideTo(i);
}));

// キーボード（↓・PageDown・スペース・Enter で次へ、↑・PageUp で前へ、Esc でスキップ）
window.addEventListener('keydown', (e) => {
  if (!cinemaOn) return;
  if (e.target.closest('input, textarea')) return;
  if (['ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); go(1); }
  if (['ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); go(-1); }
  if (e.key === 'Escape') exitCinema();
});

// ヘッダーのロゴ「あおぞら市」：演出の最初に戻る
document.querySelector('.header .logo').addEventListener('click', (e) => {
  e.preventDefault();
  enterCinema(0);
});

// 画面の大きさが変わったら、描き直す
window.addEventListener('resize', render);

// =========================================
// ここから下は、便利なページ部分
// =========================================

// --- 7. 上に戻るボタン ---
const toTop = document.querySelector('.to-top');

window.addEventListener('scroll', () => {
  toTop.classList.toggle('is-show', window.scrollY > window.innerHeight * 0.6);
}, { passive: true });

toTop.addEventListener('click', (e) => {
  e.preventDefault();
  window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
});

// --- 8. 文字の大きさ・背景色の切り替え（次に来たときも覚えておく） ---
function save(key, value) {
  try { localStorage.setItem(key, value); } catch (e) { /* 保存できなくても動くように */ }
}

function load(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}

function setSize(size) {
  document.documentElement.classList.toggle('text-large', size === 'large');
  document.querySelectorAll('[data-size]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.size === size));
  save('aozora-size', size);
}

function setTheme(theme) {
  document.body.classList.toggle('contrast', theme === 'contrast');
  document.querySelectorAll('[data-theme]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.theme === theme));
  save('aozora-theme', theme);
}

document.querySelectorAll('[data-size]').forEach((b) => b.addEventListener('click', () => setSize(b.dataset.size)));
document.querySelectorAll('[data-theme]').forEach((b) => b.addEventListener('click', () => setTheme(b.dataset.theme)));
setSize(load('aozora-size') || 'normal');
setTheme(load('aozora-theme') || 'normal');

// --- 9. スマホ用メニュー ---
const toggle = document.querySelector('.menu-toggle');

toggle.addEventListener('click', () => {
  const open = document.body.classList.toggle('menu-open');
  toggle.setAttribute('aria-expanded', open);
  toggle.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
});

document.querySelectorAll('.nav a').forEach((a) => a.addEventListener('click', () => {
  document.body.classList.remove('menu-open');
  toggle.setAttribute('aria-expanded', false);
}));

// --- 10. お知らせのタブ（すべて・くらし・子育て・防災） ---
const tabs = document.querySelectorAll('.tabs button');

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    tabs.forEach((t) => t.setAttribute('aria-selected', t === tab));
    const f = tab.dataset.filter;
    document.querySelectorAll('.news-list li').forEach((li) => {
      li.hidden = !(f === 'all' || li.dataset.cat === f);
    });
  });
});

// --- 11. スクロールしたら、カードなどをふわっと表示 ---
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) {
      e.target.classList.add('is-visible');
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.section-title, .life-grid li, .field-grid li, .bousai-card, .event-card, .mayor-card, .mayor-side, .office-grid > *').forEach((el) => {
  el.classList.add('reveal');
  const siblings = [...el.parentElement.children];
  el.style.setProperty('--delay', `${Math.min(siblings.indexOf(el), 7) * 0.06}s`);
  revealObserver.observe(el);
});

// --- 12. 見本サイト用：リンクや検索を押したときのお知らせ ---
const toast = document.querySelector('.toast');
let toastTimer;

function showToast() {
  toast.textContent = 'ポートフォリオ用の見本サイトのため、このページはありません。';
  toast.classList.add('is-show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-show'), 3000);
}

document.querySelectorAll('[data-demo]').forEach((el) => el.addEventListener('click', (e) => {
  e.preventDefault();
  showToast();
}));

document.querySelector('[data-demo-form]').addEventListener('submit', (e) => {
  e.preventDefault();
  showToast();
});

// --- お知らせ：Google スプレッドシートから読み込む ---
// ▼ スプレッドシートを「ウェブに公開」したときの CSV のアドレスを、'' の中に貼ります。
//   空のままなら、HTML に書いてある見本のお知らせがそのまま出ます。
//   表の形：1行目は見出し（日付・ラベル・お知らせ）、2行目から上に新しいものを書く
const NEWS_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRCJ99g4DxrZCU9Rx0_8twRX28DuOjELGq_rT8gel73toSpZhRA4YOhKZU22aOTtJEpyS37MrGNCc80/pub?gid=0&single=true&output=csv';
const NEWS_MAX = 8; // 表示するお知らせの数（上から順に）

// CSV（カンマ区切りの文字）を、表の形（行と列）に直す
function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

// 表を読んで [{ date, tag, text }, ...] にする。読めないときは null（見本のお知らせのまま）
async function fetchNews() {
  if (!NEWS_SHEET_URL) return null;
  try {
    const res = await fetch(NEWS_SHEET_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(res.status);
    const items = parseCSV(await res.text())
      .slice(1)
      .map((r) => ({ date: (r[0] || '').trim(), tag: (r[1] || '').trim(), text: (r[2] || '').trim() }))
      .filter((n) => n.text)
      .slice(0, NEWS_MAX);
    return items.length ? items : null;
  } catch (err) {
    console.warn('お知らせを読み込めませんでした', err);
    return null;
  }
}

// 「2026.11.10」「2026/11/10」「2026年11月10日」を、機械が読める日付（2026-11-10）にする
function toISODate(s) {
  const m = s.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  return m ? `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : '';
}

// 文字は textContent で入れる（表に何を書かれても、安全に文字として出す）
function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text != null) e.textContent = text;
  return e;
}

// ラベルの列に「くらし」「子育て」「防災」のどれかを書くと、そのタブに入る
const NEWS_CATS = { 'くらし': 'kurashi', '子育て': 'kosodate', '防災': 'bousai' };

async function loadNews() {
  const list = document.getElementById('news-list');
  const items = await fetchNews();
  if (!list || !items) return;
  list.replaceChildren(...items.map((n) => {
    const cat = NEWS_CATS[n.tag] || '';
    const li = el('li');
    if (cat) li.dataset.cat = cat;
    const time = el('time', '', n.date);
    const iso = toISODate(n.date);
    if (iso) time.dateTime = iso;
    const link = el('a', '', n.text);
    link.href = '#';
    link.addEventListener('click', (e) => { e.preventDefault(); showToast(); });
    li.append(time, el('span', `cat ${cat}`.trim(), n.tag), link);
    return li;
  }));
  // 今選ばれているタブに合わせて、表示をしぼり直す
  const active = document.querySelector('.tabs button[aria-selected="true"]');
  if (active) active.click();
}

loadNews();
