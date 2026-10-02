/* N2 Toolkit — JSON Tools.
 * Também expõe N2.structPage: tela "ORIGINAL | RESULTADO" reutilizada pelo XML Tools. */
(function () {
  var ui = N2.ui, el = ui.el;

  /** adapter: { name, placeholder, format(text), minify(text), toObject(text), searchLabel } — funções lançam Error se inválido */
  N2.structPage = function (root, a) {
    var input = ui.codeEditor({ placeholder: a.placeholder, rows: 20 });
    var result = el('div'), status = el('span', { class: 'badge', text: 'aguardando' }), lastText = '';
    var term = el('input', { type: 'text', placeholder: a.searchLabel, style: 'max-width:220px' });

    function ok(msg) { status.className = 'badge ok'; status.textContent = msg; }
    function fail(e) { status.className = 'badge bad'; status.textContent = 'inválido'; lastText = ''; ui.fill(result, el('pre', { class: 'out', text: a.name + ' inválido:\n' + e.message })); }
    function showText(t, msg) { lastText = t; ui.fill(result, el('pre', { class: 'out', text: t })); ok(msg); }
    function guard(fn) { return function () { if (!input.value.trim()) { ui.toast('Cole o ' + a.name + ' primeiro'); return; } try { fn(); } catch (e) { fail(e); } }; }

    var fmt = guard(function () { showText(a.format(input.value), 'válido · formatado'); });
    var min = guard(function () { showText(a.minify(input.value), 'válido · minificado'); });
    var val = guard(function () { a.toObject(input.value); lastText = ''; ui.fill(result, el('pre', { class: 'out', text: a.name + ' válido ✔' })); ok('válido'); });
    var tre = guard(function () { var o = a.toObject(input.value); lastText = a.format(input.value); ui.fill(result, ui.tree(o, null, term.value.trim())); ok('válido · árvore'); });
    var find = guard(function () {
      var t = term.value.trim(); if (!t) { ui.toast('Informe o termo'); return; }
      var found = ui.findKeys(a.toObject(input.value), t);
      lastText = found.map(function (r) { return r.path + ' = ' + (typeof r.value === 'object' ? JSON.stringify(r.value) : r.value); }).join('\n');
      ui.fill(result, ui.renderFound(found, t)); ok('válido');
    });
    term.addEventListener('keydown', function (e) { if (e.key === 'Enter') find(); });
    // ao colar, já formata (ou mostra o erro) sem precisar clicar
    input.addEventListener('paste', function () { setTimeout(fmt, 0); });
    function reset() { ui.fill(result, ui.empty('✨', 'Cole o ' + a.name + ' ao lado: ele é formatado automaticamente.')); lastText = ''; status.className = 'badge'; status.textContent = 'aguardando'; }
    reset();

    root.append(el('div', { class: 'split' },
      ui.card(a.name + ' ORIGINAL', input,
        el('div', { class: 'toolbar' }, ui.button('FORMATAR', fmt, 'primary'), ui.button('Minificar', min), ui.button('Validar', val), ui.button('Árvore', tre),
          ui.button('Limpar', function () { input.value = ''; reset(); input.focus(); }),
          ui.button('💡 Exemplo', function () { input.value = a.sample; fmt(); }, 'ghost')),
        el('div', { class: 'toolbar' }, term, ui.button('🔎 Buscar', find), ui.button('⇄ Comparar', function () { N2.go('compare', { a: input.value, type: a.name }); }))),
      ui.card('RESULTADO', el('div', { class: 'toolbar', style: 'margin-top:0' }, status,
        ui.copyBtn(function () { return lastText; }, '📋 Copiar resultado')), result)));
  };

  N2.json = {
    parse: function (t) { return JSON.parse(t); },
    format: function (t) { return JSON.stringify(JSON.parse(t), null, 2); },
    /** ordena as chaves para comparar conteúdo independentemente da ordem */
    sorted: function sorted(v) {
      if (Array.isArray(v)) return v.map(sorted);
      if (v && typeof v === 'object') { var o = {}; Object.keys(v).sort().forEach(function (k) { o[k] = sorted(v[k]); }); return o; }
      return v;
    }
  };

  N2.register({
    id: 'json', title: 'JSON Tools', icon: '🧩', group: 'Ferramentas', desc: 'Formatar, minificar, validar, árvore, busca', keywords: 'json formatador minificador validador',
    render: function (root) {
      N2.structPage(root, {
        name: 'JSON', sample: '{"idViagem":10234,"status":"PENDENTE","motorista":{"nome":"Motorista Exemplo","documento":"000.000.000-00"},"documentos":[{"tipo":"CT-e","numero":1001,"idViagem":10234,"status":"AUTORIZADO"},{"tipo":"MDF-e","numero":501,"status":"REJEITADO"}]}', placeholder: '{ "cole": "seu JSON aqui" }', searchLabel: 'Buscar propriedade…',
        format: N2.json.format,
        minify: function (t) { return JSON.stringify(JSON.parse(t)); },
        toObject: N2.json.parse
      });
    }
  });
})();
