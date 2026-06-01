(function (global) {
  'use strict';

  function getStorage() {
    try {
      return global.localStorage;
    } catch (err) {
      return null;
    }
  }

  function parse(raw) {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (err) {
      return null;
    }
  }

  function makeKey(namespace, key) {
    return namespace ? namespace + ':' + key : key;
  }

  function read(namespace, key) {
    var storage = getStorage();
    if (!storage) return null;
    return parse(storage.getItem(makeKey(namespace, key)));
  }

  function write(namespace, key, value) {
    var storage = getStorage();
    if (!storage) return;
    try {
      storage.setItem(makeKey(namespace, key), JSON.stringify(value));
    } catch (err) {
      // Ignore write failures (private mode or quota limits).
    }
  }

  function remove(namespace, key) {
    var storage = getStorage();
    if (!storage) return;
    try {
      storage.removeItem(makeKey(namespace, key));
    } catch (err) {
      // Ignore remove failures.
    }
  }

  global.SDStorage = {
    read: read,
    write: write,
    remove: remove,
  };
})(window);

