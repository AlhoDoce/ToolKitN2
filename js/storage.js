/* N2 Toolkit — persistência local (LocalStorage, prefixo "n2tk:").
 * Nada é enviado para servidores: tudo fica neste navegador. */
(function () {
  var P = 'n2tk:';
  var mem = {}; // fallback se o LocalStorage estiver bloqueado

  function get(key, def) {
    try {
      var raw = localStorage.getItem(P + key);
      return raw == null ? (key in mem ? mem[key] : def) : JSON.parse(raw);
    } catch (e) { return key in mem ? mem[key] : def; }
  }
  function set(key, val) {
    mem[key] = val;
    try { localStorage.setItem(P + key, JSON.stringify(val)); } catch (e) { /* cota/privado: mantém em memória */ }
  }
  function keys() {
    var out = [];
    try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k.indexOf(P) === 0) out.push(k.slice(P.length)); } } catch (e) {}
    return out;
  }
  /** Apaga tudo. Marca "cleared" para não recriar notas/base de demonstração. */
  function clearAll() {
    var theme = get('theme');
    keys().forEach(function (k) { try { localStorage.removeItem(P + k); } catch (e) {} });
    mem = {};
    set('cleared', true);
    if (theme) set('theme', theme);
  }
  /** Backup completo (Fase 4 do roadmap já preparada). */
  function exportAll() { var o = {}; keys().forEach(function (k) { o[k] = get(k); }); return o; }
  function importAll(obj) { Object.keys(obj || {}).forEach(function (k) { set(k, obj[k]); }); }

  /** Carrega uma coleção; na primeira vez grava os dados iniciais.
   *  demoOnly=true: dados puramente de demonstração, não voltam após "limpar tudo". */
  function seed(key, makeDefault, demoOnly) {
    var v = get(key, null);
    if (v == null) { v = (demoOnly && get('cleared')) ? [] : makeDefault(); set(key, v); }
    return v;
  }

  N2.store = { get: get, set: set, clearAll: clearAll, exportAll: exportAll, importAll: importAll, seed: seed };
})();
