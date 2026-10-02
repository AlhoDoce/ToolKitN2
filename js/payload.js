/* N2 Toolkit — Payload Inspector (JSON / XML / Texto). */
(function () {
  var ui = N2.ui, el = ui.el;

  function detect(t) {
    t = t.trim();
    if (/^[\[{]/.test(t)) { try { JSON.parse(t); return 'JSON'; } catch (e) {} }
    if (/^</.test(t)) { try { N2.xml.parse(t); return 'XML'; } catch (e) {} }
    return 'Texto';
  }

  N2.register({
    id: 'payload', title: 'Payload Inspector', icon: '🔬', group: 'Ferramentas', desc: 'Inspecione payloads e encontre campos', keywords: 'payload api request response campo idViagem',
    render: function (root) {
      var input = ui.codeEditor({ placeholder: 'Cole o payload (JSON, XML ou texto)…', rows: 18 });
      var kind = el('span', { class: 'badge', text: 'tipo: —' });
      var field = el('input', { type: 'text', placeholder: 'campo = idViagem', style: 'max-width:240px' });
      var view = el('div');
      var ext = { JSON: 'json', XML: 'xml', Texto: 'txt' };

      function type() { var t = detect(input.value); kind.textContent = 'tipo: ' + t; return t; }
      function obj(t) { return t === 'JSON' ? JSON.parse(input.value) : N2.xml.toObject(input.value); }
      function term() { return field.value.replace(/^\s*campo\s*=\s*/i, '').trim(); }
      function need() { if (!input.value.trim()) { ui.toast('Cole o payload primeiro'); return false; } return true; }

      function format() {
        if (!need()) return;
        var t = type();
        if (t === 'JSON') input.value = N2.json.format(input.value);
        else if (t === 'XML') input.value = N2.xml.format(input.value);
                show();
      }
      function show() {
        if (!need()) return;
        var t = type(), q = term();
        ui.fill(view, ui.tabs([
          { label: 'Texto com destaque', render: function () { return el('pre', { class: 'out' }, ui.highlight(input.value, q)); } },
          { label: 'Visualização estruturada', render: function () {
            return t === 'Texto' ? el('p', { class: 'muted', text: 'Disponível para JSON e XML válidos.' }) : ui.tree(obj(t), null, q);
          } }
        ]));
      }
      function find() {
        if (!need()) return;
        var q = term(); if (!q) { ui.toast('Informe o campo'); return; }
        var t = type(), res;
        if (t === 'Texto') {
          var lines = input.value.split('\n'), hits = [];
          lines.forEach(function (l, i) { if (ui.has(l, q)) hits.push({ n: i + 1, l: l }); });
          res = hits.length ? el('div', null, el('p', { class: 'small muted', text: hits.length + ' linha(s) com ocorrência' }),
            el('pre', { class: 'out' }, hits.map(function (h) { var f = document.createDocumentFragment(); f.append(String(h.n).padStart(4) + ' | ', ui.highlight(h.l, q), '\n'); return f; })))
            : el('p', { class: 'muted', text: 'Nenhuma ocorrência de "' + q + '".' });
        } else res = ui.renderFound(ui.findKeys(obj(t), q), q);
        ui.fill(view, ui.card('Ocorrências de "' + q + '"', res), el('div', { style: 'margin-top:12px' }, el('pre', { class: 'out' }, ui.highlight(input.value, q))));
      }
      input.addEventListener('input', ui.debounce(type, 300));
      input.addEventListener('paste', function () { setTimeout(format, 0); }); // colou: formata e mostra
      ui.fill(view, ui.card(null, ui.empty('🔬', 'Cole um payload ao lado. Ele é formatado e exibido aqui.')));
      field.addEventListener('keydown', function (e) { if (e.key === 'Enter') find(); });

      root.append(el('div', { class: 'split' },
        ui.card('Payload', input,
          el('div', { class: 'toolbar' }, kind, ui.button('Formatar', format, 'primary'), ui.button('Visualizar', show),
            ui.copyBtn(function () { return input.value; }),
            ui.button('⬇️ Download', function () { if (need()) ui.download('payload.' + ext[type()], input.value); }),
            ui.button('Limpar', function () { input.value = ''; ui.fill(view); type(); }),
            ui.button('💡 Exemplo', function () { input.value = '{"idViagem":10234,"status":"PENDENTE","motorista":{"nome":"Motorista Exemplo","documento":"000.000.000-00"},"documentos":[{"tipo":"CT-e","numero":1001,"idViagem":10234,"status":"AUTORIZADO"},{"tipo":"MDF-e","numero":501,"status":"REJEITADO"}]}'; field.value = 'idViagem'; format(); find(); }, 'ghost')),
          el('div', { class: 'toolbar' }, field, ui.button('🔎 Encontrar campo', find, 'primary'))),
        el('div', null, view)));
    }
  });
})();
