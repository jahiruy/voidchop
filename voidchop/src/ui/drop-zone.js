import { unlockAudio } from '../audio/context.js';

const EXT = /\.(wav|aiff?|mp3)$/i;
const MIME = /^audio\/(wav|x-wav|wave|vnd\.wave|aiff|x-aiff|mpeg|mp3)$/i;

export function isSupportedFile(file) {
  return !!file && (EXT.test(file.name || '') || MIME.test(file.type || ''));
}

export function mountDropZone(el, { onFile, onUnsupported } = {}) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.wav,.aif,.aiff,.mp3,audio/wav,audio/aiff,audio/mpeg';
  input.hidden = true;
  const msg = document.createElement('p');
  msg.className = 'vc-drop-msg';
  msg.setAttribute('role', 'status');
  msg.hidden = true;
  el.append(input, msg);
  const setMessage = (text, kind = 'error') => {
    msg.textContent = text || '';
    msg.hidden = !text;
    msg.dataset.kind = kind;
  };

  let unlocked = false;
  const gesture = () => {
    if (unlocked) return;
    unlocked = true;
    Promise.resolve().then(unlockAudio).catch(() => {});
  };
  const handle = (files) => {
    const f = files && files[0];
    if (!f) return;
    if (isSupportedFile(f)) { setMessage(''); onFile?.(f); return; }
    setMessage(`Unsupported file "${f.name || 'unknown'}" — drop a WAV, AIFF, or MP3.`);
    onUnsupported?.(f);
  };

  el.addEventListener('click', (e) => {
    gesture();
    if (e.target !== input) input.click();
  });
  input.addEventListener('change', () => { handle(input.files); input.value = ''; });
  el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add('dragover'); });
  el.addEventListener('dragleave', () => el.classList.remove('dragover'));
  el.addEventListener('drop', (e) => {
    e.preventDefault();
    el.classList.remove('dragover');
    gesture();
    handle(e.dataTransfer && e.dataTransfer.files);
  });
  return { input, setMessage };
}
