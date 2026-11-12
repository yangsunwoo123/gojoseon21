/* 고조선 — 모든 방문자에게 실행되는 스크립트: 모바일 메뉴 여닫기, 프로필 이메일 복사 */
(function () {
  'use strict';
  document.documentElement.classList.add('js');

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
