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

// --- 1. オープニング：空の上から、雲を抜けて街へ降りていく ---
const intro = document.querySelector('.intro');
const skyImg = document.querySelector('.sky img');
const sky = document.querySelector('.sky');
const sun = document.querySelector('.sun');
const town = document.querySelector('.town');
const townImg = document.querySelector('.town img');
const fog = document.querySelector('.fog');
const firstCopy = document.querySelector('.intro-copy.first');
const title = document.querySelector('.intro-copy.title');
const titleEn = document.querySelector('.h1-en');
const hint = document.querySelector('.scroll-hint');
const skipBtn = document.querySelector('.skip-intro');

// 雲ごとに、通り抜けるときに流れていく方向（横, 縦）
const clouds = [...document.querySelectorAll('.clouds .cloud')].map((el, i) => ({
  el,
  dir: [[-1, 0.3], [1, 0.2], [-0.4, 1], [0.6, -0.6], [-0.8, -0.7], [0.5, 1]][i],
}));

function updateIntro() {
  const rect = intro.getBoundingClientRect();
  const stageH = document.querySelector('.intro-stage').offsetHeight;
  // p：オープニングをどこまで進んだか（0＝始まり、1＝終わり）
  const p = range(-rect.top, 0, rect.height - stageH);

  // 最初の文字：スクロールし始めると、上へ消えていく
  const out = range(p, 0.04, 0.2);
  firstCopy.style.opacity = 1 - out;
  firstCopy.style.transform = `translateY(${-out * 60}px)`;
  hint.style.opacity = 1 - range(p, 0, 0.08);

  // 空の写真：雲に向かって近づいていく（大きくなる）
  skyImg.style.transform = `scale(${1 + ease(range(p, 0, 0.6)) * 1.4})`;
  sky.style.opacity = 1 - range(p, 0.5, 0.62);
  sun.style.opacity = 1 - range(p, 0.25, 0.5);

  // 雲：手前に現れて大きくなり、左右に流れていく（通り抜ける感じ）
  const cIn = range(p, 0.1, 0.32);
  const cGo = ease(range(p, 0.15, 0.62));
  const cOut = 1 - range(p, 0.55, 0.68);
  clouds.forEach(({ el, dir }) => {
    el.style.opacity = Math.min(cIn, cOut);
    el.style.transform =
      `translate(${dir[0] * cGo * 55}vw, ${dir[1] * cGo * 35}vh) scale(${1 + cGo * 3})`;
  });

  // 雲の中：一瞬、真っ白なもやに包まれる
  fog.style.opacity = Math.min(range(p, 0.36, 0.5), 1 - range(p, 0.58, 0.72));

  // 街：もやが晴れると見えてきて、少しずつ引いていく
  town.style.opacity = range(p, 0.55, 0.7);
  townImg.style.transform = `scale(${1.35 - ease(range(p, 0.55, 1)) * 0.35})`;

  // 「AOZORA」の文字：ぼやけて広がった状態から、くっきり集まる
  const t = ease(range(p, 0.7, 0.88));
  title.style.opacity = t;
  title.style.transform = `translateY(${(1 - t) * 30}px)`;
  titleEn.style.letterSpacing = `${0.3 - t * 0.24}em`;
  titleEn.style.filter = `blur(${(1 - t) * 10}px) drop-shadow(0 8px 40px rgba(0, 40, 90, 0.35))`;

  skipBtn.style.opacity = 1 - range(p, 0.9, 1);
}

// --- 2. 章：画面に入ってくるとき、写真が少しずつ引いていく ---
const chapters = document.querySelectorAll('.chapter');

function updateChapters() {
  const vh = window.innerHeight;
  chapters.forEach((ch) => {
    const top = ch.getBoundingClientRect().top;
    const z = 1 + 0.15 * range(top, 0, vh); // 下から入ってくるほど大きい → 止まると 1 に
    ch.style.setProperty('--zoom', z.toFixed(4));
  });
}

// 章の半分以上が見えたら、文字を出す
const chapterObserver = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) e.target.classList.add('is-in');
  });
}, { threshold: 0.45 });
chapters.forEach((ch) => chapterObserver.observe(ch));

// --- 3. スクロールしたときにまとめて更新（なめらかにするため、1フレームに1回だけ） ---
const toTop = document.querySelector('.to-top');
let ticking = false;

function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    if (!reduceMotion) {
      updateIntro();
      updateChapters();
    }
    toTop.classList.toggle('is-show', window.scrollY > window.innerHeight);
    ticking = false;
  });
}

window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll);
onScroll();

// --- 4. 文字の大きさ・背景色の切り替え（次に来たときも覚えておく） ---
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

// --- 5. スマホ用メニュー ---
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

// --- 6. お知らせのタブ（すべて・くらし・子育て・防災） ---
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

// --- 7. スクロールしたら、カードなどをふわっと表示 ---
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

// --- 8. 見本サイト用：リンクや検索を押したときのお知らせ ---
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

// --- 9. 1回スワイプするだけで、次の画面までゆっくり自動で進む ---
// オープニングと4つの章の部分だけ。その下の「便利なページ」は、ふつうにスクロールできる
const header = document.querySelector('.header');
let snapping = false;   // 自動で進んでいる途中か
let lockUntil = 0;      // 止まった直後の、余分なスワイプを無視する時間

// 止まる場所（画面の区切り）の一覧
function getStops() {
  const hh = header.offsetHeight;
  const stageH = document.querySelector('.intro-stage').offsetHeight;
  const chaptersTop = document.querySelector('.chapters').offsetTop;
  const stops = [
    0,                                                      // ページの一番上（雲の上）
    intro.offsetTop + intro.offsetHeight - stageH,          // 雲を抜けて「AOZORA」
  ];
  // 4つの章（章は画面に止まる作りなので、位置は「前の章の高さの合計」で計算する）
  let sum = 0;
  chapters.forEach((ch) => {
    stops.push(chaptersTop + sum - hh);
    sum += ch.offsetHeight;
  });
  stops.push(document.querySelector('.search-area').offsetTop - hh);     // 便利なページの始まり
  return stops;
}

// 自動で進む場所かどうか（便利なページより上にいるとき）
function inSnapZone(direction) {
  const stops = getStops();
  const last = stops[stops.length - 1];
  const y = window.scrollY;
  if (document.body.classList.contains('menu-open')) return false;
  return direction > 0 ? y < last - 2 : y <= last + 2 && y > 2;
}

// 指定した場所まで、ゆっくりスクロールする
function glideTo(target) {
  const start = window.scrollY;
  const distance = target - start;
  // オープニング（雲を抜ける部分）は特にゆっくり、章はふつうの速さ
  const isIntro = Math.abs(distance) > window.innerHeight * 1.5;
  const duration = isIntro ? 5000 : 1500;
  // オープニングは、速さがずっと一定に近い、おだやかな動き方にする
  const curve = isIntro ? (t) => -(Math.cos(Math.PI * t) - 1) / 2 : ease;
  const t0 = performance.now();
  snapping = true;

  function step(now) {
    const t = Math.min((now - t0) / duration, 1);
    window.scrollTo({ top: start + distance * curve(t), behavior: 'instant' });
    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      snapping = false;
      lockUntil = performance.now() + 800;
    }
  }
  requestAnimationFrame(step);
}

// 次（direction=1）または前（-1）の画面へ
function snap(direction) {
  if (snapping || performance.now() < lockUntil) return;
  const stops = getStops();
  const y = window.scrollY;
  const target = direction > 0
    ? stops.find((s) => s > y + 5)
    : [...stops].reverse().find((s) => s < y - 5);
  if (target !== undefined) glideTo(target);
}

if (!reduceMotion) {
  // マウスのホイール・トラックパッド
  window.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaY) < 4) return;
    const dir = e.deltaY > 0 ? 1 : -1;
    if (!inSnapZone(dir) && !snapping) return;
    e.preventDefault(); // ふつうのスクロールを止めて、自動で進む
    snap(dir);
  }, { passive: false });

  // スマホのスワイプ
  let touchY = null;
  window.addEventListener('touchstart', (e) => { touchY = e.touches[0].clientY; }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (touchY === null) return;
    const dir = touchY - e.touches[0].clientY > 0 ? 1 : -1;
    if (inSnapZone(dir) || snapping) e.preventDefault();
  }, { passive: false });

  window.addEventListener('touchend', (e) => {
    if (touchY === null) return;
    const dy = touchY - e.changedTouches[0].clientY;
    touchY = null;
    if (Math.abs(dy) < 30) return; // 軽くさわっただけのときは何もしない
    const dir = dy > 0 ? 1 : -1;
    if (inSnapZone(dir)) snap(dir);
  });

  // キーボード（↓・PageDown・スペースで次へ、↑・PageUp で前へ）
  window.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea')) return;
    const down = ['ArrowDown', 'PageDown', ' '].includes(e.key);
    const up = ['ArrowUp', 'PageUp'].includes(e.key);
    if (!down && !up) return;
    const dir = down ? 1 : -1;
    if (!inSnapZone(dir) && !snapping) return;
    e.preventDefault();
    snap(dir);
  });
}
