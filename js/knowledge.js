/* N2 Toolkit — Minha Base N2 (banco de conhecimento pessoal com busca instantânea e tags). */
(function () {
  var ui = N2.ui, el = ui.el, store = N2.store;
  var FIELDS = [
    { key: 'title', label: 'Título' }, { key: 'cat', label: 'Categoria' }, { key: 'tagsText', label: 'Tags (ex.: #CTE #SEFAZ)' },
    { key: 'descricao', label: 'Descrição', type: 'textarea' }, { key: 'sintoma', label: 'Sintoma', type: 'textarea' },
    { key: 'causa', label: 'Causa', type: 'textarea' }, { key: 'validacoes', label: 'Validações', type: 'textarea' },
    { key: 'solucao', label: 'Solução', type: 'textarea' },
    { key: 'comandos', label: 'Comandos', type: 'textarea' }, { key: 'consultas', label: 'Consultas', type: 'textarea' },
    { key: 'evidencias', label: 'Evidências', type: 'textarea' }, { key: 'obs', label: 'Observações', type: 'textarea' }
  ];
  var BODY = FIELDS.slice(3);

  function load() {
    return store.seed('kb', function () {
      return [{ id: ui.uid(), demo: true, title: 'Erro de integração do CT-e', cat: 'CT-e', tags: ['CTE', 'INTEGRACAO', 'SEFAZ'],
        descricao: 'Registro de demonstração. Substitua pelo procedimento real do seu ambiente.',
        sintoma: 'CT-e autorizado na SEFAZ porém não integrado.', causa: '',
        validacoes: 'Verificar chave, status, logs e tentativa de reprocessamento.',
        solucao: '', comandos: '', consultas: '', evidencias: '', obs: '', updated: Date.now() }];
    }, true);
  }
  function text(a) { return [a.title, a.cat, (a.tags || []).join(' ')].concat(BODY.map(function (f) { return a[f.key]; })).join(' '); }

  N2.register({
    id: 'kb', title: 'Minha Base N2', icon: '📚', group: 'Trabalho', desc: 'Base de conhecimento pessoal', keywords: 'base conhecimento soluções artigos',
    search: function (q) {
      return load().filter(function (a) { return ui.has(text(a), q); })
        .map(function (a) { return { title: '📚 ' + a.title, sub: 'Base N2 · ' + (a.cat || 'Sem categoria'), go: function () { N2.go('kb', { q: a.title }); } }; });
    },
    render: function (root, params) {
      var items = load(), q = params.q || '', fTag = '', box = el('div'), tagsBox = el('div');
      function save() { store.set('kb', items); }
      function edit(a) {
        var vals = a ? Object.assign({}, a, { tagsText: (a.tags || []).map(function (t) { return '#' + t; }).join(' ') }) : {};
        ui.formModal(a ? 'Editar registro' : 'Novo registro', FIELDS, vals, function (v) {
          v.tags = ui.parseTags(v.tagsText); delete v.tagsText; v.updated = Date.now();
          if (a) { Object.assign(a, v); delete a.demo; } else items.push(Object.assign({ id: ui.uid() }, v));
          save(); draw();
        });
      }
      function draw() {
        ui.fill(tagsBox, ui.tagBar(items, fTag, function (t) { fTag = t; draw(); }) || '');
        var list = items.filter(function (a) { return (!q || ui.has(text(a), q)) && (!fTag || (a.tags || []).indexOf(fTag) >= 0); });
        ui.fill(box, list.length ? list.map(function (a) {
          return el('details', { class: 'card', open: list.length === 1 },
            el('summary', { style: 'cursor:pointer' }, el('strong', null, ui.highlight(a.title, q)), ' ',
              a.cat ? el('span', { class: 'badge', text: a.cat }) : null, ' ', ui.tagChips(a.tags), ' ', ui.demoBadge(a)),
            BODY.filter(function (f) { return a[f.key]; }).map(function (f) {
              return el('div', { style: 'margin-top:8px' }, el('div', { class: 'small muted', style: 'font-weight:600', text: f.label.toUpperCase() }),
                el('pre', { class: 'out plain', style: 'min-height:0' }, ui.highlight(a[f.key], q)));
            }),
            el('div', { class: 'toolbar' },
              ui.copyBtn(function () { return a.title + '\n\n' + BODY.filter(function (f) { return a[f.key]; }).map(function (f) { return f.label + ':\n' + a[f.key]; }).join('\n\n'); }),
              ui.button('✏️ Editar', function () { edit(a); }),
              ui.button('🗑️', function () { ui.confirm('Excluir "' + a.title + '"?', function () { items = items.filter(function (x) { return x !== a; }); save(); draw(); }, 'Excluir'); }, 'danger')));
        }) : el('p', { class: 'muted', text: 'Nenhum registro encontrado.' }));
      }
      var search = ui.searchBar('Busca instantânea na base…', function (v) { q = v; draw(); }); search.value = q;
      root.append(el('div', { class: 'row', style: 'margin-bottom:12px' }, el('div', { class: 'grow' }, search), ui.button('+ Novo registro', function () { edit(null); }, 'primary')), tagsBox, box);
      draw();
    }
  });
})();
