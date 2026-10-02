/* N2 Toolkit — Checklists N2 (modelos iniciais + criação de novos). */
(function () {
  var ui = N2.ui, el = ui.el, store = N2.store;

  function mk(title, items) { return { id: ui.uid(), title: title, modelo: true, items: items.map(function (t) { return { t: t, done: false }; }) }; }
  function load() {
    return store.seed('checklists', function () {
      return [
        mk('CT-e NÃO INTEGRADO', ['CT-e autorizado na SEFAZ', 'Chave validada', 'Status conferido', 'Cliente pagador validado', 'Tomador validado', 'Dados divergentes conferidos', 'Integração verificada', 'Logs consultados', 'Reprocessamento realizado', 'Evidências anexadas', 'Necessário escalar para N3']),
        mk('MDF-e', ['CT-es vinculados', 'Veículo', 'Motorista', 'Rota', 'KM', 'CIOT', 'Documentos', 'Status', 'Autorização SEFAZ', 'Erros de integração', 'Evidências']),
        mk('CONTRATO DE FRETE', ['VG', 'Motorista', 'Proprietário', 'Viagem', 'Pagamento', 'CIOT', 'Status', 'XML', 'Integração', 'Pendências'])
      ];
    });
  }
  function asText(c) { return 'CHECKLIST — ' + c.title + '\n\n' + c.items.map(function (i) { return (i.done ? '[x] ' : '[ ] ') + i.t; }).join('\n'); }

  N2.register({
    id: 'checklists', title: 'Checklists', icon: '📋', group: 'Trabalho', desc: 'Roteiros de validação N2',
    search: function (q) {
      return load().filter(function (c) { return ui.has(c.title + ' ' + c.items.map(function (i) { return i.t; }).join(' '), q); })
        .map(function (c) { return { title: '📋 ' + c.title, sub: 'Checklist', go: function () { N2.go('checklists'); } }; });
    },
    render: function (root) {
      var lists = load(), grid = el('div', { class: 'grid wide' });
      function save() { store.set('checklists', lists); }
      function draw() {
        ui.fill(grid, lists.map(function (c) {
          var done = c.items.filter(function (i) { return i.done; }).length;
          var add = el('input', { type: 'text', placeholder: 'Novo item + Enter' });
          add.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && add.value.trim()) { c.items.push({ t: add.value.trim(), done: false }); save(); draw(); }
          });
          return el('div', { class: 'card' },
            el('div', { class: 'row' }, el('h2', { class: 'grow', style: 'margin:0', text: c.title }),
              el('span', { class: 'badge ' + (done === c.items.length && done ? 'ok' : ''), text: done + '/' + c.items.length })),
            el('progress', { max: c.items.length || 1, value: done, style: 'margin:8px 0' }),
            c.items.map(function (i, idx) {
              return el('label', { class: 'check ' + (i.done ? 'done' : '') },
                el('input', { type: 'checkbox', checked: i.done, onchange: function () { i.done = !i.done; save(); draw(); } }),
                el('span', { class: 'grow', text: i.t }),
                el('button', { class: 'btn ghost small', type: 'button', title: 'Remover item', onclick: function (e) { e.preventDefault(); c.items.splice(idx, 1); save(); draw(); } }, '✕'));
            }),
            el('div', { style: 'margin-top:8px' }, add),
            el('div', { class: 'toolbar' },
              ui.copyBtn(function () { return asText(c); }),
              ui.button('↺ Desmarcar', function () { c.items.forEach(function (i) { i.done = false; }); save(); draw(); }),
              ui.button('🗑️', function () { ui.confirm('Excluir o checklist "' + c.title + '"?', function () { lists = lists.filter(function (x) { return x !== c; }); save(); draw(); }, 'Excluir'); }, 'danger')));
        }));
      }
      root.append(el('div', { class: 'toolbar top' }, ui.button('+ Novo checklist', function () {
        ui.formModal('Novo checklist', [{ key: 'title', label: 'Título' }, { key: 'items', label: 'Itens (um por linha)', type: 'textarea', rows: 8 }], {}, function (v) {
          lists.push({ id: ui.uid(), title: v.title, items: v.items.split('\n').map(function (t) { return t.trim(); }).filter(Boolean).map(function (t) { return { t: t, done: false }; }) });
          save(); draw();
        });
      }, 'primary')), grid);
      draw();
    }
  });
})();
