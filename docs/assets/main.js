/* ============================================================
   main.js · 站点行为（零依赖，手搓）
   主题切换 / 侧边栏渲染 / 页内目录 / 阅读进度 / 代码高亮 /
   复制按钮 / 章节导航 / 已读标记 / 首页渲染
   ============================================================ */
(function () {
  'use strict';

  var DONE_KEY = 'k8c-done';
  var THEME_KEY = 'k8c-theme';

  /* ---------- 已读进度 ---------- */

  function getDone() {
    try { return JSON.parse(localStorage.getItem(DONE_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function setDone(num, on) {
    var d = getDone();
    if (on) d[num] = 1; else delete d[num];
    try { localStorage.setItem(DONE_KEY, JSON.stringify(d)); } catch (e) {}
  }

  /* ---------- 主题 ---------- */

  function initTheme() {
    var btn = document.getElementById('themeToggle');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var cur = document.documentElement.getAttribute('data-theme') || 'light';
      var next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
      window.dispatchEvent(new CustomEvent('k8c:themechange'));
    });
  }

  /* ---------- 阅读进度条 ---------- */

  function initProgress() {
    var bar = document.getElementById('progress');
    if (!bar) return;
    function update() {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + '%';
    }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ---------- 侧边栏 ---------- */

  function initSidebar() {
    var nav = document.getElementById('sidebarNav');
    if (!nav) return;
    var page = document.body.getAttribute('data-page');
    var done = getDone();
    var html = '';

    K8C.groups.forEach(function (g) {
      var items = K8C.chapters.filter(function (c) { return c.group === g.id; });
      if (!items.length) return;
      html += '<div class="nav-group"><div class="nav-group-title">' + g.label + '</div>';
      items.forEach(function (c) {
        var cls = 'nav-link';
        var inner = (c.num ? '<span class="num">' + c.num + '</span>' : '<span class="num">·</span>') +
                    '<span>' + c.title + '</span>' +
                    (done[c.num || c.file] ? '<span class="nav-done">✓</span>' : '');
        if (!c.ready) {
          cls += ' locked';
          html += '<span class="' + cls + '" title="待写">' + inner + '</span>';
        } else {
          if (page === c.num || page === c.file) cls += ' active';
          html += '<a class="' + cls + '" href="' + c.file + '">' + inner + '</a>';
        }
      });
      html += '</div>';
    });

    html += '<div class="nav-group"><div class="nav-group-title">项目</div>' +
            '<a class="nav-link" href="index.html"><span class="num">⌂</span><span>返回首页</span></a></div>';
    nav.innerHTML = html;
  }

  function initNavToggle() {
    var btn = document.getElementById('navToggle');
    if (!btn) return;
    btn.addEventListener('click', function () {
      document.body.classList.toggle('nav-open');
    });
    var scrim = document.querySelector('.nav-scrim');
    if (scrim) scrim.addEventListener('click', function () {
      document.body.classList.remove('nav-open');
    });
  }

  /* ---------- 顶栏章节名 ---------- */

  function initTopbarTitle() {
    var el = document.querySelector('.topbar-chapter');
    var page = document.body.getAttribute('data-page');
    if (!el || !page) return;
    var c = K8C.chapterById(page);
    if (c) el.textContent = (c.num ? c.num + ' · ' : '') + c.title;
  }

  /* ---------- 页内目录 + 滚动高亮 ---------- */

  function initPageToc() {
    var box = document.getElementById('pageToc');
    var content = document.querySelector('.content');
    if (!box || !content) return;
    var heads = content.querySelectorAll('h2, h3');
    if (!heads.length) { box.style.display = 'none'; return; }

    var html = '<div class="page-toc-title">本页目录</div>';
    heads.forEach(function (h, i) {
      if (!h.id) h.id = 'sec-' + i;
      html += '<a href="#' + h.id + '" class="lvl-' + (h.tagName === 'H2' ? 2 : 3) +
              '" data-target="' + h.id + '">' + h.textContent + '</a>';
    });
    box.innerHTML = html;

    var links = box.querySelectorAll('a');
    var byId = {};
    links.forEach(function (a) { byId[a.getAttribute('data-target')] = a; });

    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          links.forEach(function (a) { a.classList.remove('active'); });
          var a = byId[en.target.id];
          if (a) a.classList.add('active');
        }
      });
    }, { rootMargin: '-15% 0px -75% 0px' });

    heads.forEach(function (h) { obs.observe(h); });
  }

  /* ---------- 代码高亮（迷你手搓版） ---------- */

  var RULES = {
    yaml: {
      re: /(#[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(^[ \t]*(?:-[ \t]+)?)([A-Za-z_$][\w$.\-\/]*)(?=[ \t]*:)|\b(true|false|null|yes|no)\b|\b(\d+(?:\.\d+)?[KMGmKi]?)\b/gm,
      map: ['tok-com', 'tok-str', null, 'tok-key', 'tok-num', 'tok-num']
    },
    bash: {
      re: /(#[^\n]*)|("(?:[^"\\]|\\.)*"|'[^']*')|(^[ \t]*\$?[ \t]*)([A-Za-z_][\w.-]*)|(\s-{1,2}[A-Za-z][\w-]*)/gm,
      map: ['tok-com', 'tok-str', null, 'tok-fn', 'tok-flag']
    },
    go: {
      re: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|(`[^`]*`|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|\b(func|for|range|if|else|return|package|import|type|struct|interface|map|chan|go|defer|switch|case|var|const|nil|true|false)\b|([A-Za-z_]\w*)(?=\()|\b(\d+(?:\.\d+)?)\b/g,
      map: ['tok-com', 'tok-str', 'tok-key', 'tok-fn', 'tok-num']
    },
    json: {
      re: /("(?:[^"\\]|\\.)*")(?=\s*:)|("(?:[^"\\]|\\.)*")|\b(true|false|null)\b|(-?\d+(?:\.\d+)?)/g,
      map: ['tok-key', 'tok-str', 'tok-key', 'tok-num']
    }
  };

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function highlight(code, lang) {
    var rule = RULES[lang];
    if (!rule) return esc(code);
    var out = '', last = 0, m;
    rule.re.lastIndex = 0;
    while ((m = rule.re.exec(code)) !== null) {
      if (m[0].length === 0) { rule.re.lastIndex++; continue; }
      out += esc(code.slice(last, m.index));
      // 按顺序输出所有命中的分组（前缀组不上色，token 组上色），
      // 拼起来恰好等于完整匹配，避免吞字
      for (var g = 1; g < m.length; g++) {
        if (m[g] === undefined) continue;
        var cls = rule.map[g - 1];
        out += cls ? '<span class="' + cls + '">' + esc(m[g]) + '</span>' : esc(m[g]);
      }
      last = m.index + m[0].length;
    }
    out += esc(code.slice(last));
    return out;
  }

  function initCodeBlocks() {
    document.querySelectorAll('.code-block').forEach(function (block) {
      var pre = block.querySelector('pre');
      var codeEl = block.querySelector('code');
      if (!pre || !codeEl) return;
      var lang = block.getAttribute('data-lang') || '';
      var file = block.getAttribute('data-file') || '';
      var raw = codeEl.textContent.replace(/^\n/, '');

      codeEl.innerHTML = highlight(raw, lang);

      var head = document.createElement('div');
      head.className = 'code-head';
      head.innerHTML =
        '<span class="lang">' + esc(lang || 'text') + '</span>' +
        (file ? '<span class="filename">' + esc(file) + '</span>' : '') +
        '<span class="spacer"></span>';

      var btn = document.createElement('button');
      btn.className = 'copy-btn';
      btn.type = 'button';
      btn.textContent = '复制';
      btn.addEventListener('click', function () {
        var done = function () {
          btn.textContent = '已复制 ✓';
          btn.classList.add('done');
          setTimeout(function () { btn.textContent = '复制'; btn.classList.remove('done'); }, 1600);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(raw).then(done, done);
        } else {
          var ta = document.createElement('textarea');
          ta.value = raw; document.body.appendChild(ta); ta.select();
          try { document.execCommand('copy'); } catch (e) {}
          document.body.removeChild(ta); done();
        }
      });

      head.appendChild(btn);
      block.insertBefore(head, pre);
    });
  }

  /* ---------- 上一章 / 下一章 ---------- */

  function initChapterNav() {
    var box = document.getElementById('chapterNav');
    var page = document.body.getAttribute('data-page');
    if (!box || !page) return;
    var ready = K8C.chapters.filter(function (c) { return c.ready; });
    var idx = ready.findIndex(function (c) { return c.num === page || c.file === page; });
    var html = '';

    if (idx > 0) {
      var p = ready[idx - 1];
      html += '<a class="prev" href="' + p.file + '"><div class="dir">← 上一章</div>' +
              '<div class="title">' + (p.num ? p.num + ' · ' : '') + p.title + '</div></a>';
    } else {
      html += '<a class="prev" href="index.html"><div class="dir">← 返回</div><div class="title">首页</div></a>';
    }
    if (idx >= 0 && idx < ready.length - 1) {
      var n = ready[idx + 1];
      html += '<a class="next" href="' + n.file + '"><div class="dir">下一章 →</div>' +
              '<div class="title">' + (n.num ? n.num + ' · ' : '') + n.title + '</div></a>';
    }
    box.innerHTML = html;
  }

  /* ---------- 标记已读 ---------- */

  function initMarkDone() {
    var box = document.querySelector('.mark-done');
    var page = document.body.getAttribute('data-page');
    if (!box || !page) return;
    var btn = box.querySelector('button');
    var done = getDone();

    function paint() {
      var on = !!done[page];
      btn.classList.toggle('done', on);
      btn.textContent = on ? '✓ 已读完本章' : '读完本章，打个卡';
    }
    btn.addEventListener('click', function () {
      done[page] ? delete done[page] : (done[page] = 1);
      setDone(page, !!done[page]);
      paint();
      initSidebar();
    });
    paint();
  }

  /* ---------- 首页渲染 ---------- */

  function initHome() {
    var grid = document.getElementById('homeChapters');
    if (!grid) return;
    var done = getDone();
    var html = '';

    K8C.groups.forEach(function (g) {
      var items = K8C.chapters.filter(function (c) { return c.group === g.id; });
      if (!items.length) return;
      html += '<section class="home-section"><h2>' + g.label + '</h2><div class="card-grid">';
      items.forEach(function (c) {
        var key = c.num || c.file;
        var cls = 'ch-card' + (c.group === 'main' ? ' core' : '') +
                  (c.ready ? '' : ' locked') + (done[key] ? ' is-done' : '');
        var meta = (c.mins ? '约 ' + c.mins + ' 分钟' : '') +
                   (c.ready ? '' : ' · 施工中');
        if (c.ready) {
          html += '<a class="' + cls + '" href="' + c.file + '" data-ch="' + key + '">' +
                  '<span class="done-badge">✓</span>' +
                  '<span class="ch-num">' + (c.num || '附') + '</span>' +
                  '<span class="ch-title">' + c.title + '</span>' +
                  '<span class="ch-desc">' + c.desc + '</span>' +
                  '<span class="ch-meta">' + meta + '</span></a>';
        } else {
          html += '<div class="' + cls + '" data-ch="' + key + '">' +
                  '<span class="done-badge">✓</span>' +
                  '<span class="ch-num">' + (c.num || '附') + '</span>' +
                  '<span class="ch-title">' + c.title + '</span>' +
                  '<span class="ch-desc">' + c.desc + '</span>' +
                  '<span class="ch-meta">' + meta + '</span></div>';
        }
      });
      html += '</div></section>';
    });
    grid.innerHTML = html;
    updateHomeStats();
  }

  function updateHomeStats() {
    var el = document.getElementById('statDone');
    if (!el) return;
    var done = getDone();
    var readyTotal = K8C.chapters.filter(function (c) { return c.ready; }).length;
    var doneCount = Object.keys(done).length;
    el.textContent = doneCount + ' / ' + readyTotal;
  }

  /* ---------- 术语首次出现链接（B 级：顺带名词，只挂链接不放假） ---------- */

  var TERM_SKIP_PAGES = { 'glossary': 1, 'cheatsheet': 1 };

  function termExcluded(node) {
    var el = node.parentElement;
    if (!el) return true;
    return !!el.closest('pre, code, a, h1, h2, h3, h4, .diagram, .callout.term, .code-head');
  }

  function termIndexOf(text, name) {
    var i = text.indexOf(name);
    while (i >= 0) {
      var before = i > 0 ? text.charAt(i - 1) : '';
      var after = text.charAt(i + name.length) || '';
      if (!/[A-Za-z0-9_]/.test(before) && !/[A-Za-z0-9_]/.test(after)) return i;
      i = text.indexOf(name, i + 1);
    }
    return -1;
  }

  function termBoxed(content, name) {
    var titles = content.querySelectorAll('.callout.term .callout-title');
    for (var i = 0; i < titles.length; i++) {
      if (titles[i].textContent.indexOf(name) >= 0) return true;
    }
    return false;
  }

  function initTermLinks() {
    var content = document.querySelector('.content');
    if (!content || !K8C.terms) return;
    var page = document.body.getAttribute('data-page');
    if (TERM_SKIP_PAGES[page]) return;
    var cur = K8C.chapterById(page);

    var terms = K8C.terms.slice().sort(function (a, b) { return b.name.length - a.name.length; });

    terms.forEach(function (term) {
      var ch = K8C.chapterById(term.target);
      if (!ch) return;
      if (cur && cur.file === ch.file) return;        /* 本页就是详解章，不挂自链 */
      if (termBoxed(content, term.name)) return;     /* 本页的名词提示框已覆盖 */
      var walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT, null);
      var node;
      while ((node = walker.nextNode())) {
        if (termExcluded(node)) continue;
        var idx = termIndexOf(node.nodeValue, term.name);
        if (idx < 0) continue;
        var range = document.createRange();
        range.setStart(node, idx);
        range.setEnd(node, idx + term.name.length);
        var a = document.createElement('a');
        a.className = 'term-link';
        a.href = ch.file;
        a.title = '详见 ' + ch.num + ' · ' + ch.title;
        range.surroundContents(a);
        break;                                        /* 每术语每页只链一次 */
      }
    });
  }

  /* ---------- 启动 ---------- */

  document.addEventListener('DOMContentLoaded', function () {
    initTheme();
    initProgress();
    initSidebar();
    initNavToggle();
    initTopbarTitle();
    initPageToc();
    initTermLinks();
    initCodeBlocks();
    initChapterNav();
    initMarkDone();
    initHome();
  });
})();
