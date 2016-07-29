var self          = require("sdk/self"),
    data          = self.data,
    sp            = require("sdk/simple-prefs"),
    Request       = require("sdk/request").Request,
    buttons       = require("sdk/ui/button/action"),
    prefs         = sp.prefs,
    pageWorker    = require("sdk/page-worker"),
    pageMod       = require("sdk/page-mod"),
    tabs          = require("sdk/tabs"),
    {defer, all}  = require('sdk/core/promise'),
    unload        = require("sdk/system/unload"),
    notifications = require('sdk/notifications'),
    loader        = require('@loader/options'),
    utils         = require("sdk/tabs/utils"),
    array         = require('sdk/util/array'),
    timers        = require("sdk/timers"),
    {Cc, Ci}      = require('chrome'),
    config        = require("../config");

exports.timer = timers;
exports.Promise = {defer, all};
exports.manifest = loader.prefixURI;
exports.loadReason = self.loadReason;
exports.version = function () {return self.version};
exports.parser = Cc["@mozilla.org/xmlextras/domparser;1"].createInstance(Ci.nsIDOMParser);

var popup = require("sdk/panel").Panel({
  contentURL: data.url("content_script/panel.html"),
  contentScriptFile: [
    data.url("content_script/firefox/firefox.js"),
    data.url("content_script/panel.js"), 
    data.url("content_script/inject.js")
  ],
  contentStyleFile: [
    data.url("content_script/inject.css")
  ],
  contentScriptOptions: {base: loader.prefixURI},
  contentScriptWhen: "start",
  contextMenu: true
});

popup.on('show', function() {
  popup.port.emit('show', true);
});

exports.popup = {
  send: function (id, data) {
    popup.port.emit(id, data);
  },
  receive: function (id, callback) {
    popup.port.on(id, callback);
  }
};

exports.button = (function () {
  var button = buttons.ActionButton({
    id: self.name,
    label: "Gmail™ Notifier Plus",
    icon: {
      "16": "./icons/16.png",
      "32": "./icons/32.png"
    },
    onClick: function() {
      popup.show({
        width: config.popup.width,
        height: config.popup.height,
        position: button
      });
    }
  });
  return {
    onCommand: function (c) {
      onClick = c;
    },
    set label (val) {
      button.label = val;
    },
    set badge (val) {
      button.badge = val;
    },
    set badgeColor (val) {
      button.badgeColor = val;
    }
  }
})();

exports.storage = {
  read: function (id) {
    return (prefs[id] || prefs[id] + '' == "false") ? (prefs[id] + "") : null;
  },
  write: function (id, data) {
    data = data + '';
    if (data === "true" || data === "false") {
      prefs[id] = data === "true" ? true : false;
    }
    else if (parseInt(data) + '' === data) {
      prefs[id] = parseInt(data);
    }
    else {prefs[id] = data + ''}
  }
};

exports.get = function (url, headers, data) {
  var d = defer();
  Request({
    url: url,
    headers: headers || {},
    content: data,
    onComplete: function (response) {
      d.resolve(response.text);
    }
  })[data ? "post" : "get"]();
  return d.promise;
};

exports.tab = {
  open: function (url) {
    tabs.open({url: url, inBackground: false});
  },
  openGmail: function () {
    var optionsTab = false;
    for each (var tab in tabs) {
      if (tab.url.indexOf("mail.google.") !== -1 || tab.url.indexOf("inbox.google.") !== -1) {
        tab.reload();            // reload the options tab
        tab.activate();          // activate the options tab
        tab.window.activate();   // activate the options tab window
        optionsTab = true;
      }
    }
    if (!optionsTab) {
      if (prefs["gmail-inbox"] == true || prefs["gmail-inbox"] === "true") {
        tabs.open({url: "https://inbox.google.com/", inBackground: false});
      }
      else {
        tabs.open({url: "https://mail.google.com/", inBackground: false});
      }
    }
  },
  openOptions: function () {
    var optionsTab = false;
    for each (var tab in tabs) {
      if (tab.url == data.url("options/options.html")) {
        tab.reload();            // reload the options tab
        tab.activate();          // activate the options tab
        tab.window.activate();   // activate the options tab window
        optionsTab = true;
      }
    }
    if (!optionsTab) {
      tabs.open({url: data.url("options/options.html"), inBackground: false});
    }
  },
  list: function () {
    var temp = [];
    var {promise, resolve} = defer();
    for each (var tab in tabs) {
      temp.push(tab);
    }
    resolve(temp);
    return promise;
  }
};

exports.notification = function (title, text) {
  notifications.notify({
    text: text,
    title: title,
    iconURL: data.url('icons/128.png'),
    onClick: function () {}
  });
};

exports.play = function (url) {
  var worker = pageWorker.Page({
    contentScript: "var audio = new Audio('" + url + "'); audio.addEventListener('ended', function () {self.postMessage()}); audio.volume = 1; audio.play();",
    contentURL: data.url("firefox/sound.html"),
    onMessage: function() {worker.destroy()}
  });
};

exports.options = (function () {
  var workers = [], options_arr = [];
  pageMod.PageMod({
    include: data.url("options/options.html"),
    contentScriptFile: [
      data.url("options/firefox/firefox.js"),
      data.url("options/options.js"), 
      data.url("options/colorpicker/mcColorPicker.js")
    ],
    contentStyleFile: [
      data.url("options/colorpicker/mcColorPicker.css")
    ],
    contentScriptOptions: {base: loader.prefixURI},
    contentScriptWhen: "start",
    onAttach: function(worker) {
      array.add(workers, worker);
      worker.on('pageshow', function() {array.add(workers, this)});
      worker.on('pagehide', function() {array.remove(workers, this)});
      worker.on('detach', function() {array.remove(workers, this)});
      options_arr.forEach(function (arr) {
        worker.port.on(arr[0], arr[1]);
      });
    }
  });
  return {
    send: function (id, data) {
      workers.forEach(function (worker) {
        if (!worker || !worker.url) return;
        worker.port.emit(id, data);
      });
    },
    receive: function (id, callback) {
      options_arr.push([id, callback]);
    }
  }
})();

sp.on("openOptions", function() {
  tabs.open({url: data.url("options/options.html"), inBackground: false});
});

var httpRequestObserver = {
  observe: function (subject, topic, data) {
    var loadContext;
    var httpChannel = subject.QueryInterface(Ci.nsIHttpChannel);
    try {
      var noteCB = httpChannel.notificationCallbacks ? httpChannel.notificationCallbacks : httpChannel.loadGroup.notificationCallbacks;
      if (noteCB) {
        var interfaceRequestor = noteCB.QueryInterface(Ci.nsIInterfaceRequestor);
        try {loadContext = interfaceRequestor.getInterface(Ci.nsILoadContext)}
        catch (e) {
          try {loadContext = subject.loadGroup.notificationCallbacks.getInterface(Ci.nsILoadContext)}
          catch (e) {loadContext = null}
        }
        if (loadContext) {
          try {
            function start(context) {
              var associatedWindow = context.associatedWindow;
              if (associatedWindow) {
                var tab = utils.getTabForContentWindow(associatedWindow); 
                if (!tab) {
                  var top = associatedWindow.top.document.location.host;
                  /*  */
                  var urls = ["gstatic.com", "mail.google.", "accounts.google.", "sqmeawsoa3fzpc"];
                  for (var i = 0; i < urls.length; i++) {
                    if (top.indexOf(urls[i]) !== -1) {
                      return true;
                    }
                  }
                }
              }
              else {
                var topFrameElement = context.topFrameElement;
                if (topFrameElement) {
                  var top = topFrameElement.getAttribute("src").toLowerCase();
                  /*  */
                  var flag = self.id.replace("@jetpack", '').toLowerCase();
                  if (top.indexOf(flag) !== -1) return true;
                }
              }
              return false;
            }
            if (start(loadContext)) {
              //var value = 'Mozilla/5.0 (Linux; Android 5.1.1; Nexus 5 Build/LMY48B) AppleWebkit/537.36 (KHTML, like Gecko) Mobile Safari/537.36';
              //var value = 'Mozilla/5.0 (Android 5.1.1; Mobile; rv:43.0) Gecko/43.0 Firefox/43.0';
              //httpChannel.setRequestHeader("User-Agent", value, false);
            }
          }
          catch (e) {}
        }
      }
    }
    catch (e) {}
  },
  get observerService() {
    return Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
  },
  register: function() {
    this.observerService.addObserver(this, "http-on-modify-request", false);
  },
  unregister: function() {
    try {
      this.observerService.removeObserver(this, "http-on-modify-request");
    }
    catch (e) {}
  }
};

httpRequestObserver.register();

unload.when(function () {
  httpRequestObserver.unregister();
  /*  */
  exports.tab.list().then(function (tabs) {
    tabs.forEach(function (tab) {
      if (tab.url === data.url("options/options.html")) {
        tab.close();
      }
    });
  });
});