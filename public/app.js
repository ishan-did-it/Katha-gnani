(() => {
  'use strict';

  const APP_NAME = 'Katha';
  const FILE_NAME = 'Katha_Transcript.txt';

  const $ = (id) => document.getElementById(id);
  const el = {
    status: $('status'), statusText: $('statusText'), error: $('error'),
    stage: $('stage'), lines: $('lines'), empty: $('empty'),
    mic: $('listenBtn'), micLabel: $('micLabel'),
    lang: $('lang'), replyLang: $('replyLang'), replyHint: $('replyHint'),
    chips: $('chips'), deckTabs: $('deckTabs'),
    form: $('replyForm'), text: $('replyText'),
    menu: $('menuBtn'), settings: $('settings'), closeSettings: $('closeSettings'),
    smaller: $('smaller'), larger: $('larger'), sizeLabel: $('sizeLabel'),
    save: $('save'), clear: $('clear'), noisy: $('noisyBtn'), noisyState: $('noisyState'),
    quickToggle: $('quickToggle'),
    openAddPhrase: $('openAddPhrase'), addPhraseModal: $('addPhraseModal'),
    closeAddPhrase: $('closeAddPhrase'), addPhraseForm: $('addPhraseForm'),
    customLabel: $('customLabel'), customPhrase: $('customPhrase'),
  };
  const themeButtons = Array.from(document.querySelectorAll('[data-theme-btn]'));

  const SILENCE_MS = 400;
  const ACCEPTED_RATES = [8000, 16000, 44100, 48000];
  const SIZES = [1.05, 1.25, 1.5, 1.85, 2.25, 2.75];
  const DEFAULT_SIZE = 2;
  const THEME_COLORS = { paper: '#f6f3ec', ink: '#111110', hc: '#000000' };

  const LANG_NAMES = {
    'hi-IN': 'Hindi', 'en-IN': 'English', 'pa-IN': 'Punjabi', 'gu-IN': 'Gujarati',
    'mr-IN': 'Marathi', 'bn-IN': 'Bengali', 'ta-IN': 'Tamil', 'te-IN': 'Telugu',
    'kn-IN': 'Kannada', 'ml-IN': 'Malayalam',
  };

  const BUILTIN_CHIPS = [
    { id: 'repeat', cat: 'clarity', label: 'Please repeat', t: {
      'en-IN': 'Please repeat that.', 'hi-IN': 'कृपया दोबारा बोलिए।', 'pa-IN': 'ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਬੋਲੋ।',
      'gu-IN': 'કૃપા કરીને ફરીથી બોલો.', 'mr-IN': 'कृपया पुन्हा बोला.', 'bn-IN': 'অনুগ্রহ করে আবার বলুন।',
      'ta-IN': 'தயவுசெய்து மீண்டும் சொல்லுங்கள்.', 'te-IN': 'దయచేసి మళ్లీ చెప్పండి.',
      'kn-IN': 'ದಯವಿಟ್ಟು ಮತ್ತೊಮ್ಮೆ ಹೇಳಿ.', 'ml-IN': 'ദയവായി ആവർത്തിക്കുക.' } },
    { id: 'slowly', cat: 'clarity', label: 'Speak slowly', t: {
      'en-IN': 'Please speak slowly.', 'hi-IN': 'कृपया धीरे बोलिए।', 'pa-IN': 'ਕਿਰਪਾ ਕਰਕੇ ਹੌਲੀ ਬੋਲੋ।',
      'gu-IN': 'કૃપા કરીને ધીમે બોલો.', 'mr-IN': 'कृपया हळू बोला.', 'bn-IN': 'অনুগ্রহ করে আস্তে বলুন।',
      'ta-IN': 'தயவுசெய்து மெதுவாகப் பேசுங்கள்.', 'te-IN': 'దయచేసి నెమ్మదిగా మాట్లాడండి.',
      'kn-IN': 'ದಯವಿಟ್ಟು ನಿಧಾನವಾಗಿ ಮಾತನಾಡಿ.', 'ml-IN': 'ദയവായി പതുക്കെ സംസാരിക്കുക.' } },
    { id: 'write', cat: 'clarity', label: 'Write it down', t: {
      'en-IN': 'Please write it down.', 'hi-IN': 'कृपया लिखकर बताइए।', 'pa-IN': 'ਕਿਰਪਾ ਕਰਕੇ ਲਿਖ ਕੇ ਦੱਸੋ।',
      'gu-IN': 'કૃપા કરીને લખીને જણાવો.', 'mr-IN': 'कृपया लिहून सांगा.', 'bn-IN': 'অনুগ্রহ করে লিখে দিন।',
      'ta-IN': 'தயவுசெய்து எழுதிக் காட்டுங்கள்.', 'te-IN': 'దయచేసి రాసి చూపించండి.',
      'kn-IN': 'ದಯವಿಟ್ಟು ಬರೆದು ತೋರಿಸಿ.', 'ml-IN': 'ദയവായി എഴുതിക്കാണിക്കുക.' } },
    { id: 'deaf', cat: 'clarity', label: 'I use captions', t: {
      'en-IN': 'I am deaf or hard of hearing. I am reading live captions.', 'hi-IN': 'मैं सुन नहीं सकता। मैं स्क्रीन पर पढ़ रहा हूँ।', 'pa-IN': 'ਮੈਂ ਸੁਣ ਨਹੀਂ ਸਕਦਾ। ਮੈਂ ਸਕ੍ਰੀਨ ਤੇ ਪੜ੍ਹ ਰਿਹਾ ਹਾਂ।',
      'gu-IN': 'હું સાંભળી શકતો નથી. હું સ્ક્રીન પર વાંચી રહ્યો છું.', 'mr-IN': 'मला ऐकू येत नाही. मी स्क्रीनवर वाचत आहे.', 'bn-IN': 'আমি শুনতে পাই না। আমি স্ক্রিনে পড়ছি।',
      'ta-IN': 'எனக்குக் காது கேட்காது. நான் திரையில் படிக்கிறேன்.', 'te-IN': 'నాకు వినిపించదు. నేను తెరపై చదువుతున్నాను.',
      'kn-IN': 'ನನಗೆ ಕೇಳಿಸುವುದಿಲ್ಲ. ನಾನು ಪರದೆಯ ಮೇಲೆ ಓದುತ್ತಿದ್ದೇನೆ.', 'ml-IN': 'എനിക്ക് കേൾക്കാൻ കഴിയില്ല. ഞാൻ സ്ക്രീനിൽ വായിക്കുകയാണ്.' } },
    { id: 'yes', cat: 'respond', label: 'Yes', t: {
      'en-IN': 'Yes.', 'hi-IN': 'हाँ।', 'pa-IN': 'ਹਾਂ।', 'gu-IN': 'હા.', 'mr-IN': 'हो.', 'bn-IN': 'হ্যাঁ।',
      'ta-IN': 'ஆம்.', 'te-IN': 'అవును.', 'kn-IN': 'ಹೌದು.', 'ml-IN': 'അതെ.' } },
    { id: 'no', cat: 'respond', label: 'No', t: {
      'en-IN': 'No.', 'hi-IN': 'नहीं।', 'pa-IN': 'ਨਹੀਂ।', 'gu-IN': 'ના.', 'mr-IN': 'नाही.', 'bn-IN': 'না।',
      'ta-IN': 'இல்லை.', 'te-IN': 'కాదు.', 'kn-IN': 'ಇಲ್ಲ.', 'ml-IN': 'അല്ല.' } },
    { id: 'thanks', cat: 'respond', label: 'Thank you', t: {
      'en-IN': 'Thank you.', 'hi-IN': 'धन्यवाद।', 'pa-IN': 'ਧੰਨਵਾਦ।', 'gu-IN': 'આભાર.', 'mr-IN': 'धन्यवाद.',
      'bn-IN': 'ধন্যবাদ।', 'ta-IN': 'நன்றி.', 'te-IN': 'ధన్యవాదాలు.', 'kn-IN': 'ಧನ್ಯವಾದ.', 'ml-IN': 'നന്ദി.' } },
    { id: 'moment', cat: 'respond', label: 'One moment', t: {
      'en-IN': 'One moment please, I am typing.', 'hi-IN': 'एक मिनट रुकिए, मैं लिख रहा हूँ।', 'pa-IN': 'ਇੱਕ ਮਿੰਟ ਰੁਕੋ, ਮੈਂ ਲਿਖ ਰਿਹਾ ਹਾਂ।',
      'gu-IN': 'એક મિનિટ રોકાઓ, હું લખી રહ્યો છું.', 'mr-IN': 'एक मिनिट थांबा, मी टाईप करत आहे.', 'bn-IN': 'এক মিনিট, আমি টাইপ করছি।',
      'ta-IN': 'ஒரு நிமிடம், நான் தட்டச்சு செய்கிறேன்.', 'te-IN': 'ఒక్క నిమిషం, నేను టైప్ చేస్తున్నాను.',
      'kn-IN': 'ಒಂದು ನಿಮಿಷ, ನಾನು ಟೈಪ್ ಮಾಡುತ್ತಿದ್ದೇನೆ.', 'ml-IN': 'ഒരു നിമിഷം, ഞാൻ ടൈപ്പ് ചെയ്യുകയാണ്.' } },
  ];

  const CHIP_ICONS = {
    yes: '<path d="m5 12 5 5 9-10"/>',
    no: '<path d="m6 6 12 12M18 6 6 18"/>',
    thanks: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    repeat: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>',
    slowly: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    write: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    deaf: '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="m16 9 5 6M21 9l-5 6"/>',
    moment: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4"/>',
    custom: '<path d="M12 3v18M3 12h18"/>',
  };

  const state = {
    running: false, paused: false, ws: null, ctx: null, stream: null, node: null,
    analyser: null, raf: null, rate: 16000, failures: 0, log: [], current: null,
    sizeIndex: DEFAULT_SIZE, errorTimer: null, lastLang: null, noisy: false,
    activeCategory: 'all', customChips: [],
  };

  const store = (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} };
  const load = (k) => { try { return localStorage.getItem(k); } catch (_) { return null; } };

  // ---------- Time helpers ----------
  const pad = (n) => String(n).padStart(2, '0');
  const fmtTime = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  const fmtDate = (d) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const sameDay = (a, b) => a.toDateString() === b.toDateString();

  // ---------- UI helpers ----------
  function setStatus(kind, text) {
    el.status.dataset.state = kind;
    el.statusText.textContent = text;
    document.body.dataset.live = kind === 'live' ? 'true' : 'false';
  }

  function showError(msg) {
    el.error.textContent = msg;
    el.error.hidden = false;
    clearTimeout(state.errorTimer);
    state.errorTimer = setTimeout(() => { el.error.hidden = true; }, 9000);
  }

  function setListenButton(on) {
    el.mic.setAttribute('aria-pressed', String(on));
    el.mic.setAttribute('aria-label', on ? 'Stop listening' : 'Start listening');
    el.micLabel.textContent = on ? 'Stop' : 'Listen';
  }

  function addLine(text, who, opts) {
    opts = opts || {};
    const now = new Date();
    el.empty.hidden = true;
    if (state.current) state.current.classList.remove('current');

    const box = document.createElement('article');
    box.className = 'entry ' + who + (who === 'them' ? ' current' : '');

    const body = document.createElement('p');
    body.className = 'txt';
    body.textContent = text;
    box.appendChild(body);

    const meta = document.createElement('div');
    meta.className = 'meta';

    const badge = document.createElement('span');
    badge.className = 'speaker-badge';
    badge.textContent = who === 'you' ? 'You' : (opts.lang || 'Speaker');
    meta.appendChild(badge);

    const timeSpan = document.createElement('span');
    timeSpan.textContent = '· ' + fmtTime(now);
    meta.appendChild(timeSpan);

    if (typeof opts.latency === 'number') {
      const latSpan = document.createElement('span');
      latSpan.textContent = `· ${opts.latency}ms`;
      meta.appendChild(latSpan);
    }

    box.appendChild(meta);
    el.lines.appendChild(box);
    if (who === 'them') state.current = box;

    state.log.push({ who, text, lang: opts.lang || '', time: now });
    el.stage.scrollTop = el.stage.scrollHeight;
  }

  function applySize() {
    document.documentElement.style.setProperty('--fs', SIZES[state.sizeIndex] + 'rem');
    el.sizeLabel.textContent = Math.round((SIZES[state.sizeIndex] / SIZES[DEFAULT_SIZE]) * 100) + '%';
    store('katha.size', String(state.sizeIndex));
  }

  function setTheme(name) {
    if (!THEME_COLORS[name]) name = 'paper';
    document.documentElement.dataset.theme = name;
    store('katha.theme', name);
    themeButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themeBtn === name)));
    const m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', THEME_COLORS[name]);
  }

  function setNoisy(on, reconnect) {
    state.noisy = on;
    store('katha.noisy', on ? '1' : '0');
    el.noisy.setAttribute('aria-pressed', String(on));
    el.noisyState.textContent = on ? 'ON' : 'OFF';
    if (reconnect && state.running && state.ws) state.ws.close();
  }

  // ---------- Save conversation ----------
  function saveConversation() {
    if (!state.log.length) { showError('Nothing recorded in transcript yet.'); return; }
    const first = state.log[0].time;
    const saved = new Date();
    const head = [
      `${APP_NAME} — Live Dialogue Transcript`,
      `Date: ${fmtDate(first)}`,
      `Exported: ${fmtDate(saved)} ${fmtTime(saved)}`,
      '----------------------------------------',
      '',
    ];
    const rows = state.log.map((m) => {
      const stamp = sameDay(m.time, first) ? fmtTime(m.time) : `${fmtDate(m.time)} ${fmtTime(m.time)}`;
      const who = m.who === 'you' ? 'You' : 'Speaker' + (m.lang ? ` (${m.lang})` : '');
      return `[${stamp}] ${who}: ${m.text}`;
    });
    const blob = new Blob(['\ufeff' + head.concat(rows).join('\r\n')], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = FILE_NAME;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ---------- Microphone level meter ----------
  function startMeter() {
    if (!state.analyser) return;
    const buf = new Uint8Array(state.analyser.fftSize);
    let smooth = 0;
    const tick = () => {
      if (!state.analyser) return;
      state.analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
      const rms = Math.sqrt(sum / buf.length);
      smooth = Math.max(Math.min(1, rms * 6), smooth * 0.85);
      el.mic.style.setProperty('--level', smooth.toFixed(3));
      state.raf = requestAnimationFrame(tick);
    };
    tick();
  }
  function stopMeter() {
    if (state.raf) cancelAnimationFrame(state.raf);
    state.raf = null;
    el.mic.style.setProperty('--level', '0');
  }

  // ---------- Microphone and audio graph ----------
  function onAudioFrame(e) {
    if (state.paused) return;
    const ws = state.ws;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(e.data);
  }

  async function buildAudio() {
    state.stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    let lastErr;
    for (const rate of [16000, undefined]) {
      let ctx;
      try {
        ctx = rate ? new AudioContext({ sampleRate: rate }) : new AudioContext();
        if (ctx.state === 'suspended') await ctx.resume();
        await ctx.audioWorklet.addModule('pcm-worklet.js');
        const src = ctx.createMediaStreamSource(state.stream);
        const node = new AudioWorkletNode(ctx, 'pcm-processor');
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        const mute = ctx.createGain();
        mute.gain.value = 0;
        src.connect(node);
        src.connect(analyser);
        node.connect(mute);
        mute.connect(ctx.destination);
        if (!ACCEPTED_RATES.includes(ctx.sampleRate)) {
          throw new Error('Unsupported audio rate ' + ctx.sampleRate);
        }
        node.port.onmessage = onAudioFrame;
        state.ctx = ctx; state.node = node; state.analyser = analyser; state.rate = ctx.sampleRate;
        return;
      } catch (e) {
        lastErr = e;
        if (ctx) ctx.close().catch(() => {});
      }
    }
    throw lastErr;
  }

  async function teardown() {
    state.running = false;
    stopMeter();
    const ws = state.ws;
    state.ws = null;
    if (ws) { try { ws.close(); } catch (_) {} }
    if (state.stream) { state.stream.getTracks().forEach((t) => t.stop()); state.stream = null; }
    if (state.node) { state.node.port.onmessage = null; state.node = null; }
    state.analyser = null;
    if (state.ctx) { try { await state.ctx.close(); } catch (_) {} state.ctx = null; }
  }

  // ---------- Speech-to-text connection ----------
  function connectWS() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${location.host}/ws/stt?lang=${encodeURIComponent(el.lang.value)}` +
      `&rate=${state.rate}&silence=${state.noisy ? 500 : SILENCE_MS}&vad=${state.noisy ? 0.65 : 0.5}`;
    const ws = new WebSocket(url);
    ws.binaryType = 'arraybuffer';
    state.ws = ws;
    setStatus('busy', 'Connecting');

    ws.onmessage = (ev) => {
      let m;
      try { m = JSON.parse(ev.data); } catch (_) { return; }
      if (m.type === 'connected') {
        state.failures = 0;
        if (!state.paused) setStatus('live', 'Listening');
      } else if (m.type === 'processing') {
        if (!state.paused) setStatus('busy', 'Transcribing');
      } else if (m.type === 'transcript') {
        if (!state.paused) setStatus('live', 'Listening');
        const text = (m.text || '').trim();
        if (text) {
          if (LANG_NAMES[m.detected_language_code]) { state.lastLang = m.detected_language_code; updateHint(); }
          addLine(text, 'them', {
            lang: LANG_NAMES[m.detected_language_code] || m.detected_language_code || '',
            latency: typeof m.latency === 'number' ? m.latency : undefined,
          });
        }
      } else if (m.type === 'error') {
        showError(m.message || 'The speech service reported an error.');
      }
    };

    ws.onclose = () => {
      if (state.ws !== ws || !state.running) return;
      state.failures++;
      if (state.failures > 5) {
        showError('Lost connection to speech service. Tap Listen to reconnect.');
        stop();
        return;
      }
      setStatus('busy', 'Reconnecting');
      setTimeout(() => { if (state.running && state.ws === ws) connectWS(); }, 1000);
    };
  }

  async function start() {
    if (state.running) return;
    setStatus('busy', 'Starting mic');
    try {
      await buildAudio();
    } catch (e) {
      await teardown();
      setStatus('idle', 'Standby');
      showError(e && e.name === 'NotAllowedError'
        ? 'Microphone access is blocked. Enable microphone permissions in your browser.'
        : 'Could not start microphone: ' + ((e && e.message) || e));
      return;
    }
    state.running = true;
    state.failures = 0;
    setListenButton(true);
    startMeter();
    connectWS();
  }

  async function stop() {
    await teardown();
    setListenButton(false);
    setStatus('idle', 'Standby');
  }

  // ---------- Reply language & Quick Replies ----------
  function quickLang() {
    if (el.replyLang.value !== 'auto') return el.replyLang.value;
    if (state.lastLang) return state.lastLang;
    if (LANG_NAMES[el.lang.value]) return el.lang.value;
    return 'hi-IN';
  }
  function typedLang() { return el.replyLang.value; }

  function updateHint() {
    const auto = el.replyLang.value === 'auto';
    const l = quickLang();
    el.replyHint.textContent = `${LANG_NAMES[l]}${auto ? ' (mirror)' : ''}`;
    renderChips();
  }

  function loadCustomChips() {
    try {
      const raw = load('katha.customChips');
      state.customChips = raw ? JSON.parse(raw) : [];
    } catch (_) {
      state.customChips = [];
    }
  }

  function saveCustomChips() {
    store('katha.customChips', JSON.stringify(state.customChips));
  }

  function renderChips() {
    el.chips.textContent = '';
    const lang = quickLang();
    const cat = state.activeCategory;

    const allItems = [
      ...BUILTIN_CHIPS.map((c) => ({ ...c, isCustom: false })),
      ...state.customChips.map((c) => ({ ...c, cat: 'custom', isCustom: true })),
    ];

    const filtered = allItems.filter((item) => cat === 'all' || item.cat === cat);

    if (!filtered.length && cat === 'custom') {
      const emptyNote = document.createElement('span');
      emptyNote.className = 'help';
      emptyNote.textContent = 'No saved phrases yet. Tap "+ Phrase" to add your own.';
      el.chips.appendChild(emptyNote);
      return;
    }

    filtered.forEach((c) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';

      const phraseText = c.isCustom ? c.phrase : (c.t[lang] || c.t['hi-IN']);
      b.title = phraseText;

      const iconPath = c.isCustom ? CHIP_ICONS.custom : (CHIP_ICONS[c.id] || '');
      b.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPath}</svg>`;

      const span = document.createElement('span');
      span.textContent = c.label;
      b.appendChild(span);

      b.addEventListener('click', () => {
        speak(phraseText, c.isCustom ? typedLang() : lang);
        b.classList.add('sent');
        setTimeout(() => b.classList.remove('sent'), 700);
      });

      if (c.isCustom) {
        const del = document.createElement('span');
        del.className = 'chip-del';
        del.setAttribute('role', 'button');
        del.setAttribute('aria-label', `Remove ${c.label}`);
        del.textContent = '×';
        del.addEventListener('click', (ev) => {
          ev.stopPropagation();
          state.customChips = state.customChips.filter((item) => item.id !== c.id);
          saveCustomChips();
          renderChips();
        });
        b.appendChild(del);
      }

      el.chips.appendChild(b);
    });
  }

  // ---------- Spoken reply ----------
  // Spoken replies go through a gain stage plus a limiter so they are clearly audible.
  const REPLY_GAIN = 2.0;
  let playCtx = null;
  function getPlayCtx() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!playCtx) playCtx = new AC();
    if (playCtx.state === 'suspended') playCtx.resume().catch(() => {});
    return playCtx;
  }
  async function playLoud(arrayBuffer) {
    const ctx = getPlayCtx();
    if (!ctx) throw new Error('Web Audio is not available');
    const buf = await ctx.decodeAudioData(arrayBuffer.slice(0));
    await new Promise((resolve) => {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const gain = ctx.createGain();
      gain.gain.value = REPLY_GAIN;
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -8;
      limiter.knee.value = 4;
      limiter.ratio.value = 14;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.15;
      src.connect(gain);
      gain.connect(limiter);
      limiter.connect(ctx.destination);
      src.onended = resolve;
      src.start();
    });
  }

  async function speak(raw, language) {
    const text = (raw || '').trim();
    if (!text) return;
    addLine(text, 'you');
    state.paused = true;
    setStatus('busy', 'Speaking');
    getPlayCtx();   // create and resume the audio context inside the tap
    try {
      const r = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language: language || 'auto' }),
      });
      if (!r.ok) throw new Error('Text to speech failed (' + r.status + ')');
      const data = await r.arrayBuffer();
      try {
        await playLoud(data);
      } catch (_) {
        // fall back to a plain audio element if the louder path fails
        const url = URL.createObjectURL(new Blob([data], { type: 'audio/wav' }));
        const audio = new Audio(url);
        await new Promise((resolve, reject) => {
          audio.onended = resolve;
          audio.onerror = () => reject(new Error('Could not play audio.'));
          audio.play().catch(reject);
        });
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      showError(e.message || 'Could not speak reply.');
    } finally {
      setTimeout(() => {
        state.paused = false;
        if (state.running) setStatus('live', 'Listening');
        else setStatus('idle', 'Standby');
      }, 400);
    }
  }

  // ---------- Event Wiring ----------
  el.mic.addEventListener('click', () => (state.running ? stop() : start()));

  el.lang.addEventListener('change', () => {
    store('katha.listen', el.lang.value);
    updateHint();
    if (state.running && state.ws) state.ws.close();
  });
  el.replyLang.addEventListener('change', () => {
    store('katha.reply', el.replyLang.value);
    updateHint();
  });
  el.noisy.addEventListener('click', () => setNoisy(!state.noisy, true));

  el.form.addEventListener('submit', (e) => {
    e.preventDefault();
    const t = el.text.value;
    el.text.value = '';
    speak(t, typedLang());
  });

  // Category tabs
  el.deckTabs.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-cat]');
    if (!tab) return;
    state.activeCategory = tab.dataset.cat;
    el.deckTabs.querySelectorAll('[data-cat]').forEach((t) => {
      t.setAttribute('aria-selected', String(t === tab));
    });
    renderChips();
  });

  // Collapse quick replies
  function setQuickOpen(open, persist) {
    el.chips.hidden = !open;
    el.quickToggle.setAttribute('aria-expanded', String(open));
    if (persist) store('katha.quick', open ? 'open' : 'closed');
  }
  el.quickToggle.addEventListener('click', () => setQuickOpen(el.chips.hidden, true));

  // Add custom phrase modal
  el.openAddPhrase.addEventListener('click', () => {
    el.customLabel.value = '';
    el.customPhrase.value = '';
    if (typeof el.addPhraseModal.showModal === 'function') el.addPhraseModal.showModal();
    else el.addPhraseModal.setAttribute('open', '');
  });
  const closeAddModal = () => { if (el.addPhraseModal.open) el.addPhraseModal.close(); };
  el.closeAddPhrase.addEventListener('click', closeAddModal);
  el.addPhraseModal.addEventListener('click', (e) => { if (e.target === el.addPhraseModal) closeAddModal(); });

  el.addPhraseForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const label = el.customLabel.value.trim();
    const phrase = el.customPhrase.value.trim();
    if (!label || !phrase) return;
    state.customChips.push({ id: 'c_' + Date.now(), label, phrase });
    saveCustomChips();
    closeAddModal();
    // Switch to Saved or All so user immediately sees their new phrase
    if (state.activeCategory !== 'all' && state.activeCategory !== 'custom') {
      state.activeCategory = 'custom';
      el.deckTabs.querySelectorAll('[data-cat]').forEach((t) => {
        t.setAttribute('aria-selected', String(t.dataset.cat === 'custom'));
      });
    }
    setQuickOpen(true, true);
    renderChips();
  });

  // Preferences sheet
  el.menu.addEventListener('click', () => {
    if (typeof el.settings.showModal === 'function') el.settings.showModal();
    else el.settings.setAttribute('open', '');
  });
  const closeSheet = () => { if (el.settings.open) el.settings.close(); };
  el.closeSettings.addEventListener('click', closeSheet);
  el.settings.addEventListener('click', (e) => { if (e.target === el.settings) closeSheet(); });

  el.smaller.addEventListener('click', () => { state.sizeIndex = Math.max(0, state.sizeIndex - 1); applySize(); });
  el.larger.addEventListener('click', () => { state.sizeIndex = Math.min(SIZES.length - 1, state.sizeIndex + 1); applySize(); });
  themeButtons.forEach((b) => b.addEventListener('click', () => setTheme(b.dataset.themeBtn)));

  el.save.addEventListener('click', () => { saveConversation(); });
  el.clear.addEventListener('click', () => {
    el.lines.textContent = '';
    state.log = [];
    state.current = null;
    el.empty.hidden = false;
    closeSheet();
  });

  // ---------- Init ----------
  const savedSize = parseInt(load('katha.size'), 10);
  if (savedSize >= 0 && savedSize < SIZES.length) state.sizeIndex = savedSize;
  applySize();
  setTheme(document.documentElement.dataset.theme);

  const pick = (select, saved, fallback) => {
    select.value = saved || fallback;
    if (select.value !== (saved || fallback)) select.value = fallback;
  };
  pick(el.lang, load('katha.listen'), 'hi-IN');
  pick(el.replyLang, load('katha.reply'), 'auto');
  setNoisy(load('katha.noisy') === '1', false);

  loadCustomChips();
  const savedQuick = load('katha.quick');
  setQuickOpen(savedQuick ? savedQuick === 'open' : true, false);
  updateHint();

  if (!navigator.mediaDevices || !window.AudioWorklet) {
    showError('This browser cannot capture live audio. Use Chrome, Edge, or Safari over HTTPS.');
  }
})();
