YUI.add("breakout", function (Y) {
	function clamp (value, min, max) {
		return Math.max(Math.min(value, max), min);
	}

	/*
	 * @attribute rows
	 * @description The number of rows to split the host into. If columns is specified but this isnt, the host is split into squares. Default: 6
	 * @type Integer
	 */

	/*
	 * @attribute columns
	 * @description The number of columns to split the host into. If rows is specified but this isnt, the host is split into squares. Default: 6
	 * @type Integer
	 */

	function Breakout(config) {
		var rows = config.rows,
		    columns = config.columns;

		this._host = config.host;
		this._container = Y.Node.create("<div style='position: absolute'>");
		this._nodes = [];

		if (!(rows || columns)) {
			rows = 8;
		}

		this._rows = rows;
		this._columns = columns;

		Breakout.superclass.constructor.apply(this, arguments);
	}

	Breakout.NS = "breakout";
	Breakout.Name = "Breakout";

	Y.extend(Breakout, Y.Plugin.Base, {
		_splitNode: function () {
			var r, c,
			    x, y,
			    width = Math.round(this._blockWidth),
			    height = Math.round(this._blockHeight),
			    rows = this._rows,
			    columns = this._columns,

			    origin = this._host.getXY(),

			    host,
			    container = this._container,
			    nodes = this._nodes = [],
			    row,
			    
			    mask = Y.Node.create(
				'<div style="width: ' + width + 'px; height: ' + height + 'px; position: absolute; overflow: hidden">'
				);

			container.setXY(origin);

			for (r = 0; r < rows; r++) {
				nodes[r] = row = [];
				y = r * height;

				for (c = 0; c < columns; c++) {
					x = c * width;
					host = this._host.cloneNode(true);

					row[c] = mask.cloneNode()
						.setXY([x, y])
						.append(host.setXY([-x, -y]));
					container.append(row[c]);
				}
			}

			this._swapIn();
		},

		_swapIn: function () {
			this._host.get("parentNode").append(this._container);
			this._host.setStyle("visibility", "hidden");
		},

		_setup: function () {
			if (this._nodes.length) { return; }

			var node = this._host,
			    width = parseFloat(node.getComputedStyle("width")),
			    height = parseFloat(node.getComputedStyle("height")),

			    blockWidth,
			    blockHeight,

			    rows = this._rows,
			    columns = this._columns;

			if (rows) { blockHeight = height / rows; }
			if (columns) { blockWidth = width / columns; }

			if (!rows) {
				blockHeight = blockWidth;
				rows = height / blockHeight;
			}
			
			if (!columns) {
				blockWidth = blockHeight;
				columns = width / blockWidth;
			}

			this._container.setStyles({width: width, height: height});

			this._width = width;
			this._height = height;

			this._blockWidth = blockWidth;
			this._blockHeight = blockHeight;

			this._rows = rows;
			this._columns = columns;

			this._splitNode();
		},

		_forEach: function (effect, options) {
			this._setup();
			this._swapIn();

			var r, c,
			    rows = this._rows,
			    columns = this._columns,
 
			    options = options || {},
			    randomization = Math.abs(options.random || 0),
			    running = 0,
			    anim,
			    piece,
			    delay,
			    
			    container = this._container,
			    that = this;

			options.crop && container.setStyle("overflow", "hidden");

			for (r = 0; r < rows; r++) {
				for (c = 0; c < columns; c++) {
					running++;

					piece = this._nodes[r][c];
					anim = effect.call(this, piece, r, c, rows, columns);
					
					delay = r + c;
					if (options.reverse) {
						delay = rows + columns - delay;
					}

					anim.animation.on("end", function () {
						running--;

						if (!running) {
							that._container.remove();
							
							options.unhide && that._host.setStyle("visibility", "visible");
							options.crop && container.setStyle("overflow", "visible");

							that.fire("end");
						}
					});

					(function (a) {
				    		var random = 1 - (Math.random() * randomization),
						    opacity;

						if (options.fade) {
							opacity = options.unhide ? 0 : 1;
							Y.mix(a.animation.get("from"), {opacity: opacity});
							Y.mix(a.animation.get("to"), {opacity: 1 - opacity});
						} else {
							piece.setStyle("opacity", 1);
						}

						setTimeout(function () {
							a.animation.run();
						}, a.interval * delay * random);
					})(anim);
				}
			}
		},

		explode: function (options) {
			options = options || {};
			if (!("fade" in options)) { options.fade = true; }

			var randomization = Math.abs(options.random || 0);

			this._forEach(function (node, row, column, rows, columns) {
				var distance = (options.distance || 1.5) * 2,
				    duration = options.duration || 1000,
				    easing = options.easing || Y.Easing.easeOutStrong,

				    random = 1 - (Math.random() * randomization),

				    center = {x: (columns - 1) / 2, y: (rows - 1) / 2},
				    delta = {x: column - center.x, y: row - center.y},

				    to;

				distance *= random;

				to  = {left: (delta.x * distance + center.x) * this._blockWidth,
					  top: (delta.y * distance + center.y) * this._blockHeight};

				if (options.unhide) {
					node.setStyles(to);
					to = {left: column * this._blockWidth, top: row * this._blockHeight};
				}
				
				anim = new Y.Anim({
					node: node,
					easing: easing,
					to: to,
					duration: duration / 1000
				});

				return {animation: anim, interval: 0};
			}, options);
		},

		sheer: function (options) {
			options = options || {};


			var distance = options.distance || 1,
			    duration = options.duration || 1000,
			    interval = options.interval || 0,
			    easing = options.easing || Y.Easing.easeIn;
			    
			this._forEach(function (node, row, column, rows, columns) {
				var evenCol = !(column % 2),
				    evenRow = !(row % 2),

				    width = this._width,
				    height = this._height,

				    from = {left: column * this._blockWidth,
					    top: row * this._blockHeight},
				    to = {};

				if (columns === 1) { evenCol = evenRow; }
				if (rows === 1) { evenRow = !evenCol; }

				if (evenCol) {
					if (evenRow) { // go left
						to.left = from.left - distance * width;
					} else { // go down
						to.top = from.top + distance * height;
					}
				} else {
					if (evenRow) { // go up
						to.top = from.top - distance * height;
					} else { // go right
						to.left = from.left + distance * width;
					}
				}

				if (options.unhide) {
					to = from;
				}

				anim = new Y.Anim({
					node: node,
					easing: easing,
					to: to,
					duration: duration / 1000
				});

				return {animation: anim, interval: interval};
			}, options);
		},

		pinwheel: function (options) {
			options = options || {};

			var distance = options.distance || 1,
			    duration = options.duration || 1000,
			    easing = options.easing || Y.Easing.easeOut;
			    
			this._forEach(function (node, row, column, rows, columns) {
				var evenCol = !(column % 2),
				    evenRow = !(row % 2),

				    interval = 0,

				    width = this._blockWidth,
				    height = this._blockHeight,

				    from = {left: column * width,
					    top: row * height,
					    width: width,
					    height: height},
				    to = {};

				if (evenCol) {
					if (evenRow) { // go down
						to.top = from.top + distance * height;
					} else { // go right
						to.left = from.left + distance * width;
					}
				}

				if (evenCol === evenRow) { // shrink height
					to.height = height * (1 - distance);
				} else { //shrink width
					to.width = width * (1 - distance);
				}

				if (options.unhide) {
					to = from;
				}

				anim = new Y.Anim({
					node: node,
					easing: easing,
					to: to,
					duration: duration / 1000
				});

				return {animation: anim, interval: interval};
			}, options);
		},

		disintegrate: function (options) {
			options = options || {};
			options.reverse = true;

			this._forEach(function (node, row, column, rows, columns) {
				var distance = (options.distance || 1.5) * this._height,
				    duration = options.duration || 1000,
				    easing = options.easing || Y.Easing.easeBoth,

				    interval = duration / (rows + columns) * 2,

				    y = row * this._blockHeight,
				    anim;
				    
				if (distance < 0) { row = rows - row - 1}

				if (options.unhide) {
					node.setStyle("top", y - distance);
				} else {
					y += distance;
				}

				anim = new Y.Anim({
					node: node,
					easing: easing,
					to: { top: y },
					duration: duration / 1000
				});

				return {animation: anim, interval: interval};
			}, options);
		},

		fadeOut: function (options) {
			options = options || {};
			options.fade = true;

			this._forEach(function (node, row, column, rows, columns) {
				var duration = options.duration || 700,
				    startOpacity = options.unhide ? 0 : 1,
				    easing = options.easing,
				    interval,
				    anim;

				if (!easing) {
					easing = options.unhide ? Y.Easing.easeOut : Y.Easing.easeInStrong;
				}

				interval = duration / (rows + columns) * 2;

				anim = new Y.Anim({
					node: node,
					easing: easing,
					from: {}, to: {},
					duration: duration / 1000
				});

				return {animation: anim, interval: interval};
			}, options);
		},

		_inverse: function (effect, options) {
			options = options || {};
			options.unhide = true;
			effect.call(this, options);
		},

		unsheer: function (options) {
			this._inverse(this.sheer, options);
		},

		unpinwheel: function (options) {
			this._inverse(this.pinwheel, options);
		},

		converge: function (options) {
			this._inverse(this.explode, options);
		},

		fadeIn: function (options) {
			this._inverse(this.fadeOut, options);
		},

		build: function (options) {
			this._inverse(this.disintegrate, options);
		}
	});

	Y.Breakout = Breakout;
}, "1.0", {requires: ["plugin", "anim"]});
/*
YUI 3.18.1 (build f7e7bcb)
Copyright 2014 Yahoo! Inc. All rights reserved.
Licensed under the BSD License.
http://yuilibrary.com/license/
*/

/**
The YUI module contains the components required for building the YUI seed file.
This includes the script loading mechanism, a simple queue, and the core
utilities for the library.

@module yui
@main yui
@submodule yui-base
**/

/*jshint eqeqeq: false*/
if (typeof YUI != 'undefined') {
    YUI._YUI = YUI;
}

/**
The YUI global namespace object. This is the constructor for all YUI instances.

This is a self-instantiable factory function, meaning you don't need to precede
it with the `new` operator. You can invoke it directly like this:

    YUI().use('*', function (Y) {
        // Y is a new YUI instance.
    });

But it also works like this:

    var Y = YUI();

The `YUI` constructor accepts an optional config object, like this:

    YUI({
        debug: true,
        combine: false
    }).use('node', function (Y) {
        // Y.Node is ready to use.
    });

See the API docs for the <a href="config.html">Config</a> class for the complete
list of supported configuration properties accepted by the YUI constuctor.

If a global `YUI` object is already defined, the existing YUI object will not be
overwritten, to ensure that defined namespaces are preserved.

Each YUI instance has full custom event support, but only if the event system is
available.

@class YUI
@uses EventTarget
@constructor
@global
@param {Object} [config]* Zero or more optional configuration objects. Config
    values are stored in the `Y.config` property. See the
    <a href="config.html">Config</a> docs for the list of supported properties.
**/

    /*global YUI*/
    /*global YUI_config*/
    var YUI = function() {
        var i = 0,
            Y = this,
            args = arguments,
            l = args.length,
            instanceOf = function(o, type) {
                return (o && o.hasOwnProperty && (o instanceof type));
            },
            gconf = (typeof YUI_config !== 'undefined') && YUI_config;

        if (!(instanceOf(Y, YUI))) {
            Y = new YUI();
        } else {
            // set up the core environment
            Y._init();

            /**
            Master configuration that might span multiple contexts in a non-
            browser environment. It is applied first to all instances in all
            contexts.

            @example

                YUI.GlobalConfig = {
                    filter: 'debug'
                };

                YUI().use('node', function (Y) {
                    // debug files used here
                });

                YUI({
                    filter: 'min'
                }).use('node', function (Y) {
                    // min files used here
                });

            @property {Object} GlobalConfig
            @global
            @static
            **/
            if (YUI.GlobalConfig) {
                Y.applyConfig(YUI.GlobalConfig);
            }

            /**
            Page-level config applied to all YUI instances created on the
            current page. This is applied after `YUI.GlobalConfig` and before
            any instance-level configuration.

            @example

                // Single global var to include before YUI seed file
                YUI_config = {
                    filter: 'debug'
                };

                YUI().use('node', function (Y) {
                    // debug files used here
                });

                YUI({
                    filter: 'min'
                }).use('node', function (Y) {
                    // min files used here
                });

            @property {Object} YUI_config
            @global
            **/
            if (gconf) {
                Y.applyConfig(gconf);
            }

            // bind the specified additional modules for this instance
            if (!l) {
                Y._afterConfig();
                Y._setup();
            }
        }

        if (l) {
            // Each instance can accept one or more configuration objects.
            // These are applied after YUI.GlobalConfig and YUI_Config,
            // overriding values set in those config files if there is a
            // matching property.
            for (; i < l; i++) {
                Y.applyConfig(args[i]);
            }

            Y._afterConfig();
            Y._setup();
        }

        Y.instanceOf = instanceOf;

        return Y;
    };

(function() {

    var proto, prop,
        VERSION = '3.18.1',
        PERIOD = '.',
        BASE = 'http://yui.yahooapis.com/',
        /*
            These CSS class names can't be generated by
            getClassName since it is not available at the
            time they are being used.
        */
        DOC_LABEL = 'yui3-js-enabled',
        CSS_STAMP_EL = 'yui3-css-stamp',
        NOOP = function() {},
        SLICE = Array.prototype.slice,
        APPLY_TO_AUTH = { 'io.xdrReady': 1,   // the functions applyTo
                          'io.xdrResponse': 1,   // can call. this should
                          'SWF.eventHandler': 1 }, // be done at build time
        hasWin = (typeof window != 'undefined'),
        win = (hasWin) ? window : null,
        doc = (hasWin) ? win.document : null,
        docEl = doc && doc.documentElement,
        docClass = docEl && docEl.className,
        instances = {},
        time = new Date().getTime(),
        add = function(el, type, fn, capture) {
            if (el && el.addEventListener) {
                el.addEventListener(type, fn, capture);
            } else if (el && el.attachEvent) {
                el.attachEvent('on' + type, fn);
            }
        },
        remove = function(el, type, fn, capture) {
            if (el && el.removeEventListener) {
                // this can throw an uncaught exception in FF
                try {
                    el.removeEventListener(type, fn, capture);
                } catch (ex) {}
            } else if (el && el.detachEvent) {
                el.detachEvent('on' + type, fn);
            }
        },
        handleReady = function() {
            YUI.Env.DOMReady = true;
            if (hasWin) {
                remove(doc, 'DOMContentLoaded', handleReady);
            }
        },
        handleLoad = function() {
            YUI.Env.windowLoaded = true;
            YUI.Env.DOMReady = true;
            if (hasWin) {
                remove(window, 'load', handleLoad);
            }
        },
        getLoader = function(Y, o) {
            var loader = Y.Env._loader,
                lCore = [ 'loader-base' ],
                G_ENV = YUI.Env,
                mods = G_ENV.mods;

            if (loader) {
                //loader._config(Y.config);
                loader.ignoreRegistered = false;
                loader.onEnd = null;
                loader.data = null;
                loader.required = [];
                loader.loadType = null;
            } else {
                loader = new Y.Loader(Y.config);
                Y.Env._loader = loader;
            }
            if (mods && mods.loader) {
                lCore = [].concat(lCore, YUI.Env.loaderExtras);
            }
            YUI.Env.core = Y.Array.dedupe([].concat(YUI.Env.core, lCore));

            return loader;
        },

        clobber = function(r, s) {
            for (var i in s) {
                if (s.hasOwnProperty(i)) {
                    r[i] = s[i];
                }
            }
        },

        ALREADY_DONE = { success: true };

//  Stamp the documentElement (HTML) with a class of "yui-loaded" to
//  enable styles that need to key off of JS being enabled.
if (docEl && docClass.indexOf(DOC_LABEL) == -1) {
    if (docClass) {
        docClass += ' ';
    }
    docClass += DOC_LABEL;
    docEl.className = docClass;
}

if (VERSION.indexOf('@') > -1) {
    VERSION = '3.5.0'; // dev time hack for cdn test
}

proto = {
    /**
    Applies a new configuration object to the config of this YUI instance. This
    will merge new group/module definitions, and will also update the loader
    cache if necessary. Updating `Y.config` directly will not update the cache.

    @method applyConfig
    @param {Object} o the configuration object.
    @since 3.2.0
    **/
    applyConfig: function(o) {

        o = o || NOOP;

        var attr,
            name,
            // detail,
            config = this.config,
            mods = config.modules,
            groups = config.groups,
            aliases = config.aliases,
            loader = this.Env._loader;

        for (name in o) {
            if (o.hasOwnProperty(name)) {
                attr = o[name];
                if (mods && name == 'modules') {
                    clobber(mods, attr);
                } else if (aliases && name == 'aliases') {
                    clobber(aliases, attr);
                } else if (groups && name == 'groups') {
                    clobber(groups, attr);
                } else if (name == 'win') {
                    config[name] = (attr && attr.contentWindow) || attr;
                    config.doc = config[name] ? config[name].document : null;
                } else if (name == '_yuid') {
                    // preserve the guid
                } else {
                    config[name] = attr;
                }
            }
        }

        if (loader) {
            loader._config(o);
        }

    },

    /**
    Old way to apply a config to this instance (calls `applyConfig` under the
    hood).

    @private
    @method _config
    @param {Object} o The config to apply
    **/
    _config: function(o) {
        this.applyConfig(o);
    },

    /**
    Initializes this YUI instance.

    @private
    @method _init
    **/
    _init: function() {
        var filter, el,
            Y = this,
            G_ENV = YUI.Env,
            Env = Y.Env,
            prop;

        /**
        The version number of this YUI instance.

        This value is typically updated by a script when a YUI release is built,
        so it may not reflect the correct version number when YUI is run from
        the development source tree.

        @property {String} version
        **/
        Y.version = VERSION;

        if (!Env) {
            Y.Env = {
                core: ['get', 'features', 'intl-base', 'yui-log', 'yui-later', 'loader-base', 'loader-rollup', 'loader-yui3'],
                loaderExtras: ['loader-rollup', 'loader-yui3'],
                mods: {}, // flat module map
                versions: {}, // version module map
                base: BASE,
                cdn: BASE + VERSION + '/',
                // bootstrapped: false,
                _idx: 0,
                _used: {},
                _attached: {},
                _exported: {},
                _missed: [],
                _yidx: 0,
                _uidx: 0,
                _guidp: 'y',
                _loaded: {},
                // serviced: {},
                // Regex in English:
                // I'll start at the \b(yui).
                // 1. Look in the test string for "yui" or
                //    "yui-base" or "yui-davglass" or "yui-foobar" that comes after a word break.  That is, it
                //    can't match "foyui" or "i_heart_yui". This can be anywhere in the string.
                // 2. After #1 must come a forward slash followed by the string matched in #1, so
                //    "yui-base/yui-base" or "yui-pants/yui-pants".
                // 3. The second occurence of the #1 token can optionally be followed by "-debug" or "-min",
                //    so "yui/yui-min", "yui/yui-debug", "yui-base/yui-base-debug". NOT "yui/yui-tshirt".
                // 4. This is followed by ".js", so "yui/yui.js".
                // 0. Going back to the beginning, now. If all that stuff in 1-4 comes after a "?" in the string,
                //    then capture the junk between the LAST "&" and the string in 1-4.  So
                //    "blah?foo/yui/yui.js" will capture "foo/" and "blah?some/thing.js&3.3.0/build/yui-davglass/yui-davglass.js"
                //    will capture "3.3.0/build/"
                //
                // Regex Exploded:
                // (?:\?             Find a ?
                //   (?:[^&]*&)      followed by 0..n characters followed by an &
                //   *               in fact, find as many sets of characters followed by a & as you can
                //   ([^&]*)         capture the stuff after the last & in \1
                // )?                but it's ok if all this ?junk&more_junk stuff isn't even there
                // \b(               after a word break find either the string
                //    yui(?:-\w+)?   "yui" optionally followed by a -, then more characters
                // )                 and store the yui-* string in \2
                // \/\2              then comes a / followed by the yui-* string in \2
                // (?:-(min|debug))? optionally followed by "-min" or "-debug"
                // .js               and ending in ".js"
                _BASE_RE: /(?:\?(?:[^&]*&)*([^&]*))?\b(yui(?:-\w+)?)\/\2(?:-(min|debug))?\.js/,
                parseBasePath: function(src, pattern) {
                    var match = src.match(pattern),
                        path, filter;

                    if (match) {
                        path = RegExp.leftContext || src.slice(0, src.indexOf(match[0]));

                        // this is to set up the path to the loader.  The file
                        // filter for loader should match the yui include.
                        filter = match[3];

                        // extract correct path for mixed combo urls
                        // http://yuilibrary.com/projects/yui3/ticket/2528423
                        if (match[1]) {
                            path += '?' + match[1];
                        }
                        path = {
                            filter: filter,
                            path: path
                        };
                    }
                    return path;
                },
                getBase: G_ENV && G_ENV.getBase ||
                        function(pattern) {
                            var nodes = (doc && doc.getElementsByTagName('script')) || [],
                                path = Env.cdn, parsed,
                                i, len, src;

                            for (i = 0, len = nodes.length; i < len; ++i) {
                                src = nodes[i].src;
                                if (src) {
                                    parsed = Y.Env.parseBasePath(src, pattern);
                                    if (parsed) {
                                        filter = parsed.filter;
                                        path = parsed.path;
                                        break;
                                    }
                                }
                            }

                            // use CDN default
                            return path;
                        }

            };

            Env = Y.Env;

            Env._loaded[VERSION] = {};

            if (G_ENV && Y !== YUI) {
                Env._yidx = ++G_ENV._yidx;
                Env._guidp = ('yui_' + VERSION + '_' +
                             Env._yidx + '_' + time).replace(/[^a-z0-9_]+/g, '_');
            } else if (YUI._YUI) {

                G_ENV = YUI._YUI.Env;
                Env._yidx += G_ENV._yidx;
                Env._uidx += G_ENV._uidx;

                for (prop in G_ENV) {
                    if (!(prop in Env)) {
                        Env[prop] = G_ENV[prop];
                    }
                }

                delete YUI._YUI;
            }

            Y.id = Y.stamp(Y);
            instances[Y.id] = Y;

        }

        Y.constructor = YUI;

        // configuration defaults
        Y.config = Y.config || {
            bootstrap: true,
            cacheUse: true,
            debug: true,
            doc: doc,
            fetchCSS: true,
            throwFail: true,
            useBrowserConsole: true,
            useNativeES5: true,
            win: win
        };

        //Register the CSS stamp element
        if (doc && !doc.getElementById(CSS_STAMP_EL)) {
            el = doc.createElement('div');
            el.innerHTML = '<div id="' + CSS_STAMP_EL + '" style="position: absolute !important; visibility: hidden !important"></div>';
            YUI.Env.cssStampEl = el.firstChild;
            if (doc.body) {
                doc.body.appendChild(YUI.Env.cssStampEl);
            } else {
                docEl.insertBefore(YUI.Env.cssStampEl, docEl.firstChild);
            }
        } else if (doc && doc.getElementById(CSS_STAMP_EL) && !YUI.Env.cssStampEl) {
            YUI.Env.cssStampEl = doc.getElementById(CSS_STAMP_EL);
        }

        Y.config.lang = Y.config.lang || 'en-US';

        Y.config.base = YUI.config.base ||
                (YUI.config.defaultBase && YUI.config.root && YUI.config.defaultBase + YUI.config.root) ||
                Y.Env.getBase(Y.Env._BASE_RE);

        if (!filter || (!('mindebug').indexOf(filter))) {
            filter = 'min';
        }
        filter = (filter) ? '-' + filter : filter;
        Y.config.loaderPath = YUI.config.loaderPath || 'loader/loader' + filter + '.js';

    },

    /**
    This method is called after all other configuration has been applied to
    the YUI instance.

    @method _afterConfig
    @private
    **/
    _afterConfig: function () {
        var Y = this;

        // We need to set up Y.config.global after the rest of the configuration
        // so that setting it in user configuration prevents the library from
        // using eval(). This is critical for Content Security Policy enabled
        // sites and other environments like Chrome extensions
        if (!Y.config.hasOwnProperty('global')) {
            Y.config.global = Function('return this')();
        }
    },

    /**
    Finishes the instance setup. Attaches whatever YUI modules were defined
    at the time that this instance was created.

    @method _setup
    @private
    **/
    _setup: function() {
        var i, Y = this,
            core = [],
            mods = YUI.Env.mods,
            extendedCore = Y.config.extendedCore || [],
            extras = Y.config.core || [].concat(YUI.Env.core).concat(extendedCore); //Clone it..
   
        for (i = 0; i < extras.length; i++) {
            if (mods[extras[i]]) {
                core.push(extras[i]);
            }
        }

        Y._attach(['yui-base']);
        Y._attach(core);

        if (Y.Loader) {
            getLoader(Y);
        }

        // Y.log(Y.id + ' initialized', 'info', 'yui');
    },

    /**
    Executes the named method on the specified YUI instance if that method is
    whitelisted.

    @method applyTo
    @param {String} id YUI instance id.
    @param {String} method Name of the method to execute. For example:
        'Object.keys'.
    @param {Array} args Arguments to apply to the method.
    @return {Mixed} Return value from the applied method, or `null` if the
        specified instance was not found or the method was not whitelisted.
    **/
    applyTo: function(id, method, args) {
        if (!(method in APPLY_TO_AUTH)) {
            this.log(method + ': applyTo not allowed', 'warn', 'yui');
            return null;
        }

        var instance = instances[id], nest, m, i;
        if (instance) {
            nest = method.split('.');
            m = instance;
            for (i = 0; i < nest.length; i = i + 1) {
                m = m[nest[i]];
                if (!m) {
                    this.log('applyTo not found: ' + method, 'warn', 'yui');
                }
            }
            return m && m.apply(instance, args);
        }

        return null;
    },

/**
Registers a YUI module and makes it available for use in a `YUI().use()` call or
as a dependency for other modules.

The easiest way to create a first-class YUI module is to use
<a href="http://yui.github.com/shifter/">Shifter</a>, the YUI component build
tool.

Shifter will automatically wrap your module code in a `YUI.add()` call along
with any configuration info required for the module.

@example

    YUI.add('davglass', function (Y) {
        Y.davglass = function () {
            Y.log('Dav was here!');
        };
    }, '3.4.0', {
        requires: ['harley-davidson', 'mt-dew']
    });

@method add
@param {String} name Module name.
@param {Function} fn Function containing module code. This function will be
    executed whenever the module is attached to a specific YUI instance.

    @param {YUI} fn.Y The YUI instance to which this module is attached.
    @param {String} fn.name Name of the module

@param {String} version Module version number. This is currently used only for
    informational purposes, and is not used internally by YUI.

@param {Object} [details] Module config.
    @param {Array} [details.requires] Array of other module names that must be
        attached before this module can be attached.
    @param {Array} [details.optional] Array of optional module names that should
        be attached before this module is attached if they've already been
        loaded. If the `loadOptional` YUI option is `true`, optional modules
        that have not yet been loaded will be loaded just as if they were hard
        requirements.
    @param {Array} [details.use] Array of module names that are included within
        or otherwise provided by this module, and which should be attached
        automatically when this module is attached. This makes it possible to
        create "virtual rollup" modules that simply attach a collection of other
        modules or submodules.

@return {YUI} This YUI instance.
**/
    add: function(name, fn, version, details) {
        details = details || {};
        var env = YUI.Env,
            mod = {
                name: name,
                fn: fn,
                version: version,
                details: details
            },
            //Instance hash so we don't apply it to the same instance twice
            applied = {},
            loader, inst, modInfo,
            i, versions = env.versions;

        env.mods[name] = mod;
        versions[version] = versions[version] || {};
        versions[version][name] = mod;

        for (i in instances) {
            if (instances.hasOwnProperty(i)) {
                inst = instances[i];
                if (!applied[inst.id]) {
                    applied[inst.id] = true;
                    loader = inst.Env._loader;
                    if (loader) {
                        modInfo = loader.getModuleInfo(name);
                        if (!modInfo || modInfo.temp) {
                            loader.addModule(details, name);
                        }
                    }
                }
            }
        }

        return this;
    },

    /**
    Executes the callback function associated with each required module,
    attaching the module to this YUI instance.

    @method _attach
    @param {Array} r The array of modules to attach
    @param {Boolean} [moot=false] If `true`, don't throw a warning if the module
        is not attached.
    @private
    **/
    _attach: function(r, moot) {
        var i, name, mod, details, req, use, after,
            mods = YUI.Env.mods,
            aliases = YUI.Env.aliases,
            Y = this, j,
            cache = YUI.Env._renderedMods,
            loader = Y.Env._loader,
            done = Y.Env._attached,
            exported = Y.Env._exported,
            len = r.length, loader, def, go,
            c = [],
            modArgs, esCompat, reqlen, modInfo,
            condition,
            __exports__, __imports__;

        //Check for conditional modules (in a second+ instance) and add their requirements
        //TODO I hate this entire method, it needs to be fixed ASAP (3.5.0) ^davglass
        for (i = 0; i < len; i++) {
            name = r[i];
            mod = mods[name];
            c.push(name);
            if (loader && loader.conditions[name]) {
                for (j in loader.conditions[name]) {
                    if (loader.conditions[name].hasOwnProperty(j)) {
                        def = loader.conditions[name][j];
                        go = def && ((def.ua && Y.UA[def.ua]) || (def.test && def.test(Y)));
                        if (go) {
                            c.push(def.name);
                        }
                    }
                }
            }
        }
        r = c;
        len = r.length;

        for (i = 0; i < len; i++) {
            if (!done[r[i]]) {
                name = r[i];
                mod = mods[name];

                if (aliases && aliases[name] && !mod) {
                    Y._attach(aliases[name]);
                    continue;
                }
                if (!mod) {
                    modInfo = loader && loader.getModuleInfo(name);
                    if (modInfo) {
                        mod = modInfo;
                        moot = true;
                    }

                    // Y.log('no js def for: ' + name, 'info', 'yui');

                    //if (!loader || !loader.moduleInfo[name]) {
                    //if ((!loader || !loader.moduleInfo[name]) && !moot) {
                    if (!moot && name) {
                        if ((name.indexOf('skin-') === -1) && (name.indexOf('css') === -1)) {
                            Y.Env._missed.push(name);
                            Y.Env._missed = Y.Array.dedupe(Y.Env._missed);
                            Y.message('NOT loaded: ' + name, 'warn', 'yui');
                        }
                    }
                } else {
                    done[name] = true;
                    //Don't like this, but in case a mod was asked for once, then we fetch it
                    //We need to remove it from the missed list ^davglass
                    for (j = 0; j < Y.Env._missed.length; j++) {
                        if (Y.Env._missed[j] === name) {
                            Y.message('Found: ' + name + ' (was reported as missing earlier)', 'warn', 'yui');
                            Y.Env._missed.splice(j, 1);
                        }
                    }

                    // Optional dependencies normally work by modifying the
                    // dependency list of a module. If the dependency's test
                    // passes it is added to the list. If not, it's not loaded.
                    // This following check ensures that optional dependencies
                    // are not attached when they were already loaded into the
                    // page (when bundling for example)
                    if (loader && !loader._canBeAttached(name)) {
                        Y.log('Failed to attach module ' + name, 'warn', 'yui');
                        return true;
                    }

                    /*
                        If it's a temp module, we need to redo it's requirements if it's already loaded
                        since it may have been loaded by another instance and it's dependencies might
                        have been redefined inside the fetched file.
                    */
                    if (loader && cache && cache[name] && cache[name].temp) {
                        loader.getRequires(cache[name]);
                        req = [];
                        modInfo = loader.getModuleInfo(name);
                        for (j in modInfo.expanded_map) {
                            if (modInfo.expanded_map.hasOwnProperty(j)) {
                                req.push(j);
                            }
                        }
                        Y._attach(req);
                    }

                    details = mod.details;
                    req = details.requires;
                    esCompat = details.es;
                    use = details.use;
                    after = details.after;
                    //Force Intl load if there is a language (Loader logic) @todo fix this shit
                    if (details.lang) {
                        req = req || [];
                        req.unshift('intl');
                    }

                    if (req) {
                        reqlen = req.length;
                        for (j = 0; j < reqlen; j++) {
                            if (!done[req[j]]) {
                                if (!Y._attach(req)) {
                                    return false;
                                }
                                break;
                            }
                        }
                    }

                    if (after) {
                        for (j = 0; j < after.length; j++) {
                            if (!done[after[j]]) {
                                if (!Y._attach(after, true)) {
                                    return false;
                                }
                                break;
                            }
                        }
                    }

                    if (mod.fn) {
                        modArgs = [Y, name];
                        if (esCompat) {
                            __imports__ = {};
                            __exports__ = {};
                            // passing `exports` and `imports` onto the module function
                            modArgs.push(__imports__, __exports__);
                            if (req) {
                                reqlen = req.length;
                                for (j = 0; j < reqlen; j++) {
                                    __imports__[req[j]] = exported.hasOwnProperty(req[j]) ? exported[req[j]] : Y;
                                }
                            }
                        }
                        if (Y.config.throwFail) {
                            __exports__ = mod.fn.apply(esCompat ? undefined : mod, modArgs);
                        } else {
                            try {
                                __exports__ = mod.fn.apply(esCompat ? undefined : mod, modArgs);
                            } catch (e) {
                                Y.error('Attach error: ' + name, e, name);
                                return false;
                            }
                        }
                        if (esCompat) {
                            // store the `exports` in case others `es` modules requires it
                            exported[name] = __exports__;

                            // If an ES module is conditionally loaded and set
                            // to be used "instead" another module, replace the
                            // trigger module's content with the conditionally
                            // loaded one so the values returned by require()
                            // still makes sense
                            condition = mod.details.condition;
                            if (condition && condition.when === 'instead') {
                                exported[condition.trigger] = __exports__;
                            }
                        }
                    }

                    if (use) {
                        for (j = 0; j < use.length; j++) {
                            if (!done[use[j]]) {
                                if (!Y._attach(use)) {
                                    return false;
                                }
                                break;
                            }
                        }
                    }



                }
            }
        }

        return true;
    },

    /**
    Delays the `use` callback until another event has taken place such as
    `window.onload`, `domready`, `contentready`, or `available`.

    @private
    @method _delayCallback
    @param {Function} cb The original `use` callback.
    @param {String|Object} until Either an event name ('load', 'domready', etc.)
        or an object containing event/args keys for contentready/available.
    @return {Function}
    **/
    _delayCallback: function(cb, until) {

        var Y = this,
            mod = ['event-base'];

        until = (Y.Lang.isObject(until) ? until : { event: until });

        if (until.event === 'load') {
            mod.push('event-synthetic');
        }

        Y.log('Delaying use callback until: ' + until.event, 'info', 'yui');
        return function() {
            Y.log('Use callback fired, waiting on delay', 'info', 'yui');
            var args = arguments;
            Y._use(mod, function() {
                Y.log('Delayed use wrapper callback after dependencies', 'info', 'yui');
                Y.on(until.event, function() {
                    args[1].delayUntil = until.event;
                    Y.log('Delayed use callback done after ' + until.event, 'info', 'yui');
                    cb.apply(Y, args);
                }, until.args);
            });
        };
    },

    /**
    Attaches one or more modules to this YUI instance. When this is executed,
    the requirements of the desired modules are analyzed, and one of several
    things can happen:


      * All required modules have already been loaded, and just need to be
        attached to this YUI instance. In this case, the `use()` callback will
        be executed synchronously after the modules are attached.

      * One or more modules have not yet been loaded, or the Get utility is not
        available, or the `bootstrap` config option is `false`. In this case,
        a warning is issued indicating that modules are missing, but all
        available modules will still be attached and the `use()` callback will
        be executed synchronously.

      * One or more modules are missing and the Loader is not available but the
        Get utility is, and `bootstrap` is not `false`. In this case, the Get
        utility will be used to load the Loader, and we will then proceed to
        the following state:

      * One or more modules are missing and the Loader is available. In this
        case, the Loader will be used to resolve the dependency tree for the
        missing modules and load them and their dependencies. When the Loader is
        finished loading modules, the `use()` callback will be executed
        asynchronously.

    @example

        // Loads and attaches dd and its dependencies.
        YUI().use('dd', function (Y) {
            // ...
        });

        // Loads and attaches dd and node as well as all of their dependencies.
        YUI().use(['dd', 'node'], function (Y) {
            // ...
        });

        // Attaches all modules that have already been loaded.
        YUI().use('*', function (Y) {
            // ...
        });

        // Attaches a gallery module.
        YUI().use('gallery-yql', function (Y) {
            // ...
        });

        // Attaches a YUI 2in3 module.
        YUI().use('yui2-datatable', function (Y) {
            // ...
        });

    @method use
    @param {String|Array} modules* One or more module names to attach.
    @param {Function} [callback] Callback function to be executed once all
        specified modules and their dependencies have been attached.
    @param {YUI} callback.Y The YUI instance created for this sandbox.
    @param {Object} callback.status Object containing `success`, `msg` and
        `data` properties.
    @chainable
    **/
    use: function() {
        var args = SLICE.call(arguments, 0),
            callback = args[args.length - 1],
            Y = this,
            i = 0,
            name,
            Env = Y.Env,
            provisioned = true;

        // The last argument supplied to use can be a load complete callback
        if (Y.Lang.isFunction(callback)) {
            args.pop();
            if (Y.config.delayUntil) {
                callback = Y._delayCallback(callback, Y.config.delayUntil);
            }
        } else {
            callback = null;
        }
        if (Y.Lang.isArray(args[0])) {
            args = args[0];
        }

        if (Y.config.cacheUse) {
            while ((name = args[i++])) {
                if (!Env._attached[name]) {
                    provisioned = false;
                    break;
                }
            }

            if (provisioned) {
                if (args.length) {
                    Y.log('already provisioned: ' + args, 'info', 'yui');
                }
                Y._notify(callback, ALREADY_DONE, args);
                return Y;
            }
        }

        if (Y._loading) {
            Y._useQueue = Y._useQueue || new Y.Queue();
            Y._useQueue.add([args, callback]);
        } else {
            Y._use(args, function(Y, response) {
                Y._notify(callback, response, args);
            });
        }

        return Y;
    },

    /**
    Sugar for loading both legacy and ES6-based YUI modules.

    @method require
    @param {String} [modules*] List of module names to import or a single
        module name.
    @param {Function} callback Callback that gets called once all the modules
        were loaded. Each parameter of the callback is the export value of the
        corresponding module in the list. If the module is a legacy YUI module,
        the YUI instance is used instead of the module exports.
    @example
    ```
    YUI().require(['es6-set'], function (Y, imports) {
        var Set = imports.Set,
            set = new Set();
    });
    ```
    **/
    require: function () {
        var args = SLICE.call(arguments),
            callback;

        if (typeof args[args.length - 1] === 'function') {
            callback = args.pop();

            // only add the callback if one was provided
            // YUI().require('foo'); is valid
            args.push(function (Y) {
                var i, length = args.length,
                    exported = Y.Env._exported,
                    __imports__ = {};

                // Get only the imports requested as arguments
                for (i = 0; i < length; i++) {
                    if (exported.hasOwnProperty(args[i])) {
                        __imports__[args[i]] = exported[args[i]];
                    }
                }

                // Using `undefined` because:
                // - Using `Y.config.global` would force the value of `this` to be
                //   the global object even in strict mode
                // - Using `Y` goes against the goal of moving away from a shared
                //   object and start thinking in terms of imported and exported
                //   objects
                callback.call(undefined, Y, __imports__);
            });
        }
        // Do not return the Y object. This makes it hard to follow this
        // traditional pattern:
        //   var Y = YUI().use(...);
        // This is a good idea in the light of ES6 modules, to avoid working
        // in the global scope.
        // This also leaves the door open for returning a promise, once the
        // YUI loader is based on the ES6 loader which uses
        // loader.import(...).then(...)
        this.use.apply(this, args);
    },

    /**
    Handles Loader notifications about attachment/load errors.

    @method _notify
    @param {Function} callback Callback to pass to `Y.config.loadErrorFn`.
    @param {Object} response Response returned from Loader.
    @param {Array} args Arguments passed from Loader.
    @private
    **/
    _notify: function(callback, response, args) {
        if (!response.success && this.config.loadErrorFn) {
            this.config.loadErrorFn.call(this, this, callback, response, args);
        } else if (callback) {
            if (this.Env._missed && this.Env._missed.length) {
                response.msg = 'Missing modules: ' + this.Env._missed.join();
                response.success = false;
            }
            if (this.config.throwFail) {
                callback(this, response);
            } else {
                try {
                    callback(this, response);
                } catch (e) {
                    this.error('use callback error', e, args);
                }
            }
        }
    },

    /**
    Called from the `use` method queue to ensure that only one set of loading
    logic is performed at a time.

    @method _use
    @param {String} args* One or more modules to attach.
    @param {Function} [callback] Function to call once all required modules have
        been attached.
    @private
    **/
    _use: function(args, callback) {

        if (!this.Array) {
            this._attach(['yui-base']);
        }

        var len, loader, handleBoot,
            Y = this,
            G_ENV = YUI.Env,
            mods = G_ENV.mods,
            Env = Y.Env,
            used = Env._used,
            aliases = G_ENV.aliases,
            queue = G_ENV._loaderQueue,
            firstArg = args[0],
            YArray = Y.Array,
            config = Y.config,
            boot = config.bootstrap,
            missing = [],
            i,
            r = [],
            ret = true,
            fetchCSS = config.fetchCSS,
            process = function(names, skip) {

                var i = 0, a = [], name, len, m, req, use;

                if (!names.length) {
                    return;
                }

                if (aliases) {
                    len = names.length;
                    for (i = 0; i < len; i++) {
                        if (aliases[names[i]] && !mods[names[i]]) {
                            a = [].concat(a, aliases[names[i]]);
                        } else {
                            a.push(names[i]);
                        }
                    }
                    names = a;
                }

                len = names.length;

                for (i = 0; i < len; i++) {
                    name = names[i];
                    if (!skip) {
                        r.push(name);
                    }

                    // only attach a module once
                    if (used[name]) {
                        continue;
                    }

                    m = mods[name];
                    req = null;
                    use = null;

                    if (m) {
                        used[name] = true;
                        req = m.details.requires;
                        use = m.details.use;
                    } else {
                        // CSS files don't register themselves, see if it has
                        // been loaded
                        if (!G_ENV._loaded[VERSION][name]) {
                            missing.push(name);
                        } else {
                            used[name] = true; // probably css
                        }
                    }

                    // make sure requirements are attached
                    if (req && req.length) {
                        process(req);
                    }

                    // make sure we grab the submodule dependencies too
                    if (use && use.length) {
                        process(use, 1);
                    }
                }

            },

            handleLoader = function(fromLoader) {
                var response = fromLoader || {
                        success: true,
                        msg: 'not dynamic'
                    },
                    redo, origMissing,
                    ret = true,
                    data = response.data;

                Y._loading = false;

                if (data) {
                    origMissing = missing;
                    missing = [];
                    r = [];
                    process(data);
                    redo = missing.length;
                    if (redo) {
                        if ([].concat(missing).sort().join() ==
                                origMissing.sort().join()) {
                            redo = false;
                        }
                    }
                }

                if (redo && data) {
                    Y._loading = true;
                    Y._use(missing, function() {
                        Y.log('Nested use callback: ' + data, 'info', 'yui');
                        if (Y._attach(data)) {
                            Y._notify(callback, response, data);
                        }
                    });
                } else {
                    if (data) {
                        // Y.log('attaching from loader: ' + data, 'info', 'yui');
                        ret = Y._attach(data);
                    }
                    if (ret) {
                        Y._notify(callback, response, args);
                    }
                }

                if (Y._useQueue && Y._useQueue.size() && !Y._loading) {
                    Y._use.apply(Y, Y._useQueue.next());
                }

            };

// Y.log(Y.id + ': use called: ' + a + ' :: ' + callback, 'info', 'yui');

        // YUI().use('*'); // bind everything available
        if (firstArg === '*') {
            args = [];
            for (i in mods) {
                if (mods.hasOwnProperty(i)) {
                    args.push(i);
                }
            }
            ret = Y._attach(args);
            if (ret) {
                handleLoader();
            }
            return Y;
        }

        if ((mods.loader || mods['loader-base']) && !Y.Loader) {
            Y.log('Loader was found in meta, but it is not attached. Attaching..', 'info', 'yui');
            Y._attach(['loader' + ((!mods.loader) ? '-base' : '')]);
        }

        // Y.log('before loader requirements: ' + args, 'info', 'yui');

        // use loader to expand dependencies and sort the
        // requirements if it is available.
        if (boot && Y.Loader && args.length) {
            Y.log('Using loader to expand dependencies', 'info', 'yui');
            loader = getLoader(Y);
            loader.require(args);
            loader.ignoreRegistered = true;
            loader._boot = true;
            loader.calculate(null, (fetchCSS) ? null : 'js');
            args = loader.sorted;
            loader._boot = false;
        }

        process(args);

        len = missing.length;


        if (len) {
            missing = YArray.dedupe(missing);
            len = missing.length;
Y.log('Modules missing: ' + missing + ', ' + missing.length, 'info', 'yui');
        }


        // dynamic load
        if (boot && len && Y.Loader) {
// Y.log('Using loader to fetch missing deps: ' + missing, 'info', 'yui');
            Y.log('Using Loader', 'info', 'yui');
            Y._loading = true;
            loader = getLoader(Y);
            loader.onEnd = handleLoader;
            loader.context = Y;
            loader.data = args;
            loader.ignoreRegistered = false;
            loader.require(missing);
            loader.insert(null, (fetchCSS) ? null : 'js');

        } else if (boot && len && Y.Get && !Env.bootstrapped) {

            Y._loading = true;

            handleBoot = function() {
                Y._loading = false;
                queue.running = false;
                Env.bootstrapped = true;
                G_ENV._bootstrapping = false;
                if (Y._attach(['loader'])) {
                    Y._use(args, callback);
                }
            };

            if (G_ENV._bootstrapping) {
Y.log('Waiting for loader', 'info', 'yui');
                queue.add(handleBoot);
            } else {
                G_ENV._bootstrapping = true;
Y.log('Fetching loader: ' + config.base + config.loaderPath, 'info', 'yui');
                Y.Get.script(config.base + config.loaderPath, {
                    onEnd: handleBoot
                });
            }

        } else {
            Y.log('Attaching available dependencies: ' + args, 'info', 'yui');
            ret = Y._attach(args);
            if (ret) {
                handleLoader();
            }
        }

        return Y;
    },


    /**
    Utility method for safely creating namespaces if they don't already exist.
    May be called statically on the YUI global object or as a method on a YUI
    instance.

    When called statically, a namespace will be created on the YUI global
    object:

        // Create `YUI.your.namespace.here` as nested objects, preserving any
        // objects that already exist instead of overwriting them.
        YUI.namespace('your.namespace.here');

    When called as a method on a YUI instance, a namespace will be created on
    that instance:

        // Creates `Y.property.package`.
        Y.namespace('property.package');

    Dots in the input string cause `namespace` to create nested objects for each
    token. If any part of the requested namespace already exists, the current
    object will be left in place and will not be overwritten. This allows
    multiple calls to `namespace` to preserve existing namespaced properties.

    If the first token in the namespace string is "YAHOO", that token is
    discarded. This is legacy behavior for backwards compatibility with YUI 2.

    Be careful with namespace tokens. Reserved words may work in some browsers
    and not others. For instance, the following will fail in some browsers
    because the supported version of JavaScript reserves the word "long":

        Y.namespace('really.long.nested.namespace');

    Note: If you pass multiple arguments to create multiple namespaces, only the
    last one created is returned from this function.

    @method namespace
    @param {String} namespace* One or more namespaces to create.
    @return {Object} Reference to the last namespace object created.
    **/
    namespace: function() {
        var a = arguments, o, i = 0, j, d, arg;

        for (; i < a.length; i++) {
            o = this; //Reset base object per argument or it will get reused from the last
            arg = a[i];
            if (arg.indexOf(PERIOD) > -1) { //Skip this if no "." is present
                d = arg.split(PERIOD);
                for (j = (d[0] == 'YAHOO') ? 1 : 0; j < d.length; j++) {
                    o[d[j]] = o[d[j]] || {};
                    o = o[d[j]];
                }
            } else {
                o[arg] = o[arg] || {};
                o = o[arg]; //Reset base object to the new object so it's returned
            }
        }
        return o;
    },

    // this is replaced if the log module is included
    log: NOOP,
    message: NOOP,
    // this is replaced if the dump module is included
    dump: function (o) { return ''+o; },

    /**
    Reports an error.

    The reporting mechanism is controlled by the `throwFail` configuration
    attribute. If `throwFail` is falsy, the message is logged. If `throwFail` is
    truthy, a JS exception is thrown.

    If an `errorFn` is specified in the config it must return `true` to indicate
    that the exception was handled and keep it from being thrown.

    @method error
    @param {String} msg Error message.
    @param {Error|String} [e] JavaScript error object or an error string.
    @param {String} [src] Source of the error (such as the name of the module in
        which the error occurred).
    @chainable
    **/
    error: function(msg, e, src) {
        //TODO Add check for window.onerror here

        var Y = this, ret;

        if (Y.config.errorFn) {
            ret = Y.config.errorFn.apply(Y, arguments);
        }

        if (!ret) {
            throw (e || new Error(msg));
        } else {
            Y.message(msg, 'error', ''+src); // don't scrub this one
        }

        return Y;
    },

    /**
    Generates an id string that is unique among all YUI instances in this
    execution context.

    @method guid
    @param {String} [pre] Prefix.
    @return {String} Unique id.
    **/
    guid: function(pre) {
        var id = this.Env._guidp + '_' + (++this.Env._uidx);
        return (pre) ? (pre + id) : id;
    },

    /**
    Returns a unique id associated with the given object and (if *readOnly* is
    falsy) stamps the object with that id so it can be identified in the future.

    Stamping an object involves adding a `_yuid` property to it that contains
    the object's id. One exception to this is that in Internet Explorer, DOM
    nodes have a `uniqueID` property that contains a browser-generated unique
    id, which will be used instead of a YUI-generated id when available.

    @method stamp
    @param {Object} o Object to stamp.
    @param {Boolean} readOnly If truthy and the given object has not already
        been stamped, the object will not be modified and `null` will be
        returned.
    @return {String} Object's unique id, or `null` if *readOnly* was truthy and
        the given object was not already stamped.
    **/
    stamp: function(o, readOnly) {
        var uid;
        if (!o) {
            return o;
        }

        // IE generates its own unique ID for dom nodes
        // The uniqueID property of a document node returns a new ID
        if (o.uniqueID && o.nodeType && o.nodeType !== 9) {
            uid = o.uniqueID;
        } else {
            uid = (typeof o === 'string') ? o : o._yuid;
        }

        if (!uid) {
            uid = this.guid();
            if (!readOnly) {
                try {
                    o._yuid = uid;
                } catch (e) {
                    uid = null;
                }
            }
        }
        return uid;
    },

    /**
    Destroys this YUI instance.

    @method destroy
    @since 3.3.0
    **/
    destroy: function() {
        var Y = this;
        if (Y.Event) {
            Y.Event._unload();
        }
        delete instances[Y.id];
        delete Y.Env;
        delete Y.config;
    }

    /**
    Safe `instanceof` wrapper that works around a memory leak in IE when the
    object being tested is `window` or `document`.

    Unless you are testing objects that may be `window` or `document`, you
    should use the native `instanceof` operator instead of this method.

    @method instanceOf
    @param {Object} o Object to check.
    @param {Object} type Class to check against.
    @since 3.3.0
    **/
};

    YUI.prototype = proto;

    // inheritance utilities are not available yet
    for (prop in proto) {
        if (proto.hasOwnProperty(prop)) {
            YUI[prop] = proto[prop];
        }
    }

    /**
    Applies a configuration to all YUI instances in this execution context.

    The main use case for this method is in "mashups" where several third-party
    scripts need to write to a global YUI config, but cannot share a single
    centrally-managed config object. This way they can all call
    `YUI.applyConfig({})` instead of overwriting the single global config.

    @example

        YUI.applyConfig({
            modules: {
                davglass: {
                    fullpath: './davglass.js'
                }
            }
        });

        YUI.applyConfig({
            modules: {
                foo: {
                    fullpath: './foo.js'
                }
            }
        });

        YUI().use('davglass', function (Y) {
            // Module davglass will be available here.
        });

    @method applyConfig
    @param {Object} o Configuration object to apply.
    @static
    @since 3.5.0
    **/
    YUI.applyConfig = function(o) {
        if (!o) {
            return;
        }
        //If there is a GlobalConfig, apply it first to set the defaults
        if (YUI.GlobalConfig) {
            this.prototype.applyConfig.call(this, YUI.GlobalConfig);
        }
        //Apply this config to it
        this.prototype.applyConfig.call(this, o);
        //Reset GlobalConfig to the combined config
        YUI.GlobalConfig = this.config;
    };

    // set up the environment
    YUI._init();

    if (hasWin) {
        add(doc, 'DOMContentLoaded', handleReady);

        // add a window load event at load time so we can capture
        // the case where it fires before dynamic loading is
        // complete.
        add(window, 'load', handleLoad);
    } else {
        handleReady();
        handleLoad();
    }

    YUI.Env.add = add;
    YUI.Env.remove = remove;

    /*global exports*/
    // Support the CommonJS method for exporting our single global
    if (typeof exports == 'object') {
        exports.YUI = YUI;
        /**
        * Set a method to be called when `Get.script` is called in Node.js
        * `Get` will open the file, then pass it's content and it's path
        * to this method before attaching it. Commonly used for code coverage
        * instrumentation. <strong>Calling this multiple times will only
        * attach the last hook method</strong>. This method is only
        * available in Node.js.
        * @method setLoadHook
        * @static
        * @param {Function} fn The function to set
        * @param {String} fn.data The content of the file
        * @param {String} fn.path The file path of the file
        */
        YUI.setLoadHook = function(fn) {
            YUI._getLoadHook = fn;
        };
        /**
        * Load hook for `Y.Get.script` in Node.js, see `YUI.setLoadHook`
        * @method _getLoadHook
        * @private
        * @param {String} data The content of the file
        * @param {String} path The file path of the file
        */
        YUI._getLoadHook = null;
    }

    YUI.Env[VERSION] = {};
}());


/**
Config object that contains all of the configuration options for
this `YUI` instance.

This object is supplied by the implementer when instantiating YUI. Some
properties have default values if they are not supplied by the implementer.

This object should not be updated directly because some values are cached. Use
`applyConfig()` to update the config object on a YUI instance that has already
been configured.

@class config
@static
**/

/**
If `true` (the default), YUI will "bootstrap" the YUI Loader and module metadata
if they're needed to load additional dependencies and aren't already available.

Setting this to `false` will prevent YUI from automatically loading the Loader
and module metadata, so you will need to manually ensure that they're available
or handle dependency resolution yourself.

@property {Boolean} bootstrap
@default true
**/

/**
If `true`, `Y.log()` messages will be written to the browser's debug console
when available and when `useBrowserConsole` is also `true`.

@property {Boolean} debug
@default true
**/

/**
Log messages to the browser console if `debug` is `true` and the browser has a
supported console.

@property {Boolean} useBrowserConsole
@default true
**/

/**
A hash of log sources that should be logged. If specified, only messages from
these sources will be logged. Others will be discarded.

@property {Object} logInclude
@type object
**/

/**
A hash of log sources that should be not be logged. If specified, all sources
will be logged *except* those on this list.

@property {Object} logExclude
**/

/**
When the YUI seed file is dynamically loaded after the `window.onload` event has
fired, set this to `true` to tell YUI that it shouldn't wait for `window.onload`
to occur.

This ensures that components that rely on `window.onload` and the `domready`
custom event will work as expected even when YUI is dynamically injected.

@property {Boolean} injected
@default false
**/

/**
If `true`, `Y.error()` will generate or re-throw a JavaScript error. Otherwise,
errors are merely logged silently.

@property {Boolean} throwFail
@default true
**/

/**
Reference to the global object for this execution context.

In a browser, this is the current `window` object. In Node.js, this is the
Node.js `global` object.

@property {Object} global
**/

/**
The browser window or frame that this YUI instance should operate in.

When running in Node.js, this property is `undefined`, since there is no
`window` object. Use `global` to get a reference to the global object that will
work in both browsers and Node.js.

@property {Window} win
**/

/**
The browser `document` object associated with this YUI instance's `win` object.

When running in Node.js, this property is `undefined`, since there is no
`document` object.

@property {Document} doc
**/

/**
A list of modules that defines the YUI core (overrides the default list).

@property {Array} core
@type Array
@default ['get', 'features', 'intl-base', 'yui-log', 'yui-later', 'loader-base', 'loader-rollup', 'loader-yui3']
**/

/**
A list of languages to use in order of preference.

This list is matched against the list of available languages in modules that the
YUI instance uses to determine the best possible localization of language
sensitive modules.

Languages are represented using BCP 47 language tags, such as "en-GB" for
English as used in the United Kingdom, or "zh-Hans-CN" for simplified Chinese as
used in China. The list may be provided as a comma-separated string or as an
array.

@property {String|String[]} lang
**/

/**
Default date format.

@property {String} dateFormat
@deprecated Use configuration in `DataType.Date.format()` instead.
**/

/**
Default locale.

@property {String} locale
@deprecated Use `config.lang` instead.
**/

/**
Default generic polling interval in milliseconds.

@property {Number} pollInterval
@default 20
**/

/**
The number of dynamic `<script>` nodes to insert by default before automatically
removing them when loading scripts.

This applies only to script nodes because removing the node will not make the
evaluated script unavailable. Dynamic CSS nodes are not auto purged, because
removing a linked style sheet will also remove the style definitions.

@property {Number} purgethreshold
@default 20
**/

/**
Delay in milliseconds to wait after a window `resize` event before firing the
event. If another `resize` event occurs before this delay has elapsed, the
delay will start over to ensure that `resize` events are throttled.

@property {Number} windowResizeDelay
@default 40
**/

/**
Base directory for dynamic loading.

@property {String} base
**/

/**
Base URL for a dynamic combo handler. This will be used to make combo-handled
module requests if `combine` is set to `true.

@property {String} comboBase
@default "http://yui.yahooapis.com/combo?"
**/

/**
Root path to prepend to each module path when creating a combo-handled request.

This is updated for each YUI release to point to a specific version of the
library; for example: "3.8.0/build/".

@property {String} root
**/

/**
Filter to apply to module urls. This filter will modify the default path for all
modules.

The default path for the YUI library is the minified version of the files (e.g.,
event-min.js). The filter property can be a predefined filter or a custom
filter. The valid predefined filters are:

  - **debug**: Loads debug versions of modules (e.g., event-debug.js).
  - **raw**: Loads raw, non-minified versions of modules without debug logging
    (e.g., event.js).

You can also define a custom filter, which must be an object literal containing
a search regular expression and a replacement string:

    myFilter: {
        searchExp : "-min\\.js",
        replaceStr: "-debug.js"
    }

@property {Object|String} filter
**/

/**
Skin configuration and customizations.

@property {Object} skin
@param {String} [skin.defaultSkin='sam'] Default skin name. This skin will be
    applied automatically to skinnable components if not overridden by a
    component-specific skin name.
@param {String} [skin.base='assets/skins/'] Default base path for a skin,
    relative to Loader's `base` path.
@param {Object} [skin.overrides] Component-specific skin name overrides. Specify
    a component name as the key and, as the value, a string or array of strings
    for a skin or skins that should be loaded for that component instead of the
    `defaultSkin`.
**/

/**
Hash of per-component filter specifications. If specified for a given component,
this overrides the global `filter` config.

@example
    YUI({
        modules: {
            'foo': './foo.js',
            'bar': './bar.js',
            'baz': './baz.js'
        },
        filters: {
            'foo': {
                searchExp: '.js',
                replaceStr: '-coverage.js'
            }
        }
    }).use('foo', 'bar', 'baz', function (Y) {
        // foo-coverage.js is loaded
        // bar.js is loaded
        // baz.js is loaded
    });

@property {Object} filters
**/

/**
If `true`, YUI will use a combo handler to load multiple modules in as few
requests as possible.

The YUI CDN (which YUI uses by default) supports combo handling, but other
servers may not. If the server from which you're loading YUI does not support
combo handling, set this to `false`.

Providing a value for the `base` config property will cause `combine` to default
to `false` instead of `true`.

@property {Boolean} combine
@default true
*/

/**
Array of module names that should never be dynamically loaded.

@property {String[]} ignore
**/

/**
Array of module names that should always be loaded when required, even if
already present on the page.

@property {String[]} force
**/

/**
DOM element or id that should be used as the insertion point for dynamically
added `<script>` and `<link>` nodes.

@property {HTMLElement|String} insertBefore
**/

/**
Object hash containing attributes to add to dynamically added `<script>` nodes.

@property {Object} jsAttributes
**/

/**
Object hash containing attributes to add to dynamically added `<link>` nodes.

@property {Object} cssAttributes
**/

/**
Timeout in milliseconds before a dynamic JS or CSS request will be considered a
failure. If not set, no timeout will be enforced.

@property {Number} timeout
**/

/**
A hash of module definitions to add to the list of available YUI modules. These
modules can then be dynamically loaded via the `use()` method.

This is a hash in which keys are module names and values are objects containing
module metadata.

See `Loader.addModule()` for the supported module metadata fields. Also see
`groups`, which provides a way to configure the base and combo spec for a set of
modules.

@example

    modules: {
        mymod1: {
            requires: ['node'],
            fullpath: '/mymod1/mymod1.js'
        },

        mymod2: {
            requires: ['mymod1'],
            fullpath: '/mymod2/mymod2.js'
        },

        mymod3: '/js/mymod3.js',
        mycssmod: '/css/mycssmod.css'
    }

@property {Object} modules
**/

/**
Aliases are dynamic groups of modules that can be used as shortcuts.

@example

    YUI({
        aliases: {
            davglass: [ 'node', 'yql', 'dd' ],
            mine: [ 'davglass', 'autocomplete']
        }
    }).use('mine', function (Y) {
        // Node, YQL, DD & AutoComplete available here.
    });

@property {Object} aliases
**/

/**
A hash of module group definitions.

For each group you can specify a list of modules and the base path and
combo spec to use when dynamically loading the modules.

@example

    groups: {
        yui2: {
            // specify whether or not this group has a combo service
            combine: true,

            // The comboSeperator to use with this group's combo handler
            comboSep: ';',

            // The maxURLLength for this server
            maxURLLength: 500,

            // the base path for non-combo paths
            base: 'http://yui.yahooapis.com/2.8.0r4/build/',

            // the path to the combo service
            comboBase: 'http://yui.yahooapis.com/combo?',

            // a fragment to prepend to the path attribute when
            // when building combo urls
            root: '2.8.0r4/build/',

            // the module definitions
            modules:  {
                yui2_yde: {
                    path: "yahoo-dom-event/yahoo-dom-event.js"
                },
                yui2_anim: {
                    path: "animation/animation.js",
                    requires: ['yui2_yde']
                }
            }
        }
    }

@property {Object} groups
**/

/**
Path to the Loader JS file, relative to the `base` path.

This is used to dynamically bootstrap the Loader when it's needed and isn't yet
available.

@property {String} loaderPath
@default "loader/loader-min.js"
**/

/**
If `true`, YUI will attempt to load CSS dependencies and skins. Set this to
`false` to prevent YUI from loading any CSS, or set it to the string `"force"`
to force CSS dependencies to be loaded even if their associated JS modules are
already loaded.

@property {Boolean|String} fetchCSS
@default true
**/

/**
Default gallery version used to build gallery module urls.

@property {String} gallery
@since 3.1.0
**/

/**
Default YUI 2 version used to build YUI 2 module urls.

This is used for intrinsic YUI 2 support via the 2in3 project. Also see the
`2in3` config for pulling different revisions of the wrapped YUI 2 modules.

@property {String} yui2
@default "2.9.0"
@since 3.1.0
**/

/**
Revision number of YUI 2in3 modules that should be used when loading YUI 2in3.

@property {String} 2in3
@default "4"
@since 3.1.0
**/

/**
Alternate console log function that should be used in environments without a
supported native console. This function is executed with the YUI instance as its
`this` object.

@property {Function} logFn
@since 3.1.0
**/

/**
The minimum log level to log messages for. Log levels are defined
incrementally. Messages greater than or equal to the level specified will
be shown. All others will be discarded. The order of log levels in
increasing priority is:

    debug
    info
    warn
    error

@property {String} logLevel
@default 'debug'
@since 3.10.0
**/

/**
Callback to execute when `Y.error()` is called. It receives the error message
and a JavaScript error object if one was provided.

This function is executed with the YUI instance as its `this` object.

Returning `true` from this function will prevent an exception from being thrown.

@property {Function} errorFn
@param {String} errorFn.msg Error message
@param {Object} [errorFn.err] Error object (if one was provided).
@since 3.2.0
**/

/**
A callback to execute when Loader fails to load one or more resources.

This could be because of a script load failure. It could also be because a
module fails to register itself when the `requireRegistration` config is `true`.

If this function is defined, the `use()` callback will only be called when the
loader succeeds. Otherwise, `use()` will always executes unless there was a
JavaScript error when attaching a module.

@property {Function} loadErrorFn
@since 3.3.0
**/

/**
If `true`, Loader will expect all loaded scripts to be first-class YUI modules
that register themselves with the YUI global, and will trigger a failure if a
loaded script does not register a YUI module.

@property {Boolean} requireRegistration
@default false
@since 3.3.0
**/

/**
Cache serviced use() requests.

@property {Boolean} cacheUse
@default true
@since 3.3.0
@deprecated No longer used.
**/

/**
Whether or not YUI should use native ES5 functionality when available for
features like `Y.Array.each()`, `Y.Object()`, etc.

When `false`, YUI will always use its own fallback implementations instead of
relying on ES5 functionality, even when ES5 functionality is available.

@property {Boolean} useNativeES5
@default true
@since 3.5.0
**/

/**
 * Leverage native JSON stringify if the browser has a native
 * implementation.  In general, this is a good idea.  See the Known Issues
 * section in the JSON user guide for caveats.  The default value is true
 * for browsers with native JSON support.
 *
 * @property useNativeJSONStringify
 * @type Boolean
 * @default true
 * @since 3.8.0
 */

 /**
 * Leverage native JSON parse if the browser has a native implementation.
 * In general, this is a good idea.  See the Known Issues section in the
 * JSON user guide for caveats.  The default value is true for browsers with
 * native JSON support.
 *
 * @property useNativeJSONParse
 * @type Boolean
 * @default true
 * @since 3.8.0
 */

/**
Delay the `use` callback until a specific event has passed (`load`, `domready`, `contentready` or `available`)

@property {Object|String} delayUntil
@since 3.6.0
@example

You can use `load` or `domready` strings by default:

    YUI({
        delayUntil: 'domready'
    }, function (Y) {
        // This will not execute until 'domeready' occurs.
    });

Or you can delay until a node is available (with `available` or `contentready`):

    YUI({
        delayUntil: {
            event: 'available',
            args : '#foo'
        }
    }, function (Y) {
        // This will not execute until a node matching the selector "#foo" is
        // available in the DOM.
    });

**/
YUI.add('yui-base', function (Y, NAME) {

/*
 * YUI stub
 * @module yui
 * @submodule yui-base
 */
/**
 * The YUI module contains the components required for building the YUI
 * seed file.  This includes the script loading mechanism, a simple queue,
 * and the core utilities for the library.
 * @module yui
 * @submodule yui-base
 */

/**
 * Provides core language utilites and extensions used throughout YUI.
 *
 * @class Lang
 * @static
 */

var L = Y.Lang || (Y.Lang = {}),

STRING_PROTO = String.prototype,
TOSTRING     = Object.prototype.toString,

TYPES = {
    'undefined'        : 'undefined',
    'number'           : 'number',
    'boolean'          : 'boolean',
    'string'           : 'string',
    '[object Function]': 'function',
    '[object RegExp]'  : 'regexp',
    '[object Array]'   : 'array',
    '[object Date]'    : 'date',
    '[object Error]'   : 'error'
},

SUBREGEX         = /\{\s*([^|}]+?)\s*(?:\|([^}]*))?\s*\}/g,

WHITESPACE       = "\x09\x0A\x0B\x0C\x0D\x20\xA0\u1680\u180E\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF",
WHITESPACE_CLASS = "[\x09-\x0D\x20\xA0\u1680\u180E\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]+",
TRIM_LEFT_REGEX  = new RegExp("^" + WHITESPACE_CLASS),
TRIM_RIGHT_REGEX = new RegExp(WHITESPACE_CLASS + "$"),
TRIMREGEX        = new RegExp(TRIM_LEFT_REGEX.source + "|" + TRIM_RIGHT_REGEX.source, "g"),

NATIVE_FN_REGEX  = /\{\s*\[(?:native code|function)\]\s*\}/i;

// -- Protected Methods --------------------------------------------------------

/**
Returns `true` if the given function appears to be implemented in native code,
`false` otherwise. Will always return `false` -- even in ES5-capable browsers --
if the `useNativeES5` YUI config option is set to `false`.

This isn't guaranteed to be 100% accurate and won't work for anything other than
functions, but it can be useful for determining whether a function like
`Array.prototype.forEach` is native or a JS shim provided by another library.

There's a great article by @kangax discussing certain flaws with this technique:
<http://perfectionkills.com/detecting-built-in-host-methods/>

While his points are valid, it's still possible to benefit from this function
as long as it's used carefully and sparingly, and in such a way that false
negatives have minimal consequences. It's used internally to avoid using
potentially broken non-native ES5 shims that have been added to the page by
other libraries.

@method _isNative
@param {Function} fn Function to test.
@return {Boolean} `true` if _fn_ appears to be native, `false` otherwise.
@static
@protected
@since 3.5.0
**/
L._isNative = function (fn) {
    return !!(Y.config.useNativeES5 && fn && NATIVE_FN_REGEX.test(fn));
};

// -- Public Methods -----------------------------------------------------------

/**
 * Determines whether or not the provided item is an array.
 *
 * Returns `false` for array-like collections such as the function `arguments`
 * collection or `HTMLElement` collections. Use `Y.Array.test()` if you want to
 * test for an array-like collection.
 *
 * @method isArray
 * @param o The object to test.
 * @return {boolean} true if o is an array.
 * @static
 */
L.isArray = L._isNative(Array.isArray) ? Array.isArray : function (o) {
    return L.type(o) === 'array';
};

/**
 * Determines whether or not the provided item is a boolean.
 * @method isBoolean
 * @static
 * @param o The object to test.
 * @return {boolean} true if o is a boolean.
 */
L.isBoolean = function(o) {
    return typeof o === 'boolean';
};

/**
 * Determines whether or not the supplied item is a date instance.
 * @method isDate
 * @static
 * @param o The object to test.
 * @return {boolean} true if o is a date.
 */
L.isDate = function(o) {
    return L.type(o) === 'date' && o.toString() !== 'Invalid Date' && !isNaN(o);
};

/**
 * <p>
 * Determines whether or not the provided item is a function.
 * Note: Internet Explorer thinks certain functions are objects:
 * </p>
 *
 * <pre>
 * var obj = document.createElement("object");
 * Y.Lang.isFunction(obj.getAttribute) // reports false in IE
 * &nbsp;
 * var input = document.createElement("input"); // append to body
 * Y.Lang.isFunction(input.focus) // reports false in IE
 * </pre>
 *
 * <p>
 * You will have to implement additional tests if these functions
 * matter to you.
 * </p>
 *
 * @method isFunction
 * @static
 * @param o The object to test.
 * @return {boolean} true if o is a function.
 */
L.isFunction = function(o) {
    return L.type(o) === 'function';
};

/**
 * Determines whether or not the provided item is null.
 * @method isNull
 * @static
 * @param o The object to test.
 * @return {boolean} true if o is null.
 */
L.isNull = function(o) {
    return o === null;
};

/**
 * Determines whether or not the provided item is a legal number.
 * @method isNumber
 * @static
 * @param o The object to test.
 * @return {boolean} true if o is a number.
 */
L.isNumber = function(o) {
    return typeof o === 'number' && isFinite(o);
};

/**
 * Determines whether or not the provided item is of type object
 * or function. Note that arrays are also objects, so
 * <code>Y.Lang.isObject([]) === true</code>.
 * @method isObject
 * @static
 * @param o The object to test.
 * @param failfn {boolean} fail if the input is a function.
 * @return {boolean} true if o is an object.
 * @see isPlainObject
 */
L.isObject = function(o, failfn) {
    var t = typeof o;
    return (o && (t === 'object' ||
        (!failfn && (t === 'function' || L.isFunction(o))))) || false;
};

/**
 * Determines whether or not the provided value is a regexp.
 * @method isRegExp
 * @static
 * @param value The value or object to test.
 * @return {boolean} true if value is a regexp.
 */
L.isRegExp = function(value) {
    return L.type(value) === 'regexp';
};

/**
 * Determines whether or not the provided item is a string.
 * @method isString
 * @static
 * @param o The object to test.
 * @return {boolean} true if o is a string.
 */
L.isString = function(o) {
    return typeof o === 'string';
};

/**
 * Determines whether or not the provided item is undefined.
 * @method isUndefined
 * @static
 * @param o The object to test.
 * @return {boolean} true if o is undefined.
 */
L.isUndefined = function(o) {
    return typeof o === 'undefined';
};

/**
 * A convenience method for detecting a legitimate non-null value.
 * Returns false for null/undefined/NaN, true for other values,
 * including 0/false/''
 * @method isValue
 * @static
 * @param o The item to test.
 * @return {boolean} true if it is not null/undefined/NaN || false.
 */
L.isValue = function(o) {
    var t = L.type(o);

    switch (t) {
        case 'number':
            return isFinite(o);

        case 'null': // fallthru
        case 'undefined':
            return false;

        default:
            return !!t;
    }
};

/**
 * Returns the current time in milliseconds.
 *
 * @method now
 * @return {Number} Current time in milliseconds.
 * @static
 * @since 3.3.0
 */
L.now = Date.now || function () {
    return new Date().getTime();
};

/**
 * Performs `{placeholder}` substitution on a string. The object passed as the
 * second parameter provides values to replace the `{placeholder}`s.
 * `{placeholder}` token names must match property names of the object. For example,
 *
 *`var greeting = Y.Lang.sub("Hello, {who}!", { who: "World" });`
 *
 * `{placeholder}` tokens that are undefined on the object map will be left
 * in tact (leaving unsightly `{placeholder}`'s in the output string).
 *
 * @method sub
 * @param {string} s String to be modified.
 * @param {object} o Object containing replacement values.
 * @return {string} the substitute result.
 * @static
 * @since 3.2.0
 */
L.sub = function(s, o) {

    /**
    Finds the value of `key` in given object.
    If the key has a 'dot' notation e.g. 'foo.bar.baz', the function will
    try to resolve this path if it doesn't exist as a property
    @example
        value({ 'a.b': 1, a: { b: 2 } }, 'a.b'); // 1
        value({ a: { b: 2 } }          , 'a.b'); // 2
    @param {Object} obj A key/value pairs object
    @param {String} key
    @return {Any}
    @private
    **/
    function value(obj, key) {

        var subkey;

        if ( typeof obj[key] !== 'undefined' ) {
            return obj[key];
        }

        key    = key.split('.');         // given 'a.b.c'
        subkey = key.slice(1).join('.'); // 'b.c'
        key    = key[0];                 // 'a'

        // special case for null as typeof returns object and we don't want that.
        if ( subkey && typeof obj[key] === 'object' && obj[key] !== null ) {
            return value(obj[key], subkey);
        }
    }

    return s.replace ? s.replace(SUBREGEX, function (match, key) {
        var val = key.indexOf('.')>-1 ? value(o, key) : o[key];
        return typeof val === 'undefined' ? match : val;
    }) : s;
};

/**
 * Returns a string without any leading or trailing whitespace.  If
 * the input is not a string, the input will be returned untouched.
 * @method trim
 * @static
 * @param s {string} the string to trim.
 * @return {string} the trimmed string.
 */
L.trim = L._isNative(STRING_PROTO.trim) && !WHITESPACE.trim() ? function(s) {
    return s && s.trim ? s.trim() : s;
} : function (s) {
    try {
        return s.replace(TRIMREGEX, '');
    } catch (e) {
        return s;
    }
};

/**
 * Returns a string without any leading whitespace.
 * @method trimLeft
 * @static
 * @param s {string} the string to trim.
 * @return {string} the trimmed string.
 */
L.trimLeft = L._isNative(STRING_PROTO.trimLeft) && !WHITESPACE.trimLeft() ? function (s) {
    return s.trimLeft();
} : function (s) {
    return s.replace(TRIM_LEFT_REGEX, '');
};

/**
 * Returns a string without any trailing whitespace.
 * @method trimRight
 * @static
 * @param s {string} the string to trim.
 * @return {string} the trimmed string.
 */
L.trimRight = L._isNative(STRING_PROTO.trimRight) && !WHITESPACE.trimRight() ? function (s) {
    return s.trimRight();
} : function (s) {
    return s.replace(TRIM_RIGHT_REGEX, '');
};

/**
Returns one of the following strings, representing the type of the item passed
in:

 * "array"
 * "boolean"
 * "date"
 * "error"
 * "function"
 * "null"
 * "number"
 * "object"
 * "regexp"
 * "string"
 * "undefined"

Known issues:

 * `typeof HTMLElementCollection` returns function in Safari, but
    `Y.Lang.type()` reports "object", which could be a good thing --
    but it actually caused the logic in <code>Y.Lang.isObject</code> to fail.

@method type
@param o the item to test.
@return {string} the detected type.
@static
**/
L.type = function(o) {
    return TYPES[typeof o] || TYPES[TOSTRING.call(o)] || (o ? 'object' : 'null');
};
/**
@module yui
@submodule yui-base
*/

var Lang   = Y.Lang,
    Native = Array.prototype,

    hasOwn = Object.prototype.hasOwnProperty;

/**
Provides utility methods for working with arrays. Additional array helpers can
be found in the `collection` and `array-extras` modules.

`Y.Array(thing)` returns a native array created from _thing_. Depending on
_thing_'s type, one of the following will happen:

  * Arrays are returned unmodified unless a non-zero _startIndex_ is
    specified.
  * Array-like collections (see `Array.test()`) are converted to arrays.
  * For everything else, a new array is created with _thing_ as the sole
    item.

Note: elements that are also collections, such as `<form>` and `<select>`
elements, are not automatically converted to arrays. To force a conversion,
pass `true` as the value of the _force_ parameter.

@class Array
@constructor
@param {Any} thing The thing to arrayify.
@param {Number} [startIndex=0] If non-zero and _thing_ is an array or array-like
  collection, a subset of items starting at the specified index will be
  returned.
@param {Boolean} [force=false] If `true`, _thing_ will be treated as an
  array-like collection no matter what.
@return {Array} A native array created from _thing_, according to the rules
  described above.
**/
function YArray(thing, startIndex, force) {
    var len, result;

    /*jshint expr: true*/
    startIndex || (startIndex = 0);

    if (force || YArray.test(thing)) {
        // IE throws when trying to slice HTMLElement collections.
        try {
            return Native.slice.call(thing, startIndex);
        } catch (ex) {
            result = [];

            for (len = thing.length; startIndex < len; ++startIndex) {
                result.push(thing[startIndex]);
            }

            return result;
        }
    }

    return [thing];
}

Y.Array = YArray;

/**
Dedupes an array of strings, returning an array that's guaranteed to contain
only one copy of a given string.

This method differs from `Array.unique()` in that it's optimized for use only
with arrays consisting entirely of strings or entirely of numbers, whereas
`unique` may be used with other value types (but is slower).

Using `dedupe()` with values other than strings or numbers, or with arrays
containing a mix of strings and numbers, may result in unexpected behavior.

@method dedupe
@param {String[]|Number[]} array Array of strings or numbers to dedupe.
@return {Array} Copy of _array_ containing no duplicate values.
@static
@since 3.4.0
**/
YArray.dedupe = Lang._isNative(Object.create) ? function (array) {
    var hash    = Object.create(null),
        results = [],
        i, item, len;

    for (i = 0, len = array.length; i < len; ++i) {
        item = array[i];

        if (!hash[item]) {
            hash[item] = 1;
            results.push(item);
        }
    }

    return results;
} : function (array) {
    var hash    = {},
        results = [],
        i, item, len;

    for (i = 0, len = array.length; i < len; ++i) {
        item = array[i];

        if (!hasOwn.call(hash, item)) {
            hash[item] = 1;
            results.push(item);
        }
    }

    return results;
};

/**
Executes the supplied function on each item in the array. This method wraps
the native ES5 `Array.forEach()` method if available.

@method each
@param {Array} array Array to iterate.
@param {Function} fn Function to execute on each item in the array. The function
  will receive the following arguments:
    @param {Any} fn.item Current array item.
    @param {Number} fn.index Current array index.
    @param {Array} fn.array Array being iterated.
@param {Object} [thisObj] `this` object to use when calling _fn_.
@return {YUI} The YUI instance.
@static
**/
YArray.each = YArray.forEach = Lang._isNative(Native.forEach) ? function (array, fn, thisObj) {
    Native.forEach.call(array || [], fn, thisObj || Y);
    return Y;
} : function (array, fn, thisObj) {
    for (var i = 0, len = (array && array.length) || 0; i < len; ++i) {
        if (i in array) {
            fn.call(thisObj || Y, array[i], i, array);
        }
    }

    return Y;
};

/**
Alias for `each()`.

@method forEach
@static
**/

/**
Returns an object using the first array as keys and the second as values. If
the second array is not provided, or if it doesn't contain the same number of
values as the first array, then `true` will be used in place of the missing
values.

@example

    Y.Array.hash(['a', 'b', 'c'], ['foo', 'bar']);
    // => {a: 'foo', b: 'bar', c: true}

@method hash
@param {String[]} keys Array of strings to use as keys.
@param {Array} [values] Array to use as values.
@return {Object} Hash using the first array as keys and the second as values.
@static
**/
YArray.hash = function (keys, values) {
    var hash = {},
        vlen = (values && values.length) || 0,
        i, len;

    for (i = 0, len = keys.length; i < len; ++i) {
        if (i in keys) {
            hash[keys[i]] = vlen > i && i in values ? values[i] : true;
        }
    }

    return hash;
};

/**
Returns the index of the first item in the array that's equal (using a strict
equality check) to the specified _value_, or `-1` if the value isn't found.

This method wraps the native ES5 `Array.indexOf()` method if available.

@method indexOf
@param {Array} array Array to search.
@param {Any} value Value to search for.
@param {Number} [from=0] The index at which to begin the search.
@return {Number} Index of the item strictly equal to _value_, or `-1` if not
    found.
@static
**/
YArray.indexOf = Lang._isNative(Native.indexOf) ? function (array, value, from) {
    return Native.indexOf.call(array, value, from);
} : function (array, value, from) {
    // http://es5.github.com/#x15.4.4.14
    var len = array.length;

    from = +from || 0;
    from = (from > 0 || -1) * Math.floor(Math.abs(from));

    if (from < 0) {
        from += len;

        if (from < 0) {
            from = 0;
        }
    }

    for (; from < len; ++from) {
        if (from in array && array[from] === value) {
            return from;
        }
    }

    return -1;
};

/**
Numeric sort convenience function.

The native `Array.prototype.sort()` function converts values to strings and
sorts them in lexicographic order, which is unsuitable for sorting numeric
values. Provide `Array.numericSort` as a custom sort function when you want
to sort values in numeric order.

@example

    [42, 23, 8, 16, 4, 15].sort(Y.Array.numericSort);
    // => [4, 8, 15, 16, 23, 42]

@method numericSort
@param {Number} a First value to compare.
@param {Number} b Second value to compare.
@return {Number} Difference between _a_ and _b_.
@static
**/
YArray.numericSort = function (a, b) {
    return a - b;
};

/**
Executes the supplied function on each item in the array. Returning a truthy
value from the function will stop the processing of remaining items.

@method some
@param {Array} array Array to iterate over.
@param {Function} fn Function to execute on each item. The function will receive
  the following arguments:
    @param {Any} fn.value Current array item.
    @param {Number} fn.index Current array index.
    @param {Array} fn.array Array being iterated over.
@param {Object} [thisObj] `this` object to use when calling _fn_.
@return {Boolean} `true` if the function returns a truthy value on any of the
  items in the array; `false` otherwise.
@static
**/
YArray.some = Lang._isNative(Native.some) ? function (array, fn, thisObj) {
    return Native.some.call(array, fn, thisObj);
} : function (array, fn, thisObj) {
    for (var i = 0, len = array.length; i < len; ++i) {
        if (i in array && fn.call(thisObj, array[i], i, array)) {
            return true;
        }
    }

    return false;
};

/**
Evaluates _obj_ to determine if it's an array, an array-like collection, or
something else. This is useful when working with the function `arguments`
collection and `HTMLElement` collections.

Note: This implementation doesn't consider elements that are also
collections, such as `<form>` and `<select>`, to be array-like.

@method test
@param {Object} obj Object to test.
@return {Number} A number indicating the results of the test:

  * 0: Neither an array nor an array-like collection.
  * 1: Real array.
  * 2: Array-like collection.

@static
**/
YArray.test = function (obj) {
    var result = 0;

    if (Lang.isArray(obj)) {
        result = 1;
    } else if (Lang.isObject(obj)) {
        try {
            // indexed, but no tagName (element) or scrollTo/document (window. From DOM.isWindow test which we can't use here),
            // or functions without apply/call (Safari
            // HTMLElementCollection bug).
            if ('length' in obj && !obj.tagName && !(obj.scrollTo && obj.document) && !obj.apply) {
                result = 2;
            }
        } catch (ex) {}
    }

    return result;
};
/**
 * The YUI module contains the components required for building the YUI
 * seed file.  This includes the script loading mechanism, a simple queue,
 * and the core utilities for the library.
 * @module yui
 * @submodule yui-base
 */

/**
 * A simple FIFO queue.  Items are added to the Queue with add(1..n items) and
 * removed using next().
 *
 * @class Queue
 * @constructor
 * @param {MIXED} item* 0..n items to seed the queue.
 */
function Queue() {
    this._init();
    this.add.apply(this, arguments);
}

Queue.prototype = {
    /**
     * Initialize the queue
     *
     * @method _init
     * @protected
     */
    _init: function() {
        /**
         * The collection of enqueued items
         *
         * @property _q
         * @type Array
         * @protected
         */
        this._q = [];
    },

    /**
     * Get the next item in the queue. FIFO support
     *
     * @method next
     * @return {MIXED} the next item in the queue.
     */
    next: function() {
        return this._q.shift();
    },

    /**
     * Get the last in the queue. LIFO support.
     *
     * @method last
     * @return {MIXED} the last item in the queue.
     */
    last: function() {
        return this._q.pop();
    },

    /**
     * Add 0..n items to the end of the queue.
     *
     * @method add
     * @param {MIXED} item* 0..n items.
     * @return {object} this queue.
     */
    add: function() {
        this._q.push.apply(this._q, arguments);

        return this;
    },

    /**
     * Returns the current number of queued items.
     *
     * @method size
     * @return {Number} The size.
     */
    size: function() {
        return this._q.length;
    }
};

Y.Queue = Queue;

YUI.Env._loaderQueue = YUI.Env._loaderQueue || new Queue();

/**
The YUI module contains the components required for building the YUI seed file.
This includes the script loading mechanism, a simple queue, and the core
utilities for the library.

@module yui
@submodule yui-base
**/

var CACHED_DELIMITER = '__',

    hasOwn   = Object.prototype.hasOwnProperty,
    isObject = Y.Lang.isObject;

/**
Returns a wrapper for a function which caches the return value of that function,
keyed off of the combined string representation of the argument values provided
when the wrapper is called.

Calling this function again with the same arguments will return the cached value
rather than executing the wrapped function.

Note that since the cache is keyed off of the string representation of arguments
passed to the wrapper function, arguments that aren't strings and don't provide
a meaningful `toString()` method may result in unexpected caching behavior. For
example, the objects `{}` and `{foo: 'bar'}` would both be converted to the
string `[object Object]` when used as a cache key.

@method cached
@param {Function} source The function to memoize.
@param {Object} [cache={}] Object in which to store cached values. You may seed
  this object with pre-existing cached values if desired.
@param {any} [refetch] If supplied, this value is compared with the cached value
  using a `==` comparison. If the values are equal, the wrapped function is
  executed again even though a cached value exists.
@return {Function} Wrapped function.
@for YUI
**/
Y.cached = function (source, cache, refetch) {
    /*jshint expr: true*/
    cache || (cache = {});

    return function (arg) {
        var key = arguments.length > 1 ?
                Array.prototype.join.call(arguments, CACHED_DELIMITER) :
                String(arg);

        /*jshint eqeqeq: false*/
        if (!(key in cache) || (refetch && cache[key] == refetch)) {
            cache[key] = source.apply(source, arguments);
        }

        return cache[key];
    };
};

/**
Returns the `location` object from the window/frame in which this YUI instance
operates, or `undefined` when executing in a non-browser environment
(e.g. Node.js).

It is _not_ recommended to hold references to the `window.location` object
outside of the scope of a function in which its properties are being accessed or
its methods are being called. This is because of a nasty bug/issue that exists
in both Safari and MobileSafari browsers:
[WebKit Bug 34679](https://bugs.webkit.org/show_bug.cgi?id=34679).

@method getLocation
@return {location} The `location` object from the window/frame in which this YUI
    instance operates.
@since 3.5.0
**/
Y.getLocation = function () {
    // It is safer to look this up every time because yui-base is attached to a
    // YUI instance before a user's config is applied; i.e. `Y.config.win` does
    // not point the correct window object when this file is loaded.
    var win = Y.config.win;

    // It is not safe to hold a reference to the `location` object outside the
    // scope in which it is being used. The WebKit engine used in Safari and
    // MobileSafari will "disconnect" the `location` object from the `window`
    // when a page is restored from back/forward history cache.
    return win && win.location;
};

/**
Returns a new object containing all of the properties of all the supplied
objects. The properties from later objects will overwrite those in earlier
objects.

Passing in a single object will create a shallow copy of it. For a deep copy,
use `clone()`.

@method merge
@param {Object} objects* One or more objects to merge.
@return {Object} A new merged object.
**/
Y.merge = function () {
    var i      = 0,
        len    = arguments.length,
        result = {},
        key,
        obj;

    for (; i < len; ++i) {
        obj = arguments[i];

        for (key in obj) {
            if (hasOwn.call(obj, key)) {
                result[key] = obj[key];
            }
        }
    }

    return result;
};

/**
Mixes _supplier_'s properties into _receiver_.

Properties on _receiver_ or _receiver_'s prototype will not be overwritten or
shadowed unless the _overwrite_ parameter is `true`, and will not be merged
unless the _merge_ parameter is `true`.

In the default mode (0), only properties the supplier owns are copied (prototype
properties are not copied). The following copying modes are available:

  * `0`: _Default_. Object to object.
  * `1`: Prototype to prototype.
  * `2`: Prototype to prototype and object to object.
  * `3`: Prototype to object.
  * `4`: Object to prototype.

@method mix
@param {Function|Object} receiver The object or function to receive the mixed
  properties.
@param {Function|Object} supplier The object or function supplying the
  properties to be mixed.
@param {Boolean} [overwrite=false] If `true`, properties that already exist
  on the receiver will be overwritten with properties from the supplier.
@param {String[]} [whitelist] An array of property names to copy. If
  specified, only the whitelisted properties will be copied, and all others
  will be ignored.
@param {Number} [mode=0] Mix mode to use. See above for available modes.
@param {Boolean} [merge=false] If `true`, objects and arrays that already
  exist on the receiver will have the corresponding object/array from the
  supplier merged into them, rather than being skipped or overwritten. When
  both _overwrite_ and _merge_ are `true`, _merge_ takes precedence.
@return {Function|Object|YUI} The receiver, or the YUI instance if the
  specified receiver is falsy.
**/
Y.mix = function(receiver, supplier, overwrite, whitelist, mode, merge) {
    var alwaysOverwrite, exists, from, i, key, len, to;

    // If no supplier is given, we return the receiver. If no receiver is given,
    // we return Y. Returning Y doesn't make much sense to me, but it's
    // grandfathered in for backcompat reasons.
    if (!receiver || !supplier) {
        return receiver || Y;
    }

    if (mode) {
        // In mode 2 (prototype to prototype and object to object), we recurse
        // once to do the proto to proto mix. The object to object mix will be
        // handled later on.
        if (mode === 2) {
            Y.mix(receiver.prototype, supplier.prototype, overwrite,
                    whitelist, 0, merge);
        }

        // Depending on which mode is specified, we may be copying from or to
        // the prototypes of the supplier and receiver.
        from = mode === 1 || mode === 3 ? supplier.prototype : supplier;
        to   = mode === 1 || mode === 4 ? receiver.prototype : receiver;

        // If either the supplier or receiver doesn't actually have a
        // prototype property, then we could end up with an undefined `from`
        // or `to`. If that happens, we abort and return the receiver.
        if (!from || !to) {
            return receiver;
        }
    } else {
        from = supplier;
        to   = receiver;
    }

    // If `overwrite` is truthy and `merge` is falsy, then we can skip a
    // property existence check on each iteration and save some time.
    alwaysOverwrite = overwrite && !merge;

    if (whitelist) {
        for (i = 0, len = whitelist.length; i < len; ++i) {
            key = whitelist[i];

            // We call `Object.prototype.hasOwnProperty` instead of calling
            // `hasOwnProperty` on the object itself, since the object's
            // `hasOwnProperty` method may have been overridden or removed.
            // Also, some native objects don't implement a `hasOwnProperty`
            // method.
            if (!hasOwn.call(from, key)) {
                continue;
            }

            // The `key in to` check here is (sadly) intentional for backwards
            // compatibility reasons. It prevents undesired shadowing of
            // prototype members on `to`.
            exists = alwaysOverwrite ? false : key in to;

            if (merge && exists && isObject(to[key], true)
                    && isObject(from[key], true)) {
                // If we're in merge mode, and the key is present on both
                // objects, and the value on both objects is either an object or
                // an array (but not a function), then we recurse to merge the
                // `from` value into the `to` value instead of overwriting it.
                //
                // Note: It's intentional that the whitelist isn't passed to the
                // recursive call here. This is legacy behavior that lots of
                // code still depends on.
                Y.mix(to[key], from[key], overwrite, null, 0, merge);
            } else if (overwrite || !exists) {
                // We're not in merge mode, so we'll only copy the `from` value
                // to the `to` value if we're in overwrite mode or if the
                // current key doesn't exist on the `to` object.
                to[key] = from[key];
            }
        }
    } else {
        for (key in from) {
            // The code duplication here is for runtime performance reasons.
            // Combining whitelist and non-whitelist operations into a single
            // loop or breaking the shared logic out into a function both result
            // in worse performance, and Y.mix is critical enough that the byte
            // tradeoff is worth it.
            if (!hasOwn.call(from, key)) {
                continue;
            }

            // The `key in to` check here is (sadly) intentional for backwards
            // compatibility reasons. It prevents undesired shadowing of
            // prototype members on `to`.
            exists = alwaysOverwrite ? false : key in to;

            if (merge && exists && isObject(to[key], true)
                    && isObject(from[key], true)) {
                Y.mix(to[key], from[key], overwrite, null, 0, merge);
            } else if (overwrite || !exists) {
                to[key] = from[key];
            }
        }

        // If this is an IE browser with the JScript enumeration bug, force
        // enumeration of the buggy properties by making a recursive call with
        // the buggy properties as the whitelist.
        if (Y.Object._hasEnumBug) {
            Y.mix(to, from, overwrite, Y.Object._forceEnum, mode, merge);
        }
    }

    return receiver;
};
/**
 * The YUI module contains the components required for building the YUI
 * seed file.  This includes the script loading mechanism, a simple queue,
 * and the core utilities for the library.
 * @module yui
 * @submodule yui-base
 */

/**
 * Adds utilities to the YUI instance for working with objects.
 *
 * @class Object
 */

var Lang   = Y.Lang,
    hasOwn = Object.prototype.hasOwnProperty,

    UNDEFINED, // <-- Note the comma. We're still declaring vars.

/**
 * Returns a new object that uses _obj_ as its prototype. This method wraps the
 * native ES5 `Object.create()` method if available, but doesn't currently
 * pass through `Object.create()`'s second argument (properties) in order to
 * ensure compatibility with older browsers.
 *
 * @method ()
 * @param {Object} obj Prototype object.
 * @return {Object} New object using _obj_ as its prototype.
 * @static
 */
O = Y.Object = Lang._isNative(Object.create) ? function (obj) {
    // We currently wrap the native Object.create instead of simply aliasing it
    // to ensure consistency with our fallback shim, which currently doesn't
    // support Object.create()'s second argument (properties). Once we have a
    // safe fallback for the properties arg, we can stop wrapping
    // Object.create().
    return Object.create(obj);
} : (function () {
    // Reusable constructor function for the Object.create() shim.
    function F() {}

    // The actual shim.
    return function (obj) {
        F.prototype = obj;
        return new F();
    };
}()),

/**
 * Property names that IE doesn't enumerate in for..in loops, even when they
 * should be enumerable. When `_hasEnumBug` is `true`, it's necessary to
 * manually enumerate these properties.
 *
 * @property _forceEnum
 * @type String[]
 * @protected
 * @static
 */
forceEnum = O._forceEnum = [
    'hasOwnProperty',
    'isPrototypeOf',
    'propertyIsEnumerable',
    'toString',
    'toLocaleString',
    'valueOf'
],

/**
 * `true` if this browser has the JScript enumeration bug that prevents
 * enumeration of the properties named in the `_forceEnum` array, `false`
 * otherwise.
 *
 * See:
 *   - <https://developer.mozilla.org/en/ECMAScript_DontEnum_attribute#JScript_DontEnum_Bug>
 *   - <http://whattheheadsaid.com/2010/10/a-safer-object-keys-compatibility-implementation>
 *
 * @property _hasEnumBug
 * @type Boolean
 * @protected
 * @static
 */
hasEnumBug = O._hasEnumBug = !{valueOf: 0}.propertyIsEnumerable('valueOf'),

/**
 * `true` if this browser incorrectly considers the `prototype` property of
 * functions to be enumerable. Currently known to affect Opera 11.50 and Android 2.3.x.
 *
 * @property _hasProtoEnumBug
 * @type Boolean
 * @protected
 * @static
 */
hasProtoEnumBug = O._hasProtoEnumBug = (function () {}).propertyIsEnumerable('prototype'),

/**
 * Returns `true` if _key_ exists on _obj_, `false` if _key_ doesn't exist or
 * exists only on _obj_'s prototype. This is essentially a safer version of
 * `obj.hasOwnProperty()`.
 *
 * @method owns
 * @param {Object} obj Object to test.
 * @param {String} key Property name to look for.
 * @return {Boolean} `true` if _key_ exists on _obj_, `false` otherwise.
 * @static
 */
owns = O.owns = function (obj, key) {
    return !!obj && hasOwn.call(obj, key);
}; // <-- End of var declarations.

/**
 * Alias for `owns()`.
 *
 * @method hasKey
 * @param {Object} obj Object to test.
 * @param {String} key Property name to look for.
 * @return {Boolean} `true` if _key_ exists on _obj_, `false` otherwise.
 * @static
 */
O.hasKey = owns;

/**
 * Returns an array containing the object's enumerable keys. Does not include
 * prototype keys or non-enumerable keys.
 *
 * Note that keys are returned in enumeration order (that is, in the same order
 * that they would be enumerated by a `for-in` loop), which may not be the same
 * as the order in which they were defined.
 *
 * This method is an alias for the native ES5 `Object.keys()` method if
 * available and non-buggy. The Opera 11.50 and Android 2.3.x versions of
 * `Object.keys()` have an inconsistency as they consider `prototype` to be
 * enumerable, so a non-native shim is used to rectify the difference.
 *
 * @example
 *
 *     Y.Object.keys({a: 'foo', b: 'bar', c: 'baz'});
 *     // => ['a', 'b', 'c']
 *
 * @method keys
 * @param {Object} obj An object.
 * @return {String[]} Array of keys.
 * @static
 */
O.keys = Lang._isNative(Object.keys) && !hasProtoEnumBug ? Object.keys : function (obj) {
    if (!Lang.isObject(obj)) {
        throw new TypeError('Object.keys called on a non-object');
    }

    var keys = [],
        i, key, len;

    if (hasProtoEnumBug && typeof obj === 'function') {
        for (key in obj) {
            if (owns(obj, key) && key !== 'prototype') {
                keys.push(key);
            }
        }
    } else {
        for (key in obj) {
            if (owns(obj, key)) {
                keys.push(key);
            }
        }
    }

    if (hasEnumBug) {
        for (i = 0, len = forceEnum.length; i < len; ++i) {
            key = forceEnum[i];

            if (owns(obj, key)) {
                keys.push(key);
            }
        }
    }

    return keys;
};

/**
 * Returns an array containing the values of the object's enumerable keys.
 *
 * Note that values are returned in enumeration order (that is, in the same
 * order that they would be enumerated by a `for-in` loop), which may not be the
 * same as the order in which they were defined.
 *
 * @example
 *
 *     Y.Object.values({a: 'foo', b: 'bar', c: 'baz'});
 *     // => ['foo', 'bar', 'baz']
 *
 * @method values
 * @param {Object} obj An object.
 * @return {Array} Array of values.
 * @static
 */
O.values = function (obj) {
    var keys   = O.keys(obj),
        i      = 0,
        len    = keys.length,
        values = [];

    for (; i < len; ++i) {
        values.push(obj[keys[i]]);
    }

    return values;
};

/**
 * Returns the number of enumerable keys owned by an object.
 *
 * @method size
 * @param {Object} obj An object.
 * @return {Number} The object's size.
 * @static
 */
O.size = function (obj) {
    try {
        return O.keys(obj).length;
    } catch (ex) {
        return 0; // Legacy behavior for non-objects.
    }
};

/**
 * Returns `true` if the object owns an enumerable property with the specified
 * value.
 *
 * @method hasValue
 * @param {Object} obj An object.
 * @param {any} value The value to search for.
 * @return {Boolean} `true` if _obj_ contains _value_, `false` otherwise.
 * @static
 */
O.hasValue = function (obj, value) {
    return Y.Array.indexOf(O.values(obj), value) > -1;
};

/**
 * Executes a function on each enumerable property in _obj_. The function
 * receives the value, the key, and the object itself as parameters (in that
 * order).
 *
 * By default, only properties owned by _obj_ are enumerated. To include
 * prototype properties, set the _proto_ parameter to `true`.
 *
 * @method each
 * @param {Object} obj Object to enumerate.
 * @param {Function} fn Function to execute on each enumerable property.
 *   @param {mixed} fn.value Value of the current property.
 *   @param {String} fn.key Key of the current property.
 *   @param {Object} fn.obj Object being enumerated.
 * @param {Object} [thisObj] `this` object to use when calling _fn_.
 * @param {Boolean} [proto=false] Include prototype properties.
 * @return {YUI} the YUI instance.
 * @chainable
 * @static
 */
O.each = function (obj, fn, thisObj, proto) {
    var key;

    for (key in obj) {
        if (proto || owns(obj, key)) {
            fn.call(thisObj || Y, obj[key], key, obj);
        }
    }

    return Y;
};

/**
 * Executes a function on each enumerable property in _obj_, but halts if the
 * function returns a truthy value. The function receives the value, the key,
 * and the object itself as paramters (in that order).
 *
 * By default, only properties owned by _obj_ are enumerated. To include
 * prototype properties, set the _proto_ parameter to `true`.
 *
 * @method some
 * @param {Object} obj Object to enumerate.
 * @param {Function} fn Function to execute on each enumerable property.
 *   @param {mixed} fn.value Value of the current property.
 *   @param {String} fn.key Key of the current property.
 *   @param {Object} fn.obj Object being enumerated.
 * @param {Object} [thisObj] `this` object to use when calling _fn_.
 * @param {Boolean} [proto=false] Include prototype properties.
 * @return {Boolean} `true` if any execution of _fn_ returns a truthy value,
 *   `false` otherwise.
 * @static
 */
O.some = function (obj, fn, thisObj, proto) {
    var key;

    for (key in obj) {
        if (proto || owns(obj, key)) {
            if (fn.call(thisObj || Y, obj[key], key, obj)) {
                return true;
            }
        }
    }

    return false;
};

/**
 * Retrieves the sub value at the provided path,
 * from the value object provided.
 *
 * @method getValue
 * @static
 * @param o The object from which to extract the property value.
 * @param path {Array} A path array, specifying the object traversal path
 * from which to obtain the sub value.
 * @return {Any} The value stored in the path, undefined if not found,
 * undefined if the source is not an object.  Returns the source object
 * if an empty path is provided.
 */
O.getValue = function(o, path) {
    if (!Lang.isObject(o)) {
        return UNDEFINED;
    }

    var i,
        p = Y.Array(path),
        l = p.length;

    for (i = 0; o !== UNDEFINED && i < l; i++) {
        o = o[p[i]];
    }

    return o;
};

/**
 * Sets the sub-attribute value at the provided path on the
 * value object.  Returns the modified value object, or
 * undefined if the path is invalid.
 *
 * @method setValue
 * @static
 * @param o             The object on which to set the sub value.
 * @param path {Array}  A path array, specifying the object traversal path
 *                      at which to set the sub value.
 * @param val {Any}     The new value for the sub-attribute.
 * @return {Object}     The modified object, with the new sub value set, or
 *                      undefined, if the path was invalid.
 */
O.setValue = function(o, path, val) {
    var i,
        p = Y.Array(path),
        leafIdx = p.length - 1,
        ref = o;

    if (leafIdx >= 0) {
        for (i = 0; ref !== UNDEFINED && i < leafIdx; i++) {
            ref = ref[p[i]];
        }

        if (ref !== UNDEFINED) {
            ref[p[i]] = val;
        } else {
            return UNDEFINED;
        }
    }

    return o;
};

/**
 * Returns `true` if the object has no enumerable properties of its own.
 *
 * @method isEmpty
 * @param {Object} obj An object.
 * @return {Boolean} `true` if the object is empty.
 * @static
 * @since 3.2.0
 */
O.isEmpty = function (obj) {
    return !O.keys(Object(obj)).length;
};
/**
 * The YUI module contains the components required for building the YUI seed
 * file.  This includes the script loading mechanism, a simple queue, and the
 * core utilities for the library.
 * @module yui
 * @submodule yui-base
 */

/**
 * YUI user agent detection.
 * Do not fork for a browser if it can be avoided.  Use feature detection when
 * you can.  Use the user agent as a last resort.  For all fields listed
 * as @type float, UA stores a version number for the browser engine,
 * 0 otherwise.  This value may or may not map to the version number of
 * the browser using the engine.  The value is presented as a float so
 * that it can easily be used for boolean evaluation as well as for
 * looking for a particular range of versions.  Because of this,
 * some of the granularity of the version info may be lost.  The fields that
 * are @type string default to null.  The API docs list the values that
 * these fields can have.
 * @class UA
 * @static
 */

/**
* Static method on `YUI.Env` for parsing a UA string.  Called at instantiation
* to populate `Y.UA`.
*
* @static
* @method parseUA
* @param {String} [subUA=navigator.userAgent] UA string to parse
* @return {Object} The Y.UA object
*/
YUI.Env.parseUA = function(subUA) {

    var numberify = function(s) {
            var c = 0;
            return parseFloat(s.replace(/\./g, function() {
                return (c++ === 1) ? '' : '.';
            }));
        },

        win = Y.config.win,

        nav = win && win.navigator,

        o = {

        /**
         * Internet Explorer version number or 0.  Example: 6
         * @property ie
         * @type float
         * @static
         */
        ie: 0,

        /**
         * Opera version number or 0.  Example: 9.2
         * @property opera
         * @type float
         * @static
         */
        opera: 0,

        /**
         * Gecko engine revision number.  Will evaluate to 1 if Gecko
         * is detected but the revision could not be found. Other browsers
         * will be 0.  Example: 1.8
         * <pre>
         * Firefox 1.0.0.4: 1.7.8   <-- Reports 1.7
         * Firefox 1.5.0.9: 1.8.0.9 <-- 1.8
         * Firefox 2.0.0.3: 1.8.1.3 <-- 1.81
         * Firefox 3.0   <-- 1.9
         * Firefox 3.5   <-- 1.91
         * </pre>
         * @property gecko
         * @type float
         * @static
         */
        gecko: 0,

        /**
         * AppleWebKit version.  KHTML browsers that are not WebKit browsers
         * will evaluate to 1, other browsers 0.  Example: 418.9
         * <pre>
         * Safari 1.3.2 (312.6): 312.8.1 <-- Reports 312.8 -- currently the
         *                                   latest available for Mac OSX 10.3.
         * Safari 2.0.2:         416     <-- hasOwnProperty introduced
         * Safari 2.0.4:         418     <-- preventDefault fixed
         * Safari 2.0.4 (419.3): 418.9.1 <-- One version of Safari may run
         *                                   different versions of webkit
         * Safari 2.0.4 (419.3): 419     <-- Tiger installations that have been
         *                                   updated, but not updated
         *                                   to the latest patch.
         * Webkit 212 nightly:   522+    <-- Safari 3.0 precursor (with native
         * SVG and many major issues fixed).
         * Safari 3.0.4 (523.12) 523.12  <-- First Tiger release - automatic
         * update from 2.x via the 10.4.11 OS patch.
         * Webkit nightly 1/2008:525+    <-- Supports DOMContentLoaded event.
         *                                   yahoo.com user agent hack removed.
         * </pre>
         * http://en.wikipedia.org/wiki/Safari_version_history
         * @property webkit
         * @type float
         * @static
         */
        webkit: 0,

        /**
         * Safari will be detected as webkit, but this property will also
         * be populated with the Safari version number
         * @property safari
         * @type float
         * @static
         */
        safari: 0,

        /**
         * Chrome will be detected as webkit, but this property will also
         * be populated with the Chrome version number
         * @property chrome
         * @type float
         * @static
         */
        chrome: 0,

        /**
         * The mobile property will be set to a string containing any relevant
         * user agent information when a modern mobile browser is detected.
         * Currently limited to Safari on the iPhone/iPod Touch, Nokia N-series
         * devices with the WebKit-based browser, and Opera Mini.
         * @property mobile
         * @type string
         * @default null
         * @static
         */
        mobile: null,

        /**
         * Adobe AIR version number or 0.  Only populated if webkit is detected.
         * Example: 1.0
         * @property air
         * @type float
         */
        air: 0,
        /**
         * PhantomJS version number or 0.  Only populated if webkit is detected.
         * Example: 1.0
         * @property phantomjs
         * @type float
         */
        phantomjs: 0,
        /**
         * Detects Apple iPad's OS version
         * @property ipad
         * @type float
         * @static
         */
        ipad: 0,
        /**
         * Detects Apple iPhone's OS version
         * @property iphone
         * @type float
         * @static
         */
        iphone: 0,
        /**
         * Detects Apples iPod's OS version
         * @property ipod
         * @type float
         * @static
         */
        ipod: 0,
        /**
         * General truthy check for iPad, iPhone or iPod
         * @property ios
         * @type Boolean
         * @default null
         * @static
         */
        ios: null,
        /**
         * Detects Googles Android OS version
         * @property android
         * @type float
         * @static
         */
        android: 0,
        /**
         * Detects Kindle Silk
         * @property silk
         * @type float
         * @static
         */
        silk: 0,
        /**
         * Detects Ubuntu version
         * @property ubuntu
         * @type float
         * @static
         */
        ubuntu: 0,
        /**
         * Detects Kindle Silk Acceleration
         * @property accel
         * @type Boolean
         * @static
         */
        accel: false,
        /**
         * Detects Palms WebOS version
         * @property webos
         * @type float
         * @static
         */
        webos: 0,

        /**
         * Google Caja version number or 0.
         * @property caja
         * @type float
         */
        caja: nav && nav.cajaVersion,

        /**
         * Set to true if the page appears to be in SSL
         * @property secure
         * @type boolean
         * @static
         */
        secure: false,

        /**
         * The operating system.
         *
         * Possible values are `windows`, `macintosh`, `android`, `symbos`, `linux`, `rhino` and `ios`.
         *
         * @property os
         * @type string
         * @default null
         * @static
         */
        os: null,

        /**
         * The Nodejs Version
         * @property nodejs
         * @type float
         * @default 0
         * @static
         */
        nodejs: 0,
        /**
        * Window8/IE10 Application host environment
        * @property winjs
        * @type Boolean
        * @static
        */
        winjs: !!((typeof Windows !== "undefined") && Windows.System),
        /**
        * Are touch/msPointer events available on this device
        * @property touchEnabled
        * @type Boolean
        * @static
        */
        touchEnabled: false
    },

    ua = subUA || nav && nav.userAgent,

    loc = win && win.location,

    href = loc && loc.href,

    m;

    /**
    * The User Agent string that was parsed
    * @property userAgent
    * @type String
    * @static
    */
    o.userAgent = ua;


    o.secure = href && (href.toLowerCase().indexOf('https') === 0);

    if (ua) {

        if ((/windows|win32/i).test(ua)) {
            o.os = 'windows';
        } else if ((/macintosh|mac_powerpc/i).test(ua)) {
            o.os = 'macintosh';
        } else if ((/android/i).test(ua)) {
            o.os = 'android';
        } else if ((/symbos/i).test(ua)) {
            o.os = 'symbos';
        } else if ((/linux/i).test(ua)) {
            o.os = 'linux';
        } else if ((/rhino/i).test(ua)) {
            o.os = 'rhino';
        }

        // Modern KHTML browsers should qualify as Safari X-Grade
        if ((/KHTML/).test(ua)) {
            o.webkit = 1;
        }
        if ((/IEMobile|XBLWP7/).test(ua)) {
            o.mobile = 'windows';
        }
        if ((/Fennec/).test(ua)) {
            o.mobile = 'gecko';
        }
        // Modern WebKit browsers are at least X-Grade
        m = ua.match(/AppleWebKit\/([^\s]*)/);
        if (m && m[1]) {
            o.webkit = numberify(m[1]);
            o.safari = o.webkit;

            if (/PhantomJS/.test(ua)) {
                m = ua.match(/PhantomJS\/([^\s]*)/);
                if (m && m[1]) {
                    o.phantomjs = numberify(m[1]);
                }
            }

            // Mobile browser check
            if (/ Mobile\//.test(ua) || (/iPad|iPod|iPhone/).test(ua)) {
                o.mobile = 'Apple'; // iPhone or iPod Touch

                m = ua.match(/OS ([^\s]*)/);
                if (m && m[1]) {
                    m = numberify(m[1].replace('_', '.'));
                }
                o.ios = m;
                o.os = 'ios';
                o.ipad = o.ipod = o.iphone = 0;

                m = ua.match(/iPad|iPod|iPhone/);
                if (m && m[0]) {
                    o[m[0].toLowerCase()] = o.ios;
                }
            } else {
                m = ua.match(/NokiaN[^\/]*|webOS\/\d\.\d/);
                if (m) {
                    // Nokia N-series, webOS, ex: NokiaN95
                    o.mobile = m[0];
                }
                if (/webOS/.test(ua)) {
                    o.mobile = 'WebOS';
                    m = ua.match(/webOS\/([^\s]*);/);
                    if (m && m[1]) {
                        o.webos = numberify(m[1]);
                    }
                }
                if (/ Android/.test(ua)) {
                    o.mobile = 'Android';
                    m = ua.match(/Android ([^\s]*);/);
                    if (m && m[1]) {
                        o.android = numberify(m[1]);
                    }

                }
                if (/Silk/.test(ua)) {
                    m = ua.match(/Silk\/([^\s]*)/);
                    if (m && m[1]) {
                        o.silk = numberify(m[1]);
                    }
                    if (!o.android) {
                        o.android = 2.34; //Hack for desktop mode in Kindle
                        o.os = 'Android';
                    }
                    if (/Accelerated=true/.test(ua)) {
                        o.accel = true;
                    }
                }
            }

            m = ua.match(/OPR\/(\d+\.\d+)/);

            if (m && m[1]) {
                // Opera 15+ with Blink (pretends to be both Chrome and Safari)
                o.opera = numberify(m[1]);
            } else {
                m = ua.match(/(Chrome|CrMo|CriOS)\/([^\s]*)/);

                if (m && m[1] && m[2]) {
                    o.chrome = numberify(m[2]); // Chrome
                    o.safari = 0; //Reset safari back to 0
                    if (m[1] === 'CrMo') {
                        o.mobile = 'chrome';
                    }
                } else {
                    m = ua.match(/AdobeAIR\/([^\s]*)/);
                    if (m) {
                        o.air = m[0]; // Adobe AIR 1.0 or better
                    }
                }
            }
        }

        m = ua.match(/Ubuntu\ (\d+\.\d+)/);
        if (m && m[1]) {

            o.os = 'linux';
            o.ubuntu = numberify(m[1]);

            m = ua.match(/\ WebKit\/([^\s]*)/);
            if (m && m[1]) {
                o.webkit = numberify(m[1]);
            }
            m = ua.match(/\ Chromium\/([^\s]*)/);
            if (m && m[1]) {
                o.chrome = numberify(m[1]);
            }
            if (/ Mobile$/.test(ua)) {
                o.mobile = 'Ubuntu';
            }
        }

        if (!o.webkit) { // not webkit
// @todo check Opera/8.01 (J2ME/MIDP; Opera Mini/2.0.4509/1316; fi; U; ssr)
            if (/Opera/.test(ua)) {
                m = ua.match(/Opera[\s\/]([^\s]*)/);
                if (m && m[1]) {
                    o.opera = numberify(m[1]);
                }
                m = ua.match(/Version\/([^\s]*)/);
                if (m && m[1]) {
                    o.opera = numberify(m[1]); // opera 10+
                }

                if (/Opera Mobi/.test(ua)) {
                    o.mobile = 'opera';
                    m = ua.replace('Opera Mobi', '').match(/Opera ([^\s]*)/);
                    if (m && m[1]) {
                        o.opera = numberify(m[1]);
                    }
                }
                m = ua.match(/Opera Mini[^;]*/);

                if (m) {
                    o.mobile = m[0]; // ex: Opera Mini/2.0.4509/1316
                }
            } else { // not opera or webkit
                m = ua.match(/MSIE ([^;]*)|Trident.*; rv:([0-9.]+)/);

                if (m && (m[1] || m[2])) {
                    o.ie = numberify(m[1] || m[2]);
                } else { // not opera, webkit, or ie
                    m = ua.match(/Gecko\/([^\s]*)/);

                    if (m) {
                        o.gecko = 1; // Gecko detected, look for revision
                        m = ua.match(/rv:([^\s\)]*)/);
                        if (m && m[1]) {
                            o.gecko = numberify(m[1]);
                            if (/Mobile|Tablet/.test(ua)) {
                                o.mobile = "ffos";
                            }
                        }
                    }
                }
            }
        }
    }

    //Check for known properties to tell if touch events are enabled on this device or if
    //the number of MSPointer touchpoints on this device is greater than 0.
    if (win && nav && !(o.chrome && o.chrome < 6)) {
        o.touchEnabled = (("ontouchstart" in win) || (("msMaxTouchPoints" in nav) && (nav.msMaxTouchPoints > 0)));
    }

    //It was a parsed UA, do not assign the global value.
    if (!subUA) {

        if (typeof process === 'object') {

            if (process.versions && process.versions.node) {
                //NodeJS
                o.os = process.platform;
                o.nodejs = numberify(process.versions.node);
            }
        }

        YUI.Env.UA = o;

    }

    return o;
};


Y.UA = YUI.Env.UA || YUI.Env.parseUA();

/**
Performs a simple comparison between two version numbers, accounting for
standard versioning logic such as the fact that "535.8" is a lower version than
"535.24", even though a simple numerical comparison would indicate that it's
greater. Also accounts for cases such as "1.1" vs. "1.1.0", which are
considered equivalent.

Returns -1 if version _a_ is lower than version _b_, 0 if they're equivalent,
1 if _a_ is higher than _b_.

Versions may be numbers or strings containing numbers and dots. For example,
both `535` and `"535.8.10"` are acceptable. A version string containing
non-numeric characters, like `"535.8.beta"`, may produce unexpected results.

@method compareVersions
@param {Number|String} a First version number to compare.
@param {Number|String} b Second version number to compare.
@return -1 if _a_ is lower than _b_, 0 if they're equivalent, 1 if _a_ is
    higher than _b_.
**/
Y.UA.compareVersions = function (a, b) {
    var aPart, aParts, bPart, bParts, i, len;

    if (a === b) {
        return 0;
    }

    aParts = (a + '').split('.');
    bParts = (b + '').split('.');

    for (i = 0, len = Math.max(aParts.length, bParts.length); i < len; ++i) {
        aPart = parseInt(aParts[i], 10);
        bPart = parseInt(bParts[i], 10);

        /*jshint expr: true*/
        isNaN(aPart) && (aPart = 0);
        isNaN(bPart) && (bPart = 0);

        if (aPart < bPart) {
            return -1;
        }

        if (aPart > bPart) {
            return 1;
        }
    }

    return 0;
};
YUI.Env.aliases = {
    "anim": ["anim-base","anim-color","anim-curve","anim-easing","anim-node-plugin","anim-scroll","anim-xy"],
    "anim-shape-transform": ["anim-shape"],
    "app": ["app-base","app-content","app-transitions","lazy-model-list","model","model-list","model-sync-rest","model-sync-local","router","view","view-node-map"],
    "attribute": ["attribute-base","attribute-complex"],
    "attribute-events": ["attribute-observable"],
    "autocomplete": ["autocomplete-base","autocomplete-sources","autocomplete-list","autocomplete-plugin"],
    "axes": ["axis-numeric","axis-category","axis-time","axis-stacked"],
    "axes-base": ["axis-numeric-base","axis-category-base","axis-time-base","axis-stacked-base"],
    "base": ["base-base","base-pluginhost","base-build"],
    "cache": ["cache-base","cache-offline","cache-plugin"],
    "charts": ["charts-base"],
    "collection": ["array-extras","arraylist","arraylist-add","arraylist-filter","array-invoke"],
    "color": ["color-base","color-hsl","color-harmony"],
    "controller": ["router"],
    "dataschema": ["dataschema-base","dataschema-json","dataschema-xml","dataschema-array","dataschema-text"],
    "datasource": ["datasource-local","datasource-io","datasource-get","datasource-function","datasource-cache","datasource-jsonschema","datasource-xmlschema","datasource-arrayschema","datasource-textschema","datasource-polling"],
    "datatable": ["datatable-core","datatable-table","datatable-head","datatable-body","datatable-base","datatable-column-widths","datatable-message","datatable-mutable","datatable-sort","datatable-datasource"],
    "datatype": ["datatype-date","datatype-number","datatype-xml"],
    "datatype-date": ["datatype-date-parse","datatype-date-format","datatype-date-math"],
    "datatype-number": ["datatype-number-parse","datatype-number-format"],
    "datatype-xml": ["datatype-xml-parse","datatype-xml-format"],
    "dd": ["dd-ddm-base","dd-ddm","dd-ddm-drop","dd-drag","dd-proxy","dd-constrain","dd-drop","dd-scroll","dd-delegate"],
    "dom": ["dom-base","dom-screen","dom-style","selector-native","selector"],
    "editor": ["frame","editor-selection","exec-command","editor-base","editor-para","editor-br","editor-bidi","editor-tab","createlink-base"],
    "event": ["event-base","event-delegate","event-synthetic","event-mousewheel","event-mouseenter","event-key","event-focus","event-resize","event-hover","event-outside","event-touch","event-move","event-flick","event-valuechange","event-tap"],
    "event-custom": ["event-custom-base","event-custom-complex"],
    "event-gestures": ["event-flick","event-move"],
    "handlebars": ["handlebars-compiler"],
    "highlight": ["highlight-base","highlight-accentfold"],
    "history": ["history-base","history-hash","history-html5"],
    "io": ["io-base","io-xdr","io-form","io-upload-iframe","io-queue"],
    "json": ["json-parse","json-stringify"],
    "loader": ["loader-base","loader-rollup","loader-yui3"],
    "loader-pathogen-encoder": ["loader-base","loader-rollup","loader-yui3","loader-pathogen-combohandler"],
    "node": ["node-base","node-event-delegate","node-pluginhost","node-screen","node-style"],
    "pluginhost": ["pluginhost-base","pluginhost-config"],
    "querystring": ["querystring-parse","querystring-stringify"],
    "recordset": ["recordset-base","recordset-sort","recordset-filter","recordset-indexer"],
    "resize": ["resize-base","resize-proxy","resize-constrain"],
    "slider": ["slider-base","slider-value-range","clickable-rail","range-slider"],
    "template": ["template-base","template-micro"],
    "text": ["text-accentfold","text-wordbreak"],
    "widget": ["widget-base","widget-htmlparser","widget-skin","widget-uievents"]
};


}, '3.18.1', {
    "use": [
        "yui-base",
        "get",
        "features",
        "intl-base",
        "yui-log",
        "yui-later",
        "loader-base",
        "loader-rollup",
        "loader-yui3"
    ]
});
YUI.add('get', function (Y, NAME) {

/*jslint boss:true, expr:true, laxbreak: true */

/**
Provides dynamic loading of remote JavaScript and CSS resources.

@module get
@class Get
@static
**/

var Lang = Y.Lang,

    CUSTOM_ATTRS, // defined lazily in Y.Get.Transaction._createNode()

    Get, Transaction;

Y.Get = Get = {
    // -- Public Properties ----------------------------------------------------

    /**
    Default options for CSS requests. Options specified here will override
    global defaults for CSS requests.

    See the `options` property for all available options.

    @property cssOptions
    @type Object
    @static
    @since 3.5.0
    **/
    cssOptions: {
        attributes: {
            rel: 'stylesheet'
        },

        doc         : Y.config.linkDoc || Y.config.doc,
        pollInterval: 50
    },

    /**
    Default options for JS requests. Options specified here will override global
    defaults for JS requests.

    See the `options` property for all available options.

    @property jsOptions
    @type Object
    @static
    @since 3.5.0
    **/
    jsOptions: {
        autopurge: true,
        doc      : Y.config.scriptDoc || Y.config.doc
    },

    /**
    Default options to use for all requests.

    Note that while all available options are documented here for ease of
    discovery, some options (like callback functions) only make sense at the
    transaction level.

    Callback functions specified via the options object or the `options`
    parameter of the `css()`, `js()`, or `load()` methods will receive the
    transaction object as a parameter. See `Y.Get.Transaction` for details on
    the properties and methods available on transactions.

    @static
    @since 3.5.0
    @property {Object} options

    @property {Boolean} [options.async=false] Whether or not to load scripts
        asynchronously, meaning they're requested in parallel and execution
        order is not guaranteed. Has no effect on CSS, since CSS is always
        loaded asynchronously.

    @property {Object} [options.attributes] HTML attribute name/value pairs that
        should be added to inserted nodes. By default, the `charset` attribute
        will be set to "utf-8" and nodes will be given an auto-generated `id`
        attribute, but you can override these with your own values if desired.

    @property {Boolean} [options.autopurge] Whether or not to automatically
        purge inserted nodes after the purge threshold is reached. This is
        `true` by default for JavaScript, but `false` for CSS since purging a
        CSS node will also remove any styling applied by the referenced file.

    @property {Object} [options.context] `this` object to use when calling
        callback functions. Defaults to the transaction object.

    @property {Mixed} [options.data] Arbitrary data object to pass to "on*"
        callbacks.

    @property {Document} [options.doc] Document into which nodes should be
        inserted. By default, the current document is used.

    @property {HTMLElement|String} [options.insertBefore] HTML element or id
        string of an element before which all generated nodes should be
        inserted. If not specified, Get will automatically determine the best
        place to insert nodes for maximum compatibility.

    @property {Function} [options.onEnd] Callback to execute after a transaction
        is complete, regardless of whether it succeeded or failed.

    @property {Function} [options.onFailure] Callback to execute after a
        transaction fails, times out, or is aborted.

    @property {Function} [options.onProgress] Callback to execute after each
        individual request in a transaction either succeeds or fails.

    @property {Function} [options.onSuccess] Callback to execute after a
        transaction completes successfully with no errors. Note that in browsers
        that don't support the `error` event on CSS `<link>` nodes, a failed CSS
        request may still be reported as a success because in these browsers
        it can be difficult or impossible to distinguish between success and
        failure for CSS resources.

    @property {Function} [options.onTimeout] Callback to execute after a
        transaction times out.

    @property {Number} [options.pollInterval=50] Polling interval (in
        milliseconds) for detecting CSS load completion in browsers that don't
        support the `load` event on `<link>` nodes. This isn't used for
        JavaScript.

    @property {Number} [options.purgethreshold=20] Number of nodes to insert
        before triggering an automatic purge when `autopurge` is `true`.

    @property {Number} [options.timeout] Number of milliseconds to wait before
        aborting a transaction. When a timeout occurs, the `onTimeout` callback
        is called, followed by `onFailure` and finally `onEnd`. By default,
        there is no timeout.

    @property {String} [options.type] Resource type ("css" or "js"). This option
        is set automatically by the `css()` and `js()` functions and will be
        ignored there, but may be useful when using the `load()` function. If
        not specified, the type will be inferred from the URL, defaulting to
        "js" if the URL doesn't contain a recognizable file extension.
    **/
    options: {
        attributes: {
            charset: 'utf-8'
        },

        purgethreshold: 20
    },

    // -- Protected Properties -------------------------------------------------

    /**
    Regex that matches a CSS URL. Used to guess the file type when it's not
    specified.

    @property REGEX_CSS
    @type RegExp
    @final
    @protected
    @static
    @since 3.5.0
    **/
    REGEX_CSS: /\.css(?:[?;].*)?$/i,

    /**
    Regex that matches a JS URL. Used to guess the file type when it's not
    specified.

    @property REGEX_JS
    @type RegExp
    @final
    @protected
    @static
    @since 3.5.0
    **/
    REGEX_JS : /\.js(?:[?;].*)?$/i,

    /**
    Contains information about the current environment, such as what script and
    link injection features it supports.

    This object is created and populated the first time the `_getEnv()` method
    is called.

    @property _env
    @type Object
    @protected
    @static
    @since 3.5.0
    **/

    /**
    Mapping of document _yuid strings to <head> or <base> node references so we
    don't have to look the node up each time we want to insert a request node.

    @property _insertCache
    @type Object
    @protected
    @static
    @since 3.5.0
    **/
    _insertCache: {},

    /**
    Information about the currently pending transaction, if any.

    This is actually an object with two properties: `callback`, containing the
    optional callback passed to `css()`, `load()`, or `js()`; and `transaction`,
    containing the actual transaction instance.

    @property _pending
    @type Object
    @protected
    @static
    @since 3.5.0
    **/
    _pending: null,

    /**
    HTML nodes eligible to be purged next time autopurge is triggered.

    @property _purgeNodes
    @type HTMLElement[]
    @protected
    @static
    @since 3.5.0
    **/
    _purgeNodes: [],

    /**
    Queued transactions and associated callbacks.

    @property _queue
    @type Object[]
    @protected
    @static
    @since 3.5.0
    **/
    _queue: [],

    // -- Public Methods -------------------------------------------------------

    /**
    Aborts the specified transaction.

    This will cause the transaction's `onFailure` callback to be called and
    will prevent any new script and link nodes from being added to the document,
    but any resources that have already been requested will continue loading
    (there's no safe way to prevent this, unfortunately).

    *Note:* This method is deprecated as of 3.5.0, and will be removed in a
    future version of YUI. Use the transaction-level `abort()` method instead.

    @method abort
    @param {Get.Transaction} transaction Transaction to abort.
    @deprecated Use the `abort()` method on the transaction instead.
    @static
    **/
    abort: function (transaction) {
        var i, id, item, len, pending;

        Y.log('`Y.Get.abort()` is deprecated as of 3.5.0. Use the `abort()` method on the transaction instead.', 'warn', 'get');

        if (!transaction.abort) {
            id          = transaction;
            pending     = this._pending;
            transaction = null;

            if (pending && pending.transaction.id === id) {
                transaction   = pending.transaction;
                this._pending = null;
            } else {
                for (i = 0, len = this._queue.length; i < len; ++i) {
                    item = this._queue[i].transaction;

                    if (item.id === id) {
                        transaction = item;
                        this._queue.splice(i, 1);
                        break;
                    }
                }
            }
        }

        transaction && transaction.abort();
    },

    /**
    Loads one or more CSS files.

    The _urls_ parameter may be provided as a URL string, a request object,
    or an array of URL strings and/or request objects.

    A request object is just an object that contains a `url` property and zero
    or more options that should apply specifically to that request.
    Request-specific options take priority over transaction-level options and
    default options.

    URLs may be relative or absolute, and do not have to have the same origin
    as the current page.

    The `options` parameter may be omitted completely and a callback passed in
    its place, if desired.

    @example

        // Load a single CSS file and log a message on completion.
        Y.Get.css('foo.css', function (err) {
            if (err) {
                Y.log('foo.css failed to load!');
            } else {
                Y.log('foo.css was loaded successfully');
            }
        });

        // Load multiple CSS files and log a message when all have finished
        // loading.
        var urls = ['foo.css', 'http://example.com/bar.css', 'baz/quux.css'];

        Y.Get.css(urls, function (err) {
            if (err) {
                Y.log('one or more files failed to load!');
            } else {
                Y.log('all files loaded successfully');
            }
        });

        // Specify transaction-level options, which will apply to all requests
        // within the transaction.
        Y.Get.css(urls, {
            attributes: {'class': 'my-css'},
            timeout   : 5000
        });

        // Specify per-request options, which override transaction-level and
        // default options.
        Y.Get.css([
            {url: 'foo.css', attributes: {id: 'foo'}},
            {url: 'bar.css', attributes: {id: 'bar', charset: 'iso-8859-1'}}
        ]);

    @method css
    @param {String|Object|Array} urls URL string, request object, or array
        of URLs and/or request objects to load.
    @param {Object} [options] Options for this transaction. See the
        `Y.Get.options` property for a complete list of available options.
    @param {Function} [callback] Callback function to be called on completion.
        This is a general callback and will be called before any more granular
        callbacks (`onSuccess`, `onFailure`, etc.) specified in the `options`
        object.

        @param {Array|null} callback.err Array of errors that occurred during
            the transaction, or `null` on success.
        @param {Get.Transaction} callback.transaction Transaction object.

    @return {Get.Transaction} Transaction object.
    @static
    **/
    css: function (urls, options, callback) {
        return this._load('css', urls, options, callback);
    },

    /**
    Loads one or more JavaScript resources.

    The _urls_ parameter may be provided as a URL string, a request object,
    or an array of URL strings and/or request objects.

    A request object is just an object that contains a `url` property and zero
    or more options that should apply specifically to that request.
    Request-specific options take priority over transaction-level options and
    default options.

    URLs may be relative or absolute, and do not have to have the same origin
    as the current page.

    The `options` parameter may be omitted completely and a callback passed in
    its place, if desired.

    Scripts will be executed in the order they're specified unless the `async`
    option is `true`, in which case they'll be loaded in parallel and executed
    in whatever order they finish loading.

    @example

        // Load a single JS file and log a message on completion.
        Y.Get.js('foo.js', function (err) {
            if (err) {
                Y.log('foo.js failed to load!');
            } else {
                Y.log('foo.js was loaded successfully');
            }
        });

        // Load multiple JS files, execute them in order, and log a message when
        // all have finished loading.
        var urls = ['foo.js', 'http://example.com/bar.js', 'baz/quux.js'];

        Y.Get.js(urls, function (err) {
            if (err) {
                Y.log('one or more files failed to load!');
            } else {
                Y.log('all files loaded successfully');
            }
        });

        // Specify transaction-level options, which will apply to all requests
        // within the transaction.
        Y.Get.js(urls, {
            attributes: {'class': 'my-js'},
            timeout   : 5000
        });

        // Specify per-request options, which override transaction-level and
        // default options.
        Y.Get.js([
            {url: 'foo.js', attributes: {id: 'foo'}},
            {url: 'bar.js', attributes: {id: 'bar', charset: 'iso-8859-1'}}
        ]);

    @method js
    @param {String|Object|Array} urls URL string, request object, or array
        of URLs and/or request objects to load.
    @param {Object} [options] Options for this transaction. See the
        `Y.Get.options` property for a complete list of available options.
    @param {Function} [callback] Callback function to be called on completion.
        This is a general callback and will be called before any more granular
        callbacks (`onSuccess`, `onFailure`, etc.) specified in the `options`
        object.

        @param {Array|null} callback.err Array of errors that occurred during
            the transaction, or `null` on success.
        @param {Get.Transaction} callback.transaction Transaction object.

    @return {Get.Transaction} Transaction object.
    @since 3.5.0
    @static
    **/
    js: function (urls, options, callback) {
        return this._load('js', urls, options, callback);
    },

    /**
    Loads one or more CSS and/or JavaScript resources in the same transaction.

    Use this method when you want to load both CSS and JavaScript in a single
    transaction and be notified when all requested URLs have finished loading,
    regardless of type.

    Behavior and options are the same as for the `css()` and `js()` methods. If
    a resource type isn't specified in per-request options or transaction-level
    options, Get will guess the file type based on the URL's extension (`.css`
    or `.js`, with or without a following query string). If the file type can't
    be guessed from the URL, a warning will be logged and Get will assume the
    URL is a JavaScript resource.

    @example

        // Load both CSS and JS files in a single transaction, and log a message
        // when all files have finished loading.
        Y.Get.load(['foo.css', 'bar.js', 'baz.css'], function (err) {
            if (err) {
                Y.log('one or more files failed to load!');
            } else {
                Y.log('all files loaded successfully');
            }
        });

    @method load
    @param {String|Object|Array} urls URL string, request object, or array
        of URLs and/or request objects to load.
    @param {Object} [options] Options for this transaction. See the
        `Y.Get.options` property for a complete list of available options.
    @param {Function} [callback] Callback function to be called on completion.
        This is a general callback and will be called before any more granular
        callbacks (`onSuccess`, `onFailure`, etc.) specified in the `options`
        object.

        @param {Array|null} err Array of errors that occurred during the
            transaction, or `null` on success.
        @param {Get.Transaction} Transaction object.

    @return {Get.Transaction} Transaction object.
    @since 3.5.0
    @static
    **/
    load: function (urls, options, callback) {
        return this._load(null, urls, options, callback);
    },

    // -- Protected Methods ----------------------------------------------------

    /**
    Triggers an automatic purge if the purge threshold has been reached.

    @method _autoPurge
    @param {Number} threshold Purge threshold to use, in milliseconds.
    @protected
    @since 3.5.0
    @static
    **/
    _autoPurge: function (threshold) {
        if (threshold && this._purgeNodes.length >= threshold) {
            Y.log('autopurge triggered after ' + this._purgeNodes.length + ' nodes', 'info', 'get');
            this._purge(this._purgeNodes);
        }
    },

    /**
    Populates the `_env` property with information about the current
    environment.

    @method _getEnv
    @return {Object} Environment information.
    @protected
    @since 3.5.0
    @static
    **/
    _getEnv: function () {
        var doc = Y.config.doc,
            ua  = Y.UA;

        // Note: some of these checks require browser sniffs since it's not
        // feasible to load test files on every pageview just to perform a
        // feature test. I'm sorry if this makes you sad.
        return (this._env = {

            // True if this is a browser that supports disabling async mode on
            // dynamically created script nodes. See
            // https://developer.mozilla.org/En/HTML/Element/Script#Attributes

            // IE10 doesn't return true for the MDN feature test, so setting it explicitly,
            // because it is async by default, and allows you to disable async by setting it to false
            async: (doc && doc.createElement('script').async === true) || (ua.ie >= 10),

            // True if this browser fires an event when a dynamically injected
            // link node fails to load. This is currently true for Firefox 9+
            // and WebKit 535.24+
            cssFail: ua.gecko >= 9 || ua.compareVersions(ua.webkit, 535.24) >= 0,

            // True if this browser fires an event when a dynamically injected
            // link node finishes loading. This is currently true for IE, Opera,
            // Firefox 9+, and WebKit 535.24+. Note that IE versions <9 fire the
            // DOM 0 "onload" event, but not "load". All versions of IE fire
            // "onload".
            // davglass: Seems that Chrome on Android needs this to be false.
            cssLoad: (
                    (!ua.gecko && !ua.webkit) || ua.gecko >= 9 ||
                    ua.compareVersions(ua.webkit, 535.24) >= 0
                ) && !(ua.chrome && ua.chrome <= 18),

            // True if this browser preserves script execution order while
            // loading scripts in parallel as long as the script node's `async`
            // attribute is set to false to explicitly disable async execution.
            preservesScriptOrder: !!(ua.gecko || ua.opera || (ua.ie && ua.ie >= 10))
        });
    },

    _getTransaction: function (urls, options) {
        var requests = [],
            i, len, req, url;

        if (!Lang.isArray(urls)) {
            urls = [urls];
        }

        options = Y.merge(this.options, options);

        // Clone the attributes object so we don't end up modifying it by ref.
        options.attributes = Y.merge(this.options.attributes,
                options.attributes);

        for (i = 0, len = urls.length; i < len; ++i) {
            url = urls[i];
            req = {attributes: {}};

            // If `url` is a string, we create a URL object for it, then mix in
            // global options and request-specific options. If it's an object
            // with a "url" property, we assume it's a request object containing
            // URL-specific options.
            if (typeof url === 'string') {
                req.url = url;
            } else if (url.url) {
                // URL-specific options override both global defaults and
                // request-specific options.
                Y.mix(req, url, false, null, 0, true);
                url = url.url; // Make url a string so we can use it later.
            } else {
                Y.log('URL must be a string or an object with a `url` property.', 'error', 'get');
                continue;
            }

            Y.mix(req, options, false, null, 0, true);

            // If we didn't get an explicit type for this URL either in the
            // request options or the URL-specific options, try to determine
            // one from the file extension.
            if (!req.type) {
                if (this.REGEX_CSS.test(url)) {
                    req.type = 'css';
                } else {
                    if (!this.REGEX_JS.test(url)) {
                        Y.log("Can't guess file type from URL. Assuming JS: " + url, 'warn', 'get');
                    }

                    req.type = 'js';
                }
            }

            // Mix in type-specific default options, but don't overwrite any
            // options that have already been set.
            Y.mix(req, req.type === 'js' ? this.jsOptions : this.cssOptions,
                false, null, 0, true);

            // Give the node an id attribute if it doesn't already have one.
            req.attributes.id || (req.attributes.id = Y.guid());

            // Backcompat for <3.5.0 behavior.
            if (req.win) {
                Y.log('The `win` option is deprecated as of 3.5.0. Use `doc` instead.', 'warn', 'get');
                req.doc = req.win.document;
            } else {
                req.win = req.doc.defaultView || req.doc.parentWindow;
            }

            if (req.charset) {
                Y.log('The `charset` option is deprecated as of 3.5.0. Set `attributes.charset` instead.', 'warn', 'get');
                req.attributes.charset = req.charset;
            }

            requests.push(req);
        }

        return new Transaction(requests, options);
    },

    _load: function (type, urls, options, callback) {
        var transaction;

        // Allow callback as third param.
        if (typeof options === 'function') {
            callback = options;
            options  = {};
        }

        options || (options = {});
        options.type = type;

        options._onFinish = Get._onTransactionFinish;

        if (!this._env) {
            this._getEnv();
        }

        transaction = this._getTransaction(urls, options);

        this._queue.push({
            callback   : callback,
            transaction: transaction
        });

        this._next();

        return transaction;
    },

    _onTransactionFinish : function() {
        Get._pending = null;
        Get._next();
    },

    _next: function () {
        var item;

        if (this._pending) {
            return;
        }

        item = this._queue.shift();

        if (item) {
            this._pending = item;
            item.transaction.execute(item.callback);
        }
    },

    _purge: function (nodes) {
        var purgeNodes    = this._purgeNodes,
            isTransaction = nodes !== purgeNodes,
            index, node;

        while (node = nodes.pop()) { // assignment
            // Don't purge nodes that haven't finished loading (or errored out),
            // since this can hang the transaction.
            if (!node._yuiget_finished) {
                continue;
            }

            node.parentNode && node.parentNode.removeChild(node);

            // If this is a transaction-level purge and this node also exists in
            // the Get-level _purgeNodes array, we need to remove it from
            // _purgeNodes to avoid creating a memory leak. The indexOf lookup
            // sucks, but until we get WeakMaps, this is the least troublesome
            // way to do this (we can't just hold onto node ids because they may
            // not be in the same document).
            if (isTransaction) {
                index = Y.Array.indexOf(purgeNodes, node);

                if (index > -1) {
                    purgeNodes.splice(index, 1);
                }
            }
        }
    }
};

/**
Alias for `js()`.

@method script
@static
**/
Get.script = Get.js;

/**
Represents a Get transaction, which may contain requests for one or more JS or
CSS files.

This class should not be instantiated manually. Instances will be created and
returned as needed by Y.Get's `css()`, `js()`, and `load()` methods.

@class Get.Transaction
@constructor
@since 3.5.0
**/
Get.Transaction = Transaction = function (requests, options) {
    var self = this;

    self.id       = Transaction._lastId += 1;
    self.data     = options.data;
    self.errors   = [];
    self.nodes    = [];
    self.options  = options;
    self.requests = requests;

    self._callbacks = []; // callbacks to call after execution finishes
    self._queue     = [];
    self._reqsWaiting   = 0;

    // Deprecated pre-3.5.0 properties.
    self.tId = self.id; // Use `id` instead.
    self.win = options.win || Y.config.win;
};

/**
Arbitrary data object associated with this transaction.

This object comes from the options passed to `Get.css()`, `Get.js()`, or
`Get.load()`, and will be `undefined` if no data object was specified.

@property {Object} data
**/

/**
Array of errors that have occurred during this transaction, if any. Each error
object has the following properties:
`errors.error`: Error message.
`errors.request`: Request object related to the error.

@since 3.5.0
@property {Object[]} errors
**/

/**
Numeric id for this transaction, unique among all transactions within the same
YUI sandbox in the current pageview.

@property {Number} id
@since 3.5.0
**/

/**
HTMLElement nodes (native ones, not YUI Node instances) that have been inserted
during the current transaction.

@property {HTMLElement[]} nodes
**/

/**
Options associated with this transaction.

See `Get.options` for the full list of available options.

@property {Object} options
@since 3.5.0
**/

/**
Request objects contained in this transaction. Each request object represents
one CSS or JS URL that will be (or has been) requested and loaded into the page.

@property {Object} requests
@since 3.5.0
**/

/**
Id of the most recent transaction.

@property _lastId
@type Number
@protected
@static
**/
Transaction._lastId = 0;

Transaction.prototype = {
    // -- Public Properties ----------------------------------------------------

    /**
    Current state of this transaction. One of "new", "executing", or "done".

    @property _state
    @type String
    @protected
    **/
    _state: 'new', // "new", "executing", or "done"

    // -- Public Methods -------------------------------------------------------

    /**
    Aborts this transaction.

    This will cause the transaction's `onFailure` callback to be called and
    will prevent any new script and link nodes from being added to the document,
    but any resources that have already been requested will continue loading
    (there's no safe way to prevent this, unfortunately).

    @method abort
    @param {String} [msg="Aborted."] Optional message to use in the `errors`
        array describing why the transaction was aborted.
    **/
    abort: function (msg) {
        this._pending    = null;
        this._pendingCSS = null;
        this._pollTimer  = clearTimeout(this._pollTimer);
        this._queue      = [];
        this._reqsWaiting    = 0;

        this.errors.push({error: msg || 'Aborted'});
        this._finish();
    },

    /**
    Begins execting the transaction.

    There's usually no reason to call this manually, since Get will call it
    automatically when other pending transactions have finished. If you really
    want to execute your transaction before Get does, you can, but be aware that
    this transaction's scripts may end up executing before the scripts in other
    pending transactions.

    If the transaction is already executing, the specified callback (if any)
    will be queued and called after execution finishes. If the transaction has
    already finished, the callback will be called immediately (the transaction
    will not be executed again).

    @method execute
    @param {Function} callback Callback function to execute after all requests
        in the transaction are complete, or after the transaction is aborted.
    **/
    execute: function (callback) {
        var self     = this,
            requests = self.requests,
            state    = self._state,
            i, len, queue, req;

        if (state === 'done') {
            callback && callback(self.errors.length ? self.errors : null, self);
            return;
        } else {
            callback && self._callbacks.push(callback);

            if (state === 'executing') {
                return;
            }
        }

        self._state = 'executing';
        self._queue = queue = [];

        if (self.options.timeout) {
            self._timeout = setTimeout(function () {
                self.abort('Timeout');
            }, self.options.timeout);
        }

        self._reqsWaiting = requests.length;

        for (i = 0, len = requests.length; i < len; ++i) {
            req = requests[i];

            if (req.async || req.type === 'css') {
                // No need to queue CSS or fully async JS.
                self._insert(req);
            } else {
                queue.push(req);
            }
        }

        self._next();
    },

    /**
    Manually purges any `<script>` or `<link>` nodes this transaction has
    created.

    Be careful when purging a transaction that contains CSS requests, since
    removing `<link>` nodes will also remove any styles they applied.

    @method purge
    **/
    purge: function () {
        Get._purge(this.nodes);
    },

    // -- Protected Methods ----------------------------------------------------
    _createNode: function (name, attrs, doc) {
        var node = doc.createElement(name),
            attr, testEl;

        if (!CUSTOM_ATTRS) {
            // IE6 and IE7 expect property names rather than attribute names for
            // certain attributes. Rather than sniffing, we do a quick feature
            // test the first time _createNode() runs to determine whether we
            // need to provide a workaround.
            testEl = doc.createElement('div');
            testEl.setAttribute('class', 'a');

            CUSTOM_ATTRS = testEl.className === 'a' ? {} : {
                'for'  : 'htmlFor',
                'class': 'className'
            };
        }

        for (attr in attrs) {
            if (attrs.hasOwnProperty(attr)) {
                node.setAttribute(CUSTOM_ATTRS[attr] || attr, attrs[attr]);
            }
        }

        return node;
    },

    _finish: function () {
        var errors  = this.errors.length ? this.errors : null,
            options = this.options,
            thisObj = options.context || this,
            data, i, len;

        if (this._state === 'done') {
            return;
        }

        this._state = 'done';

        for (i = 0, len = this._callbacks.length; i < len; ++i) {
            this._callbacks[i].call(thisObj, errors, this);
        }

        data = this._getEventData();

        if (errors) {
            if (options.onTimeout && errors[errors.length - 1].error === 'Timeout') {
                options.onTimeout.call(thisObj, data);
            }

            if (options.onFailure) {
                options.onFailure.call(thisObj, data);
            }
        } else if (options.onSuccess) {
            options.onSuccess.call(thisObj, data);
        }

        if (options.onEnd) {
            options.onEnd.call(thisObj, data);
        }

        if (options._onFinish) {
            options._onFinish();
        }
    },

    _getEventData: function (req) {
        if (req) {
            // This merge is necessary for backcompat. I hate it.
            return Y.merge(this, {
                abort  : this.abort, // have to copy these because the prototype isn't preserved
                purge  : this.purge,
                request: req,
                url    : req.url,
                win    : req.win
            });
        } else {
            return this;
        }
    },

    _getInsertBefore: function (req) {
        var doc = req.doc,
            el  = req.insertBefore,
            cache, docStamp;

        if (el) {
            return typeof el === 'string' ? doc.getElementById(el) : el;
        }

        cache    = Get._insertCache;
        docStamp = Y.stamp(doc);

        if ((el = cache[docStamp])) { // assignment
            return el;
        }

        // Inserting before a <base> tag apparently works around an IE bug
        // (according to a comment from pre-3.5.0 Y.Get), but I'm not sure what
        // bug that is, exactly. Better safe than sorry?
        if ((el = doc.getElementsByTagName('base')[0])) { // assignment
            return (cache[docStamp] = el);
        }

        // Look for a <head> element.
        el = doc.head || doc.getElementsByTagName('head')[0];

        if (el) {
            // Create a marker node at the end of <head> to use as an insertion
            // point. Inserting before this node will ensure that all our CSS
            // gets inserted in the correct order, to maintain style precedence.
            el.appendChild(doc.createTextNode(''));
            return (cache[docStamp] = el.lastChild);
        }

        // If all else fails, just insert before the first script node on the
        // page, which is virtually guaranteed to exist.
        return (cache[docStamp] = doc.getElementsByTagName('script')[0]);
    },

    _insert: function (req) {
        var env          = Get._env,
            insertBefore = this._getInsertBefore(req),
            isScript     = req.type === 'js',
            node         = req.node,
            self         = this,
            ua           = Y.UA,
            cssTimeout, nodeType;

        if (!node) {
            if (isScript) {
                nodeType = 'script';
            } else if (!env.cssLoad && ua.gecko) {
                nodeType = 'style';
            } else {
                nodeType = 'link';
            }

            node = req.node = this._createNode(nodeType, req.attributes,
                req.doc);
        }

        function onError() {
            self._progress('Failed to load ' + req.url, req);
        }

        function onLoad() {
            if (cssTimeout) {
                clearTimeout(cssTimeout);
            }

            self._progress(null, req);
        }

        // Deal with script asynchronicity.
        if (isScript) {
            node.setAttribute('src', req.url);

            if (req.async) {
                // Explicitly indicate that we want the browser to execute this
                // script asynchronously. This is necessary for older browsers
                // like Firefox <4.
                node.async = true;
            } else {
                if (env.async) {
                    // This browser treats injected scripts as async by default
                    // (standard HTML5 behavior) but asynchronous loading isn't
                    // desired, so tell the browser not to mark this script as
                    // async.
                    node.async = false;
                }

                // If this browser doesn't preserve script execution order based
                // on insertion order, we'll need to avoid inserting other
                // scripts until this one finishes loading.
                if (!env.preservesScriptOrder) {
                    this._pending = req;
                }
            }
        } else {
            if (!env.cssLoad && ua.gecko) {
                // In Firefox <9, we can import the requested URL into a <style>
                // node and poll for the existence of node.sheet.cssRules. This
                // gives us a reliable way to determine CSS load completion that
                // also works for cross-domain stylesheets.
                //
                // Props to Zach Leatherman for calling my attention to this
                // technique.
                node.innerHTML = (req.attributes.charset ?
                    '@charset "' + req.attributes.charset + '";' : '') +
                    '@import "' + req.url + '";';
            } else {
                node.setAttribute('href', req.url);
            }
        }

        // Inject the node.
        if (isScript && ua.ie && (ua.ie < 9 || (document.documentMode && document.documentMode < 9))) {
            // Script on IE < 9, and IE 9+ when in IE 8 or older modes, including quirks mode.
            node.onreadystatechange = function () {
                if (/loaded|complete/.test(node.readyState)) {
                    node.onreadystatechange = null;
                    onLoad();
                }
            };
        } else if (!isScript && !env.cssLoad) {
            // CSS on Firefox <9 or WebKit.
            this._poll(req);
        } else {
            // Script or CSS on everything else. Using DOM 0 events because that
            // evens the playing field with older IEs.

            if (ua.ie >= 10) {

                // We currently need to introduce a timeout for IE10, since it
                // calls onerror/onload synchronously for 304s - messing up existing
                // program flow.

                // Remove this block if the following bug gets fixed by GA
                /*jshint maxlen: 1500 */
                // https://connect.microsoft.com/IE/feedback/details/763871/dynamically-loaded-scripts-with-304s-responses-interrupt-the-currently-executing-js-thread-onload
                node.onerror = function() { setTimeout(onError, 0); };
                node.onload  = function() { setTimeout(onLoad, 0); };
            } else {
                node.onerror = onError;
                node.onload  = onLoad;
            }

            // If this browser doesn't fire an event when CSS fails to load,
            // fail after a timeout to avoid blocking the transaction queue.
            if (!env.cssFail && !isScript) {
                cssTimeout = setTimeout(onError, req.timeout || 3000);
            }
        }

        this.nodes.push(node);
        insertBefore.parentNode.insertBefore(node, insertBefore);
    },

    _next: function () {
        if (this._pending) {
            return;
        }

        // If there are requests in the queue, insert the next queued request.
        // Otherwise, if we're waiting on already-inserted requests to finish,
        // wait longer. If there are no queued requests and we're not waiting
        // for anything to load, then we're done!
        if (this._queue.length) {
            this._insert(this._queue.shift());
        } else if (!this._reqsWaiting) {
            this._finish();
        }
    },

    _poll: function (newReq) {
        var self       = this,
            pendingCSS = self._pendingCSS,
            isWebKit   = Y.UA.webkit,
            i, hasRules, j, nodeHref, req, sheets;

        if (newReq) {
            pendingCSS || (pendingCSS = self._pendingCSS = []);
            pendingCSS.push(newReq);

            if (self._pollTimer) {
                // A poll timeout is already pending, so no need to create a
                // new one.
                return;
            }
        }

        self._pollTimer = null;

        // Note: in both the WebKit and Gecko hacks below, a CSS URL that 404s
        // will still be treated as a success. There's no good workaround for
        // this.

        for (i = 0; i < pendingCSS.length; ++i) {
            req = pendingCSS[i];

            if (isWebKit) {
                // Look for a stylesheet matching the pending URL.
                sheets   = req.doc.styleSheets;
                j        = sheets.length;
                nodeHref = req.node.href;

                while (--j >= 0) {
                    if (sheets[j].href === nodeHref) {
                        pendingCSS.splice(i, 1);
                        i -= 1;
                        self._progress(null, req);
                        break;
                    }
                }
            } else {
                // Many thanks to Zach Leatherman for calling my attention to
                // the @import-based cross-domain technique used here, and to
                // Oleg Slobodskoi for an earlier same-domain implementation.
                //
                // See Zach's blog for more details:
                // http://www.zachleat.com/web/2010/07/29/load-css-dynamically/
                try {
                    // We don't really need to store this value since we never
                    // use it again, but if we don't store it, Closure Compiler
                    // assumes the code is useless and removes it.
                    hasRules = !!req.node.sheet.cssRules;

                    // If we get here, the stylesheet has loaded.
                    pendingCSS.splice(i, 1);
                    i -= 1;
                    self._progress(null, req);
                } catch (ex) {
                    // An exception means the stylesheet is still loading.
                }
            }
        }

        if (pendingCSS.length) {
            self._pollTimer = setTimeout(function () {
                self._poll.call(self);
            }, self.options.pollInterval);
        }
    },

    _progress: function (err, req) {
        var options = this.options;

        if (err) {
            req.error = err;

            this.errors.push({
                error  : err,
                request: req
            });

            Y.log(err, 'error', 'get');
        }

        req.node._yuiget_finished = req.finished = true;

        if (options.onProgress) {
            options.onProgress.call(options.context || this,
                this._getEventData(req));
        }

        if (req.autopurge) {
            // Pre-3.5.0 Get always excludes the most recent node from an
            // autopurge. I find this odd, but I'm keeping that behavior for
            // the sake of backcompat.
            Get._autoPurge(this.options.purgethreshold);
            Get._purgeNodes.push(req.node);
        }

        if (this._pending === req) {
            this._pending = null;
        }

        this._reqsWaiting -= 1;

        this._next();
    }
};


}, '3.18.1', {"requires": ["yui-base"]});
YUI.add('features', function (Y, NAME) {

var feature_tests = {};

/**
Contains the core of YUI's feature test architecture.
@module features
*/

/**
* Feature detection
* @class Features
* @static
*/

Y.mix(Y.namespace('Features'), {

    /**
    * Object hash of all registered feature tests
    * @property tests
    * @type Object
    */
    tests: feature_tests,

    /**
    * Add a test to the system
    *
    *   ```
    *   Y.Features.add("load", "1", {});
    *   ```
    *
    * @method add
    * @param {String} cat The category, right now only 'load' is supported
    * @param {String} name The number sequence of the test, how it's reported in the URL or config: 1, 2, 3
    * @param {Object} o Object containing test properties
    * @param {String} o.name The name of the test
    * @param {Function} o.test The test function to execute, the only argument to the function is the `Y` instance
    * @param {String} o.trigger The module that triggers this test.
    */
    add: function(cat, name, o) {
        feature_tests[cat] = feature_tests[cat] || {};
        feature_tests[cat][name] = o;
    },
    /**
    * Execute all tests of a given category and return the serialized results
    *
    *   ```
    *   caps=1:1;2:1;3:0
    *   ```
    * @method all
    * @param {String} cat The category to execute
    * @param {Array} args The arguments to pass to the test function
    * @return {String} A semi-colon separated string of tests and their success/failure: 1:1;2:1;3:0
    */
    all: function(cat, args) {
        var cat_o = feature_tests[cat],
            // results = {};
            result = [];
        if (cat_o) {
            Y.Object.each(cat_o, function(v, k) {
                result.push(k + ':' + (Y.Features.test(cat, k, args) ? 1 : 0));
            });
        }

        return (result.length) ? result.join(';') : '';
    },
    /**
    * Run a specific test and return a Boolean response.
    *
    *   ```
    *   Y.Features.test("load", "1");
    *   ```
    *
    * @method test
    * @param {String} cat The category of the test to run
    * @param {String} name The name of the test to run
    * @param {Array} args The arguments to pass to the test function
    * @return {Boolean} True or false if the test passed/failed.
    */
    test: function(cat, name, args) {
        args = args || [];
        var result, ua, test,
            cat_o = feature_tests[cat],
            feature = cat_o && cat_o[name];

        if (!feature) {
            Y.log('Feature test ' + cat + ', ' + name + ' not found');
        } else {

            result = feature.result;

            if (Y.Lang.isUndefined(result)) {

                ua = feature.ua;
                if (ua) {
                    result = (Y.UA[ua]);
                }

                test = feature.test;
                if (test && ((!ua) || result)) {
                    result = test.apply(Y, args);
                }

                feature.result = result;
            }
        }

        return result;
    }
});

// Y.Features.add("load", "1", {});
// Y.Features.test("load", "1");
// caps=1:1;2:0;3:1;

/* This file is auto-generated by (yogi.js loader --mix --yes) */
/*jshint maxlen:900, eqeqeq: false */
var add = Y.Features.add;
// app-transitions-native
add('load', '0', {
    "name": "app-transitions-native",
    "test": function (Y) {
    var doc  = Y.config.doc,
        node = doc ? doc.documentElement : null;

    if (node && node.style) {
        return ('MozTransition' in node.style || 'WebkitTransition' in node.style || 'transition' in node.style);
    }

    return false;
},
    "trigger": "app-transitions"
});
// autocomplete-list-keys
add('load', '1', {
    "name": "autocomplete-list-keys",
    "test": function (Y) {
    // Only add keyboard support to autocomplete-list if this doesn't appear to
    // be an iOS or Android-based mobile device.
    //
    // There's currently no feasible way to actually detect whether a device has
    // a hardware keyboard, so this sniff will have to do. It can easily be
    // overridden by manually loading the autocomplete-list-keys module.
    //
    // Worth noting: even though iOS supports bluetooth keyboards, Mobile Safari
    // doesn't fire the keyboard events used by AutoCompleteList, so there's
    // no point loading the -keys module even when a bluetooth keyboard may be
    // available.
    return !(Y.UA.ios || Y.UA.android);
},
    "trigger": "autocomplete-list"
});
// dd-gestures
add('load', '2', {
    "name": "dd-gestures",
    "trigger": "dd-drag",
    "ua": "touchEnabled"
});
// dom-style-ie
add('load', '3', {
    "name": "dom-style-ie",
    "test": function (Y) {

    var testFeature = Y.Features.test,
        addFeature = Y.Features.add,
        WINDOW = Y.config.win,
        DOCUMENT = Y.config.doc,
        DOCUMENT_ELEMENT = 'documentElement',
        ret = false;

    addFeature('style', 'computedStyle', {
        test: function() {
            return WINDOW && 'getComputedStyle' in WINDOW;
        }
    });

    addFeature('style', 'opacity', {
        test: function() {
            return DOCUMENT && 'opacity' in DOCUMENT[DOCUMENT_ELEMENT].style;
        }
    });

    ret =  (!testFeature('style', 'opacity') &&
            !testFeature('style', 'computedStyle'));

    return ret;
},
    "trigger": "dom-style"
});
// editor-para-ie
add('load', '4', {
    "name": "editor-para-ie",
    "trigger": "editor-para",
    "ua": "ie",
    "when": "instead"
});
// event-base-ie
add('load', '5', {
    "name": "event-base-ie",
    "test": function(Y) {
    var imp = Y.config.doc && Y.config.doc.implementation;
    return (imp && (!imp.hasFeature('Events', '2.0')));
},
    "trigger": "node-base"
});
// graphics-canvas
add('load', '6', {
    "name": "graphics-canvas",
    "test": function(Y) {
    var DOCUMENT = Y.config.doc,
        useCanvas = Y.config.defaultGraphicEngine && Y.config.defaultGraphicEngine == "canvas",
		canvas = DOCUMENT && DOCUMENT.createElement("canvas"),
        svg = (DOCUMENT && DOCUMENT.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#BasicStructure", "1.1"));
    return (!svg || useCanvas) && (canvas && canvas.getContext && canvas.getContext("2d"));
},
    "trigger": "graphics"
});
// graphics-canvas-default
add('load', '7', {
    "name": "graphics-canvas-default",
    "test": function(Y) {
    var DOCUMENT = Y.config.doc,
        useCanvas = Y.config.defaultGraphicEngine && Y.config.defaultGraphicEngine == "canvas",
		canvas = DOCUMENT && DOCUMENT.createElement("canvas"),
        svg = (DOCUMENT && DOCUMENT.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#BasicStructure", "1.1"));
    return (!svg || useCanvas) && (canvas && canvas.getContext && canvas.getContext("2d"));
},
    "trigger": "graphics"
});
// graphics-svg
add('load', '8', {
    "name": "graphics-svg",
    "test": function(Y) {
    var DOCUMENT = Y.config.doc,
        useSVG = !Y.config.defaultGraphicEngine || Y.config.defaultGraphicEngine != "canvas",
		canvas = DOCUMENT && DOCUMENT.createElement("canvas"),
        svg = (DOCUMENT && DOCUMENT.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#BasicStructure", "1.1"));

    return svg && (useSVG || !canvas);
},
    "trigger": "graphics"
});
// graphics-svg-default
add('load', '9', {
    "name": "graphics-svg-default",
    "test": function(Y) {
    var DOCUMENT = Y.config.doc,
        useSVG = !Y.config.defaultGraphicEngine || Y.config.defaultGraphicEngine != "canvas",
		canvas = DOCUMENT && DOCUMENT.createElement("canvas"),
        svg = (DOCUMENT && DOCUMENT.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#BasicStructure", "1.1"));

    return svg && (useSVG || !canvas);
},
    "trigger": "graphics"
});
// graphics-vml
add('load', '10', {
    "name": "graphics-vml",
    "test": function(Y) {
    var DOCUMENT = Y.config.doc,
		canvas = DOCUMENT && DOCUMENT.createElement("canvas");
    return (DOCUMENT && !DOCUMENT.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#BasicStructure", "1.1") && (!canvas || !canvas.getContext || !canvas.getContext("2d")));
},
    "trigger": "graphics"
});
// graphics-vml-default
add('load', '11', {
    "name": "graphics-vml-default",
    "test": function(Y) {
    var DOCUMENT = Y.config.doc,
		canvas = DOCUMENT && DOCUMENT.createElement("canvas");
    return (DOCUMENT && !DOCUMENT.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#BasicStructure", "1.1") && (!canvas || !canvas.getContext || !canvas.getContext("2d")));
},
    "trigger": "graphics"
});
// history-hash-ie
add('load', '12', {
    "name": "history-hash-ie",
    "test": function (Y) {
    var docMode = Y.config.doc && Y.config.doc.documentMode;

    return Y.UA.ie && (!('onhashchange' in Y.config.win) ||
            !docMode || docMode < 8);
},
    "trigger": "history-hash"
});
// io-nodejs
add('load', '13', {
    "name": "io-nodejs",
    "trigger": "io-base",
    "ua": "nodejs"
});
// json-parse-shim
add('load', '14', {
    "name": "json-parse-shim",
    "test": function (Y) {
    var _JSON = Y.config.global.JSON,
        Native = Object.prototype.toString.call(_JSON) === '[object JSON]' && _JSON,
        nativeSupport = Y.config.useNativeJSONParse !== false && !!Native;

    function workingNative( k, v ) {
        return k === "ok" ? true : v;
    }

    // Double check basic functionality.  This is mainly to catch early broken
    // implementations of the JSON API in Firefox 3.1 beta1 and beta2
    if ( nativeSupport ) {
        try {
            nativeSupport = ( Native.parse( '{"ok":false}', workingNative ) ).ok;
        }
        catch ( e ) {
            nativeSupport = false;
        }
    }

    return !nativeSupport;
},
    "trigger": "json-parse"
});
// json-stringify-shim
add('load', '15', {
    "name": "json-stringify-shim",
    "test": function (Y) {
    var _JSON = Y.config.global.JSON,
        Native = Object.prototype.toString.call(_JSON) === '[object JSON]' && _JSON,
        nativeSupport = Y.config.useNativeJSONStringify !== false && !!Native;

    // Double check basic native functionality.  This is primarily to catch broken
    // early JSON API implementations in Firefox 3.1 beta1 and beta2.
    if ( nativeSupport ) {
        try {
            nativeSupport = ( '0' === Native.stringify(0) );
        } catch ( e ) {
            nativeSupport = false;
        }
    }


    return !nativeSupport;
},
    "trigger": "json-stringify"
});
// scrollview-base-ie
add('load', '16', {
    "name": "scrollview-base-ie",
    "trigger": "scrollview-base",
    "ua": "ie"
});
// selector-css2
add('load', '17', {
    "name": "selector-css2",
    "test": function (Y) {
    var DOCUMENT = Y.config.doc,
        ret = DOCUMENT && !('querySelectorAll' in DOCUMENT);

    return ret;
},
    "trigger": "selector"
});
// transition-timer
add('load', '18', {
    "name": "transition-timer",
    "test": function (Y) {
    var DOCUMENT = Y.config.doc,
        node = (DOCUMENT) ? DOCUMENT.documentElement: null,
        ret = true;

    if (node && node.style) {
        ret = !('MozTransition' in node.style || 'WebkitTransition' in node.style || 'transition' in node.style);
    }

    return ret;
},
    "trigger": "transition"
});
// widget-base-ie
add('load', '19', {
    "name": "widget-base-ie",
    "trigger": "widget-base",
    "ua": "ie"
});
// yql-jsonp
add('load', '20', {
    "name": "yql-jsonp",
    "test": function (Y) {
    /* Only load the JSONP module when not in nodejs or winjs
    TODO Make the winjs module a CORS module
    */
    return (!Y.UA.nodejs && !Y.UA.winjs);
},
    "trigger": "yql"
});
// yql-nodejs
add('load', '21', {
    "name": "yql-nodejs",
    "trigger": "yql",
    "ua": "nodejs"
});
// yql-winjs
add('load', '22', {
    "name": "yql-winjs",
    "trigger": "yql",
    "ua": "winjs"
});

}, '3.18.1', {"requires": ["yui-base"]});
YUI.add('intl-base', function (Y, NAME) {

/**
 * The Intl utility provides a central location for managing sets of
 * localized resources (strings and formatting patterns).
 *
 * @class Intl
 * @uses EventTarget
 * @static
 */

var SPLIT_REGEX = /[, ]/;

Y.mix(Y.namespace('Intl'), {

 /**
    * Returns the language among those available that
    * best matches the preferred language list, using the Lookup
    * algorithm of BCP 47.
    * If none of the available languages meets the user's preferences,
    * then "" is returned.
    * Extended language ranges are not supported.
    *
    * @method lookupBestLang
    * @param {String[] | String} preferredLanguages The list of preferred
    * languages in descending preference order, represented as BCP 47
    * language tags. A string array or a comma-separated list.
    * @param {String[]} availableLanguages The list of languages
    * that the application supports, represented as BCP 47 language
    * tags.
    *
    * @return {String} The available language that best matches the
    * preferred language list, or "".
    * @since 3.1.0
    */
    lookupBestLang: function(preferredLanguages, availableLanguages) {

        var i, language, result, index;

        // check whether the list of available languages contains language;
        // if so return it
        function scan(language) {
            var i;
            for (i = 0; i < availableLanguages.length; i += 1) {
                if (language.toLowerCase() ===
                            availableLanguages[i].toLowerCase()) {
                    return availableLanguages[i];
                }
            }
        }

        if (Y.Lang.isString(preferredLanguages)) {
            preferredLanguages = preferredLanguages.split(SPLIT_REGEX);
        }

        for (i = 0; i < preferredLanguages.length; i += 1) {
            language = preferredLanguages[i];
            if (!language || language === '*') {
                continue;
            }
            // check the fallback sequence for one language
            while (language.length > 0) {
                result = scan(language);
                if (result) {
                    return result;
                } else {
                    index = language.lastIndexOf('-');
                    if (index >= 0) {
                        language = language.substring(0, index);
                        // one-character subtags get cut along with the
                        // following subtag
                        if (index >= 2 && language.charAt(index - 2) === '-') {
                            language = language.substring(0, index - 2);
                        }
                    } else {
                        // nothing available for this language
                        break;
                    }
                }
            }
        }

        return '';
    }
});


}, '3.18.1', {"requires": ["yui-base"]});
YUI.add('yui-log', function (Y, NAME) {

/**
 * Provides console log capability and exposes a custom event for
 * console implementations. This module is a `core` YUI module,
 * <a href="../classes/YUI.html#method_log">it's documentation is located under the YUI class</a>.
 *
 * @module yui
 * @submodule yui-log
 */

var INSTANCE = Y,
    LOGEVENT = 'yui:log',
    UNDEFINED = 'undefined',
    LEVELS = { debug: 1,
               info: 2,
               warn: 4,
               error: 8 };

/**
 * If the 'debug' config is true, a 'yui:log' event will be
 * dispatched, which the Console widget and anything else
 * can consume.  If the 'useBrowserConsole' config is true, it will
 * write to the browser console if available.  YUI-specific log
 * messages will only be present in the -debug versions of the
 * JS files.  The build system is supposed to remove log statements
 * from the raw and minified versions of the files.
 *
 * @method log
 * @for YUI
 * @param  {String}  msg  The message to log.
 * @param  {String}  cat  The log category for the message.  Default
 *                        categories are "info", "warn", "error", "debug".
 *                        Custom categories can be used as well. (opt).
 * @param  {String}  src  The source of the the message (opt).
 * @param  {boolean} silent If true, the log event won't fire.
 * @return {YUI}      YUI instance.
 */
INSTANCE.log = function(msg, cat, src, silent) {
    var bail, excl, incl, m, f, minlevel,
        Y = INSTANCE,
        c = Y.config,
        publisher = (Y.fire) ? Y : YUI.Env.globalEvents;
    // suppress log message if the config is off or the event stack
    // or the event call stack contains a consumer of the yui:log event
    if (c.debug) {
        // apply source filters
        src = src || "";
        if (typeof src !== "undefined") {
            excl = c.logExclude;
            incl = c.logInclude;
            if (incl && !(src in incl)) {
                bail = 1;
            } else if (incl && (src in incl)) {
                bail = !incl[src];
            } else if (excl && (src in excl)) {
                bail = excl[src];
            }

            // Set a default category of info if the category was not defined.
            if ((typeof cat === 'undefined')) {
                cat = 'info';
            }

            // Determine the current minlevel as defined in configuration
            Y.config.logLevel = Y.config.logLevel || 'debug';
            minlevel = LEVELS[Y.config.logLevel.toLowerCase()];

            if (cat in LEVELS && LEVELS[cat] < minlevel) {
                // Skip this message if the we don't meet the defined minlevel
                bail = 1;
            }
        }
        if (!bail) {
            if (c.useBrowserConsole) {
                m = (src) ? src + ': ' + msg : msg;
                if (Y.Lang.isFunction(c.logFn)) {
                    c.logFn.call(Y, msg, cat, src);
                } else if (typeof console !== UNDEFINED && console.log) {
                    f = (cat && console[cat] && (cat in LEVELS)) ? cat : 'log';
                    console[f](m);
                } else if (typeof opera !== UNDEFINED) {
                    opera.postError(m);
                }
            }

            if (publisher && !silent) {

                if (publisher === Y && (!publisher.getEvent(LOGEVENT))) {
                    publisher.publish(LOGEVENT, {
                        broadcast: 2
                    });
                }

                publisher.fire(LOGEVENT, {
                    msg: msg,
                    cat: cat,
                    src: src
                });
            }
        }
    }

    return Y;
};

/**
 * Write a system message.  This message will be preserved in the
 * minified and raw versions of the YUI files, unlike log statements.
 * @method message
 * @for YUI
 * @param  {String}  msg  The message to log.
 * @param  {String}  cat  The log category for the message.  Default
 *                        categories are "info", "warn", "error", "debug".
 *                        Custom categories can be used as well. (opt).
 * @param  {String}  src  The source of the the message (opt).
 * @param  {boolean} silent If true, the log event won't fire.
 * @return {YUI}      YUI instance.
 */
INSTANCE.message = function() {
    return INSTANCE.log.apply(INSTANCE, arguments);
};


}, '3.18.1', {"requires": ["yui-base"]});
YUI.add('yui-later', function (Y, NAME) {

/**
 * Provides a setTimeout/setInterval wrapper. This module is a `core` YUI module,
 * <a href="../classes/YUI.html#method_later">it's documentation is located under the YUI class</a>.
 *
 * @module yui
 * @submodule yui-later
 */

var NO_ARGS = [];

/**
 * Executes the supplied function in the context of the supplied
 * object 'when' milliseconds later.  Executes the function a
 * single time unless periodic is set to true.
 * @for YUI
 * @method later
 * @param when {Number} the number of milliseconds to wait until the fn
 * is executed.
 * @param o the context object.
 * @param fn {Function|String} the function to execute or the name of
 * the method in the 'o' object to execute.
 * @param data [Array] data that is provided to the function.  This
 * accepts either a single item or an array.  If an array is provided,
 * the function is executed with one parameter for each array item.
 * If you need to pass a single array parameter, it needs to be wrapped
 * in an array [myarray].
 *
 * Note: native methods in IE may not have the call and apply methods.
 * In this case, it will work, but you are limited to four arguments.
 *
 * @param periodic {boolean} if true, executes continuously at supplied
 * interval until canceled.
 * @return {object} a timer object. Call the cancel() method on this
 * object to stop the timer.
 */
Y.later = function(when, o, fn, data, periodic) {
    when = when || 0;
    data = (!Y.Lang.isUndefined(data)) ? Y.Array(data) : NO_ARGS;
    o = o || Y.config.win || Y;

    var cancelled = false,
        method = (o && Y.Lang.isString(fn)) ? o[fn] : fn,
        wrapper = function() {
            // IE 8- may execute a setInterval callback one last time
            // after clearInterval was called, so in order to preserve
            // the cancel() === no more runny-run, we have to jump through
            // an extra hoop.
            if (!cancelled) {
                if (!method.apply) {
                    method(data[0], data[1], data[2], data[3]);
                } else {
                    method.apply(o, data || NO_ARGS);
                }
            }
        },
        id = (periodic) ? setInterval(wrapper, when) : setTimeout(wrapper, when);

    return {
        id: id,
        interval: periodic,
        cancel: function() {
            cancelled = true;
            if (this.interval) {
                clearInterval(id);
            } else {
                clearTimeout(id);
            }
        }
    };
};

Y.Lang.later = Y.later;



}, '3.18.1', {"requires": ["yui-base"]});
YUI.add('loader-base', function (Y, NAME) {

/**
 * The YUI loader core
 * @module loader
 * @submodule loader-base
 */

(function() {
    var VERSION = Y.version,
        BUILD = '/build/',
        ROOT = VERSION + '/',
        CDN_BASE = Y.Env.base,
        GALLERY_VERSION = 'gallery-2014.07.31-18-26',
        TNT = '2in3',
        TNT_VERSION = '4',
        YUI2_VERSION = '2.9.0',
        COMBO_BASE = CDN_BASE + 'combo?',
        META = {
            version: VERSION,
            root: ROOT,
            base: Y.Env.base,
            comboBase: COMBO_BASE,
            skin: {
                defaultSkin: 'sam',
                base: 'assets/skins/',
                path: 'skin.css',
                after: [
                    'cssreset',
                    'cssfonts',
                    'cssgrids',
                    'cssbase',
                    'cssreset-context',
                    'cssfonts-context'
                ]
            },
            groups: {},
            patterns: {}
        },
        groups = META.groups,
        yui2Update = function(tnt, yui2, config) {
            var root = TNT + '.' +
                    (tnt || TNT_VERSION) + '/' +
                    (yui2 || YUI2_VERSION) + BUILD,
                base = (config && config.base) ? config.base : CDN_BASE,
                combo = (config && config.comboBase) ? config.comboBase : COMBO_BASE;

            groups.yui2.base = base + root;
            groups.yui2.root = root;
            groups.yui2.comboBase = combo;
        },
        galleryUpdate = function(tag, config) {
            var root = (tag || GALLERY_VERSION) + BUILD,
                base = (config && config.base) ? config.base : CDN_BASE,
                combo = (config && config.comboBase) ? config.comboBase : COMBO_BASE;

            groups.gallery.base = base + root;
            groups.gallery.root = root;
            groups.gallery.comboBase = combo;
        };


    groups[VERSION] = {};

    groups.gallery = {
        ext: false,
        combine: true,
        comboBase: COMBO_BASE,
        update: galleryUpdate,
        patterns: {
            'gallery-': {},
            'lang/gallery-': {},
            'gallerycss-': {
                type: 'css'
            }
        }
    };

    groups.yui2 = {
        combine: true,
        ext: false,
        comboBase: COMBO_BASE,
        update: yui2Update,
        patterns: {
            'yui2-': {
                configFn: function(me) {
                    if (/-skin|reset|fonts|grids|base/.test(me.name)) {
                        me.type = 'css';
                        me.path = me.path.replace(/\.js/, '.css');
                        // this makes skins in builds earlier than
                        // 2.6.0 work as long as combine is false
                        me.path = me.path.replace(/\/yui2-skin/,
                                            '/assets/skins/sam/yui2-skin');
                    }
                }
            }
        }
    };

    galleryUpdate();
    yui2Update();

    if (YUI.Env[VERSION]) {
        Y.mix(META, YUI.Env[VERSION], false, [
            'modules',
            'groups',
            'skin'
        ], 0, true);
    }

    YUI.Env[VERSION] = META;
}());
/*jslint forin: true, maxlen: 350 */

/**
 * Loader dynamically loads script and css files.  It includes the dependency
 * information for the version of the library in use, and will automatically pull in
 * dependencies for the modules requested. It can also load the
 * files from the Yahoo! CDN, and it can utilize the combo service provided on
 * this network to reduce the number of http connections required to download
 * YUI files.
 *
 * @module loader
 * @main loader
 * @submodule loader-base
 */

var NOT_FOUND = {},
    NO_REQUIREMENTS = [],
    MAX_URL_LENGTH = 1024,
    GLOBAL_ENV = YUI.Env,
    GLOBAL_LOADED = GLOBAL_ENV._loaded,
    CSS = 'css',
    JS = 'js',
    INTL = 'intl',
    DEFAULT_SKIN = 'sam',
    VERSION = Y.version,
    ROOT_LANG = '',
    YObject = Y.Object,
    oeach = YObject.each,
    yArray = Y.Array,
    _queue = GLOBAL_ENV._loaderQueue,
    META = GLOBAL_ENV[VERSION],
    SKIN_PREFIX = 'skin-',
    L = Y.Lang,
    ON_PAGE = GLOBAL_ENV.mods,
    modulekey,
    _path = function(dir, file, type, nomin) {
        var path = dir + '/' + file;
        if (!nomin) {
            path += '-min';
        }
        path += '.' + (type || CSS);

        return path;
    };


    if (!YUI.Env._cssLoaded) {
        YUI.Env._cssLoaded = {};
    }


/**
 * The component metadata is stored in Y.Env.meta.
 * Part of the loader module.
 * @property meta
 * @for YUI
 */
Y.Env.meta = META;

/**
 * Loader dynamically loads script and css files.  It includes the dependency
 * info for the version of the library in use, and will automatically pull in
 * dependencies for the modules requested. It can load the
 * files from the Yahoo! CDN, and it can utilize the combo service provided on
 * this network to reduce the number of http connections required to download
 * YUI files. You can also specify an external, custom combo service to host
 * your modules as well.

        var Y = YUI();
        var loader = new Y.Loader({
            filter: 'debug',
            base: '../../',
            root: 'build/',
            combine: true,
            require: ['node', 'dd', 'console']
        });
        var out = loader.resolve(true);

 * If the Loader needs to be patched before it is used for the first time, it
 * should be done through the `doBeforeLoader` hook. Simply make the patch
 * available via configuration before YUI is loaded:

        YUI_config = YUI_config || {};
        YUI_config.doBeforeLoader = function (config) {
            var resolve = this.context.Loader.prototype.resolve;
            this.context.Loader.prototype.resolve = function () {
                // do something here
                return resolve.apply(this, arguments);
            };
        };

 * @constructor
 * @class Loader
 * @param {Object} config an optional set of configuration options.
 * @param {String} config.base The base dir which to fetch this module from
 * @param {String} config.comboBase The Combo service base path. Ex: `http://yui.yahooapis.com/combo?`
 * @param {String} config.root The root path to prepend to module names for the combo service. Ex: `2.5.2/build/`
 * @param {String|Object} config.filter A filter to apply to result urls. <a href="#property_filter">See filter property</a>
 * @param {Object} config.filters Per-component filter specification.  If specified for a given component, this overrides the filter config.
 * @param {Boolean} config.combine Use a combo service to reduce the number of http connections required to load your dependencies
 * @param {Boolean} [config.async=true] Fetch files in async
 * @param {Array} config.ignore: A list of modules that should never be dynamically loaded
 * @param {Array} config.force A list of modules that should always be loaded when required, even if already present on the page
 * @param {HTMLElement|String} config.insertBefore Node or id for a node that should be used as the insertion point for new nodes
 * @param {Object} config.jsAttributes Object literal containing attributes to add to script nodes
 * @param {Object} config.cssAttributes Object literal containing attributes to add to link nodes
 * @param {Number} config.timeout The number of milliseconds before a timeout occurs when dynamically loading nodes.  If not set, there is no timeout
 * @param {Object} config.context Execution context for all callbacks
 * @param {Function} config.onSuccess Callback for the 'success' event
 * @param {Function} config.onFailure Callback for the 'failure' event
 * @param {Function} config.onTimeout Callback for the 'timeout' event
 * @param {Function} config.onProgress Callback executed each time a script or css file is loaded
 * @param {Object} config.modules A list of module definitions.  See <a href="#method_addModule">Loader.addModule</a> for the supported module metadata
 * @param {Object} config.groups A list of group definitions.  Each group can contain specific definitions for `base`, `comboBase`, `combine`, and accepts a list of `modules`.
 * @param {String} config.2in3 The version of the YUI 2 in 3 wrapper to use.  The intrinsic support for YUI 2 modules in YUI 3 relies on versions of the YUI 2 components inside YUI 3 module wrappers.  These wrappers change over time to accomodate the issues that arise from running YUI 2 in a YUI 3 sandbox.
 * @param {String} config.yui2 When using the 2in3 project, you can select the version of YUI 2 to use.  Valid values are `2.2.2`, `2.3.1`, `2.4.1`, `2.5.2`, `2.6.0`, `2.7.0`, `2.8.0`, `2.8.1` and `2.9.0` [default] -- plus all versions of YUI 2 going forward.
 * @param {Function} config.doBeforeLoader An optional hook that allows for the patching of the loader instance. The `Y` instance is available as `this.context` and the only argument to the function is the Loader configuration object.
 */
Y.Loader = function(o) {

    var self = this;

    //Catch no config passed.
    o = o || {};

    modulekey = META.md5;

    /**
     * Internal callback to handle multiple internal insert() calls
     * so that css is inserted prior to js
     * @property _internalCallback
     * @private
     */
    // self._internalCallback = null;

    /**
     * Callback that will be executed when the loader is finished
     * with an insert
     * @method onSuccess
     * @type function
     */
    // self.onSuccess = null;

    /**
     * Callback that will be executed if there is a failure
     * @method onFailure
     * @type function
     */
    // self.onFailure = null;

    /**
     * Callback executed each time a script or css file is loaded
     * @method onProgress
     * @type function
     */
    // self.onProgress = null;

    /**
     * Callback that will be executed if a timeout occurs
     * @method onTimeout
     * @type function
     */
    // self.onTimeout = null;

    /**
     * The execution context for all callbacks
     * @property context
     * @default {YUI} the YUI instance
     */
    self.context = Y;

    // Hook that allows the patching of loader
    if (o.doBeforeLoader) {
        o.doBeforeLoader.apply(self, arguments);
    }

    /**
     * Data that is passed to all callbacks
     * @property data
     */
    // self.data = null;

    /**
     * Node reference or id where new nodes should be inserted before
     * @property insertBefore
     * @type string|HTMLElement
     */
    // self.insertBefore = null;

    /**
     * The charset attribute for inserted nodes
     * @property charset
     * @type string
     * @deprecated , use cssAttributes or jsAttributes.
     */
    // self.charset = null;

    /**
     * An object literal containing attributes to add to link nodes
     * @property cssAttributes
     * @type object
     */
    // self.cssAttributes = null;

    /**
     * An object literal containing attributes to add to script nodes
     * @property jsAttributes
     * @type object
     */
    // self.jsAttributes = null;

    /**
     * The base directory.
     * @property base
     * @type string
     * @default http://yui.yahooapis.com/[YUI VERSION]/build/
     */
    self.base = Y.Env.meta.base + Y.Env.meta.root;

    /**
     * Base path for the combo service
     * @property comboBase
     * @type string
     * @default http://yui.yahooapis.com/combo?
     */
    self.comboBase = Y.Env.meta.comboBase;

    /*
     * Base path for language packs.
     */
    // self.langBase = Y.Env.meta.langBase;
    // self.lang = "";

    /**
     * If configured, the loader will attempt to use the combo
     * service for YUI resources and configured external resources.
     * @property combine
     * @type boolean
     * @default true if a base dir isn't in the config
     */
    self.combine = o.base &&
        (o.base.indexOf(self.comboBase.substr(0, 20)) > -1);

    /**
    * The default seperator to use between files in a combo URL
    * @property comboSep
    * @type {String}
    * @default Ampersand
    */
    self.comboSep = '&';
    /**
     * Max url length for combo urls.  The default is 1024. This is the URL
     * limit for the Yahoo! hosted combo servers.  If consuming
     * a different combo service that has a different URL limit
     * it is possible to override this default by supplying
     * the maxURLLength config option.  The config option will
     * only take effect if lower than the default.
     *
     * @property maxURLLength
     * @type int
     */
    self.maxURLLength = MAX_URL_LENGTH;

    /**
     * Ignore modules registered on the YUI global
     * @property ignoreRegistered
     * @default false
     */
    self.ignoreRegistered = o.ignoreRegistered;

    /**
     * Root path to prepend to module path for the combo
     * service
     * @property root
     * @type string
     * @default [YUI VERSION]/build/
     */
    self.root = Y.Env.meta.root;

    /**
     * Timeout value in milliseconds.  If set, self value will be used by
     * the get utility.  the timeout event will fire if
     * a timeout occurs.
     * @property timeout
     * @type int
     */
    self.timeout = 0;

    /**
     * A list of modules that should not be loaded, even if
     * they turn up in the dependency tree
     * @property ignore
     * @type string[]
     */
    // self.ignore = null;

    /**
     * A list of modules that should always be loaded, even
     * if they have already been inserted into the page.
     * @property force
     * @type string[]
     */
    // self.force = null;

    self.forceMap = {};

    /**
     * Should we allow rollups
     * @property allowRollup
     * @type boolean
     * @default false
     */
    self.allowRollup = false;

    /**
     * A filter to apply to result urls.  This filter will modify the default
     * path for all modules.  The default path for the YUI library is the
     * minified version of the files (e.g., event-min.js).  The filter property
     * can be a predefined filter or a custom filter.  The valid predefined
     * filters are:
     * <dl>
     *  <dt>DEBUG</dt>
     *  <dd>Selects the debug versions of the library (e.g., event-debug.js).
     *      This option will automatically include the Logger widget</dd>
     *  <dt>RAW</dt>
     *  <dd>Selects the non-minified version of the library (e.g., event.js).
     *  </dd>
     * </dl>
     * You can also define a custom filter, which must be an object literal
     * containing a search expression and a replace string:
     *
     *      myFilter: {
     *          'searchExp': "-min\\.js",
     *          'replaceStr': "-debug.js"
     *      }
     *
     * @property filter
     * @type string| {searchExp: string, replaceStr: string}
     */
    // self.filter = null;

    /**
     * per-component filter specification.  If specified for a given
     * component, this overrides the filter config.
     * @property filters
     * @type object
     */
    self.filters = {};

    /**
     * The list of requested modules
     * @property required
     * @type {string: boolean}
     */
    self.required = {};

    /**
     * If a module name is predefined when requested, it is checked againsts
     * the patterns provided in this property.  If there is a match, the
     * module is added with the default configuration.
     *
     * At the moment only supporting module prefixes, but anticipate
     * supporting at least regular expressions.
     * @property patterns
     * @type Object
     */
    // self.patterns = Y.merge(Y.Env.meta.patterns);
    self.patterns = {};

    /**
     * Internal loader instance metadata. Use accessor `getModuleInfo()` instead.
     */
    self.moduleInfo = {};

    self.groups = Y.merge(Y.Env.meta.groups);

    /**
     * Provides the information used to skin the skinnable components.
     * The following skin definition would result in 'skin1' and 'skin2'
     * being loaded for calendar (if calendar was requested), and
     * 'sam' for all other skinnable components:
     *
     *      skin: {
     *          // The default skin, which is automatically applied if not
     *          // overriden by a component-specific skin definition.
     *          // Change this in to apply a different skin globally
     *          defaultSkin: 'sam',
     *
     *          // This is combined with the loader base property to get
     *          // the default root directory for a skin. ex:
     *          // http://yui.yahooapis.com/2.3.0/build/assets/skins/sam/
     *          base: 'assets/skins/',
     *
     *          // Any component-specific overrides can be specified here,
     *          // making it possible to load different skins for different
     *          // components.  It is possible to load more than one skin
     *          // for a given component as well.
     *          overrides: {
     *              calendar: ['skin1', 'skin2']
     *          }
     *      }
     * @property skin
     * @type {Object}
     */
    self.skin = Y.merge(Y.Env.meta.skin);

    /*
     * Map of conditional modules
     * @since 3.2.0
     */
    self.conditions = {};

    // map of modules with a hash of modules that meet the requirement
    // self.provides = {};

    self.config = o;
    self._internal = true;

    self._populateConditionsCache();

    /**
     * Set when beginning to compute the dependency tree.
     * Composed of what YUI reports to be loaded combined
     * with what has been loaded by any instance on the page
     * with the version number specified in the metadata.
     * @property loaded
     * @type {string: boolean}
     */
    self.loaded = GLOBAL_LOADED[VERSION];


    /**
    * Should Loader fetch scripts in `async`, defaults to `true`
    * @property async
    */

    self.async = true;

    self._inspectPage();

    self._internal = false;

    self._config(o);

    self.forceMap = (self.force) ? Y.Array.hash(self.force) : {};

    self.testresults = null;

    if (Y.config.tests) {
        self.testresults = Y.config.tests;
    }

    /**
     * List of rollup files found in the library metadata
     * @property rollups
     */
    // self.rollups = null;

    /**
     * Whether or not to load optional dependencies for
     * the requested modules
     * @property loadOptional
     * @type boolean
     * @default false
     */
    // self.loadOptional = false;

    /**
     * All of the derived dependencies in sorted order, which
     * will be populated when either calculate() or insert()
     * is called
     * @property sorted
     * @type string[]
     */
    self.sorted = [];

    /*
     * A list of modules to attach to the YUI instance when complete.
     * If not supplied, the sorted list of dependencies are applied.
     * @property attaching
     */
    // self.attaching = null;

    /**
     * Flag to indicate the dependency tree needs to be recomputed
     * if insert is called again.
     * @property dirty
     * @type boolean
     * @default true
     */
    self.dirty = true;

    /**
     * List of modules inserted by the utility
     * @property inserted
     * @type {string: boolean}
     */
    self.inserted = {};

    /**
     * List of skipped modules during insert() because the module
     * was not defined
     * @property skipped
     */
    self.skipped = {};

    // Y.on('yui:load', self.loadNext, self);

    self.tested = {};

    /*
     * Cached sorted calculate results
     * @property results
     * @since 3.2.0
     */
    //self.results = {};

    if (self.ignoreRegistered) {
        //Clear inpage already processed modules.
        self._resetModules();
    }

};

Y.Loader.prototype = {
    /**
    * Gets the module info from the local moduleInfo hash, or from the
    * default metadata and populate the local moduleInfo hash.
    * @method getModuleInfo
    * @param {string} name of the module
    * @public
    */
    getModuleInfo: function(name) {

        var m = this.moduleInfo[name],
            rawMetaModules, globalRenderedMods, internal, v;

        if (m) {
            return m;
        }

        rawMetaModules = META.modules;
        globalRenderedMods = GLOBAL_ENV._renderedMods;
        internal = this._internal;

        /*
        The logic here is:

        - if the `moduleInfo[name]` is avilable,
          then short circuit
        - otherwise, if the module is in the globalCache (cross Y instance),
          then port it from the global registry into `moduleInfo[name]`
        - otherwise, if the module has raw metadata (from meta modules)
          then add it to the global registry and to `moduleInfo[name]`

        */
        if (globalRenderedMods && globalRenderedMods.hasOwnProperty(name) && !this.ignoreRegistered) {
            this.moduleInfo[name] = Y.merge(globalRenderedMods[name]);
        } else {
            if (rawMetaModules.hasOwnProperty(name)) {
                this._internal = true; // making sure that modules from raw data are marked as internal
                v = this.addModule(rawMetaModules[name], name);
                // Inspect the page for the CSS module and mark it as loaded.
                if (v && v.type === CSS) {
                    if (this.isCSSLoaded(v.name, true)) {
                        Y.log('Found CSS module on page: ' + v.name, 'info', 'loader');
                        this.loaded[v.name] = true;
                    }
                }
                this._internal = internal;
            }
        }
        return this.moduleInfo[name];
    },
    /**
    * Expand the names that are aliases to other modules.
    * @method _expandAliases
    * @param {string[]} list a module name or a list of names to be expanded
    * @private
    * @return {array}
    */
    _expandAliases: function(list) {
        var expanded = [],
            aliases = YUI.Env.aliases,
            i, name;
        list = Y.Array(list);
        for (i = 0; i < list.length; i += 1) {
            name = list[i];
            expanded.push.apply(expanded, aliases[name] ? aliases[name] : [name]);
        }
        return expanded;
    },
    /**
    * Populate the conditions cache from raw modules, this is necessary
    * because no other module will require a conditional module, instead
    * the condition has to be executed and then the module is analyzed
    * to be included in the final requirement list. Without this cache
    * conditional modules will be simply ignored.
    * @method _populateConditionsCache
    * @private
    */
    _populateConditionsCache: function() {
        var rawMetaModules = META.modules,
            cache = GLOBAL_ENV._conditions,
            i, j, t, trigger;

        // if we have conditions in cache and cache is enabled
        // we should port them to this loader instance
        if (cache && !this.ignoreRegistered) {
            for (i in cache) {
                if (cache.hasOwnProperty(i)) {
                    this.conditions[i] = Y.merge(cache[i]);
                }
            }
        } else {
            for (i in rawMetaModules) {
                if (rawMetaModules.hasOwnProperty(i) && rawMetaModules[i].condition) {
                    t = this._expandAliases(rawMetaModules[i].condition.trigger);
                    for (j = 0; j < t.length; j += 1) {
                        trigger = t[j];
                        this.conditions[trigger] = this.conditions[trigger] || {};
                        this.conditions[trigger][rawMetaModules[i].name || i] = rawMetaModules[i].condition;
                    }
                }
            }
            GLOBAL_ENV._conditions = this.conditions;
        }
    },
    /**
    * Reset modules in the module cache to a pre-processed state so additional
    * computations with a different skin or language will work as expected.
    * @method _resetModules
    * @private
    */
    _resetModules: function() {
        var self = this, i, o,
            mod, name, details;
        for (i in self.moduleInfo) {
            if (self.moduleInfo.hasOwnProperty(i) && self.moduleInfo[i]) {
                mod = self.moduleInfo[i];
                name = mod.name;
                details  = (YUI.Env.mods[name] ? YUI.Env.mods[name].details : null);

                if (details) {
                    self.moduleInfo[name]._reset = true;
                    self.moduleInfo[name].requires = details.requires || [];
                    self.moduleInfo[name].optional = details.optional || [];
                    self.moduleInfo[name].supersedes = details.supercedes || [];
                }

                if (mod.defaults) {
                    for (o in mod.defaults) {
                        if (mod.defaults.hasOwnProperty(o)) {
                            if (mod[o]) {
                                mod[o] = mod.defaults[o];
                            }
                        }
                    }
                }
                mod.langCache = undefined;
                mod.skinCache = undefined;
                if (mod.skinnable) {
                    self._addSkin(self.skin.defaultSkin, mod.name);
                }
            }
        }
    },
    /**
    Regex that matches a CSS URL. Used to guess the file type when it's not
    specified.

    @property REGEX_CSS
    @type RegExp
    @final
    @protected
    @since 3.5.0
    **/
    REGEX_CSS: /\.css(?:[?;].*)?$/i,

    /**
    * Default filters for raw and debug
    * @property FILTER_DEFS
    * @type Object
    * @final
    * @protected
    */
    FILTER_DEFS: {
        RAW: {
            'searchExp': '-min\\.js',
            'replaceStr': '.js'
        },
        DEBUG: {
            'searchExp': '-min\\.js',
            'replaceStr': '-debug.js'
        },
        COVERAGE: {
            'searchExp': '-min\\.js',
            'replaceStr': '-coverage.js'
        }
    },
    /*
    * Check the pages meta-data and cache the result.
    * @method _inspectPage
    * @private
    */
    _inspectPage: function() {
        var self = this, v, m, req, mr, i;

        for (i in ON_PAGE) {
            if (ON_PAGE.hasOwnProperty(i)) {
                v = ON_PAGE[i];
                if (v.details) {
                    m = self.getModuleInfo(v.name);
                    req = v.details.requires;
                    mr = m && m.requires;

                   if (m) {
                       if (!m._inspected && req && mr.length !== req.length) {
                           // console.log('deleting ' + m.name);
                           delete m.expanded;
                       }
                   } else {
                       m = self.addModule(v.details, i);
                   }
                   m._inspected = true;
               }
            }
        }
    },
    /*
    * returns true if b is not loaded, and is required directly or by means of modules it supersedes.
    * @private
    * @method _requires
    * @param {String} mod1 The first module to compare
    * @param {String} mod2 The second module to compare
    */
   _requires: function(mod1, mod2) {

        var i, rm, after_map, s,
            m = this.getModuleInfo(mod1),
            other = this.getModuleInfo(mod2);

        if (!m || !other) {
            return false;
        }

        rm = m.expanded_map;
        after_map = m.after_map;

        // check if this module should be sorted after the other
        // do this first to short circut circular deps
        if (after_map && (mod2 in after_map)) {
            return true;
        }

        after_map = other.after_map;

        // and vis-versa
        if (after_map && (mod1 in after_map)) {
            return false;
        }

        // check if this module requires one the other supersedes
        s = other.supersedes;
        if (s) {
            for (i = 0; i < s.length; i++) {
                if (this._requires(mod1, s[i])) {
                    return true;
                }
            }
        }

        s = m.supersedes;
        if (s) {
            for (i = 0; i < s.length; i++) {
                if (this._requires(mod2, s[i])) {
                    return false;
                }
            }
        }

        // check if this module requires the other directly
        // if (r && yArray.indexOf(r, mod2) > -1) {
        if (rm && (mod2 in rm)) {
            return true;
        }

        // external css files should be sorted below yui css
        if (m.ext && m.type === CSS && !other.ext && other.type === CSS) {
            return true;
        }

        return false;
    },
    /**
    * Apply a new config to the Loader instance
    * @method _config
    * @private
    * @param {Object} o The new configuration
    */
    _config: function(o) {
        var i, j, val, a, f, group, groupName, self = this,
            mods = [], mod, modInfo;
        // apply config values
        if (o) {
            for (i in o) {
                if (o.hasOwnProperty(i)) {
                    val = o[i];
                    //TODO This should be a case
                    if (i === 'require') {
                        self.require(val);
                    } else if (i === 'skin') {
                        //If the config.skin is a string, format to the expected object
                        if (typeof val === 'string') {
                            self.skin.defaultSkin = o.skin;
                            val = {
                                defaultSkin: val
                            };
                        }

                        Y.mix(self.skin, val, true);
                    } else if (i === 'groups') {
                        for (j in val) {
                            if (val.hasOwnProperty(j)) {
                                // Y.log('group: ' + j);
                                groupName = j;
                                group = val[j];
                                self.addGroup(group, groupName);
                                if (group.aliases) {
                                    for (a in group.aliases) {
                                        if (group.aliases.hasOwnProperty(a)) {
                                            self.addAlias(group.aliases[a], a);
                                        }
                                    }
                                }
                            }
                        }

                    } else if (i === 'modules') {
                        // add a hash of module definitions
                        for (j in val) {
                            if (val.hasOwnProperty(j)) {
                                self.addModule(val[j], j);
                            }
                        }
                    } else if (i === 'aliases') {
                        for (j in val) {
                            if (val.hasOwnProperty(j)) {
                                self.addAlias(val[j], j);
                            }
                        }
                    } else if (i === 'gallery') {
                        if (this.groups.gallery.update) {
                            this.groups.gallery.update(val, o);
                        }
                    } else if (i === 'yui2' || i === '2in3') {
                        if (this.groups.yui2.update) {
                            this.groups.yui2.update(o['2in3'], o.yui2, o);
                        }
                    } else {
                        self[i] = val;
                    }
                }
            }
        }

        // fix filter
        f = self.filter;

        if (L.isString(f)) {
            f = f.toUpperCase();
            self.filterName = f;
            self.filter = self.FILTER_DEFS[f];
            if (f === 'DEBUG') {
                self.require('yui-log', 'dump');
            }
        }

        if (self.filterName && self.coverage) {
            if (self.filterName === 'COVERAGE' && L.isArray(self.coverage) && self.coverage.length) {
                for (i = 0; i < self.coverage.length; i++) {
                    mod = self.coverage[i];
                    modInfo = self.getModuleInfo(mod);
                    if (modInfo && modInfo.use) {
                        mods = mods.concat(modInfo.use);
                    } else {
                        mods.push(mod);
                    }
                }
                self.filters = self.filters || {};
                Y.Array.each(mods, function(mod) {
                    self.filters[mod] = self.FILTER_DEFS.COVERAGE;
                });
                self.filterName = 'RAW';
                self.filter = self.FILTER_DEFS[self.filterName];
            }
        }

    },

    /**
     * Returns the skin module name for the specified skin name.  If a
     * module name is supplied, the returned skin module name is
     * specific to the module passed in.
     * @method formatSkin
     * @param {string} skin the name of the skin.
     * @param {string} mod optional: the name of a module to skin.
     * @return {string} the full skin module name.
     */
    formatSkin: function(skin, mod) {
        var s = SKIN_PREFIX + skin;
        if (mod) {
            s = s + '-' + mod;
        }

        return s;
    },

    /**
     * Adds the skin def to the module info
     * @method _addSkin
     * @param {string} skin the name of the skin.
     * @param {string} mod the name of the module.
     * @param {string} parent parent module if this is a skin of a
     * submodule or plugin.
     * @return {string} the module name for the skin.
     * @private
     */
    _addSkin: function(skin, mod, parent) {
        var pkg, name, nmod,
            sinf = this.skin,
            mdef = mod && this.getModuleInfo(mod),
            ext = mdef && mdef.ext;

        // Add a module definition for the module-specific skin css
        if (mod) {
            name = this.formatSkin(skin, mod);
            if (!this.getModuleInfo(name)) {
                pkg = mdef.pkg || mod;
                nmod = {
                    skin: true,
                    name: name,
                    group: mdef.group,
                    type: 'css',
                    after: sinf.after,
                    path: (parent || pkg) + '/' + sinf.base + skin +
                          '/' + mod + '.css',
                    ext: ext
                };
                if (mdef.base) {
                    nmod.base = mdef.base;
                }
                if (mdef.configFn) {
                    nmod.configFn = mdef.configFn;
                }
                this.addModule(nmod, name);

                Y.log('Adding skin (' + name + '), ' + parent + ', ' + pkg + ', ' + nmod.path, 'info', 'loader');
            }
        }

        return name;
    },
    /**
    * Adds an alias module to the system
    * @method addAlias
    * @param {Array} use An array of modules that makes up this alias
    * @param {String} name The name of the alias
    * @example
    *       var loader = new Y.Loader({});
    *       loader.addAlias([ 'node', 'yql' ], 'davglass');
    *       loader.require(['davglass']);
    *       var out = loader.resolve(true);
    *
    *       //out.js will contain Node and YQL modules
    */
    addAlias: function(use, name) {
        YUI.Env.aliases[name] = use;
        this.addModule({
            name: name,
            use: use
        });
    },
    /**
     * Add a new module group
     * @method addGroup
     * @param {Object} config An object containing the group configuration data
     * @param {String} config.name required, the group name
     * @param {String} config.base The base directory for this module group
     * @param {String} config.root The root path to add to each combo resource path
     * @param {Boolean} config.combine Should the request be combined
     * @param {String} config.comboBase Combo service base path
     * @param {Object} config.modules The group of modules
     * @param {String} name the group name.
     * @example
     *      var loader = new Y.Loader({});
     *      loader.addGroup({
     *          name: 'davglass',
     *          combine: true,
     *          comboBase: '/combo?',
     *          root: '',
     *          modules: {
     *              //Module List here
     *          }
     *      }, 'davglass');
     */
    addGroup: function(o, name) {
        var mods = o.modules,
            self = this,
            defaultBase = o.defaultBase || Y.config.defaultBase,
            i, v;

        name = name || o.name;
        o.name = name;
        self.groups[name] = o;

        if (!o.base && defaultBase && o.root) {
            o.base = defaultBase + o.root;
        }

        if (o.patterns) {
            for (i in o.patterns) {
                if (o.patterns.hasOwnProperty(i)) {
                    o.patterns[i].group = name;
                    self.patterns[i] = o.patterns[i];
                }
            }
        }

        if (mods) {
            for (i in mods) {
                if (mods.hasOwnProperty(i)) {
                    v = mods[i];
                    if (typeof v === 'string') {
                        v = { name: i, fullpath: v };
                    }
                    v.group = name;
                    self.addModule(v, i);
                }
            }
        }
    },

    /**
     * Add a new module to the component metadata.
     * @method addModule
     * @param {Object} config An object containing the module data.
     * @param {String} config.name Required, the component name
     * @param {String} config.type Required, the component type (js or css)
     * @param {String} config.path Required, the path to the script from `base`
     * @param {Array} config.requires Array of modules required by this component
     * @param {Array} [config.optional] Array of optional modules for this component
     * @param {Array} [config.supersedes] Array of the modules this component replaces
     * @param {Array} [config.after] Array of modules the components which, if present, should be sorted above this one
     * @param {Object} [config.after_map] Faster alternative to 'after' -- supply a hash instead of an array
     * @param {Number} [config.rollup] The number of superseded modules required for automatic rollup
     * @param {String} [config.fullpath] If `fullpath` is specified, this is used instead of the configured `base + path`
     * @param {Boolean} [config.skinnable] Flag to determine if skin assets should automatically be pulled in
     * @param {Object} [config.submodules] Hash of submodules
     * @param {String} [config.group] The group the module belongs to -- this is set automatically when it is added as part of a group configuration.
     * @param {Array} [config.lang] Array of BCP 47 language tags of languages for which this module has localized resource bundles, e.g., `["en-GB", "zh-Hans-CN"]`
     * @param {Object} [config.condition] Specifies that the module should be loaded automatically if a condition is met. This is an object with up to four fields:
     * @param {String} [config.condition.trigger] The name of a module that can trigger the auto-load
     * @param {Function} [config.condition.test] A function that returns true when the module is to be loaded.
     * @param {String} [config.condition.ua] The UA name of <a href="UA.html">Y.UA</a> object that returns true when the module is to be loaded. e.g., `"ie"`, `"nodejs"`.
     * @param {String} [config.condition.when] Specifies the load order of the conditional module
     *  with regard to the position of the trigger module.
     *  This should be one of three values: `before`, `after`, or `instead`.  The default is `after`.
     * @param {Object} [config.testresults] A hash of test results from `Y.Features.all()`
     * @param {Function} [config.configFn] A function to exectute when configuring this module
     * @param {Object} config.configFn.mod The module config, modifying this object will modify it's config. Returning false will delete the module's config.
     * @param {String[]} [config.optionalRequires] List of dependencies that
        may optionally be loaded by this loader. This is targeted mostly at
        polyfills, since they should not be in the list of requires because
        polyfills are assumed to be available in the global scope.
     * @param {Function} [config.test] Test to be called when this module is
        added as an optional dependency of another module. If the test function
        returns `false`, the module will be ignored and will not be attached to
        this YUI instance.
     * @param {String} [name] The module name, required if not in the module data.
     * @return {Object} the module definition or null if the object passed in did not provide all required attributes.
     */
    addModule: function(o, name) {
        name = name || o.name;

        if (typeof o === 'string') {
            o = { name: name, fullpath: o };
        }


        var subs, i, l, t, sup, s, smod, plugins, plug,
            j, langs, packName, supName, flatSup, flatLang, lang, ret,
            overrides, skinname, when, g, p,
            modInfo = this.moduleInfo[name],
            conditions = this.conditions, trigger;

        //Only merge this data if the temp flag is set
        //from an earlier pass from a pattern or else
        //an override module (YUI_config) can not be used to
        //replace a default module.
        if (modInfo && modInfo.temp) {
            //This catches temp modules loaded via a pattern
            // The module will be added twice, once from the pattern and
            // Once from the actual add call, this ensures that properties
            // that were added to the module the first time around (group: gallery)
            // are also added the second time around too.
            o = Y.merge(modInfo, o);
        }

        o.name = name;

        if (!o || !o.name) {
            return null;
        }

        if (!o.type) {
            //Always assume it's javascript unless the CSS pattern is matched.
            o.type = JS;
            p = o.path || o.fullpath;
            if (p && this.REGEX_CSS.test(p)) {
                Y.log('Auto determined module type as CSS', 'warn', 'loader');
                o.type = CSS;
            }
        }

        if (!o.path && !o.fullpath) {
            o.path = _path(name, name, o.type);
        }
        o.supersedes = o.supersedes || o.use;

        o.ext = ('ext' in o) ? o.ext : (this._internal) ? false : true;

        // Handle submodule logic
        subs = o.submodules;

        this.moduleInfo[name] = o;

        o.requires = o.requires || [];

        /*
        Only allowing the cascade of requires information, since
        optional and supersedes are far more fine grained than
        a blanket requires is.
        */
        if (this.requires) {
            for (i = 0; i < this.requires.length; i++) {
                o.requires.push(this.requires[i]);
            }
        }
        if (o.group && this.groups && this.groups[o.group]) {
            g = this.groups[o.group];
            if (g.requires) {
                for (i = 0; i < g.requires.length; i++) {
                    o.requires.push(g.requires[i]);
                }
            }
        }


        if (!o.defaults) {
            o.defaults = {
                requires: o.requires ? [].concat(o.requires) : null,
                supersedes: o.supersedes ? [].concat(o.supersedes) : null,
                optional: o.optional ? [].concat(o.optional) : null
            };
        }

        if (o.skinnable && o.ext && o.temp) {
            skinname = this._addSkin(this.skin.defaultSkin, name);
            o.requires.unshift(skinname);
        }

        if (o.requires.length) {
            o.requires = this.filterRequires(o.requires) || [];
        }

        if (!o.langPack && o.lang) {
            langs = yArray(o.lang);
            for (j = 0; j < langs.length; j++) {
                lang = langs[j];
                packName = this.getLangPackName(lang, name);
                smod = this.getModuleInfo(packName);
                if (!smod) {
                    smod = this._addLangPack(lang, o, packName);
                }
            }
        }


        if (subs) {
            sup = o.supersedes || [];
            l = 0;

            for (i in subs) {
                if (subs.hasOwnProperty(i)) {
                    s = subs[i];

                    s.path = s.path || _path(name, i, o.type);
                    s.pkg = name;
                    s.group = o.group;

                    if (s.supersedes) {
                        sup = sup.concat(s.supersedes);
                    }

                    smod = this.addModule(s, i);
                    sup.push(i);

                    if (smod.skinnable) {
                        o.skinnable = true;
                        overrides = this.skin.overrides;
                        if (overrides && overrides[i]) {
                            for (j = 0; j < overrides[i].length; j++) {
                                skinname = this._addSkin(overrides[i][j],
                                         i, name);
                                sup.push(skinname);
                            }
                        }
                        skinname = this._addSkin(this.skin.defaultSkin,
                                        i, name);
                        sup.push(skinname);
                    }

                    // looks like we are expected to work out the metadata
                    // for the parent module language packs from what is
                    // specified in the child modules.
                    if (s.lang && s.lang.length) {

                        langs = yArray(s.lang);
                        for (j = 0; j < langs.length; j++) {
                            lang = langs[j];
                            packName = this.getLangPackName(lang, name);
                            supName = this.getLangPackName(lang, i);
                            smod = this.getModuleInfo(packName);

                            if (!smod) {
                                smod = this._addLangPack(lang, o, packName);
                            }

                            flatSup = flatSup || yArray.hash(smod.supersedes);

                            if (!(supName in flatSup)) {
                                smod.supersedes.push(supName);
                            }

                            o.lang = o.lang || [];

                            flatLang = flatLang || yArray.hash(o.lang);

                            if (!(lang in flatLang)) {
                                o.lang.push(lang);
                            }

// Y.log('pack ' + packName + ' should supersede ' + supName);
// Add rollup file, need to add to supersedes list too

                            // default packages
                            packName = this.getLangPackName(ROOT_LANG, name);
                            supName = this.getLangPackName(ROOT_LANG, i);

                            smod = this.getModuleInfo(packName);

                            if (!smod) {
                                smod = this._addLangPack(lang, o, packName);
                            }

                            if (!(supName in flatSup)) {
                                smod.supersedes.push(supName);
                            }

// Y.log('pack ' + packName + ' should supersede ' + supName);
// Add rollup file, need to add to supersedes list too

                        }
                    }

                    l++;
                }
            }
            //o.supersedes = YObject.keys(yArray.hash(sup));
            o.supersedes = yArray.dedupe(sup);
            if (this.allowRollup) {
                o.rollup = (l < 4) ? l : Math.min(l - 1, 4);
            }
        }

        plugins = o.plugins;
        if (plugins) {
            for (i in plugins) {
                if (plugins.hasOwnProperty(i)) {
                    plug = plugins[i];
                    plug.pkg = name;
                    plug.path = plug.path || _path(name, i, o.type);
                    plug.requires = plug.requires || [];
                    plug.group = o.group;
                    this.addModule(plug, i);
                    if (o.skinnable) {
                        this._addSkin(this.skin.defaultSkin, i, name);
                    }

                }
            }
        }

        if (o.condition) {
            t = this._expandAliases(o.condition.trigger);
            for (i = 0; i < t.length; i++) {
                trigger = t[i];
                when = o.condition.when;
                conditions[trigger] = conditions[trigger] || {};
                conditions[trigger][name] = o.condition;
                // the 'when' attribute can be 'before', 'after', or 'instead'
                // the default is after.
                if (when && when !== 'after') {
                    if (when === 'instead') { // replace the trigger
                        o.supersedes = o.supersedes || [];
                        o.supersedes.push(trigger);
                    }
                    // before the trigger
                        // the trigger requires the conditional mod,
                        // so it should appear before the conditional
                        // mod if we do not intersede.
                } else { // after the trigger
                    o.after = o.after || [];
                    o.after.push(trigger);
                }
            }
        }

        if (o.supersedes) {
            o.supersedes = this.filterRequires(o.supersedes);
        }

        if (o.after) {
            o.after = this.filterRequires(o.after);
            o.after_map = yArray.hash(o.after);
        }

        // this.dirty = true;

        if (o.configFn) {
            ret = o.configFn(o);
            if (ret === false) {
                Y.log('Config function returned false for ' + name + ', skipping.', 'info', 'loader');
                delete this.moduleInfo[name];
                delete GLOBAL_ENV._renderedMods[name];
                o = null;
            }
        }
        //Add to global cache
        if (o) {
            if (!GLOBAL_ENV._renderedMods) {
                GLOBAL_ENV._renderedMods = {};
            }
            GLOBAL_ENV._renderedMods[name] = Y.mix(GLOBAL_ENV._renderedMods[name] || {}, o);
            GLOBAL_ENV._conditions = conditions;
        }

        return o;
    },

    /**
     * Add a requirement for one or more module
     * @method require
     * @param {string[] | string*} what the modules to load.
     */
    require: function(what) {
        var a = (typeof what === 'string') ? yArray(arguments) : what;
        this.dirty = true;
        this.required = Y.merge(this.required, yArray.hash(this.filterRequires(a)));

        this._explodeRollups();
    },
    /**
    * Grab all the items that were asked for, check to see if the Loader
    * meta-data contains a "use" array. If it doesm remove the asked item and replace it with
    * the content of the "use".
    * This will make asking for: "dd"
    * Actually ask for: "dd-ddm-base,dd-ddm,dd-ddm-drop,dd-drag,dd-proxy,dd-constrain,dd-drop,dd-scroll,dd-drop-plugin"
    * @private
    * @method _explodeRollups
    */
    _explodeRollups: function() {
        var self = this, m, m2, i, a, v, len, len2,
        r = self.required;

        if (!self.allowRollup) {
            for (i in r) {
                if (r.hasOwnProperty(i)) {
                    m = self.getModule(i);
                    if (m && m.use) {
                        len = m.use.length;
                        for (a = 0; a < len; a++) {
                            m2 = self.getModule(m.use[a]);
                            if (m2 && m2.use) {
                                len2 = m2.use.length;
                                for (v = 0; v < len2; v++) {
                                    r[m2.use[v]] = true;
                                }
                            } else {
                                r[m.use[a]] = true;
                            }
                        }
                    }
                }
            }
            self.required = r;
        }

    },
    /**
    * Explodes the required array to remove aliases and replace them with real modules
    * @method filterRequires
    * @param {Array} r The original requires array
    * @return {Array} The new array of exploded requirements
    */
    filterRequires: function(r) {
        if (r) {
            if (!Y.Lang.isArray(r)) {
                r = [r];
            }
            r = Y.Array(r);
            var c = [], i, mod, o, m;

            for (i = 0; i < r.length; i++) {
                mod = this.getModule(r[i]);
                if (mod && mod.use) {
                    for (o = 0; o < mod.use.length; o++) {
                        //Must walk the other modules in case a module is a rollup of rollups (datatype)
                        m = this.getModule(mod.use[o]);
                        if (m && m.use && (m.name !== mod.name)) {
                            c = Y.Array.dedupe([].concat(c, this.filterRequires(m.use)));
                        } else {
                            c.push(mod.use[o]);
                        }
                    }
                } else {
                    c.push(r[i]);
                }
            }
            r = c;
        }
        return r;
    },

    /**
    Returns `true` if the module can be attached to the YUI instance. Runs
    the module's test if there is one and caches its result.

    @method _canBeAttached
    @param {String} module Name of the module to check.
    @return {Boolean} Result of the module's test if it has one, or `true`.
    **/
    _canBeAttached: function (m) {
        m = this.getModule(m);
        if (m && m.test) {
            if (!m.hasOwnProperty('_testResult')) {
                m._testResult = m.test(Y);
            }
            return m._testResult;
        }
        // return `true` for modules not registered as Loader will know what
        // to do with them later on
        return true;
    },

    /**
     * Returns an object containing properties for all modules required
     * in order to load the requested module
     * @method getRequires
     * @param {object}  mod The module definition from moduleInfo.
     * @return {array} the expanded requirement list.
     */
    getRequires: function(mod) {

        if (!mod) {
            //console.log('returning no reqs for ' + mod.name);
            return NO_REQUIREMENTS;
        }

        if (mod._parsed) {
            //console.log('returning requires for ' + mod.name, mod.requires);
            return mod.expanded || NO_REQUIREMENTS;
        }

        //TODO add modue cache here out of scope..

        var i, m, j, length, add, packName, lang, testresults = this.testresults,
            name = mod.name, cond,
            adddef = ON_PAGE[name] && ON_PAGE[name].details,
            optReqs = mod.optionalRequires,
            d, go, def,
            r, old_mod,
            o, skinmod, skindef, skinpar, skinname,
            intl = mod.lang || mod.intl,
            ftests = Y.Features && Y.Features.tests.load,
            hash, reparse;

        // console.log(name);

        // pattern match leaves module stub that needs to be filled out
        if (mod.temp && adddef) {
            old_mod = mod;
            mod = this.addModule(adddef, name);
            mod.group = old_mod.group;
            mod.pkg = old_mod.pkg;
            delete mod.expanded;
        }

        // console.log('cache: ' + mod.langCache + ' == ' + this.lang);

        //If a skin or a lang is different, reparse..
        reparse = !((!this.lang || mod.langCache === this.lang) && (mod.skinCache === this.skin.defaultSkin));

        if (mod.expanded && !reparse) {
            //Y.log('Already expanded ' + name + ', ' + mod.expanded);
            return mod.expanded;
        }

        // Optional dependencies are dependencies that may or may not be
        // available.
        // This feature was designed specifically to be used when transpiling
        // ES6 modules, in order to use polyfills and regular scripts that define
        // global variables without having to import them since they should be
        // available in the global scope.
        if (optReqs) {
            for (i = 0, length = optReqs.length; i < length; i++) {
                if (this._canBeAttached(optReqs[i])) {
                    mod.requires.push(optReqs[i]);
                }
            }
        }

        d = [];
        hash = {};
        r = this.filterRequires(mod.requires);
        if (mod.lang) {
            //If a module has a lang attribute, auto add the intl requirement.
            d.unshift('intl');
            r.unshift('intl');
            intl = true;
        }
        o = this.filterRequires(mod.optional);

        // Y.log("getRequires: " + name + " (dirty:" + this.dirty +
        // ", expanded:" + mod.expanded + ")");

        mod._parsed = true;
        mod.langCache = this.lang;
        mod.skinCache = this.skin.defaultSkin;

        for (i = 0; i < r.length; i++) {
            //Y.log(name + ' requiring ' + r[i], 'info', 'loader');
            if (!hash[r[i]]) {
                d.push(r[i]);
                hash[r[i]] = true;
                m = this.getModule(r[i]);
                if (m) {
                    add = this.getRequires(m);
                    intl = intl || (m.expanded_map &&
                        (INTL in m.expanded_map));
                    for (j = 0; j < add.length; j++) {
                        d.push(add[j]);
                    }
                }
            }
        }

        // get the requirements from superseded modules, if any
        r = this.filterRequires(mod.supersedes);
        if (r) {
            for (i = 0; i < r.length; i++) {
                if (!hash[r[i]]) {
                    // if this module has submodules, the requirements list is
                    // expanded to include the submodules.  This is so we can
                    // prevent dups when a submodule is already loaded and the
                    // parent is requested.
                    if (mod.submodules) {
                        d.push(r[i]);
                    }

                    hash[r[i]] = true;
                    m = this.getModule(r[i]);

                    if (m) {
                        add = this.getRequires(m);
                        intl = intl || (m.expanded_map &&
                            (INTL in m.expanded_map));
                        for (j = 0; j < add.length; j++) {
                            d.push(add[j]);
                        }
                    }
                }
            }
        }

        if (o && this.loadOptional) {
            for (i = 0; i < o.length; i++) {
                if (!hash[o[i]]) {
                    d.push(o[i]);
                    hash[o[i]] = true;
                    m = this.getModuleInfo(o[i]);
                    if (m) {
                        add = this.getRequires(m);
                        intl = intl || (m.expanded_map &&
                            (INTL in m.expanded_map));
                        for (j = 0; j < add.length; j++) {
                            d.push(add[j]);
                        }
                    }
                }
            }
        }

        cond = this.conditions[name];

        if (cond) {
            //Set the module to not parsed since we have conditionals and this could change the dependency tree.
            mod._parsed = false;
            if (testresults && ftests) {
                oeach(testresults, function(result, id) {
                    var condmod = ftests[id].name;
                    if (!hash[condmod] && ftests[id].trigger === name) {
                        if (result && ftests[id]) {
                            hash[condmod] = true;
                            d.push(condmod);
                        }
                    }
                });
            } else {
                for (i in cond) {
                    if (cond.hasOwnProperty(i)) {
                        if (!hash[i]) {
                            def = cond[i];
                            //first see if they've specfied a ua check
                            //then see if they've got a test fn & if it returns true
                            //otherwise just having a condition block is enough
                            go = def && ((!def.ua && !def.test) || (def.ua && Y.UA[def.ua]) ||
                                        (def.test && def.test(Y, r)));

                            if (go) {
                                hash[i] = true;
                                d.push(i);
                                m = this.getModule(i);
                                if (m) {
                                    add = this.getRequires(m);
                                    for (j = 0; j < add.length; j++) {
                                        d.push(add[j]);
                                    }

                                }
                            }
                        }
                    }
                }
            }
        }

        // Create skin modules
        if (mod.skinnable) {
            skindef = this.skin.overrides;
            for (i in YUI.Env.aliases) {
                if (YUI.Env.aliases.hasOwnProperty(i)) {
                    if (Y.Array.indexOf(YUI.Env.aliases[i], name) > -1) {
                        skinpar = i;
                    }
                }
            }
            if (skindef && (skindef[name] || (skinpar && skindef[skinpar]))) {
                skinname = name;
                if (skindef[skinpar]) {
                    skinname = skinpar;
                }
                for (i = 0; i < skindef[skinname].length; i++) {
                    skinmod = this._addSkin(skindef[skinname][i], name);
                    if (!this.isCSSLoaded(skinmod, this._boot)) {
                        d.push(skinmod);
                    }
                }
            } else {
                skinmod = this._addSkin(this.skin.defaultSkin, name);
                if (!this.isCSSLoaded(skinmod, this._boot)) {
                    d.push(skinmod);
                }
            }
        }

        mod._parsed = false;

        if (intl) {

            if (mod.lang && !mod.langPack && Y.Intl) {
                lang = Y.Intl.lookupBestLang(this.lang || ROOT_LANG, mod.lang);
                //Y.log('Best lang: ' + lang + ', this.lang: ' + this.lang + ', mod.lang: ' + mod.lang);
                packName = this.getLangPackName(lang, name);
                if (packName) {
                    d.unshift(packName);
                }
            }
            d.unshift(INTL);
        }

        mod.expanded_map = yArray.hash(d);

        mod.expanded = YObject.keys(mod.expanded_map);

        return mod.expanded;
    },
    /**
    * Check to see if named css module is already loaded on the page
    * @method isCSSLoaded
    * @param {String} name The name of the css file
    * @param {Boolean} skip To skip the short-circuit for ignoreRegister
    * @return Boolean
    */
    isCSSLoaded: function(name, skip) {
        //TODO - Make this call a batching call with name being an array
        if (!name || !YUI.Env.cssStampEl || (!skip && this.ignoreRegistered)) {
            Y.log('isCSSLoaded was skipped for ' + name, 'warn', 'loader');
            return false;
        }
        var el = YUI.Env.cssStampEl,
            ret = false,
            mod = YUI.Env._cssLoaded[name],
            style = el.currentStyle; //IE


        if (mod !== undefined) {
            //Y.log('isCSSLoaded was cached for ' + name, 'warn', 'loader');
            return mod;
        }

        //Add the classname to the element
        el.className = name;

        if (!style) {
            style = Y.config.doc.defaultView.getComputedStyle(el, null);
        }

        if (style && style.display === 'none') {
            ret = true;
        }

        Y.log('Has Skin? ' + name + ' : ' + ret, 'info', 'loader');

        el.className = ''; //Reset the classname to ''

        YUI.Env._cssLoaded[name] = ret;

        return ret;
    },

    /**
     * Returns a hash of module names the supplied module satisfies.
     * @method getProvides
     * @param {string} name The name of the module.
     * @return {object} what this module provides.
     */
    getProvides: function(name) {
        var m = this.getModule(name), o, s;
            // supmap = this.provides;

        if (!m) {
            return NOT_FOUND;
        }

        if (m && !m.provides) {
            o = {};
            s = m.supersedes;

            if (s) {
                yArray.each(s, function(v) {
                    Y.mix(o, this.getProvides(v));
                }, this);
            }

            o[name] = true;
            m.provides = o;

        }

        return m.provides;
    },

    /**
     * Calculates the dependency tree, the result is stored in the sorted
     * property.
     * @method calculate
     * @param {object} o optional options object.
     * @param {string} type optional argument to prune modules.
     */
    calculate: function(o, type) {
        if (o || type || this.dirty) {

            if (o) {
                this._config(o);
            }

            if (!this._init) {
                this._setup();
            }

            this._explode();

            if (this.allowRollup) {
                this._rollup();
            } else {
                this._explodeRollups();
            }
            this._reduce();
            this._sort();
        }
    },
    /**
    * Creates a "psuedo" package for languages provided in the lang array
    * @method _addLangPack
    * @private
    * @param {String} lang The language to create
    * @param {Object} m The module definition to create the language pack around
    * @param {String} packName The name of the package (e.g: lang/datatype-date-en-US)
    * @return {Object} The module definition
    */
    _addLangPack: function(lang, m, packName) {
        var name = m.name,
            packPath, conf,
            existing = this.getModuleInfo(packName);

        if (!existing) {

            packPath = _path((m.pkg || name), packName, JS, true);

            conf = {
                path: packPath,
                intl: true,
                langPack: true,
                ext: m.ext,
                group: m.group,
                supersedes: []
            };
            if (m.root) {
                conf.root = m.root;
            }
            if (m.base) {
                conf.base = m.base;
            }

            if (m.configFn) {
                conf.configFn = m.configFn;
            }

            this.addModule(conf, packName);

            if (lang) {
                Y.Env.lang = Y.Env.lang || {};
                Y.Env.lang[lang] = Y.Env.lang[lang] || {};
                Y.Env.lang[lang][name] = true;
            }
        }

        return this.getModuleInfo(packName);
    },

    /**
     * Investigates the current YUI configuration on the page.  By default,
     * modules already detected will not be loaded again unless a force
     * option is encountered.  Called by calculate()
     * @method _setup
     * @private
     */
    _setup: function() {
        var info = this.moduleInfo, name, i, j, m, l,
            packName;

        for (name in info) {
            if (info.hasOwnProperty(name)) {
                m = info[name];
                if (m) {

                    // remove dups
                    //m.requires = YObject.keys(yArray.hash(m.requires));
                    m.requires = yArray.dedupe(m.requires);

                    // Create lang pack modules
                    //if (m.lang && m.lang.length) {
                    if (m.lang) {
                        // Setup root package if the module has lang defined,
                        // it needs to provide a root language pack
                        packName = this.getLangPackName(ROOT_LANG, name);
                        this._addLangPack(null, m, packName);
                    }

                }
            }
        }


        //l = Y.merge(this.inserted);
        l = {};

        // available modules
        if (!this.ignoreRegistered) {
            Y.mix(l, GLOBAL_ENV.mods);
        }

        // add the ignore list to the list of loaded packages
        if (this.ignore) {
            Y.mix(l, yArray.hash(this.ignore));
        }

        // expand the list to include superseded modules
        for (j in l) {
            if (l.hasOwnProperty(j)) {
                Y.mix(l, this.getProvides(j));
            }
        }

        // remove modules on the force list from the loaded list
        if (this.force) {
            for (i = 0; i < this.force.length; i++) {
                if (this.force[i] in l) {
                    delete l[this.force[i]];
                }
            }
        }

        Y.mix(this.loaded, l);

        this._init = true;
    },

    /**
     * Builds a module name for a language pack
     * @method getLangPackName
     * @param {string} lang the language code.
     * @param {string} mname the module to build it for.
     * @return {string} the language pack module name.
     */
    getLangPackName: function(lang, mname) {
        return ('lang/' + mname + ((lang) ? '_' + lang : ''));
    },
    /**
     * Inspects the required modules list looking for additional
     * dependencies.  Expands the required list to include all
     * required modules.  Called by calculate()
     * @method _explode
     * @private
     */
    _explode: function() {
        //TODO Move done out of scope
        var r = this.required, m, reqs, done = {},
            self = this, name, expound;

        // the setup phase is over, all modules have been created
        self.dirty = false;

        self._explodeRollups();
        r = self.required;

        for (name in r) {
            if (r.hasOwnProperty(name)) {
                if (!done[name]) {
                    done[name] = true;
                    m = self.getModule(name);
                    if (m) {
                        expound = m.expound;

                        if (expound) {
                            r[expound] = self.getModule(expound);
                            reqs = self.getRequires(r[expound]);
                            Y.mix(r, yArray.hash(reqs));
                        }

                        reqs = self.getRequires(m);
                        Y.mix(r, yArray.hash(reqs));
                    }
                }
            }
        }

        // Y.log('After explode: ' + YObject.keys(r));
    },
    /**
    * The default method used to test a module against a pattern
    * @method _patternTest
    * @private
    * @param {String} mname The module being tested
    * @param {String} pname The pattern to match
    */
    _patternTest: function(mname, pname) {
        return (mname.indexOf(pname) > -1);
    },
    /**
    * Get's the loader meta data for the requested module
    * @method getModule
    * @param {String} mname The module name to get
    * @return {Object} The module metadata
    */
    getModule: function(mname) {
        //TODO: Remove name check - it's a quick hack to fix pattern WIP
        if (!mname) {
            return null;
        }

        var p, found, pname,
            m = this.getModuleInfo(mname),
            patterns = this.patterns;

        // check the patterns library to see if we should automatically add
        // the module with defaults
        if (!m || (m && m.ext)) {
           // Y.log('testing patterns ' + YObject.keys(patterns));
            for (pname in patterns) {
                if (patterns.hasOwnProperty(pname)) {
                    // Y.log('testing pattern ' + i);
                    p = patterns[pname];

                    //There is no test method, create a default one that tests
                    // the pattern against the mod name
                    if (!p.test) {
                        p.test = this._patternTest;
                    }

                    if (p.test(mname, pname)) {
                        // use the metadata supplied for the pattern
                        // as the module definition.
                        found = p;
                        break;
                    }
                }
            }
        }

        if (!m) {
            if (found) {
                if (p.action) {
                    // Y.log('executing pattern action: ' + pname);
                    p.action.call(this, mname, pname);
                } else {
Y.log('Undefined module: ' + mname + ', matched a pattern: ' +
    pname, 'info', 'loader');
                    // ext true or false?
                    m = this.addModule(Y.merge(found, {
                        test: void 0,
                        temp: true
                    }), mname);
                    if (m && found.configFn) {
                        m.configFn = found.configFn;
                    }
                }
            }
        } else {
            if (found && m && found.configFn && !m.configFn) {
                m.configFn = found.configFn;
                m.configFn(m);
            }
        }

        return m;
    },

    // impl in rollup submodule
    _rollup: function() { },

    /**
     * Remove superceded modules and loaded modules.  Called by
     * calculate() after we have the mega list of all dependencies
     * @method _reduce
     * @return {object} the reduced dependency hash.
     * @private
     */
    _reduce: function(r) {

        r = r || this.required;

        var i, j, s, m, type = this.loadType,
        ignore = this.ignore ? yArray.hash(this.ignore) : false;

        for (i in r) {
            if (r.hasOwnProperty(i)) {
                m = this.getModule(i);
                // remove if already loaded
                if (((this.loaded[i] || ON_PAGE[i]) &&
                        !this.forceMap[i] && !this.ignoreRegistered) ||
                        (type && m && m.type !== type)) {
                    delete r[i];
                }
                if (ignore && ignore[i]) {
                    delete r[i];
                }
                // remove anything this module supersedes
                s = m && m.supersedes;
                if (s) {
                    for (j = 0; j < s.length; j++) {
                        if (s[j] in r) {
                            delete r[s[j]];
                        }
                    }
                }
            }
        }

        return r;
    },
    /**
    * Handles the queue when a module has been loaded for all cases
    * @method _finish
    * @private
    * @param {String} msg The message from Loader
    * @param {Boolean} success A boolean denoting success or failure
    */
    _finish: function(msg, success) {
        Y.log('loader finishing: ' + msg + ', ' + Y.id + ', ' +
            this.data, 'info', 'loader');

        _queue.running = false;

        var onEnd = this.onEnd;
        if (onEnd) {
            onEnd.call(this.context, {
                msg: msg,
                data: this.data,
                success: success
            });
        }
        this._continue();
    },
    /**
    * The default Loader onSuccess handler, calls this.onSuccess with a payload
    * @method _onSuccess
    * @private
    */
    _onSuccess: function() {
        var self = this, skipped = Y.merge(self.skipped), fn,
            failed = [], rreg = self.requireRegistration,
            success, msg, i, mod;

        for (i in skipped) {
            if (skipped.hasOwnProperty(i)) {
                delete self.inserted[i];
            }
        }

        self.skipped = {};

        for (i in self.inserted) {
            if (self.inserted.hasOwnProperty(i)) {
                mod = self.getModule(i);
                if (mod && rreg && mod.type === JS && !(i in YUI.Env.mods)) {
                    failed.push(i);
                } else {
                    Y.mix(self.loaded, self.getProvides(i));
                }
            }
        }

        fn = self.onSuccess;
        msg = (failed.length) ? 'notregistered' : 'success';
        success = !(failed.length);
        if (fn) {
            fn.call(self.context, {
                msg: msg,
                data: self.data,
                success: success,
                failed: failed,
                skipped: skipped
            });
        }
        self._finish(msg, success);
    },
    /**
    * The default Loader onProgress handler, calls this.onProgress with a payload
    * @method _onProgress
    * @private
    */
    _onProgress: function(e) {
        var self = this, i;
        //set the internal cache to what just came in.
        if (e.data && e.data.length) {
            for (i = 0; i < e.data.length; i++) {
                e.data[i] = self.getModule(e.data[i].name);
            }
        }
        if (self.onProgress) {
            self.onProgress.call(self.context, {
                name: e.url,
                data: e.data
            });
        }
    },
    /**
    * The default Loader onFailure handler, calls this.onFailure with a payload
    * @method _onFailure
    * @private
    */
    _onFailure: function(o) {
        var f = this.onFailure, msg = [], i = 0, len = o.errors.length;

        for (i; i < len; i++) {
            msg.push(o.errors[i].error);
        }

        msg = msg.join(',');

        Y.log('load error: ' + msg + ', ' + Y.id, 'error', 'loader');

        if (f) {
            f.call(this.context, {
                msg: msg,
                data: this.data,
                success: false
            });
        }

        this._finish(msg, false);

    },

    /**
    * The default Loader onTimeout handler, calls this.onTimeout with a payload
    * @method _onTimeout
    * @param {Get.Transaction} transaction The Transaction object from `Y.Get`
    * @private
    */
    _onTimeout: function(transaction) {
        Y.log('loader timeout: ' + Y.id, 'error', 'loader');
        var f = this.onTimeout;
        if (f) {
            f.call(this.context, {
                msg: 'timeout',
                data: this.data,
                success: false,
                transaction: transaction
            });
        }
    },

    /**
     * Sorts the dependency tree.  The last step of calculate()
     * @method _sort
     * @private
     */
    _sort: function() {
        var name,

            // Object containing module names.
            required = this.required,

            // Keep track of whether we've visited a module.
            visited = {};

        // Will contain modules names, in the correct order,
        // according to dependencies.
        this.sorted = [];

        for (name in required) {
            if (!visited[name] && required.hasOwnProperty(name)) {
                this._visit(name, visited);
            }
        }
    },

    /**
     * Recursively visits the dependencies of the module name
     * passed in, and appends each module name to the `sorted` property.
     * @param {String} name The name of a module.
     * @param {Object} visited Keeps track of whether a module was visited.
     * @method _visit
     * @private
     */
    _visit: function (name, visited) {
        var required, condition, moduleInfo, dependency, dependencies,
            trigger, isAfter, i, l;

        visited[name] = true;
        required = this.required;
        moduleInfo = this.moduleInfo[name];
        condition = this.conditions[name] || {};

        if (moduleInfo) {
            // Recurse on each dependency of this module,
            // figuring out its dependencies, and so on.
            dependencies = moduleInfo.expanded || moduleInfo.requires;

            for (i = 0, l = dependencies.length; i < l; ++i) {
                dependency = dependencies[i];
                trigger = condition[dependency];

                // We cannot process this dependency yet if it must
                // appear after our current module.
                isAfter = trigger && (!trigger.when || trigger.when === "after");

                // Is this module name in the required list of modules,
                // and have we not already visited it?
                if (required[dependency] && !visited[dependency] && !isAfter) {
                    this._visit(dependency, visited);
                }
            }
        }

        this.sorted.push(name);
    },

    /**
    * Handles the actual insertion of script/link tags
    * @method _insert
    * @private
    * @param {Object} source The YUI instance the request came from
    * @param {Object} o The metadata to include
    * @param {String} type JS or CSS
    * @param {Boolean} [skipcalc=false] Do a Loader.calculate on the meta
    */
    _insert: function(source, o, type, skipcalc) {

        Y.log('private _insert() ' + (type || '') + ', ' + Y.id, "info", "loader");

        // restore the state at the time of the request
        if (source) {
            this._config(source);
        }

        // build the dependency list
        // don't include type so we can process CSS and script in
        // one pass when the type is not specified.

        var modules = this.resolve(!skipcalc),
            self = this, comp = 0, actions = 0,
            mods = {}, deps, complete;

        self._refetch = [];

        if (type) {
            //Filter out the opposite type and reset the array so the checks later work
            modules[((type === JS) ? CSS : JS)] = [];
        }
        if (!self.fetchCSS) {
            modules.css = [];
        }
        if (modules.js.length) {
            comp++;
        }
        if (modules.css.length) {
            comp++;
        }

        //console.log('Resolved Modules: ', modules);

        complete = function(d) {
            actions++;
            var errs = {}, i = 0, o = 0, u = '', fn,
                modName, resMods;

            if (d && d.errors) {
                for (i = 0; i < d.errors.length; i++) {
                    if (d.errors[i].request) {
                        u = d.errors[i].request.url;
                    } else {
                        u = d.errors[i];
                    }
                    errs[u] = u;
                }
            }

            if (d && d.data && d.data.length && (d.type === 'success')) {
                for (i = 0; i < d.data.length; i++) {
                    self.inserted[d.data[i].name] = true;
                    //If the external module has a skin or a lang, reprocess it
                    if (d.data[i].lang || d.data[i].skinnable) {
                        delete self.inserted[d.data[i].name];
                        self._refetch.push(d.data[i].name);
                    }
                }
            }

            if (actions === comp) {
                self._loading = null;
                Y.log('Loader actions complete!', 'info', 'loader');
                if (self._refetch.length) {
                    //Get the deps for the new meta-data and reprocess
                    Y.log('Found potential modules to refetch', 'info', 'loader');
                    for (i = 0; i < self._refetch.length; i++) {
                        deps = self.getRequires(self.getModule(self._refetch[i]));
                        for (o = 0; o < deps.length; o++) {
                            if (!self.inserted[deps[o]]) {
                                //We wouldn't be to this point without the module being here
                                mods[deps[o]] = deps[o];
                            }
                        }
                    }
                    mods = Y.Object.keys(mods);
                    if (mods.length) {
                        Y.log('Refetching modules with new meta-data', 'info', 'loader');
                        self.require(mods);
                        resMods = self.resolve(true);
                        if (resMods.cssMods.length) {
                            for (i=0; i <  resMods.cssMods.length; i++) {
                                modName = resMods.cssMods[i].name;
                                delete YUI.Env._cssLoaded[modName];
                                if (self.isCSSLoaded(modName)) {
                                    self.inserted[modName] = true;
                                    delete self.required[modName];
                                }
                            }
                            self.sorted = [];
                            self._sort();
                        }
                        d = null; //bail
                        self._insert(); //insert the new deps
                    }
                }
                if (d && d.fn) {
                    Y.log('Firing final Loader callback!', 'info', 'loader');
                    fn = d.fn;
                    delete d.fn;
                    fn.call(self, d);
                }
            }
        };

        this._loading = true;

        if (!modules.js.length && !modules.css.length) {
            Y.log('No modules resolved..', 'warn', 'loader');
            actions = -1;
            complete({
                fn: self._onSuccess
            });
            return;
        }


        if (modules.css.length) { //Load CSS first
            Y.log('Loading CSS modules', 'info', 'loader');
            Y.Get.css(modules.css, {
                data: modules.cssMods,
                attributes: self.cssAttributes,
                insertBefore: self.insertBefore,
                charset: self.charset,
                timeout: self.timeout,
                context: self,
                onProgress: function(e) {
                    self._onProgress.call(self, e);
                },
                onTimeout: function(d) {
                    self._onTimeout.call(self, d);
                },
                onSuccess: function(d) {
                    d.type = 'success';
                    d.fn = self._onSuccess;
                    complete.call(self, d);
                },
                onFailure: function(d) {
                    d.type = 'failure';
                    d.fn = self._onFailure;
                    complete.call(self, d);
                }
            });
        }

        if (modules.js.length) {
            Y.log('Loading JS modules', 'info', 'loader');
            Y.Get.js(modules.js, {
                data: modules.jsMods,
                insertBefore: self.insertBefore,
                attributes: self.jsAttributes,
                charset: self.charset,
                timeout: self.timeout,
                autopurge: false,
                context: self,
                async: self.async,
                onProgress: function(e) {
                    self._onProgress.call(self, e);
                },
                onTimeout: function(d) {
                    self._onTimeout.call(self, d);
                },
                onSuccess: function(d) {
                    d.type = 'success';
                    d.fn = self._onSuccess;
                    complete.call(self, d);
                },
                onFailure: function(d) {
                    d.type = 'failure';
                    d.fn = self._onFailure;
                    complete.call(self, d);
                }
            });
        }
    },
    /**
    * Once a loader operation is completely finished, process any additional queued items.
    * @method _continue
    * @private
    */
    _continue: function() {
        if (!(_queue.running) && _queue.size() > 0) {
            _queue.running = true;
            _queue.next()();
        }
    },

    /**
     * inserts the requested modules and their dependencies.
     * <code>type</code> can be "js" or "css".  Both script and
     * css are inserted if type is not provided.
     * @method insert
     * @param {object} o optional options object.
     * @param {string} type the type of dependency to insert.
     */
    insert: function(o, type, skipsort) {
        Y.log('public insert() ' + (type || '') + ', ' + Y.Object.keys(this.required), "info", "loader");
        var self = this, copy = Y.merge(this);
        delete copy.require;
        delete copy.dirty;
        _queue.add(function() {
            self._insert(copy, o, type, skipsort);
        });
        this._continue();
    },

    /**
     * Executed every time a module is loaded, and if we are in a load
     * cycle, we attempt to load the next script.  Public so that it
     * is possible to call this if using a method other than
     * Y.register to determine when scripts are fully loaded
     * @method loadNext
     * @deprecated
     * @param {string} mname optional the name of the module that has
     * been loaded (which is usually why it is time to load the next
     * one).
     */
    loadNext: function() {
        Y.log('loadNext was called..', 'error', 'loader');
        return;
    },

    /**
     * Apply filter defined for this instance to a url/path
     * @method _filter
     * @param {string} u the string to filter.
     * @param {string} name the name of the module, if we are processing
     * a single module as opposed to a combined url.
     * @return {string} the filtered string.
     * @private
     */
    _filter: function(u, name, group) {
        var f = this.filter,
            hasFilter = name && (name in this.filters),
            modFilter = hasFilter && this.filters[name],
            groupName = group || (this.getModuleInfo(name) || {}).group || null;

        if (groupName && this.groups[groupName] && this.groups[groupName].filter) {
            modFilter = this.groups[groupName].filter;
            hasFilter = true;
        }

        if (u) {
            if (hasFilter) {
                f = (L.isString(modFilter)) ? this.FILTER_DEFS[modFilter.toUpperCase()] || null : modFilter;
            }
            if (f) {
                u = u.replace(new RegExp(f.searchExp, 'g'), f.replaceStr);
            }
        }
        return u;
    },

    /**
     * Generates the full url for a module
     * @method _url
     * @param {string} path the path fragment.
     * @param {String} name The name of the module
     * @param {String} [base] The base url to use. Defaults to self.base
     * @return {string} the full url.
     * @private
     */
    _url: function(path, name, base) {
        return this._filter((base || this.base || '') + path, name);
    },
    /**
    * Returns an Object hash of file arrays built from `loader.sorted` or from an arbitrary list of sorted modules.
    * @method resolve
    * @param {Boolean} [calc=false] Perform a loader.calculate() before anything else
    * @param {Array} [sorted=loader.sorted] An override for the loader.sorted array
    * @return {Object} Object hash (js and css) of two arrays of file lists
    * @example This method can be used as an off-line dep calculator
    *
    *        var Y = YUI();
    *        var loader = new Y.Loader({
    *            filter: 'debug',
    *            base: '../../',
    *            root: 'build/',
    *            combine: true,
    *            require: ['node', 'dd', 'console']
    *        });
    *        var out = loader.resolve(true);
    *
    */
    resolve: function(calc, sorted) {
        var self     = this,
            resolved = { js: [], jsMods: [], css: [], cssMods: [] },
            addSingle,
            usePathogen = Y.config.comboLoader && Y.config.customComboBase;

        if (self.skin.overrides || self.skin.defaultSkin !== DEFAULT_SKIN || self.ignoreRegistered) {
            self._resetModules();
        }

        if (calc) {
            self.calculate();
        }
        sorted = sorted || self.sorted;

        addSingle = function(mod) {
            if (mod) {
                var group = (mod.group && self.groups[mod.group]) || NOT_FOUND,
                    url;

                //Always assume it's async
                if (group.async === false) {
                    mod.async = group.async;
                }

                url = (mod.fullpath) ? self._filter(mod.fullpath, mod.name) :
                      self._url(mod.path, mod.name, group.base || mod.base);

                if (mod.attributes || mod.async === false) {
                    url = {
                        url: url,
                        async: mod.async
                    };
                    if (mod.attributes) {
                        url.attributes = mod.attributes;
                    }
                }
                resolved[mod.type].push(url);
                resolved[mod.type + 'Mods'].push(mod);
            } else {
                Y.log('Undefined Module', 'warn', 'loader');
            }

        };

        /*jslint vars: true */
        var inserted     = (self.ignoreRegistered) ? {} : self.inserted,
            comboSources,
            maxURLLength,
            comboMeta,
            comboBase,
            comboSep,
            group,
            mod,
            len,
            i,
            hasComboModule = false;

        /*jslint vars: false */

        for (i = 0, len = sorted.length; i < len; i++) {
            mod = self.getModule(sorted[i]);
            if (!mod || inserted[mod.name]) {
                continue;
            }

            group = self.groups[mod.group];

            comboBase = self.comboBase;

            if (group) {
                if (!group.combine || mod.fullpath) {
                    //This is not a combo module, skip it and load it singly later.
                    addSingle(mod);
                    continue;
                }
                mod.combine = true;

                if (typeof group.root === 'string') {
                    mod.root = group.root;
                }

                comboBase    = group.comboBase || comboBase;
                comboSep     = group.comboSep;
                maxURLLength = group.maxURLLength;
            } else {
                if (!self.combine) {
                    //This is not a combo module, skip it and load it singly later.
                    addSingle(mod);
                    continue;
                }
            }

            if (!mod.combine && mod.ext) {
                addSingle(mod);
                continue;
            }
            hasComboModule = true;
            comboSources = comboSources || {};
            comboSources[comboBase] = comboSources[comboBase] ||
                { js: [], jsMods: [], css: [], cssMods: [] };

            comboMeta               = comboSources[comboBase];
            comboMeta.group         = mod.group;
            comboMeta.comboSep      = comboSep || self.comboSep;
            comboMeta.maxURLLength  = maxURLLength || self.maxURLLength;

            comboMeta[mod.type + 'Mods'].push(mod);
            if (mod.type === JS || mod.type === CSS) {
                resolved[mod.type + 'Mods'].push(mod);
            }
        }
        //only encode if we have something to encode
        if (hasComboModule) {
            if (usePathogen) {
                resolved = this._pathogenEncodeComboSources(resolved);
            } else {
                resolved = this._encodeComboSources(resolved, comboSources);
            }
        }
        return resolved;
    },

    /**
     * Encodes combo sources and appends them to an object hash of arrays from `loader.resolve`.
     *
     * @method _encodeComboSources
     * @param {Object} resolved The object hash of arrays in which to attach the encoded combo sources.
     * @param {Object} comboSources An object containing relevant data about modules.
     * @return Object
     * @private
     */
    _encodeComboSources: function(resolved, comboSources) {
        var fragSubset,
            modules,
            tmpBase,
            baseLen,
            frags,
            frag,
            type,
            mod,
            maxURLLength,
            comboBase,
            comboMeta,
            comboSep,
            i,
            len,
            self = this;

        for (comboBase in comboSources) {
            if (comboSources.hasOwnProperty(comboBase)) {
                comboMeta    = comboSources[comboBase];
                comboSep     = comboMeta.comboSep;
                maxURLLength = comboMeta.maxURLLength;
                Y.log('Using maxURLLength of ' + maxURLLength, 'info', 'loader');
                for (type in comboMeta) {
                    if (type === JS || type === CSS) {
                        modules = comboMeta[type + 'Mods'];
                        frags = [];
                        for (i = 0, len = modules.length; i < len; i += 1) {
                            mod = modules[i];
                            frag = ((typeof mod.root === 'string') ? mod.root : self.root) + (mod.path || mod.fullpath);
                            frags.push(
                                self._filter(frag, mod.name)
                            );
                        }
                        tmpBase = comboBase + frags.join(comboSep);
                        baseLen = tmpBase.length;
                        if (maxURLLength <= comboBase.length) {
                            Y.log('maxURLLength (' + maxURLLength + ') is lower than the comboBase length (' + comboBase.length + '), resetting to default (' + MAX_URL_LENGTH + ')', 'error', 'loader');
                            maxURLLength = MAX_URL_LENGTH;
                        }

                        if (frags.length) {
                            if (baseLen > maxURLLength) {
                                Y.log('Exceeded maxURLLength (' + maxURLLength + ') for ' + type + ', splitting', 'info', 'loader');
                                fragSubset = [];
                                for (i = 0, len = frags.length; i < len; i++) {
                                    fragSubset.push(frags[i]);
                                    tmpBase = comboBase + fragSubset.join(comboSep);

                                    if (tmpBase.length > maxURLLength) {
                                        frag = fragSubset.pop();
                                        tmpBase = comboBase + fragSubset.join(comboSep);
                                        resolved[type].push(self._filter(tmpBase, null, comboMeta.group));
                                        fragSubset = [];
                                        if (frag) {
                                            fragSubset.push(frag);
                                        }
                                    }
                                }
                                if (fragSubset.length) {
                                    tmpBase = comboBase + fragSubset.join(comboSep);
                                    resolved[type].push(self._filter(tmpBase, null, comboMeta.group));
                                }
                            } else {
                                resolved[type].push(self._filter(tmpBase, null, comboMeta.group));
                            }
                        }
                    }
                }
            }
        }
        return resolved;
    },

    /**
    Shortcut to calculate, resolve and load all modules.

        var loader = new Y.Loader({
            ignoreRegistered: true,
            modules: {
                mod: {
                    path: 'mod.js'
                }
            },
            requires: [ 'mod' ]
        });
        loader.load(function() {
            console.log('All modules have loaded..');
        });


    @method load
    @param {Function} cb Executed after all load operations are complete
    */
    load: function(cb) {
        if (!cb) {
            Y.log('No callback supplied to load()', 'error', 'loader');
            return;
        }
        var self = this,
            out = self.resolve(true);

        self.data = out;

        self.onEnd = function() {
            cb.apply(self.context || self, arguments);
        };

        self.insert();
    }
};


}, '3.18.1', {"requires": ["get", "features"]});
YUI.add('loader-rollup', function (Y, NAME) {

/**
 * Optional automatic rollup logic for reducing http connections
 * when not using a combo service.
 * @module loader
 * @submodule rollup
 */

/**
 * Look for rollup packages to determine if all of the modules a
 * rollup supersedes are required.  If so, include the rollup to
 * help reduce the total number of connections required.  Called
 * by calculate().  This is an optional feature, and requires the
 * appropriate submodule to function.
 * @method _rollup
 * @for Loader
 * @private
 */
Y.Loader.prototype._rollup = function() {
    var i, j, m, s, r = this.required, roll,
        info = this.moduleInfo, rolled, c, smod;

    // find and cache rollup modules
    if (this.dirty || !this.rollups) {
        this.rollups = {};
        for (i in info) {
            if (info.hasOwnProperty(i)) {
                m = this.getModule(i);
                // if (m && m.rollup && m.supersedes) {
                if (m && m.rollup) {
                    this.rollups[i] = m;
                }
            }
        }
    }

    // make as many passes as needed to pick up rollup rollups
    for (;;) {
        rolled = false;

        // go through the rollup candidates
        for (i in this.rollups) {
            if (this.rollups.hasOwnProperty(i)) {
                // there can be only one, unless forced
                if (!r[i] && ((!this.loaded[i]) || this.forceMap[i])) {
                    m = this.getModule(i);
                    s = m.supersedes || [];
                    roll = false;

                    // @TODO remove continue
                    if (!m.rollup) {
                        continue;
                    }

                    c = 0;

                    // check the threshold
                    for (j = 0; j < s.length; j++) {
                        smod = info[s[j]];

                        // if the superseded module is loaded, we can't
                        // load the rollup unless it has been forced.
                        if (this.loaded[s[j]] && !this.forceMap[s[j]]) {
                            roll = false;
                            break;
                        // increment the counter if this module is required.
                        // if we are beyond the rollup threshold, we will
                        // use the rollup module
                        } else if (r[s[j]] && m.type === smod.type) {
                            c++;
                            // Y.log("adding to thresh: " + c + ", " + s[j]);
                            roll = (c >= m.rollup);
                            if (roll) {
                                // Y.log("over thresh " + c + ", " + s[j]);
                                break;
                            }
                        }
                    }

                    if (roll) {
                        // Y.log("adding rollup: " +  i);
                        // add the rollup
                        r[i] = true;
                        rolled = true;

                        // expand the rollup's dependencies
                        this.getRequires(m);
                    }
                }
            }
        }

        // if we made it here w/o rolling up something, we are done
        if (!rolled) {
            break;
        }
    }
};


}, '3.18.1', {"requires": ["loader-base"]});
YUI.add('loader-yui3', function (Y, NAME) {

/* This file is auto-generated by (yogi.js loader --mix --yes) */

/*jshint maxlen:900, eqeqeq: false */

/**
 * YUI 3 module metadata
 * @module loader
 * @submodule loader-yui3
 */
YUI.Env[Y.version].modules = YUI.Env[Y.version].modules || {};
Y.mix(YUI.Env[Y.version].modules, {
    "align-plugin": {
        "requires": [
            "node-screen",
            "node-pluginhost"
        ]
    },
    "anim": {
        "use": [
            "anim-base",
            "anim-color",
            "anim-curve",
            "anim-easing",
            "anim-node-plugin",
            "anim-scroll",
            "anim-xy"
        ]
    },
    "anim-base": {
        "requires": [
            "base-base",
            "node-style",
            "color-base"
        ]
    },
    "anim-color": {
        "requires": [
            "anim-base"
        ]
    },
    "anim-curve": {
        "requires": [
            "anim-xy"
        ]
    },
    "anim-easing": {
        "requires": [
            "anim-base"
        ]
    },
    "anim-node-plugin": {
        "requires": [
            "node-pluginhost",
            "anim-base"
        ]
    },
    "anim-scroll": {
        "requires": [
            "anim-base"
        ]
    },
    "anim-shape": {
        "requires": [
            "anim-base",
            "anim-easing",
            "anim-color",
            "matrix"
        ]
    },
    "anim-shape-transform": {
        "use": [
            "anim-shape"
        ]
    },
    "anim-xy": {
        "requires": [
            "anim-base",
            "node-screen"
        ]
    },
    "app": {
        "use": [
            "app-base",
            "app-content",
            "app-transitions",
            "lazy-model-list",
            "model",
            "model-list",
            "model-sync-rest",
            "model-sync-local",
            "router",
            "view",
            "view-node-map"
        ]
    },
    "app-base": {
        "requires": [
            "classnamemanager",
            "pjax-base",
            "router",
            "view"
        ]
    },
    "app-content": {
        "requires": [
            "app-base",
            "pjax-content"
        ]
    },
    "app-transitions": {
        "requires": [
            "app-base"
        ]
    },
    "app-transitions-css": {
        "type": "css"
    },
    "app-transitions-native": {
        "condition": {
            "name": "app-transitions-native",
            "test": function (Y) {
    var doc  = Y.config.doc,
        node = doc ? doc.documentElement : null;

    if (node && node.style) {
        return ('MozTransition' in node.style || 'WebkitTransition' in node.style || 'transition' in node.style);
    }

    return false;
},
            "trigger": "app-transitions"
        },
        "requires": [
            "app-transitions",
            "app-transitions-css",
            "parallel",
            "transition"
        ]
    },
    "array-extras": {
        "requires": [
            "yui-base"
        ]
    },
    "array-invoke": {
        "requires": [
            "yui-base"
        ]
    },
    "arraylist": {
        "requires": [
            "yui-base"
        ]
    },
    "arraylist-add": {
        "requires": [
            "arraylist"
        ]
    },
    "arraylist-filter": {
        "requires": [
            "arraylist"
        ]
    },
    "arraysort": {
        "requires": [
            "yui-base"
        ]
    },
    "async-queue": {
        "requires": [
            "event-custom"
        ]
    },
    "attribute": {
        "use": [
            "attribute-base",
            "attribute-complex"
        ]
    },
    "attribute-base": {
        "requires": [
            "attribute-core",
            "attribute-observable",
            "attribute-extras"
        ]
    },
    "attribute-complex": {
        "requires": [
            "attribute-base"
        ]
    },
    "attribute-core": {
        "requires": [
            "oop"
        ]
    },
    "attribute-events": {
        "use": [
            "attribute-observable"
        ]
    },
    "attribute-extras": {
        "requires": [
            "oop"
        ]
    },
    "attribute-observable": {
        "requires": [
            "event-custom"
        ]
    },
    "autocomplete": {
        "use": [
            "autocomplete-base",
            "autocomplete-sources",
            "autocomplete-list",
            "autocomplete-plugin"
        ]
    },
    "autocomplete-base": {
        "optional": [
            "autocomplete-sources"
        ],
        "requires": [
            "array-extras",
            "base-build",
            "escape",
            "event-valuechange",
            "node-base"
        ]
    },
    "autocomplete-filters": {
        "requires": [
            "array-extras",
            "text-wordbreak"
        ]
    },
    "autocomplete-filters-accentfold": {
        "requires": [
            "array-extras",
            "text-accentfold",
            "text-wordbreak"
        ]
    },
    "autocomplete-highlighters": {
        "requires": [
            "array-extras",
            "highlight-base"
        ]
    },
    "autocomplete-highlighters-accentfold": {
        "requires": [
            "array-extras",
            "highlight-accentfold"
        ]
    },
    "autocomplete-list": {
        "after": [
            "autocomplete-sources"
        ],
        "lang": [
            "en",
            "es",
            "hu",
            "it"
        ],
        "requires": [
            "autocomplete-base",
            "event-resize",
            "node-screen",
            "selector-css3",
            "shim-plugin",
            "widget",
            "widget-position",
            "widget-position-align"
        ],
        "skinnable": true
    },
    "autocomplete-list-keys": {
        "condition": {
            "name": "autocomplete-list-keys",
            "test": function (Y) {
    // Only add keyboard support to autocomplete-list if this doesn't appear to
    // be an iOS or Android-based mobile device.
    //
    // There's currently no feasible way to actually detect whether a device has
    // a hardware keyboard, so this sniff will have to do. It can easily be
    // overridden by manually loading the autocomplete-list-keys module.
    //
    // Worth noting: even though iOS supports bluetooth keyboards, Mobile Safari
    // doesn't fire the keyboard events used by AutoCompleteList, so there's
    // no point loading the -keys module even when a bluetooth keyboard may be
    // available.
    return !(Y.UA.ios || Y.UA.android);
},
            "trigger": "autocomplete-list"
        },
        "requires": [
            "autocomplete-list",
            "base-build"
        ]
    },
    "autocomplete-plugin": {
        "requires": [
            "autocomplete-list",
            "node-pluginhost"
        ]
    },
    "autocomplete-sources": {
        "optional": [
            "io-base",
            "json-parse",
            "jsonp",
            "yql"
        ],
        "requires": [
            "autocomplete-base"
        ]
    },
    "axes": {
        "use": [
            "axis-numeric",
            "axis-category",
            "axis-time",
            "axis-stacked"
        ]
    },
    "axes-base": {
        "use": [
            "axis-numeric-base",
            "axis-category-base",
            "axis-time-base",
            "axis-stacked-base"
        ]
    },
    "axis": {
        "requires": [
            "dom",
            "widget",
            "widget-position",
            "widget-stack",
            "graphics",
            "axis-base"
        ]
    },
    "axis-base": {
        "requires": [
            "classnamemanager",
            "datatype-number",
            "datatype-date",
            "base",
            "event-custom"
        ]
    },
    "axis-category": {
        "requires": [
            "axis",
            "axis-category-base"
        ]
    },
    "axis-category-base": {
        "requires": [
            "axis-base"
        ]
    },
    "axis-numeric": {
        "requires": [
            "axis",
            "axis-numeric-base"
        ]
    },
    "axis-numeric-base": {
        "requires": [
            "axis-base"
        ]
    },
    "axis-stacked": {
        "requires": [
            "axis-numeric",
            "axis-stacked-base"
        ]
    },
    "axis-stacked-base": {
        "requires": [
            "axis-numeric-base"
        ]
    },
    "axis-time": {
        "requires": [
            "axis",
            "axis-time-base"
        ]
    },
    "axis-time-base": {
        "requires": [
            "axis-base"
        ]
    },
    "base": {
        "use": [
            "base-base",
            "base-pluginhost",
            "base-build"
        ]
    },
    "base-base": {
        "requires": [
            "attribute-base",
            "base-core",
            "base-observable"
        ]
    },
    "base-build": {
        "requires": [
            "base-base"
        ]
    },
    "base-core": {
        "requires": [
            "attribute-core"
        ]
    },
    "base-observable": {
        "requires": [
            "attribute-observable",
            "base-core"
        ]
    },
    "base-pluginhost": {
        "requires": [
            "base-base",
            "pluginhost"
        ]
    },
    "button": {
        "requires": [
            "button-core",
            "cssbutton",
            "widget"
        ]
    },
    "button-core": {
        "requires": [
            "attribute-core",
            "classnamemanager",
            "node-base",
            "escape"
        ]
    },
    "button-group": {
        "requires": [
            "button-plugin",
            "cssbutton",
            "widget"
        ]
    },
    "button-plugin": {
        "requires": [
            "button-core",
            "cssbutton",
            "node-pluginhost"
        ]
    },
    "cache": {
        "use": [
            "cache-base",
            "cache-offline",
            "cache-plugin"
        ]
    },
    "cache-base": {
        "requires": [
            "base"
        ]
    },
    "cache-offline": {
        "requires": [
            "cache-base",
            "json"
        ]
    },
    "cache-plugin": {
        "requires": [
            "plugin",
            "cache-base"
        ]
    },
    "calendar": {
        "requires": [
            "calendar-base",
            "calendarnavigator"
        ],
        "skinnable": true
    },
    "calendar-base": {
        "lang": [
            "de",
            "en",
            "es",
            "es-AR",
            "fr",
            "hu",
            "it",
            "ja",
            "nb-NO",
            "nl",
            "pt-BR",
            "ru",
            "zh-Hans",
            "zh-Hans-CN",
            "zh-Hant",
            "zh-Hant-HK",
            "zh-HANT-TW"
        ],
        "requires": [
            "widget",
            "datatype-date",
            "datatype-date-math",
            "cssgrids"
        ],
        "skinnable": true
    },
    "calendarnavigator": {
        "requires": [
            "plugin",
            "classnamemanager",
            "datatype-date",
            "node"
        ],
        "skinnable": true
    },
    "charts": {
        "use": [
            "charts-base"
        ]
    },
    "charts-base": {
        "requires": [
            "dom",
            "event-mouseenter",
            "event-touch",
            "graphics-group",
            "axes",
            "series-pie",
            "series-line",
            "series-marker",
            "series-area",
            "series-spline",
            "series-column",
            "series-bar",
            "series-areaspline",
            "series-combo",
            "series-combospline",
            "series-line-stacked",
            "series-marker-stacked",
            "series-area-stacked",
            "series-spline-stacked",
            "series-column-stacked",
            "series-bar-stacked",
            "series-areaspline-stacked",
            "series-combo-stacked",
            "series-combospline-stacked"
        ]
    },
    "charts-legend": {
        "requires": [
            "charts-base"
        ]
    },
    "classnamemanager": {
        "requires": [
            "yui-base"
        ]
    },
    "clickable-rail": {
        "requires": [
            "slider-base"
        ]
    },
    "collection": {
        "use": [
            "array-extras",
            "arraylist",
            "arraylist-add",
            "arraylist-filter",
            "array-invoke"
        ]
    },
    "color": {
        "use": [
            "color-base",
            "color-hsl",
            "color-harmony"
        ]
    },
    "color-base": {
        "requires": [
            "yui-base"
        ]
    },
    "color-harmony": {
        "requires": [
            "color-hsl"
        ]
    },
    "color-hsl": {
        "requires": [
            "color-base"
        ]
    },
    "color-hsv": {
        "requires": [
            "color-base"
        ]
    },
    "console": {
        "lang": [
            "en",
            "es",
            "hu",
            "it",
            "ja"
        ],
        "requires": [
            "yui-log",
            "widget"
        ],
        "skinnable": true
    },
    "console-filters": {
        "requires": [
            "plugin",
            "console"
        ],
        "skinnable": true
    },
    "content-editable": {
        "requires": [
            "node-base",
            "editor-selection",
            "stylesheet",
            "plugin"
        ]
    },
    "controller": {
        "use": [
            "router"
        ]
    },
    "cookie": {
        "requires": [
            "yui-base"
        ]
    },
    "createlink-base": {
        "requires": [
            "editor-base"
        ]
    },
    "cssbase": {
        "after": [
            "cssreset",
            "cssfonts",
            "cssgrids",
            "cssreset-context",
            "cssfonts-context",
            "cssgrids-context"
        ],
        "type": "css"
    },
    "cssbase-context": {
        "after": [
            "cssreset",
            "cssfonts",
            "cssgrids",
            "cssreset-context",
            "cssfonts-context",
            "cssgrids-context"
        ],
        "type": "css"
    },
    "cssbutton": {
        "type": "css"
    },
    "cssfonts": {
        "type": "css"
    },
    "cssfonts-context": {
        "type": "css"
    },
    "cssgrids": {
        "optional": [
            "cssnormalize"
        ],
        "type": "css"
    },
    "cssgrids-base": {
        "optional": [
            "cssnormalize"
        ],
        "type": "css"
    },
    "cssgrids-responsive": {
        "optional": [
            "cssnormalize"
        ],
        "requires": [
            "cssgrids",
            "cssgrids-responsive-base"
        ],
        "type": "css"
    },
    "cssgrids-units": {
        "optional": [
            "cssnormalize"
        ],
        "requires": [
            "cssgrids-base"
        ],
        "type": "css"
    },
    "cssnormalize": {
        "type": "css"
    },
    "cssnormalize-context": {
        "type": "css"
    },
    "cssreset": {
        "type": "css"
    },
    "cssreset-context": {
        "type": "css"
    },
    "dataschema": {
        "use": [
            "dataschema-base",
            "dataschema-json",
            "dataschema-xml",
            "dataschema-array",
            "dataschema-text"
        ]
    },
    "dataschema-array": {
        "requires": [
            "dataschema-base"
        ]
    },
    "dataschema-base": {
        "requires": [
            "base"
        ]
    },
    "dataschema-json": {
        "requires": [
            "dataschema-base",
            "json"
        ]
    },
    "dataschema-text": {
        "requires": [
            "dataschema-base"
        ]
    },
    "dataschema-xml": {
        "requires": [
            "dataschema-base"
        ]
    },
    "datasource": {
        "use": [
            "datasource-local",
            "datasource-io",
            "datasource-get",
            "datasource-function",
            "datasource-cache",
            "datasource-jsonschema",
            "datasource-xmlschema",
            "datasource-arrayschema",
            "datasource-textschema",
            "datasource-polling"
        ]
    },
    "datasource-arrayschema": {
        "requires": [
            "datasource-local",
            "plugin",
            "dataschema-array"
        ]
    },
    "datasource-cache": {
        "requires": [
            "datasource-local",
            "plugin",
            "cache-base"
        ]
    },
    "datasource-function": {
        "requires": [
            "datasource-local"
        ]
    },
    "datasource-get": {
        "requires": [
            "datasource-local",
            "get"
        ]
    },
    "datasource-io": {
        "requires": [
            "datasource-local",
            "io-base"
        ]
    },
    "datasource-jsonschema": {
        "requires": [
            "datasource-local",
            "plugin",
            "dataschema-json"
        ]
    },
    "datasource-local": {
        "requires": [
            "base"
        ]
    },
    "datasource-polling": {
        "requires": [
            "datasource-local"
        ]
    },
    "datasource-textschema": {
        "requires": [
            "datasource-local",
            "plugin",
            "dataschema-text"
        ]
    },
    "datasource-xmlschema": {
        "requires": [
            "datasource-local",
            "plugin",
            "datatype-xml",
            "dataschema-xml"
        ]
    },
    "datatable": {
        "use": [
            "datatable-core",
            "datatable-table",
            "datatable-head",
            "datatable-body",
            "datatable-base",
            "datatable-column-widths",
            "datatable-message",
            "datatable-mutable",
            "datatable-sort",
            "datatable-datasource"
        ]
    },
    "datatable-base": {
        "requires": [
            "datatable-core",
            "datatable-table",
            "datatable-head",
            "datatable-body",
            "base-build",
            "widget"
        ],
        "skinnable": true
    },
    "datatable-body": {
        "requires": [
            "datatable-core",
            "view",
            "classnamemanager"
        ]
    },
    "datatable-column-widths": {
        "requires": [
            "datatable-base"
        ]
    },
    "datatable-core": {
        "requires": [
            "escape",
            "model-list",
            "node-event-delegate"
        ]
    },
    "datatable-datasource": {
        "requires": [
            "datatable-base",
            "plugin",
            "datasource-local"
        ]
    },
    "datatable-foot": {
        "requires": [
            "datatable-core",
            "view"
        ]
    },
    "datatable-formatters": {
        "requires": [
            "datatable-body",
            "datatype-number-format",
            "datatype-date-format",
            "escape"
        ]
    },
    "datatable-head": {
        "requires": [
            "datatable-core",
            "view",
            "classnamemanager"
        ]
    },
    "datatable-highlight": {
        "requires": [
            "datatable-base",
            "event-hover"
        ],
        "skinnable": true
    },
    "datatable-keynav": {
        "requires": [
            "datatable-base"
        ]
    },
    "datatable-message": {
        "lang": [
            "en",
            "fr",
            "es",
            "hu",
            "it"
        ],
        "requires": [
            "datatable-base"
        ],
        "skinnable": true
    },
    "datatable-mutable": {
        "requires": [
            "datatable-base"
        ]
    },
    "datatable-paginator": {
        "lang": [
            "en",
            "fr"
        ],
        "requires": [
            "model",
            "view",
            "paginator-core",
            "datatable-foot",
            "datatable-paginator-templates"
        ],
        "skinnable": true
    },
    "datatable-paginator-templates": {
        "requires": [
            "template"
        ]
    },
    "datatable-scroll": {
        "requires": [
            "datatable-base",
            "datatable-column-widths",
            "dom-screen"
        ],
        "skinnable": true
    },
    "datatable-sort": {
        "lang": [
            "en",
            "fr",
            "es",
            "hu"
        ],
        "requires": [
            "datatable-base"
        ],
        "skinnable": true
    },
    "datatable-table": {
        "requires": [
            "datatable-core",
            "datatable-head",
            "datatable-body",
            "view",
            "classnamemanager"
        ]
    },
    "datatype": {
        "use": [
            "datatype-date",
            "datatype-number",
            "datatype-xml"
        ]
    },
    "datatype-date": {
        "use": [
            "datatype-date-parse",
            "datatype-date-format",
            "datatype-date-math"
        ]
    },
    "datatype-date-format": {
        "lang": [
            "ar",
            "ar-JO",
            "ca",
            "ca-ES",
            "da",
            "da-DK",
            "de",
            "de-AT",
            "de-DE",
            "el",
            "el-GR",
            "en",
            "en-AU",
            "en-CA",
            "en-GB",
            "en-IE",
            "en-IN",
            "en-JO",
            "en-MY",
            "en-NZ",
            "en-PH",
            "en-SG",
            "en-US",
            "es",
            "es-AR",
            "es-BO",
            "es-CL",
            "es-CO",
            "es-EC",
            "es-ES",
            "es-MX",
            "es-PE",
            "es-PY",
            "es-US",
            "es-UY",
            "es-VE",
            "fi",
            "fi-FI",
            "fr",
            "fr-BE",
            "fr-CA",
            "fr-FR",
            "hi",
            "hi-IN",
            "hu",
            "id",
            "id-ID",
            "it",
            "it-IT",
            "ja",
            "ja-JP",
            "ko",
            "ko-KR",
            "ms",
            "ms-MY",
            "nb",
            "nb-NO",
            "nl",
            "nl-BE",
            "nl-NL",
            "pl",
            "pl-PL",
            "pt",
            "pt-BR",
            "ro",
            "ro-RO",
            "ru",
            "ru-RU",
            "sv",
            "sv-SE",
            "th",
            "th-TH",
            "tr",
            "tr-TR",
            "vi",
            "vi-VN",
            "zh-Hans",
            "zh-Hans-CN",
            "zh-Hant",
            "zh-Hant-HK",
            "zh-Hant-TW"
        ]
    },
    "datatype-date-math": {
        "requires": [
            "yui-base"
        ]
    },
    "datatype-date-parse": {},
    "datatype-number": {
        "use": [
            "datatype-number-parse",
            "datatype-number-format"
        ]
    },
    "datatype-number-format": {},
    "datatype-number-parse": {
        "requires": [
            "escape"
        ]
    },
    "datatype-xml": {
        "use": [
            "datatype-xml-parse",
            "datatype-xml-format"
        ]
    },
    "datatype-xml-format": {},
    "datatype-xml-parse": {},
    "dd": {
        "use": [
            "dd-ddm-base",
            "dd-ddm",
            "dd-ddm-drop",
            "dd-drag",
            "dd-proxy",
            "dd-constrain",
            "dd-drop",
            "dd-scroll",
            "dd-delegate"
        ]
    },
    "dd-constrain": {
        "requires": [
            "dd-drag"
        ]
    },
    "dd-ddm": {
        "requires": [
            "dd-ddm-base",
            "event-resize"
        ]
    },
    "dd-ddm-base": {
        "requires": [
            "node",
            "base",
            "yui-throttle",
            "classnamemanager"
        ]
    },
    "dd-ddm-drop": {
        "requires": [
            "dd-ddm"
        ]
    },
    "dd-delegate": {
        "requires": [
            "dd-drag",
            "dd-drop-plugin",
            "event-mouseenter"
        ]
    },
    "dd-drag": {
        "requires": [
            "dd-ddm-base",
            "selector-css2"
        ]
    },
    "dd-drop": {
        "requires": [
            "dd-drag",
            "dd-ddm-drop"
        ]
    },
    "dd-drop-plugin": {
        "requires": [
            "dd-drop"
        ]
    },
    "dd-gestures": {
        "condition": {
            "name": "dd-gestures",
            "trigger": "dd-drag",
            "ua": "touchEnabled"
        },
        "requires": [
            "dd-drag",
            "event-synthetic",
            "event-gestures"
        ]
    },
    "dd-plugin": {
        "optional": [
            "dd-constrain",
            "dd-proxy"
        ],
        "requires": [
            "dd-drag"
        ]
    },
    "dd-proxy": {
        "requires": [
            "dd-drag"
        ]
    },
    "dd-scroll": {
        "requires": [
            "dd-drag"
        ]
    },
    "dial": {
        "lang": [
            "en",
            "es",
            "hu"
        ],
        "requires": [
            "widget",
            "dd-drag",
            "event-mouseenter",
            "event-move",
            "event-key",
            "transition",
            "intl"
        ],
        "skinnable": true
    },
    "dom": {
        "use": [
            "dom-base",
            "dom-screen",
            "dom-style",
            "selector-native",
            "selector"
        ]
    },
    "dom-base": {
        "requires": [
            "dom-core"
        ]
    },
    "dom-core": {
        "requires": [
            "oop",
            "features"
        ]
    },
    "dom-screen": {
        "requires": [
            "dom-base",
            "dom-style"
        ]
    },
    "dom-style": {
        "requires": [
            "dom-base"
        ]
    },
    "dom-style-ie": {
        "condition": {
            "name": "dom-style-ie",
            "test": function (Y) {

    var testFeature = Y.Features.test,
        addFeature = Y.Features.add,
        WINDOW = Y.config.win,
        DOCUMENT = Y.config.doc,
        DOCUMENT_ELEMENT = 'documentElement',
        ret = false;

    addFeature('style', 'computedStyle', {
        test: function() {
            return WINDOW && 'getComputedStyle' in WINDOW;
        }
    });

    addFeature('style', 'opacity', {
        test: function() {
            return DOCUMENT && 'opacity' in DOCUMENT[DOCUMENT_ELEMENT].style;
        }
    });

    ret =  (!testFeature('style', 'opacity') &&
            !testFeature('style', 'computedStyle'));

    return ret;
},
            "trigger": "dom-style"
        },
        "requires": [
            "dom-style",
            "color-base"
        ]
    },
    "dump": {
        "requires": [
            "yui-base"
        ]
    },
    "editor": {
        "use": [
            "frame",
            "editor-selection",
            "exec-command",
            "editor-base",
            "editor-para",
            "editor-br",
            "editor-bidi",
            "editor-tab",
            "createlink-base"
        ]
    },
    "editor-base": {
        "requires": [
            "base",
            "frame",
            "node",
            "exec-command",
            "editor-selection"
        ]
    },
    "editor-bidi": {
        "requires": [
            "editor-base"
        ]
    },
    "editor-br": {
        "requires": [
            "editor-base"
        ]
    },
    "editor-inline": {
        "requires": [
            "editor-base",
            "content-editable"
        ]
    },
    "editor-lists": {
        "requires": [
            "editor-base"
        ]
    },
    "editor-para": {
        "requires": [
            "editor-para-base"
        ]
    },
    "editor-para-base": {
        "requires": [
            "editor-base"
        ]
    },
    "editor-para-ie": {
        "condition": {
            "name": "editor-para-ie",
            "trigger": "editor-para",
            "ua": "ie",
            "when": "instead"
        },
        "requires": [
            "editor-para-base"
        ]
    },
    "editor-selection": {
        "requires": [
            "node"
        ]
    },
    "editor-tab": {
        "requires": [
            "editor-base"
        ]
    },
    "escape": {
        "requires": [
            "yui-base"
        ]
    },
    "event": {
        "after": [
            "node-base"
        ],
        "use": [
            "event-base",
            "event-delegate",
            "event-synthetic",
            "event-mousewheel",
            "event-mouseenter",
            "event-key",
            "event-focus",
            "event-resize",
            "event-hover",
            "event-outside",
            "event-touch",
            "event-move",
            "event-flick",
            "event-valuechange",
            "event-tap"
        ]
    },
    "event-base": {
        "after": [
            "node-base"
        ],
        "requires": [
            "event-custom-base"
        ]
    },
    "event-base-ie": {
        "after": [
            "event-base"
        ],
        "condition": {
            "name": "event-base-ie",
            "test": function(Y) {
    var imp = Y.config.doc && Y.config.doc.implementation;
    return (imp && (!imp.hasFeature('Events', '2.0')));
},
            "trigger": "node-base"
        },
        "requires": [
            "node-base"
        ]
    },
    "event-contextmenu": {
        "requires": [
            "event-synthetic",
            "dom-screen"
        ]
    },
    "event-custom": {
        "use": [
            "event-custom-base",
            "event-custom-complex"
        ]
    },
    "event-custom-base": {
        "requires": [
            "oop"
        ]
    },
    "event-custom-complex": {
        "requires": [
            "event-custom-base"
        ]
    },
    "event-delegate": {
        "requires": [
            "node-base"
        ]
    },
    "event-flick": {
        "requires": [
            "node-base",
            "event-touch",
            "event-synthetic"
        ]
    },
    "event-focus": {
        "requires": [
            "event-synthetic"
        ]
    },
    "event-gestures": {
        "use": [
            "event-flick",
            "event-move"
        ]
    },
    "event-hover": {
        "requires": [
            "event-mouseenter"
        ]
    },
    "event-key": {
        "requires": [
            "event-synthetic"
        ]
    },
    "event-mouseenter": {
        "requires": [
            "event-synthetic"
        ]
    },
    "event-mousewheel": {
        "requires": [
            "node-base"
        ]
    },
    "event-move": {
        "requires": [
            "node-base",
            "event-touch",
            "event-synthetic"
        ]
    },
    "event-outside": {
        "requires": [
            "event-synthetic"
        ]
    },
    "event-resize": {
        "requires": [
            "node-base",
            "event-synthetic"
        ]
    },
    "event-simulate": {
        "requires": [
            "event-base"
        ]
    },
    "event-synthetic": {
        "requires": [
            "node-base",
            "event-custom-complex"
        ]
    },
    "event-tap": {
        "requires": [
            "node-base",
            "event-base",
            "event-touch",
            "event-synthetic"
        ]
    },
    "event-touch": {
        "requires": [
            "node-base"
        ]
    },
    "event-valuechange": {
        "requires": [
            "event-focus",
            "event-synthetic"
        ]
    },
    "exec-command": {
        "requires": [
            "frame"
        ]
    },
    "features": {
        "requires": [
            "yui-base"
        ]
    },
    "file": {
        "requires": [
            "file-flash",
            "file-html5"
        ]
    },
    "file-flash": {
        "requires": [
            "base"
        ]
    },
    "file-html5": {
        "requires": [
            "base"
        ]
    },
    "frame": {
        "requires": [
            "base",
            "node",
            "plugin",
            "selector-css3",
            "yui-throttle"
        ]
    },
    "gesture-simulate": {
        "requires": [
            "async-queue",
            "event-simulate",
            "node-screen"
        ]
    },
    "get": {
        "requires": [
            "yui-base"
        ]
    },
    "graphics": {
        "requires": [
            "node",
            "event-custom",
            "pluginhost",
            "matrix",
            "classnamemanager"
        ]
    },
    "graphics-canvas": {
        "condition": {
            "name": "graphics-canvas",
            "test": function(Y) {
    var DOCUMENT = Y.config.doc,
        useCanvas = Y.config.defaultGraphicEngine && Y.config.defaultGraphicEngine == "canvas",
		canvas = DOCUMENT && DOCUMENT.createElement("canvas"),
        svg = (DOCUMENT && DOCUMENT.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#BasicStructure", "1.1"));
    return (!svg || useCanvas) && (canvas && canvas.getContext && canvas.getContext("2d"));
},
            "trigger": "graphics"
        },
        "requires": [
            "graphics",
            "color-base"
        ]
    },
    "graphics-canvas-default": {
        "condition": {
            "name": "graphics-canvas-default",
            "test": function(Y) {
    var DOCUMENT = Y.config.doc,
        useCanvas = Y.config.defaultGraphicEngine && Y.config.defaultGraphicEngine == "canvas",
		canvas = DOCUMENT && DOCUMENT.createElement("canvas"),
        svg = (DOCUMENT && DOCUMENT.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#BasicStructure", "1.1"));
    return (!svg || useCanvas) && (canvas && canvas.getContext && canvas.getContext("2d"));
},
            "trigger": "graphics"
        }
    },
    "graphics-group": {
        "requires": [
            "graphics"
        ]
    },
    "graphics-svg": {
        "condition": {
            "name": "graphics-svg",
            "test": function(Y) {
    var DOCUMENT = Y.config.doc,
        useSVG = !Y.config.defaultGraphicEngine || Y.config.defaultGraphicEngine != "canvas",
		canvas = DOCUMENT && DOCUMENT.createElement("canvas"),
        svg = (DOCUMENT && DOCUMENT.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#BasicStructure", "1.1"));

    return svg && (useSVG || !canvas);
},
            "trigger": "graphics"
        },
        "requires": [
            "graphics"
        ]
    },
    "graphics-svg-default": {
        "condition": {
            "name": "graphics-svg-default",
            "test": function(Y) {
    var DOCUMENT = Y.config.doc,
        useSVG = !Y.config.defaultGraphicEngine || Y.config.defaultGraphicEngine != "canvas",
		canvas = DOCUMENT && DOCUMENT.createElement("canvas"),
        svg = (DOCUMENT && DOCUMENT.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#BasicStructure", "1.1"));

    return svg && (useSVG || !canvas);
},
            "trigger": "graphics"
        }
    },
    "graphics-vml": {
        "condition": {
            "name": "graphics-vml",
            "test": function(Y) {
    var DOCUMENT = Y.config.doc,
		canvas = DOCUMENT && DOCUMENT.createElement("canvas");
    return (DOCUMENT && !DOCUMENT.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#BasicStructure", "1.1") && (!canvas || !canvas.getContext || !canvas.getContext("2d")));
},
            "trigger": "graphics"
        },
        "requires": [
            "graphics",
            "color-base"
        ]
    },
    "graphics-vml-default": {
        "condition": {
            "name": "graphics-vml-default",
            "test": function(Y) {
    var DOCUMENT = Y.config.doc,
		canvas = DOCUMENT && DOCUMENT.createElement("canvas");
    return (DOCUMENT && !DOCUMENT.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#BasicStructure", "1.1") && (!canvas || !canvas.getContext || !canvas.getContext("2d")));
},
            "trigger": "graphics"
        }
    },
    "handlebars": {
        "use": [
            "handlebars-compiler"
        ]
    },
    "handlebars-base": {
        "requires": []
    },
    "handlebars-compiler": {
        "requires": [
            "handlebars-base"
        ]
    },
    "highlight": {
        "use": [
            "highlight-base",
            "highlight-accentfold"
        ]
    },
    "highlight-accentfold": {
        "requires": [
            "highlight-base",
            "text-accentfold"
        ]
    },
    "highlight-base": {
        "requires": [
            "array-extras",
            "classnamemanager",
            "escape",
            "text-wordbreak"
        ]
    },
    "history": {
        "use": [
            "history-base",
            "history-hash",
            "history-html5"
        ]
    },
    "history-base": {
        "requires": [
            "event-custom-complex"
        ]
    },
    "history-hash": {
        "after": [
            "history-html5"
        ],
        "requires": [
            "event-synthetic",
            "history-base",
            "yui-later"
        ]
    },
    "history-hash-ie": {
        "condition": {
            "name": "history-hash-ie",
            "test": function (Y) {
    var docMode = Y.config.doc && Y.config.doc.documentMode;

    return Y.UA.ie && (!('onhashchange' in Y.config.win) ||
            !docMode || docMode < 8);
},
            "trigger": "history-hash"
        },
        "requires": [
            "history-hash",
            "node-base"
        ]
    },
    "history-html5": {
        "optional": [
            "json"
        ],
        "requires": [
            "event-base",
            "history-base",
            "node-base"
        ]
    },
    "imageloader": {
        "requires": [
            "base-base",
            "node-style",
            "node-screen"
        ]
    },
    "intl": {
        "requires": [
            "intl-base",
            "event-custom"
        ]
    },
    "intl-base": {
        "requires": [
            "yui-base"
        ]
    },
    "io": {
        "use": [
            "io-base",
            "io-xdr",
            "io-form",
            "io-upload-iframe",
            "io-queue"
        ]
    },
    "io-base": {
        "requires": [
            "event-custom-base",
            "querystring-stringify-simple"
        ]
    },
    "io-form": {
        "requires": [
            "io-base",
            "node-base"
        ]
    },
    "io-nodejs": {
        "condition": {
            "name": "io-nodejs",
            "trigger": "io-base",
            "ua": "nodejs"
        },
        "requires": [
            "io-base"
        ]
    },
    "io-queue": {
        "requires": [
            "io-base",
            "queue-promote"
        ]
    },
    "io-upload-iframe": {
        "requires": [
            "io-base",
            "node-base"
        ]
    },
    "io-xdr": {
        "requires": [
            "io-base",
            "datatype-xml-parse"
        ]
    },
    "json": {
        "use": [
            "json-parse",
            "json-stringify"
        ]
    },
    "json-parse": {
        "requires": [
            "yui-base"
        ]
    },
    "json-parse-shim": {
        "condition": {
            "name": "json-parse-shim",
            "test": function (Y) {
    var _JSON = Y.config.global.JSON,
        Native = Object.prototype.toString.call(_JSON) === '[object JSON]' && _JSON,
        nativeSupport = Y.config.useNativeJSONParse !== false && !!Native;

    function workingNative( k, v ) {
        return k === "ok" ? true : v;
    }

    // Double check basic functionality.  This is mainly to catch early broken
    // implementations of the JSON API in Firefox 3.1 beta1 and beta2
    if ( nativeSupport ) {
        try {
            nativeSupport = ( Native.parse( '{"ok":false}', workingNative ) ).ok;
        }
        catch ( e ) {
            nativeSupport = false;
        }
    }

    return !nativeSupport;
},
            "trigger": "json-parse"
        },
        "requires": [
            "json-parse"
        ]
    },
    "json-stringify": {
        "requires": [
            "yui-base"
        ]
    },
    "json-stringify-shim": {
        "condition": {
            "name": "json-stringify-shim",
            "test": function (Y) {
    var _JSON = Y.config.global.JSON,
        Native = Object.prototype.toString.call(_JSON) === '[object JSON]' && _JSON,
        nativeSupport = Y.config.useNativeJSONStringify !== false && !!Native;

    // Double check basic native functionality.  This is primarily to catch broken
    // early JSON API implementations in Firefox 3.1 beta1 and beta2.
    if ( nativeSupport ) {
        try {
            nativeSupport = ( '0' === Native.stringify(0) );
        } catch ( e ) {
            nativeSupport = false;
        }
    }


    return !nativeSupport;
},
            "trigger": "json-stringify"
        },
        "requires": [
            "json-stringify"
        ]
    },
    "jsonp": {
        "requires": [
            "get",
            "oop"
        ]
    },
    "jsonp-url": {
        "requires": [
            "jsonp"
        ]
    },
    "lazy-model-list": {
        "requires": [
            "model-list"
        ]
    },
    "loader": {
        "use": [
            "loader-base",
            "loader-rollup",
            "loader-yui3"
        ]
    },
    "loader-base": {
        "requires": [
            "get",
            "features"
        ]
    },
    "loader-pathogen-combohandler": {},
    "loader-pathogen-encoder": {
        "use": [
            "loader-base",
            "loader-rollup",
            "loader-yui3",
            "loader-pathogen-combohandler"
        ]
    },
    "loader-rollup": {
        "requires": [
            "loader-base"
        ]
    },
    "loader-yui3": {
        "requires": [
            "loader-base"
        ]
    },
    "matrix": {
        "requires": [
            "yui-base"
        ]
    },
    "model": {
        "requires": [
            "base-build",
            "escape",
            "json-parse"
        ]
    },
    "model-list": {
        "requires": [
            "array-extras",
            "array-invoke",
            "arraylist",
            "base-build",
            "escape",
            "json-parse",
            "model"
        ]
    },
    "model-sync-local": {
        "requires": [
            "model",
            "json-stringify"
        ]
    },
    "model-sync-rest": {
        "requires": [
            "model",
            "io-base",
            "json-stringify"
        ]
    },
    "node": {
        "use": [
            "node-base",
            "node-event-delegate",
            "node-pluginhost",
            "node-screen",
            "node-style"
        ]
    },
    "node-base": {
        "requires": [
            "event-base",
            "node-core",
            "dom-base",
            "dom-style"
        ]
    },
    "node-core": {
        "requires": [
            "dom-core",
            "selector"
        ]
    },
    "node-event-delegate": {
        "requires": [
            "node-base",
            "event-delegate"
        ]
    },
    "node-event-html5": {
        "requires": [
            "node-base"
        ]
    },
    "node-event-simulate": {
        "requires": [
            "node-base",
            "event-simulate",
            "gesture-simulate"
        ]
    },
    "node-flick": {
        "requires": [
            "classnamemanager",
            "transition",
            "event-flick",
            "plugin"
        ],
        "skinnable": true
    },
    "node-focusmanager": {
        "requires": [
            "attribute",
            "node",
            "plugin",
            "node-event-simulate",
            "event-key",
            "event-focus"
        ]
    },
    "node-load": {
        "requires": [
            "node-base",
            "io-base"
        ]
    },
    "node-menunav": {
        "requires": [
            "node",
            "classnamemanager",
            "plugin",
            "node-focusmanager"
        ],
        "skinnable": true
    },
    "node-pluginhost": {
        "requires": [
            "node-base",
            "pluginhost"
        ]
    },
    "node-screen": {
        "requires": [
            "dom-screen",
            "node-base"
        ]
    },
    "node-scroll-info": {
        "requires": [
            "array-extras",
            "base-build",
            "event-resize",
            "node-pluginhost",
            "plugin",
            "selector"
        ]
    },
    "node-style": {
        "requires": [
            "dom-style",
            "node-base"
        ]
    },
    "oop": {
        "requires": [
            "yui-base"
        ]
    },
    "overlay": {
        "requires": [
            "widget",
            "widget-stdmod",
            "widget-position",
            "widget-position-align",
            "widget-stack",
            "widget-position-constrain"
        ],
        "skinnable": true
    },
    "paginator": {
        "requires": [
            "paginator-core"
        ]
    },
    "paginator-core": {
        "requires": [
            "base"
        ]
    },
    "paginator-url": {
        "requires": [
            "paginator"
        ]
    },
    "panel": {
        "requires": [
            "widget",
            "widget-autohide",
            "widget-buttons",
            "widget-modality",
            "widget-position",
            "widget-position-align",
            "widget-position-constrain",
            "widget-stack",
            "widget-stdmod"
        ],
        "skinnable": true
    },
    "parallel": {
        "requires": [
            "yui-base"
        ]
    },
    "pjax": {
        "requires": [
            "pjax-base",
            "pjax-content"
        ]
    },
    "pjax-base": {
        "requires": [
            "classnamemanager",
            "node-event-delegate",
            "router"
        ]
    },
    "pjax-content": {
        "requires": [
            "io-base",
            "node-base",
            "router"
        ]
    },
    "pjax-plugin": {
        "requires": [
            "node-pluginhost",
            "pjax",
            "plugin"
        ]
    },
    "plugin": {
        "requires": [
            "base-base"
        ]
    },
    "pluginhost": {
        "use": [
            "pluginhost-base",
            "pluginhost-config"
        ]
    },
    "pluginhost-base": {
        "requires": [
            "yui-base"
        ]
    },
    "pluginhost-config": {
        "requires": [
            "pluginhost-base"
        ]
    },
    "promise": {
        "requires": [
            "timers"
        ]
    },
    "querystring": {
        "use": [
            "querystring-parse",
            "querystring-stringify"
        ]
    },
    "querystring-parse": {
        "requires": [
            "yui-base",
            "array-extras"
        ]
    },
    "querystring-parse-simple": {
        "requires": [
            "yui-base"
        ]
    },
    "querystring-stringify": {
        "requires": [
            "yui-base"
        ]
    },
    "querystring-stringify-simple": {
        "requires": [
            "yui-base"
        ]
    },
    "queue-promote": {
        "requires": [
            "yui-base"
        ]
    },
    "range-slider": {
        "requires": [
            "slider-base",
            "slider-value-range",
            "clickable-rail"
        ]
    },
    "recordset": {
        "use": [
            "recordset-base",
            "recordset-sort",
            "recordset-filter",
            "recordset-indexer"
        ]
    },
    "recordset-base": {
        "requires": [
            "base",
            "arraylist"
        ]
    },
    "recordset-filter": {
        "requires": [
            "recordset-base",
            "array-extras",
            "plugin"
        ]
    },
    "recordset-indexer": {
        "requires": [
            "recordset-base",
            "plugin"
        ]
    },
    "recordset-sort": {
        "requires": [
            "arraysort",
            "recordset-base",
            "plugin"
        ]
    },
    "resize": {
        "use": [
            "resize-base",
            "resize-proxy",
            "resize-constrain"
        ]
    },
    "resize-base": {
        "requires": [
            "base",
            "widget",
            "event",
            "oop",
            "dd-drag",
            "dd-delegate",
            "dd-drop"
        ],
        "skinnable": true
    },
    "resize-constrain": {
        "requires": [
            "plugin",
            "resize-base"
        ]
    },
    "resize-plugin": {
        "optional": [
            "resize-constrain"
        ],
        "requires": [
            "resize-base",
            "plugin"
        ]
    },
    "resize-proxy": {
        "requires": [
            "plugin",
            "resize-base"
        ]
    },
    "router": {
        "optional": [
            "querystring-parse"
        ],
        "requires": [
            "array-extras",
            "base-build",
            "history"
        ]
    },
    "scrollview": {
        "requires": [
            "scrollview-base",
            "scrollview-scrollbars"
        ]
    },
    "scrollview-base": {
        "requires": [
            "widget",
            "event-gestures",
            "event-mousewheel",
            "transition"
        ],
        "skinnable": true
    },
    "scrollview-base-ie": {
        "condition": {
            "name": "scrollview-base-ie",
            "trigger": "scrollview-base",
            "ua": "ie"
        },
        "requires": [
            "scrollview-base"
        ]
    },
    "scrollview-list": {
        "requires": [
            "plugin",
            "classnamemanager"
        ],
        "skinnable": true
    },
    "scrollview-paginator": {
        "requires": [
            "plugin",
            "classnamemanager"
        ]
    },
    "scrollview-scrollbars": {
        "requires": [
            "classnamemanager",
            "transition",
            "plugin"
        ],
        "skinnable": true
    },
    "selector": {
        "requires": [
            "selector-native"
        ]
    },
    "selector-css2": {
        "condition": {
            "name": "selector-css2",
            "test": function (Y) {
    var DOCUMENT = Y.config.doc,
        ret = DOCUMENT && !('querySelectorAll' in DOCUMENT);

    return ret;
},
            "trigger": "selector"
        },
        "requires": [
            "selector-native"
        ]
    },
    "selector-css3": {
        "requires": [
            "selector-native",
            "selector-css2"
        ]
    },
    "selector-native": {
        "requires": [
            "dom-base"
        ]
    },
    "series-area": {
        "requires": [
            "series-cartesian",
            "series-fill-util"
        ]
    },
    "series-area-stacked": {
        "requires": [
            "series-stacked",
            "series-area"
        ]
    },
    "series-areaspline": {
        "requires": [
            "series-area",
            "series-curve-util"
        ]
    },
    "series-areaspline-stacked": {
        "requires": [
            "series-stacked",
            "series-areaspline"
        ]
    },
    "series-bar": {
        "requires": [
            "series-marker",
            "series-histogram-base"
        ]
    },
    "series-bar-stacked": {
        "requires": [
            "series-stacked",
            "series-bar"
        ]
    },
    "series-base": {
        "requires": [
            "graphics",
            "axis-base"
        ]
    },
    "series-candlestick": {
        "requires": [
            "series-range"
        ]
    },
    "series-cartesian": {
        "requires": [
            "series-base"
        ]
    },
    "series-column": {
        "requires": [
            "series-marker",
            "series-histogram-base"
        ]
    },
    "series-column-stacked": {
        "requires": [
            "series-stacked",
            "series-column"
        ]
    },
    "series-combo": {
        "requires": [
            "series-cartesian",
            "series-line-util",
            "series-plot-util",
            "series-fill-util"
        ]
    },
    "series-combo-stacked": {
        "requires": [
            "series-stacked",
            "series-combo"
        ]
    },
    "series-combospline": {
        "requires": [
            "series-combo",
            "series-curve-util"
        ]
    },
    "series-combospline-stacked": {
        "requires": [
            "series-combo-stacked",
            "series-curve-util"
        ]
    },
    "series-curve-util": {},
    "series-fill-util": {},
    "series-histogram-base": {
        "requires": [
            "series-cartesian",
            "series-plot-util"
        ]
    },
    "series-line": {
        "requires": [
            "series-cartesian",
            "series-line-util"
        ]
    },
    "series-line-stacked": {
        "requires": [
            "series-stacked",
            "series-line"
        ]
    },
    "series-line-util": {},
    "series-marker": {
        "requires": [
            "series-cartesian",
            "series-plot-util"
        ]
    },
    "series-marker-stacked": {
        "requires": [
            "series-stacked",
            "series-marker"
        ]
    },
    "series-ohlc": {
        "requires": [
            "series-range"
        ]
    },
    "series-pie": {
        "requires": [
            "series-base",
            "series-plot-util"
        ]
    },
    "series-plot-util": {},
    "series-range": {
        "requires": [
            "series-cartesian"
        ]
    },
    "series-spline": {
        "requires": [
            "series-line",
            "series-curve-util"
        ]
    },
    "series-spline-stacked": {
        "requires": [
            "series-stacked",
            "series-spline"
        ]
    },
    "series-stacked": {
        "requires": [
            "axis-stacked"
        ]
    },
    "shim-plugin": {
        "requires": [
            "node-style",
            "node-pluginhost"
        ]
    },
    "slider": {
        "use": [
            "slider-base",
            "slider-value-range",
            "clickable-rail",
            "range-slider"
        ]
    },
    "slider-base": {
        "requires": [
            "widget",
            "dd-constrain",
            "event-key"
        ],
        "skinnable": true
    },
    "slider-value-range": {
        "requires": [
            "slider-base"
        ]
    },
    "sortable": {
        "requires": [
            "dd-delegate",
            "dd-drop-plugin",
            "dd-proxy"
        ]
    },
    "sortable-scroll": {
        "requires": [
            "dd-scroll",
            "sortable"
        ]
    },
    "stylesheet": {
        "requires": [
            "yui-base"
        ]
    },
    "substitute": {
        "optional": [
            "dump"
        ],
        "requires": [
            "yui-base"
        ]
    },
    "swf": {
        "requires": [
            "event-custom",
            "node",
            "swfdetect",
            "escape"
        ]
    },
    "swfdetect": {
        "requires": [
            "yui-base"
        ]
    },
    "tabview": {
        "requires": [
            "widget",
            "widget-parent",
            "widget-child",
            "tabview-base",
            "node-pluginhost",
            "node-focusmanager"
        ],
        "skinnable": true
    },
    "tabview-base": {
        "requires": [
            "node-event-delegate",
            "classnamemanager"
        ]
    },
    "tabview-plugin": {
        "requires": [
            "tabview-base"
        ]
    },
    "template": {
        "use": [
            "template-base",
            "template-micro"
        ]
    },
    "template-base": {
        "requires": [
            "yui-base"
        ]
    },
    "template-micro": {
        "requires": [
            "escape"
        ]
    },
    "test": {
        "requires": [
            "event-simulate",
            "event-custom",
            "json-stringify"
        ]
    },
    "test-console": {
        "requires": [
            "console-filters",
            "test",
            "array-extras"
        ],
        "skinnable": true
    },
    "text": {
        "use": [
            "text-accentfold",
            "text-wordbreak"
        ]
    },
    "text-accentfold": {
        "requires": [
            "array-extras",
            "text-data-accentfold"
        ]
    },
    "text-data-accentfold": {
        "requires": [
            "yui-base"
        ]
    },
    "text-data-wordbreak": {
        "requires": [
            "yui-base"
        ]
    },
    "text-wordbreak": {
        "requires": [
            "array-extras",
            "text-data-wordbreak"
        ]
    },
    "timers": {
        "requires": [
            "yui-base"
        ]
    },
    "transition": {
        "requires": [
            "node-style"
        ]
    },
    "transition-timer": {
        "condition": {
            "name": "transition-timer",
            "test": function (Y) {
    var DOCUMENT = Y.config.doc,
        node = (DOCUMENT) ? DOCUMENT.documentElement: null,
        ret = true;

    if (node && node.style) {
        ret = !('MozTransition' in node.style || 'WebkitTransition' in node.style || 'transition' in node.style);
    }

    return ret;
},
            "trigger": "transition"
        },
        "requires": [
            "transition"
        ]
    },
    "tree": {
        "requires": [
            "base-build",
            "tree-node"
        ]
    },
    "tree-labelable": {
        "requires": [
            "tree"
        ]
    },
    "tree-lazy": {
        "requires": [
            "base-pluginhost",
            "plugin",
            "tree"
        ]
    },
    "tree-node": {},
    "tree-openable": {
        "requires": [
            "tree"
        ]
    },
    "tree-selectable": {
        "requires": [
            "tree"
        ]
    },
    "tree-sortable": {
        "requires": [
            "tree"
        ]
    },
    "uploader": {
        "requires": [
            "uploader-html5",
            "uploader-flash"
        ]
    },
    "uploader-flash": {
        "requires": [
            "swfdetect",
            "escape",
            "widget",
            "base",
            "cssbutton",
            "node",
            "event-custom",
            "uploader-queue"
        ]
    },
    "uploader-html5": {
        "requires": [
            "widget",
            "node-event-simulate",
            "file-html5",
            "uploader-queue"
        ]
    },
    "uploader-queue": {
        "requires": [
            "base"
        ]
    },
    "view": {
        "requires": [
            "base-build",
            "node-event-delegate"
        ]
    },
    "view-node-map": {
        "requires": [
            "view"
        ]
    },
    "widget": {
        "use": [
            "widget-base",
            "widget-htmlparser",
            "widget-skin",
            "widget-uievents"
        ]
    },
    "widget-anim": {
        "requires": [
            "anim-base",
            "plugin",
            "widget"
        ]
    },
    "widget-autohide": {
        "requires": [
            "base-build",
            "event-key",
            "event-outside",
            "widget"
        ]
    },
    "widget-base": {
        "requires": [
            "attribute",
            "base-base",
            "base-pluginhost",
            "classnamemanager",
            "event-focus",
            "node-base",
            "node-style"
        ],
        "skinnable": true
    },
    "widget-base-ie": {
        "condition": {
            "name": "widget-base-ie",
            "trigger": "widget-base",
            "ua": "ie"
        },
        "requires": [
            "widget-base"
        ]
    },
    "widget-buttons": {
        "requires": [
            "button-plugin",
            "cssbutton",
            "widget-stdmod"
        ]
    },
    "widget-child": {
        "requires": [
            "base-build",
            "widget"
        ]
    },
    "widget-htmlparser": {
        "requires": [
            "widget-base"
        ]
    },
    "widget-modality": {
        "requires": [
            "base-build",
            "event-outside",
            "widget"
        ],
        "skinnable": true
    },
    "widget-parent": {
        "requires": [
            "arraylist",
            "base-build",
            "widget"
        ]
    },
    "widget-position": {
        "requires": [
            "base-build",
            "node-screen",
            "widget"
        ]
    },
    "widget-position-align": {
        "requires": [
            "widget-position"
        ]
    },
    "widget-position-constrain": {
        "requires": [
            "widget-position"
        ]
    },
    "widget-skin": {
        "requires": [
            "widget-base"
        ]
    },
    "widget-stack": {
        "requires": [
            "base-build",
            "widget"
        ],
        "skinnable": true
    },
    "widget-stdmod": {
        "requires": [
            "base-build",
            "widget"
        ]
    },
    "widget-uievents": {
        "requires": [
            "node-event-delegate",
            "widget-base"
        ]
    },
    "yql": {
        "requires": [
            "oop"
        ]
    },
    "yql-jsonp": {
        "condition": {
            "name": "yql-jsonp",
            "test": function (Y) {
    /* Only load the JSONP module when not in nodejs or winjs
    TODO Make the winjs module a CORS module
    */
    return (!Y.UA.nodejs && !Y.UA.winjs);
},
            "trigger": "yql"
        },
        "requires": [
            "yql",
            "jsonp",
            "jsonp-url"
        ]
    },
    "yql-nodejs": {
        "condition": {
            "name": "yql-nodejs",
            "trigger": "yql",
            "ua": "nodejs"
        },
        "requires": [
            "yql"
        ]
    },
    "yql-winjs": {
        "condition": {
            "name": "yql-winjs",
            "trigger": "yql",
            "ua": "winjs"
        },
        "requires": [
            "yql"
        ]
    },
    "yui": {},
    "yui-base": {},
    "yui-later": {
        "requires": [
            "yui-base"
        ]
    },
    "yui-log": {
        "requires": [
            "yui-base"
        ]
    },
    "yui-throttle": {
        "requires": [
            "yui-base"
        ]
    }
});
YUI.Env[Y.version].md5 = '2fd2be6b12ee9f999b4367499ae61aae';


}, '3.18.1', {"requires": ["loader-base"]});
YUI.add('yui', function (Y, NAME) {}, '3.18.1', {
    "use": [
        "yui-base",
        "get",
        "features",
        "intl-base",
        "yui-log",
        "yui-later",
        "loader-base",
        "loader-rollup",
        "loader-yui3"
    ]
});
if (!Array.prototype.indexOf) {
  Array.prototype.indexOf = function(elt /*, from*/)  {  
    var len = this.length >>> 0;  
  
    var from = Number(arguments[1]) || 0;  
    from = (from < 0)  
         ? Math.ceil(from)  
         : Math.floor(from);  
    if (from < 0)  
      from += len;  
  
    for (; from < len; from++) {  
      if (from in this &&  
          this[from] === elt)  
        return from;  
    }  
    return -1;  
  };  
}

Array.prototype.flatten = function () {
	var result = [],
	    i,
	    len,
	    item,
	    proto = Array.prototype;

	for (i = 0, len = this.length; i < len; i++) {
		item = this[i];
		if (Object.prototype.toString.call(item) === "[object Array]") {
			proto.push.apply(result, proto.flatten.call(item));
		} else {
			result.push(item);
		}
	}
	return result;
};

function argsArray(args) {
	return Array.prototype.slice.call(args);
}

Array.prototype.last = function () {
	return this[this.length - 1];
};

Array.prototype.deleteItem = function (item) {
	var i = this.indexOf(item);

	i !== -1 && this.splice(i, 1);
};

Array.prototype.shuffle = function () {
	var i = this.length,
	    r,
	    item,
	    temp;

	while (--i) {
		r = ~~(Math.random() * i);
		item = this[i];
		temp = this[r];
		this[r] = item;
		this[i] = temp;
	}
};

Function.prototype.bind = function (o) {
	var f = this;

	return function () {
		var args = argsArray(arguments);

		return f.apply(o, args);
	};
};

Function.prototype.partial = function () {
	var f = this, captured = argsArray(arguments);

	return function () {
		var i, len, args = [].concat(captured);

		for (i = 0, len = arguments.length; i < len; i++) {
			args.push(arguments[i]);
		}

		return f.apply(this, args);
	};
};

function instance(proto, attrs) {
	var maker = new Function(),
	    o,
	    p;

	maker.prototype = proto;
	o = new maker;
	if (typeof attrs === "object") {
		for (p in attrs) {
			if (attrs.hasOwnProperty(p)) {
				o[p] = attrs[p];
			}
		}
	}

	return o;
}

function normalize(valOrFunction) {
	var val = typeof valOrFunction === "function" ? valOrFunction() : valOrFunction;

	return isNaN(val) ? undefined : val;
}

Object.prototype.mapToFloat = function () {
	var p;

	for (p in this) {
		if (this.hasOwnProperty(p)) {
			this[p] = parseFloat(this[p]);
		}
	}

	return this;
}

Object.prototype.mapAppend = function (str) {
	var p;

	for (p in this) {
		if (this.hasOwnProperty(p)) {
			this[p] += str;
		}
	}

	return this;
}

var Game;

YUI.add("solitaire", function (Y) {

var Solitaire = Y.namespace("Solitaire");

function CardDelegate(cfg) {
	CardDelegate.superclass.constructor.call(this, cfg);
}

Y.extend(CardDelegate, Y.DD.Delegate, {
	getCard: function () {
		return this.get("currentNode").getData("target");
	}
});

Y.mix(Solitaire, {
	activeCard: null,
	moves: null,
	selector: "body",
	offset: {left: 50, top: 70},
	padding: {x: 50, y: 50},
	widthScale: 0,

	noop: function () {},

	name: function () {
		var p;

		for (p in Solitaire) {
			if (Solitaire.hasOwnProperty(p) && Solitaire[p] === Game) { return p; }
		}
	},

	container: function () {
		return Y.one(Solitaire.selector);
	},

	width: function () { return this.Card.base.width * this.widthScale; },
	height: function () { return this.Card.base.height * 4.2; },
	maxStackHeight: function () {
		return Solitaire.Application.windowHeight - 
			normalize(this.Tableau.stackConfig.layout.top) -
			Solitaire.offset.top;
	},

	undo: function () {
		Y.fire("undo");
	},

	pushMove: function (move) {
		var moves = Solitaire.moves;
		moves && moves.push(move);
	},

	serialize: function () {
		var serialized = [],
		    lengths = [],
		    data,
		    stacks,
		    i, len;

		Y.Array.each(this.fields, function (field) {
			stacks = this[field.toLowerCase()].stacks;

			for (i = 0, len = stacks.length; i < len; i++) {
				data = stacks[i].serialize();
				serialized.push(data);
				lengths.push(String.fromCharCode(data.length));
			}
		}, this);

		return [String.fromCharCode(serialized.length)].concat(lengths, serialized).join("");
	},

	stationary: function (callback) {
		var updatePosition = Game.Card.updatePosition;

		Game.Card.updatePosition = Solitaire.noop;
		callback.call(this);
		Game.Card.updatePosition = updatePosition;
	},

	unanimated: function (callback) {
		var anim = Y.Solitaire.Animation,
		    animate = anim.animate;

		anim.animate = false;
		callback.call(this);
		anim.animate = animate;
	},

	unserialize: function (serialized) {
		this.unanimated(function () {
			var numStacks = serialized.charCodeAt(0),
			    lengths = serialized.substr(1, numStacks),
			    offset = numStacks + 1,
			    data,
			    fields = this.fields, fieldIndex = -1,
			    stacks = [], stackIndex,
			    stack,
			    i,
			    length;

			for (i = 0, stackIndex = 0; i < numStacks; i++, stackIndex++, offset += length) {
				length = lengths.charCodeAt(i);
				data = serialized.substr(offset, length);

				if (stackIndex === stacks.length) {
					fieldIndex++;
					stacks = this[fields[fieldIndex].toLowerCase()].stacks;
					stackIndex = 0;
				}

				stack = stacks[stackIndex];
				stack.unserialize(data);
				stack.updateCardsPosition();
			}
		});
	},

	save: function (name) {
		var data = this.serialize(),
		    name = name || "saved-game",
		    twoWeeks = 1206900000;

		Y.Cookie.set(name, data, {expires: new Date(new Date().getTime() + twoWeeks)});
	},

	loadGame: function (data) {
		this.unanimated(function () {
			this.setup(function () {
				this.unserialize(data);
			});
		});

		Y.fire("loadGame");
	},

	newGame: function () {
		Y.Cookie.remove("saved-game");
		this.setup(this.deal);

		Game.save("initial-game");

		Y.fire("newGame");
	},

	cleanup: function () {
		Y.Event.purgeElement(this.container());

		//remove custom events
		Y.detach("solitaire|*");

		this.eachStack(function (stack) {
			stack.cleanup();
		});
	},

	setup: function (callback) {
		Game = Solitaire.game = this;

		Y.fire("beforeSetup");

		Solitaire.moves = null;
		Undo.clear();

		this.stationary(function () {
			this.init();
			Y.Solitaire.Animation.initQueue();
			this.createStacks();
			this.createEvents();
			this.createDraggables();
			callback.call(this);

		});

		Solitaire.moves = [];
		Y.fire("afterSetup");

		Y.Solitaire.Animation.dealing = true;

		Game.eachStack(function (s) {
			s.updateCardsStyle();
			s.updateCardsPosition();
		});

		Y.Solitaire.Animation.dealing = false;
	},

	createEvents: function () {
		var container = Y.one(Solitaire.selector);

		container.delegate("dblclick", Game.autoPlay, ".card");
		container.delegate("contextmenu", Game.autoPlay, ".card");

		container.delegate("click", Game.Events.click, ".card");
		container.delegate("touchend", Game.Events.click, ".card");

		Y.on("solitaire|endTurn", Game.Events.endTurn);
		Y.on("solitaire|undo", Game.Events.undo);
	},


	createDraggables: function () {
		var del = new CardDelegate({
			dragConfig: {
				dragMode: "intersect",
				groups: ["open"],
				clickPixelThresh: 0
			},
			container: Solitaire.selector,
			nodes: ".card"
		});
		
		del.dd.plug(Y.Plugin.DDProxy, {
			borderStyle: "none",
			moveOnEnd: false
		});

		del.on("drag:drag", Game.Events.drag);
		del.on("drag:mouseDown", Game.Events.dragCheck);
		del.on("drag:start", Game.Events.dragStart);
		del.on("drag:dropmiss", Game.Events.dragMiss);
		del.on("drag:drophit", Game.Events.drop);
		del.on("drag:end", Game.Events.dragEnd);
	},

	createField: function (field) {
		if (!field) { return; }

		var f = instance(field),
		    stackLayout,
		    stack,
		    stacks,
		    i, len;

		if (field.stackConfig) {
			stackLayout = field.stackConfig.layout;
			stacks = new Array(field.stackConfig.total);
			field.Stack.field = field.field;

			for (i = 0, len = stacks.length; i < len; i++) {

				stack = instance(field.Stack);
				stack.configLayout = stackLayout;

				stack.layout(Y.merge(stackLayout, {
					hoffset: i * stackLayout.hspacing || 0,
					voffset: i * stackLayout.vspacing || 0}), i);

				stacks[i] = stack;
			};
		}


		f.stacks = stacks;

		typeof f.init === "function" && f.init();

		return f;
	},

	createStacks: function () {
		this.eachStack(function (stack) {
			stack.cards = [];
			stack.createNode();
		});
	},

	eachStack: function (callback, fieldName) {
		Game && Y.Array.each(Game.fields, function (name) {
			var currentName = name.toLowerCase(),
			    field = Game[currentName],
			    fname = fieldName || currentName;

			fname === currentName && field.stacks && Y.Array.each(field.stacks, callback);
		});
	},

	resize: function (scale) {
		Y.fire("beforeResize");

		this.scale(scale);

		this.unanimated(function () {
			this.eachStack(function (stack, i) {
				var cards = stack.cards,
				    layout = stack.configLayout;

				stack.adjustRankHeight();
				stack.cards = [];
				stack.layout(Y.merge(layout, {
					hoffset: i * layout.hspacing || 0,
					voffset: i * layout.vspacing || 0}), i);

				stack.updateStyle();

				stack.setCards(cards.length, function (i) {
					var card = cards[i];

					card && card.updateStyle();
					return card;
				});	

				stack.update();
			});
		});

		Y.fire("afterResize");
	},

	scale: function (scale) {
		var Card = Y.Solitaire.Card,
		    base = Card.base,
		    prop;

		Card.scale = scale;

		for (prop in base) {
			if (base.hasOwnProperty(prop)) {
				Card[prop] = base[prop] * scale;
			}
		};
	},

	init: function () {
		var cancel = Solitaire.preventDefault,
		    minX, maxX,
		    fields;

		Y.on("selectstart", cancel, document);
		Y.on("mousedown", cancel, document.body);
		Y.on("contextmenu", function (e) {
			var target = e.target;

			if (target.hasClass("stack") || target.hasClass("card")) {
				e.preventDefault();
			}
		}, document);

		this.scale(1);

		fields = Y.Array.map(Game.fields, function (field) {
			return Game[field.toLowerCase()] = Game.createField(Game[field]);
		});

		// TODO: refactor this conditional into the above iteration
		if (Game.fields.indexOf("Deck" === -1)) {
			Game.deck = Game.createField(Game.Deck);
		}

		// find the game/card width ratio
		minX = Math.min.apply(Math, Y.Array.map(fields, function (f) {
			return Y.Array.map(f.stacks, function (s) { return s.left; });
		}).flatten());

		maxX = Math.max.apply(Math, Y.Array.map(fields, function (f) {
			return Y.Array.map(f.stacks, function (s) { return s.left; });
		}).flatten()) + this.Card.width;

		this.widthScale = (maxX - minX) / this.Card.base.width;
	},

	preventDefault: function (e) {
		e.preventDefault();
	},

	autoPlay: function () {
		var card = typeof this.getCard === "function"
			? this.getCard()
			: this.getData("target");

		card.autoPlay();
	},

	isWon: function () {
		var foundations = this.foundation.stacks,
		    deck = this.deck,
		    total,
		    placed = 0,
		    i, len;

		total = deck.suits.length * 13 * deck.count;
		for (i = 0, len = foundations.length; i < len; i++) {
			placed += foundations[i].cards.length;
		}

		return placed === total;
	},

	win: function () {
		Y.fire("win");
		Y.Cookie.remove("saved-game");
	},

	endTurn: function () {
		Y.fire("endTurn");
	}
});

Y.Solitaire.Events = {
		click: function (e) {
			var card = e.target.getData("target");

			if (card.dragging) { return; }

			card.dragging = false;
			card.turnOver(e);
			Solitaire.moves.reverse();
			Solitaire.endTurn();
			e.preventDefault();
		},

		clickEmptyDeck: function () {
			Game.redeal();
			Solitaire.moves.reverse();
			Solitaire.endTurn();
		},

		drag: function () {
			this.getCard().dragging = true;
		},

		dragCheck: function () {
			var card = this.getCard(),
			    stack = card.createProxyStack();

			if (!stack) { return; }

			Solitaire.activeCard = card;

			Game.eachStack(function (stack) {
				stack.updateDragGroups();
			});
		},

		dragStart: function () {
			var card = this.getCard(),
			    node = this.get("dragNode"),
			    proxy = card.createProxyNode();

			if (proxy) {
				node.setContent(proxy);
				!card.proxyStack && Y.one(".yui3-dd-shim").setStyle("cursor", "not-allowed");
			}
		},

		dragMiss: function () {
			var card = this.getCard();

			Game.unanimated(function () {
				card.updatePosition();
			});
		},

		dragEnd: function () {
			var target = this.getCard(),
			    root = Solitaire.container(),
			    fragment = new Y.Node(document.createDocumentFragment()),
			    dragNode,
			    node,

			    dragXY = this.dd.realXY,
			    containerXY = root.getXY(),

			    cards,
			    
			    stack,
			    proxyStack = target.proxyStack;

			target.dragging = false;
			dragNode = this.get("dragNode");
			node = dragNode.get("firstChild");

			node && node.remove();

			if (!proxyStack) { return; }

			cards = proxyStack.cards;
			stack = target.stack;

			proxyStack.left = dragXY[0] - containerXY[0];
			proxyStack.top = dragXY[1] - containerXY[1];

			Game.unanimated(function() {
				proxyStack.updateCardsPosition();
			});

			Y.Array.each(cards, function (card) {
				if (!card) { return; }

				card.proxyStack = null;
				fragment.append(card.node);
			});

			root.append(fragment);

			stack.updateCardsPosition();
		},

		drop: function (e) {
			if (!Solitaire.activeCard) { return; }

			var card = Solitaire.activeCard,

			    stack = card.proxyStack,
			    origin = card.stack,
			    target,
			    first;
		       
			if (stack) {
				first = stack.first();

				target = e.drop.get("node").getData("target");

				target = target.stack || target;

				if ((stack.cards.length === 1 && first.validTarget(target)) ||
				    stack.validTarget(target)) {

					target.pushStack(stack);
				}
			}

			Solitaire.endTurn();
		},

		endTurn: function () {
			Solitaire.moves.length && Undo.push(Solitaire.moves);
			Solitaire.moves = [];
			Solitaire.activeCard = null;
			Game.eachStack(function (s) {
				s.updateCardsStyle();
			});

			if (Game.isWon()) {
				Game.win();
			} else {
				Game.save();
			}
		},

		undo: function () {
			var args = argsArray(arguments);

			args.unshift("endTurn");
			Undo.undo();
			Y.fire.apply(Y, args);
		}
};

Y.Solitaire.Deck = {
		count: 1,
		suits: ["c", "d", "h", "s"],

		init: function (seed) {
			var suits = this.suits,
			    suit, s,
			    rank,
			    count,
			    Card = Game.Card;

			this.cards = [];

			for (count = 0; count < this.count; count++) {
				for (rank = 1; rank <= 13; rank++ ) {
					for (s = 0; suit = suits[s]; s++) {
						this.cards.push(Card.create(rank, suit).faceDown());
					}
				}
			}

			if (seed === undefined) {
				this.cards.shuffle();
			} else {
				this.msSeededShuffle(seed);
			}
		},

		// shuffle the deck using the "Microsoft Number"
		msSeededShuffle: function (seed) {
			var cards = this.cards,
			    maxInt = Math.pow(2, 31),
			    rand,
			    temp,
			    i;

			for (i = cards.length; i > 1; i--) {
				// simulate x86 integer overflow
				seed = ((214013 * seed) % maxInt + 2531011) % maxInt;
				rand = (seed >> 16) & 0x7fff;

				item = cards[i - 1];
				temp = cards[rand % i];
				cards[i - 1] = temp;
				cards[rand % i] = item;
			}
		},

		createStack: function () {
			var i;

			for (i = this.cards.length - 1; i >= 0; i--) {
				this.stacks[0].push(this.cards[i]);
			}
		},

		last: function () {
			return this.cards.last();
		},

		pop: function () {
			return this.cards.pop();
		}
	};

Y.Solitaire.Card = {
		zIndex: 1,
		index: -1,
		width: null,
		height: null,
		rankHeight: null,
		hiddenRankHeight: null,
		isFaceDown: false,
		positioned: false,
		scale: 1,
		stack: null,
		proxyStack: null,
		ghost: true,
		dragging: false,
		node: null,
		callback: null,
		left: 0,
		top: 0,

		base: {
		},

		origin: {
			left: function () {
				var offset = Solitaire.container().getXY()[0];
				
				return -offset - Y.Solitaire.Card.width;
			},
			top: function () {
				var offset = Solitaire.container().getXY()[1];

				return -offset - Y.Solitaire.Card.height;
			}
		},

		animSpeeds: {slow: 0.5, mid: 0.2, fast: 0.1},

		create: function (rank, suit) {
			var colors = {c: 0, s: 0, h: 1, d: 1};

			return instance(this, {rank: rank, suit: suit, color: colors[suit]});
		},

		truncatePosition: function () {
			this.left = Math.floor(this.left);
			this.top = Math.floor(this.top);
		},

		faceDown: function (undo) {
			this.isFaceDown = true;
			this.setRankHeight();
			this.setImageSrc();

			undo || Solitaire.pushMove({card: this, faceDown: true});

			return this;
		},

		faceUp: function (undo) {
			this.isFaceDown = false;
			this.setRankHeight();
			this.setImageSrc();

			undo || Solitaire.pushMove({card: this, faceDown: false});

			return this;
		},

		setRankHeight: function () {
			var stack = this.stack,
			    rh, hh;

			if (stack && stack.rankHeight) {
				rh = stack.rankHeight;
				hh = stack.hiddenRankHeight;
			} else {
				rh = Solitaire.Card.rankHeight;
				hh = Solitaire.Card.hiddenRankHeight;
			}

			this.rankHeight = this.isFaceDown ? hh : rh;
		},

		imageSrc: function () {
			var src = this.base.theme + "/";

			src += this.isFaceDown ?
				"facedown" :
				this.suit + this.rank;

			src += ".png";
			
			return src;
		},

		setImageSrc: function () {
			var n = this.node;

			n && n.setAttribute("src", this.imageSrc());
		},

		wrapperStyle: function () {
			return {
				left: this.left,
				top: this.top,
				width: Math.floor(this.width),
				height: Math.floor(this.height)
			};
		},

		updateStyle: function () {
			var n = this.node;

			n && n.setStyles(this.wrapperStyle());
			this.setRankHeight();
		},

		turnOver: function (e) {
			if (!this.isFaceDown) { return; }

			var stack = this.stack;

			if (stack.field === "deck") {
				Game.turnOver();
			} else if (this.isFree()) {
				this.faceUp();
			}

			e.stopPropagation();
		},

		autoPlay: function () {
			var origin = this.stack,
			    last = origin.last(),
			    stacks,
			    foundation,
			    i, len;

			if (this.isFaceDown || origin.field === "foundation") { return; }

			stacks = Game.foundation.stacks;
			for (i = 0, len = stacks.length; i < len; i++) {
				foundation = stacks[i];
				if (this.isFree() && this.validTarget(foundation)) {
					this.moveTo(foundation);
					origin.updateCardsPosition();
					origin.update();

					Solitaire.endTurn();
					return true;
				}
			}

			return false;
		},

		ensureDOM: function () {
			!this.node && this.createNode();
		},

		isFree: function () {
			return this === this.stack.last();
		},

		playable: function () {
			return this.stack.field === "deck" || (this.isFree() && (this.stack.field !== "foundation"));
		},

		createNode: function () {
			var groups,
			    node,
			    card = this;

			node = this.node = Y.Node.create("<img class='card'>")
				.setData("target", this)
				.setAttribute("src", this.imageSrc())
				.plug(Y.Plugin.Drop, {
					useShim: false
				});

			node.setStyles({left: -this.width, top: -this.height});
			//this.updateStyle();
			this.setRankHeight();

			Solitaire.container().append(node);
		},
		
		destroyNode: function () {
			var n = this.node;

			n && n.clearData().destroy(true);
		},

		createProxyStack: function () {
			if (this.isFaceDown || this.stack.field === "foundation") {
				this.proxyStack = null;
				return null;
			}

			var stack = instance(this.stack, {
				proxy: true,
				stack: this.stack
			    }),
			    cards = stack.cards,
			    card,
			    i, len;

			stack.cards = [];
			stack.push(this, true);

			for (i = cards.indexOf(this) + 1, len = cards.length; i < len; i++) {
				card = cards[i];
				if (stack.validProxy(card)) {
					stack.push(card, true);
				} else {
					break;
				}
			}

			this.proxyStack = i === len ? stack : null;

			return this.proxyStack;
		},

		proxyCards: function () {
			return this.proxyStack.cards;
		},

		createProxyNode: function () {
			var node = Y.Node.create("<div>"),
			    stack = this.proxyStack;

			// if the card isn't playable, create ghost copy
			if (!stack) {
				if (!this.ghost) { return null; }

				node.setStyles({
					opacity: 0.6,
					top: -this.top,
					left: -this.left
				}).append(this.node.cloneNode(true));
			} else {
				node.setStyles({opacity: 1, top: -this.top, left: -this.left});

				Y.Array.each(this.proxyCards(), function (c) {
					c.proxyStack = stack;
					node.append(c.node);
				});
			}

			return node;
		},

		updatePosition: function (fields) {
			if (!this.node) { return; }

			var to = {left: this.left + "px", top: this.top + "px", zIndex: this.zIndex},
			    origin = this.origin;

			if (!this.positioned) {
				this.node.setStyles({left: normalize(origin.left), top: normalize(origin.top)});
			}

			Y.Solitaire.Animation.init(this, to, fields);
		},

		pushPosition: function () {
			var index = this.index >= 0 ?
				this.index :
				this.stack.cards.indexOf(this);

			Solitaire.pushMove({
				card: this,
				index: index,
				from: this.stack
			});
		},

		moveTo: function (stack) {
			var origin = this.stack;

			this.pushPosition();
			origin.deleteItem(this);
			stack.push(this);

			Y.fire(origin.field + ":afterPop", origin);

			return this;
		},

		after: function (callback) {
			this.callback = callback;
		},

		runCallback: function () {
			if (this.callback) {
				this.callback.call(this);
				this.callback = null;
			}
		}
	};

Y.Solitaire.Stack = {
		cards: null,
		node: null,
		images: {
			tableau: "freeslot.png",
			deck: "freeslot.png",
			reserve: "freeslot.png",
			foundation: "freeslot.png"
		},

		serialize: function () {
			var i, len,
			    cards = this.cards,
			    card,
			    suits = Game.deck.suits,
			    bite,
			    serialized = [];

			for (i = 0, len = cards.length; i < len; i++) {
				card = cards[i];
				if (card) {
					bite = suits.indexOf(card.suit) |
						card.rank << 2 |
						card.isFaceDown << 6; // type coersion!
				} else {
					bite = 128;
				}
				serialized.push(String.fromCharCode(bite));
			}

			return serialized.join("");
		},

		eachCard: function (callback) {
			var i, len,
			    cards = this.cards;

			for (i = 0, len = cards.length; i < len; i++) {
				if (cards[i]) {
					if (callback.call(this, cards[i], i) === false) { return false; }
				}
			}

			return true;
		},

		setCards: function (count, cardGen) {
			var i, len,
			    card, cards,
			    empty = instance(Game.Card, {
				updatePosition: Solitaire.noop,
				ensureDOM: Solitaire.noop
			    });

			cards = this.cards = [];

			for (i = 0; i < count; i++) {
				card = cardGen.call(this, i) || empty;
				this.push(card);
			}

			for (i = 0; i < count; i++) {
				if (cards[i] === empty) {
					cards[i] = null;
				}
			}
		},

		updateCardsPosition: function () {
			var cards = this.cards;

			Game.stationary(function () {
				this.proxy || this.adjustRankHeight();
				this.setCards(cards.length, function (i) {
					var card = cards[i];

					if (card) {
						card.stack = this;
						card.setRankHeight();
					}

					return card;
				});
			}.bind(this));

			this.eachCard(function (c) {
				c.updatePosition();
			});
		},

		updateCardsStyle: function () {
			var field = this.field;

			field === "foundation" || this.eachCard(function (c) {
				if (c.playable()) {
					c.node.addClass("playable");
				} else {
					c.node.removeClass("playable");
				}
			});
		},

		unserialize: function (serialized) {
			var deck = Game.deck,
			    Card = Game.Card;

			this.setCards(serialized.length, function (i) {
				var value,
				    card;

				value = serialized.charCodeAt(i);

				if (value === 128) {
					card = null;
				} else {
					card = Card.create(
						(value >> 2) & 15, // rank
						deck.suits[value & 3] // suit
					);

					value & 64 ? card.faceDown(true) : card.faceUp(true);
				}

				return card;
			});

			this.update();
		},

		imageSrc: function () {
			var basename = this.images[this.field];

			return basename ? Solitaire.Card.base.theme + "/" + basename : "trans.gif";
		},

		layout: function (layout) {
			var hoffset = layout.hoffset * Y.Solitaire.Card.width,
			    voffset = layout.voffset * Y.Solitaire.Card.height,
			    gameOffset = Solitaire.offset,
			    self = this;

			Y.Array.each(["top", "left"], function (p) {
				self[p] = normalize(layout[p]);
			});

			this.left += hoffset + gameOffset.left;
			this.top += voffset + gameOffset.top;
		},

		deleteItem: function (card) {
			this.cards.deleteItem(card);
		},

		push: function (card, temp) {
			var last = this.last(),
			    to = this.field,
			    from = card.stack ? card.stack.field : "deck";

			/*
			 * TODO: should zIndex setting up in setCardPosition?
			 */

			if (last) { card.zIndex = last.zIndex + 1; }
			else if (to === "deck" || to === "foundation") { card.zIndex = 200; }
			else if (from === "deck") { card.zIndex = Game.Card.zIndex; }

			if (!temp) {
				card.stack = this;
				this.setCardPosition(card);
				card.truncatePosition();
				card.ensureDOM();
			}

			this.cards.push(card);
			temp || card.updatePosition({from: from, to: to});
		},

		pushStack: function (proxy) {
			var origin = Solitaire.activeCard.stack,
			    stack = this;

			/* save the card's index in the stack so we can properly undo this move */
			origin.eachCard(function (card, i) {
				card.index = i;
			});

			Game.stationary(function () {
				proxy.eachCard(function (card) {
					card.moveTo(stack);
					card.index = -1;
				});
				origin.eachCard(function (card) {
					card.index = -1;
				});
			});

			origin.updateCardsPosition();
			origin.update();

			Y.fire(stack.field + ":afterPush", stack);
		},

		adjustRankHeight: function () {
			var cards = this.cards,
			    card,
			    last = this.last(),
			    max = Game.maxStackHeight(),

			    sumHidden = 0,
			    sumVisible = 0,
			    sumRankHeights,

			    height = 0,
			    Card = Solitaire.Card,
			    countHidden = 0, countVisible = 0,
			    rhHidden, rhVisible,
			    i, len;

			if (cards.length <= 1) { return; }

			for (i = 0, len = cards.length - 1; i < len; i++) {
				// if gaps in the stack are allowed, the stack's layed out horizontally
				if (!cards[i]) { return; }

				if (cards[i].isFaceDown) {
					sumHidden += Card.hiddenRankHeight;
					countHidden++;
					height += Card.hiddenRankHeight;
				} else {
					sumVisible += Card.rankHeight;
					countVisible++;
					height += Card.rankHeight;
				}
			}

			if (last) {
				height += last.height;
				sumRankHeights = max - last.height;
			}

			if (height <= max) {
				this.rankHeight = 0;
				this.hiddenRankHeight = 0;
				return;
			}

			rhHidden = sumRankHeights * (sumHidden / (sumHidden + sumVisible)) / countHidden;
			rhVisible = sumRankHeights * (sumVisible / (sumHidden + sumVisible)) / countVisible;

			this.hiddenRankHeight = Math.floor(rhHidden);
			this.rankHeight = Math.floor(rhVisible);
		},

		first: function () { 
			return this.cards[0];
		},

		last: function () {
			return this.cards.last();
		},

		index: function () {
			return Game[this.field].stacks.indexOf(this);
		},

		next: function () {
			return Game[this.field].stacks[this.index() + 1];
		},

		setCardPosition: function (card) {
			card.top = this.top;
			card.left = isNaN(this.left) ? null : this.left;
		},

		wrapperStyle: function () {
			return {
				left: Math.floor(this.left),
				top: Math.floor(this.top),
				width: Math.floor(Y.Solitaire.Card.width),
				height: Math.floor(Y.Solitaire.Card.height)
			};
		},

		updateStyle: function () {
			var n = this.node;

			n && n.setStyles(this.wrapperStyle());
		},

		createNode: function () {
			var node = this.node;

			node = this.node = Y.Node.create("<img class='stack'>")
				.setAttribute("src", this.imageSrc())
				.setData("target", this)
				.plug(Y.Plugin.Drop, {
					useShim: true
				});

			this.updateStyle();

			Solitaire.container().append(node);
		},

		cleanup: function () {
			var n = this.node;

			n && n.clearData().destroy(true);

			this.eachCard(function (c) {
				c.destroyNode();
			});
		},

		updateDragGroups: function () {
			var active = Solitaire.activeCard,
			    cards = this.cards,
			    last = this.last(),
			    drop,
			    i = cards.length - 1;

			this.eachCard(function (c) {
				c.node.drop.removeFromGroup("open");
			});

			if (active.validTarget(this)) {
				if (last) {
					last.node.drop.addToGroup("open");
				}
				this.node.drop.addToGroup("open");
			} else {
				this.node.drop.removeFromGroup("open");
			}
		},

		validCard: function () { return true; },

		validProxy: function (card) {
			return card && card.validTarget(this) && this.validCard(card);
		},

		update: function () {}
	};

Y.Solitaire.Animation = {
		animate: true,
		dealing: false,
		duration: 0.5, // seconds
		interval: 20, // milliseconds
		queue: new Y.AsyncQueue(),

		init: function (card, to, fields) {
			if (!this.animate) {
				card.node.setStyles(to);
				card.positioned = true;
				setTimeout(function () {
					card.runCallback();
				}, 0);
				return;
			}

			var node = card.node,
			    q = this.queue,
			    speeds = card.animSpeeds,
			    from = {top: node.getStyle("top"), left: node.getStyle("left")}.mapToFloat().mapAppend("px"),
			    zIndex = to.zIndex,
			    duration,
			    anim;
		       
			if (from.top === to.top && from.left === to.left) { return; }

			if (this.dealing) {
				duration = speeds.slow;
			} else if (!fields ||
			    fields.from === fields.to ||
			    fields.to === "waste" ||
			    fields.to === "foundation") {
				duration = speeds.fast;
			} else if (fields.from === "deck") {
				duration = speeds.slow;
			} else {
				duration = speeds.mid;
			}

			node.setStyle("zIndex", 500 + zIndex);
			delete to.zIndex;

			anim = new Y.Anim({
				node: node,
				from: from,
				to: to,
				easing: Y.Easing.easeOut,
				duration: duration
			});

			anim.on("end", function () {
				card.positioned = true;
				node.setStyle("zIndex", zIndex);
				card.runCallback();
			});

			q.add(function () { anim.run(); });
			q.run();
		},

		initQueue: function () {
			var q = this.queue;

			q.defaults.timeout = this.interval;
		}
	};

var Undo = {
	stack: null,

	clear: function () {
		this.stack = [];
	},

	push: function (moves) {
		this.stack.push(moves);
	},

	pop: function () {
		return this.stack.pop() || [];
	},

	undo: function () {
		var stacks;

		stacks = Y.Array.unique(Y.Array.map(this.pop(), this.act).flatten());

		Y.Array.each(stacks, function (stack) {
			if (stack) {
				stack.updateCardsPosition();
				stack.update(true);
			}
		});
	},

	act: function (move) {
		var from = move.from,
		    card = move.card,
		    to = card.stack,
		    cards = to.cards;

		if (from) {
			if (from === card.stack) {
				cards[cards.indexOf(card)] = null;
			} else {
				cards.deleteItem(card);
			}

			from.cards[move.index] = card;

			card.stack = from;

			Solitaire.container().append(card.node);
		}

		if ("faceDown" in move) {
			move.faceDown ? card.faceUp(true) : card.faceDown(true);
		}

		return [to, from];
	}
};

}, "0.0.1", {requires: ["dd", "dd-plugin", "dd-delegate", "anim", "async-queue", "cookie", "array-extras"]});
YUI.add("solitaire-ios", function (Y) {
	if (!Y.UA.ios) { return; }

	var Solitaire = Y.Solitaire,
	    _scale = Solitaire.scale,

	    LANDSCAPE = 0,
	    PORTRAIT = 1,

	    BARE_LAYOUT = {
	    	hspacing: 0,
		vspacing: 0,
		left: 0,
		top: 0,
	    },

	    DEFAULTS = {
	    	scale: 1,
		offset: 60,
		maxStackHeight: 155
	    },

	    OPTIONS = {
		Agnes: {offset: [null, 5], maxStackHeight: 260},
		FlowerGarden: {offset: [-60, 5], maxStackHeight: 235},
		Freecell: {scale: [1, 0.93], offset: [35, 5]},
		Golf: {scale: [1.1, 1], offset: [45, 8]},
		GClock: {scale: 0.93, offset: 5, maxStackHeight: 130},
		Klondike: {offset: [null, 5], maxStackHeight: [null, 340]},
		MonteCarlo: {scale: [0.88, 1], offset: [80, 15]},
		Pyramid: {offset: 20},
		Scorpion: {offset: 5, maxStackHeight: [235, 380]},
		Spider: {scale: [1.13, 0.79], offset: [5, 2], maxStackHeight: [160, 340]},
	    	TriTowers: {scale: 0.90, offset: 10},
		Yukon: {scale: [0.95, 1], offset: [50, 5], maxStackHeight: [235, 390]}
	    },

	    gameOverrides = {
		Agnes: function () {
			var hspacing = {hspacing: 1.13};

			fieldLayout(this, "Reserve", Y.merge(hspacing, {
				top: 60
			}));

			fieldLayout(this, "Tableau", Y.merge(hspacing, {
				top: 145
			}));

			fieldLayout(this, "Foundation", Y.merge(hspacing, {
				left: 135
			}));
		},

		FlowerGarden: [
			function () {
				this.Card.rankHeight = 15;

				fieldLayout(this, "Reserve", {
					top: 0,
					left: 70
				});

				fieldLayout(this, "Foundation", {
					top: 0,
					left: 470,
					hspacing: 0,
					vspacing: 1.1
				});

				fieldLayout(this, "Tableau", {
					top: 0,
					left: 140
				});

				Y.mix(this.Reserve.Stack, {
					setCardPosition: function (card) {
						var last = this.cards.last(),
						    top = last ? last.top + 11 : this.top,
						    left = this.left;

						card.left = left;
						card.top = top;
					},

					update: Solitaire.noop
				}, true);
			},

			function () {
				var setCardPosition = Solitaire.FlowerGarden.Reserve.Stack.setCardPosition;

				return function () {
					fieldLayout(this, "Tableau", {
						left: 10,
						top: 120
					});

					fieldLayout(this, "Reserve", {
						left: 17,
						top: 60
					});

					fieldLayout(this, "Foundation", {
						left: 55,
						top: 0,
						hspacing: 1.5,
						vspacing: 0
					});

					Y.mix(this.Reserve.Stack, {
						setCardPosition: setCardPosition,
						update: Solitaire.noop
					}, true);
				};
			}()
		],

		Freecell: [
			originalLayout("Freecell", ["Foundation", "Reserve", "Tableau"]),

			function () {
				var hspacing = {hspacing: 1.05};

				fieldLayout(this, "Tableau", hspacing);

				fieldLayout(this, "Reserve", hspacing);

				fieldLayout(this, "Foundation", Y.merge(hspacing, {
					left: 157
				}));
			}
		],

                Golf: [
                        originalLayout("Golf", ["Tableau", "Foundation"]),

                        function () {
                                fieldLayout(this, "Tableau", {hspacing: 1.1});
                                fieldLayout(this, "Foundation", {left: 132});
                        }
                ],

		GClock: function () {
			fieldLayout(this, "Foundation", {
				left: 143,
			});

			fieldLayout(this, "Tableau", {
				left: 0,
				top: 250,
				hspacing: 1.05
			});
		},

		Klondike: [
			function () {
				originalLayout("Klondike", "Foundation").call(this);
				originalLayout("Klondike", "Tableau").call(this);
			},

			function () {
				Y.mix(this.Foundation.stackConfig.layout, {left: 135, hspacing: 1.13}, true);
				Y.mix(this.Tableau.stackConfig.layout, {hspacing: 1.13}, true);
			}
		],

		MonteCarlo: function () {
			fieldLayout(this, "Tableau", {
				cardGap: 1.1,
				vspacing: 1.05
			});
		},

		Pyramid: [
			function () {
				var deck = originalLayout("Pyramid", "Deck");
				var waste = originalLayout("Pyramid", "Waste");

				return function () {
					deck.call(this);
					waste.call(this);

					Y.mix(this.Tableau.stackConfig.layout, {
						left: 190,
						cardGap: 1.1,
						hspacing: -0.55
					}, true);
				}
			}(),

			function () {
				Y.mix(this.Deck.stackConfig.layout, {
					left: -10,
					top: 300,
				}, true);

				Y.mix(this.Waste.stackConfig.layout, {
					top: 300,
				}, true);

				Y.mix(this.Tableau.stackConfig.layout, {
					left: 120,
					cardGap: 1.1,
					hspacing: -0.55
				}, true);
			}
		],

		Scorpion: [
			function () {
				fieldLayout(this, "Deck", {top: 0, left: 0});
				fieldLayout(this, "Foundation", {
					top: 0,
					left: 420,
					hspacing: 0,
					vspacing: 1.1
				});
				fieldLayout(this, "Tableau", {
					left: 60,
					top: 0,
					hspacing: 1.13
				});
			},

			function () {
				fieldLayout(this, "Deck", {left: 10, top: 0});

				fieldLayout(this, "Foundation", {
					left: 75,
					top: 0,
					hspacing: 1.5,
					vspacing: 0
				});

				fieldLayout(this, "Tableau", {
					left: 0,
					top: 60,
					hspacing: 1.13
				});
			}
		],

		Spider: [
			function () {
				fieldLayout(this, "Foundation", {
					left: 94,
					hspacing: 1.05
				});

				fieldLayout(this, "Tableau", {
					top: 65,
					hspacing: 1.05
				});
			},
			function () {
				fieldLayout(this, "Foundation", {
					left: 62,
					hspacing: 1
				});

				fieldLayout(this, "Tableau", {
					hspacing: 1
				});
			}
		],

		TriTowers: function () {
			Y.mix(this.Tableau.stackConfig.layout, {
				hspacing: -0.5,
				rowGaps: [3, 2, 1, 0],
				cardGap: 1
			}, true);
		},

		RussianSolitaire: [
			originalLayout("RussianSolitaire", ["Tableau", "Foundation"]),

			function () {
				fieldLayout(this, "Tableau", {
					top: 55,
					hspacing: 1.13
				});

				fieldLayout(this, "Foundation", {
					left: 46,
					top: 0,
					hspacing: 1.5,
					vspacing: 0
				});
			}
		],

		Yukon: [
			originalLayout("Yukon", ["Tableau", "Foundation"]),

			function () {
				fieldLayout(this, "Tableau", {
					top: 55,
					hspacing: 1.13
				});

				fieldLayout(this, "Foundation", {
					left: 46,
					top: 0,
					hspacing: 1.5,
					vspacing: 0
				});
			}
		]
	    };

	OPTIONS.FortyThieves = OPTIONS.Spider1S = OPTIONS.Spider2S = OPTIONS.Spider;
	gameOverrides.FortyThieves = gameOverrides.Spider1S = gameOverrides.Spider2S = gameOverrides.Spider;

	OPTIONS.WillOTheWisp = OPTIONS.Spiderette = OPTIONS.Klondike1T = OPTIONS.Klondike;
	gameOverrides.WillOTheWisp = gameOverrides.Spiderette = gameOverrides.Klondike1T = gameOverrides.Klondike;

        OPTIONS.RussianSolitaire = OPTIONS.Yukon;

	Y.mix(Y.DD.DDM, {
		useHash: false, // :\
		_pg_activate: Solitaire.noop,
		_pg_size: function () {
			if (this.activeDrag) {
				this._pg.setStyles({width: "100%", height: "100%"});
			}
		}
	}, true);

	Y.DD.DDM.set("throttleTime", 40);
	Y.mix(Y.DD.Drop.prototype, {
		_activateShim: function () {
			var DDM = Y.DD.DDM;

			if (!DDM.activeDrag) { return false; }
			if (this.get("node") === DDM.activeDrag.get("node")) { return false; }
			if (this.get("lock")) { return false; }

			if (this.inGroup(DDM.activeDrag.get("groups"))) {
				DDM._addValid(this);
				this.overTarget = false;
				if (!this.get("useShim")) {
					this.shim = this.get("node");
				}
				this.sizeShim();
			} else {
				DDM._removeValid(this);
			}
		},

		_deactivateShim: function () {
			this.overTarget = false;
		}
	}, true);

	Solitaire.Statistics.winDisplay = function () {
		alert("You win!");
	};

	Solitaire.scale = Solitaire.noop;
	Solitaire.Card.ghost = false;
	Solitaire.Animation.animate = false;

	Solitaire.Card.base = {
		theme: "mobile",
		hiddenRankHeight: 3,
		rankHeight: 15,
		width: 40,
		height: 50
	};

	function fieldLayout(game, field, layout) {
		Y.mix(game[field].stackConfig.layout, layout, true);
	}

	function originalLayout(game, fields) {
		var layouts,
		    normalizeLayout = function (field) {
			return [field, Y.merge(BARE_LAYOUT, Solitaire[game][field].stackConfig.layout)];
		    };

		layouts = Y.Array.map(Y.Array(fields), normalizeLayout);

		return function () {
			var that = this;

			Y.each(layouts, function (layout) {
				Y.mix(that[layout[0]].stackConfig.layout, layout[1], true);
			});
		};
	}

	function runOverrides() {
		var game = Solitaire.name(),
		    override;

		if (gameOverrides.hasOwnProperty(game)) {
			override = optionWithOrientation(gameOverrides[game]);
			override.call(Solitaire.game);
		}
	}

	function optionWithOrientation(option) {
		var orientation = window.innerWidth === 480 ? LANDSCAPE : PORTRAIT,
		    o;

		if (!option.length) { return option; }

		o = option[orientation];
		return o ? o : option[LANDSCAPE];
			
	}

	function getOption(name) {
		var game = Solitaire.name(),
		    options = OPTIONS[game],
		    dfault = DEFAULTS[name],
		    option = options ? options[name] : dfault; 

		return optionWithOrientation(option ? option : dfault) || dfault;
	}
	
	function scale() {
		_scale.call(Solitaire.game, getOption("scale"));
	}

	function offsetLeft() {
		return getOption("offset");
	}

	function maxStackHeight() {
		return getOption("maxStackHeight");
	}

	function disableScroll(e) {
		var target = e.target;

		if (target.hasClass("stack") || target.hasClass("card")) { return; }
		e.preventDefault();
	}

	function disableStyles() {
		function stylesheet(index) {
			return {
				deleteSelector: function (selector) {
					var ss = document.styleSheets[index],
					    rules,
					    idx;

					if (!ss) { return; }

					rules = Array.prototype.splice.call(ss.rules, 0);
					idx = rules.indexOf(rules.filter(function (rule) {
						return rule.selectorText === selector;
					})[0]);

					if (idx !== -1) { ss.deleteRule(idx); }
				}
			};
		}

		stylesheet(0).deleteSelector("#menu li:hover");
	}

	function cancelIfBody(e) {
		if (e.target.test("#descriptions *")) { return; }
		e.preventDefault();
	}

	function setupUI() {
		var undo,
		    cancel,
		    showMenu,
		    menu,
		    body,
		    nav,
                    fb,
		    closeMenu = function () { menu.removeClass("show"); };

		disableStyles();

		menu = Y.one("#menu");
		body = Y.one("body");
		undo = Y.one("#undo");
                fb = Y.one("#social");
		nav = Y.Node.create("<nav id=navbar>");
		showMenu = Y.Node.create("<a id=show_menu class='button'>New Game</a>");
		cancel = Y.Node.create("<li class=cancel><a id='cancel'>Cancel</a></li>");

		undo.get("parentNode").remove();

		showMenu.on("click", function () {
			menu.addClass("show");
		});

		menu.append(cancel);

		nav.append(showMenu);
		if (fb) {
			navigator.onLine ? nav.append(fb) : fb.remove();
		}

		nav.append(undo.addClass("button"));

		body.append(nav);
		Y.on("click", closeMenu, ["#cancel", "#new_deal", "#restart"]);

		// GameChooser customizations
		Solitaire.Application.GameChooser.draggable = false;

		Y.one("#game-chooser .titlebar").append(document.createTextNode("Games"));
		Y.one("#game-chooser .close").append(document.createTextNode("Back"));

		Y.delegate("touchstart", function (e) {
			e.target.ancestor("li", true).addClass("hover");
		}, "#descriptions", "li");

		Y.delegate("touchend", function (e) {
			e.target.ancestor("li", true).removeClass("hover");
		}, "#descriptions", "li");

		Y.on("gamechooser:select", function (chooser) {
			chooser.choose();
			closeMenu();
		});

		Y.on("gamechooser:hide", function () {
			scrollToTop();
		});

		if (navigator.standalone) {
			body.addClass("fullscreen");
		}

		// set resize event to orientationchange to more flexibly customize the layout
		Solitaire.Application.resizeEvent = "orientationchange";
	}

	function setStyles(landscape) {
		var body = Y.one("body"),
		    from, to;

		if (landscape) {
			from = "portrait";
			to = "landscape";
		} else {
			from = "landscape";
			to = "portrait";
		}

		body.removeClass(from).addClass(to);
	}

	function setLayout() {
		var game = Solitaire.name(),
		    landscape = window.innerWidth === 480,
		    msh = maxStackHeight();

		setStyles(landscape);

		runOverrides();

		Solitaire.offset = {left: offsetLeft(), top: 10};
		Solitaire.maxStackHeight = function () { return msh; };
		scale();
	}

	function scrollToTop() {
		setTimeout(function () {scrollTo(0, 0);}, 10);
	}

	Y.on("beforeSetup", setLayout);
	Y.on("beforeResize", setLayout);
	Y.on("afterResize", scrollToTop);
        Y.on("load", scrollToTop);

	Y.on("touchstart", function (e) {
		if (e.target._node === document.body) { e.preventDefault(); }
	}, document);

	Y.on("touchmove", cancelIfBody, document);

	Y.on("domready", setupUI);
}, "0.0.1", {requires: ["solitaire", "statistics"]});
/*
 * Stack extension class to automatically move complete stacks/runs to the foundation
 */
YUI.add("auto-stack-clear", function (Y) {
	var Solitaire = Y.Solitaire;

	Y.namespace("Solitaire.AutoStackClear");

	Solitaire.AutoStackClear.register = function () {
		Y.on("solitaire|tableau:afterPush", function (stack) {
			isComplete(stack, clearComplete);
		});
	}

	function isComplete(stack, callback) {
		var cards = stack.cards,
		    rank,
		    suit,
		    card,
		    complete,
		    i;

		if (!cards.length) { return false; }

		for (i = cards.length - 1, rank = 1, suit = cards[i].suit; i >= 0 && rank < 14; i--, rank++) {
			card = cards[i];

			if (card.isFaceDown || card.rank !== rank || card.suit !== suit) {
				return false;
			}
		}

		complete = rank === 14;
		complete && typeof callback === "function" && callback(stack, i + 1);
		return complete;
	}

	function clearComplete(stack, startIndex) {
		var foundation,
		    cards = stack.cards,
		    count = cards.length - startIndex;

		// find the first empty foundation
		foundation = Y.Array.find(Solitaire.game.foundation.stacks, function (stack) {
			return !stack.cards.length;
		});

		Solitaire.stationary(function () {
			while (count) {
				cards.last().moveTo(foundation);
				count--;
			}

		});

		stack.updateCardsPosition();
	}
}, "0.0.1", {requires: ["solitaire"]});
/*
 * automatically turn over the first open faceup card in a stack
 */
YUI.add("auto-turnover", function (Y) {
	Y.on("tableau:afterPop", function (stack) {
		Y.Array.each(stack.cards, function (card) {
			if (card && card.isFaceDown && card.isFree()) {
				card.faceUp();
			}
		});
	});
}, "0.0.1", {requires: ["solitaire"]});
YUI.add("solitaire-autoplay", function (Y) {
	Y.namespace("Solitaire.Autoplay");

	var Solitaire = Y.Solitaire,
	    Autoplay = Solitaire.Autoplay,
	    whenWon = true,
	    autoPlayInterval = null,
	    autoPlayable = ["Klondike", "Klondike1T", "FortyThieves", "GClock", "Freecell", "FlowerGarden", "Yukon"];

	Y.on("endTurn", function () {
		if (!whenWon || autoPlayable.indexOf(Solitaire.game.name()) === -1) { return; }

		if (autoPlayInterval === null && isEffectivelyWon()) {
			Y.fire("autoPlay");
		}
	});

	Y.on("win", function () {
		clearInterval(autoPlayInterval);
		autoPlayInterval = null;
	});

	Y.on("autoPlay", function () {
		autoPlayInterval = setInterval(autoPlay, 130);
	});

	function autoPlay() {
		var played = false;

		Solitaire.game.eachStack(function (stack) {
			var field = stack.field;

			if (played || field === "foundation" || field === "deck") { return; }

			played = !stack.eachCard(function (card) {
				return !card.autoPlay();
			});
		});
	}

	function isEffectivelyWon() {
		var stop = false;

		Solitaire.game.eachStack(function (stack) {
			var field = stack.field,
			    prevRank = 14,
			    decending;

			if (stop || field !== "tableau" && field !== "waste") { return; }

			decending = stack.eachCard(function (card) {
				if (card.rank > prevRank || card.isFaceDown) {
					stop = true;
					return false;
				} else {
					prevRank = card.rank;
				}
			});
		});

		return !stop;
	}

	Y.mix(Autoplay, {
		enable: function () {
			whenWon = true;
		},

		disable: function () {
			whenWon = false;
		}
	});
}, "0.0.1", {requires: ["solitaire"]});
YUI.add("solitaire-background-fix", function (Y) {
	var _body;

	Y.on("load", resize);
	Y.on("resize", resize);

	function resize() {
		var width = body().get("winWidth"),
		    height = body().get("winHeight"),
		    style = document.body.style;

		if (!Y.UA.mobile) {
			body().setStyles({width: width, height: height});
		}

		/*
		 * if we don't support the background-size property, use the tiled background instead
		 */

		if (style.backgroundSize === undefined && style.MozBackgroundSize === undefined) {
			body().setStyles({
				backgroundImage: "url(greentiled.jpg)",
				backgroundRepeat: "repeat"
			});
		}
	}

	function body() {
		if (!_body) {
			_body = new Y.Node(document.body);
		}

		return _body;
	}
}, "0.0.1", {requires: ["solitaire"]});
/*
 * record win/lose records, streaks, etc
 */
YUI.add("statistics", function (Y) {
	var loaded,
	    won,
	    enabled = true,
	    localStorage = window.localStorage,
	    Solitaire = Y.Solitaire,
	    Statistics = Y.namespace("Solitaire.Statistics");

	if (!localStorage) { return; }

	Y.on("newGame", function () {
		if (loaded) { recordLose(); }

		won = false;
		loaded = null;
	});

	Y.on("loadGame", function () {
		loaded = Solitaire.game.name();
		saveProgress();
		won = false;
	});

	Y.on("endTurn", function () {
		if (!loaded) {
			loaded = Solitaire.game.name();
			saveProgress();
		}
	});

	Y.on("win", function () {
		if (won || !enabled) { return; }

		var winDisplayDelay = 1000;
		loaded = null;
		won = true;

		recordWin();

		explodeFoundations();
	});

	Y.on("beforeSetup", function () {
		var winDisplay = Y.one("#win_display");

		winDisplay && winDisplay.remove();
		Statistics.enable();
	});

	function explodeFoundations() {
		var delay = 500,
		    duration = 900,
		    interval = 900;

		Game.eachStack(function (stack) {
			stack.eachCard(function (card) {
				if (!card) { return; }

				var node = card.node;
				if (card !== stack.last()) {
					node.addClass("hidden");
					return;
				}

				node.plug(Y.Breakout, {columns: 5});
				(function (node) {
					setTimeout(function () {
						node.breakout.explode({random: 0.65, duration: duration});
					}, delay);
				})(node);

				delay += interval;
			});
		}, "foundation");

		setTimeout(function () {
			Statistics.winDisplay();
		}, delay + 200);
	}

	/*
	 * TODO: a templating system might make this less grody
	 */
	function winDisplay() {
		var nameMap = {
			Agnes: "Agnes",
			Klondike: "Klondike",
			Klondike1T: "Klondike (Vegas style)",
			FlowerGarden: "Flower Garden",
			FortyThieves: "Forty Thieves",
			Freecell: "Freecell",
                        Golf: "Golf",
			GClock: "Grandfather's Clock",
			MonteCarlo: "Monte Carlo",
			Pyramid: "Pyramid",
			RussianSolitaire: "Russian Solitaire",
			Scorpion: "Scorpion",
			Spider: "Spider",
			Spider1S: "Spider (1 Suit)",
			Spider2S: "Spider (2 Suit)",
                        Spiderette: "Spiderette",
                        WillOTheWisp: "Will O' The Wisp",
			TriTowers: "Tri Towers",
			Yukon: "Yukon"},
		    
		    stats = Record(localStorage[Solitaire.game.name() + "record"]),

		    streakCount, winCount, loseCount,

		    output = "<div id='win_display'>";

		streakCount = stats.streaks().last().length;
		winCount = stats.wins().length;
		loseCount = stats.loses().length;


		output += "<p>You win! You're awesome.</p>";
		output += "<h2>" + nameMap[Solitaire.game.name()] + " stats:</h2>";
		output += "<ul>";
		output += "<li>Current win streak: <span class='streak'>" + streakCount + "</li>";
		output += "<li>Total wins: <span class='wins'>" + winCount + "</li>";
		output += "<li>Total loses: <span class='loses'>" + loseCount + "</li>";
		output += "<div class=replay_options><button class=new_deal>New Deal</button><button class=choose_game>Choose Game</button></div>";

		output += "</ul></div>";

		return output;
	}

	function record(value) {
		var key = localStorage["currentGame"] + "record",
		    record = localStorage[key] || "";

		record += new Date().getTime() + "_" + value + "|";

		localStorage[key] = record;
	}

	function recordLose() {
		record(0);

		clearProgress();
	}

	function recordWin() {
		record(1);

		clearProgress();
	}

	function clearProgress() {
		localStorage.removeItem("currentGame");
	}

	function saveProgress() {
		localStorage["currentGame"] = Solitaire.game.name();
	}

	function Record(raw) {
		function parse() {
			var entries = raw.split("|");

			entries.splice(entries.length - 1);

			return Y.Array.map(entries, function (entry) {
				entry = entry.split("_");

				return {date: new Date(entry[0]), won: !!parseInt(entry[1], 10)};
			});
		}

		function won(entry) {
			return entry.won;
		}

		var record = parse();

		return {
			streaks: function () {
				var streaks = [],
				    streak = null;

				Y.Array.each(record, function (entry) {
					if (!entry.won) {
						streak && streaks.push(streak);
						streak = null;
					} else {
						if (!streak) { streak = []; }
						streak.push(entry);
					}
				});

				streak && streaks.push(streak);

				return streaks;
			},

			wins: function () {
				return Y.Array.filter(record, won);
			},

			loses: function () {
				return Y.Array.reject(record, won);
			}
		};
	}

	Y.mix(Statistics, {
		winDisplay: function () {
			var Application = Solitaire.Application;

			Y.one("body").append(winDisplay());

			Y.on("click", function () {
				Application.newGame();
			}, Y.one("#win_display .new_deal"));

			Y.on("click", function () {
				Application.GameChooser.show(true);
			}, Y.one("#win_display .choose_game"));

		},

		enable: function () {
			enabled = true;
		},

		disable: function () {
			enabled = false;
		}
	});

}, "0.0.1", {requires: ["solitaire", "array-extras", "breakout"]});
/*
 * Automatically solve a game of Freecell
 */
YUI.add("solver-freecell", function (Y) {
	Y.namespace("Solitaire.Solver.Freecell");

	// only let this work with web workers and typed arrays

	if (!(window.Worker && window.ArrayBuffer && window.Uint8Array)) { return; }

	var Solitaire = Y.Solitaire,
	    FreecellSolver = Solitaire.Solver.Freecell,
	    suitTable = {
		s: 0,
		h: 1,
		c: 2,
		d: 3
	    };

	function cardToValue(card) {
		return card ? card.rank << 2 | suitTable[card.suit] : 0;
	}

	function cardRank(val) {
		return val >> 2;
	}

	function cardSuit(val) {
		return ["s", "h", "c", "d"][val & 3];
	}

	function compareStack(a, b) {
		return b[0] - a[0];
	}

	function sortedStacks(field) {
		return Y.Array.map(field.stacks, function (s) { return s; }).
			sort(function (s1, s2) {
				var c1 = s1.first(),
				    c2 = s2.first();

				return cardToValue(c1) - cardToValue(c2);
			});
	}

	function gameToState(game) {
		var reserve, foundation, tableau;

		tableau = Y.Array.map(sortedStacks(game.tableau), function (s) {
			var buffer = [];

			s.eachCard(function (c, i) {
				buffer[i] = cardToValue(c);
			});

			return [buffer, s.cards.length];
		});

		reserve = [];
		Y.Array.forEach(sortedStacks(game.reserve), function (s, i) {
			reserve[i] = cardToValue(s.last());
		});

		foundation = [];
		Y.Array.forEach(sortedStacks(game.foundation), function (s, i) {
			foundation[i] = cardToValue(s.last());
		});

		return {reserve: reserve, foundation: foundation, tableau: tableau};
	}


	function moveToCardAndStack(game, move) {
		var source = move.source,
		    dest = move.dest,
		    value,
		    ret = {};

		value = source[1];
		game.eachStack(function (stack) {
			if (ret.card) { return; }

			var card = stack.last();
			if (!card) { return; }

			if (card.rank === cardRank(value) &&
			    card.suit === cardSuit(value)) {
				ret.card = card;
			}
		}, source[0]);

		value = dest[1];
		game.eachStack(function (stack) {
			if (ret.stack) { return; }

			var card = stack.last();

			if (!(card || value)) { ret.stack = stack; }

			if (card &&
			    (card.rank === cardRank(value) &&
			    card.suit === cardSuit(value))) {
				ret.stack = stack;
			}
		}, dest[0]);

		return ret;
	}

	function withSelector(selector, callback) {
		var node = Y.one(selector);

		if (node) {
			callback(node);
		}
	}

	var Animation = {
		interval: 500,
		timer: null,
		remainingMoves: null,

		init: function (moves) {
			var current = moves;

			while (current) {
				if (current.next) {
					current.next.prev = current;
				}
				current = current.next;
			}

			this.remainingMoves = moves;
		},

		pause: function () {
			Solitaire.Autoplay.enable();

			window.clearTimeout(this.timer);
			this.timer = null;

			withSelector("#solver_bar .pause", function (node) {
				node.removeClass("pause");
				node.addClass("play");
			});
		},

		playCurrent: function (game) {
			var move,
			    card, origin;

			if (!this.remainingMoves) { return; }

			move = moveToCardAndStack(game, this.remainingMoves);
			card = move.card;

			if (!card) { return; }

			origin = card.stack;

			card.after(function () {
				origin.updateCardsPosition();
				move.stack.updateCardsPosition();
			});
			card.moveTo(move.stack);
		},

		prev: function (game) {
			var prev = this.remainingMoves.prev;

			if (prev) {
				Y.fire("undo", true);
				this.remainingMoves = prev;
			}
		},

		next: function (game) {
			var current = this.remainingMoves,
			    next = this.remainingMoves.next;

			Solitaire.Statistics.disable();
			this.playCurrent(game);

			if (next) {
				this.remainingMoves = next;
			}

			Y.fire("endTurn", true);
		},

		play: function (game) {
			var move,
			    card, origin;

			if (!this.remainingMoves) { return; }

			Solitaire.Autoplay.disable();

			withSelector("#solver_bar .play", function (node) {
				node.removeClass("play");
				node.addClass("pause");
			});

			this.next(game);
			this.timer = window.setTimeout(function () {
				this.play(game);
			}.bind(this), this.interval);
		}
	};

	var Status = {
		bar: null,
		indicator: null,
		indicatorTimer: null,
		indicatorInterval: 750,
		delay: 400,

		updateIndicator: function (ticks) {
			var indicator = this.indicator,
			    i,
			    text;

			if (!indicator) { return; }

			ticks = ((ticks || 0) % 4);
			text = "Solving";
			for (i = 0; i < ticks; i++) {
				text += ".";
			}

			indicator.set("text", text);

			this.indicatorTimer = window.setTimeout(this.updateIndicator.partial(ticks + 1).bind(this), this.indicatorInterval);
		},

		stopIndicator: function (solved) {
			var indicator = this.indicator;

			window.clearTimeout(this.indicatorTimer);
			if (!indicator) { return; }

			if (solved) {
				indicator.set("text", "Solution found");
				withSelector("#solver_bar .controls", function (node) {
					node.removeClass("hidden");
				});

			} else {
				indicator.set("text", "Unable to find solution");
			}

			this.indicatorTimer = null;
		},

		show: function () {
			if (Y.one("#solver_bar")) { return; }

			var bar = Y.Node.create("<div id=solver_bar></div>"),
			    indicator = Y.Node.create("<span class=indicator>"),
			    next = Y.Node.create("<div class=fastforward>"),
			    prev = Y.Node.create("<div class=rewind>"),
			    playPause = Y.Node.create("<div class=play>"),
			    controls = Y.Node.create("<div class='controls hidden'>"),
			    playCallback;

			next.on("click", function () {
				Animation.next(Game);
			});
			prev.on("click", function () {
				Animation.prev(Game);
			});
			playPause.on("click", function () {
				/*
				 * Here I tie up state with the DOM
				 * Maybe thats alright, as its interface state being stored in the interface
				 */

				if (this.hasClass("play")) {
					Animation.play(Game);
				} else if (this.hasClass("pause")) {
					Animation.pause();
				}
			});

			controls.append(prev);
			controls.append(playPause);
			controls.append(next);

			bar.append(indicator);
			bar.append(controls);
			Y.one("body").append(bar);

			this.indicator = indicator;

			this.bar = bar;
		},

		hide: function () {
			if (this.bar) {
				this.bar.remove();
			}
		}
	};

	Y.mix(FreecellSolver, {
		currentSolution: null,
		worker: null,
		attached: false,
		supportedGames: ["Freecell"],

		isSupported: function () {
			return this.supportedGames.indexOf(Game.name()) !== -1;
		},

		enable: function () {
			if (this.isSupported()) {
				this.createUI();
			}
			this.attachEvents();
		},

		disable: function () {
			if (this.worker) {
				this.worker.terminate();
			}

			Status.hide();
		},

		attachEvents: function () {
			if (this.attached) { return; }

			var pause = Animation.pause.bind(Animation);

			// start the solver if the current game supports it
			Y.on("afterSetup", function () {
				if (this.isSupported()) {
					this.solve();
				} else {
					this.disable();
				}
			}.bind(this));

			// if a solution isn't currently being played, find a new solution on every new turn
			Y.on("endTurn", function (dontResolve) {
				if (dontResolve || !this.isSupported()) { return; }
				this.solve();
			}.bind(this));

			Y.on("autoPlay", function () {
				FreecellSolver.disable();
			});

			Y.on("win", function () {
				FreecellSolver.disable();
			});

			// human interaction stops playing the current solution
			document.documentElement.addEventListener("mousedown", function (e) {
				if (e.target.className.match(/\bpause\b/)) { return; }
				pause();
			}, true);

			this.attached = true;
		},

		createUI: function () {
			Status.show();
		},

		stop: function () {
			if (this.worker) {
				this.worker.terminate();
			}
		},

		solve: function () {
			this.stop();

			withSelector("#solver_bar .controls", function (node) {
				node.addClass("hidden");
			});

			this.currentSolution = null;
			this.worker = new Worker("js/solver-freecell-worker.js");
			this.worker.onmessage = function (e) {
				var solution = this.currentSolution = e.data.solution;

				Animation.init(solution);
				if (solution) {
					Status.stopIndicator(true);
				} else {
					Status.stopIndicator(false);
				}
			}.bind(this);

			this.worker.postMessage({action: "solve", param: gameToState(Game)});

			window.clearTimeout(Status.indicatorTimer);
			Status.indicatorTimer = window.setTimeout(Status.updateIndicator.bind(Status), Status.delay);
		}
	});

	Y.on("beforeSetup", FreecellSolver.enable.bind(FreecellSolver));
}, "0.0.1", {requires: ["solitaire"]});
var attempts = 0,
    maxFastAttempts = 150000;

function GameState(obj) {
	if (!obj) { return; }
	var i, stack;

	this.reserve = new Uint8Array(obj.reserve);
	this.foundation = new Uint8Array(obj.foundation);
	this.tableau = [];

	for (i = 0; i < obj.tableau.length; i++) {
		stack = obj.tableau[i];
		this.tableau[i] = [new Uint8Array(stack[0]), stack[1]];
	}
}

GameState.fromState = function (other) {
	var state = new GameState();

	state.tableau = other.tableau;
	state.reserve = other.reserve;
	state.foundation = other.foundation;

	return state;
}

GameState.prototype = {
	reserve: null,
	foundation: null,
	tableau: null,
	rating: null,
	parentMove: null,
	parent: null,
	child: null,

	solved: function () {
		var i, len,
		    foundation = this.foundation;

		for (i = 0, len = 4; i < len; i++) {
			if ((foundation[i] >> 2) !== 13) { return false; }
		}

		return true;
	},

	eachTableau: function (callback) {
		var i, len,
		    stack,
		    tableau = this.tableau;

		for (i = 0, len = tableau.length; i < len; i++) {
			stack = tableau[i];
			callback.call(this, stack[0], stack[1], i);
		}
	},

	validTarget: function (field, value, start) {
		var rank = value >> 2,
		    suit = value & 3,
		    dest,
		    tableau,
		    i, len;
	
		if (!value) { return -1; }

		if (start === undefined) {
			start = 0;
		} else {
			start++;
		}

		switch (field) {
		case "foundation":
			for (i = 0; i < 4; i++ ) {
				dest = this.foundation[i];

				if ((!dest && rank === 1) ||
				    (suit === (dest & 3) &&
				    rank === (dest >> 2) + 1)) {
					return i;
				}
			}
			break;

		case "reserve":
			for (i = 0; i < 4; i++) {
				if (!this.reserve[i]) {
					return i;
				}
			}
			break;

		case "tableau":
			tableau = this.tableau;

			for (i = start, len = tableau.length; i < len; i++) {
				dest = tableau[i][0][tableau[i][1] - 1];

				if (!tableau[i][1] ||
				    (((suit & 1) ^ (dest & 1)) &&
				    (rank === (dest >> 2) - 1))) {
					return i;
				}
			}
			break;
		}

		return -1;
	},

	move: function (sourceField, sourceStack, destField, destStack) {
		var val = this.pop(sourceField, sourceStack);
		this.push(destField, destStack, val);
	},

	pop: function (field, stack) {
		var val,
		    newBuffer,
		    bufferLength,
		    tableau,
		    i, len;

		if (field === "reserve" || field === "foundation") {
			val = this[field][stack];

			this[field] = new Uint8Array(this[field]);
			this[field][stack] = 0;
			return val;
		}

		tableau = this.tableau;
		bufferLength = tableau[stack][1];

		if (!bufferLength) { return 0; }

		val = tableau[stack][0][bufferLength - 1];
		this.copyTableau(stack, bufferLength - 1);
		return val;
	},

	push: function (field, stack, val) {
		var newLength;
		if (!val) { return; }

		if (field === "reserve" || field === "foundation") {
			this[field] = new Uint8Array(this[field]);
			this[field][stack] = val;
			return;
		}

		newLength = this.tableau[stack][1] + 1;
		this.copyTableau(stack, newLength);
		this.tableau[stack][0][newLength - 1] = val;

	},

	copyTableau: function (stack, newLength) {
		var old = this.tableau,
		    tableau = old[stack][0],
		    newBuffer = new Uint8Array(new ArrayBuffer(newLength)),
		    i, len;

		for (i = 0; i < newLength; ++i) {
			newBuffer[i] = tableau[i];
		}

		this.tableau = [];

		for (i = 0, len = old.length; i < len; ++i) {
			if (i !== stack) {
				this.tableau[i] = old[i];
			} else {
				this.tableau[i] = [newBuffer, newLength];
			}
		}
	},

	sort: function () {
		Array.prototype.sort.call(this.reserve);
		Array.prototype.sort.call(this.foundation);
		this.tableau.sort(function (a, b) {
			return a[0][0] - b[0][0];
		});
	},

	_serialized: null,
	// TODO write a real hash function
	serialize: function () {
		if (this._serialized !== null) { return this._serialized; }

		var i, j, len, stack;

		this._serialized = "";
		for (i = 0; i < 4; i++) {
			this._serialized += String.fromCharCode(this.reserve[i]);
		}

		this._serialized += "_";

		for (i = 0; i < 4; i++) {
			this._serialized += String.fromCharCode(this.foundation[i]);
		}

		this._serialized += "_";

		for (i = 0; i < 8; i++) {
			stack = this.tableau[i];

			for (j = 0; j < stack[1]; j++) {
				this._serialized += String.fromCharCode(stack[0][j]) + "_";
			}
		}

		return this._serialized;
	},

	// the search heuristic function
	rateMove: function (sourceField, sourceIndex, destField, destIndex) {
		var RATING_FOUNDATION = 1000,
		    RATING_CLOSEDTABLEAUFOLLOWUP = 20,
		    RATING_FREEFOUNDATIONTARGET = 15,
		    RATING_OPENTABLEAU = 15,
		    RATING_FREETABLEAUTARGET = 10,
		    RATING_OPENRESERVE = 10,
		    RATING_TABLEAU = 2,
		    RATING_RESERVE = -1,
		    RATING_BURYFOUNDATIONTARGET = -5,
		    RATING_CLOSEDTABLEAU = -10,
		rating = 0,
		stack,
		card,
		nextCard,
		followup = false,
		i, length;

		// reward moves to the foundation
		if (destField === "foundation") {
			rating += RATING_FOUNDATION;
		}

		if (sourceField === "tableau") {
			stack = this.tableau[sourceIndex];
			length = stack[1];
			card = stack[0][length - 1];

			// reward an opened tableau slot
			if (length === 1) {
				rating += RATING_OPENTABLEAU;
			}

			// reward unburing foundation targets
			for (i = length - 2; i >= 0; i--) {
				if (this.validTarget("foundation", stack[0][i]) > -1) {
					rating += RATING_FREEFOUNDATIONTARGET - (length - 2 - i) + (13 - (stack[0][i] >> 2));
				}
			}

			// reward a newly discovered tableau-to-tableau move
			if (this.validTarget("tableau", stack[0][length - 2]) > -1) {
				rating += RATING_FREETABLEAUTARGET;
			}
		}

		// reward an opened reserve slot
		if (sourceField === "reserve") {
			rating += RATING_OPENRESERVE;
			card = this.reserve[sourceIndex];
		}
		// reward any move to the tableau
		if (destField === "tableau") {
			rating += RATING_TABLEAU;

			stack = this.tableau[destIndex];
			length = stack[1];
			// punish a move to the tableau that buries a foundation target
			for (i = length - 1; i >= 0; i--) {
				if (this.validTarget("foundation", stack[0][i]) > -1) {
					rating += RATING_BURYFOUNDATIONTARGET * (length - i);
				}
			}

			if (stack[1] === 0) {
				// try not to move a card heading a tableau to an empty tableau
				if (sourceField === "tableau" && this.tableau[sourceIndex][1] === 1) {
					return -1000;
				}

				// reward a move to an empty stack that can be followed up be another move
				for (i = 0; i < 4; i++) {
					nextCard = this.reserve[i];
					if (((nextCard >> 2) === (card >> 2) - 1) &&
					    ((nextCard & 1) ^ (card & 1))) {
						rating += RATING_CLOSEDTABLEAUFOLLOWUP + (nextCard >> 2);
						followup = true;
					}
				}

				for (i = 0; i < 8; i++) {
					stack = this.tableau[i];
					nextCard = stack[0][stack[1] - 1];
					if (((nextCard >> 2) === (card >> 2) - 1) &&
					    ((nextCard & 1) ^ (card & 1))) {
						rating += RATING_CLOSEDTABLEAUFOLLOWUP + (nextCard >> 2);
						followup = true;
					}
				}

				// punish filling a tableau slot with no immediate followup
				if (!followup) {
					rating += RATING_CLOSEDTABLEAU;
				}
			}
		}

		// penalize moving to the reserve
		if (destField === "reserve") {
			rating += RATING_RESERVE;
		}
		return rating;
	},

	transformParentMove: function () {
		var move = this.parentMove,
		    parent = this.parent;

		if (!(move && parent)) { return; }

		move.source[1] = parent.lastCard(move.source[0], move.source[1]);
		move.dest[1] = parent.lastCard(move.dest[0], move.dest[1]);
	},

	lastCard: function (field, index) {
		var stack, length;

		switch (field) {
		case "reserve":
		case "foundation":
			return this[field][index];

		case "tableau":
			stack = this[field][index];
			length = stack[1];

			return stack[0][length - 1];
		}
	},

	becomeChild: function () {
		var parent = this.parent;

		if (!parent) { return; }

		parent.child = this;
		this.transformParentMove();
	}
};

// returns the depth of tree to jump up to, or 0 if the solution is found
function solve(state, depth, visited, movesSinceFoundation, fastSearch) {
	var jumpDepth,
	    maxDepth = 200,
	    sourceIndex, destIndex, length, val,
	    next, sourceField, destField,
	    tableau,
	    move, moves = [],
	    scale = 1,
	    foundFoundation = false,
	    i;

	/*
	 * if the state is the solved board, return
	 * for each reserve and tableau stack, find all valid moves
	 * for each valid move, create a new game state
	 * sort each state by rank, add for each thats undiscoverd, and it as a branch and recurse
	 * stop iterating if a child state is solved
	 */

	if (depth > maxDepth) { return maxDepth; }

	/* when the state is solved
	 * replace the stack index with its associated move with the actual card that was moved
	 * set the parent states child to this state
	 * then jump out of the tree
	 */
	if (state.solved()) {
		state.becomeChild();
		return 0;
	}

	// find moves from the reserve
	for (i = 0; i < 4; i++) {
		val = state.reserve[i];

		if (!val) { continue; }

		destIndex = state.validTarget("foundation", val);
		if (destIndex > -1) {
			moves.push({source: ["reserve", i], dest: ["foundation", destIndex]});
			foundFoundation = true;
		}

		if (foundFoundation) { break; }

		destIndex = 0;
		while ((destIndex = state.validTarget("tableau", val, destIndex)) > -1) {
			moves.push({source: ["reserve", i], dest: ["tableau", destIndex]});
		}
	}

	// find moves from the tableau
	tableau = state.tableau;
	for (i = 0; i < tableau.length; i++) {
		s = tableau[i][0];
		length = tableau[i][1];
		val = s[length - 1];

		if (!val) { continue; }

		destIndex = state.validTarget("foundation", val);
		if (destIndex > -1) {
			moves.push({source: ["tableau", i], dest: ["foundation", destIndex]});
			foundFoundation = true;
		}

		if (foundFoundation) { break; }

		destIndex = state.validTarget("reserve", val);
		if (destIndex > -1) {
			moves.push({source: ["tableau", i], dest: ["reserve", destIndex]});
		}

		destIndex = 0;
		while ((destIndex = state.validTarget("tableau", val, destIndex)) > -1) {
			moves.push({source: ["tableau", i], dest: ["tableau", destIndex]});
		}
	}

	if (foundFoundation) {
		movesSinceFoundation = 0;
	} else {
		movesSinceFoundation++;
	}

	for (i = 0; i < moves.length; i++) {
		move = moves[i];
		next = GameState.fromState(state);

		sourceField = move.source[0];
		sourceIndex = move.source[1];

		destField = move.dest[0];
		destIndex = move.dest[1];

		next.rating = next.rateMove(sourceField, sourceIndex, destField, destIndex);
		next.move(sourceField, sourceIndex, destField, destIndex);
		next.parentMove = move;
		next.parent = state;

		moves[i] = next;
	};

	moves.sort(function (a, b) {
		return b.rating - a.rating;
	});

	// if nothing's been moved to the foundation in many turns, backtrack alot of steps
	if (movesSinceFoundation >= 20) {
		scale = 0.7;
	}

	if (fastSearch && (++attempts > maxFastAttempts)) {
		scale = 0.001;
	}

	for (i = 0; i < moves.length && scale === 1; i++) {
		move = moves[i];
		if (jumpDepth < depth) { break; }
		if (visited[move.serialize()]) {
			if (fastSearch) { break } else { continue };
		}

		visited[move.serialize()] = true;
		jumpDepth = solve(move, depth + 1, visited, movesSinceFoundation, fastSearch);
	}

	if (jumpDepth === 0) {
		state.becomeChild();
	}

	if (jumpDepth === undefined) { jumpDepth = Math.ceil(depth * scale); }
	return jumpDepth;
}

function mapMoves(state) {
	var child = state.child,
	    moves = null,
	    current;

	if (!child) { return; }

	moves = current = child.parentMove;

	while (child = child.child) {
		current.next = child.parentMove;
		current = current.next;
	}

	return moves;
}

function attemptSolution(obj, fastSearch) {
	var state = new GameState(obj);

	attempts = 0;
	solve(state, 1, {}, 0, fastSearch);
	return mapMoves(state);
}

onmessage = function (e) {
	var state,
	    solution,
	    data = e.data;


	if (data.action === "solve") {
		solution = attemptSolution(data.param, true);

		if (!solution) {
			solution = attemptSolution(data.param, false);
		}
		self.postMessage({solution: solution});
	}
};
YUI.add("agnes", function (Y) {
	function inSeries(first, second) {
		return (first + 1) % 13 === second % 13;
	}

	function seedRank() {
		return Agnes.foundation.stacks[0].first().rank;
	};

	var Solitaire = Y.Solitaire,
	    Klondike = Solitaire.Klondike,
	    Agnes = Solitaire.Agnes = instance(Klondike, {
		fields: ["Foundation", "Deck", "Waste", "Tableau", "Reserve"],

		height: function () { return this.Card.base.height * 5.6; },
		maxStackHeight: function () { return this.Card.height * 4.3; },

		deal: function () {
			var deck = this.deck.stacks[0],
			    foundation = this.foundation.stacks[0];

			Klondike.deal.call(this);

			deck.last().faceUp().moveTo(foundation);

			this.turnOver();
		},

		redeal: Solitaire.noop,

		turnOver: function () {
			var deck = this.deck.stacks[0],
			    reserves = this.reserve.stacks,
			    waste = this.waste.stacks,
			    count,
			    target,
			    i;

			if (deck.cards.length < 7) {
				count = 2;
				target = waste;
			} else {
				count = 7;
				target = reserves;
			}

			for (i = 0; i < count; i++) {
				deck.last().faceUp().moveTo(target[i]);
			}
		},

		Waste: instance(Klondike.Waste, {
			stackConfig: {
				total: 2,
				layout: {
					hspacing: 1.5,
					top: 0,
					left: 0
				}
			},

			Stack: instance(Solitaire.Stack, {
				setCardPosition: function (card) {
					var last = this.last(),
					    top = this.top,
					    left = last ? last.left + Solitaire.Card.width * 1.5 : this.left;

					card.top = top;
					card.left = left;
				}
			})
		}),

		Reserve: {
			field: "reserve",
			stackConfig: {
				total: 7,
				layout: {
					hspacing: 1.25,
					left: 0,
					top: function () { return Solitaire.Card.height * 4.4; }
				}
			},

			Stack: instance(Klondike.Stack, {
				images: {},
				
				setCardPosition: function (card) {
					var last = this.last(),
					    top = last ? last.top + last.rankHeight : this.top,
					    left = this.left;
					    
					card.top = top;
					card.left = left;
				}
			})
		},

	        Card: instance(Klondike.Card, {
			playable: function () {
				if (this.stack.field === "reserve") {
					return this.isFree();
				} else {
					return Klondike.Card.playable.call(this);
				}
			},

			validTarget: function (stack) {
				var target = stack.last();

				switch (stack.field) {
				case "tableau":
					if (!target) {
						return inSeries(this.rank, seedRank());
					} else {
						return !target.isFaceDown && target.color !== this.color && inSeries(this.rank, target.rank);
					}
				case "foundation":
					return this.validFoundationTarget(target);
				default:
					return false;
				}
			},

			validFoundationTarget: function (target) {
				if (!target) {
					return this.rank === seedRank();
				} else {
					return this.suit === target.suit &&
					       this.rank % 13 === (target.rank + 1) % 13;
				}
			}
		})
	    });
}, "0.0.1", {requires: ["klondike"]});
YUI.add("golf", function (Y) {
	var Solitaire = Y.Solitaire,
	Golf = Y.Solitaire.Golf = instance(Solitaire, {
		fields: ["Deck", "Foundation", "Tableau"],

		deal: function () {
			var card,
			    stack,
			    stacks = this.tableau.stacks,
			    deck = this.deck,
			    foundation = this.foundation.stacks[0],
			    row;


			for (row = 0; row < 5; row++) {
				for (stack = 0; stack < 7; stack++) {
					card = deck.pop().faceUp();
					stacks[stack].push(card);
				}
			}

			card = deck.pop().faceUp();
			foundation.push(card);

			deck.createStack();
		},

		turnOver: function () {
			var deck = this.deck.stacks[0],
			    foundation = this.foundation.stacks[0],
			    last = deck.last();

			last && last.faceUp().moveTo(foundation);
		},

		isWon: function () {
			var won = true;

			this.eachStack(function (stack) {
				stack.eachCard(function (card) {
					if (card) { won = false; }

					return won;
				});
			}, "tableau");

			return won;
		},

		height: function () { return this.Card.base.height * 4; },

		Deck: instance(Solitaire.Deck, {
			field: "deck",
			stackConfig: {
				total: 1,
				layout: {
					hspacing: 0,
					top: function () { return Solitaire.Card.height * 3; },
					left: 0
				}
			},

			createStack: function () {
				var i, len;

				for (i = 0, len = this.cards.length; i < len; i++) {
					this.stacks[0].push(this.cards[i]);
				}
			}
		}),

		Tableau: {
			field: "tableau",
			stackConfig: {
				total: 7,
				layout: {
					hspacing: 1.25,
					top: 0,
					left: 0
				}
			}
		},

		Foundation: {
			field: "foundation",
			stackConfig: {
				total: 1,
				layout: {
					hspacing: 0,
					top: function () { return Solitaire.Card.height * 3; },
					left: function () { return Solitaire.Card.width * 3.75; }
				}
			}
		},

		Events: instance(Solitaire.Events, {
			dragCheck: function (e) {
				this.getCard().autoPlay();

				/* workaround because YUI retains stale drag information if we halt the event :\ */
				this._afterDragEnd();
				e.halt();
			}
		}),

		Card: instance(Solitaire.Card, {
			/*
			 * return true if the target is 1 rank away from the this card
			 */
			validTarget: function (stack) {
				if (stack.field !== "foundation") { return false; }

				var target = stack.last(),
				    diff = Math.abs(this.rank - target.rank);

				return diff === 1;
			},

			isFree: function () {
				return !this.isFaceDown && this === this.stack.last();
			},
		}),
		     
		Stack: instance(Solitaire.Stack, {
			images: {}
		})
	}, true);

	Y.Array.each(Golf.fields, function (field) {
		Golf[field].Stack = instance(Golf.Stack);
	});

	Y.mix(Golf.Tableau.Stack, {

		setCardPosition: function (card) {
			var last = this.cards.last(),
			    top = last ? last.top + last.rankHeight : this.top,
			    left = this.left;

			card.left = left;
			card.top = top;
		}
	}, true);

	Y.mix(Golf.Deck.Stack, {
		setCardPosition: function (card) {
			var last = this.last(),
			    top,
			    left,
			    zIndex;

			top = this.top;
			if (last) {
				left = last.left + card.width * 0.1;
				zIndex = last.zIndex + 1;
			} else {
				left = this.left;
				zIndex = 0;
			}

			card.top = top;
			card.left = left;
			card.zIndex = zIndex;
		}
	}, true);
}, "0.0.1", {requires: ["solitaire"]});
YUI.add("klondike", function (Y) {

var Solitaire = Y.Solitaire,
    Klondike = Y.Solitaire.Klondike = instance(Solitaire, {
	fields: ["Foundation", "Deck", "Waste", "Tableau"],

	deal: function () {
		var card,
		    piles = 6,
		    stack = 0,
		    deck = this.deck,
		    stacks = this.tableau.stacks;

		while (piles >= 0) {
			card = deck.pop().faceUp();
			stacks[6 - piles].push(card);

			for (stack = 7 - piles; stack < 7; stack++) {
				card = deck.pop();
				stacks[stack].push(card);			
			}
			piles--;
		}

		deck.createStack();
	},

	turnOver: function () {
		var deck = this.deck.stacks[0],
		    waste = this.waste.stacks[0],
		    updatePosition = Klondike.Card.updatePosition,
		    last,
		    i, stop;

		Klondike.Card.updatePosition = Solitaire.noop;

		for (i = deck.cards.length, stop = i - 3; i > stop && i; i--) {
			deck.last().faceUp().moveTo(waste);
		}

		Klondike.Card.updatePosition = updatePosition;

		waste.eachCard(function (c) {
			c.updatePosition();
		});
	},

	redeal: function () {
		var deck = this.deck.stacks[0],
		    waste = this.waste.stacks[0];

		while (waste.cards.length) {
			waste.last().faceDown().moveTo(deck);
		}
	},

	Stack: instance(Solitaire.Stack),

	Foundation: {
		stackConfig: {
			total: 4,
			layout: {
				hspacing: 1.25,
				top: 0,
				left: function () { return Solitaire.Card.width * 3.75; }
			}
		},
		field: "foundation",
	},

	Deck: instance(Solitaire.Deck, {
		stackConfig: {
			total: 1,
			layout: {
				hspacing: 0,
				top: 0,
				left: 0
			}
		},
		field: "deck"
	}),

	Waste: {
		stackConfig: {
			total: 1,
			layout: {
				hspacing: 0,
				top: 0,
				left: function () { return Solitaire.Card.width * 1.5; }
			}
		},
		field: "waste",
	},

	Tableau: {
		stackConfig: {
			total: 7,
			layout: {
				hspacing: 1.25,
				top: function () { return Solitaire.Card.height * 1.5; },
				left: 0
			}
		},
		field: "tableau",
	},

	Card: instance(Solitaire.Card, {
		playable: function () {

			switch (this.stack.field) {
			case "tableau":
				return !this.isFaceDown;
			case "foundation":
				return false;
			case "waste":
				return this.isFree();
			case "deck":
				return true;
			}
		},

		validFoundationTarget: function (target) {
			if (!target) {
				return this.rank === 1;
			} else {
				return target.suit === this.suit && target.rank === this.rank - 1;
			}
		},

		validTarget: function (stack) {
			var target = stack.last();

			switch (stack.field) {
			case "tableau":
				if (!target) {
					return this.rank === 13;
				} else {
					return !target.isFaceDown && target.color !== this.color && target.rank === this.rank + 1;
				}
			case "foundation":
				return this.validFoundationTarget(target);
			default:
				return false;
			}
		}
	})
});

Y.Array.each(Klondike.fields, function (field) {
	Klondike[field].Stack = instance(Klondike.Stack);
});


Y.mix(Klondike.Stack, {
	validTarget: function (stack) {
		return stack.field === "tableau" &&
		    this.first().validTarget(stack);
	}
}, true);

Y.mix(Klondike.Tableau.Stack, {
	setCardPosition: function (card) {
		var last = this.cards.last(),
		    top = last ? last.top + last.rankHeight : this.top,
		    left = this.left;

		card.left = left;
		card.top = top;
	}
}, true);

Y.mix(Klondike.Waste.Stack, {
	// always display only the last three cards
	setCardPosition: function (card) {
		var cards = this.cards,
		    last = cards.last(),
		    stack = this;

		Y.Array.each(cards.slice(-2), function (card, i) {
			card.left = stack.left;
			card.top = stack.top;
		});

		if (!cards.length) {
			card.left = stack.left;
		}

		if (cards.length === 1) {
			card.left = stack.left + 0.2 * card.width;
		} else if (cards.length > 1) {
			last.left = stack.left + 0.2 * card.width;
			last.top = stack.top;
			card.left = stack.left + 0.4 * card.width;
		}

		card.top = stack.top;
	}
}, true);

Y.mix(Klondike.Deck.Stack, {
	createNode: function () {
		Solitaire.Stack.createNode.call(this);
		this.node.on("click", Solitaire.Events.clickEmptyDeck);
		this.node.addClass("playable");
	}
}, true);


}, "0.0.1", {requires: ["solitaire"]});
YUI.add("klondike1t", function (Y) {
	var Solitaire = Y.Solitaire,
	    Klondike = Solitaire.Klondike,
	    Klondike1T = Solitaire.Klondike1T = instance(Klondike, {
		redeal: Solitaire.noop,

		turnOver: function () {
			var deck = this.deck.stacks[0],
			    waste = this.waste.stacks[0],
			    card = deck.last();

			card && card.faceUp().moveTo(waste);
		},

		Waste: instance(Klondike.Waste, {
			Stack: instance(Solitaire.Stack)
		}),

	    	Deck: instance(Klondike.Deck, {
			Stack: instance(Klondike.Deck.Stack, {
				createNode: function () {
					Klondike.Deck.Stack.createNode.call(this);
					this.node.removeClass("playable");
				}
			})
		})
	    });
}, "0.0.1", {requires: ["klondike"]});
YUI.add("flower-garden", function (Y) {

var Solitaire = Y.Solitaire,
    FlowerGarden = Y.Solitaire.FlowerGarden = instance(Solitaire, {
	fields: ["Foundation", "Reserve", "Tableau"],

	deal: function () {
		var card,
		    deck = this.deck,
		    reserve = this.reserve.stacks[0],
		    stack = 0,
		    i,
		    stacks = this.tableau.stacks;

		for (i = 0; i < 36; i++) {
			card = deck.pop();
			stacks[stack].push(card.faceUp());			
			stack++;
			if (stack === 6) { stack = 0; }
		}

		while (card = deck.pop()) {
			card.faceUp();
			reserve.push(card);
		}
	},

	height: function () { return this.Card.base.height * 5.5; },
	maxStackHeight: function () { return this.Card.height * 4.4; },

	Stack: instance(Solitaire.Stack),

	Foundation: {
		stackConfig: {
			total: 4,
			layout: {
				hspacing: 1.25,
				top: 0,
				left: function () { return Solitaire.Card.width * 4.25; }
			}
		},
		field: "foundation",
		draggable: false
	},

	Reserve: {
		stackConfig: {
			total: 1,
			layout: {
				hspacing: 1.25,
				top: function () { return Solitaire.Card.height * 4.5; },
				left: function () { return Solitaire.Card.width * 3; }
			}
		},
		field: "reserve",
		draggable: true
	},

	Tableau: {
		stackConfig: {
			total: 6,
			layout: {
				hspacing: 1.25,
				top: function () { return Solitaire.Card.height * 1.25; },
				left: function () { return Solitaire.Card.width * 3; }
			}
		},
		field: "tableau",
		draggable: true
	},

	Card: instance(Solitaire.Card, {
		rankHeight: 24,

		createProxyStack: function () {
			var stack;

			switch (this.stack.field) {
			case "foundation":
				this.proxyStack = null;
				break;
			case "tableau":
				return Solitaire.Card.createProxyStack.call(this);
			case "reserve":
				stack = instance(this.stack);
				stack.cards = [this];
				this.proxyStack = stack;
				break;
			}

			return this.proxyStack;
		},

		moveTo: function (stack) {
			var cards = this.stack.cards,
			    index = cards.indexOf(this),
			    i, len;

			/*
			 * TODO: fix this hack
			 * if moveTo.call is called after the other card's positions have been saved, the card move is animated twice on undo
			 * the insertion of null is to preserve indexes and prevent this card from getting deleted on undo
			 */

			Solitaire.Card.moveTo.call(this, stack);

			cards.splice(index, 0, null);
			for (i = index + 1, len = cards.length; i < len; i++) {
				cards[i].pushPosition();
			}
			cards.splice(index, 1);
		},

		validTarget: function (stack) {
			var target = stack.last();

			switch (stack.field) {
			case "tableau":
				if (!target) {
					return true;
				} else {
					return target.rank === this.rank + 1;
				}
				break;
			case "foundation":
				if (!target) {
					return this.rank === 1;
				} else {
					return target.suit === this.suit && target.rank === this.rank - 1;
				}
				break;
			default:
				return false;
				break;
			}
		},

		isFree: function () {
			if (this.stack.field === "reserve") { return true; }
			else { return Solitaire.Card.isFree.call(this); }
		}
	})
}, true);

Y.Array.each(FlowerGarden.fields, function (field) {
	FlowerGarden[field].Stack = instance(FlowerGarden.Stack);
}, true);

Y.mix(FlowerGarden.Stack, {
	images: { foundation: "freeslot.png",
		  tableau: "freeslot.png" },

	validTarget: function (stack) {
		return stack.field === "tableau" && this.first().validTarget(stack);
	},

	validCard: function () { return false; }
}, true);

Y.mix(FlowerGarden.Tableau.Stack, {
	setCardPosition: function (card) {
		var last = this.cards.last(),
		    top = last ? last.top + Solitaire.game.Card.rankHeight : this.top,
		    left = this.left;

		card.left = left;
		card.top = top;
	}
}, true);

Y.mix(FlowerGarden.Reserve.Stack, {

	setCardPosition: function (card) {
		var last = this.cards.last(),
		    left = last ? last.left + Solitaire.Card.width * 0.4 : this.left,
		    top = this.top;

		card.left = left;
		card.top = top;
	},

	update: function (undo) {
		if (undo) { return; }

		var stack = this,
		    left;

		Y.Array.each(this.cards, function (card, i) {
			left = stack.left + i * card.width * 0.4;

			if (left !== card.left) {
				card.left = left;
				card.updatePosition();
			}
		});
	}
}, true);

}, "0.0.1", {requires: ["solitaire"]});
YUI.add("forty-thieves", function (Y) {

var Solitaire = Y.Solitaire,
    FortyThieves = Y.Solitaire.FortyThieves = instance(Solitaire, {
	fields: ["Foundation", "Deck", "Waste", "Tableau"],

	deal: function () {
		var card,
		    stack,
		    row,
		    deck = this.deck,
		    stacks = this.tableau.stacks;

		for (row = 0; row < 4; row++) {
			for (stack = 0; stack < 10; stack++) {
				card = deck.pop().faceUp();
				stacks[stack].push(card);
			}
		}

		deck.createStack();
	},

	redeal: function () {
		// ggpo
	},

	turnOver: function () {
		var deck = this.deck.stacks[0],
		    waste = this.waste.stacks[0],
		    i, stop;

		for (i = deck.cards.length, stop = i - 1; i > stop && i; i--) {
			deck.last().faceUp().moveTo(waste);
		}
	},

	Stack: instance(Solitaire.Stack),

	Foundation: {
		stackConfig: {
			total: 8,
			layout: {
				hspacing: 1.25,
				top: 0,
				left: function () { return Solitaire.Card.width * 3; }
			}
		},
		field: "foundation",
		draggable: false
	},

	Deck: instance(Solitaire.Deck, {
		count: 2,

		stackConfig: {
			total: 1,
			layout: {
				hspacing: 0,
				top: 0,
				left: 0
			}
		},
		field: "deck",

		init: function () {
			Solitaire.Deck.init.call(this);
			Y.Array.each(this.cards, function (c) { c.faceDown(); });
		},

		createStack: function () {
			var i, len;

			for (i = this.cards.length - 1; i >= 0; i--) {
				this.stacks[0].push(this.cards[i]);
			}
		},
	}),

	Waste: {
		stackConfig: {
			total: 1,
			layout: {
				hspacing: 0,
				top: 0,
				left: function () { return Solitaire.Card.width * 1.25; }
			}
		},
		field: "waste",
		draggable: true
	},

	Tableau: {
		stackConfig: {
			total: 10,
			layout: {
				hspacing: 1.31,
				top: function () { return Solitaire.Card.height * 1.5; },
				left: 0
			}
		},
		field: "tableau",
		draggable: true
	},

	Card: instance(Solitaire.Card, {
		validTarget: function (stack) {
			var target = stack.last();

			switch (stack.field) {
			case "tableau":
				if (!target) {
					return this.rank === 13;
				} else {
					return !target.isFaceDown && target.suit === this.suit && target.rank === this.rank + 1;
				}
				break;
			case "foundation":
				if (!target) {
					return this.rank === 1;
				} else {
					return target.suit === this.suit && target.rank === this.rank - 1;
				}
				break;
			default:
				return false;
			}
		}
	})
});

Y.Array.each(FortyThieves.fields, function (field) {
	FortyThieves[field].Stack = instance(FortyThieves.Stack);
});


Y.mix(FortyThieves.Stack, {
	cssClass: "freestack",

	validTarget: function (stack) {
		return stack.field === "tableau" &&
		    this.first().validTarget(stack);
	},

	validCard: function () { return false; }
}, true);

Y.mix(FortyThieves.Tableau.Stack, {
	setCardPosition: function (card) {
		var last = this.cards.last(),
		    top = last ? last.top + last.rankHeight : this.top,
		    left = this.left;

		card.left = left;
		card.top = top;
	}
}, true);

Y.mix(FortyThieves.Deck.Stack, {
	createDOMElement: function () {
		Solitaire.Stack.createDOMElement.call(this);
		this.node.on("click", Solitaire.Events.clickEmptyDeck);
	}
}, true);


FortyThieves.Foundation.Stack.cssClass = "freefoundation";

}, "0.0.1", {requires: ["solitaire"]});
YUI.add("freecell", function (Y) {

var Solitaire = Y.Solitaire,
    Freecell = Y.Solitaire.Freecell =  instance(Solitaire, {
	fields: ["Foundation", "Reserve", "Tableau"],

	deal: function () {
		var card,
		    stack = 0,
		    stacks = this.tableau.stacks;

		while (card = this.deck.pop()) {
			stacks[stack].push(card.faceUp());
			stack++;
			if (stack === 8) { stack = 0; }
		}
	},

	openSlots: function (exclude) {
		var total = 1,
		    freeTableaus = 0,
		    i,
		    stack,
		    rStacks = this.reserve.stacks,
		    tStacks = this.tableau.stacks;

		for (i = 0; i < 4; i++) {
			stack = rStacks[i];
			!stack.last() && total++;
		}

		for (i = 0; i < 8; i++) {
			stack = tStacks[i];
			exclude !== stack && !tStacks[i].last() && freeTableaus++;
		}

		total *= Math.pow(2, freeTableaus);

		return total;
	},

	Stack: instance(Solitaire.Stack),

	height: function () { return this.Card.base.height * 5; },

	Foundation: {
		stackConfig: {
			total: 4,
			layout: {
				hspacing: 1.25,
				top: 0,
				left: function () { return Solitaire.Card.width * 6; }
			}
		},
		field: "foundation",
		draggable: false
	},

	Reserve: {
		stackConfig: {
			total: 4,
			layout: {
				hspacing: 1.25,
				top: 0,
				left: 0
			}
		},
		field: "reserve",
		draggable: true
	},

	Tableau: {
		stackConfig: {
			total: 8,
			layout: {
				hspacing: 1.25,
				top: function () { return Solitaire.Card.height * 1.5; },
				left: 0
			}
		},
		field: "tableau",
		draggable: true
	},

	Card: instance(Solitaire.Card, {
		playable: function () {
			switch (this.stack.field) {
			case "reserve":
				return true;
			case "tableau":
				return this.createProxyStack();
			case "foundation":
				return false;
			}
		},

		createProxyStack: function () {
			var stack = Solitaire.Card.createProxyStack.call(this);

			this.proxyStack = stack && stack.cards.length <= Freecell.openSlots(stack) ? stack : null;
			return this.proxyStack;
		},

		validTarget: function (stack) {
			var target = stack.last();

			switch (stack.field) {
			case "tableau":
				if (!target) {
					return true;
				} else {
					return target.color !== this.color && target.rank === this.rank + 1;
				}
				break;
			case "foundation":
				if (!target) {
					return this.rank === 1;
				} else {
					return target.suit === this.suit && target.rank === this.rank - 1;
				}
				break;
			case "reserve":
				return !target;
				break;
			}
		}
	})
});

Y.Array.each(Freecell.fields, function (field) {
	Freecell[field].Stack = instance(Freecell.Stack);
}, true);

Y.mix(Freecell.Stack, {
	validTarget: function (stack) {
		if (stack.field !== "tableau" ||
		    !this.first().validTarget(stack)) { return false; }

		return this.cards.length <= Freecell.openSlots(stack, this.last());
	}
}, true);

Y.mix(Freecell.Tableau.Stack, {
	setCardPosition: function (card) {
		var last = this.cards.last(),
		    top = last ? last.top + last.rankHeight : this.top,
		    left = this.left;

		card.left = left;
		card.top = top;
	}
}, true);

}, "0.0.1", {requires: ["solitaire"]});
YUI.add("grandfathers-clock", function (Y) {

function wrap(array, index) {
	var len = array.length;

	index %= len;
	if (index < 0) { index += len; }

	return array[index];
}

function inRange(low, high, value) {
	if (low <= high) {
		return low <= value && value <= high;
	} else {
		return low <= value || value <= high;
	}
}

Y.namespace("Solitaire.GClock");

var Solitaire = Y.Solitaire,
    GClock = Y.Solitaire.GClock = instance(Solitaire, {
	fields: ["Foundation", "Tableau"],

	deal: function () {
		var card,
		    deck = this.deck,
		    cards = deck.cards,
		    clock = [],
		    suits = ["d", "c", "h", "s"],
		    found,
		    stack = 0,
		    i = 51, rank,
		    foundations = this.foundation.stacks,
		    stacks = this.tableau.stacks;

		while (i >= 0) {
			card = cards[i];
			found = false;

			for (rank = 2; rank <= 13; rank++) {
				if (card.rank === rank && card.suit === wrap(suits, rank)) {
					found = true;
					cards.splice(i, 1);
					clock[rank - 2] = card.faceUp();
					break;
				}
			}

			if (!found) {
				stacks[stack].push(card.faceUp());
				stack = (stack + 1) % 8;
			}
			i--;
		}

		for (i = 0; i < 12; i++) {
			foundations[(i + 2) % 12].push(clock[i]);
		}
	},

	height: function () { return this.Card.base.height * 6.7; },

	Stack: instance(Solitaire.Stack),

	Foundation: {
		stackConfig: {
			total: 12,
			layout: {
				hspacing: 1.25,
				top: function () { return Solitaire.Card.height * 3; },
				left: function () { return Solitaire.Card.width * 3.25; }
			}
		},
		field: "foundation",
		draggable: false
	},

	Tableau: {
		stackConfig: {
			total: 8,
			layout: {
				hspacing: 1.25,
				top: 0,
				left: function () { return Solitaire.Card.width * 7.25; }
			}
		},
		field: "tableau",
		draggable: true
	},

	Card: instance(Solitaire.Card, {
		createProxyStack: function () {
			var stack;

			switch (this.stack.field) {
			case "foundation":
				this.proxyStack = null;
				break;
			case "tableau":
				return Solitaire.Card.createProxyStack.call(this);
			}

			return this.proxyStack;
		},

		validTarget: function (stack) {
			var target = stack.last(),
			    rank,
			    hour;

			switch (stack.field) {
			case "tableau":
				if (!target) {
					return true;
				} else {
					return target.rank === this.rank + 1;
				}
				break;
			case "foundation":
				hour = (stack.index() + 3) % 12;
				rank = target.rank;

				return  target.suit === this.suit &&
					(target.rank + 1) % 13 === this.rank % 13 &&
					inRange(stack.first().rank, hour, this.rank);
				break;
			default:
				return false;
				break;
			}
		}
	})
});

Y.Array.each(GClock.fields, function (field) {
	GClock[field].Stack = instance(GClock.Stack);
}, true);

Y.mix(GClock.Stack, {
	validTarget: function (stack) {
		return stack.field === "tableau" && this.first().validTarget(stack);
	},

	validCard: function () { return false; }
}, true);

Y.mix(GClock.Tableau.Stack, {
	setCardPosition: function (card) {
		var last = this.cards.last(),
		    top = last ? last.top + last.rankHeight : this.top,
		    left = this.left;

		card.left = left;
		card.top = top;
	}
}, true);

Y.mix(GClock.Foundation.Stack, {
	index: function () {
		return GClock.foundation.stacks.indexOf(this);
	},

	layout: function (layout, i) {
		var top = Math.sin(Math.PI * i / 6) * Solitaire.Card.height * 2.25,
		    left = Math.cos(Math.PI * i / 6) * Solitaire.Card.width * 3;

		this.top = top + normalize(layout.top);
		this.left = left + normalize(layout.left);
	}
}, true);

}, "0.0.1", {requires: ["solitaire"]});
YUI.add("monte-carlo", function (Y) {

var Solitaire = Y.Solitaire,
    MonteCarlo = Y.Solitaire.MonteCarlo = instance(Solitaire, {
	fields: ["Foundation", "Deck", "Tableau"],

	createEvents: function () {
		Solitaire.createEvents.call(this);

		Y.delegate("click", Solitaire.Events.clickEmptyDeck, Solitaire.selector, ".stack");

		Y.on("solitaire|endTurn", this.deckPlayable);
		Y.on("solitaire|afterSetup", this.deckPlayable);
	},

	deckPlayable: function () {
		var gap = false,
		    node = Game.deck.stacks[0].node;

		Game.eachStack(function (s) {
			if (!gap && Y.Array.indexOf(s.cards, null) !== -1) {
				gap = true;
			}
		}, "tableau");

		if (gap) {
			node.addClass("playable");
		} else {
			node.removeClass("playable");
		}
	},

	deal: function () {
		var card,
		    stack,
		    i,
		    deck = this.deck,
		    stacks = this.tableau.stacks;

		for (stack = 0; stack < 5; stack++) {
			for (i = 0; i < 5; i++) {
				card = deck.pop().faceUp();
				stacks[stack].push(card);
			}
		}

		deck.createStack();
	},

	/*
	 * 1) gather all tableau cards into an array
	 * 2) clear every tableau row/stack, then redeal the cards from the previous step onto the tableau
	 * 3) deal cards from the deck to fill the remaining free rows
	 */
	redeal: function () {
		var stacks = this.tableau.stacks,
		    deck = this.deck.stacks[0],
		    cards = Y.Array.reduce(stacks, [], function (compact, stack) {
			return compact.concat(stack.compact());
			}),
		    len = cards.length,
		    card,
		    s, i;

		Y.Array.each(stacks, function (stack) {
			stack.node.remove();
			stack.cards = [];
			stack.createNode();
		});

		for (i = s = 0; i < len; i++) {
			if (i && !(i % 5)) { s++; }
			stacks[s].push(cards[i]);
		}

		while (i < 25 && deck.cards.length) {
			if (!(i % 5)) { s++; }
			card = deck.last().faceUp();
			card.moveTo(stacks[s]);
			card.node.setStyle("zIndex", 100 - i);
			i++;
		}

	},

	height: function () { return this.Card.base.height * 6; },

	Stack: instance(Solitaire.Stack, {
		images: { deck: "freeslot.png" },

		updateDragGroups: function () {
			var active = Solitaire.activeCard;

			Y.Array.each(this.cards, function (c) {
				if (!c) { return; }

				if (active.validTarget(c)) {
					c.node.drop.addToGroup("open");
				} else
					c.node.drop.removeFromGroup("open");
			});
		},

		index: function () { return 0; }
	}),

	Events: instance(Solitaire.Events, {
		drop: function (e) {
			var active = Solitaire.activeCard,
			    foundation = Solitaire.game.foundation.stacks[0],
			    target = e.drop.get("node").getData("target");

			if (!active) { return; }

			Solitaire.stationary(function () {
				target.moveTo(foundation);
				active.moveTo(foundation);
			});

			Solitaire.endTurn();
		}
	}),

	Foundation: {
		stackConfig: {
			total: 1,
			layout: {
				spacing: 0,
				top: 0,
				left: function () { return Solitaire.Card.width * 10.5; }
			}
		},
		field: "foundation"
	},

	Deck: instance(Solitaire.Deck, {
		stackConfig: {
			total: 1,
			layout: {
				spacing: 0,
				top: 0,
				left: function () { return Solitaire.Card.width * 2}
			}
		},
		field: "deck",

		createStack: function () {
			var i, len;

			for (i = 0, len = this.cards.length; i < len; i++) {
				this.stacks[0].push(this.cards[i]);
			}
		}
	}),

	Tableau: {
		stackConfig: {
			total: 5,
			layout: {
				cardGap: 1.25,
				vspacing: 1.25,
				hspacing: 0,
				top: 0,
				left: function () { return Solitaire.Card.width * 3.5; }
			}
		},
		field: "tableau"
	},

	Card: instance(Solitaire.Card, {
		row: function () {
			return this.stack.index();
		},

		column: function () {
			return this.stack.cards.indexOf(this);
		},

		/*
		 * return true if:
		 * 1) the target card is free
		 * 2) both cards are the same rank
		 * 3) both cards are adjacent vertically, horizontally, or diagonally
		 */

		validTarget: function (card) {
			if (!(this.rank === card.rank && card.isFree())) { return false; }

			return Math.abs(card.row() - this.row()) <= 1 &&
				Math.abs(card.column() - this.column()) <= 1;
		},

		createProxyStack: function () {
			var stack = null;

			if (this.isFree()) {
				stack = instance(this.stack);
				stack.cards = this.proxyCards();
			}

			this.proxyStack = stack;

			return this.proxyStack;
		},

		proxyCards: function () {
			return [this];
		},

		isFree: function () {
			return this.stack.field === "tableau";
		},

		turnOver: function () {
			this.stack.field === "deck" && Solitaire.game.redeal();
		}
	})
});

Y.Array.each(MonteCarlo.fields, function (field) {
	MonteCarlo[field].Stack = instance(MonteCarlo.Stack);
});

// Each tableau row is treated as a "stack"
Y.mix(MonteCarlo.Tableau.Stack, {
	deleteItem: function (card) {
		var cards = this.cards,
		    i = cards.indexOf(card);

		if (i !== -1) { cards[i] = null; }
	},

	setCardPosition: function (card) {
		var last = this.cards.last(),
		    layout = MonteCarlo.Tableau.stackConfig.layout,
		    top = this.top,
		    left = last ? last.left + card.width * layout.cardGap : this.left;

		card.left = left;
		card.top = top;
	},

	compact: function () {
		var cards = this.cards,
		    card,
		    compact = [],
		    i, len;

		for (i = 0, len = cards.length; i < len; i++) {
			card = cards[i];
			if (card) {
				compact.push(card);
				card.pushPosition();
			}
		}

		return compact;
	},

	index: function () {
		return Solitaire.game.tableau.stacks.indexOf(this);
	}
}, true);

Y.mix(MonteCarlo.Deck.Stack, {
	updateDragGroups: function () {
		var active = Solitaire.activeCard,
		    card = this.last();

		if (!card) { return; }

		if (active.validTarget(card)) {
			card.node.drop.addToGroup("open");
		} else {
			card.node.drop.removeFromGroup("open");
		}
	}
}, true);

}, "0.0.1", {requires: ["solitaire", "array-extras"]});
YUI.add("pyramid", function (Y) {

var Solitaire = Y.Solitaire,
    Pyramid = Y.Solitaire.Pyramid = instance(Solitaire, {
	fields: ["Foundation", "Deck", "Waste", "Tableau"],

	deal: function () {
		var card,
		    stack,
		    i,
		    deck = this.deck,
		    stacks = this.tableau.stacks;

		for (stack = 0; stack < 7; stack++) {
			for (i = 0; i <= stack; i++) {
				card = deck.pop().faceUp();
				stacks[stack].push(card);
			}
		}

		deck.createStack();
		deck.last().faceUp();
	},

	turnOver: function () {
		var deck = this.deck.stacks[0],
		    waste = this.waste.stacks[0];

		if (deck.cards.length === 1) { return; }
		deck.last().moveTo(waste);
	},

	height: function () { return this.Card.base.height * 4.85; },

	Stack: instance(Solitaire.Stack, {
		images: {},

		updateDragGroups: function () {
			var active = Solitaire.activeCard;

			Y.Array.each(this.cards, function (c) {
				if (!c) { return; }

				if (active.validTarget(c)) {
					c.node.drop.addToGroup("open");
				} else {
					c.node.drop.removeFromGroup("open");
				}
			});
		}
	}),

	Events: instance(Solitaire.Events, {
		dragCheck: function (e) {
			if (!Solitaire.game.autoPlay.call(this)) {
				Solitaire.Events.dragCheck.call(this);
			}
		},

		drop: function (e) {
			var active = Solitaire.activeCard,
			    foundation = Solitaire.game.foundation.stacks[0],
			    target = e.drop.get("node").getData("target");

			if (!active) { return; }

			Solitaire.stationary(function () {
				target.moveTo(foundation);
				active.moveTo(foundation);
			});

			Solitaire.endTurn();
		}
	}),

	Foundation: {
		stackConfig: {
			total: 1,
			layout: {
				hspacing: 0,
				top: 0,
				left: function () { return Solitaire.Card.width * 8; }
			}
		},
		field: "foundation"
	},

	Deck: instance(Solitaire.Deck, {
		stackConfig: {
			total: 1,
			layout: {
				hspacing: 0,
				top: 0,
				left: 0
			}
		},
		field: "deck",

		createStack: function () {
			var i, len;

			for (i = 0, len = this.cards.length; i < len; i++) {
				this.stacks[0].push(this.cards[i]);
			}
		}
	}),

	Waste: {
		stackConfig: {
			total: 1,
			layout: {
				hspacing: 0,
				top: 0,
				left: function () { return Solitaire.Card.width * 1.5; }
			}
		},
		field: "waste"
	},

	Tableau: {
		stackConfig: {
			total: 7,
			layout: {
				vspacing: 0.6,
				hspacing: -0.625,
				cardGap: 1.25,
				top: 0,
				left: function () { return Solitaire.Card.width * 5; }
			}
		},
		field: "tableau"
	},

	Card: instance(Solitaire.Card, {
		validTarget: function (card) {
			if (card.field === "foundation") { // "card" is actually a stack :/
				return this.isFree() && this.rank === 13;
			}

			if (card.isFree()) {
				return this.rank + card.rank === 13;
			}

			return false;
		},

		createProxyNode: function () {
			return this.rank === 13 ?
				"" :
				Solitaire.Card.createProxyNode.call(this);
		},

		createProxyStack: function () {
			var stack = null;

			if (this.isFree()) {
				stack = instance(this.stack);
				stack.cards = this.proxyCards();
			}

			this.proxyStack = stack;

			return this.proxyStack;
		},

		proxyCards: function () {
			return [this];
		},

		isFree: function () {
			var stack = this.stack,
			    stackIndex = stack.index(),
			    index = stack.cards.indexOf(this),
			    game = Solitaire.game,
			    next = stack.next();

			if (stack.field === "deck" || stack.field === "waste") {
				return !this.isFaceDown;
			} else {
				return !(this.stack.field === "foundation" ||
					next &&
					(next.cards[index] || next.cards[index + 1]));
			}
		},

		turnOver: function () {
			this.stack.field === "deck" && !this.isFaceDown && Solitaire.game.turnOver();
		}
	})
});

Y.Array.each(Pyramid.fields, function (field) {
	Pyramid[field].Stack = instance(Pyramid.Stack);
});

Y.mix(Pyramid.Tableau.Stack, {
	deleteItem: function (card) {
		var cards = this.cards,
		    i = cards.indexOf(card);

		if (i !== -1) { cards[i] = null; }
	},

	setCardPosition: function (card) {
		var layout = Pyramid.Tableau.stackConfig.layout,
		    last = this.cards.last(),
		    top = this.top,
		    left = last ? last.left + card.width * layout.cardGap : this.left;

		card.left = left;
		card.top = top;
		card.zIndex = this.index() * 10;
	}
}, true);

Y.mix(Pyramid.Deck.Stack, {
	deleteItem: function (card) {
		Pyramid.Stack.deleteItem.call(this, card);
		this.update();
	},

	update: function (undo) {
		var last = this.last();

		last && last.faceUp(undo);
	},


	updateDragGroups: function () {
		var active = Solitaire.activeCard,
		    card = this.last();

		if (!card) { return; }

		if (active.validTarget(card)) {
			card.node.drop.addToGroup("open");
		} else {
			card.node.drop.removeFromGroup("open");
		}
	}
}, true);

Pyramid.Waste.Stack.updateDragGroups = Pyramid.Deck.Stack.updateDragGroups;

}, "0.0.1", {requires: ["solitaire"]});
YUI.add("russian-solitaire", function (Y) {

  var Solitaire = Y.Solitaire,
    Yukon = Solitaire.Yukon,
    RussianSolitaire = Solitaire.RussianSolitaire = instance(Yukon, {
      Card: instance(Yukon.Card)
    });

  RussianSolitaire.Card.validTarget = function (stack) {
    var target = stack.last();

    switch (stack.field) {
    case "tableau":
      if (!target) {
         return this.rank === 13;
       } else {
         return !target.isFaceDown && target.suit === this.suit && target.rank === this.rank + 1;
       }
    case "foundation":
      if (!target) {
        return this.rank === 1;
      } else {
        return target.suit === this.suit && target.rank === this.rank - 1;
      }
    default:
      return false;
    }
  };
}, "0.0.1", {requires: ["yukon"]});
YUI.add("scorpion", function (Y) {

var Solitaire = Y.Solitaire,
    Scorpion = Solitaire.Scorpion = instance(Solitaire, {
	fields: ["Foundation", "Deck", "Tableau"],

	createEvents: function () {
		Solitaire.AutoStackClear.register();
		Solitaire.createEvents.call(this);
	},

	deal: function () {
		var card,
		    stack,
		    row,
		    deck = this.deck,
		    stacks = this.tableau.stacks;

		for (row = 0; row < 7; row++) {
			for (stack = 0; stack < 7; stack++) {
				card = deck.pop();

				if (!(row < 3 && stack < 4)) { card.faceUp(); }

				stacks[stack].push(card);
			}
		}

		deck.createStack();
	},

	turnOver: function () {
		var deck = this.deck.stacks[0],
		    stacks = this.tableau.stacks,
		    i, len;

		for (i = 0; i < 3; i++) {
			deck.last().faceUp().moveTo(stacks[i]);
		}
	},

	height: function () { return this.Card.base.height * 5.6; },

	Stack: instance(Solitaire.Stack),

	Deck: instance(Solitaire.Deck, {
		stackConfig: {
			total: 1,
			layout: {
				top: 0,
				left: function () { return Solitaire.Card.width * 9; }
			},
		},
		field: "deck",

		createStack: function () {
			var i, len;

			for (i = this.cards.length - 1; i >= 0; i--) {
				this.stacks[0].push(this.cards[i]);
			}
		},
	}),

	Foundation: {
		stackConfig: {
			total: 4,
			layout: {
				top: function () { return Solitaire.Card.height * 1.1; },
				left: function () { return Solitaire.Card.width * 9; },
				vspacing: 1.1,
			}
		},
		field: "foundation"
	},

	Tableau: {
		stackConfig: {
			total: 7,
			layout: {
				hspacing: 1.25,
				top: 0,
				left: 0
			}
		},
		field: "tableau"
	},

	Card: instance(Solitaire.Card, {
		playable: function () {
			var field = this.stack.field;

			return field === "deck" || field === "tableau" && !this.isFaceDown;
		},

		validTarget: function (stack) {
			var target = stack.last();

			if (stack.field !== "tableau") { return false; }

			if (!target) {
				return this.rank === 13;
			} else {
				return !target.isFaceDown && target.suit === this.suit && target.rank === this.rank + 1;
			}
		}
	})
});

Y.Array.each(Scorpion.fields, function (field) {
	Scorpion[field].Stack = instance(Scorpion.Stack);
});


Y.mix(Scorpion.Stack, {
	validTarget: function (stack) {
		return stack.field === "tableau" &&
		    this.first().validTarget(stack);
	},

	validProxy: function (card) {
		return true;
	},

	validTarget: function (stack) {
		var rank,
		    cards = this.cards,
		    i;

		switch (stack.field) {
		case "tableau":
			return this.first().validTarget(stack);
			break;
		case "foundation":
			rank = this.last.rank;
			if (cards.length !== 13) { return false; }

			for (i = 0; i < 13; i++) {
				if (cards[i].rank !== rank) { return false; }
			}

			return true;
			break;
		}
	}
}, true);

Y.mix(Scorpion.Tableau.Stack, {
	setCardPosition: function (card) {
		var last = this.cards.last(),
		    top = last ? last.top + last.rankHeight : this.top,
		    left = this.left;

		card.left = left;
		card.top = top;
	}
}, true);

}, "0.0.1", {requires: ["auto-stack-clear"]});
YUI.add("spider", function (Y) {

var Solitaire = Y.Solitaire,
    Spider = Solitaire.Spider = instance(Solitaire, {
	fields: ["Foundation", "Deck", "Tableau"],

	createEvents: function () {
		Solitaire.AutoStackClear.register();
		Solitaire.createEvents.call(this);
	},

	deal: function () {
		var stack = 0,
		    deck = this.deck,
		    stacks = this.tableau.stacks,
		    row;

		for (row = 0; row < 5; row++) {
			for (stack = 0; stack < 10; stack++) {
				if (stack < 4 || row < 4) {
					stacks[stack].push(deck.pop());			
				}
			}
		}

		for (stack = 0; stack < 10; stack++) {
			stacks[stack].push(deck.pop().faceUp());
		}

		deck.createStack();
	},

	redeal: function () {},

	turnOver: function () {
		var deck = this.deck.stacks[0],
		    i, len;

		if (hasFreeTableaus()) {
			return;
		}

		this.eachStack(function (stack) {
			var card = deck.last();

			if (card) {
				card.faceUp().moveTo(stack).after(function () {
					this.stack.updateCardsPosition();
				});
			}
		}, "tableau");
	},

	Stack: instance(Solitaire.Stack),

	Foundation: {
		stackConfig: {
			total: 8,
			layout: {
				hspacing: 1.25,
				top: 0,
				left: function () { return Solitaire.Card.width * 2.5; }
			}
		},
		field: "foundation",
		draggable: false
	},

	Deck: instance(Solitaire.Deck, {
		count: 2,

		stackConfig: {
			total: 1,
			layout: {
				hspacing: 0,
				top: 0,
				left: 0
			}
		},
		field: "deck"
	}),

	Tableau: {
		stackConfig: {
			total: 10,
			layout: {
				hspacing: 1.25,
				top: function () { return Solitaire.Card.height * 1.5; },
				left: 0
			}
		},
		field: "tableau",
	},

	Card: instance(Solitaire.Card, {
		playable: function () {
			var previous = this.stack[this.index - 1];

			switch (this.stack.field) {
			case "tableau":
				return this.createProxyStack();
			case "deck": 
				return !hasFreeTableaus(); case "foundation":
				return false;
			}
		},

		validTarget: function (stack) {
			if (stack.field !== "tableau") { return false; }

			var target = stack.last();

			return !target || !target.isFaceDown && target.rank === this.rank + 1;
		}
	})
});

function hasFreeTableaus() {
	return Y.Array.some(Game.tableau.stacks, function (stack) {
		return !stack.cards.length;
	});
}

Y.Array.each(Spider.fields, function (field) {
	Spider[field].Stack = instance(Spider.Stack);
});


Y.mix(Spider.Stack, {
	validCard: function (card) {
		return card.suit === this.cards.last().suit;
	},

	validTarget: function (stack) {
		switch (stack.field) {
		case "tableau":
			return this.first().validTarget(stack);
			break;
		case "foundation":
			return this.cards.length === 13;
			break;
		}
	}
}, true);

Y.mix(Spider.Tableau.Stack, {
	setCardPosition: function (card) {
		var last = this.cards.last(),
		    top = last ? last.top + last.rankHeight : this.top,
		    left = this.left;

		card.left = left;
		card.top = top;
	}
}, true);
}, "0.0.1", {requires: ["auto-stack-clear"]});
YUI.add("spider1s", function (Y) {
	var Spider = Y.Solitaire.Spider1S = instance(Y.Solitaire.Spider);

	Spider.Deck = instance(Y.Solitaire.Spider.Deck, {
		suits: ["s"],
		count: 8
	});
}, "0.0.1", {requires: ["spider"]});
YUI.add("spider2s", function (Y) {
	var Spider = Y.Solitaire.Spider2S = instance(Y.Solitaire.Spider);

	Spider.Deck = instance(Y.Solitaire.Spider.Deck, {
		suits: ["s", "h"],
		count: 4
	});
}, "0.0.1", {requires: ["spider"]});
YUI.add("spiderette", function (Y) {
	var Solitaire = Y.Solitaire,
	    Klondike = Solitaire.Klondike,
	    Spider = Solitaire.Spider,
	    Spiderette = Y.Solitaire.Spiderette = instance(Spider, {
		height: Klondike.height,
		deal: Klondike.deal,

		Tableau: instance(Spider.Tableau, {
			stackConfig: Klondike.Tableau.stackConfig
		}),
		Foundation: instance(Spider.Foundation, {
			stackConfig: Klondike.Foundation.stackConfig
		}),

		Deck: instance(Spider.Deck, {
			count: 1
		})
	    });
}, "0.0.1", {requires: ["klondike", "spider"]});
YUI.add("tri-towers", function (Y) {
	var Solitaire = Y.Solitaire,
	TriTowers = Y.Solitaire.TriTowers = instance(Solitaire, {
		fields: ["Deck", "Foundation", "Tableau"],

		width: function () { return this.Card.base.width * 15; },
		height: function () { return this.Card.base.height * 5; },
		createEvents: function () {
			Y.on("solitaire|endTurn", function () {
				var tableaus = Solitaire.game.tableau.stacks,
				    i;

				for (i = 0; i < 3; i++) {
					Y.fire("tableau:afterPop", tableaus[i]);
				}
			});

			Solitaire.createEvents.call(this);
		},

		deal: function () {
			var card,
			    stack,
			    stacks = this.tableau.stacks,
			    deck = this.deck,
			    foundation = this.foundation.stacks[0],

			    i, stackLength;

			for (stack = 0; stack < 4; stack++) {
				stackLength = (stack + 1) * 3;

				for (i = 0; i < stackLength; i++) {
					card = deck.pop();
					stacks[stack].push(card);
					stack === 3 && card.faceUp();
				}
			}

			card = deck.pop().faceUp();
			foundation.push(card);

			deck.createStack();
		},

		turnOver: function () {
			var deck = this.deck.stacks[0],
			    foundation = this.foundation.stacks[0],
			    last = deck.last();

			last && last.faceUp().moveTo(foundation);
		},

		isWon: function () {
			var won = true;

			this.eachStack(function (stack) {
				stack.eachCard(function (card) {
					if (card) { won = false; }

					return won;
				});
			}, "tableau");

			return won;
		},

		Deck: instance(Solitaire.Deck, {
			field: "deck",
			stackConfig: {
				total: 1,
				layout: {
					hspacing: 0,
					top: function () { return Solitaire.Card.height * 4; },
					left: 0
				}
			},

			createStack: function () {
				var i, len;

				for (i = 0, len = this.cards.length; i < len; i++) {
					this.stacks[0].push(this.cards[i]);
				}
			}
		}),

		Tableau: {
			field: "tableau",
			stackConfig: {
				total: 4,
				layout: {
					rowGaps: [3.75, 2.5, 1.25, 0],
					cardGap: 1.25,
					vspacing: 0.6,
					hspacing: -0.625,
					top: 0,
					left: function () { return Solitaire.Card.width * 1.875; }
				}
			}
		},

		Foundation: {
			field: "foundation",
			stackConfig: {
				total: 1,
				layout: {
					hspacing: 0,
					top: function () { return Solitaire.Card.height * 4; },
					left: function () { return Solitaire.Card.width * 4; }
				}
			}
		},

		Events: instance(Solitaire.Events, {
			dragCheck: function (e) {
				this.getCard().autoPlay();

				/* workaround because YUI retains stale drag information if we halt the event :\ */
				this._afterDragEnd();
				e.halt();
			}
		}),

		Card: instance(Solitaire.Card, {
			/*
			 * return true if the target is 1 rank away from the this card
			 * Aces and Kings are valid targets for each other
			 */
			validTarget: function (stack) {
				if (stack.field !== "foundation") { return false; }

				var card = stack.last(),
				    diff = Math.abs(this.rank - card.rank);

				return diff === 1 || diff === 12;
			},

			playable: function () {
				var stack = this.stack;

				return (stack.field === "deck" && this === stack.last()) ||
					(this.isFree() && this.validTarget(Game.foundation.stacks[0]));
			},

			isFree: function () {
				var stack = this.stack,
				    next = stack.next(),
				    tower = this.tower(),
				    index = stack.cards.indexOf(this),
				    i;

				if (stack.field !== "tableau") { return false; }

				if (!next) { return true; }

				for (i = 0; i < 2; i++) {
					if (next.cards[index + tower + i]) { return false; }
				}

				return true;
			},

			tower: function () {
				var stack = this.stack,
				    index = stack.cards.indexOf(this),
				    stackIndex = stack.index() + 1;

				return Math.floor(index / stackIndex);
			}
		}),
		     
		Stack: instance(Solitaire.Stack, {
			images: {}
		})
	}, true);

	Y.Array.each(TriTowers.fields, function (field) {
		TriTowers[field].Stack = instance(TriTowers.Stack);
	});

	Y.mix(TriTowers.Tableau.Stack, {
		deleteItem: function (card) {
			var cards = this.cards,
			    i = cards.indexOf(card);

			if (i !== -1) { cards[i] = null; }
		},

		setCardPosition: function (card) {
			var last = this.last(),
			    top = this.top,
			    left,
			    index,
			    stackIndex,

			    layout = TriTowers.Tableau.stackConfig.layout,
			    rowGaps = layout.rowGaps,
			    cardGap = layout.cardGap;

			if (last) {
				left = last.left + card.width * cardGap;
				index = this.cards.length;
				stackIndex = this.index() + 1;

				if (!(index % stackIndex)) { left += rowGaps[stackIndex - 1] * card.width; }
			} else {
				left = this.left;
			}

			card.top = top;
			card.left = left;
			card.zIndex = this.index() * 10;
		}
	}, true);

	Y.mix(TriTowers.Deck.Stack, {
		setCardPosition: function (card) {
			var last = this.last(),
			    top,
			    left,
			    zIndex;

			top = this.top;
			if (last) {
				left = last.left + card.width * 0.1;
				zIndex = last.zIndex + 1;
			} else {
				left = this.left;
				zIndex = 0;
			}

			card.top = top;
			card.left = left;
			card.zIndex = zIndex;
		}
	}, true);
}, "0.0.1", {requires: ["solitaire"]});
YUI.add("will-o-the-wisp", function (Y) {

	var Solitaire = Y.Solitaire,
	    WillOTheWisp = Y.Solitaire.WillOTheWisp = instance(Solitaire.Spiderette, {
		deal: function () {
			var deck = this.deck,
			    row;

			for (row = 0; row < 3; row++) {
				this.eachStack(function (stack) {
					var card = deck.pop();
					if (row === 2) { card.faceUp(); }

					stack.push(card);
				}, "tableau");
			}

			deck.createStack();
		}
	    });
}, "0.0.1", {requires: ["spiderette"]});
YUI.add("yukon", function (Y) {

var Solitaire = Y.Solitaire,
    Yukon = Solitaire.Yukon = instance(Solitaire, {
	fields: ["Foundation", "Tableau"],

	deal: function () {
		var card,
		    piles = 6,
		    stack = 0,
		    deck = this.deck,
		    stacks = this.tableau.stacks;

		while (piles >= 0) {
			card = deck.pop().faceUp();
			stacks[6 - piles].push(card);

			for (stack = 7 - piles; stack < 7; stack++) {
				card = deck.pop();
				stacks[stack].push(card);			
			}
			piles--;
		}

		stack = 1;
		while (deck.cards.length) {
			card = deck.pop().faceUp();
			stacks[stack].push(card);
			stack = (stack % 6) + 1;
		}
	},

	height: function () { return this.Card.base.height * 4.8; },

	Stack: instance(Solitaire.Stack),

	Foundation: {
		stackConfig: {
			total: 4,
			layout: {
				vspacing: 1.25,
				top: 0,
				left: function () { return Solitaire.Card.width * 9; }
			}
		},
		field: "foundation",
		draggable: false
	},

	Tableau: {
		stackConfig: {
			total: 7,
			layout: {
				hspacing: 1.25,
				top: 0,
				left: 0
			}
		},
		field: "tableau",
		draggable: true
	},

	Card: instance(Solitaire.Card, {
		playable: function () {
			return this.stack.field === "tableau" && !this.isFaceDown;
		},

		validTarget: function (stack) {
			var target = stack.last();

			switch (stack.field) {
			case "tableau":
				if (!target) {
					return this.rank === 13;
				} else {
					return !target.isFaceDown && target.color !== this.color && target.rank === this.rank + 1;
				}
				break;
			case "foundation":
				if (!target) {
					return this.rank === 1;
				} else {
					return target.suit === this.suit && target.rank === this.rank - 1;
				}
				break;
			default:
				return false;
			}
		}
	})
});

Y.Array.each(Yukon.fields, function (field) {
	Yukon[field].Stack = instance(Yukon.Stack);
});


Y.mix(Yukon.Stack, {
	validTarget: function (stack) {
		return stack.field === "tableau" &&
		    this.first().validTarget(stack);
	},

	validProxy: function (card) {
		return true;
	}
}, true);

Y.mix(Yukon.Tableau.Stack, {
	setCardPosition: function (card) {
		var last = this.cards.last(),
		    top = last ? last.top + last.rankHeight : this.top,
		    left = this.left;

		card.left = left;
		card.top = top;
	}
}, true);

}, "0.0.1", {requires: ["solitaire"]});
(function () {
	var active = {
		name: "klondike",
		game: null
	    },
	    yui = YUI({ base: "js/yui-unpack/yui/build/" }), Y,
	    games = {
		"agnes": "Agnes",
		"klondike": "Klondike",
		"klondike1t": "Klondike1T",
		"flower-garden": "FlowerGarden",
		"forty-thieves": "FortyThieves",
		"freecell": "Freecell",
		"golf": "Golf",
		"grandfathers-clock": "GClock",
		"monte-carlo": "MonteCarlo",
		"pyramid": "Pyramid",
		"russian-solitaire": "RussianSolitaire",
		"scorpion": "Scorpion",
		"spider": "Spider",
		"spider1s": "Spider1S",
		"spider2s": "Spider2S",
                "spiderette": "Spiderette",
		"tri-towers": "TriTowers",
		"will-o-the-wisp": "WillOTheWisp",
		"yukon": "Yukon"},

	    extensions = [
		"auto-turnover",
	        "statistics",
		"solver-freecell",
		"solitaire-autoplay",
	        "solitaire-ios",
		"solitaire-background-fix"],

	Fade = (function() {
		var el = null,
		    body,
		    css = {
		    position: "absolute",
		    display: "none",
		    backgroundColor: "#000",
		    opacity: 0.7,
		    top: 0,
		    left: 0,
		    width: 0,
		    height: 0,
		    zIndex: 1000,
		},

		element = function() {
			if (el === null) {
				el = Y.Node.create("<div>");
				el.setStyles(css);
				body = Y.one("body").append(el);
			}
			return el;
		};

		return {
			show: function() {
				var el = element();

				css.display = "block";
				css.width = el.get("winWidth");
				css.height = el.get("winHeight");

				el.setStyles(css);

			},

			hide: function() {
				css.display = "none";
				element().setStyles(css);
			}
		};
	}()),

	GameChooser = {
		selected: null,
		fade: false,

		init: function () {
			this.refit();
		},

		refit: function () {
			var node = Y.one("#game-chooser"),
			    height = node.get("winHeight");

			node.setStyle("min-height", height);
		},

		show: function (fade) {
			if (!this.selected) {
				this.select(active.name);
			}

			if (fade) {
				Fade.show();
				this.fade = true;
			}

			Y.one("#game-chooser").addClass("show");
			Y.one("body").addClass("scrollable");
		},

		hide: function () {
			if (this.fade) {
				Fade.hide();
			}

			Y.one("#game-chooser").removeClass("show");
			Y.fire("gamechooser:hide", this);
			Y.one("body").removeClass("scrollable");
		},

		choose: function () {
			if (!this.selected) { return; }

			this.hide();
			playGame(this.selected);
		},

		select: function (game) {
			var node = Y.one("#" + game + "> div"),
			    previous = this.selected;
			
			if (previous !== game) {
				this.unSelect();
			}

			if (node) {
				this.selected = game;
				new Y.Node(document.getElementById(game)).addClass("selected");
			}

			if (previous && previous !== game) {
				Y.fire("gamechooser:select", this);
			}
		},

		unSelect: function () {
			if (!this.selected) { return; }

			new Y.Node(document.getElementById(this.selected)).removeClass("selected");
			this.selected = null;
		}
	},

	/* theres no mechanism yet to load the appropriate deck depending on the scaled card width
	 * so we just load the 122x190 cards and call it a day :/
	 */
	Themes = {
		dondorf: {
			sizes: [61, 79, 95, 122],
			61: {
				hiddenRankHeight: 7,
				rankHeight: 25,
				dimensions: [61, 95]
			},

			79: {
				hiddenRankHeight: 10,
				rankHeight: 32,
				dimensions: [79, 123]
			},

			95: {
				hiddenRankHeight: 12,
				rankHeight: 38,
				dimensions: [95, 148]
			},

			122: {
				hiddenRankHeight: 15,
				rankHeight: 48,
				dimensions: [122, 190]
			}
		},

		snapToSize: function (width) {
			var theme,
			    sizes = theme.sizes;

			width = clamp(width, sizes[0], sizes[sizes.length - 1]) >>> 0;

			while (Y.Array.indexOf(sizes, width) === -1) {
				width++;
			}

			return width;
		},

		load: function (name) {
			var Solitaire = Y.Solitaire,
			    base = Solitaire.Card.base;

			if (!(name in this)) {
				name = "dondorf";
			}

			if (base.theme !== name) {
				this.set(name, 122);
			}
		},

		set: function (name, size) {
			var theme = this[name][size];

			Y.mix(Y.Solitaire.Card.base, {
				theme: name + "/" + size,
				hiddenRankHeight: theme.hiddenRankHeight,
				rankHeight: theme.rankHeight,
				width: theme.dimensions[0],
				height: theme.dimensions[1]
			}, true);
		}
	};


	function modules() {
		var modules = extensions.slice(),
		    m;

		for (m in games) {
			if (games.hasOwnProperty(m)) {
				modules.unshift(m);
			}
		}

		return modules;
	}

	function main(YUI) {
		Y = YUI;

		exportAPI();
		Y.on("domready", load);
	}

	function showDescription() {
		GameChooser.select(this._node.id);
		GameChooser.choose();
	}

	function attachEvents() {
		Y.on("click", restart, Y.one("#restart"));
		Y.on("click", function () { GameChooser.show(false); }, Y.one("#choose_game"));
		Y.on("click", function () { active.game.undo(); }, Y.one("#undo"));
		Y.on("click", newGame, Y.one("#new_deal"));

		Y.on("click", hideChromeStoreLink, Y.one(".chromestore"));

		Y.delegate("click", showDescription, "#descriptions", "li");

                Y.on("click", function () { GameChooser.hide(); }, Y.one("#close-chooser"));
		Y.one("document").on("keydown", function (e) {
			e.keyCode === 27 && GameChooser.hide();
		});

		Y.on("afterSetup", function() {
			active.game.stationary(function () {
				resize()
			});
		});

		attachResize();
	}

	function attachResize() {
		var timer,
		    delay = 250,
		    attachEvent;

		if (window.addEventListener) {
			attachEvent = "addEventListener";
		} else if (window.attachEvent) {
			attachEvent = "attachEvent";
		}

		window[attachEvent](Y.Solitaire.Application.resizeEvent, function () {
			clearTimeout(timer);
			timer = setTimeout(resize, delay);
		}, false);
	}

	function resize() {
		var game = active.game,
		    el = game.container(),
		    padding = Y.Solitaire.padding,
		    offset = Y.Solitaire.offset,
		    width = el.get("winWidth") - padding.x,
		    height = el.get("winHeight") - padding.y,
		    ratio = 1;

		Y.Solitaire.Application.windowHeight = height;
		ratio = Math.min((width - offset.left) / game.width(), (height - offset.top) / game.height());

		active.game.resize(ratio);
		GameChooser.refit();
	}

	function playGame(name) {
		var twoWeeks = 1000 * 3600 * 24 * 14;

		active.name = name;
		active.game = Y.Solitaire[games[name]];
		Y.Cookie.set("options", name, {expires: new Date(new Date().getTime() + twoWeeks)});
		newGame();
	}

	function loadOptions() {
		var options = Y.Cookie.get("options");

		options && (active.name = options);

		Themes.load("dondorf");
	}

	function load() {
		var save = Y.Cookie.get("saved-game");

		attachEvents();
		loadOptions();

		Preloader.preload();
		Preloader.loaded(function () {
			showChromeStoreLink();
			if (save) {
				clearDOM();
				active.game = Y.Solitaire[games[active.name]];
				active.game.loadGame(save);
			} else {
				playGame(active.name);
			}
		});

		GameChooser.init();
	}

	function clearDOM() {
		Y.all(".stack, .card").remove();
	}

	function restart() {
		var init = Y.Cookie.get("initial-game"),
		    game = active.game;

		if (init) {
			clearDOM();
			game.cleanup();
			game.loadGame(init);
			game.save();
		}
	}

	function newGame() {
		var game = active.game;

		clearDOM();
		game.cleanup();
		game.newGame();
	}

	function exportAPI() {
		Y.Solitaire.Application = {
			windowHeight: 0,
			resizeEvent: "resize",
			GameChooser: GameChooser,
			newGame: newGame
		};
	}

        function hideChromeStoreLink() {
		var expires = 1000 * 3600 * 24 * 365; // one year

		Y.one(".chromestore").addClass("hidden");
		Y.Cookie.set("disable-chromestore-link", true, {expires: new Date(new Date().getTime() + expires)});
        }

	function showChromeStoreLink() {
		if (Y.UA.chrome && !Y.Cookie.get("disable-chromestore-link", Boolean)) {
			Y.one(".chromestore").removeClass("hidden");
		}
	}

	var Preloader = {
		loadingCount: 0,

		loaded: function (callback) {
			if (this.loadingCount) {
				setTimeout(function () {
					this.loaded(callback);
				}.bind(this), 100);
			} else {
				Y.one(".loading").addClass("hidden");
				callback();
				Fade.hide();
			}
		},
	
		load: function (path) {
			var image = new Image;

			image.onload = function () {
				--this.loadingCount;
			}.bind(this);
			image.src = path;

			this.loadingCount++;
		},

		preload: function () {
			    var rank,
			    icons = ["agnes",
			    	     "flower-garden",
				     "forty-thieves",
				     "freecell",
				     "gclock",
				     "golf",
				     "klondike1t",
				     "klondike",
				     "montecarlo",
				     "pyramid",
				     "scorpion",
				     "spider1s",
				     "spider2s",
				     "spiderette",
				     "spider",
				     "tritowers",
				     "will-o-the-wisp",
				     "yukon"];

			Y.Array.each(["s", "h", "c", "d"], function (suit) {
				for (rank = 1; rank <= 13; rank++) {
					this.load(Y.Solitaire.Card.base.theme + "/" + suit + rank + ".png");
				}
			}, this);

			this.load(Y.Solitaire.Card.base.theme + "/facedown.png");

			Y.Array.each(icons, function (image) {
				this.load("layouts/mini/" + image + ".png");
			}, this);

			Fade.show();
			Y.one(".loading").removeClass("hidden");
		}
	};

	yui.use.apply(yui, modules().concat(main));
}());