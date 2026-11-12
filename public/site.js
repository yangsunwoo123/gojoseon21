/* 고조선 — 모든 방문자에게 실행되는 스크립트: 화면 밝기(밝게 / 어둡게), 모바일 메뉴 여닫기, 프로필 이메일 복사 */
(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.add('js');

  /* 화면 밝기. 고른 적이 없으면 기기 설정을 따르고, 머리말의 단추로 바꾸면 그 선택을 이 브라우저에 기억합니다.
     기기 설정과 같은 쪽을 고르면 기억을 지우고 다시 기기 설정을 따릅니다.
     이 파일은 <head> 에서 바로 실행되므로 화면이 그려지기 전에 적용됩니다. (색은 styles.css 의 변수) */
  var KEY = 'theme';
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function saved() {
    try { var t = localStorage.getItem(KEY); return t === 'dark' || t === 'light' ? t : ''; } catch (e) { return ''; }
  }
  function sysDark() { return !!(mq && mq.matches); }
  function isDark() { var t = root.getAttribute('data-theme'); return t ? t === 'dark' : sysDark(); }
  function apply(t) {
    if (t) root.setAttribute('data-theme', t); else root.removeAttribute('data-theme');
    /* 주소창 색: 직접 골랐으면 그 색으로, 아니면 기기 설정별 색으로 */
    var metas = document.querySelectorAll('meta[name="theme-color"]');
    for (var i = 0; i < metas.length; i++) {
      var dark = t ? t === 'dark' : /dark/.test(metas[i].getAttribute('media') || '');
      metas[i].setAttribute('content', dark ? '#111110' : '#ffffff');
    }
    var btn = document.querySelector('.theme-btn');
    if (btn) {
      var say = isDark() ? '밝게 보기' : '어둡게 보기';
      btn.setAttribute('aria-label', say);
      btn.setAttribute('title', say);
    }
  }
  apply(saved());
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('.theme-btn') : null;
    if (!b) return;
    var next = isDark() ? 'light' : 'dark';
    var keep = next === (sysDark() ? 'dark' : 'light') ? '' : next;
    try { if (keep) localStorage.setItem(KEY, keep); else localStorage.removeItem(KEY); } catch (err) { /* 기억하지 못해도 이번 화면에는 적용 */ }
    apply(keep);
  });
  /* 다른 탭에서 바꿨거나 기기 설정이 바뀌면 따라갑니다. */
  window.addEventListener('storage', function (e) { if (e.key === KEY || e.key === null) apply(saved()); });
  if (mq) {
    var onSys = function () { apply(saved()); };
    if (mq.addEventListener) mq.addEventListener('change', onSys); else if (mq.addListener) mq.addListener(onSys);
  }
  document.addEventListener('DOMContentLoaded', function () { apply(saved()); });

  /* 프로필의 이메일(data-copy)을 누르면 주소를 복사하고 옆에 '복사했습니다' 를 잠깐 보여 줍니다.
     복사할 수 없는 브라우저에서는 원래 링크대로 메일 앱이 열립니다. */
  function oldCopy(text) {
    var t = document.createElement('textarea');
    t.value = text;
    t.setAttribute('readonly', '');
    t.style.position = 'fixed';
    t.style.opacity = '0';
    document.body.appendChild(t);
    t.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(t);
    return ok;
  }
  var copyTimer = 0;
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[data-copy]') : null;
    if (!a) return;
    e.preventDefault();
    var text = a.getAttribute('data-copy');
    var done = function (ok) {
      if (!ok) { location.href = a.href; return; }
      var note = a.parentNode.querySelector('[role="status"]');
      if (!note) return;
      note.textContent = '복사했습니다';
      clearTimeout(copyTimer);
      copyTimer = setTimeout(function () { note.textContent = ''; }, 2000);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(oldCopy(text)); });
    } else {
      done(oldCopy(text));
    }
  });

  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.querySelector('.menu-btn');
    var nav = document.getElementById('site-nav');
    if (!btn || !nav) return;
    function set(open) {
      nav.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    }
    btn.addEventListener('click', function () { set(btn.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { set(false); btn.focus(); }
    });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
  });
})();
