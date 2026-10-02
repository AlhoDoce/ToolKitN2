/* N2 Toolkit — Comparador (Texto / JSON / XML) com diff por linhas (LCS). */
(function () {
  var ui = N2.ui, el = ui.el;
  var MAX_CELLS = 6000000;

  /** Retorna [{type:'eq'|'add'|'del'|'chg', a, b}] */
  function diff(A, B) {
    var n = A.length, m = B.length, w = m + 1, i, j;
    if ((n + 1) * w > MAX_CELLS) throw new Error('Conteúdo muito grande para comparar no navegador (reduza para alguns milhares de linhas).');
    var dp = new Uint32Array((n + 1) * w);
    for (i = n - 1; i >= 0; i--) for (j = m - 1; j >= 0; j--)
      dp[i * w + j] = A[i] === B[j] ? dp[(i + 1) * w + j + 1] + 1 : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1]);
    var ops = []; i = 0; j = 0;
    while (i < n && j < m) {
      if (A[i] === B[j]) { ops.push({ type: 'eq', a: A[i] }); i++; j++; }
      else if (dp[(i + 1) * w + j] >= dp[i * w + j + 1]) ops.push({ type: 'del', a: A[i++] });
      else ops.push({ type: 'add', b: B[j++] });
    }
    while (i < n) ops.push({ type: 'del', a: A[i++] });
    while (j < m) ops.push({ type: 'add', b: B[j++] });
    // blocos removido+adicionado adjacentes viram "alterado"
    var out = [], k = 0;
    while (k < ops.length) {
      if (ops[k].type === 'eq') { out.push(ops[k++]); continue; }
      var dels = [], adds = [];
      while (k < ops.length && ops[k].type !== 'eq') { (ops[k].type === 'del' ? dels : adds).push(ops[k]); k++; }
      var p = Math.min(dels.length, adds.length);
      for (var x = 0; x < p; x++) out.push({ type: 'chg', a: dels[x].a, b: adds[x].b });
      out = out.concat(dels.slice(p), adds.slice(p));
    }
    return out;
  }
  N2.diff = diff;

  function normalize(text, type, label) {
    try {
      if (type === 'JSON') return JSON.stringify(N2.json.sorted(JSON.parse(text)), null, 2);
      if (type === 'XML') return N2.xml.format(text);
    } catch (e) { throw new Error(label + ': ' + type + ' inválido — ' + e.message); }
    return text.replace(/\r/g, '');
  }

  N2.register({
    id: 'compare', title: 'Comparador', icon: '⇄', group: 'Ferramentas', desc: 'Compare texto, JSON ou XML', keywords: 'diff comparar payload log diferença',
    render: function (root, params) {
      var a = ui.codeEditor({ placeholder: 'Entrada A (original)', rows: 12, value: params.a || '' });
      var b = ui.codeEditor({ placeholder: 'Entrada B (novo)', rows: 12 });
      var type = ui.dropdown(['Texto', 'JSON', 'XML'], params.type || 'Texto'); type.style.width = 'auto';
      var onlyDiff = el('input', { type: 'checkbox' }), out = el('div'), last = '';

      function run() {
        var ops;
        try { ops = diff(normalize(a.value, type.value, 'Entrada A').split('\n'), normalize(b.value, type.value, 'Entrada B').split('\n')); }
        catch (e) { ui.fill(out, el('div', { class: 'notice warn', text: e.message })); return; }
        var c = { add: 0, del: 0, chg: 0 }, box = el('div', { class: 'diff' }), txt = [];
        ops.forEach(function (o) {
          if (o.type === 'eq') { if (!onlyDiff.checked) { box.append(el('div', { text: '  ' + o.a })); txt.push('  ' + o.a); } return; }
          c[o.type]++;
          if (o.type === 'chg') { box.append(el('div', { class: 'chg', text: '~ ' + o.a }), el('div', { class: 'chg', text: '→ ' + o.b })); txt.push('~ ' + o.a, '→ ' + o.b); }
          else { var l = (o.type === 'add' ? '+ ' + o.b : '- ' + o.a); box.append(el('div', { class: o.type, text: l })); txt.push(l); }
        });
        last = txt.join('\n');
        var same = !(c.add + c.del + c.chg);
        ui.fill(out, 
          el('div', { class: 'row', style: 'margin-bottom:8px' },
            same ? el('span', { class: 'badge ok', text: 'Conteúdos idênticos' }) : [
              el('span', { class: 'badge ok', text: '+ ' + c.add + ' adicionada(s)' }), el('span', { class: 'badge bad', text: '- ' + c.del + ' removida(s)' }),
              el('span', { class: 'badge demo', text: '~ ' + c.chg + ' alterada(s)' })],
            ui.copyBtn(function () { return last; }, '📋 Copiar diff')),
          box);
      }

      // compara sozinho enquanto o usuário digita/cola
      var auto = ui.debounce(function () { if (a.value.trim() && b.value.trim()) run(); }, 350);
      a.addEventListener('input', auto); b.addEventListener('input', auto); type.addEventListener('change', auto); onlyDiff.addEventListener('change', auto);
      ui.fill(out, ui.empty('⇄', 'Preencha A e B: as diferenças aparecem aqui automaticamente.'));
      root.append(
        el('div', { class: 'split' }, ui.card('A — original', a), ui.card('B — novo', b)),
        el('div', { class: 'toolbar' }, type, ui.button('COMPARAR', run, 'primary'),
          el('label', { class: 'row' }, onlyDiff, 'Mostrar só diferenças'),
          ui.button('⇅ Inverter', function () { var t = a.value; a.value = b.value; b.value = t; auto(); }),
          ui.button('Limpar', function () { a.value = b.value = ''; ui.fill(out); }),
          ui.button('💡 Exemplo', function () { type.value = 'JSON'; a.value = '{"idViagem":10234,"status":"PENDENTE","motorista":{"nome":"Motorista Exemplo","documento":"000.000.000-00"},"documentos":[{"tipo":"CT-e","numero":1001,"idViagem":10234,"status":"AUTORIZADO"},{"tipo":"MDF-e","numero":501,"status":"REJEITADO"}]}'; b.value = a.value.replace('PENDENTE', 'CONCLUIDA').replace('"numero":501,', '"numero":501,"protocolo":"000123",'); run(); }, 'ghost')),
        el('div', { class: 'small muted', style: 'margin-bottom:8px', text: 'JSON: as chaves são ordenadas e o conteúdo é formatado antes de comparar. XML: é formatado antes de comparar. Legenda: + adicionado, - removido, ~ alterado.' }),
        out);
    }
  });
})();
