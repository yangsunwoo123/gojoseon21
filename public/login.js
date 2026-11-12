/* 고조선 — 로그인 / 계정 화면 */
(function () {
  'use strict';

  function post(url, body) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body || {})
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, status: r.status, body: j }; });
    }, function () {
      return { ok: false, status: 0, body: { error: '서버에 연결하지 못했습니다. 잠시 뒤 다시 시도해 주세요.' } };
    });
  }

  function wire(form, handler) {
    if (!form) return;
    var msg = form.querySelector('.form__msg');
    var btn = form.querySelector('button[type="submit"]');
    function say(text, ok) {
      msg.textContent = text;
      msg.hidden = !text;
      msg.classList.toggle('ok', !!ok);
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      say('');
      btn.disabled = true;
      Promise.resolve(handler(new FormData(form), say)).then(function () { btn.disabled = false; });
    });
  }

  wire(document.getElementById('login-form'), function (data, say) {
    var username = String(data.get('username') || '').trim();
    var password = String(data.get('password') || '');
    if (!username || !password) { say('아이디와 비밀번호를 입력해 주세요.'); return; }
    return post('/api/login', { username: username, password: password }).then(function (r) {
      /* 임시 비밀번호로 들어왔으면 이 화면을 다시 열어 새 비밀번호를 정하게 합니다. */
      if (r.ok) { location.href = r.body.mustChange ? '/login' : '/'; return; }
      say(r.body.error || '로그인하지 못했습니다.');
    });
  });

  wire(document.getElementById('pw-form'), function (data, say) {
    var current = String(data.get('current') || '');
    var next = String(data.get('next') || '');
    if (!current || !next) { say('비밀번호를 입력해 주세요.'); return; }
    if (next.length < 10) { say('새 비밀번호는 10자 이상이어야 합니다.'); return; }
    if (next !== String(data.get('again') || '')) { say('새 비밀번호가 서로 다릅니다.'); return; }
    return post('/api/password', { current: current, next: next }).then(function (r) {
      if (r.ok) {
        /* 임시 비밀번호를 본인 비밀번호로 바꾼 직후에는 바로 편집할 수 있도록 홈으로 갑니다. */
        if (document.getElementById('pw-form').hasAttribute('data-first')) { location.href = '/'; return; }
        document.getElementById('pw-form').reset();
        say('비밀번호를 바꿨습니다. 다른 기기에서는 다시 로그인해야 합니다.', true);
        return;
      }
      say(r.body.error || '비밀번호를 바꾸지 못했습니다.');
    });
  });

  var out = document.getElementById('logout');
  if (out) {
    out.addEventListener('click', function () {
      out.disabled = true;
      post('/api/logout').then(function () { location.href = '/'; });
    });
  }
})();
