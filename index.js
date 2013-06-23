var location = window.location,
    bind = window.addEventListener ? 'addEventListener' : 'attachEvent',
    load = window.addEventListener ? 'load' : 'onload',
    supported = (window.onpopstate !== undefined),
    updateurl = supported ? 'popstate' : load
;


/**
 * Normalize the given path string,
 * returning a regular expression.
 *
 * An empty array should be passed,
 * which will contain the placeholder
 * key names. For example "/user/:id" will
 * then contain ["id"].
 *
 * @param  {String|RegExp|Array} path
 * @param  {Array} keys
 * @param  {Boolean} sensitive
 * @param  {Boolean} strict
 * @return {RegExp}
 * @api private
 */

function toRegExp(path, keys, sensitive, strict) {
    if (path instanceof RegExp) return path;
    if (path instanceof Array) path = '(' + path.join('|') + ')';
    
    path = path
      .concat(strict ? '' : '/?')
      .replace(/\/\(/g, '(?:/')
      .replace(/(\/)?(\.)?:(\w+)(?:(\(.*?\)))?(\?)?/g, function(_, slash, format, key, capture, optional){
        keys.push({ name: key, optional: !! optional });
        slash = slash || '';
        return ''
          + (optional ? '' : slash)
          + '(?:'
          + (optional ? slash : '')
          + (format || '') + (capture || (format && '([^/.]+?)' || '([^/]+?)')) + ')'
          + (optional || '');
      })
      .replace(/([\/.])/g, '\\$1')
      .replace(/\*/g, '(.*)');
    
    return new RegExp('^' + path + '$', sensitive ? '' : 'i');
    
};

/**
 * Create a new Path.
 * @constructor
 * @param {string} path - The path of a route.
 * @property {string} url
 * @property {array} listeners
 * @property {string} regexp
 * @returns {Object}
 */
function Path(url) {
    this.url = url;
    this.listeners = [];
    this.keys = [];
    this.regexp = toRegExp(url, this.keys, false, false);

    return this;
}

Path.prototype.test = function (path) {
    var keys = this.keys
      , m = this.regexp.exec(path)
      , params = []
    ;

    if (!m) return false;

    for (var i = 1, l = m.length; i < l; ++i) {
        var key = keys[i - 1];

        var val = 'string' === typeof m[i] ? decodeURIComponent(m[i]) : m[i];

        if (key) {
            params[key.name] = undefined !== params[key.name] ? params[key.name] : val;
        } else {
            params.push(val);
        }
    }
    
    this.run({ path: path, params: params });

    return true;

};

Path.prototype.run = function (ctx) {
    
    var self = this
      , listeners = self.listeners
      , i = 0
    ;
    
    function next() {
        var fn = listeners[i++];
        if (!fn) return; // unhandled
        fn(ctx, next);
    }
    
    next();
    
};

/**
 * Route66 Class
 */

/**
 * Create a new router.
 * @constructor
 * @property {array} paths
 * @property {string} regexp
 * @returns {Object}
 */
function Route66() {
    
    var self = this
      , hash
    ;

    self._collection = [];

    window[bind](updateurl, function () {
        hash = location.hash.split('#!')[1] || location.hash.split('#')[1];

        // Home
        if (location.pathname === '/' && hash === undefined) {
            self._match('/');
        } else {
            self._match(hash);
        }

    }, false);

    if (!supported) {
        window[bind]('onhashchange', function () {
            hash = location.hash.split('#!')[1] || location.hash.split('#')[1];
            self._match(hash);
        });
    }

    return self;
}

/**
 * Checks if the current hash matches with a path.
 * @param {string} hash - The current hash.
 */
Route66.prototype._match = function (hash) {
    
    for (var i = 0, l = this._collection.length; i < l; i += 1) {
    
        if (this._collection[i].test(hash)) {
            return this;
        }
    
    }
    
    // unhandled

    return this;
};

/**
 * Creates a new path and stores its listener into the collection.
 * @param {string} path -
 * @param {funtion} listener -
 */
Route66.prototype.path = function (path, listeners) {
    
    var path = new Path(path);

    path.listeners = listeners instanceof Array ? listeners : Array.prototype.slice.call(arguments, 1);
    
    this._collection.push(path);
    
    return this;
    
};

Route66.prototype.paths = function (paths) {
    
    for (var key in paths) {
        if (paths.hasOwnProperty(key)) {
            this.path(key, paths[key]);
        }
    }
    
    return this;

};

/**
 * Creates a new path and stores its listener into the collection.
 */
Route66.prototype._createPath = function (path, listener) {
    if (this._collection[path] === undefined) {
        this._collection[path] = new Path(path);
    }

    this._collection[path].listeners.push(listener);
};

/**
 * Removes a path and its litener from the collection with the given path.
 * @param {string} path
 * @param {funtion} listener
 */
Route66.prototype.remove = function (path, listener) {
    var listeners = this._collection[path],
        i = 0,
        len = listeners.length;

    if (len !== undefined) {
        for (i; i < len; i += 1) {
            if (listeners[i] === listener) {
                listeners.splice(i, 1);
                break;
            }
        }
    }

    if (listeners.length === 0 || listener === undefined) {
        delete this._collection[path];
    }

    return this;
};


/**
 * Expose Route66
 */
exports = module.exports = Route66;