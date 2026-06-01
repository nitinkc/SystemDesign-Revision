(function (global) {
  'use strict';

  function mount(config) {
    config = config || {};
    if (!global.SDQuiz || typeof global.SDQuiz.create !== 'function') {
      throw new Error('SDQuiz.create is required. Include interactive-core.js first.');
    }

    var ids = config.ids || {};
    var api = global.SDQuiz.create({
      questions: config.questions || [],
      storageKey: config.persist === false ? null : config.storageKey,
      ids: ids,
      letters: config.letters,
      motivation: config.motivation,
      renderResults: config.renderResults,
      shuffle: config.shuffle,
    });

    var handlers = config.handlers || {};
    global[handlers.check || 'checkAnswer'] = function () { api.checkAnswer(); };
    global[handlers.next || 'nextQ'] = function () { api.nextQuestion(); };
    global[handlers.restart || 'restart'] = function () { api.restart(); };

    if (ids.resumeBanner) {
      global[handlers.resume || 'resumeSession'] = function () { api.resume(); };
      global[handlers.discard || 'discardSession'] = function () { api.discardSession(); };
    }

    return api;
  }

  global.QuizEngine = {
    mount: mount,
  };
})(window);


