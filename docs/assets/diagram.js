/* ============================================================
   diagram.js · 数据驱动的 Canvas 图表引擎（零依赖，手搓）

   用法：
     K8CDiagram.mount('#fig-xxx', {
       width: 880, height: 520,
       groups: [{ x,y,w,h, label }],                 // 虚线分组框（左上角坐标）
       nodes:  [{ id, x, y, w, h, label, sub, kind, color }],
                                                       // x,y 为中心点
                                                       // kind: box|hub|store|pill|ghost
                                                       // color: accent|ok|warn|danger
       edges:  [{ from, to, label, kind, color }],   // kind: solid|dashed|bidir
       notes:  [{ x, y, text, color }],               // 自由文字标注
       steps:  [{ from, to, label }]                  // 动画演示序列（可选）
     });

   主题切换时自动重绘（监听 k8c:themechange 事件）。
   ============================================================ */
window.K8C = window.K8C || {};

(function () {
  'use strict';

  var registry = [];

  /* ---------- 工具 ---------- */

  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  function theme() {
    return {
      text:    cssVar('--text', '#1b2333'),
      soft:    cssVar('--text-soft', '#4c586c'),
      mute:    cssVar('--text-mute', '#7c8798'),
      accent:  cssVar('--accent', '#326ce5'),
      border:  cssVar('--border', '#e3e8f0'),
      borderS: cssVar('--border-strong', '#cfd7e4'),
      surface: cssVar('--surface', '#ffffff'),
      bgAlt:   cssVar('--bg-alt', '#f6f8fc'),
      ok:      cssVar('--ok', '#1a7f4b'),
      warn:    cssVar('--warn', '#96690a'),
      danger:  cssVar('--danger', '#b3261e'),
      font: '"PingFang SC", -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif',
      mono: 'ui-monospace, Menlo, Consolas, monospace'
    };
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function withAlpha(hex, alpha) {
    // 支持 #rgb / #rrggbb
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    if (isNaN(n)) return hex;
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + alpha + ')';
  }

  function colorOf(t, name) {
    return name ? (t[name] || name) : null;
  }

  /* ---------- 几何 ---------- */

  // 从节点中心朝目标点方向，求矩形边界交点
  function anchor(n, toward) {
    var dx = toward.x - n.x, dy = toward.y - n.y;
    if (dx === 0 && dy === 0) return { x: n.x, y: n.y };
    var hw = n.w / 2 + 3, hh = n.h / 2 + 3;
    var s = Math.min(hw / Math.abs(dx || 1e-9), hh / Math.abs(dy || 1e-9));
    return { x: n.x + dx * s, y: n.y + dy * s };
  }

  // 边的两个端点；bow 为垂直方向的平行偏移（用于同节点对之间的往返边）
  function edgePoints(e, a, b) {
    var p1 = anchor(a, b), p2 = anchor(b, a);
    var off = e.bow || 0;
    if (off) {
      var dx = p2.x - p1.x, dy = p2.y - p1.y;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      var nx = -dy / len * off, ny = dx / len * off;
      p1 = { x: p1.x + nx, y: p1.y + ny };
      p2 = { x: p2.x + nx, y: p2.y + ny };
    }
    return { p1: p1, p2: p2 };
  }

  function arrowHead(ctx, x, y, ang, size, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size, size * 0.42);
    ctx.lineTo(-size * 0.78, 0);
    ctx.lineTo(-size, -size * 0.42);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  /* ---------- 绘制 ---------- */

  function drawNode(ctx, n, t, state) {
    var x = n.x - n.w / 2, y = n.y - n.h / 2;
    var active = state && state.active && state.active[n.id];
    var dim = state && state.dim && state.dim[n.id];
    var accent = colorOf(t, n.color) || t.borderS;

    ctx.save();
    if (dim) ctx.globalAlpha = 0.35;

    if (n.kind === 'store') {
      // 圆柱体（etcd 等存储）
      var ry = Math.min(n.h * 0.22, 12);
      ctx.beginPath();
      ctx.moveTo(x, y + ry);
      ctx.lineTo(x, y + n.h - ry);
      ctx.ellipse(n.x, y + n.h - ry, n.w / 2, ry, 0, Math.PI, 0, true);
      ctx.lineTo(x + n.w, y + ry);
      ctx.ellipse(n.x, y + ry, n.w / 2, ry, 0, 0, Math.PI, true);
      ctx.closePath();
      ctx.fillStyle = t.surface;
      ctx.fill();
      ctx.strokeStyle = active ? t.accent : (n.color ? accent : '#e8a33d');
      ctx.lineWidth = active ? 2.4 : 1.6;
      ctx.stroke();
      // 顶盖
      ctx.beginPath();
      ctx.ellipse(n.x, y + ry, n.w / 2, ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = t.bgAlt;
      ctx.fill();
      ctx.stroke();
    } else {
      var r = n.kind === 'pill' ? n.h / 2 : 9;
      roundRect(ctx, x, y, n.w, n.h, r);
      if (n.kind === 'hub') {
        ctx.fillStyle = t.accent;
        ctx.fill();
        if (active) {
          ctx.shadowColor = withAlpha(t.accent, 0.55);
          ctx.shadowBlur = 18;
        }
        ctx.strokeStyle = t.accent;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (n.kind === 'ghost') {
        ctx.fillStyle = t.surface;
        ctx.fill();
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = t.borderS;
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        ctx.fillStyle = t.surface;
        ctx.fill();
        if (n.color) {
          ctx.fillStyle = withAlpha(accent, 0.09);
          ctx.fill();
        }
        ctx.strokeStyle = active ? t.accent : (n.color ? accent : t.borderS);
        ctx.lineWidth = active ? 2.4 : 1.5;
        if (active) {
          ctx.shadowColor = withAlpha(t.accent, 0.4);
          ctx.shadowBlur = 12;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }

    // 文本（label 支持 \n 多行；sub 为次行小字）
    var lines = String(n.label || '').split('\n');
    var hasSub = !!n.sub;
    var labelSize = n.kind === 'hub' ? 15 : 13.5;
    var lineH = labelSize * 1.42;
    var subH = hasSub ? 15 : 0;
    var total = lines.length * lineH + subH;
    var ty = n.y - total / 2 + lineH * 0.78;
    var mainColor = n.kind === 'hub' ? '#ffffff' : t.text;

    ctx.textAlign = 'center';
    ctx.font = '600 ' + labelSize + 'px ' + t.font;
    ctx.fillStyle = mainColor;
    for (var i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], n.x, ty);
      ty += lineH;
    }
    if (hasSub) {
      ctx.font = '400 11px ' + t.mono;
      ctx.fillStyle = n.kind === 'hub' ? 'rgba(255,255,255,.82)' : t.mute;
      ctx.fillText(n.sub, n.x, ty + 1);
    }
    ctx.restore();
  }

  function drawEdge(ctx, e, nodesById, t, state) {
    var a = nodesById[e.from], b = nodesById[e.to];
    if (!a || !b) return;
    var pts = edgePoints(e, a, b);
    var p1 = pts.p1, p2 = pts.p2;
    var ang = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    var col = colorOf(t, e.color) || t.borderS;
    var active = state && state.activeEdge &&
                 state.activeEdge.from === e.from && state.activeEdge.to === e.to;

    ctx.save();
    ctx.strokeStyle = active ? t.accent : col;
    ctx.lineWidth = active ? 2.4 : 1.6;
    if (e.kind === 'dashed') ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.setLineDash([]);

    var hs = active ? 10 : 8.5;
    arrowHead(ctx, p2.x, p2.y, ang, hs, active ? t.accent : col);
    if (e.kind === 'bidir') {
      arrowHead(ctx, p1.x, p1.y, ang + Math.PI, hs, active ? t.accent : col);
    }

    if (e.label) {
      var mx = (p1.x + p2.x) / 2 + (e.labelDx || 0);
      var my = (p1.y + p2.y) / 2 + (e.labelDy || 0);
      e._labelPos = { x: mx, y: my };
    }
    ctx.restore();
  }

  // 标签单独一层，画在节点之后，避免被节点盖住
  function drawEdgeLabel(ctx, e, t, state) {
    if (!e.label || !e._labelPos) return;
    var mx = e._labelPos.x, my = e._labelPos.y;
    var active = state && state.activeEdge &&
                 state.activeEdge.from === e.from && state.activeEdge.to === e.to;
    ctx.save();
    ctx.font = '500 11.5px ' + t.font;
    var w = ctx.measureText(e.label).width + 14;
    roundRect(ctx, mx - w / 2, my - 10, w, 19, 9.5);
    ctx.fillStyle = t.bgAlt;
    ctx.fill();
    ctx.strokeStyle = active ? t.accent : t.border;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = active ? t.accent : t.soft;
    ctx.textAlign = 'center';
    ctx.fillText(e.label, mx, my + 3.6);
    ctx.restore();
  }

  function drawBase(ctx, spec, t, state) {
    ctx.clearRect(0, 0, spec.width, spec.height);
    var nodesById = {};
    spec.nodes.forEach(function (n) { nodesById[n.id] = n; });

    // 分组框
    (spec.groups || []).forEach(function (g) {
      ctx.save();
      roundRect(ctx, g.x, g.y, g.w, g.h, 12);
      ctx.fillStyle = withAlpha(colorOf(t, g.color) || t.borderS, 0.045);
      ctx.fill();
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = withAlpha(colorOf(t, g.color) || t.borderS, 0.5);
      ctx.lineWidth = 1.3;
      ctx.stroke();
      ctx.setLineDash([]);
      if (g.label) {
        ctx.font = '600 11.5px ' + t.font;
        var w = ctx.measureText(g.label).width + 16;
        roundRect(ctx, g.x + 14, g.y - 10, w, 20, 10);
        ctx.fillStyle = t.bgAlt;
        ctx.fill();
        ctx.strokeStyle = t.border;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = t.soft;
        ctx.textAlign = 'center';
        ctx.fillText(g.label, g.x + 14 + w / 2, g.y + 4);
      }
      ctx.restore();
    });

    spec.edges.forEach(function (e) { drawEdge(ctx, e, nodesById, t, state); });
    spec.nodes.forEach(function (n) { drawNode(ctx, n, t, state); });
    spec.edges.forEach(function (e) { drawEdgeLabel(ctx, e, t, state); });

    // 自由标注
    (spec.notes || []).forEach(function (nt) {
      ctx.save();
      ctx.font = '500 12px ' + t.font;
      ctx.fillStyle = colorOf(t, nt.color) || t.mute;
      ctx.textAlign = nt.align || 'center';
      ctx.fillText(nt.text, nt.x, nt.y);
      ctx.restore();
    });

    return nodesById;
  }

  /* ---------- 动画（steps 演示） ---------- */

  function easeInOut(p) { return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; }

  function buildControls(fig, spec, render) {
    var bar = document.createElement('div');
    bar.className = 'diagram-controls';

    var btn = document.createElement('button');
    btn.className = 'play-btn';
    btn.type = 'button';
    btn.innerHTML = '<svg viewBox="0 0 12 12" fill="currentColor"><path d="M2.5 1.2v9.6L10.4 6z"/></svg><span>播放演示</span>';

    var label = document.createElement('div');
    label.className = 'step-label';
    label.innerHTML = '<span class="step-idx"></span><span class="step-text">点击播放，看数据如何流动</span>';

    var dots = document.createElement('div');
    dots.className = 'step-dots';
    spec.steps.forEach(function () { dots.appendChild(document.createElement('i')); });

    bar.appendChild(btn);
    bar.appendChild(label);
    bar.appendChild(dots);
    var slot = fig.querySelector('.diagram-controls-slot');
    if (slot) slot.replaceWith(bar);
    else fig.appendChild(bar);

    var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var playing = false, raf = 0;

    function setDot(i) {
      Array.prototype.forEach.call(dots.children, function (d, k) {
        d.className = k <= i ? 'on' : '';
      });
    }
    function setLabel(i, txt) {
      label.querySelector('.step-idx').textContent = i >= 0 ? (i + 1) + '/' + spec.steps.length : '';
      label.querySelector('.step-text').textContent = txt;
    }

    function stop(finalStep) {
      playing = false;
      cancelAnimationFrame(raf);
      btn.querySelector('span').textContent = '重播';
      if (finalStep != null) {
        var s = spec.steps[finalStep];
        render({ active: {}, dim: null, pulse: null });
        setLabel(finalStep, s.label);
        setDot(finalStep);
      }
    }

    function play() {
      if (playing) return;
      playing = true;
      btn.querySelector('span').textContent = '播放中…';
      var i = 0;

      function runStep() {
        var s = spec.steps[i];
        setLabel(i, s.label);
        setDot(i);
        if (reduced) { // 无动画模式：直接高亮，逐步手动节奏
          render({ active: markActive(s), activeEdge: s, pulse: null });
          i++;
          if (i < spec.steps.length) setTimeout(runStep, 1400);
          else setTimeout(function(){ playing=false; btn.querySelector('span').textContent='重播'; }, 1600);
          return;
        }
        var dur = s.dur || 1100, t0 = performance.now();
        function frame(now) {
          var p = Math.min((now - t0) / dur, 1);
          render({ active: markActive(s), activeEdge: s, pulse: { step: s, p: easeInOut(p) } });
          if (p < 1) { raf = requestAnimationFrame(frame); }
          else {
            i++;
            if (i < spec.steps.length) setTimeout(function () { raf = requestAnimationFrame(runStep2); }, 380);
            else setTimeout(function () { stop(spec.steps.length - 1); }, 500);
          }
        }
        function runStep2() { runStep(); }
        raf = requestAnimationFrame(frame);
      }
      function markActive(s) {
        var m = {};
        if (s.from) m[s.from] = 1;
        if (s.to) m[s.to] = 1;
        return m;
      }
      runStep();
    }

    btn.addEventListener('click', play);
    setLabel(-1, '点击播放，看数据如何流动');
  }

  /* ---------- 挂载 ---------- */

  function mount(selector, spec) {
    var fig = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!fig) return;
    var wrap = fig.querySelector('.diagram-canvas-wrap') || fig;

    var canvas = document.createElement('canvas');
    wrap.appendChild(canvas);
    canvas.style.maxWidth = spec.width + 'px';

    var ctx = canvas.getContext('2d');

    function sizeCanvas() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      canvas.width = spec.width * dpr;
      canvas.height = spec.height * dpr;
      canvas.style.width = '';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function render(state) {
      var t = theme();
      sizeCanvas();
      var nodesById = drawBase(ctx, spec, t, state || {});
      // 脉冲
      if (state && state.pulse) {
        var ps = state.pulse.step, p = state.pulse.p;
        var a = nodesById[ps.from], b = nodesById[ps.to];
        if (a && b) {
          var pts = edgePoints(ps, a, b);
          var p1 = pts.p1, p2 = pts.p2;
          var px = p1.x + (p2.x - p1.x) * p, py = p1.y + (p2.y - p1.y) * p;
          ctx.save();
          ctx.shadowColor = withAlpha(t.accent, 0.9);
          ctx.shadowBlur = 14;
          ctx.fillStyle = t.accent;
          ctx.beginPath();
          ctx.arc(px, py, 5.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    }

    render({});
    if (spec.steps && spec.steps.length) buildControls(fig, spec, render);

    registry.push({ render: render });
  }

  window.addEventListener('k8c:themechange', function () {
    registry.forEach(function (d) { d.render({}); });
  });

  K8C.Diagram = { mount: mount };
})();
