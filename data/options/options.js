var connect = function (elem, pref) {
  var att = "value";
  if (elem) {
    if (elem.type === "checkbox") {att = "checked"};
    if (elem.localName === "span") {att = "textContent"};
    if (elem.localName === "select") {att = "selectedIndex"};
    var pref = elem.getAttribute("data-pref");
    background.send("get", pref);
    elem.addEventListener("change", function () {
      background.send("changed", {
        pref: pref,
        value: this[att]
      });
    });
  }
  return {
    get value () {return elem[att]},
    set value (val) {
      if (elem.type === "file") return;
      elem[att] = val;
    }
  }
}

background.receive("set", function (o) {
  if (window[o.pref]) {
    window[o.pref].value = o.value;
  }
});

function pickColor(type) {
  function handle() {
    background.send("changed", {
      pref: type,
      value: document.getElementById('hexBox').textContent
    });
    colorContainer.removeEventListener('click', handle);
  }
  var colorContainer = document.getElementById('colorContainer');
  colorContainer.addEventListener('click', handle);
}

function init() {
  var prefs = document.querySelectorAll("*[data-pref]");
  [].forEach.call(prefs, function (elem) {
    var pref = elem.getAttribute("data-pref");
    window[pref] = connect(elem, pref);
  });
  /*  */
  window.setTimeout(function () {
    var colorPicker = document.querySelectorAll('span[class="colorChooser"]');
    /* set colorPicker */
    colorPicker[0].style.backgroundColor = window["badge.color"].value;
    colorPicker[0].addEventListener('click', function () {pickColor("badge.color")});
  }, 200);
  /*  */
  window.removeEventListener("load", init, false);
}
/*  */
window.addEventListener("load", init, false);