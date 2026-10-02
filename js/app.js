/* N2 Toolkit — núcleo: registro de ferramentas + componentes reutilizáveis.
 *
 * Cada ferramenta é um módulo que chama:
 *   N2.register({
 *     id, title, icon, group, desc, keywords,
 *     render(root, params)  -> desenha a tela (pode retornar função de limpeza)
 *     search(query)         -> opcional: [{title, sub, go()}] para a busca global
 *   });
 *
 * Todo conteúdo do usuário entra no DOM via textContent (helper el), nunca innerHTML,
 * o que evita XSS.
 */
window.N2 = { tools: [], params: null };

N2.register = function (tool) { N2.tools.push(tool); };
N2.tool = function (id) { return N2.tools.find(function (t) { return t.id === id; }); };

(function () {
  /* ---------- helpers de DOM ---------- */
  function el(tag, attrs) {
    var n = document.createElement(tag);
    var kids = Array.prototype.slice.call(arguments, 2).flat(Infinity);
    kids.forEach(function (c) {
      if (c == null || c === false) return;
      n.append(c.nodeType ? c : document.createTextNode(String(c)));
    });
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'value') n.value = v;
      else if (k === 'checked') n.checked = v;
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    });
    return n;
  }

  /** Substitui o conteúdo de um nó (aceita arrays aninhados, nós e textos). */
  function fill(node) {
    var kids = Array.prototype.slice.call(arguments, 1).flat(Infinity).filter(function (c) { return c != null && c !== false; });
    node.replaceChildren.apply(node, kids);
    return node;
  }

  function uid() {
    return (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16);
      });
  }
  function fmtDate(ts) { return ts ? new Date(ts).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'; }
  function debounce(fn, ms) { var t; return function () { var a = arguments; clearTimeout(t); t = setTimeout(function () { fn.apply(null, a); }, ms); }; }
  function has(text, q) { return String(text || '').toLowerCase().indexOf(q.toLowerCase()) >= 0; }
  /** "#cte, sefaz" -> ["CTE","SEFAZ"] */
  function parseTags(s) {
    return Array.from(new Set(String(s || '').split(/[\s,;]+/).map(function (t) { return t.replace(/^#/, '').toUpperCase(); }).filter(Boolean)));
  }

  /* ---------- Toast ---------- */
  function toast(msg) {
    var t = el('div', { class: 'toast', text: msg });
    document.getElementById('toast-root').append(t);
    setTimeout(function () { t.remove(); }, 2000);
  }

  /* ---------- copiar / baixar ---------- */
  function copy(text) {
    text = String(text == null ? '' : text);
    function fallback() {
      var ta = el('textarea', { value: text, style: 'position:fixed;opacity:0' });
      document.body.append(ta); ta.select();
      try { document.execCommand('copy'); toast('Copiado'); } catch (e) { toast('Não foi possível copiar'); }
      ta.remove();
    }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(function () { toast('Copiado'); }, fallback);
    else fallback();
  }
  function download(name, content, mime) {
    var blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    var a = el('a', { href: URL.createObjectURL(blob), download: name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  /* ---------- Button ---------- */
  function button(label, onClick, variant) {
    return el('button', { class: 'btn ' + (variant || ''), type: 'button', onclick: onClick }, label);
  }
  function copyBtn(getText, label) { return button(label || '📋 Copiar', function () { copy(getText()); }); }

  /* ---------- Modal ---------- */
  var modals = [];
  function modal(opts) {
    var back = el('div', { class: 'modal-back' });
    var api = { close: function () { back.remove(); modals = modals.filter(function (m) { return m !== api; }); } };
    back.append(el('div', { class: 'modal ' + (opts.wide ? 'wide' : ''), role: 'dialog' },
      el('div', { class: 'modal-head' }, el('span', { text: opts.title || '' }), button('✕', api.close, 'ghost')),
      el('div', { class: 'modal-body' }, opts.body),
      opts.actions ? el('div', { class: 'modal-foot' }, opts.actions) : null));
    back.addEventListener('mousedown', function (e) { if (e.target === back) api.close(); });
    document.getElementById('modal-root').append(back);
    modals.push(api);
    var f = back.querySelector('input,textarea,select'); if (f) f.focus();
    return api;
  }
  function closeTopModal() { var m = modals[modals.length - 1]; if (m) { m.close(); return true; } return false; }
  function confirmBox(msg, onYes, yesLabel) {
    var m = modal({
      title: 'Confirmação', body: el('p', { text: msg }),
      actions: [button('Cancelar', function () { m.close(); }),
        button(yesLabel || 'Confirmar', function () { m.close(); onYes(); }, 'primary')]
    });
  }
  /** Formulário genérico em modal. fields: [{key,label,type:'text'|'textarea'|'select',options,rows}] */
  function formModal(title, fields, values, onSave) {
    values = values || {};
    var inputs = {};
    var body = el('div', null, fields.map(function (f) {
      var inp;
      if (f.type === 'textarea') inp = el('textarea', { rows: f.rows || 3, placeholder: f.placeholder });
      else if (f.type === 'select') inp = el('select', null, f.options.map(function (o) { return el('option', { value: o, text: o }); }));
      else inp = el('input', { type: 'text', placeholder: f.placeholder });
      if (values[f.key] != null) inp.value = values[f.key];
      inputs[f.key] = inp;
      return el('label', { class: 'field' }, el('span', { text: f.label }), inp);
    }));
    var m = modal({
      title: title, body: body, wide: true,
      actions: [button('Cancelar', function () { m.close(); }),
        button('Salvar', function () {
          var out = {};
          Object.keys(inputs).forEach(function (k) { out[k] = inputs[k].value.trim(); });
          if (fields[0] && !out[fields[0].key]) { toast('Preencha: ' + fields[0].label); return; }
          m.close(); onSave(out);
        }, 'primary')]
    });
  }

  /* ---------- Tabs ---------- */
  function tabs(items) {
    var bar = el('div', { class: 'tabs' }), content = el('div');
    items.forEach(function (it, i) {
      var b = el('button', { class: 'tab', type: 'button', text: it.label, onclick: function () {
        Array.from(bar.children).forEach(function (c) { c.classList.remove('active'); });
        b.classList.add('active');
        content.replaceChildren(it.render());
      } });
      bar.append(b);
      if (i === 0) { b.classList.add('active'); content.append(it.render()); }
    });
    return el('div', null, bar, content);
  }

  /* ---------- Card / CodeEditor / Dropdown ---------- */
  function card(title) {
    var kids = Array.prototype.slice.call(arguments, 1);
    return el('div', { class: 'card' }, title ? el('h2', { text: title }) : null, kids);
  }
  function codeEditor(opts) {
    opts = opts || {};
    return el('textarea', { class: 'code', rows: opts.rows || 14, placeholder: opts.placeholder || '', spellcheck: 'false', readonly: opts.readonly, value: opts.value || '' });
  }
  function dropdown(options, value, onChange) {
    var s = el('select', { onchange: function () { onChange && onChange(s.value); } },
      options.map(function (o) { return el('option', { value: o.value != null ? o.value : o, text: o.label || o }); }));
    if (value != null) s.value = value;
    return s;
  }
  function searchBar(placeholder, onInput) {
    var i = el('input', { type: 'search', placeholder: placeholder, oninput: function () { onInput(i.value.trim()); } });
    return i;
  }

  /* ---------- FileUploader (clique + arrastar) ---------- */
  function fileUploader(opts) {
    var input = el('input', { type: 'file', accept: opts.accept, style: 'display:none', onchange: function () { if (input.files[0]) opts.onFile(input.files[0]); input.value = ''; } });
    var zone = el('div', { class: 'drop', tabindex: '0', onclick: function () { input.click(); } }, el('div', { text: opts.label }), input);
    zone.addEventListener('dragover', function (e) { e.preventDefault(); zone.classList.add('over'); });
    zone.addEventListener('dragleave', function () { zone.classList.remove('over'); });
    zone.addEventListener('drop', function (e) {
      e.preventDefault(); zone.classList.remove('over');
      if (e.dataTransfer.files[0]) opts.onFile(e.dataTransfer.files[0]);
    });
    return zone;
  }

  /* ---------- destaque de termo e árvore ---------- */
  function highlight(text, q) {
    var frag = document.createDocumentFragment();
    text = String(text);
    if (!q) { frag.append(text); return frag; }
    var low = text.toLowerCase(), ql = q.toLowerCase(), i = 0, j;
    while ((j = low.indexOf(ql, i)) >= 0) {
      frag.append(text.slice(i, j), el('mark', { text: text.slice(j, j + q.length) }));
      i = j + q.length;
    }
    frag.append(text.slice(i));
    return frag;
  }
  /** Visualizador em árvore de qualquer valor JS (objeto/array/primitivo). */
  function tree(value, key, q, depth) {
    depth = depth || 0;
    var k = key != null ? el('span', { class: 'k' }, highlight(key, q)) : null;
    if (value !== null && typeof value === 'object') {
      var isArr = Array.isArray(value), keys = Object.keys(value);
      var d = el('details', depth < 2 ? { open: true } : null,
        el('summary', null, k, k ? ': ' : '', el('span', { class: 'muted', text: isArr ? '[' + keys.length + ']' : '{' + keys.length + '}' })));
      // filhos criados sob demanda para payloads grandes
      var filled = false;
      function fill() { if (filled) return; filled = true; keys.forEach(function (c) { d.append(tree(value[c], c, q, depth + 1)); }); }
      if (depth < 2) fill(); else d.addEventListener('toggle', fill);
      return depth === 0 ? el('div', { class: 'tree' }, d) : d;
    }
    var leaf = el('div', { class: 'leaf' }, k, k ? ': ' : '', el('span', { class: 'v', text: JSON.stringify(value) }));
    return depth === 0 ? el('div', { class: 'tree' }, leaf) : leaf;
  }
  /** Percorre objeto e devolve [{path, value}] das chaves que contêm o termo. */
  function findKeys(value, term, path, out) {
    out = out || []; path = path || '';
    if (value && typeof value === 'object') {
      Object.keys(value).forEach(function (k) {
        var p = Array.isArray(value) ? path + '[' + k + ']' : (path ? path + '.' + k : k);
        if (!Array.isArray(value) && has(k, term)) out.push({ path: p, value: value[k] });
        findKeys(value[k], term, p, out);
      });
    }
    return out;
  }
  function renderFound(list, term) {
    if (!list.length) return el('p', { class: 'muted', text: 'Nenhuma ocorrência de "' + term + '".' });
    return el('div', null, el('p', { class: 'small muted', text: list.length + ' ocorrência(s)' }),
      list.map(function (r) {
        var v = typeof r.value === 'object' ? JSON.stringify(r.value) : String(r.value);
        return el('div', { class: 'row', style: 'margin-bottom:4px' },
          el('code', { class: 'mono small' }, highlight(r.path, term)),
          el('span', { class: 'mono small grow', text: '= ' + (v.length > 200 ? v.slice(0, 200) + '…' : v) }),
          button('📋', function () { copy(v); }, 'ghost'));
      }));
  }

  /* ---------- tags ---------- */
  function tagBar(items, active, onPick) {
    var all = Array.from(new Set(items.flatMap(function (i) { return i.tags || []; }))).sort();
    if (!all.length) return null;
    return el('div', { class: 'row', style: 'margin:8px 0' }, all.map(function (t) {
      return el('button', { class: 'tag ' + (t === active ? 'active' : ''), type: 'button', text: '#' + t, onclick: function () { onPick(t === active ? '' : t); } });
    }));
  }
  function tagChips(tags) { return (tags || []).map(function (t) { return el('span', { class: 'tag', text: '#' + t }); }); }
  /** Estado vazio amigável. */
  function empty(icon, text) { return el('div', { class: 'empty' }, el('span', { class: 'big', text: icon }), text); }
  function demoBadge(item) { return item && item.demo ? el('span', { class: 'badge demo', title: 'Dado de demonstração — edite ou exclua', text: 'DEMO' }) : null; }

  /* ---------- texto -> PDF simples (sem bibliotecas) ---------- */
  function textToPdf(text) {
    var lines = [];
    String(text).replace(/\r/g, '').split('\n').forEach(function (l) {
      if (!l) lines.push('');
      while (l.length) { lines.push(l.slice(0, 85)); l = l.slice(85); }
    });
    var per = 54, pages = [];
    for (var i = 0; i < lines.length || !pages.length; i += per) pages.push(lines.slice(i, i + per));
    function esc(s) { return s.replace(/[\\()]/g, '\\$&').replace(/[^\x20-\xff]/g, '?'); }
    var objs = [];
    objs[0] = '<< /Type /Catalog /Pages 2 0 R >>';
    objs[1] = '';
    objs[2] = '<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>';
    var kids = [];
    pages.forEach(function (p) {
      var stream = 'BT /F1 10 Tf 14 TL 40 800 Td\n' + p.map(function (l) { return '(' + esc(l) + ') Tj T*'; }).join('\n') + '\nET';
      var c = objs.push('<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream');
      var pg = objs.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ' + c + ' 0 R >>');
      kids.push(pg + ' 0 R');
    });
    objs[1] = '<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + kids.length + ' >>';
    var pdf = '%PDF-1.4\n', offs = [];
    objs.forEach(function (o, n) { offs.push(pdf.length); pdf += (n + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
    var xref = pdf.length;
    pdf += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n' +
      offs.map(function (o) { return String(o).padStart(10, '0') + ' 00000 n \n'; }).join('') +
      'trailer\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF';
    var bytes = new Uint8Array(pdf.length);
    for (var b = 0; b < pdf.length; b++) bytes[b] = pdf.charCodeAt(b) & 0xff;
    return new Blob([bytes], { type: 'application/pdf' });
  }

  N2.ui = {
    el: el, fill: fill, uid: uid, fmtDate: fmtDate, debounce: debounce, has: has, parseTags: parseTags,
    toast: toast, copy: copy, download: download, button: button, copyBtn: copyBtn,
    modal: modal, closeTopModal: closeTopModal, confirm: confirmBox, formModal: formModal,
    tabs: tabs, card: card, codeEditor: codeEditor, dropdown: dropdown, searchBar: searchBar,
    fileUploader: fileUploader, highlight: highlight, tree: tree, findKeys: findKeys, renderFound: renderFound,
    tagBar: tagBar, tagChips: tagChips, demoBadge: demoBadge, empty: empty, textToPdf: textToPdf
  };

  document.addEventListener('DOMContentLoaded', function () { N2.nav.init(); });
})();
