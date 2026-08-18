// BACKEND_URL is defined in config.js — change it to your deployed FastAPI URL

const SEDATION_PROCEDURE = 'Терапия - лечение под седацией (севоран)';
const IMPLANT_PROCEDURES = new Set([
  'Имплантация - Договор на имплантацию',
  'Имплантация - Дополнительное соглашение к договору имплантации о гарантии',
]);
const CHILD_DEGREE_VALUES = new Set([
  'на моего ребенка',
  'на лицо, чьим законным представителем я являюсь',
]);

let currentStep = 1;
let visibleContacts = 1;
let canvas;
let ctx;
let isDrawing = false;
let hasSignature = false;

document.addEventListener('DOMContentLoaded', () => {
  initModal();
  initCanvas();
  initListeners();
  showStep(1);
});

function initModal() {
  const startBtn = document.getElementById('startBtn');
  const closeBtn = document.getElementById('closeModal');
  const modal = document.getElementById('formModal');

  startBtn?.addEventListener('click', () => {
    resetWizardState();
    modal.style.display = 'flex';
    showStep(1);
    resizeCanvas();
  });

  closeBtn?.addEventListener('click', () => {
    modal.style.display = 'none';
  });
}

function initListeners() {
  document.getElementById('nextStep1')?.addEventListener('click', () => {
    if (!validateStep1()) return;
    showStep(2);
  });

  document.getElementById('nextStep2')?.addEventListener('click', () => {
    if (!validateStep2()) return;
    showStep(3);
  });

  document.getElementById('backStep2')?.addEventListener('click', () => showStep(1));
  document.getElementById('backStep3')?.addEventListener('click', () => showStep(2));

  document.querySelectorAll('input[name="degreeOfKinship"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      toggleChildFields();
      toggleDynamicStep3Fields();
      setError('degree-of-kinship-error', '');
    });
  });

  document.getElementById('procedure')?.addEventListener('change', () => {
    setFieldError('procedure', 'procedure-error', '');
    toggleDynamicStep3Fields();
  });

  document.getElementById('iin')?.addEventListener('input', handleIINInput);
  document.getElementById('idNumber')?.addEventListener('input', handleIdNumberInput);

  document.querySelectorAll('.phone-input').forEach((input) => {
    input.addEventListener('input', handlePhoneInput);
  });

  document.getElementById('addContactBtn')?.addEventListener('click', addContact);
  document.getElementById('consentCheckbox')?.addEventListener('change', () => setError('consent-error', ''));

  document.getElementById('consentForm')?.addEventListener('submit', handleSubmit);
}

function resetWizardState() {
  currentStep = 1;
  visibleContacts = 1;
  document.getElementById('consentForm')?.reset();
  clearSignature();
  document.getElementById('errorMessage').style.display = 'none';
  document.getElementById('errorMessage').textContent = '';
  document.getElementById('addContactBtn').style.display = 'inline-block';
  document.querySelectorAll('.contact-row[data-contact="2"], .contact-row[data-contact="3"]').forEach((row) => {
    row.style.display = 'none';
  });
  toggleChildFields();
  toggleDynamicStep3Fields();
}

function showStep(step) {
  currentStep = step;
  const title = document.getElementById('stepTitle');
  document.getElementById('step1').style.display = step === 1 ? 'block' : 'none';
  document.getElementById('step2').style.display = step === 2 ? 'block' : 'none';
  document.getElementById('step3').style.display = step === 3 ? 'block' : 'none';

  if (step === 1) title.textContent = 'Шаг 1: Выбор типа согласия';
  if (step === 2) title.textContent = 'Шаг 2: Выбор услуги';
  if (step === 3) title.textContent = 'Шаг 3: Данные и подпись';

  if (step === 3) {
    toggleDynamicStep3Fields();
    resizeCanvas();
  }
}

function getSelectedDegreeOfKinship() {
  return document.querySelector('input[name="degreeOfKinship"]:checked')?.value ?? '';
}

function isChildFlow() {
  return CHILD_DEGREE_VALUES.has(getSelectedDegreeOfKinship());
}

function toggleChildFields() {
  const show = isChildFlow();
  document.getElementById('childFields').style.display = show ? 'block' : 'none';
}

function toggleDynamicStep3Fields() {
  const procedure = document.getElementById('procedure')?.value ?? '';
  
  document.getElementById('implantFields').style.display = IMPLANT_PROCEDURES.has(procedure) ? 'block' : 'none';
  document.getElementById('sedationChildFields').style.display = (procedure === SEDATION_PROCEDURE) ? 'block' : 'none';
}

function addContact() {
  if (visibleContacts >= 3) return;
  visibleContacts += 1;
  const row = document.querySelector(`.contact-row[data-contact="${visibleContacts}"]`);
  if (row) row.style.display = 'grid';
  if (visibleContacts >= 3) {
    document.getElementById('addContactBtn').style.display = 'none';
  }
}

function setError(id, message) {
  const el = document.getElementById(id);
  if (el) el.textContent = message;
}

function setFieldError(inputId, errorId, message) {
  const input = document.getElementById(inputId);
  const error = document.getElementById(errorId);
  if (input) input.classList.toggle('error', !!message);
  if (error) error.textContent = message;
}

function validateName(value) {
  return /^[А-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі\s\-]+$/.test(value);
}

function validatePhoneById(inputId, errorId, required = true) {
  const value = document.getElementById(inputId)?.value.trim() ?? '';
  if (!value) {
    setFieldError(inputId, errorId, required ? 'Введите телефон' : '');
    return !required;
  }

  const digits = value.replace(/\D/g, '');
  const ok = /^77\d{9}$/.test(digits);
  setFieldError(inputId, errorId, ok ? '' : 'Формат: +7 (7XX) XXX-XX-XX');
  return ok;
}

function validateDateById(inputId, errorId, required = true) {
  const value = document.getElementById(inputId)?.value ?? '';
  if (!value) {
    setFieldError(inputId, errorId, required ? 'Введите дату' : '');
    return !required;
  }

  const chosen = new Date(value);
  const now = new Date();
  if (Number.isNaN(chosen.getTime()) || chosen > now) {
    setFieldError(inputId, errorId, 'Дата не может быть в будущем');
    return false;
  }

  setFieldError(inputId, errorId, '');
  return true;
}

function validateStep1() {
  const degreeOfKinship = getSelectedDegreeOfKinship();
  if (!degreeOfKinship) setError('degree-of-kinship-error', 'Выберите тип согласия');

  const fio = document.getElementById('fio')?.value.trim() ?? '';
  if (!fio) {
    setFieldError('fio', 'fio-error', 'Введите ФИО');
  } else if (!validateName(fio)) {
    setFieldError('fio', 'fio-error', 'ФИО должно содержать только кириллические буквы');
  } else {
    setFieldError('fio', 'fio-error', '');
  }

  const iin = document.getElementById('iin')?.value.trim() ?? '';
  if (!iin) {
    setFieldError('iin', 'iin-error', 'Введите ИИН');
  } else if (!/^\d{12}$/.test(iin)) {
    setFieldError('iin', 'iin-error', 'ИИН должен содержать 12 цифр');
  } else {
    setFieldError('iin', 'iin-error', '');
  }

  const phoneOk = validatePhoneById('phone', 'phone-error');

  let childOk = true;
  if (isChildFlow()) {
    const childFio = document.getElementById('childFio')?.value.trim() ?? '';
    if (!childFio) {
      setFieldError('childFio', 'child-fio-error', 'Введите ФИО ребенка/подопечного');
      childOk = false;
    } else {
      setFieldError('childFio', 'child-fio-error', '');
    }

    const relationship = document.getElementById('guardianRelationship')?.value ?? '';
    if (!relationship) {
      setFieldError('guardianRelationship', 'guardian-relationship-error', 'Выберите степень родства');
      childOk = false;
    } else {
      setFieldError('guardianRelationship', 'guardian-relationship-error', '');
    }

    if (!validateDateById('childBirthDate', 'child-birth-date-error')) childOk = false;
  } else {
    setFieldError('childFio', 'child-fio-error', '');
    setFieldError('guardianRelationship', 'guardian-relationship-error', '');
    setFieldError('childBirthDate', 'child-birth-date-error', '');
  }

  return !!(degreeOfKinship && fio && /^\d{12}$/.test(iin) && phoneOk && childOk);
}

function validateStep2() {
  const procedure = document.getElementById('procedure')?.value.trim() ?? '';
  if (!procedure) {
    setFieldError('procedure', 'procedure-error', 'Выберите процедуру');
    return false;
  }
  setFieldError('procedure', 'procedure-error', '');
  return true;
}

function validateStep3() {
  const allergy = document.getElementById('allergy')?.value.trim() ?? '';
  if (!allergy) {
    setFieldError('allergy', 'allergy-error', 'Заполните поле или напишите НЕТ');
  } else {
    setFieldError('allergy', 'allergy-error', '');
  }

  const procedure = document.getElementById('procedure')?.value ?? '';

  let implantOk = true;
  if (IMPLANT_PROCEDURES.has(procedure)) {
    const idNumber = document.getElementById('idNumber')?.value.trim() ?? '';
    if (!/^\d{9}$/.test(idNumber)) {
      setFieldError('idNumber', 'id-number-error', 'ID номер должен содержать 9 цифр');
      implantOk = false;
    } else {
      setFieldError('idNumber', 'id-number-error', '');
    }

    const idAuthority = document.getElementById('idAuthority')?.value.trim() ?? '';
    if (!idAuthority) {
      setFieldError('idAuthority', 'id-authority-error', 'Введите орган выдачи');
      implantOk = false;
    } else {
      setFieldError('idAuthority', 'id-authority-error', '');
    }

    if (!validateDateById('idIssueDate', 'id-issue-date-error')) implantOk = false;

    const address = document.getElementById('address')?.value.trim() ?? '';
    if (!address) {
      setFieldError('address', 'address-error', 'Введите адрес проживания');
      implantOk = false;
    } else {
      setFieldError('address', 'address-error', '');
    }
  } else {
    setFieldError('idNumber', 'id-number-error', '');
    setFieldError('idAuthority', 'id-authority-error', '');
    setFieldError('idIssueDate', 'id-issue-date-error', '');
    setFieldError('address', 'address-error', '');
  }

  let sedationOk = true;
  if (procedure === SEDATION_PROCEDURE ) {
    const sedationRelation = document.getElementById('sedationRelation')?.value ?? '';
    if (!sedationRelation) {
      setFieldError('sedationRelation', 'sedation-relation-error', 'Выберите степень родства');
      sedationOk = false;
    } else {
      setFieldError('sedationRelation', 'sedation-relation-error', '');
    }

    const contactName1 = document.getElementById('contactName1')?.value.trim() ?? '';
    if (!contactName1) {
      setFieldError('contactName1', 'contact-name-1-error', 'Введите ФИО контактного лица');
      sedationOk = false;
    } else {
      setFieldError('contactName1', 'contact-name-1-error', '');
    }
    if (!validatePhoneById('contactPhone1', 'contact-phone-1-error')) sedationOk = false;

    for (let i = 2; i <= visibleContacts; i += 1) {
      const nameId = `contactName${i}`;
      const phoneId = `contactPhone${i}`;
      const nameErrorId = `contact-name-${i}-error`;
      const phoneErrorId = `contact-phone-${i}-error`;
      const name = document.getElementById(nameId)?.value.trim() ?? '';
      const phone = document.getElementById(phoneId)?.value.trim() ?? '';
      const filled = !!(name || phone);

      if (filled && !name) {
        setFieldError(nameId, nameErrorId, 'Введите ФИО контактного лица');
        sedationOk = false;
      } else {
        setFieldError(nameId, nameErrorId, '');
      }

      if (filled && !validatePhoneById(phoneId, phoneErrorId, true)) sedationOk = false;
      if (!filled) setFieldError(phoneId, phoneErrorId, '');
    }
  } else {
    setFieldError('sedationRelation', 'sedation-relation-error', '');
    for (let i = 1; i <= 3; i += 1) {
      setFieldError(`contactName${i}`, `contact-name-${i}-error`, '');
      setFieldError(`contactPhone${i}`, `contact-phone-${i}-error`, '');
    }
  }

  const consentChecked = document.getElementById('consentCheckbox')?.checked ?? false;
  setError('consent-error', consentChecked ? '' : 'Необходимо дать согласие на обработку персональных данных');

  setError('signature-error', hasSignature ? '' : 'Нарисуйте подпись');

  return !!(allergy && implantOk && sedationOk && consentChecked && hasSignature);
}

function handlePhoneInput(e) {
  const input = e.target;
  let digits = input.value.replace(/\D/g, '');

  if (digits.startsWith('8')) digits = `7${digits.slice(1)}`;
  if (!digits.startsWith('7')) digits = `7${digits}`;
  digits = digits.slice(0, 11);

  let formatted = '+7';
  if (digits.length > 1) formatted += ` (${digits.slice(1, Math.min(4, digits.length))}`;
  if (digits.length >= 4) formatted += `) ${digits.slice(4, Math.min(7, digits.length))}`;
  if (digits.length >= 7) formatted += `-${digits.slice(7, Math.min(9, digits.length))}`;
  if (digits.length >= 9) formatted += `-${digits.slice(9, 11)}`;

  input.value = formatted;
}

function handleIINInput(e) {
  e.target.value = e.target.value.replace(/\D/g, '').slice(0, 12);
}

function handleIdNumberInput(e) {
  e.target.value = e.target.value.replace(/\D/g, '').slice(0, 9);
}

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

function setCtxStyle() {
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

function resizeCanvas() {
  if (!canvas || !ctx) return;
  const rect = canvas.getBoundingClientRect();
  const snapshot = hasSignature ? ctx.getImageData(0, 0, canvas.width, canvas.height) : null;
  canvas.width = rect.width;
  canvas.height = rect.height;
  setCtxStyle();
  if (snapshot) ctx.putImageData(snapshot, 0, 0);
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
  }
}

function endDraw() {
  isDrawing = false;
}

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
}

function getSignatureBase64() {
  return canvas.toDataURL('image/png');
}

async function handleSubmit(e) {
  e.preventDefault();

  if (!validateStep3()) return;

  const submitBtn = document.getElementById('finishBtn');
  const errorBox = document.getElementById('errorMessage');
  errorBox.style.display = 'none';

  submitBtn.disabled = true;
  showLoadingModal();

  const childFlow = isChildFlow();
  const procedure = document.getElementById('procedure').value.trim();

  const payload = {
    full_name: document.getElementById('fio').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    iin: document.getElementById('iin').value.trim(),
    procedure,
    allergy: document.getElementById('allergy').value.trim(),
    signature_base64: getSignatureBase64(),
    degree_of_kinship: getSelectedDegreeOfKinship(),
    guardian_relationship: childFlow ? document.getElementById('guardianRelationship').value : '',
    name_surname_of_child: childFlow ? document.getElementById('childFio').value.trim() : '',
    name_surname_patient: childFlow ? document.getElementById('childFio').value.trim() : '',
    date_of_birth: childFlow ? document.getElementById('childBirthDate').value : null,
    id_number: IMPLANT_PROCEDURES.has(procedure) ? document.getElementById('idNumber').value.trim() : '',
    id_authority: IMPLANT_PROCEDURES.has(procedure) ? document.getElementById('idAuthority').value.trim() : '',
    id_date_of_issue: IMPLANT_PROCEDURES.has(procedure) ? document.getElementById('idIssueDate').value : null,
    adress: IMPLANT_PROCEDURES.has(procedure) ? document.getElementById('address').value.trim() : '',
    degree_of_kinship_mother_father_guardin: (procedure === SEDATION_PROCEDURE)
      ? document.getElementById('sedationRelation').value
      : '',
    contact_name_surname_1: (procedure === SEDATION_PROCEDURE ) ? document.getElementById('contactName1').value.trim() : '',
    contact_phones_1: (procedure === SEDATION_PROCEDURE ) ? document.getElementById('contactPhone1').value.trim() : '',
    contact_name_surname_2: (procedure === SEDATION_PROCEDURE  && visibleContacts >= 2)
      ? document.getElementById('contactName2').value.trim()
      : '',
    contact_phones_2: (procedure === SEDATION_PROCEDURE  && visibleContacts >= 2)
      ? document.getElementById('contactPhone2').value.trim()
      : '',
    contact_name_surname_3: (procedure === SEDATION_PROCEDURE  && visibleContacts >= 3)
      ? document.getElementById('contactName3').value.trim()
      : '',
    contact_phones_3: (procedure === SEDATION_PROCEDURE  && visibleContacts >= 3)
      ? document.getElementById('contactPhone3').value.trim()
      : '',
  };

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

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const disposition = response.headers.get('Content-Disposition') ?? '';
    const match = disposition.match(/filename[^;=\n]*=(['"]?)([^'";\n]+)\1/);
    a.download = match ? match[2] : 'Vienna_Dental.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error(err);
    errorBox.textContent = err.message || 'Произошла неизвестная ошибка. Попробуйте ещё раз.';
    errorBox.style.display = 'block';
    submitBtn.disabled = false;
  } finally {
    hideLoadingModal();
  }
}

function showLoadingModal() {
  document.getElementById('loadingModal').style.display = 'flex';
}

function hideLoadingModal() {
  document.getElementById('loadingModal').style.display = 'none';
}
