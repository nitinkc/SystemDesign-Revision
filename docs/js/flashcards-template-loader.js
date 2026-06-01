(function (global) {
  'use strict';

  var ACTIVE_REQUEST_ID = 0;

  function text(id, value) {
    var node = document.getElementById(id);
    if (node) node.textContent = value;
  }

  function applyTheme(accent) {
    /* Theme classes are on the wrapper div in the template — only set CSS vars for custom accent */
    var wrapper = document.querySelector('.sd-page.flashcards-page');
    if (wrapper && accent) wrapper.style.setProperty('--fc-accent', accent);
  }

  function getConfig() {
    var root = document.getElementById('sd-flashcards-root');
    if (!root) return null;
    return {
      root: root,
      jsonSourceUrl: root.getAttribute('data-json-source') || ''
    };
  }

  function mountFlashcards(payload) {
    text('fc-page-title', payload.title || 'Flashcards');
    text('fc-page-sub', payload.subtitle || 'Click to flip.');

    applyTheme(payload.accent || '#8B83E6');

    FlashcardEngine.mount({
      cards: Array.isArray(payload.cards) ? payload.cards : [],
      storageKey: payload.storageKey || null,
      fileBase: payload.fileBase || 'flashcards',
      typeColors: payload.typeColors || { def: '#8B83E6', concept: '#34D399', tradeoff: '#F87171', app: '#60A5FA' },
      questionBg: payload.questionBg || '#1A1D27',
      answerBg: payload.answerBg || '#1E2130',
      ids: {
        pills: 'pills',
        mainPanel: 'main-panel',
        donePanel: 'done-panel',
        typedot: 'typedot',
        sideLabel: 'sidelabel',
        categoryTag: 'cattag',
        cardText: 'cardtext',
        hintText: 'hinttext',
        rateRow: 'ratebts',
        cardShell: 'thecard',
        progressBar: 'prog-bar',
        countKnown: 'sk',
        countLeft: 'sl',
        navCount: 'nc3',
        doneScore: 'dscore',
        donePct: 'dpct',
        doneMsg: 'dmsg',
        doneCats: 'dcg'
      },
      persist: payload.persist !== false
    });
  }

  function showError(msg) {
    var mainPanel = document.getElementById('main-panel');
    var donePanel = document.getElementById('done-panel');
    if (mainPanel) mainPanel.style.display = 'none';
    if (donePanel) {
      donePanel.style.display = 'block';
      donePanel.innerHTML = '<div class="done-msg">' + msg + '</div>';
    }
  }

  function init() {
    var cfg = getConfig();
    if (!cfg) return;

    if (cfg.root.getAttribute('data-initialized') === '1') return;
    cfg.root.setAttribute('data-initialized', '1');

    if (!cfg.jsonSourceUrl) {
      showError('Flashcard configuration is missing JSON source URL.');
      return;
    }

    var reqId = ++ACTIVE_REQUEST_ID;
    fetch(cfg.jsonSourceUrl)
      .then(function (res) {
        if (!res.ok) throw new Error('Could not fetch flashcards JSON: ' + cfg.jsonSourceUrl);
        return res.json();
      })
      .then(function (payload) {
        if (reqId !== ACTIVE_REQUEST_ID) return;
        mountFlashcards(payload || {});
      })
      .catch(function (err) {
        if (reqId !== ACTIVE_REQUEST_ID) return;
        showError('Unable to load flashcards data. ' + err.message);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  if (global.document$ && typeof global.document$.subscribe === 'function') {
    global.document$.subscribe(function () {
      init();
    });
  }
})(window);

