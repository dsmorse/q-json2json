/*! q-json2json - v0.2.3-1 - 2015-06-02
* https://github.com/tuxpiper/q-json2json
 Copyright 2011 Joel Van Horn. All rights reserved.
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to
deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
IN THE SOFTWARE. 
 */

(function() {
  var TemplateConfig, sysmo,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  sysmo = (typeof require === "function" ? require('sysmo') : void 0) || (typeof window !== "undefined" && window !== null ? window.Sysmo : void 0);

  TemplateConfig = (function() {
    function TemplateConfig(config) {
      this.applyFormatting = bind(this.applyFormatting, this);
      this.aggregate = bind(this.aggregate, this);
      this.processable = bind(this.processable, this);
      this.getValue = bind(this.getValue, this);
      this.getKey = bind(this.getKey, this);
      this.getPath = bind(this.getPath, this);
      config.path || (config.path = '.');
      config.as || (config.as = {});
      if (sysmo.isString(config.choose)) {
        config.choose = [config.choose];
      }
      if (sysmo.isString(config.include)) {
        config.include = [config.include];
      }
      this.arrayToMap = !!config.key;
      this.mapToArray = !this.arrayToMap && config.key === false && !config.as;
      this.directMap = !!(this.arrayToMap && config.value);
      this.nestTemplate = !!config.nested;
      this.includeAll = !!config.all;
      this.config = config;
    }

    TemplateConfig.prototype.getPath = function() {
      return this.config.path;
    };

    TemplateConfig.prototype.getKey = function(node) {
      switch (sysmo.type(this.config.key)) {
        case 'Function':
          return {
            name: 'value',
            value: this.config.key(node)
          };
        default:
          return {
            name: 'path',
            value: this.config.key
          };
      }
    };

    TemplateConfig.prototype.getValue = function(node, context) {
      switch (sysmo.type(this.config.value)) {
        case 'Function':
          return {
            name: 'value',
            value: this.config.value(node)
          };
        case 'String':
          return {
            name: 'path',
            value: this.config.value
          };
        default:
          return {
            name: 'template',
            value: this.config.as
          };
      }
    };

    TemplateConfig.prototype.processable = function(node, value, key) {
      var i, len, path, paths, ref;
      if (!this.config.choose && this.includeAll) {
        return true;
      }
      if (!this.config.choose && !this.paths) {
        this.paths = [];
        ref = this.config.as;
        for (key in ref) {
          value = ref[key];
          if (sysmo.isString(value)) {
            this.paths.push(value.split('.')[0]);
          }
        }
      }
      if (sysmo.isArray(this.config.choose)) {
        paths = this.paths || [];
        paths = paths.concat(this.config.choose);
        for (i = 0, len = paths.length; i < len; i++) {
          path = paths[i];
          if (path.split('.')[0] === key) {
            return true;
          }
        }
        return false;
      }
      if (!sysmo.isFunction(this.config.choose)) {
        return !!(this.includeAll || this.directMap);
      } else {
        return !!this.config.choose.call(this, node, value, key);
      }
    };

    TemplateConfig.prototype.aggregate = function(context, key, value, existing) {
      var aggregator, ref;
      aggregator = ((ref = this.config.aggregate) != null ? ref[key] : void 0) || this.config.aggregate;
      if (!sysmo.isFunction(aggregator)) {
        return false;
      }
      context[key] = aggregator(key, value, existing);
      return true;
    };

    TemplateConfig.prototype.applyFormatting = function(node, value, key) {
      var formatter, pair, ref;
      if (!sysmo.isNumber(key)) {
        formatter = ((ref = this.config.format) != null ? ref[key] : void 0) || this.config.format;
        pair = sysmo.isFunction(formatter) ? formatter(node, value, key) : {};
      } else {
        pair = {};
      }
      if (!Q.isPromise(pair)) {
        pair = Q(pair);
      }
      return pair.then(function(pairV) {
        if (!('key' in pairV)) {
          pairV.key = key;
        }
        if (!('value' in pairV)) {
          pairV.value = value;
        }
        if (!Q.isPromise(pairV.value)) {
          pairV.value = Q(pairV.value);
        }
        return pairV.value.then(function(value) {
          pairV.value = value;
          return pairV;
        });
      });
    };

    return TemplateConfig;

  })();

  if (typeof module !== "undefined" && module !== null) {
    module.exports = TemplateConfig;
  } else {
    window.json2json || (window.json2json = {});
    window.json2json.TemplateConfig = TemplateConfig;
  }

}).call(this);

(function() {
  var ObjectTemplate, TemplateConfig, sysmo,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  sysmo = (typeof require === "function" ? require('sysmo') : void 0) || (typeof window !== "undefined" && window !== null ? window.Sysmo : void 0);

  TemplateConfig = (typeof require === "function" ? require('./TemplateConfig') : void 0) || (typeof window !== "undefined" && window !== null ? window.json2json.TemplateConfig : void 0);

  ObjectTemplate = (function() {
    function ObjectTemplate(config, parent) {
      this.paths = bind(this.paths, this);
      this.pathAccessed = bind(this.pathAccessed, this);
      this.getNode = bind(this.getNode, this);
      this.nodeToProcess = bind(this.nodeToProcess, this);
      this.aggregateValue = bind(this.aggregateValue, this);
      this.updateContext = bind(this.updateContext, this);
      this.processRemaining = bind(this.processRemaining, this);
      this.processTemplate = bind(this.processTemplate, this);
      this.chooseValue = bind(this.chooseValue, this);
      this.chooseKey = bind(this.chooseKey, this);
      this.createMapStructure = bind(this.createMapStructure, this);
      this.processMap = bind(this.processMap, this);
      this.processArray = bind(this.processArray, this);
      this.transform = bind(this.transform, this);
      this.config = new TemplateConfig(config);
      this.parent = parent;
    }

    ObjectTemplate.prototype.transform = function(data) {
      var node;
      node = this.nodeToProcess(data);
      if (node == null) {
        return Q(null);
      }
      switch (sysmo.type(node)) {
        case 'Array':
          return this.processArray(node);
        case 'Object':
          return this.processMap(node);
        default:
          return Q(null);
      }
    };

    ObjectTemplate.prototype.processArray = function(node) {
      var context, e, i;
      context = this.config.arrayToMap ? {} : [];
      return ((function() {
        var j, len, results;
        results = [];
        for (i = j = 0, len = node.length; j < len; i = ++j) {
          e = node[i];
          results.push([e, i]);
        }
        return results;
      })()).reduce((function(_this) {
        return function(chain, ei) {
          var element, index;
          element = ei[0], index = ei[1];
          return chain.then(function() {
            var key;
            key = _this.config.arrayToMap ? _this.chooseKey(element) : index;
            return _this.createMapStructure(element).then(function(value) {
              return _this.updateContext(context, element, value, key);
            });
          });
        };
      })(this), Q(context));
    };

    ObjectTemplate.prototype.processMap = function(node) {
      return this.createMapStructure(node).then((function(_this) {
        return function(context) {
          var nested_context, nested_key;
          if (_this.config.nestTemplate && (nested_key = _this.chooseKey(node))) {
            nested_context = {};
            nested_context[nested_key] = context;
            context = nested_context;
          }
          return context;
        };
      })(this));
    };

    ObjectTemplate.prototype.createMapStructure = function(node) {
      var context, k, v;
      context = {};
      if (!this.config.nestTemplate) {
        return this.chooseValue(node, context);
      }
      return ((function() {
        var results;
        results = [];
        for (k in node) {
          v = node[k];
          results.push([k, v]);
        }
        return results;
      })()).reduce((function(_this) {
        return function(chain, kv) {
          var key, value;
          key = kv[0], value = kv[1];
          return chain.then(function() {
            var nested;
            if (!_this.config.processable(node, value, key)) {
              return context;
            }
            nested = _this.getNode(node, key);
            return _this.chooseValue(nested).then(function(value) {
              return _this.updateContext(context, nested, value, key);
            });
          });
        };
      })(this), Q(context));
    };

    ObjectTemplate.prototype.chooseKey = function(node) {
      var result;
      result = this.config.getKey(node);
      switch (result.name) {
        case 'value':
          return result.value;
        case 'path':
          return this.getNode(node, result.value);
        default:
          return null;
      }
    };

    ObjectTemplate.prototype.chooseValue = function(node, context) {
      var result;
      if (context == null) {
        context = {};
      }
      result = this.config.getValue(node);
      switch (result.name) {
        case 'value':
          return Q(result.value);
        case 'path':
          return Q(this.getNode(node, result.value));
        case 'template':
          return this.processTemplate(node, context, result.value);
        default:
          return Q(null);
      }
    };

    ObjectTemplate.prototype.processTemplate = function(node, context, template) {
      var chain, k, v;
      if (template == null) {
        template = {};
      }
      chain = ((function() {
        var results;
        results = [];
        for (k in template) {
          v = template[k];
          results.push([k, v]);
        }
        return results;
      })()).reduce((function(_this) {
        return function(chain, kv) {
          var key, value;
          key = kv[0], value = kv[1];
          return chain.then(function() {
            var filter;
            switch (sysmo.type(value)) {
              case 'String':
                filter = function(node, path) {
                  return _this.getNode(node, path);
                };
                break;
              case 'Array':
                filter = function(node, paths) {
                  var j, len, path, results;
                  results = [];
                  for (j = 0, len = paths.length; j < len; j++) {
                    path = paths[j];
                    results.push(_this.getNode(node, path));
                  }
                  return results;
                };
                break;
              case 'Function':
                filter = function(node, value) {
                  return value.call(_this, node, key);
                };
                break;
              case 'Object':
                filter = function(node, config) {
                  return new _this.constructor(config, _this).transform(node);
                };
                break;
              default:
                filter = function(node, value) {
                  return value;
                };
            }
            value = filter(node, value);
            return _this.updateContext(context, node, value, key);
          });
        };
      })(this), Q(context));
      return chain.then((function(_this) {
        return function() {
          return _this.processRemaining(context, node);
        };
      })(this));
    };

    ObjectTemplate.prototype.processRemaining = function(context, node) {
      var k, v;
      return ((function() {
        var results;
        results = [];
        for (k in node) {
          v = node[k];
          results.push([k, v]);
        }
        return results;
      })()).reduce((function(_this) {
        return function(chain, kv) {
          var key, value;
          key = kv[0], value = kv[1];
          return chain.then(function() {
            if (_this.pathAccessed(node, key) || indexOf.call(context, key) >= 0 || !_this.config.processable(node, value, key)) {
              return context;
            }
            return _this.updateContext(context, node, value, key);
          });
        };
      })(this), Q(context));
    };

    ObjectTemplate.prototype.updateContext = function(context, node, value, key) {
      return this.config.applyFormatting(node, value, key).then((function(_this) {
        return function(formatted) {
          return _this.aggregateValue(context, formatted.key, formatted.value);
        };
      })(this));
    };

    ObjectTemplate.prototype.aggregateValue = function(context, key, value) {
      var existing;
      if (value == null) {
        return context;
      }
      if (sysmo.isArray(context)) {
        context.push(value);
        return context;
      }
      existing = context[key];
      if (this.config.aggregate(context, key, value, existing)) {
        return context;
      }
      if (existing == null) {
        context[key] = value;
      } else if (!sysmo.isArray(existing)) {
        context[key] = [existing, value];
      } else {
        context[key].push(value);
      }
      return context;
    };

    ObjectTemplate.prototype.nodeToProcess = function(node) {
      return this.getNode(node, this.config.getPath());
    };

    ObjectTemplate.prototype.getNode = function(node, path) {
      if (!path) {
        return null;
      }
      if (path === '.') {
        return node;
      }
      this.paths(node, path);
      return sysmo.getDeepValue(node, path, true);
    };

    ObjectTemplate.prototype.pathAccessed = function(node, path) {
      var key;
      key = path.split('.')[0];
      return this.paths(node).indexOf(key) !== -1;
    };

    ObjectTemplate.prototype.paths = function(node, path) {
      var index, paths;
      if (path) {
        path = path.split('.')[0];
      }
      this.pathNodes || (this.pathNodes = this.parent && this.parent.pathNodes || []);
      this.pathCache || (this.pathCache = this.parent && this.parent.pathCache || []);
      index = this.pathNodes.indexOf(node);
      if (!path) {
        return (index !== -1 ? this.pathCache[index] : []);
      }
      if (index === -1) {
        paths = [];
        this.pathNodes.push(node);
        this.pathCache.push(paths);
      } else {
        paths = this.pathCache[index];
      }
      if (path && paths.indexOf(path) === -1) {
        paths.push(path);
      }
      return paths;
    };

    return ObjectTemplate;

  })();

  if (typeof module !== "undefined" && module !== null) {
    module.exports = ObjectTemplate;
  } else {
    window.json2json || (window.json2json = {});
    window.json2json.ObjectTemplate = ObjectTemplate;
  }

}).call(this);


(function(undefined) {
  
  var Sysmo = {
    stub: function(){},
    makeArray: function(args) {
      return Array.prototype.slice.call(args);
    },
    type: function(value) {
      return Object.prototype.toString.call(value).match(/(\S+)\]$/)[1];
    },
    isType: function(value, type) {
      return Sysmo.type(value) == type;
    },
    isArray: function(value) {
      return Sysmo.isType(value, "Array");
    },
    isArrayLike: function(value) {
      return !!value && (Sysmo.isArray(value) || value.hasOwnProperty('length') && Sysmo.makeArray(value).length);
    },
    isFunction: function(value) {
      return Sysmo.isType(value, "Function");
    },
    isPlainObject: function(value) {
      return Sysmo.isType(value, "Object") && value.constructor === Object;
    },
    isObject: function(value) {
      return !!value && !Sysmo.isArray(value) && typeof value == "object";
    },
    isNumber: function(value) {
      return Sysmo.isType(value, "Number");
    },
    isString: function(value) {
      return Sysmo.isType(value, "String");
    },
    isNumeric: function(value) {
      return Number(value) + "" === value + ""
    },
    isUndefined: function(value) {
      return value === void(0);
    },
    isNull: function(value) {
      return value === null;
    },
    extend: function(target, values, deep) {
      target = target || {};
      
      for (var property in values) {
        
        var value = values[property];
        
        if (!(property in target)) {
          
          target[property] = !deep ? value : 
                             (value == null || Sysmo.isObject(value)) ? Sysmo.extend({}, value) : 
                             (Sysmo.isArray(value)) ? value.slice(0) : value;
                             
        // compares objects that already exist in target if "deep" is true
        // copies properties or object if the target is NULL or an object
        } else if (deep && Sysmo.isObject(value) && 
                  (target[property] == null || Sysmo.isObject(target[property]))) {
          //don't need to set property because the object is updated by reference
          Sysmo.extend(target[property] || {}, value, deep);
        }
      }
      return target;
    },
    //include an object graph in another
    include: function(target, namespace, graph) {
      
      //if the first param is a string, 
      //we are including the namespace on Sysmo
      if (typeof target == 'string') {
        graph = namespace;
        namespace = target;
        target = Sysmo;
      }
      
      //create namespace on target
      Sysmo.namespace(namespace, target);
      //get inner most object in namespace
      target = Sysmo.getDeepValue(target, namespace);
      //merge graph on inner most object in namespace
      return Sysmo.extend(target, graph);
      
    },
    //build an object graph from a namespace.
    //adds properties to the target object or 
    //returns a new object graph.
    namespace: function(namespace, target) {
      
      target = target || {};
      
      var names = namespace.split('.'),
          context = target;
      
      for (var i = 0; i < names.length; i++) {
        var name = names[i];
        context = (name in context) ? context[name] : (context[name] = {});
      }
      
      return target;
    },
    //get the value of a property deeply nested in an object hierarchy
    getDeepValue: function (target, path, traverseArrays) {
      
      // if traversing arrays is enabled and this is an array, loop
      // may be a "array-like" node list (or similar), in which case it needs to be converted
      if (traverseArrays && Sysmo.isArrayLike(target)) {
        
        target = Sysmo.makeArray(target);
        
        var children = [];
        
        for (var i = 0; i < target.length; i++) {
          // recursively loop through children
          var child = Sysmo.getDeepValue(target[i], path, traverseArrays);
          
          // ignore if undefined
          if (typeof child != "undefined") {
            //flatten array because the original path points to one flat result set
            if (Sysmo.isArray(child)) {
              
              for (var j = 0; j < child.length; j++) {
                children.push(child[j]);
              }
              
            } else {
              
              children.push(child);
              
            }
          }
        }
        
        return (children.length) ? children : void(0);
      }
      
      var invoke_regex = /\(\)$/,
          properties = path.split('.'),
          property;

      if (target != null && properties.length) {
        
        var propertyName = properties.shift(),
            invoke = invoke_regex.test(propertyName)
        
        if (invoke) {
          propertyName = propertyName.replace(invoke_regex, "");
        }
        
        if (invoke && propertyName in target) {
          target = target[propertyName]();
        } else {
          target = target[propertyName];
        }
        
        path = properties.join('.');
        
        if (path) {
          target = Sysmo.getDeepValue(target, path, traverseArrays);
        }
      }
      
      return target;
    },
    //format a string using indexes, e.g. formatString("first name: {0}, last name: {1}", "Albert", "Einstein")
    formatString: function(template, args) {
      args = (args.constructor !== Array) ? Sysmo.makeArray(arguments).splice(1) : args;
      
      return template.replace(/\{(\d+)\}/g, function(match, capture) { 
        return args[capture];
      });
    },
    //Allows you to chain multiple callbacks together. 
    //The first parameter for each callback is the "next" function 
    //that allows you to pass arguments to the next function.
    //Pass each function that should be a part of the chain 
    //as a parameter to chain() function.
    //NOTE* You can pass an object as the first parameter before a callback 
    //      to use as "this" context when the callback is called
    steps: function(self) {
      var steps = Sysmo.makeArray(arguments),
          next = function() {
            var args = Sysmo.makeArray(arguments),
                step = steps.shift();
      
            args.unshift(next);
            step.apply(self, args);
          };
      
      //an argument that is not a function is assumed to be the "this" context
      if (!/^function/i.test(self)) {
        steps.shift();
      } else {
        self = this;//next;
      }
      
      steps.length && next();
    },
    /*
     ****** Overview ******
     * 
     * Strongly type a function's arguments to allow for any arguments to be optional.
     * 
     * Other resources:
     * http://ejohn.org/blog/javascript-method-overloading/
     * 
     ****** Example implementation ******
     * 
     * //all args are optional... will display overlay with default settings
     * var displayOverlay = function() {
     *   return Sysmo.optionalArgs(arguments, 
     *            String, [Number, false, 0], Function, 
     *            function(message, timeout, callback) {
     *              var overlay = new Overlay(message);
     *              overlay.timeout = timeout;
     *              overlay.display({onDisplayed: callback});
     *            });
     * }
     * 
     ****** Example function call ******
     * 
     * //the window.alert() function is the callback, message and timeout are not defined.
     * displayOverlay(alert);
     * 
     * //displays the overlay after 500 miliseconds, then alerts... message is not defined.
     * displayOverlay(500, alert);
     * 
     ****** Setup ******
     * 
     * arguments = the original arguments to the function defined in your javascript API.
     * config = describe the argument type
     *  - Class - specify the type (e.g. String, Number, Function, Array) 
     *  - [Class/function, boolean, default] - pass an array where the first value is a class or a function...
     *                                         The "boolean" indicates if the first value should be treated as a function.
     *                                         The "default" is an optional default value to use instead of undefined.
     * 
     */
    arrangeArgs: function (/* arguments, config1 [, config2] , callback */) {
      //config format: [String, false, ''], [Number, false, 0], [Function, false, function(){}]
      //config doesn't need a default value.
      //config can also be classes instead of an array if not required and no default value.
      
      var configs = Sysmo.makeArray(arguments),
          //original arguments that we need to verify
          values = Sysmo.makeArray(configs.shift()),
          //the function that will receive the verified arguments
          callback = configs.pop(),
          //the verified argumetns to pass to the callback
          args = [],
          //send the verified arguments to the callback
          done = function() {
            //add the proper number of arguments before adding remaining values
            if (!args.length) {
              args = Array(configs.length);
            }
            //fire callback with args and remaining values concatenated
            return callback.apply(null, args.concat(values));
          };
          
      //if there are not values to process, just fire callback
      if (!values.length) {
        return done();
      }
      
      //loop through configs to create more easily readable objects
      for (var i = 0; i < configs.length; i++) {
        
        var config = configs[i];

        //make sure there's a value
        if (values.length) {
          
          //type or validator function
          var fn = config[0] || config,
              //if config[1] is true, use fn as validator, 
              //otherwise create a validator from a closure to preserve fn for later use
              validate = (config[1]) ? fn : function(value) {
                return value.constructor === fn;
              };
          
          //see if arg value matches config
          if (validate(values[0])) {
            args.push(values.shift());
            continue;
          }
        }
        
        //add a default value if there is no value in the original args
        //or if the type didn't match
        args.push(config[2]);
      }
      
      return done();
    }

  };
  
  // Support CommonJS/Node.js
  if (typeof module !== "undefined" && module !== null) {
    module.exports = Sysmo;
  } else {
    window.Sysmo = Sysmo;
  }
  
})();
