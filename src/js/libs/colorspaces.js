// Generated by CoffeeScript 1.7.1
(function() {
  var conv, converter, dot_product, f, f_inv, lab_e, lab_k, polar_to_scalar, ref_U, ref_V, ref_X, ref_Y, ref_Z, root, round, sRGB_prepare, scalar_to_polar, stylus, within_range;

  dot_product = function(a, b) {
    var i, ret, _i, _ref;
    ret = 0;
    for (i = _i = 0, _ref = a.length - 1; 0 <= _ref ? _i <= _ref : _i >= _ref; i = 0 <= _ref ? ++_i : --_i) {
      ret += a[i] * b[i];
    }
    return ret;
  };

  round = function(num, places) {
    var m;
    m = Math.pow(10, places);
    return Math.round(num * m) / m;
  };

  within_range = function(vector, ranges) {
    var i, n, _i, _ref;
    vector = (function() {
      var _i, _len, _results;
      _results = [];
      for (_i = 0, _len = vector.length; _i < _len; _i++) {
        n = vector[_i];
        _results.push(round(n, 3));
      }
      return _results;
    })();
    for (i = _i = 0, _ref = vector.length - 1; 0 <= _ref ? _i <= _ref : _i >= _ref; i = 0 <= _ref ? ++_i : --_i) {
      if (vector[i] < ranges[i][0] || vector[i] > ranges[i][1]) {
        return false;
      }
    }
    return true;
  };

  ref_X = 0.95047;

  ref_Y = 1.00000;

  ref_Z = 1.08883;

  ref_U = (4 * ref_X) / (ref_X + (15 * ref_Y) + (3 * ref_Z));

  ref_V = (9 * ref_Y) / (ref_X + (15 * ref_Y) + (3 * ref_Z));

  lab_e = 0.008856;

  lab_k = 903.3;

  f = function(t) {
    if (t > lab_e) {
      return Math.pow(t, 1 / 3);
    } else {
      return 7.787 * t + 16 / 116;
    }
  };

  f_inv = function(t) {
    if (Math.pow(t, 3) > lab_e) {
      return Math.pow(t, 3);
    } else {
      return (116 * t - 16) / lab_k;
    }
  };

  conv = {
    'CIEXYZ': {},
    'CIExyY': {},
    'CIELAB': {},
    'CIELCH': {},
    'CIELUV': {},
    'CIELCHuv': {},
    'sRGB': {},
    'hex': {}
  };

  conv['CIEXYZ']['sRGB'] = function(tuple) {
    var from_linear, m, _B, _G, _R;
    m = [[3.2406, -1.5372, -0.4986], [-0.9689, 1.8758, 0.0415], [0.0557, -0.2040, 1.0570]];
    from_linear = function(c) {
      var a;
      a = 0.055;
      if (c <= 0.0031308) {
        return 12.92 * c;
      } else {
        return 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
      }
    };
    _R = from_linear(dot_product(m[0], tuple));
    _G = from_linear(dot_product(m[1], tuple));
    _B = from_linear(dot_product(m[2], tuple));
    return [_R, _G, _B];
  };

  conv['sRGB']['CIEXYZ'] = function(tuple) {
    var m, rgbl, to_linear, _B, _G, _R, _X, _Y, _Z;
    _R = tuple[0], _G = tuple[1], _B = tuple[2];
    to_linear = function(c) {
      var a;
      a = 0.055;
      if (c > 0.04045) {
        return Math.pow((c + a) / (1 + a), 2.4);
      } else {
        return c / 12.92;
      }
    };
    m = [[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]];
    rgbl = [to_linear(_R), to_linear(_G), to_linear(_B)];
    _X = dot_product(m[0], rgbl);
    _Y = dot_product(m[1], rgbl);
    _Z = dot_product(m[2], rgbl);
    return [_X, _Y, _Z];
  };

  conv['CIEXYZ']['CIExyY'] = function(tuple) {
    var sum, _X, _Y, _Z;
    _X = tuple[0], _Y = tuple[1], _Z = tuple[2];
    sum = _X + _Y + _Z;
    if (sum === 0) {
      return [0, 0, _Y];
    }
    return [_X / sum, _Y / sum, _Y];
  };

  conv['CIExyY']['CIEXYZ'] = function(tuple) {
    var _X, _Y, _Z, _x, _y;
    _x = tuple[0], _y = tuple[1], _Y = tuple[2];
    if (_y === 0) {
      return [0, 0, 0];
    }
    _X = _x * _Y / _y;
    _Z = (1 - _x - _y) * _Y / _y;
    return [_X, _Y, _Z];
  };

  conv['CIEXYZ']['CIELAB'] = function(tuple) {
    var fx, fy, fz, _L, _X, _Y, _Z, _a, _b;
    _X = tuple[0], _Y = tuple[1], _Z = tuple[2];
    fx = f(_X / ref_X);
    fy = f(_Y / ref_Y);
    fz = f(_Z / ref_Z);
    _L = 116 * fy - 16;
    _a = 500 * (fx - fy);
    _b = 200 * (fy - fz);
    return [_L, _a, _b];
  };

  conv['CIELAB']['CIEXYZ'] = function(tuple) {
    var var_x, var_y, var_z, _L, _X, _Y, _Z, _a, _b;
    _L = tuple[0], _a = tuple[1], _b = tuple[2];
    var_y = (_L + 16) / 116;
    var_z = var_y - _b / 200;
    var_x = _a / 500 + var_y;
    _X = ref_X * f_inv(var_x);
    _Y = ref_Y * f_inv(var_y);
    _Z = ref_Z * f_inv(var_z);
    return [_X, _Y, _Z];
  };

  conv['CIEXYZ']['CIELUV'] = function(tuple) {
    var var_U, var_V, _L, _U, _V, _X, _Y, _Z;
    _X = tuple[0], _Y = tuple[1], _Z = tuple[2];
    var_U = (4 * _X) / (_X + (15 * _Y) + (3 * _Z));
    var_V = (9 * _Y) / (_X + (15 * _Y) + (3 * _Z));
    _L = 116 * f(_Y / ref_Y) - 16;
    if (_L === 0) {
      return [0, 0, 0];
    }
    _U = 13 * _L * (var_U - ref_U);
    _V = 13 * _L * (var_V - ref_V);
    return [_L, _U, _V];
  };

  conv['CIELUV']['CIEXYZ'] = function(tuple) {
    var var_U, var_V, var_Y, _L, _U, _V, _X, _Y, _Z;
    _L = tuple[0], _U = tuple[1], _V = tuple[2];
    if (_L === 0) {
      return [0, 0, 0];
    }
    var_Y = f_inv((_L + 16) / 116);
    var_U = _U / (13 * _L) + ref_U;
    var_V = _V / (13 * _L) + ref_V;
    _Y = var_Y * ref_Y;
    _X = 0 - (9 * _Y * var_U) / ((var_U - 4) * var_V - var_U * var_V);
    _Z = (9 * _Y - (15 * var_V * _Y) - (var_V * _X)) / (3 * var_V);
    return [_X, _Y, _Z];
  };

  scalar_to_polar = function(tuple) {
    var var1, var2, _C, _L, _h, _h_rad;
    _L = tuple[0], var1 = tuple[1], var2 = tuple[2];
    _C = Math.pow(Math.pow(var1, 2) + Math.pow(var2, 2), 1 / 2);
    _h_rad = Math.atan2(var2, var1);
    _h = _h_rad * 360 / 2 / Math.PI;
    if (_h < 0) {
      _h = 360 + _h;
    }
    return [_L, _C, _h];
  };

  conv['CIELAB']['CIELCH'] = scalar_to_polar;

  conv['CIELUV']['CIELCHuv'] = scalar_to_polar;

  polar_to_scalar = function(tuple) {
    var var1, var2, _C, _L, _h, _h_rad;
    _L = tuple[0], _C = tuple[1], _h = tuple[2];
    _h_rad = _h / 360 * 2 * Math.PI;
    var1 = Math.cos(_h_rad) * _C;
    var2 = Math.sin(_h_rad) * _C;
    return [_L, var1, var2];
  };

  conv['CIELCH']['CIELAB'] = polar_to_scalar;

  conv['CIELCHuv']['CIELUV'] = polar_to_scalar;

  sRGB_prepare = function(tuple) {
    var ch, n, _i, _j, _len, _len1, _results;
    tuple = (function() {
      var _i, _len, _results;
      _results = [];
      for (_i = 0, _len = tuple.length; _i < _len; _i++) {
        n = tuple[_i];
        _results.push(round(n, 3));
      }
      return _results;
    })();
    for (_i = 0, _len = tuple.length; _i < _len; _i++) {
      ch = tuple[_i];
      if (ch < 0 || ch > 1) {
        throw new Error("Illegal sRGB value");
      }
    }
    _results = [];
    for (_j = 0, _len1 = tuple.length; _j < _len1; _j++) {
      ch = tuple[_j];
      _results.push(Math.round(ch * 255));
    }
    return _results;
  };

  conv['sRGB']['hex'] = function(tuple) {
    var ch, hex, _i, _len;
    hex = "#";
    tuple = sRGB_prepare(tuple);
    for (_i = 0, _len = tuple.length; _i < _len; _i++) {
      ch = tuple[_i];
      ch = ch.toString(16);
      if (ch.length === 1) {
        ch = "0" + ch;
      }
      hex += ch;
    }
    return hex;
  };

  conv['hex']['sRGB'] = function(hex) {
    var b, g, r;
    if (hex.charAt(0) === "#") {
      hex = hex.substring(1, 7);
    }
    r = hex.substring(0, 2);
    g = hex.substring(2, 4);
    b = hex.substring(4, 6);
    return [r, g, b].map(function(n) {
      return parseInt(n, 16) / 255;
    });
  };

  converter = function(from, to) {
    var func, path, tree;
    tree = [['CIELCH', 'CIELAB'], ['CIELCHuv', 'CIELUV'], ['hex', 'sRGB'], ['CIExyY', 'CIEXYZ'], ['CIELAB', 'CIEXYZ'], ['CIELUV', 'CIEXYZ'], ['sRGB', 'CIEXYZ']];
    path = function(tree, from, to) {
      var child, p, parent, _ref;
      if (from === to) {
        return function(t) {
          return t;
        };
      }
      _ref = tree[0], child = _ref[0], parent = _ref[1];
      if (from === child) {
        p = path(tree.slice(1), parent, to);
        return function(t) {
          return p(conv[child][parent](t));
        };
      }
      if (to === child) {
        p = path(tree.slice(1), from, parent);
        return function(t) {
          return conv[parent][child](p(t));
        };
      }
      p = path(tree.slice(1), from, to);
      return p;
    };
    func = path(tree, from, to);
    return func;
  };

  root = {};

  try {
    stylus = require('stylus');
    root = function() {
      var space, spaces;
      spaces = (function() {
        var _results;
        _results = [];
        for (space in conv) {
          if (space !== 'sRGB' && space !== 'hex') {
            _results.push(space);
          }
        }
        return _results;
      })();
      return function(style) {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = spaces.length; _i < _len; _i++) {
          space = spaces[_i];
          _results.push(style.define(space, (function(space) {
            return function(a, b, c) {
              var foo, g, r, _ref;
              foo = converter(space, 'sRGB');
              _ref = sRGB_prepare(foo([a.val, b.val, c.val])), r = _ref[0], g = _ref[1], b = _ref[2];
              return new stylus.nodes.RGBA(r, g, b, 1);
            };
          })(space)));
        }
        return _results;
      };
    };
  } catch (_error) {}

  root.converter = converter;

  root.make_color = function(space1, tuple) {
    return {
      as: function(space2) {
        var val;
        val = converter(space1, space2)(tuple);
        return val;
      },
      is_displayable: function() {
        var val;
        val = converter(space1, 'sRGB')(tuple);
        return within_range(val, [[0, 1], [0, 1], [0, 1]]);
      },
      is_visible: function() {
        var val;
        val = converter(space1, 'CIEXYZ')(tuple);
        return within_range(val, [[0, ref_X], [0, ref_Y], [0, ref_Z]]);
      }
    };
  };

  if (typeof module !== "undefined" && module !== null) {
    module.exports = root;
  }

  if (typeof jQuery !== "undefined" && jQuery !== null) {
    jQuery.colorspaces = root;
  }

}).call(this);