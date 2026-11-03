import { unlockAudio } from '../audio/context.js';

const EXT = /\.(wav|aiff?|mp3)$/i;
const MIME = /^audio\/(wav|x-wav|wave|vnd\.wave|aiff|x-aiff|mpeg|mp3)$/i;

export function isSupportedFile(file) {
  return !!file && (EXT.test(file.name || '') || MIME.test(file.type || ''));
}

export function mountDropZone(el, { onFile }) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.wav,.aif,.aiff,.mp3,audio/wav,audio/aiff,audio/mpeg';
  input.hidden = true;
  el.appendChild(input);

  let unlocked = false;
  const gesture = () => {
    if (unlocked) return;
    unlocked = true;
    Promise.resolve().then(unlockAudio).catch(() => {});
  };
  const handle = (files) => {
    const f = files && files[0];
    if (isSupportedFile(f)) onFile(f);
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
  return { input };
}
