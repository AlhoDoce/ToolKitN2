/* N2 Toolkit — Sidebar, Header, rotas (#/id), busca global, tema, histórico,
 * favoritos, barra inferior (celular) e atalhos de teclado. */
(function () {
  var ui = N2.ui, el = ui.el, store = N2.store;
  var GROUPS = ['Principal', 'Trabalho', 'Ferramentas', 'Sistema'];
  var cleanup = null, current = null;

  /* Dica curta exibida no topo de cada tela ("como usar"). */
  var HELP = {
    notes: 'Escreva e pronto: tudo é salvo automaticamente. Use categorias e #tags para encontrar depois.',
    ocr: 'Copie o print e pressione Ctrl+V aqui. O texto sai ao lado, pronto para copiar.',
    utilities: 'Pequenas ferramentas do dia a dia. Os resultados têm botão de copiar.',
    ticket: 'Cole a descrição do chamado, gere a análise, ajuste os campos e copie a nota técnica.',
    logistics: 'Clique em um conceito para ver o resumo. Use "Editar" para registrar as regras do seu ambiente.',
    checklists: 'Marque os itens conforme valida. O progresso fica salvo; "Copiar" leva o checklist para o chamado.',
    templates: 'Encontre a mensagem, clique em Copiar e troque os campos entre [COLCHETES].',
    kb: 'Registre problemas já resolvidos: sintoma, causa e solução. A busca filtra enquanto você digita.',
    json: 'Cole o JSON: ele é formatado automaticamente. Depois busque propriedades ou veja em árvore.',
    xml: 'Cole o XML: ele é formatado automaticamente. Depois busque tags ou veja em árvore.',
    compare: 'Cole o conteúdo antigo em A e o novo em B. As diferenças aparecem abaixo enquanto você digita.',
    payload: 'Cole o payload e digite o nome do campo para localizar todas as ocorrências.',
    history: 'Últimas ferramentas que você abriu.',
    shortcuts: 'Atalhos para ir mais rápido.',
    privacy: 'Onde ficam seus dados, backup e limpeza.'
  };

  N2.hue = function (tool) { return (N2.tools.indexOf(tool) * 47 + 215) % 360; };

  /* ---------- tema ---------- */
  function applyTheme(t) { document.documentElement.setAttribute('data-theme', t); }
  function theme() { return store.get('theme') || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); }
  function toggleTheme() { var t = theme() === 'dark' ? 'light' : 'dark'; store.set('theme', t); applyTheme(t); renderHeader(); }

  /* ---------- favoritos / histórico ---------- */
  function favs() { return store.get('favs', []); }
  function toggleFav(id) {
    var f = favs(); var i = f.indexOf(id);
    if (i >= 0) f.splice(i, 1); else f.push(id);
    store.set('favs', f); renderHeader();
    ui.toast(i >= 0 ? 'Removida dos favoritos' : '★ Adicionada aos favoritos');
  }
  function track(id) {
    var h = store.get('history', []);
    if (!h[0] || h[0].id !== id) h.unshift({ id: id, ts: Date.now() });
    store.set('history', h.slice(0, 50));
    var u = store.get('usage', {}); u[id] = (u[id] || 0) + 1; store.set('usage', u);
  }

  /* ---------- navegação ---------- */
  function go(id, params) {
    N2.params = params || null;
    if (location.hash === '#/' + id) route(); else location.hash = '#/' + id;
  }
  function route() {
    var id = location.hash.replace(/^#\/?/, '') || 'dashboard';
    var tool = N2.tool(id) || N2.tool('dashboard');
    if (cleanup) { try { cleanup(); } catch (e) {} cleanup = null; }
    current = tool;
    var view = document.getElementById('view');
    ui.fill(view);
    document.body.classList.remove('menu-open');
    renderSidebar(); renderHeader(); renderBottom();
    document.title = tool.title + ' — N2 Toolkit';
    if (tool.group !== 'Principal' && tool.group !== 'Sistema') track(tool.id);
    if (tool.id !== 'dashboard') {
      view.append(el('div', { class: 'page-head' },
        el('div', { class: 'chip-ico', style: '--h:' + N2.hue(tool), text: tool.icon }),
        el('div', null, el('h1', { text: tool.title }), el('p', { class: 'muted', text: HELP[tool.id] || tool.desc || '' }))));
    }
    var body = el('div'); view.append(body);
    var params = N2.params; N2.params = null;
    try { cleanup = tool.render(body, params || {}) || null; }
    catch (e) { console.error(e); body.append(el('div', { class: 'notice warn', text: 'Erro ao abrir a ferramenta: ' + e.message })); }
    window.scrollTo(0, 0);
  }

  function renderSidebar() {
    var sb = document.getElementById('sidebar');
    ui.fill(sb, el('a', { class: 'brand', href: '#/dashboard', style: 'color:inherit' }, el('span', { class: 'logo', text: 'N2' }), 'Toolkit'));
    GROUPS.forEach(function (g) {
      var list = N2.tools.filter(function (t) { return t.group === g; });
      if (!list.length) return;
      if (g !== 'Principal') sb.append(el('div', { class: 'nav-group', text: g }));
      list.forEach(function (t) {
        sb.append(el('a', { class: 'nav-link ' + (current && current.id === t.id ? 'active' : ''), href: '#/' + t.id }, el('span', { class: 'i', text: t.icon }), t.title));
      });
    });
  }

  function renderHeader() {
    var h = document.getElementById('header');
    var isFav = current && favs().indexOf(current.id) >= 0;
    var canFav = current && current.group !== 'Principal' && current.group !== 'Sistema';
    ui.fill(h,
      el('button', { id: 'menu-btn', class: 'btn ghost icon', type: 'button', 'aria-label': 'Menu', onclick: function () { document.body.classList.toggle('menu-open'); } }, '☰'),
      el('button', { class: 'search-trigger', type: 'button', onclick: openSearch }, '🔎', el('span', { class: 'lbl', text: 'Buscar ferramentas, notas, templates…' }), el('kbd', { text: 'Ctrl K' })),
      el('div', { class: 'spacer' }),
      canFav ? el('button', { class: 'btn ghost icon ' + (isFav ? 'on' : ''), type: 'button', title: isFav ? 'Remover dos favoritos' : 'Favoritar esta ferramenta', onclick: function () { toggleFav(current.id); } }, isFav ? '★' : '☆') : null,
      el('button', { class: 'btn ghost icon', type: 'button', title: 'Alternar tema claro/escuro', onclick: toggleTheme }, theme() === 'dark' ? '☀️' : '🌙'));
  }

  /* Barra inferior: só aparece em telas pequenas (CSS). */
  function renderBottom() {
    var bar = document.getElementById('bottomnav');
    if (!bar) { bar = el('nav', { id: 'bottomnav' }); document.body.append(bar); }
    function link(id, icon, label) {
      return el('a', { href: '#/' + id, class: current && current.id === id ? 'active' : '' }, el('span', { class: 'i', text: icon }), label);
    }
    ui.fill(bar, link('dashboard', '🏠', 'Início'), link('notes', '📝', 'Notas'), link('ocr', '🖼️', 'OCR'),
      el('button', { type: 'button', onclick: openSearch }, el('span', { class: 'i', text: '🔎' }), 'Buscar'),
      el('button', { type: 'button', onclick: function () { document.body.classList.toggle('menu-open'); } }, el('span', { class: 'i', text: '☰' }), 'Menu'));
  }

  /* ---------- busca global ---------- */
  function toolResult(t) { return { title: t.icon + ' ' + t.title, sub: t.desc || 'Ferramenta', go: function () { go(t.id); } }; }
  function searchAll(q) {
    var out = N2.tools.filter(function (t) { return ui.has(t.title + ' ' + (t.desc || '') + ' ' + (t.keywords || ''), q); }).map(toolResult);
    N2.tools.forEach(function (t) {
      if (t.search) try { out = out.concat(t.search(q)); } catch (e) { console.error(e); }
    });
    return out.slice(0, 40);
  }
  function openSearch() {
    var results = el('div', { class: 'list', style: 'margin-top:12px' });
    var found = [], idx = 0, m;
    function pick(i) { if (found[i]) { m.close(); found[i].go(); } }
    function draw() {
      ui.fill(results, found.length ? found.map(function (r, i) {
        return el('div', { class: 'list-item ' + (i === idx ? 'active' : ''), onclick: function () { pick(i); } },
          el('div', { class: 't', text: r.title }), el('div', { class: 'small muted', text: r.sub }));
      }) : el('div', { class: 'empty' }, el('span', { class: 'big', text: '🔍' }), 'Nada encontrado.'));
      var a = results.querySelector('.active'); if (a) a.scrollIntoView({ block: 'nearest' });
    }
    var input = ui.searchBar('O que você procura?', function (q) {
      // sem texto: sugere todas as ferramentas
      found = q ? searchAll(q) : N2.tools.filter(function (t) { return t.id !== 'dashboard'; }).map(toolResult);
      idx = 0; draw();
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') pick(idx);
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        idx = (idx + (e.key === 'ArrowDown' ? 1 : -1) + found.length) % (found.length || 1); draw();
      }
    });
    m = ui.modal({ title: 'Busca', wide: true, body: el('div', null, input, results,
      el('div', { class: 'small muted', style: 'margin-top:10px' }, el('kbd', { text: '↑ ↓' }), ' navegar  ', el('kbd', { text: 'Enter' }), ' abrir  ', el('kbd', { text: 'Esc' }), ' fechar')) });
    input.dispatchEvent(new Event('input'));
  }

  /* ---------- atalhos ---------- */
  function onKey(e) {
    var mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
    if (e.key === 'Escape') { if (!ui.closeTopModal()) document.body.classList.remove('menu-open'); return; }
    if (mod && e.shiftKey && k === 'v') { e.preventDefault(); go('ocr'); }
    else if (mod && k === 'k') { e.preventDefault(); ui.closeTopModal(); openSearch(); }
    else if ((mod || e.altKey) && !e.shiftKey && k === 'n') { e.preventDefault(); go('notes', { create: true }); }
    else if (mod && k === 's') { e.preventDefault(); if (N2.notes && current && current.id === 'notes') N2.notes.saveNow(); }
  }

  N2.nav = {
    go: go, openSearch: openSearch, favs: favs,
    init: function () {
      applyTheme(theme());
      document.getElementById('overlay').addEventListener('click', function () { document.body.classList.remove('menu-open'); });
      window.addEventListener('hashchange', route);
      document.addEventListener('keydown', onKey);
      route();
    }
  };
  N2.go = go;
})();
