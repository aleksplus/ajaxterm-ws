/**
 * @param {string} id - The ID of the HTML element where the terminal will be created.
 * @param {Object} options - width, height values
 */
export function terminal(id, options = {}) {
  // options
  const width = options.width || 80; // dimension of the terminal
  const height = options.height || 25;

  const loc = window.location;
  const urlParams = `${loc.search}&w=${width}&h=${height}`;
  const endpoint = `${options.getEndpoint()}${urlParams}`; // URL of the server endpoint that
  // delivers the request to Session.handleUpdate
  const additionalQueryString = options.query; // additional parameters sent to the server

  const sid = '' + Math.round(Math.random() * 1000000000);
  const query0 = 's=' + sid + '&w=' + width + '&h=' + height;
  const query1 = query0 + '&c=1&k=';
  let timeout;
  let screenTimestamp = 0;
  let error_timeout;
  const keybuf = [];
  let sending = 0;
  let rmax = 1;

  const div = typeof id == 'string' ? document.getElementById(id) : id;
  const fitter = document.createElement('div'); // for shrinking the screen area to the right size
  const dstat = document.createElement('pre');
  const sled = document.createElement('span'); // status LED. indicate the communication with the server
  const opt_get = document.createElement('a'); //
  const sdebug = document.createElement('span');
  const spacer = document.createElement('div'); // creates border & padding around the main screen
  const screen = document.createElement('div'); // holds dterm&cursor. origin of the cursor positioning

  const dterm = document.createElement('div'); // area that shows the screen

  const cursor = document.createElement('div'); // cursor
  const hiddenTextarea = document.createElement('textarea');
  hiddenTextarea.id = 'pasteHandler';
  hiddenTextarea.style.position = 'absolute';
  hiddenTextarea.style.left = '0px';
  hiddenTextarea.style.bottom = '0px';
  hiddenTextarea.style.height = '1px';
  hiddenTextarea.style.width = '1px';
  hiddenTextarea.style.opacity = '0';
  hiddenTextarea.contentEditable = true;
  hiddenTextarea.setAttribute('tabindex', '-1');
  hiddenTextarea.setAttribute('aria-hidden', 'true');

  screen.appendChild(hiddenTextarea);

  function debug(s) {
    sdebug.innerHTML = s;
  }

  function onerror() {
    sled.className = 'off';
    console.log('Error occurred');
    debug('Error occurred ts:' + new Date().getTime());
  }

  function onclose() {
    console.log('Websocket closed');
    sled.className = 'off';
    debug('Connection lost timeout ts:' + new Date().getTime());
  }

  const socket = new WebSocket(endpoint);
  socket.onopen = function () {
    sled.className = 'on';
    console.log('Websocket connected');
    debug('Connection established');
  };

  socket.onclose = onclose;

  socket.onmessage = function (message) {
    const jsonObject = JSON.parse(message.data);
    window.clearTimeout(error_timeout);
    if (jsonObject.responseText.trim() !== '<idem/>') {
      dterm.innerHTML = jsonObject.responseText;
      rmax = 100;
    } else {
      rmax *= 2;
      if (rmax > 2000) rmax = 2000;
    }

    // update cursor position
    const cxs = jsonObject.screenX;
    if (cxs != null) {
      const cx = Number(cxs);
      const cy = Number(jsonObject.cursorX);
      const sx = Number(jsonObject.screenX);
      const sy = Number(jsonObject.screenY);

      cursor.style.left = (dterm.offsetWidth * cx) / sx + 'px';
      cursor.style.top = (dterm.offsetHeight * cy) / sy + 'px';
      cursor.style.display = '';
    } else {
      cursor.style.display = 'none';
    }

    sending = 0;
    sled.className = 'off';
    timeout = window.setTimeout(update, rmax);
    screenTimestamp = jsonObject.screenTimestamp;
  };

  socket.onerror = onerror;

  function parseToJson(str) {
    str = str.split('&');
    const result = {};
    for (let i = 0; i < str.length; i++) {
      const cur = str[i].split('=');
      result[cur[0]] = cur[1];
    }
    return result;
  }

  function update() {
    sled.className = 'on';
    if (socket.readyState === socket.CLOSED) {
      sled.className = 'off';
    }
    let send = '';
    while (keybuf.length > 0) {
      const key = keybuf.pop();
      send += key;
    }
    let query = query1 + send + '&t=' + screenTimestamp;
    if (additionalQueryString) query += '&' + additionalQueryString;
    if (opt_get.className === 'on') {
      socket.send(null);
    } else {
      const jsonString = parseToJson(query);
      socket.send(JSON.stringify(jsonString));
    }
  }

  function queue(s) {
    keybuf.unshift(s);
    if (sending === 0) {
      window.clearTimeout(timeout);
      timeout = window.setTimeout(update, 1);
    }
  }

  // special keys that don't result in the keypress event.
  // we need to handle these in keydown
  const keyDownKeyCodes = {
    // see http://www.w3.org/TR/DOM-Level-3-Events/#determine-keydown-keyup-keyCode
    // also see http://www.javascripter.net/faq/keycodes.htm
    8: 1, // Backspace
    9: 1, // TAB
    27: 1, // Escape
    33: 1, // PageUp
    34: 1, // PageDown
    35: 1, // End
    36: 1, // Home
    37: 1, // Left
    38: 1, // Up
    39: 1, // Right
    40: 1, // Down
    45: 1, // Insert
    46: 1, // Del
    112: 1,
    113: 1,
    114: 1,
    115: 1,
    116: 1,
    117: 1,
    118: 1,
    119: 1,
    120: 1,
    121: 1,
    122: 1,
    123: 1, // F1-F12
  };

  /**
   * @param {KeyboardEvent} ev - The event object from a keyboard event
   */
  function keydown(ev) {
    if (
      (keyDownKeyCodes[ev.keyCode] && ev.charCode === 0) ||
      ev.ctrlKey ||
      ev.altKey ||
      ev.metaKey
    ) {
      // ev.charCode!=0 implies those are keys that produce ASCII codes
      return handleKey(ev, 0);
    }
  }

  /**
   * @param {KeyboardEvent} ev - The event object from a keyboard event
   */
  function keypress(ev) {
    if (
      (keyDownKeyCodes[ev.keyCode] && ev.charCode === 0) ||
      ev.ctrlKey ||
      ev.altKey ||
      ev.metaKey
    ) {
      // we handled these in keydown
    } else {
      return handleKey(ev, ev.which);
    }
  }

  // which==0 appears to be used as a signel but not sure exactly why --- Kohsuke
  /**
   * @param {KeyboardEvent} ev
   * @param {*} which
   * @returns
   */
  function handleKey(ev, which) {
    let kc;
    let k = '';
    if (ev.keyCode) kc = ev.keyCode;
    if (which) kc = which;

    if (ev.altKey) {
      if (kc >= 65 && kc <= 90) kc += 32;
      if (kc >= 97 && kc <= 122) {
        k = String.fromCharCode(27) + String.fromCharCode(kc);
      }
    } else if ((ev.ctrlKey || ev.metaKey) && ev.code === 'KeyV') {
      // focus content editable element for FF
      hiddenTextarea.focus();
      return;
    } else if (ev.ctrlKey) {
      if (kc >= 65 && kc <= 90)
        k = String.fromCharCode(kc - 64); // Ctrl-A..Z
      else if (kc >= 97 && kc <= 122)
        k = String.fromCharCode(kc - 96); // Ctrl-A..Z
      else if (kc === 54)
        k = String.fromCharCode(30); // Ctrl-^
      else if (kc === 109)
        k = String.fromCharCode(31); // Ctrl-_
      else if (kc === 219)
        k = String.fromCharCode(27); // Ctrl-[
      else if (kc === 220)
        k = String.fromCharCode(28); // Ctrl-\
      else if (kc === 221)
        k = String.fromCharCode(29); // Ctrl-]
      else if (kc === 219)
        k = String.fromCharCode(29); // Ctrl-]
      else if (kc === 219) k = String.fromCharCode(0); // Ctrl-@
    } else if (which === 0) {
      if (kc === 9)
        k = String.fromCharCode(9); // Tab
      else if (kc === 8)
        k = String.fromCharCode(127); // Backspace
      else if (kc === 27)
        k = String.fromCharCode(27); // Escape
      else {
        if (kc === 33)
          k = '[5~'; // PgUp
        else if (kc === 34)
          k = '[6~'; // PgDn
        else if (kc === 35)
          k = '[4~'; // End
        else if (kc === 36)
          k = '[1~'; // Home
        else if (kc === 37)
          k = '[D'; // Left
        else if (kc === 38)
          k = '[A'; // Up
        else if (kc === 39)
          k = '[C'; // Right
        else if (kc === 40)
          k = '[B'; // Down
        else if (kc === 45)
          k = '[2~'; // Ins
        else if (kc === 46)
          k = '[3~'; // Del
        else if (kc === 112)
          k = '[[A'; // F1
        else if (kc === 113)
          k = '[[B'; // F2
        else if (kc === 114)
          k = '[[C'; // F3
        else if (kc === 115)
          k = '[[D'; // F4
        else if (kc === 116)
          k = '[[E'; // F5
        else if (kc === 117)
          k = '[17~'; // F6
        else if (kc === 118)
          k = '[18~'; // F7
        else if (kc === 119)
          k = '[19~'; // F8
        else if (kc === 120)
          k = '[20~'; // F9
        else if (kc === 121)
          k = '[21~'; // F10
        else if (kc === 122)
          k = '[23~'; // F11
        else if (kc === 123) k = '[24~'; // F12
        if (k.length) {
          k = String.fromCharCode(27) + k;
        }
      }
    } else {
      if (kc === 8)
        k = String.fromCharCode(127); // Backspace
      else k = String.fromCharCode(kc);
    }
    if (k.length) {
      if (k === '+') {
        queue('%2B');
      } else if (!/[\u0400-\u04FF]/.test(k)) {
        // /[\u0400-\u04FF]/ regex for Cyrillic characters, excluding them
        //  because ajaxterm4j cannot correctly handle such characters
        queue(encodeURIComponent(k));
      }
    }
    if (ev.stopPropagation) ev.stopPropagation();
    if (ev.preventDefault) ev.preventDefault();
    return false;
  }

  function html2text(_data) {
    const div = document.createElement('div');
    div.innerHTML = _data;
    return div.innerText;
  }

  /**
   * @param {ClipboardEvent} e - The event object provided by the browser on paste actions.
   */
  function handlePaste(e) {
    const clb = e.clipboardData;
    if (clb) {
      if (
        clb.types.indexOf('text/html') > -1 ||
        clb.types.indexOf('text/plain') > -1
      ) {
        const data = html2text(
          clb.getData('text/html') || clb.getData('text/plain'),
        );

        queue(encodeURIComponent(data));
        // to prevent the default paste action
        e.preventDefault();
      }
    } else if (window.clipboardData && window.clipboardData.getData) {
      // IE
      const data = html2text(window.clipboardData.getData('Text'));
      queue(encodeURIComponent(data));
    }
  }

  function init() {
    sled.appendChild(document.createTextNode('\xb7'));
    sled.className = 'off';
    dstat.appendChild(sled);
    dstat.appendChild(document.createTextNode(' '));
    dstat.appendChild(sdebug);
    dstat.className = 'stat';
    div.appendChild(fitter);
    fitter.className = 'fitter';
    fitter.appendChild(dstat);
    fitter.appendChild(spacer);
    spacer.className = 'spacer';
    spacer.appendChild(screen);
    screen.className = 'screen';
    screen.appendChild(dterm);

    document.addEventListener('paste', handlePaste);

    hiddenTextarea.addEventListener('textInput', (e) => {
      e.stopPropagation();
      queue(encodeURIComponent(e.data));
    });

    window.addEventListener('keypress', keypress);
    window.addEventListener('keydown', keydown);

    cursor.className = 'cursor';
    cursor.style.position = 'absolute';
    cursor.style.color = 'white';
    cursor.style.zIndex = '999';
    cursor.innerHTML = '_';
    screen.appendChild(cursor);
  }

  init();
}
