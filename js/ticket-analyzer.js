/* N2 Toolkit — Analisador N2.
 * Organiza a descrição de um chamado em campos por REGRAS (rótulos e palavras-chave).
 * Não usa IA e não inventa nada: cada trecho do texto original é apenas realocado
 * para um campo; o que não for reconhecido vai para OBSERVAÇÕES e campos sem
 * conteúdo ficam como "Não informado". Tudo é editável antes de gerar a nota. */
(function () {
  var ui = N2.ui, el = ui.el;

  var FIELDS = [
    { key: 'problema', label: 'PROBLEMA', lab: /^(problema|erro|descri[çc][ãa]o|relato)\s*[:\-]/i, kw: /\b(erro|falha|problema|rejei\w+|trav\w+|diverg\w+|inconsist\w+|n[ãa]o (est[áa]|consegue|integr\w+|ger\w+|emit\w+|aparec\w+|carreg\w+|funcion\w+))/i },
    { key: 'evidencias', label: 'EVIDÊNCIAS', lab: /^(evid[êe]ncias?|anexos?|prints?)\s*[:\-]/i, kw: /\b(print|anexo|anexad\w+|evid[êe]ncia|screenshot|imagem|protocolo|\d{44}|segue (o |a )?(log|xml|json))/i },
    { key: 'cenario', label: 'CENÁRIO', lab: /^(cen[áa]rio|contexto|ambiente)\s*[:\-]/i, kw: /\b(cen[áa]rio|ambiente|tela|m[óo]dulo|filial|unidade|usu[áa]rio|vers[ãa]o|quando|ao (tentar|acessar|emitir|gerar|clicar|salvar))/i },
    { key: 'validacoes', label: 'VALIDAÇÕES REALIZADAS', lab: /^(valida[çc][õo]es( realizadas)?|an[áa]lise|testes?)\s*[:\-]/i, kw: /\b(validad\w+|validei|verificad\w+|verifiquei|conferid\w+|conferi|consultad\w+|consultei|testad\w+|testei|reprocessad\w+|reprocessei|analisad\w+|analisei|checad\w+)/i },
    { key: 'resultado', label: 'RESULTADO DAS VALIDAÇÕES', lab: /^(resultados?( das valida[çc][õo]es)?|retorno)\s*[:\-]/i, kw: /\b(resultado|retornou|constatad\w+|identificad\w+|identifiquei|sem sucesso|persist\w+|normalizou|voltou a|foi poss[íi]vel)/i },
    { key: 'causa', label: 'POSSÍVEL CAUSA', lab: /^((poss[íi]vel |prov[áa]vel )?causa( raiz)?|motivo)\s*[:\-]/i, kw: /\b(causa|devido|por conta d|em raz[ãa]o|motivo|provavelmente|possivelmente|aparentemente)/i },
    { key: 'acao', label: 'PRÓXIMA AÇÃO', lab: /^(pr[óo]xim[ao]s? (a[çc][ãa]o|a[çc][õo]es|passos?)|a[çc][ãa]o)\s*[:\-]/i, kw: /\b(pr[óo]xim\w+ (passo|a[çc])|aguardand\w+|aguardar|ser[áa] necess[áa]rio|necess[áa]rio|favor|solicit\w+|pendente)/i },
    { key: 'responsavel', label: 'RESPONSÁVEL', lab: /^(respons[áa]vel|analista|atribu[íi]do( a)?)\s*[:\-]/i, kw: /\b(respons[áa]vel|atribu[íi]d\w+|analista)\b/i },
    { key: 'escalar', label: 'NECESSITA ESCALONAMENTO?', lab: /^(escalonamento|escalar|necessita escalonamento\??)\s*[:\-]/i, kw: /\b(escal\w+|n3|desenvolvimento|fornecedor|f[áa]brica)\b/i },
    { key: 'obs', label: 'OBSERVAÇÕES', lab: /^(observa[çc][õo]es|obs\.?)\s*[:\-]/i, kw: null }
  ];
  // ordem de prioridade quando um trecho casa com mais de uma regra
  var PRIORITY = ['escalar', 'validacoes', 'resultado', 'causa', 'evidencias', 'acao', 'responsavel', 'problema', 'cenario'];
  var EMPTY = 'Não informado';
  // relato fictício para demonstração
  var SAMPLE = 'Usuário da filial Exemplo informa que o CT-e 1001 foi autorizado na SEFAZ mas não integrou com o financeiro. '
    + 'Segue print da tela em anexo. Validei a chave de acesso e consultei os logs de integração. '
    + 'O reprocessamento retornou erro de timeout. Possivelmente a fila de integração está parada. '
    + 'Será necessário escalar para o N3 caso o erro persista após nova tentativa.';

  function analyze(text) {
    var res = {}; FIELDS.forEach(function (f) { res[f.key] = []; });
    var segs = text.replace(/\r/g, '').split(/\n+|(?<=[.!?])\s+(?=[A-ZÀ-Ú0-9])/).map(function (s) { return s.trim(); }).filter(Boolean);
    var lastLabeled = null;
    segs.forEach(function (s, idx) {
      var byLabel = FIELDS.find(function (f) { return f.lab.test(s); });
      if (byLabel) {
        var rest = s.replace(byLabel.lab, '').trim();
        if (rest) res[byLabel.key].push(rest);
        lastLabeled = rest ? null : byLabel.key; // rótulo sozinho na linha: próxima linha pertence a ele
        return;
      }
      if (lastLabeled) { res[lastLabeled].push(s); return; }
      var key = PRIORITY.find(function (k) { return FIELDS.find(function (f) { return f.key === k; }).kw.test(s); });
      if (!key) key = (idx === 0) ? 'problema' : 'obs';
      res[key].push(s);
    });
    var out = {};
    FIELDS.forEach(function (f) { out[f.key] = res[f.key].join('\n'); });
    return out;
  }

  N2.register({
    id: 'ticket', title: 'Analisador N2', icon: '🎫', group: 'Trabalho', desc: 'Estruture a descrição de um chamado', keywords: 'chamado ticket nota técnica análise',
    render: function (root, params) {
      var input = el('textarea', { rows: 10, placeholder: 'Cole aqui a descrição do chamado…', value: params.text || '' });
      var areas = {}, result = el('div'), noteOut = el('textarea', { rows: 14, readonly: true, placeholder: 'A nota técnica aparece aqui.' });

      function values() { var v = {}; FIELDS.forEach(function (f) { v[f.key] = areas[f.key] ? areas[f.key].value.trim() : ''; }); return v; }
      function structuredText() {
        var v = values();
        return FIELDS.map(function (f) { return f.label + ':\n' + (v[f.key] || EMPTY); }).join('\n\n');
      }
      function gen() {
        if (!input.value.trim()) { ui.toast('Cole a descrição do chamado'); return; }
        var a = analyze(input.value);
        ui.fill(result, 
          el('div', { class: 'notice', text: 'Os trechos abaixo foram apenas reorganizados a partir do seu texto (por rótulos e palavras-chave). Revise e mova o que estiver no campo errado — nada foi acrescentado.' }),
          FIELDS.map(function (f) {
            areas[f.key] = el('textarea', { rows: Math.max(2, a[f.key].split('\n').length), placeholder: EMPTY, value: a[f.key] });
            return el('label', { class: 'field' }, el('span', { text: f.label }), areas[f.key]);
          }),
          el('div', { class: 'toolbar' }, ui.copyBtn(structuredText, '📋 Copiar análise'), ui.button('Gerar nota técnica', note, 'primary')));
      }
      function note() {
        if (!areas.problema) gen();
        if (!areas.problema) return;
        var v = values(), missing = [], lines = ['NOTA TÉCNICA — SUPORTE N2', 'Data: ' + new Date().toLocaleString('pt-BR'), ''];
        var titles = { problema: 'Problema relatado', evidencias: 'Evidências', cenario: 'Cenário', validacoes: 'Validações realizadas', resultado: 'Resultado das validações',
          causa: 'Possível causa', acao: 'Próxima ação', responsavel: 'Responsável', escalar: 'Escalonamento', obs: 'Observações' };
        FIELDS.forEach(function (f) {
          if (v[f.key]) lines.push(titles[f.key] + ':', v[f.key], '');
          else if (f.key !== 'obs') missing.push(titles[f.key]);
        });
        if (missing.length) lines.push('Itens não informados no relato: ' + missing.join('; ') + '.');
        noteOut.value = lines.join('\n').trim();
      }

      root.append(el('div', { class: 'split' },
        el('div', null,
          ui.card('Descrição do chamado', input,
            el('div', { class: 'toolbar' }, ui.button('Gerar análise estruturada', gen, 'primary'), ui.button('Gerar nota técnica', note),
              ui.button('Limpar', function () { input.value = ''; areas = {}; ui.fill(result, ui.empty('🎫', 'Cole o relato e clique em "Gerar análise estruturada".')); noteOut.value = ''; }),
              ui.button('💡 Exemplo', function () { input.value = SAMPLE; gen(); note(); }, 'ghost'))),
          ui.card('Nota técnica', noteOut, el('div', { class: 'toolbar' }, ui.copyBtn(function () { return noteOut.value; }),
            ui.button('📝 Salvar como nota', function () {
              if (!noteOut.value) { ui.toast('Gere a nota primeiro'); return; }
              var notes = N2.store.get('notes', []), now = Date.now();
              notes.push({ id: ui.uid(), title: 'Nota técnica ' + new Date().toLocaleDateString('pt-BR'), cat: 'Geral', tags: [], pinned: false, body: noteOut.value, created: now, updated: now });
              N2.store.set('notes', notes); ui.toast('Salvo em Notas');
            })))),
        ui.card('Análise estruturada', result)));
      result.append(ui.empty('🎫', 'Cole o relato e clique em "Gerar análise estruturada".'));
      if (params.text) gen();
    }
  });
})();
