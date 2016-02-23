var manifest = {
  url: chrome.extension.getURL("./")
};

var background = {
  send: function (id, data) {
    chrome.runtime.sendMessage({path: 'popup-to-background', method: id, data: data});
  },
  receive: function (id, callback) {
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
      if (request.path == 'background-to-popup') {
        if (request.method == id) {
          callback(request.data);
        }
      }
    });
  }
};

background.receive("load", function (url) {
  document.getElementById("popup-iframe").src = url;
});

background.receive("resize", function (o) {
  if (document.location.href.indexOf("panel.html") !== -1) {
    document.body.style.width = o.width + "px";
    document.body.style.height = (o.height - 20) + "px";
    document.querySelector("html").style.height = (o.height - 20) + "px";
  }
});

background.send("resize");