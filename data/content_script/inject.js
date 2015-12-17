var t0 = new Date();

document.addEventListener("DOMContentLoaded", function () {
  background.send("check-notifications");
}, false);

function init() {
  window.setTimeout(function () {
    /* observe (tltbt) for any changes */
    var target = document.getElementById('tltbt');
    if (!target) return;
    /* add observer for the target and look for all changes, then update badge */
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        var t1 = new Date(); /* do not check id delta is smaller than 2 seconds */
        if ((t1.getTime() - t0.getTime()) < 2000) return;
        else {
          t0 = t1;
          window.setTimeout(function () {
            background.send("check-notifications");
            try {
              background.send("gmail-account-inbox", document.location.href);
            }
            catch (e) {}
          }, 1000);
        }
      });
    });
    observer.observe(target, {
      subtree: true,
      childList: true
    });
    /* adding gmail button */
    var tltbt = document.getElementById('tltbt') || document.getElementById('views');
    if (tltbt) {
      var compose = tltbt.querySelector("div[aria-label='Compose']");
      if (compose) {
        /* find correct element */
        compose = compose.parentNode;
        function styleElement(elm, str, right) {
          compose.parentNode.appendChild(elm);
          /* style */
          elm.style.right = right;
          elm.classList.add("extra-gmail-class");
          elm.firstChild.setAttribute("aria-label", '');
          elm.firstChild.classList.add("extra-gmail-buttons");
          elm.firstChild.firstChild.style.background = "#7A7A7A url(" + manifest.url + "data/content_script/" + str + ".png)" + " no-repeat center center";
          /* listener */
          elm.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            background.send("open-" + str);
          }, true);
        }
        styleElement(compose.cloneNode(true), "gmail", "45px");
        styleElement(compose.cloneNode(true), "home", "129px");
        styleElement(compose.cloneNode(true), "setting", "87px");
        compose.firstChild.classList.add("extra-compose-class");
      }
    }
    /* remove attach gui */
    window.addEventListener("click", function(e) {
      var attach = document.querySelector('div[aria-label="Attach a file"]') || document.querySelector('div[aria-label="attach a file"]');
      if (attach) {
        attach = attach.parentNode.parentNode.parentNode;
        if (!attach.contains(e.target)) {
          attach.parentNode.removeChild(attach);
        }
      }
    });
  }, 2000);
  /* deactivate blpromo */
  var blpromo = document.querySelector('div[id="blpromo"]');
  if (blpromo) {
    var onclicks = blpromo.querySelectorAll('[onclick*="_e(event,"]');
    for (var i = 0; i < onclicks.length; i++) {
      var role = onclicks[i].getAttribute('role');
      var ariaLabel = onclicks[i].getAttribute('aria-label');
      if (!role && !ariaLabel) {
        onclicks[i].click();
      }
    }
  }
  /* deactivate isppromo */
  var isppromo = document.querySelector('div[id="isppromo"]');
  if (isppromo) {
    var onclicks = isppromo.querySelectorAll('[onclick*="_e(event,"]');
    for (var i = 0; i < onclicks.length; i++) {
      var role = onclicks[i].getAttribute('role');
      var tabindex = onclicks[i].getAttribute('tabindex');
      if (!role && tabindex !== "0") {
        onclicks[i].click();
      }
    }
  }
  /*  */
  window.removeEventListener("load", init, false);
}

window.addEventListener("load", init, false);

background.receive("reload-ui", function () {
  if (document) {
    /* refresh UI */
    var refresh = document.querySelector('div[aria-label="Refresh"]') ||
                  document.querySelector('div[aria-label="refresh"]');
    if (refresh) refresh.click();
    /*  */
    var tltbt = document.querySelector('div[id="tltbt"]');
    if (tltbt) {
      var onclicks = tltbt.querySelectorAll('[onclick*="_e(event,"]');
      for (var i = 0; i < onclicks.length; i++) {
        var role = onclicks[i].getAttribute('role');
        var ariaLabel = onclicks[i].getAttribute('aria-label');
        if (!role && !ariaLabel) {
          onclicks[i].click();
        }
      }
    }
  }
}, false);