document.addEventListener('DOMContentLoaded', function () {
  if (typeof mermaid !== 'undefined') {
    mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' });

    document.querySelectorAll('div.highlight pre').forEach(function (pre) {
      const code = pre.textContent.trim();
      const mermaidKeywords = ['graph', 'sequenceDiagram', 'classDiagram',
        'stateDiagram', 'erDiagram', 'journey', 'gitGraph', 'pie', 'requirement'];

      if (mermaidKeywords.some(kw => code.startsWith(kw))) {
        const diagram = document.createElement('div');
        diagram.className = 'mermaid';
        diagram.textContent = code;
        pre.parentElement.replaceWith(diagram);
      }
    });

    if (window.mermaid && window.mermaid.contentLoaded) {
      mermaid.contentLoaded();
    }
  }
});
