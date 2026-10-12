/* ICELOCK — "Clip it": rolling ~12s canvas recorder (MediaRecorder) + watermark + streamer mode */
window.IL = window.IL || {};
IL.Clip = (function () {
  let rec = null, head = null, chunks = [], mime = '', supported = false, last = null;
  const KEEP = 12;
  function pickMime() {
    if (!window.MediaRecorder) return '';
    const c = ['video/mp4;codecs=avc1', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
    for (const m of c) { try { if (MediaRecorder.isTypeSupported(m)) return m; } catch (e) {} }
    return '';
  }
  function start() {
    stop();
    const canvas = document.getElementById('game-canvas');
    mime = pickMime(); supported = !!(mime && canvas.captureStream);
    if (!supported) return false;
    try {
      const stream = canvas.captureStream(30);
      rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2500000 });
      head = null; chunks = [];
      rec.ondataavailable = (e) => { if (!e.data || !e.data.size) return; if (!head) head = e.data; else { chunks.push(e.data); if (chunks.length > KEEP) chunks.shift(); } };
      rec.start(1000);
      return true;
    } catch (e) { supported = false; rec = null; return false; }
  }
  function stop() { try { if (rec && rec.state !== 'inactive') rec.stop(); } catch (e) {} rec = null; }
  /* returns Promise<{blob, ext} | {unsupported:true}> */
  function clip() {
    if (!supported || !rec) return Promise.resolve({ unsupported: true, reason: !window.MediaRecorder ? 'MediaRecorder not available' : 'no recordable format' });
    return new Promise((res) => {
      const done = () => {
        const parts = (head ? [head] : []).concat(chunks);
        const blob = new Blob(parts, { type: mime.split(';')[0] });
        last = { blob, ext: mime.indexOf('mp4') >= 0 ? 'mp4' : 'webm', size: blob.size };
        res(last);
      };
      try { rec.requestData(); } catch (e) {}
      setTimeout(done, 350);
    });
  }
  function watermark(ctx, W, H, dpr) {
    ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 0.75; ctx.font = '900 15px system-ui,sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillText(IL.GAME_TITLE + ' 🏒', W - 9, H - 7);
    ctx.fillStyle = '#ffb547'; ctx.fillText(IL.GAME_TITLE + ' 🏒', W - 10, H - 8);
    if (rec) { ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.arc(W - 14 - ctx.measureText(IL.GAME_TITLE + ' 🏒').width - 8, H - 15, 3.5, 0, 7); ctx.globalAlpha = 0.5 + 0.4 * Math.sin(performance.now() / 300); ctx.fill(); }
    ctx.restore();
  }
  async function openClip() {
    IL.UI.toast('🎬 Clipping the last ~12s…');
    const r = await clip();
    IL.Clip.lastResult = r;
    const $ = (id) => document.getElementById(id);
    if (r.unsupported) { IL.UI.toast('🎬 Clips not supported in this browser'); return r; }
    const url = URL.createObjectURL(r.blob), name = 'topshelf-clip.' + r.ext;
    const wasGame = IL.UI.current === 'game';
    if (wasGame) { if (IL.Jobs.active || IL.Flick.active) document.getElementById('pause').classList.remove('hidden'); else IL.Game.togglePause(true); }
    $('modal-card').innerHTML = '<h2>🎬 Clip it</h2><video class="clipvid" src="' + url + '" autoplay loop muted playsinline></video>' +
      '<div class="sharebtns two"><button class="btn" id="clip-share">📤 Share</button><a class="btn ghost" id="clip-save" href="' + url + '" download="' + name + '">💾 Save</a></div>' +
      '<p class="ctrlhint">' + (r.size / 1024 | 0) + ' KB ' + r.ext.toUpperCase() + ' · post it, tag it, brag.</p><button class="link" id="btn-cancel">Close</button>';
    $('modal').classList.remove('hidden');
    $('btn-cancel').onclick = () => $('modal').classList.add('hidden');
    $('clip-share').onclick = async () => {
      try { const f = new File([r.blob], name, { type: r.blob.type }); if (navigator.canShare && navigator.canShare({ files: [f] })) await navigator.share({ files: [f], title: IL.GAME_TITLE, text: IL.GAME_TITLE + ' 🏒 #TopShelf' }); else $('clip-save').click(); } catch (e) {}
    };
    return r;
  }
  return { start, stop, clip, openClip, watermark, get supported() { return supported; }, get recording() { return !!rec; }, lastResult: null };
})();
