/* N2 Toolkit — OCR local (Tesseract.js, executa em Web Worker no próprio navegador).
 * A biblioteca só é carregada quando o usuário roda o primeiro OCR.
 * Ordem de carga: js/vendor/tesseract.min.js (cópia local, opcional) -> CDN. */
(function () {
  var ui = N2.ui, el = ui.el;
  var MAX_BYTES = 10 * 1024 * 1024;
  var TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/bmp', 'image/gif'];
  var LOCAL = 'js/vendor/tesseract.min.js';
  var CDN = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
  var loading = null;

  function loadScript(src) {
    return new Promise(function (ok, fail) {
      var s = document.createElement('script');
      s.src = src; s.onload = ok; s.onerror = function () { s.remove(); fail(new Error(src)); };
      document.head.append(s);
    });
  }
  function loadTesseract() {
    if (window.Tesseract) return Promise.resolve();
    if (!loading) loading = loadScript(LOCAL).catch(function () { return loadScript(CDN); }).catch(function (e) { loading = null; throw e; });
    return loading;
  }

  N2.register({
    id: 'ocr', title: 'OCR', icon: '🖼️', group: 'Ferramentas', desc: 'Extrair texto da imagem', keywords: 'imagem print texto tesseract',
    render: function (root) {
      var file = null, url = null, busy = false;
      var lang = ui.dropdown([{ value: 'por', label: 'Português' }, { value: 'eng', label: 'Inglês' }, { value: 'spa', label: 'Espanhol' }], 'por');
      lang.style.width = 'auto';
      var out = el('textarea', { rows: 16, placeholder: 'O texto extraído aparece aqui.' });
      var bar = el('progress', { max: 1, value: 0 }), status = el('div', { class: 'small muted', text: 'Aguardando imagem.' });
      var drop = ui.fileUploader({ accept: TYPES.join(','), label: 'Clique, arraste uma imagem ou pressione Ctrl+V para colar', onFile: setFile });
      var hint = drop.firstChild;

      function setFile(f, auto) {
        if (TYPES.indexOf(f.type) < 0) { ui.toast('Formato não suportado. Use PNG, JPG, WEBP, BMP ou GIF.'); return; }
        if (f.size > MAX_BYTES) { ui.toast('Imagem maior que 10 MB.'); return; }
        file = f;
        if (url) URL.revokeObjectURL(url);
        url = URL.createObjectURL(f);
        ui.fill(hint, el('img', { src: url, alt: 'Pré-visualização' }));
        status.textContent = 'Imagem carregada (' + Math.round(f.size / 1024) + ' KB).';
        bar.value = 0;
        if (auto) run();
      }
      function run() {
        if (!file) { ui.toast('Selecione uma imagem primeiro'); return; }
        if (busy) return;
        busy = true; status.textContent = 'Carregando motor de OCR…'; bar.removeAttribute('value');
        var worker;
        loadTesseract().then(function () {
          return Tesseract.createWorker(lang.value, 1, { logger: function (m) {
            status.textContent = m.status + '…';
            if (m.status === 'recognizing text') bar.value = m.progress;
          } });
        }).then(function (w) { worker = w; return w.recognize(file); })
          .then(function (r) {
            out.value = r.data.text.trim(); bar.value = 1;
            status.textContent = 'Concluído · confiança média ' + Math.round(r.data.confidence) + '%';
          })
          .catch(function (e) {
            console.error(e); bar.value = 0;
            status.textContent = 'Não foi possível executar o OCR. Na primeira execução é preciso internet para baixar o motor e o idioma (ou instale a cópia local — veja o README).';
          })
          .then(function () { busy = false; if (worker) worker.terminate(); });
      }
      function clear() {
        file = null; if (url) URL.revokeObjectURL(url); url = null;
        ui.fill(hint, 'Clique, arraste uma imagem ou pressione Ctrl+V para colar');
        out.value = ''; bar.value = 0; status.textContent = 'Aguardando imagem.';
      }
      // Ctrl+V com imagem na área de transferência -> carrega e já extrai
      function onPaste(e) {
        var items = (e.clipboardData && e.clipboardData.items) || [];
        for (var i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image/') === 0) { e.preventDefault(); setFile(items[i].getAsFile(), true); return; }
        }
      }
      document.addEventListener('paste', onPaste);

      root.append(
        el('div', { class: 'notice', text: '🔒 Privacidade: a imagem é processada localmente e não é enviada para um servidor.' }),
        el('div', { class: 'split' },
          ui.card('Imagem', drop,
            el('div', { class: 'toolbar' }, lang, ui.button('▶ Extrair texto', run, 'primary'), ui.button('Limpar', clear)),
            bar, status),
          ui.card('Texto extraído', out,
            el('div', { class: 'toolbar' },
              ui.copyBtn(function () { return out.value; }),
              ui.button('⬇️ TXT', function () { ui.download('ocr.txt', out.value); }),
              ui.button('⬇️ PDF', function () { ui.download('ocr.pdf', ui.textToPdf(out.value)); }),
              ui.button('🎫 Enviar ao Analisador', function () { N2.go('ticket', { text: out.value }); })))));

      return function () { document.removeEventListener('paste', onPaste); if (url) URL.revokeObjectURL(url); };
    }
  });
})();
