var app = {};

app.timer = window;
app.loadReason = '';
app.Promise = Promise;
app.parser = new window.DOMParser();
app.manifest = chrome.extension.getURL('');

app.storage = (function () {
  var objs = {};
  chrome.storage.local.get(null, function (o) {
    objs = o;
    document.getElementById("common").src = "../common.js";
  });
  return {
    read : function (id) {
      return objs[id];
    },
    write : function (id, data) {
      data = data + '';
      objs[id] = data;
      var tmp = {};
      tmp[id] = data;
      chrome.storage.local.set(tmp, function () {});
    }
  }
})();

chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason === "install") {
    app.loadReason = "install";
  }
});

chrome.runtime.onStartup.addListener(function() {
  app.loadReason = "startup";
});

app.version = function () {
  return chrome[chrome.runtime && chrome.runtime.getManifest ? "runtime" : "extension"].getManifest().version;
}

app.get = function (url, headers, data) {
  var xhr = new XMLHttpRequest();
  var d = app.Promise.defer();
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4) {
      if (xhr.status >= 400 && xhr.status != 500) {
        var e = new Error(xhr.statusText);
        e.status = xhr.status;
        d.reject(e);
      }
      else d.resolve(xhr.responseText);
    }
  };
  xhr.open(data ? "POST" : "GET", url, true);
  for (var id in headers) {
    xhr.setRequestHeader(id, headers[id]);
  }
  if (data) {
    var arr = [];
    for(e in data) {
      arr.push(e + "=" + data[e]);
    }
    data = arr.join("&");
  }
  xhr.send(data ? data : '');
  return d.promise;
};

app.popup = {
  send: function (id, data) {
    chrome.runtime.sendMessage({path: 'background-to-popup', method: id, data: data});
  },
  receive: function (id, callback) {
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
      if (request.path == 'popup-to-background') {
        if (request.method == id) {
          callback(request.data);
        }
      }
    });
  }
};

app.options = {
  send: function (id, data) {
    chrome.tabs.query({}, function (tabs) {
      tabs.forEach(function (tab) {
        if (tab.url.indexOf("data/options/options.html") !== -1) {
          chrome.tabs.sendMessage(tab.id, {path: 'background-to-options', method: id, data: data}, function () {});
        }
      });
    });
  },
  receive: function (id, callback) {
    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
      if (request.path == 'options-to-background') {
        if (request.method === id) {
          callback(request.data);
        }
      }
    });
  }
};

app.tab = {
  open: function (url) {
    chrome.tabs.create({url: url, active: true});
  },
  openGmail: function () {
    var optionsTab = false;
    chrome.tabs.query({}, function (tabs) {
      for (var i = 0; i < tabs.length; i++) {
        var tab = tabs[i];
        if (tab.url.indexOf("mail.google.com/") != -1 || tab.url.indexOf("inbox.google.com/") != -1) {
          chrome.tabs.reload(tab.id, function () {});
          chrome.tabs.update(tab.id, {active: true}, function () {});
          optionsTab = true;
          break;
        }
      }
      if (!optionsTab) {
        if (app.storage.read("gmail-inbox") == true || app.storage.read("gmail-inbox") === "true") {
          chrome.tabs.create({url: "https://inbox.google.com/"});
        }
        else {
          chrome.tabs.create({url: "https://mail.google.com/"});
        }
      }
    });
  },
  openOptions: function () {
    var optionsTab = false;
    chrome.tabs.query({}, function (tabs) {
      for (var i = 0; i < tabs.length; i++) {
        var tab = tabs[i];
        if (tab.url.indexOf("data/options/options.html") != -1) {
          chrome.tabs.reload(tab.id, function () {});
          chrome.tabs.update(tab.id, {active: true}, function () {});
          optionsTab = true;
          break;
        }
      }
      if (!optionsTab) chrome.tabs.create({url: "./data/options/options.html"});
    });
  },
  list: function () {
    var d = Promise.defer();
    chrome.tabs.query({currentWindow: false}, function (tabs) {d.resolve(tabs)});
    return d.promise;
  }
};

app.notification = function (title, text) {
  var notification = chrome.notifications.create('', {
    type: "basic",
    title: title,
    message: text,
    iconUrl: chrome.extension.getURL("./") + 'data/icons/128.png'
  }, function (e) {});
  chrome.notifications.onClicked.addListener(function (e) {
    tab.open("chrome://flags/");
  });
};

app.play = (function () {
  var audio = new Audio();
  var canPlay = audio.canPlayType("audio/mpeg");
  if (!canPlay) {
    audio = document.createElement("iframe");
    document.body.appendChild(audio);
  }
  return function (url) {
    if (canPlay) {
      audio.setAttribute("src", url);
      audio.play();
    }
    else {
      audio.removeAttribute('src');
      audio.setAttribute('src', url);
    }
  }
})();

app.button = (function () {
  var callback;
  chrome.browserAction.onClicked.addListener(function(tab) {
    if (callback) {
      callback();
    }
  });
  return {
    onCommand: function (c) {
      callback = c;
    },
    onContext: function () {},
    set label (val) {
      chrome.browserAction.setTitle({
        title: val
      })
    },
    set badge (val) {
      chrome.browserAction.setBadgeText({
        text: (val ? val : "") + ""
      });
    },
    set badgeColor (val) {
      chrome.browserAction.setBadgeBackgroundColor({
        color: (val ? val : "#FF0000")
      });
    },
    set badgeFont (val) {}
  }
})();

var urls = [
  "*://*.gstatic.com/*", "*://gstatic.com/*",
  "*://*.apis.google.com/*", "*://apis.google.com/*",
  "*://*.mail.google.com/*", "*://mail.google.com/*",
  "*://*.accounts.google.com/*", "*://accounts.google.com/*"
];

chrome.webRequest.onBeforeSendHeaders.addListener(
  function(info) {
    var headers = info.requestHeaders;
    if (info.tabId > -1) return;
    for (var i = 0; i < headers.length; i++) {
      if (headers[i].name.toLowerCase() == 'user-agent') {
        headers[i].value = 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_2 like Mac OS X) AppleWebKit/601.1 (KHTML, like Gecko) CriOS/47.0.2526.70 Mobile/13C71 Safari/601.1.46';
      }
    };
    return {requestHeaders: headers};
  },
  {urls: urls}, ["blocking", "requestHeaders"]
);

chrome.webRequest.onHeadersReceived.addListener(
  function (details) {
    for (var i = 0; i < details.responseHeaders.length; ++i) {
      if (details.responseHeaders[i].name.toLowerCase() == 'x-frame-options' || details.responseHeaders[i].name.toLowerCase() == 'frame-options') {
        details.responseHeaders.splice(i, 1);
        return {responseHeaders: details.responseHeaders}
      }
    }
  },
  {urls: urls}, ["blocking", "responseHeaders"]
);