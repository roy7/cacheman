'use strict';

/**
 * Module dependencies.
 */

var CachemanError = require('./error')
  , Emitter = require('events').EventEmitter
  , noop = function () {};

/**
 * Export `Cacheman`.
 */

module.exports = Cacheman;

/**
 * Valid store engines.
 */

Cacheman.engines = ['memory', 'redis', 'mongo'];

/**
 * Cacheman constructor.
 *
 * @param {String} name
 * @param {Object} options
 * @api public
 */

function Cacheman(name, options) {
  if (!(this instanceof Cacheman)) return new Cacheman(name, options);

  if ('string' !== typeof name) {
    throw new CachemanError('Invalid name format, name argument must be a String');
  }

  this.options = options || {};
  this.options.count = 1000;
  this._name = name;
  this._ttl = this.options.ttl || 60;
  this.engine(this.options.engine || 'memory');
  this._prefix = 'cache:' + this._name + ':';
}

/**
 * Set get engine.
 *
 * @param {String} engine
 * @param {Object} options
 * @return {Cacheman} self
 * @api public
 */

Cacheman.prototype.engine = function _engine(engine, options) {
  
  if (!arguments.length) return this._engine;

  if (! /string|function/.test(typeof engine)) {
    throw new CachemanError('Invalid engine format, engine must be a String or Function');
  }

  if ('string' === typeof engine) {

    var Engine;

    if (~Cacheman.engines.indexOf(engine)) {
      engine = 'cacheman-' + engine;
    }

    try {
      Engine = require(engine);
    } catch(e) {
      if (e.code === 'MODULE_NOT_FOUND') {
        throw new CachemanError('Missing required npm module ' + engine);
      } else {
        throw e;
      }
    }

    this._engine = new Engine(options || this.options, this);
  } else {
    this._engine = engine(options || this.options, this);
  }
  return this;
};

/**
 * Wrap key with bucket prefix.
 *
 * @param {String} key
 * @return {String}
 * @api private
 */

Cacheman.prototype.key = function key(key) {
  return this._prefix + key;
};

/**
 * Set an entry.
 *
 * @param {String} key
 * @param {Mixed} data
 * @param {Number} ttl
 * @param {Function} fn
 * @return {Cacheman} self
 * @api public
 */

Cacheman.prototype.cache = function cache(key, data, ttl, fn) {
  var bucket = this;

  if ('function' === typeof ttl) {
    fn = ttl;
    ttl = null;
  }

  fn = fn || noop;

  bucket.get(key, function get(err, res){
    if (err) return fn(err);
    if ('undefined' === typeof res) {
      return bucket.set(key, data, ttl, fn);
    }
    fn(null, data);
  });

  return this;
};

/**
 * Get an entry.
 *
 * @param {String} key
 * @param {Function} fn
 * @return {Cacheman} self
 * @api public
 */

Cacheman.prototype.get = function get(key, fn) {
  fn = fn || noop;
  this._engine.get(this.key(key), fn);
  return this;
};

/**
 * Set an entry.
 *
 * @param {String} key
 * @param {Mixed} data
 * @param {Number} ttl
 * @param {Function} fn
 * @return {Cacheman} self
 * @api public
 */

Cacheman.prototype.set = function set(key, data, ttl, fn) {

  if ('function' === typeof ttl) {
    fn = ttl;
    ttl = null;
  }

  fn = fn || noop;

  if ('undefined' === typeof data) {
    return process.nextTick(fn);
  }

  this._engine.set(this.key(key), data, ttl || this._ttl, fn);

  return this;
};

/**
 * Delete an entry.
 *
 * @param {String} key
 * @param {Function} fn
 * @return {Cacheman} self
 * @api public
 */

Cacheman.prototype.del = function del(key, fn) {

  if ('function' === typeof key) {
    fn = key;
    key = '';
  }

  fn = fn || noop;

  this._engine.del(this.key(key), fn);
  return this;
};

/**
 * Clear all entries for this bucket.
 *
 * @param {String} key
 * @param {Function} fn
 * @return {Cacheman} self
 * @api public
 */

Cacheman.prototype.clear = function clear(fn) {
  fn = fn || noop;
  this._engine.clear(this.key(''), fn);
  return this;
};