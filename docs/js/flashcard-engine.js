(function (global) {
  'use strict';

  function mount(config) {
    config = config || {};
    if (!global.SDFlashcards || typeof global.SDFlashcards.create !== 'function') {
      throw new Error('SDFlashcards.create is required. Include interactive-core.js first.');
    }

    var api = global.SDFlashcards.create({
      cards: config.cards || [],
      storageKey: config.persist === false ? null : config.storageKey,
      fileBase: config.fileBase,
      typeColors: config.typeColors,
      classNames: config.classNames,
      questionBg: config.questionBg,
      answerBg: config.answerBg,
      ids: config.ids,
      motivation: config.motivation,
    });

    global.revealCard = function () { api.revealCard(); };
    global.rate = function (ok) { api.rate(ok); };
    global.move = function (dir) { api.move(dir); };
    global.studyUnknown = function () { api.studyUnknown(); };
    global.resetAll = function () { api.resetAll(); };
    global.doCSV = function () { api.doCSV(); };
    global.doJSON = function () { api.doJSON(); };

    return api;
  }

  global.FlashcardEngine = {
    mount: mount,
  };
})(window);

