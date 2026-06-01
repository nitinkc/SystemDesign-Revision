(function (global) {
  'use strict';

  function byId(id) {
    return id ? document.getElementById(id) : null;
  }

  function text(el, value) {
    if (el) el.textContent = value;
  }

  function html(el, value) {
    if (el) el.innerHTML = value;
  }

  function show(el, value) {
    if (el) el.style.display = value;
  }

  function cloneList(list) {
    return (list || []).map(function (item) {
      return item;
    });
  }

  function shuffle(list) {
    var arr = cloneList(list);
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function safeParse(raw) {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (err) {
      return null;
    }
  }

  function safeStorage() {
    try {
      return global.localStorage;
    } catch (err) {
      return null;
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function setButtonActive(el, active) {
    if (!el) return;
    if (active) el.classList.add('active');
    else el.classList.remove('active');
  }

  function defaultQuizMotivation(pct) {
    if (pct >= 90) return 'Outstanding — you clearly understand this material deeply.';
    if (pct >= 75) return 'Strong performance — just a few gaps to review.';
    if (pct >= 55) return 'Solid foundation — review the explanations for missed questions.';
    return 'Keep studying — revisit the article and retake the quiz.';
  }

  function defaultFlashcardMotivation(pct) {
    if (pct >= 80) return 'Excellent — you know this material well.';
    if (pct >= 60) return 'Good progress — review the ones you missed.';
    return 'Keep going — try unknowns-only mode.';
  }

  function createQuizApp(cfg) {
    cfg = cfg || {};
    var ids = cfg.ids || {};
    var storage = cfg.storageKey ? safeStorage() : null;
    var letters = cfg.letters || ['A', 'B', 'C', 'D'];
    var state = {
      questions: [],
      order: [],
      idx: 0,
      selected: null,
      checked: false,
      catScores: {},
      catTotals: {},
      completed: false,
    };

    function el(name) {
      return byId(ids[name]);
    }

    function questionText(q) {
      return q && (q.q || q.question || '');
    }

    function optionsList(q) {
      return (q && q.opts) || [];
    }

    function explanationText(q) {
      return q && (q.exp || q.expl || q.explanation || '');
    }

    function resultMessage(pct) {
      return typeof cfg.motivation === 'function' ? cfg.motivation(pct, state) : defaultQuizMotivation(pct);
    }

    function save() {
      if (!storage || !cfg.storageKey) return;
      var payload = {
        version: 1,
        order: state.order,
        idx: state.idx,
        selected: state.selected,
        checked: state.checked,
        catScores: state.catScores,
        completed: state.completed,
      };
      try {
        storage.setItem(cfg.storageKey, JSON.stringify(payload));
      } catch (err) {
        // ignore storage errors in static environments
      }
    }

    function load() {
      if (!storage || !cfg.storageKey) return null;
      return safeParse(storage.getItem(cfg.storageKey));
    }

    function clearSaved() {
      if (!storage || !cfg.storageKey) return;
      try {
        storage.removeItem(cfg.storageKey);
      } catch (err) {
        // ignore storage errors in static environments
      }
    }

    function buildQuestionSet(order) {
      var source = cloneList(cfg.questions || []);
      var set = order && order.length ? order.map(function (index) {
        return source[index];
      }).filter(Boolean) : (cfg.shuffle === false ? source : shuffle(source));

      state.questions = set;
      state.order = set.map(function (q) {
        return source.indexOf(q);
      });

      state.catTotals = {};
      state.catScores = {};
      set.forEach(function (q) {
        state.catTotals[q.cat] = (state.catTotals[q.cat] || 0) + 1;
        if (typeof state.catScores[q.cat] !== 'number') state.catScores[q.cat] = 0;
      });
    }

    function renderQuestion() {
      var q = state.questions[state.idx];
      if (!q) return;

      var total = state.questions.length;
      var progPct = total ? Math.round((state.idx / total) * 100) : 0;
      text(el('progressLabel'), 'Question ' + (state.idx + 1) + ' of ' + total);
      if (el('progressBar')) el('progressBar').style.width = progPct + '%';
      text(el('categoryLabel'), q.cat || '');
      text(el('questionText'), questionText(q));

      var optsEl = el('options');
      if (optsEl) {
        var opts = optionsList(q);
        optsEl.innerHTML = '';
        opts.forEach(function (opt, i) {
          var cls = 'opt';
          if (state.checked) {
            if (i === q.ans) cls += ' correct';
            else if (i === state.selected) cls += ' wrong';
            else cls += ' dim';
          } else if (i === state.selected) {
            cls += ' sel';
          }
          var node = document.createElement('div');
          node.className = cls;
          node.innerHTML = '<span class="letter">' + escapeHtml(letters[i] || String.fromCharCode(65 + i)) + '</span><span class="opt-text">' + escapeHtml(opt) + '</span>';
          if (!state.checked) {
            node.addEventListener('click', function () { api.selectOption(i); });
          }
          optsEl.appendChild(node);
        });
      }

      var explEl = el('explanation');
      if (explEl) {
        if (state.checked) {
          var ok = state.selected === q.ans;
          explEl.textContent = (ok ? '✓ Correct — ' : '✗ Incorrect — ') + explanationText(q);
          explEl.className = ok ? 'correct' : 'wrong';
          show(explEl, 'block');
        } else {
          show(explEl, 'none');
          explEl.className = '';
          explEl.textContent = '';
        }
      }

      setButtonActive(el('checkButton'), state.selected !== null && !state.checked);
      if (el('nextButton')) {
        show(el('nextButton'), state.checked ? 'inline-block' : 'none');
        text(el('nextButton'), state.idx < state.questions.length - 1 ? 'Next →' : 'See results →');
      }
    }

    function showQuiz() {
      show(el('quizCard'), 'block');
      show(el('resultsCard'), 'none');
    }

    function showResults() {
      state.completed = true;
      clearSaved();
      show(el('quizCard'), 'none');
      show(el('resultsCard'), 'block');

      var total = state.questions.length || 1;
      var correct = 0;
      Object.keys(state.catScores).forEach(function (k) {
        correct += state.catScores[k] || 0;
      });
      var pct = Math.round((correct / total) * 100);
      var summary = {
        total: total,
        correct: correct,
        pct: pct,
        catScores: state.catScores,
        catTotals: state.catTotals,
      };
      if (typeof cfg.renderResults === 'function') {
        cfg.renderResults(summary, api, state);
      } else {
        text(el('resultScore'), correct + ' / ' + total);
        text(el('resultPct'), pct + '%');
        text(el('resultMotiv'), resultMessage(pct));
        if (el('resultCats')) {
          var htmlStr = Object.keys(state.catTotals).map(function (cat) {
            return '<div class="cat-card"><div class="cat-name">' + escapeHtml(cat) + '</div><div class="cat-score">' + (state.catScores[cat] || 0) + ' / ' + state.catTotals[cat] + '</div></div>';
          }).join('');
          html(el('resultCats'), htmlStr);
        }
      }
      if (el('progressBar')) el('progressBar').style.width = '100%';
      if (el('progressLabel')) text(el('progressLabel'), 'Quiz complete — ' + state.questions.length + ' questions');
    }

    function startFresh() {
      state.completed = false;
      state.idx = 0;
      state.selected = null;
      state.checked = false;
      buildQuestionSet();
      hideResumeBanner();
      showQuiz();
      renderQuestion();
      save();
    }

    function restore(saved) {
      state.completed = false;
      buildQuestionSet(saved.order || []);
      state.idx = Math.max(0, Math.min(saved.idx || 0, state.questions.length - 1));
      state.selected = typeof saved.selected === 'number' ? saved.selected : null;
      state.checked = !!saved.checked;
      state.catScores = saved.catScores || state.catScores;
      state.order = saved.order || state.order;
      hideResumeBanner();
      showQuiz();
      renderQuestion();
    }

    function maybeResume() {
      var saved = load();
      if (saved && saved.order && saved.order.length === (cfg.questions || []).length && !saved.completed) {
        if (ids.resumeBanner && ids.resumeMessage) {
          text(el('resumeMessage'), 'You left off at question ' + (Math.min(saved.idx || 0, (cfg.questions || []).length - 1) + 1) + ' of ' + (cfg.questions || []).length + '. Resume where you stopped?');
          show(el('resumeBanner'), 'flex');
          show(el('quizCard'), 'none');
          show(el('resultsCard'), 'none');
          return;
        }
        restore(saved);
        return;
      }
      startFresh();
    }

    function hideResumeBanner() {
      if (el('resumeBanner')) show(el('resumeBanner'), 'none');
    }

    function selectOption(i) {
      if (state.checked) return;
      state.selected = i;
      save();
      renderQuestion();
    }

    function checkAnswer() {
      if (state.selected === null || state.checked) return;
      state.checked = true;
      var q = state.questions[state.idx];
      if (state.selected === q.ans) {
        state.catScores[q.cat] = (state.catScores[q.cat] || 0) + 1;
      }
      save();
      renderQuestion();
    }

    function nextQuestion() {
      if (state.idx < state.questions.length - 1) {
        state.idx += 1;
        state.selected = null;
        state.checked = false;
        save();
        renderQuestion();
      } else {
        showResults();
      }
    }

    function restart() {
      clearSaved();
      if (ids.resumeBanner) show(el('resumeBanner'), 'none');
      startFresh();
    }

    function resume() {
      var saved = load();
      if (!saved) return restart();
      restore(saved);
    }

    function discardSession() {
      clearSaved();
      hideResumeBanner();
      startFresh();
    }

    var api = {
      startFresh: startFresh,
      restart: restart,
      resume: resume,
      discardSession: discardSession,
      selectOption: selectOption,
      checkAnswer: checkAnswer,
      nextQuestion: nextQuestion,
      showResults: showResults,
      state: state,
    };

    if (cfg.autoStart !== false) {
      maybeResume();
    }

    return api;
  }

  function createFlashcardApp(cfg) {
    cfg = cfg || {};
    var ids = cfg.ids || {};
    var storage = cfg.storageKey ? safeStorage() : null;
    var state = {
      deck: [],
      activeCat: 'All',
      idx: 0,
      revealed: false,
      known: {},
      unknownSet: {},
      studyMode: 'all',
    };

    function el(name) {
      return byId(ids[name]);
    }

    function cards() {
      return cloneList(cfg.cards || []);
    }

    var classNames = cfg.classNames || {};
    var labelQuestionClass = classNames.labelQuestion || 'fc-label q';
    var labelAnswerClass = classNames.labelAnswer || 'fc-label a';
    var questionTextClass = classNames.questionText || 'fc-q';
    var answerTextClass = classNames.answerText || 'fc-a';
    var answerExampleClass = classNames.answerExample || 'fc-ex';

    function cardQuestion(card) {
      return card && (card.q || card.question || '');
    }

    function cardAnswer(card) {
      return card && (card.a || card.answer || '');
    }

    function cardExample(card) {
      return card && (card.ex || card.example || '');
    }

    function save() {
      if (!storage || !cfg.storageKey) return;
      try {
        storage.setItem(cfg.storageKey, JSON.stringify({
          version: 1,
          deckMode: true,
          activeCat: state.activeCat,
          idx: state.idx,
          revealed: state.revealed,
          known: state.known,
          unknownSet: state.unknownSet,
          studyMode: state.studyMode,
        }));
      } catch (err) {
        // ignore storage errors in static environments
      }
    }

    function load() {
      if (!storage || !cfg.storageKey) return null;
      return safeParse(storage.getItem(cfg.storageKey));
    }

    function clearSaved() {
      if (!storage || !cfg.storageKey) return;
      try {
        storage.removeItem(cfg.storageKey);
      } catch (err) {
        // ignore storage errors in static environments
      }
    }

    function categories() {
      var seen = {};
      var out = ['All'];
      cards().forEach(function (c) {
        if (!seen[c.cat]) {
          seen[c.cat] = true;
          out.push(c.cat);
        }
      });
      return out;
    }

    function filteredDeck() {
      var all = cards();
      if (state.activeCat === 'All') return all;
      return all.filter(function (c) { return c.cat === state.activeCat; });
    }

    function currentDeck() {
      if (state.studyMode === 'unknown') {
        return state.deck.filter(function (c) { return !state.known[cardQuestion(c)]; });
      }
      return state.deck;
    }

    function knownInDeck(deck) {
      return deck.filter(function (c) { return !!state.known[cardQuestion(c)]; }).length;
    }

    function buildPills() {
      if (!el('pills')) return;
      var htmlStr = categories().map(function (cat) {
        return '<span class="pill' + (state.activeCat === cat ? ' on' : '') + '" data-cat="' + escapeHtml(cat) + '">' + escapeHtml(cat) + '</span>';
      }).join('');
      html(el('pills'), htmlStr);
      Array.prototype.slice.call(el('pills').children).forEach(function (node) {
        node.addEventListener('click', function () {
          api.setCat(node.getAttribute('data-cat'));
        });
      });
    }

    function showMain() {
      show(el('mainPanel'), '');
      show(el('donePanel'), 'none');
    }

    function showDone() {
      show(el('mainPanel'), 'none');
      show(el('donePanel'), '');
      var deck = state.deck;
      var total = deck.length || 1;
      var k = deck.filter(function (c) { return !!state.known[cardQuestion(c)]; }).length;
      var pct = Math.round((k / total) * 100);
      text(el('doneScore'), k + ' / ' + total);
      if (el('donePct')) text(el('donePct'), pct + '%');
      text(el('doneMsg'), typeof cfg.motivation === 'function' ? cfg.motivation(pct, state) : defaultFlashcardMotivation(pct));
      if (el('doneCats')) {
        var seen = {};
        var cats = [];
        deck.forEach(function (c) {
          if (!seen[c.cat]) {
            seen[c.cat] = true;
            cats.push(c.cat);
          }
        });
        var htmlStr = cats.map(function (cat) {
          var cc = deck.filter(function (c) { return c.cat === cat; });
          var ck = cc.filter(function (c) { return !!state.known[cardQuestion(c)]; }).length;
          return '<div class="cat-box"><div class="cat-box-name">' + escapeHtml(cat) + '</div><div class="cat-box-val">' + ck + '/' + cc.length + '</div></div>';
        }).join('');
        html(el('doneCats'), htmlStr);
      }
    }

    function renderCard() {
      var deck = currentDeck();
      if (!deck.length) {
        showDone();
        return;
      }
      state.deck = deck;
      var card = deck[state.idx % deck.length];
      var kCount = knownInDeck(deck);
      showMain();
      if (el('typedot')) el('typedot').style.background = (cfg.typeColors && cfg.typeColors[card.type]) || '#888';
      text(el('countKnown'), 'Known: ' + kCount);
      text(el('countLeft'), 'Left: ' + (deck.length - kCount));
      text(el('navCount'), (state.idx % deck.length + 1) + ' / ' + deck.length);
      text(el('knownCount'), kCount);
      text(el('leftCount'), deck.length - kCount);
      if (el('progressBar')) el('progressBar').style.width = Math.round((Object.keys(state.known).length / cards().length) * 100) + '%';
      text(el('categoryTag'), card.cat || '');

      if (!state.revealed) {
        text(el('sideLabel'), 'Question');
        if (el('sideLabel')) el('sideLabel').className = labelQuestionClass;
        if (el('cardText')) {
          el('cardText').className = questionTextClass;
          text(el('cardText'), cardQuestion(card));
        }
        if (el('cardShell')) el('cardShell').style.background = cfg.questionBg || '#ffffff';
        text(el('hintText'), 'Click card to reveal answer');
        show(el('rateRow'), 'none');
      } else {
        text(el('sideLabel'), 'Answer');
        if (el('sideLabel')) el('sideLabel').className = labelAnswerClass;
        if (el('cardText')) {
          el('cardText').className = answerTextClass;
          var answerHtml = escapeHtml(cardAnswer(card)).replace(/\n/g, '<br>');
          if (cardExample(card)) {
            answerHtml += '<div class="' + answerExampleClass + '">' + escapeHtml(cardExample(card)).replace(/\n/g, '<br>') + '</div>';
          }
          html(el('cardText'), answerHtml);
        }
        if (el('cardShell')) el('cardShell').style.background = cfg.answerBg || '#f7f7f5';
        text(el('hintText'), 'How well did you know this?');
        show(el('rateRow'), 'flex');
      }

      save();
    }

    function start() {
      var saved = load();
      if (saved && saved.deckMode) {
        state.activeCat = saved.activeCat || 'All';
        state.idx = saved.idx || 0;
        state.revealed = !!saved.revealed;
        state.known = saved.known || {};
        state.unknownSet = saved.unknownSet || {};
        state.studyMode = saved.studyMode || 'all';
      } else {
        state.activeCat = 'All';
        state.idx = 0;
        state.revealed = false;
        state.known = {};
        state.unknownSet = {};
        state.studyMode = 'all';
      }
      state.deck = filteredDeck();
      buildPills();
      renderCard();
    }

    function setCat(cat) {
      state.activeCat = cat;
      state.deck = filteredDeck();
      state.idx = 0;
      state.revealed = false;
      state.studyMode = 'all';
      state.known = {};
      state.unknownSet = {};
      buildPills();
      renderCard();
    }

    function revealCard() {
      if (!state.revealed) {
        state.revealed = true;
        renderCard();
      }
    }

    function rate(ok) {
      var deck = currentDeck();
      var card = deck[state.idx % deck.length];
      if (ok) {
        state.known[cardQuestion(card)] = true;
        delete state.unknownSet[cardQuestion(card)];
      } else {
        state.unknownSet[cardQuestion(card)] = true;
        delete state.known[cardQuestion(card)];
      }
      move(1);
    }

    function move(dir) {
      var deck = currentDeck();
      if (!deck.length) {
        showDone();
        return;
      }
      var newIdx = (state.idx + dir + deck.length) % deck.length;
      if (dir === 1 && newIdx === 0 && knownInDeck(deck) >= deck.length) {
        showDone();
        return;
      }
      state.idx = newIdx;
      state.revealed = false;
      renderCard();
    }

    function studyUnknown() {
      var unknownDeck = state.deck.filter(function (c) { return !state.known[cardQuestion(c)]; });
      if (!unknownDeck.length) {
        global.alert('Nothing left — great job!');
        return;
      }
      state.studyMode = 'unknown';
      state.idx = 0;
      state.revealed = false;
      show(el('donePanel'), 'none');
      renderCard();
    }

    function resetAll() {
      clearSaved();
      state.studyMode = 'all';
      state.known = {};
      state.unknownSet = {};
      state.idx = 0;
      state.revealed = false;
      state.activeCat = 'All';
      state.deck = filteredDeck();
      buildPills();
      show(el('donePanel'), 'none');
      renderCard();
    }

    function doCSV() {
      var rows = [["Front", "Back", "Tags", "Type"]].concat(cards().map(function (c) {
        var back = cardAnswer(c).replace(/\n/g, ' ') + (cardExample(c) ? ' Example: ' + cardExample(c) : '');
        return ['"' + cardQuestion(c).replace(/"/g, '""') + '"', '"' + back.replace(/"/g, '""') + '"', '"' + c.cat + '"', '"' + c.type + '"'];
      }));
      download(cfg.fileBase ? cfg.fileBase + '.csv' : 'flashcards.csv', 'text/csv', rows.map(function (r) { return r.join(','); }).join('\n'));
    }

    function doJSON() {
      download(cfg.fileBase ? cfg.fileBase + '.json' : 'flashcards.json', 'application/json', JSON.stringify(cards(), null, 2));
    }

    function download(name, type, content) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([content], { type: type }));
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    var api = {
      start: start,
      setCat: setCat,
      revealCard: revealCard,
      rate: rate,
      move: move,
      studyUnknown: studyUnknown,
      resetAll: resetAll,
      doCSV: doCSV,
      doJSON: doJSON,
      renderCard: renderCard,
      state: state,
    };

    start();
    return api;
  }

  global.SDQuiz = {
    create: createQuizApp,
  };
  global.SDFlashcards = {
    create: createFlashcardApp,
  };
})(window);


