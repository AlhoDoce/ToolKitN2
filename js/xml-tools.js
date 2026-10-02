/* N2 Toolkit — XML Tools (parser nativo do navegador, sem bibliotecas). */
(function () {
  function esc(s, attr) {
    s = String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return attr ? s.replace(/"/g, '&quot;') : s;
  }
  function parse(text) {
    var doc = new DOMParser().parseFromString(text.trim(), 'application/xml');
    var err = doc.getElementsByTagName('parsererror')[0];
    if (err) {
      var msg = err.textContent.replace(/\s+/g, ' ');
      var m = msg.match(/error on line.*?(?= Below|$)/i);
      throw new Error(m ? m[0] : msg);
    }
    return doc;
  }
  function meaningful(node) {
    return Array.from(node.childNodes).filter(function (c) { return !(c.nodeType === 3 && !c.nodeValue.trim()); });
  }
  function ser(node, depth, pretty) {
    var pad = pretty ? '  '.repeat(depth) : '', nl = pretty ? '\n' : '';
    switch (node.nodeType) {
      case 1:
        var open = '<' + node.nodeName + Array.from(node.attributes).map(function (a) { return ' ' + a.name + '="' + esc(a.value, true) + '"'; }).join('');
        var kids = meaningful(node);
        if (!kids.length) return pad + open + '/>';
        if (kids.every(function (c) { return c.nodeType === 3; }))
          return pad + open + '>' + esc(kids.map(function (c) { return c.nodeValue; }).join('').trim()) + '</' + node.nodeName + '>';
        return pad + open + '>' + nl + kids.map(function (c) { return ser(c, depth + 1, pretty); }).join(nl) + nl + pad + '</' + node.nodeName + '>';
      case 3: return pad + esc(node.nodeValue.trim());
      case 4: return pad + '<![CDATA[' + node.nodeValue + ']]>';
      case 8: return pad + '<!--' + node.nodeValue + '-->';
      case 7: return pad + '<?' + node.target + ' ' + node.data + '?>';
      default: return pad + new XMLSerializer().serializeToString(node);
    }
  }
  function format(text, pretty) {
    var doc = parse(text), decl = text.match(/^\s*(<\?xml[^?]*\?>)/);
    var parts = Array.from(doc.childNodes).map(function (n) { return ser(n, 0, pretty); });
    if (decl) parts.unshift(decl[1]);
    return parts.join(pretty ? '\n' : '');
  }
  /** Converte elemento em objeto simples: atributos como "@nome", texto como "#text". */
  function toObj(node) {
    var kids = meaningful(node), els = kids.filter(function (c) { return c.nodeType === 1; });
    var text = kids.filter(function (c) { return c.nodeType === 3 || c.nodeType === 4; }).map(function (c) { return c.nodeValue; }).join('').trim();
    if (!els.length && !node.attributes.length) return text;
    var o = {};
    Array.from(node.attributes).forEach(function (a) { o['@' + a.name] = a.value; });
    els.forEach(function (c) {
      var v = toObj(c);
      if (c.nodeName in o) { if (!Array.isArray(o[c.nodeName])) o[c.nodeName] = [o[c.nodeName]]; o[c.nodeName].push(v); }
      else o[c.nodeName] = v;
    });
    if (text) o['#text'] = text;
    return o;
  }
  function toObject(text) { var r = parse(text).documentElement, o = {}; o[r.nodeName] = toObj(r); return o; }

  N2.xml = { parse: parse, format: function (t) { return format(t, true); }, minify: function (t) { return format(t, false); }, toObject: toObject };

  N2.register({
    id: 'xml', title: 'XML Tools', icon: '🗂️', group: 'Ferramentas', desc: 'Formatar, minificar, validar, árvore, busca por tag', keywords: 'xml formatador minificador validador',
    render: function (root) {
      N2.structPage(root, { name: 'XML', sample: '<viagem id="10234"><status>PENDENTE</status><documentos><documento tipo="CT-e"><numero>1001</numero><status>AUTORIZADO</status></documento><documento tipo="MDF-e"><numero>501</numero><status>REJEITADO</status></documento></documentos></viagem>', placeholder: '<cole><seu>XML aqui</seu></cole>', searchLabel: 'Buscar tag…',
        format: N2.xml.format, minify: N2.xml.minify, toObject: N2.xml.toObject });
    }
  });
})();
