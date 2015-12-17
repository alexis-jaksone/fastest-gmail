var config = {};

/**** wrapper (start) ****/
if (typeof require !== 'undefined') {
  var app = require('./firefox/firefox');
  config = exports;
}
/**** wrapper (end) ****/

config.welcome = {
  get version () {
    return app.storage.read("version");
  },
  set version (val) {
    app.storage.write("version", val);
  },
  get page () {
    return app.storage.read('welcome') === "false" ? false : true;
  },
  set page (val) {
    app.storage.write('welcome', val);
  },
  timeout: 3000
}

config.interval = {
  get time () {
    return +app.storage.read("interval") || 60;
  },
  set time (val) {
    val = +val;
    if (val < 15) val = 15;
    app.storage.write("interval", val);
  }
}

config.badge = {
  get color () {
    return app.storage.read("badge-color") || "#FF0000";
  },
  set color (val) {
    app.storage.write("badge-color", val);
  }
}

config.popup = {
  get width () {
    return +app.storage.read('width') || 500;
  },
  set width (val) {
    val = +val;
    if (val < 330) val = 330;
    app.storage.write('width', val);
  },
  get height () {
    return +app.storage.read('height') || 480;
  },
  set height (val) {
    val = +val;
    if (val < 400) val = 400;
    app.storage.write('height', val);
  }
}

config.gmail = {
  get label () {
    return app.storage.read("gmail-label") || "";
  },
  set label (val) {
    val = val.trim().split(/\s*\,\s*/).map(function (key) {
      return key.toLowerCase().replace(/\s+/g, '-');
    }).join(', ');
    app.storage.write("gmail-label", val);
  },
  get url () {
    return app.storage.read("gmail-url") || "https://mail.google.com/";
  },
  set url (val) {
    app.storage.write("gmail-url", val);
  },
  get beep () {
    return app.storage.read("gmail-beep") === "true" ? true : false;
  },
  set beep (val) {
    app.storage.write("gmail-beep", val);
  },
  get notification () {
    return app.storage.read("gmail-notification") === "false" ? false : true;
  },
  set notification (val) {
    app.storage.write("gmail-notification", val);
  },
  get desktopCount () {
    return +app.storage.read("gmail-desktop-count") || 3;
  },
  set desktopCount (val) {
    val = +val;
    if (val < 1) val = 1;
    app.storage.write("gmail-desktop-count", val);
  },
  get inbox () {
    return app.storage.read("gmail-inbox") === "true" ? true : false;
  },
  set inbox (val) {
    app.storage.write("gmail-inbox", val);
  },
}

config.get = function (name) {
  return name.split(".").reduce(function(p, c) {
    return p[c]
  }, config);
}

config.set = function (name, value) {
  function set(name, value, scope) {
    name = name.split(".");
    if (name.length > 1) {
      set.call((scope || this)[name.shift()], name.join("."), value)
    }
    else {
      this[name[0]] = value;
    }
  }
  set(name, value, config);
}