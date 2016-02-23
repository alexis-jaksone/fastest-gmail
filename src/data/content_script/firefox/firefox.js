var manifest = {
  url: self.options.base
};

var background = {
  send: function (id, data) {
    self.port.emit(id, data);
  },
  receive: function (id, callback) {
    self.port.on(id, callback);
  }
};

background.receive("load", function (url) {
  try {
    var loc = document.location.href;
    if (loc.indexOf("/data/content_script/panel.html") !== -1) {
      document.location.href = url;
    }
  }
  catch (e) {}
});

background.receive("show", function () {
  background.send("load");
});