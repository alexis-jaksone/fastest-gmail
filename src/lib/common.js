/**** wrapper (start) ****/
if (typeof require !== 'undefined') {
  var app = require('./firefox/firefox');
  var config = require('./config');
}
/**** wrapper (end) ****/

var timerID, emailIDs = [], count = 0, desktopCount = 0;

var version = config.welcome.version;
if (app.version() !== version) {
  app.timer.setTimeout(function () {
    if (app.loadReason === "install" || app.loadReason === "startup") {
      if (config.welcome.page) {
        app.tab.open("http://add0n.com/fastest-gmail.html?v=" + app.version() + (version ? "&p=" + version + "&type=upgrade" : "&type=install"));
      }
      config.welcome.version = app.version();
    }
  }, config.welcome.timeout);
}

function getNotificationCount(txt) {
  function validGmailID(id) {
    for (var i = 0; i < emailIDs.length; i++) {
      if (emailIDs[i] == id) return false;
    }
    return true;
  }
  var feed = app.parser.parseFromString(txt, 'text/xml'); // update Gmail feed
  if (feed) {
    var entry = feed.querySelectorAll("entry");
    for (var i = 0; i < entry.length; i++) { /* loop through entries and show notifications */
      var id = entry[i].getElementsByTagName("id");
      if (id.length) {
        id = id[0].textContent;
        if (validGmailID(id)) {
          emailIDs.push(id);
          if (desktopCount < config.gmail.desktopCount) {
            var title = entry[i].getElementsByTagName("title")[0].textContent;
            var text = entry[i].getElementsByTagName("summary")[0].textContent;

            if (config.gmail.beep) app.play(app.manifest + "data/beep.ogg");
            if (config.gmail.notification) app.notification(title, text);
            desktopCount++;
          }
        }
      }
    }
  }
  var fullcount = 0;
  var arr = feed.getElementsByTagName("fullcount");
  if (arr && arr.length) {
    var tmp = arr[0].textContent;
    if (tmp) fullcount = parseInt(tmp) || 0;
  }
  return fullcount;
}

function checkNotifications() {
  var gmailUrl = [];
  var feed = 'https://mail.google.com/mail/u/0/feed/atom';

  gmailUrl.push(feed + '?rand=' + Math.round(Math.random() * 100000000));

  var labels = config.gmail.label.split(',').map(function (label) {
    return label.trim();
  }).filter(function (label) {
    return label;
  });
  labels.forEach(function (e, i) {
    gmailUrl.push(feed + '/' + e.toLowerCase().replace(/\ +/g, '-') + '?rand=' + Math.round(Math.random() * 100000000));
  });
  app.Promise.all(gmailUrl.map(function(url) {return app.get(url)})).then(function (arr) {
    arr = arr.filter(function (itm) {
      itm = itm.toLowerCase();
      var flag = itm.indexOf('unauthorized') == -1 && itm.indexOf('error') == -1;
      return flag;
    });
    var notificationCount = arr.map(getNotificationCount).reduce(function (p,c) {return p + c}, 0);
    if (notificationCount != count) {
      count = notificationCount;
      /* Badge */
      if (count <= 0) count = '';
      if (count > 999) count = '999+';
      app.button.badge = count + '';
      app.popup.send("reload-ui");
    }
    desktopCount = 0;
  }, function (e) {});

  /* Timer */
  if (timerID) app.timer.clearTimeout(timerID);
  timerID = app.timer.setTimeout(checkNotifications, 1000 * config.interval.time);
}
checkNotifications();

app.popup.receive("check-notifications", checkNotifications);

app.popup.receive("load", function () {
  app.popup.send("load", config.gmail.url);
});

app.popup.receive("panel-height", function () {
  app.popup.send("panel-height", config.popup.height);
});

app.popup.receive("gmail-account-inbox", function (url) {
  var flag = [];
  url = url.toLowerCase();

  /* Detecting Desired Folders */
  flag.push(url.indexOf('inbox') !== -1 && url.indexOf('inbox/') === -1);
  flag.push(url.indexOf('starred') !== -1 && url.indexOf('starred/') === -1);
  flag.push(url.indexOf('archives') !== -1 && url.indexOf('archives/') === -1);
  flag.push(url.indexOf('important') !== -1 && url.indexOf('important/') === -1);
  flag.push(url.indexOf('all%20mail') !== -1 && url.indexOf('all%20mail/') === -1);
  flag.push(url.indexOf('sent%20mail') !== -1 && url.indexOf('sent%20mail/') === -1);
  flag.push(url.indexOf('from%20circles') !== -1 && url.indexOf('from%20circles/') === -1);
  flag.push(url.indexOf('smartlabel_personal') !== -1 && url.indexOf('smartlabel_personal/') === -1);

  /* Adding Conditions */
  for (var i = 0; i < flag.length; i++) {
    if (flag[i]) {
      config.gmail.url = url;
      break;
    }
  }
});

app.popup.receive("resize", function () {
  app.popup.send("resize", {
    width: config.popup.width,
    height: config.popup.height
  });
});

function setBadge() {
  app.button.badgeColor = config.badge.color;
}
setBadge();

/* open settings and options */
app.popup.receive("open-gmail", app.tab.openGmail);
app.popup.receive("open-setting", app.tab.openOptions);
app.popup.receive("open-home", function () {
  app.tab.open("http://add0n.com/fastest-gmail.html");
});

app.options.receive("changed", function (o) {
  config.set(o.pref, o.value);
  app.options.send("set", {
    pref: o.pref,
    value: config.get(o.pref)
  });
  setBadge();
});

app.options.receive("get", function (pref) {
  app.options.send("set", {
    pref: pref,
    value: config.get(pref)
  });
});