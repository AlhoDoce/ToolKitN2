/* N2 Toolkit — Dashboard, Histórico, Atalhos e Privacidade. */
(function () {
  var ui = N2.ui, el = ui.el, store = N2.store;

  function tile(t, sub) {
    return el('a', { class: 'card tile', href: '#/' + t.id },
      el('div', { class: 'ico', style: '--h:' + N2.hue(t), text: t.icon }),
      el('div', null, el('div', { class: 'name', text: t.title }), el('div', { class: 'small muted', text: sub || t.desc || '' })));
  }
  function isWork(t) { return t.group === 'Trabalho' || t.group === 'Ferramentas'; }
  function greeting() { var h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; }

  /* Atalhos para os fluxos mais comuns do dia a dia */
  var QUICK = [
    { id: 'ocr', icon: '🖼️', name: 'Recebi um print', sub: 'Cole com Ctrl+V e extraia o texto', h: 265 },
    { id: 'ticket', icon: '🎫', name: 'Analisar um chamado', sub: 'Organize o relato e gere a nota técnica', h: 215 },
    { id: 'payload', icon: '🔬', name: 'Recebi um payload', sub: 'Formate e encontre o campo que precisa', h: 170 },
    { id: 'notes', icon: '📝', name: 'Anotar algo', sub: 'Nova nota, salva automaticamente', h: 330, params: { create: true } }
  ];

  N2.register({
    id: 'dashboard', title: 'Início', icon: '🏠', group: 'Principal',
    render: function (root) {
      var usage = store.get('usage', {}), favs = N2.nav.favs();
      var top = N2.tools.filter(isWork).filter(function (t) { return favs.indexOf(t.id) >= 0 || usage[t.id]; })
        .sort(function (a, b) {
          return (favs.indexOf(b.id) >= 0) - (favs.indexOf(a.id) >= 0) || (usage[b.id] || 0) - (usage[a.id] || 0);
        }).slice(0, 4);
      var recent = store.get('history', []).slice(0, 5);
      var hasDemo = store.get('notes', []).some(function (n) { return n.demo; }) || !store.get('notes');

      ui.fill(root,
        el('div', { class: 'hero' },
          el('h1', null, greeting() + '! Bem-vindo ao ', el('b', { text: 'N2 Toolkit' })),
          el('div', { class: 'muted', text: 'Central de ferramentas para suporte, análise e produtividade' }),
          el('button', { class: 'search-trigger', type: 'button', onclick: N2.nav.openSearch }, '🔎',
            el('span', { class: 'lbl', text: 'Buscar ferramentas, notas, templates, checklists, conceitos…' }), el('kbd', { text: 'Ctrl K' }))),
        el('div', { class: 'section-title', style: 'margin-top:0', text: 'O que você precisa fazer?' }),
        el('div', { class: 'quick' }, QUICK.map(function (q) {
          return el('a', { class: 'qa', href: '#/' + q.id, style: '--h:' + q.h, onclick: function (e) { if (q.params) { e.preventDefault(); N2.go(q.id, q.params); } } },
            el('div', { class: 'big', text: q.icon }), el('div', { class: 'name', text: q.name }), el('div', { class: 'small', text: q.sub }));
        })),
        top.length ? el('div', { class: 'section-title', text: 'Mais utilizados' }) : null,
        top.length ? el('div', { class: 'grid' }, top.map(function (t) {
          return tile(t, (favs.indexOf(t.id) >= 0 ? '★ favorita · ' : '') + (usage[t.id] || 0) + ' acesso(s)');
        })) : null,
        el('div', { class: 'section-title', text: 'Todas as ferramentas' }),
        el('div', { class: 'grid' }, N2.tools.filter(isWork).map(function (t) { return tile(t); })),
        recent.length ? el('div', { class: 'section-title', text: 'Atividade recente' }) : null,
        recent.length ? el('div', { class: 'card' }, recent.map(histLine)) : null,
        hasDemo ? el('p', { class: 'small muted', style: 'margin-top:20px', text: 'Itens marcados com DEMO são exemplos fictícios para você conhecer as telas. Edite ou exclua à vontade.' }) : null);
    }
  });

  function histLine(h) {
    var t = N2.tool(h.id); if (!t) return null;
    return el('div', { class: 'row', style: 'padding:3px 0' }, el('span', { class: 'mono small muted', style: 'width:120px', text: ui.fmtDate(h.ts) }),
      el('a', { href: '#/' + t.id, text: t.icon + ' ' + t.title }));
  }

  N2.register({
    id: 'history', title: 'Histórico', icon: '🕘', group: 'Sistema', desc: 'Últimas ferramentas utilizadas',
    render: function (root) {
      var h = store.get('history', []);
      ui.fill(root,
        el('div', { class: 'card' }, h.length ? h.map(histLine) : el('div', { class: 'empty' }, el('span', { class: 'big', text: '🕘' }), 'Nada por aqui ainda.')),
        h.length ? el('div', { class: 'toolbar' }, ui.button('🗑️ Limpar histórico', function () { store.set('history', []); N2.go('history'); }, 'danger')) : null);
    }
  });

  N2.register({
    id: 'shortcuts', title: 'Atalhos', icon: '⌨️', group: 'Sistema', desc: 'Atalhos de teclado',
    render: function (root) {
      var rows = [
        ['Ctrl + K', 'Busca global'],
        ['Alt + N', 'Nova nota (Ctrl + N também, quando o navegador permite)'],
        ['Ctrl + Shift + V', 'Abrir área de OCR'],
        ['Ctrl + V', 'Na tela de OCR: cola a imagem e já extrai o texto'],
        ['Ctrl + S', 'Salvar nota (o salvamento já é automático)'],
        ['Esc', 'Fechar janela / menu']
      ];
      root.append(el('div', { class: 'card' }, rows.map(function (r) {
        return el('div', { class: 'row', style: 'padding:7px 0' }, el('span', { style: 'width:150px' }, el('kbd', { text: r[0] })), el('span', { class: 'grow', text: r[1] }));
      })));
    }
  });

  N2.register({
    id: 'privacy', title: 'Privacidade', icon: '🔒', group: 'Sistema', desc: 'Onde ficam seus dados', keywords: 'backup exportar importar limpar dados',
    render: function (root) {
      var points = [
        'Notas, checklists, templates, base de conhecimento, favoritos e histórico ficam somente no armazenamento local (LocalStorage) deste navegador.',
        'O OCR é processado localmente no navegador. As imagens não são enviadas para nenhum servidor.',
        'Na primeira utilização do OCR o navegador baixa o motor (Tesseract.js) e o arquivo de idioma de uma CDN pública. É um download de programa, não um envio dos seus dados. Veja no README como deixar isso 100% offline.',
        'O conteúdo colado em JSON, XML, Comparador, Payload Inspector, Analisador e Ferramentas Rápidas existe apenas na memória da página e some ao sair da tela.',
        'Nenhuma informação é enviada para APIs externas. A aplicação não tem backend, telemetria nem cookies.',
        'Qualquer pessoa com acesso a este perfil do navegador consegue ler os dados locais. Evite registrar senhas, tokens e dados pessoais de clientes.'
      ];
      var imp = el('input', { type: 'file', accept: '.json,application/json', style: 'display:none', onchange: function () {
        var f = imp.files[0]; if (!f) return;
        f.text().then(function (t) {
          try { store.importAll(JSON.parse(t)); ui.toast('Backup importado'); N2.go('dashboard'); }
          catch (e) { ui.toast('Arquivo de backup inválido'); }
        });
      } });
      ui.fill(root,
        el('div', { class: 'card' }, el('ul', { style: 'margin:0;padding-left:18px' }, points.map(function (p) { return el('li', { style: 'margin-bottom:8px', text: p }); }))),
        el('div', { class: 'card' }, el('h2', { text: 'Seus dados' }),
          el('p', { class: 'muted', text: 'Faça um backup antes de trocar de navegador ou limpar os dados de navegação.' }),
          el('div', { class: 'toolbar' },
            ui.button('⬇️ Exportar backup', function () { ui.download('n2-toolkit-backup.json', JSON.stringify(store.exportAll(), null, 2), 'application/json'); }, 'primary'),
            ui.button('⬆️ Importar backup', function () { imp.click(); }), imp,
            ui.button('🗑️ Limpar todos os dados locais', function () {
              ui.confirm('Isso apaga notas, checklists, templates, base de conhecimento, histórico e favoritos deste navegador. Não pode ser desfeito.', function () {
                store.clearAll(); location.hash = '#/dashboard'; location.reload();
              }, 'Apagar tudo');
            }, 'danger'))));
    }
  });
})();
