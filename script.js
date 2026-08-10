// BACKEND_URL is defined in config.js — change it to your deployed FastAPI URL

let canvas, ctx;
let isDrawing = false;
let hasSignature = false;

document.addEventListener('DOMContentLoaded', () => {
  initCanvas();
  initFormListeners();
  updateSubmitState();
});

// ─── Canvas / Signature ───────────────────────────────────────────────────────

function initCanvas() {
  canvas = document.getElementById('signatureCanvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  canvas.addEventListener('mousedown', startDraw);
  canvas.addEventListener('mousemove', continueDraw);
  canvas.addEventListener('mouseup', endDraw);
  canvas.addEventListener('mouseleave', endDraw);

  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvas.addEventListener('touchend', endDraw);

  document.getElementById('clearSignature')?.addEventListener('click', clearSignature);
}

function resizeCanvas() {
  if (!canvas || !ctx) return;
  // Preserve drawn content through resize
  const imgData = hasSignature ? ctx.getImageData(0, 0, canvas.width, canvas.height) : null;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
  setCtxStyle();
  if (imgData) ctx.putImageData(imgData, 0, 0);
}

function setCtxStyle() {
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

function startDraw(e) {
  isDrawing = true;
  const { x, y } = getPos(e);
  ctx.beginPath();
  ctx.moveTo(x, y);
}

function continueDraw(e) {
  if (!isDrawing) return;
  const { x, y } = getPos(e);
  ctx.lineTo(x, y);
  ctx.stroke();
  if (!hasSignature) {
    hasSignature = true;
    canvas.classList.add('has-signature');
    updateSubmitState();
  }
}

function endDraw() { isDrawing = false; }

function handleTouchStart(e) {
  e.preventDefault();
  const t = e.touches[0];
  startDraw({ clientX: t.clientX, clientY: t.clientY });
}

function handleTouchMove(e) {
  e.preventDefault();
  const t = e.touches[0];
  continueDraw({ clientX: t.clientX, clientY: t.clientY });
}

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function clearSignature() {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  hasSignature = false;
  canvas.classList.remove('has-signature');
  setError('signature-error', '');
  updateSubmitState();
}

function getSignatureBase64() {
  return canvas.toDataURL('image/png');
}

// ─── Form state ───────────────────────────────────────────────────────────────

function initFormListeners() {
  document.getElementById('phone')?.addEventListener('input', handlePhoneInput);
  document.getElementById('iin')?.addEventListener('input', handleIINInput);
  document.getElementById('fio')?.addEventListener('input', () => { validateFIO(); updateSubmitState(); });
  document.getElementById('allergy')?.addEventListener('input', () => { validateAllergy(); updateSubmitState(); });
  document.getElementById('consentCheckbox')?.addEventListener('change', () => {
    setError('consent-error', '');
    updateSubmitState();
  });
  document.getElementById('consentForm')?.addEventListener('submit', handleSubmit);
}

function updateSubmitState() {
  const btn = document.getElementById('submitBtn');
  if (!btn) return;
  const consentChecked = document.getElementById('consentCheckbox')?.checked ?? false;
  btn.disabled = !(consentChecked && hasSignature);
}

// ─── Validation ───────────────────────────────────────────────────────────────

function setError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}

function setFieldError(inputId, errorId, msg) {
  const input = document.getElementById(inputId);
  const error = document.getElementById(errorId);
  if (input) input.classList.toggle('error', !!msg);
  if (error) error.textContent = msg;
}

function validateFIO() {
  const val = document.getElementById('fio')?.value.trim() ?? '';
  if (!val) { setFieldError('fio', 'fio-error', 'Введите ФИО'); return false; }
  const ok = /^[А-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі\s\-]+$/.test(val);
  setFieldError('fio', 'fio-error', ok ? '' : 'ФИО должно содержать только кириллические буквы');
  return ok;
}

function validatePhone() {
  const val = document.getElementById('phone')?.value.trim() ?? '';
  if (!val) { setFieldError('phone', 'phone-error', 'Введите телефон'); return false; }
  // Accept +7 (7XX) XXX-XX-XX — after stripping formatting: +7 + 10 digits starting with 7
  const digits = val.replace(/\D/g, '');
  const ok = /^77\d{9}$/.test(digits);
  setFieldError('phone', 'phone-error', ok ? '' : 'Формат: +7 (7XX) XXX-XX-XX');
  return ok;
}

function validateIIN() {
  const val = document.getElementById('iin')?.value.trim() ?? '';
  if (!val) { setFieldError('iin', 'iin-error', 'Введите ИИН'); return false; }
  const ok = /^\d{12}$/.test(val);
  setFieldError('iin', 'iin-error', ok ? '' : 'ИИН должен содержать ровно 12 цифр');
  return ok;
}

function validateAllergy() {
  const val = document.getElementById('allergy')?.value.trim() ?? '';
  if (!val) { setFieldError('allergy', 'allergy-error', 'Заполните поле или напишите НЕТ'); return false; }
  setFieldError('allergy', 'allergy-error', '');
  return true;
}

function validateConsent() {
  const checked = document.getElementById('consentCheckbox')?.checked ?? false;
  setError('consent-error', checked ? '' : 'Необходимо дать согласие на обработку персональных данных');
  return checked;
}

function validateSignature() {
  setError('signature-error', hasSignature ? '' : 'Нарисуйте подпись');
  return hasSignature;
}

function validateAll() {
  const a = validateFIO();
  const b = validatePhone();
  const c = validateIIN();
  const d = validateAllergy();
  const e = validateConsent();
  const f = validateSignature();
  return a && b && c && d && e && f;
}

// ─── Phone mask ───────────────────────────────────────────────────────────────

function handlePhoneInput(e) {
  const input = e.target;
  let digits = input.value.replace(/\D/g, '');

  // Normalize: remove leading 8 or 7, keep Kazakh mobile prefix (7XX)
  if (digits.startsWith('8')) digits = '7' + digits.slice(1);
  if (digits.startsWith('77') && digits.length > 11) digits = digits.slice(0, 11);
  if (!digits.startsWith('7')) digits = '7' + digits;
  digits = digits.slice(0, 11);

  let formatted = '+7';
  if (digits.length > 1) formatted += ' (' + digits.slice(1, Math.min(4, digits.length));
  if (digits.length >= 4) formatted += ') ' + digits.slice(4, Math.min(7, digits.length));
  if (digits.length >= 7) formatted += '-' + digits.slice(7, Math.min(9, digits.length));
  if (digits.length >= 9) formatted += '-' + digits.slice(9, 11);

  input.value = formatted;
  if (digits.length >= 2) validatePhone();
  updateSubmitState();
}

function handleIINInput(e) {
  const input = e.target;
  input.value = input.value.replace(/\D/g, '').slice(0, 12);
  if (input.value.length > 0) validateIIN();
  updateSubmitState();
}

// ─── Submit ───────────────────────────────────────────────────────────────────

async function handleSubmit(e) {
  e.preventDefault();
  if (!validateAll()) return;

  const submitBtn = document.getElementById('submitBtn');
  const errorBox = document.getElementById('errorMessage');
  errorBox.style.display = 'none';

  submitBtn.disabled = true;

  const payload = {
    full_name: document.getElementById('fio').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    iin: document.getElementById('iin').value.trim(),
    allergy: document.getElementById('allergy').value.trim(),
    signature_base64: getSignatureBase64(),
  };

  showModal();

  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/agreements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let detail = `Ошибка сервера (${response.status})`;
      try {
        const data = await response.json();
        if (data.detail) detail = data.detail;
      } catch (_) {}
      throw new Error(detail);
    }

    // Download the PDF blob
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const disposition = response.headers.get('Content-Disposition') ?? '';
    const match = disposition.match(/filename[^;=\n]*=(['"]?)([^'";\n]+)\1/);
    a.download = match ? match[2] : 'soglasie.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

  } catch (err) {
    console.error(err);
    errorBox.textContent = err.message || 'Произошла неизвестная ошибка. Попробуйте ещё раз.';
    errorBox.style.display = 'block';
    submitBtn.disabled = false;
    updateSubmitState();
  } finally {
    hideModal();
  }
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function showModal() {
  document.getElementById('loadingModal').style.display = 'flex';
}

function hideModal() {
  document.getElementById('loadingModal').style.display = 'none';
}
