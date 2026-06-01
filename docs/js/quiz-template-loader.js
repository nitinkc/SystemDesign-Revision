(function (global) {
  'use strict';

  var ACTIVE_REQUEST_ID = 0;

  function text(id, value) {
    var node = document.getElementById(id);
    if (node) node.textContent = value;
  }


  function normalizeJsonPayload(payload) {
    payload = payload || {};
    return {
      title: (payload.title || 'Quiz').trim(),
      subtitle: (payload.subtitle || 'Shuffled each attempt.').trim(),
      questions: Array.isArray(payload.questions) ? payload.questions : [],
      storageKey: payload.storageKey || null
    };
  }

  function motivationLabel(pct) {
    if (pct >= 90) return 'Outstanding - you clearly understand this material deeply.';
    if (pct >= 75) return 'Strong performance - just a few gaps to review.';
    if (pct >= 55) return 'Solid foundation - review the explanations for missed questions.';
    return 'Keep studying - revisit the material and retake the quiz.';
  }

  function renderResults(summary) {
    document.getElementById('quiz-card').style.display = 'none';
    document.getElementById('results-card').style.display = 'block';
    text('r-score', summary.correct + ' / ' + summary.total);
    text('r-pct', summary.pct + '%');
    text('r-motiv', motivationLabel(summary.pct));

    var html = Object.keys(summary.catTotals).map(function (cat) {
      var score = summary.catScores[cat] || 0;
      return '<div class="cat-card"><div class="cat-name">' + cat + '</div><div class="cat-score">' + score + ' / ' + summary.catTotals[cat] + '</div></div>';
    }).join('');

    var cats = document.getElementById('r-cats');
    if (cats) cats.innerHTML = html;

    var bar = document.getElementById('prog-bar');
    if (bar) bar.style.width = '100%';
  }

  function mountQuiz(payload) {
    text('page-title', payload.title);
    text('page-sub', payload.subtitle);

    QuizEngine.mount({
      questions: payload.questions,
      storageKey: payload.storageKey,
      handlers: {
        next: 'nextQuestion'
      },
      ids: {
        quizCard: 'quiz-card',
        resultsCard: 'results-card',
        progressLabel: 'prog-lbl',
        progressBar: 'prog-bar',
        categoryLabel: 'cat-lbl',
        questionText: 'q-text',
        options: 'opts',
        explanation: 'expl',
        checkButton: 'btn-check',
        nextButton: 'btn-next',
        resumeBanner: 'resume-banner',
        resumeMessage: 'resume-msg'
      },
      renderResults: renderResults
    });
  }

  function showError(msg) {
    var quizCard = document.getElementById('quiz-card');
    var results = document.getElementById('results-card');
    if (quizCard) quizCard.style.display = 'none';
    if (results) {
      results.style.display = 'block';
      results.innerHTML = '<div class="motiv">' + msg + '</div>';
    }
  }

  function applyQuizTheme() {
    /* Theme classes are now on the wrapper div in the template — no body mutation needed */
  }

  function getConfig() {
    var root = document.getElementById('sd-quiz-root');
    if (!root) return null;
    return {
      root: root,
      jsonSourceUrl: root.getAttribute('data-json-source') || ''
    };
  }

  function init() {
    var cfg = getConfig();
    if (!cfg) return;

    if (cfg.root.getAttribute('data-initialized') === '1') return;
    cfg.root.setAttribute('data-initialized', '1');

    if (!cfg.jsonSourceUrl) {
      showError('Quiz configuration is missing quiz source URL.');
      return;
    }

    applyQuizTheme();

    var reqId = ++ACTIVE_REQUEST_ID;

    fetch(cfg.jsonSourceUrl)
      .then(function (res) {
        if (!res.ok) throw new Error('Could not fetch quiz JSON: ' + cfg.jsonSourceUrl);
        return res.json();
      })
      .then(function (json) {
        return normalizeJsonPayload(json);
      })
      .then(function (payload) {
        if (reqId !== ACTIVE_REQUEST_ID) return;
        mountQuiz(payload);
      })
      .catch(function (err) {
        if (reqId !== ACTIVE_REQUEST_ID) return;
        showError('Unable to load quiz data. ' + err.message);
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




