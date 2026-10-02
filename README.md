# N2 Toolkit

Central de ferramentas para suporte, análise e produtividade em N2.
HTML, CSS e JavaScript puros — sem build, sem backend, sem dependências para instalar.

## Como executar

**Opção 1 — abrir direto:** dê dois cliques em `index.html`. Funciona pelo protocolo `file://`.

**Opção 2 — servidor local (recomendado para o OCR e para copiar/colar sem restrições):**

```bash
cd n2-toolkit
python -m http.server 8080      # ou: npx serve
```

Abra `http://localhost:8080`.

## OCR 100% offline (opcional)

O OCR usa Tesseract.js e roda no navegador, em Web Worker; a imagem nunca sai da máquina.
Por padrão, na primeira execução o navegador baixa o motor e o idioma de uma CDN pública
(jsDelivr). Para não depender de internet:

1. Baixe `tesseract.min.js` (pacote npm `tesseract.js` v5, pasta `dist/`) e salve em `js/vendor/tesseract.min.js`.
   O toolkit tenta esse arquivo antes da CDN.
2. Para também servir worker, núcleo WASM e idiomas localmente, passe `workerPath`, `corePath`
   e `langPath` em `Tesseract.createWorker(...)` no arquivo `js/ocr.js`.

## Estrutura

```
index.html
css/style.css          tokens de tema (claro/escuro), layout, responsividade
css/components.css     botão, card, modal, toast, tabs, diff, árvore...
js/app.js              núcleo: N2.register + componentes reutilizáveis (N2.ui)
js/storage.js          persistência local (LocalStorage), backup, limpeza
js/navigation.js       sidebar, header, rotas, busca global, tema, histórico, favoritos, atalhos
js/pages.js            Dashboard, Histórico, Atalhos, Privacidade
js/notes.js            Notas
js/ocr.js              OCR
js/utilities.js        Ferramentas rápidas
js/ticket-analyzer.js  Analisador N2
js/logistics.js        Central Logística
js/checklists.js       Checklists
js/templates.js        Respostas rápidas
js/knowledge.js        Minha Base N2
js/json-tools.js       JSON Tools (+ tela base reutilizada pelo XML)
js/xml-tools.js        XML Tools
js/compare.js          Comparador
js/payload.js          Payload Inspector
```

## Como adicionar uma ferramenta

1. Crie `js/minha-ferramenta.js`:

```js
(function () {
  var ui = N2.ui, el = ui.el;
  N2.register({
    id: 'minha', title: 'Minha Ferramenta', icon: '⭐', group: 'Ferramentas', // ou 'Trabalho'
    desc: 'Aparece no card do dashboard', keywords: 'termos para a busca global',
    render: function (root, params) {
      root.append(ui.card('Olá', el('p', { text: 'Conteúdo' })));
      // opcional: return function () { /* limpeza ao sair da tela */ };
    },
    // opcional: itens próprios na busca global
    search: function (q) { return []; } // [{ title, sub, go() }]
  });
})();
```

2. Inclua `<script src="js/minha-ferramenta.js"></script>` no `index.html`, antes de `navigation.js`.

Ela entra sozinha na sidebar, no dashboard, na busca global, no histórico e nos favoritos.

## Observações

- **Analisador N2** funciona por regras (rótulos como `Problema:` e palavras-chave). Ele só realoca
  trechos do texto colado; não usa IA e não acrescenta informação. Revise os campos antes de copiar.
- **Central Logística** traz conceitos genéricos e resumidos. Tópicos de uso interno (VG, Pagamento Fixo,
  Tabela de Preço etc.) ficam como "A cadastrar" para você preencher com as regras do seu ambiente.
- **Ctrl+N** é reservado pelo navegador para "nova janela"; use **Alt+N** para nova nota.
- Os dados ficam no LocalStorage do navegador. Use *Privacidade → Exportar backup* antes de trocar
  de navegador ou limpar dados de navegação.
- Itens marcados com **DEMO** são exemplos fictícios. O projeto não contém credenciais, endpoints
  nem dados de clientes.

## Roadmap

- Fases 1 a 3: implementadas (dashboard, notas, OCR, JSON, XML, ferramentas rápidas, analisador,
  checklists, templates, base, comparador, payload inspector, histórico, favoritos, atalhos).
- Fase 4: backup e importação/exportação completa já existem; faltam PWA/service worker e sincronização opcional.
- Fase 5: editores de checklist e de conteúdo já existem; faltam dashboard configurável, widgets
  e seleção de região da imagem no OCR.
