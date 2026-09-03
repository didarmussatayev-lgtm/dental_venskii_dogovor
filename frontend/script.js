// BACKEND_URL is defined in config.js — change it to your deployed FastAPI URL

// Procedure identifiers — must exactly match the <option value="..."> in index.html
// and the keys of PROCEDURE_TEMPLATES / the constants in models.py on the backend.
const GENERAL_CONTRACT_PROCEDURE = 'Общий - Договор общий';
const ORTHO_PROCEDURE = 'Ортопедия - Договор на ортопедию';
const IMPLANT_CONTRACT_PROCEDURE = 'Имплантация - Договор на имплантацию';
const IMPLANT_ADDENDUM_PROCEDURE = 'Имплантация - Дополнительное соглашение на имплантацию';

const IMPLANT_PROCEDURES = new Set([IMPLANT_CONTRACT_PROCEDURE, IMPLANT_ADDENDUM_PROCEDURE]);

// id_number is printed on the implant templates AND on the orthopedics contract.
const ID_NUMBER_REQUIRED_PROCEDURES = new Set([...IMPLANT_PROCEDURES, ORTHO_PROCEDURE]);

// adress is printed on the implant templates AND on the general contract.
const ADDRESS_REQUIRED_PROCEDURES = new Set([...IMPLANT_PROCEDURES, GENERAL_CONTRACT_PROCEDURE]);

// date_of_birth is printed for the patient themselves (not just for a child/ward)
// on these two templates, regardless of who is signing.
const DOB_ALWAYS_REQUIRED_PROCEDURES = new Set([GENERAL_CONTRACT_PROCEDURE, IMPLANT_ADDENDUM_PROCEDURE]);

const CHILD_DEGREE_VALUES = new Set([
  'на моего ребенка',
  'на лицо, чьим законным представителем я являюсь',
]);

let currentStep = 1;
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

  document.getElementById('consentCheckbox')?.addEventListener('change', () => setError('consent-error', ''));

  document.getElementById('consentForm')?.addEventListener('submit', handleSubmit);
}

function resetWizardState() {
  currentStep = 1;
  document.getElementById('consentForm')?.reset();
  clearSignature();
  document.getElementById('errorMessage').style.display = 'none';
  document.getElementById('errorMessage').textContent = '';
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

function getSelectedProcedure() {
  return document.getElementById('procedure')?.value ?? '';
}

function toggleChildFields() {
  const show = isChildFlow();
  document.getElementById('childFields').style.display = show ? 'block' : 'none';
}

function toggleDynamicStep3Fields() {
  const procedure = getSelectedProcedure();
  const childFlow = isChildFlow();

  const showIdNumber = ID_NUMBER_REQUIRED_PROCEDURES.has(procedure);
  const showImplantOnly = IMPLANT_PROCEDURES.has(procedure);
  const showAddress = ADDRESS_REQUIRED_PROCEDURES.has(procedure);
  const showPatientBirthDate = DOB_ALWAYS_REQUIRED_PROCEDURES.has(procedure) && !childFlow;
  const showGeneralContract = procedure === GENERAL_CONTRACT_PROCEDURE;

  document.getElementById('idNumberField').style.display = showIdNumber ? 'block' : 'none';
  document.getElementById('implantOnlyFields').style.display = showImplantOnly ? 'block' : 'none';
  document.getElementById('addressField').style.display = showAddress ? 'block' : 'none';
  document.getElementById('patientBirthDateField').style.display = showPatientBirthDate ? 'block' : 'none';
  document.getElementById('generalContractFields').style.display = showGeneralContract ? 'block' : 'none';

  if (!showIdNumber) setFieldError('idNumber', 'id-number-error', '');
  if (!showImplantOnly) {
    setFieldError('idAuthority', 'id-authority-error', '');
    setFieldError('idIssueDate', 'id-issue-date-error', '');
  }
  if (!showAddress) setFieldError('address', 'address-error', '');
  if (!showPatientBirthDate) setFieldError('selfBirthDate', 'self-birth-date-error', '');
  if (!showGeneralContract) {
    setFieldError('degreeOfKinshipMotherFatherGuardin', 'degree-of-kinship-mother-father-guardin-error', '');
    setError('contact-1-error', '');
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

  const procedure = getSelectedProcedure();
  const childFlow = isChildFlow();

  let idNumberOk = true;
  if (ID_NUMBER_REQUIRED_PROCEDURES.has(procedure)) {
    const idNumber = document.getElementById('idNumber')?.value.trim() ?? '';
    if (!/^\d{9}$/.test(idNumber)) {
      setFieldError('idNumber', 'id-number-error', 'ID номер должен содержать 9 цифр');
      idNumberOk = false;
    } else {
      setFieldError('idNumber', 'id-number-error', '');
    }
  } else {
    setFieldError('idNumber', 'id-number-error', '');
  }

  let implantOnlyOk = true;
  if (IMPLANT_PROCEDURES.has(procedure)) {
    const idAuthority = document.getElementById('idAuthority')?.value.trim() ?? '';
    if (!idAuthority) {
      setFieldError('idAuthority', 'id-authority-error', 'Введите орган выдачи');
      implantOnlyOk = false;
    } else {
      setFieldError('idAuthority', 'id-authority-error', '');
    }

    if (!validateDateById('idIssueDate', 'id-issue-date-error')) implantOnlyOk = false;
  } else {
    setFieldError('idAuthority', 'id-authority-error', '');
    setFieldError('idIssueDate', 'id-issue-date-error', '');
  }

  let addressOk = true;
  if (ADDRESS_REQUIRED_PROCEDURES.has(procedure)) {
    const address = document.getElementById('address')?.value.trim() ?? '';
    if (!address) {
      setFieldError('address', 'address-error', 'Введите адрес проживания');
      addressOk = false;
    } else {
      setFieldError('address', 'address-error', '');
    }
  } else {
    setFieldError('address', 'address-error', '');
  }

  let selfBirthDateOk = true;
  if (DOB_ALWAYS_REQUIRED_PROCEDURES.has(procedure) && !childFlow) {
    if (!validateDateById('selfBirthDate', 'self-birth-date-error')) selfBirthDateOk = false;
  } else {
    setFieldError('selfBirthDate', 'self-birth-date-error', '');
  }

  let generalContractOk = true;
  if (procedure === GENERAL_CONTRACT_PROCEDURE) {
    const relation = document.getElementById('degreeOfKinshipMotherFatherGuardin')?.value.trim() ?? '';
    if (!relation) {
      setFieldError(
        'degreeOfKinshipMotherFatherGuardin',
        'degree-of-kinship-mother-father-guardin-error',
        'Укажите отношение к пациенту'
      );
      generalContractOk = false;
    } else {
      setFieldError('degreeOfKinshipMotherFatherGuardin', 'degree-of-kinship-mother-father-guardin-error', '');
    }

    const contact1Name = document.getElementById('contactNameSurname1')?.value.trim() ?? '';
    const contact1PhoneOk = validatePhoneById('contactPhones1', 'contact-1-error', true);
    if (!contact1Name) {
      setError('contact-1-error', 'Укажите ФИО контактного лица');
      generalContractOk = false;
    } else if (!contact1PhoneOk) {
      generalContractOk = false;
    } else {
      setError('contact-1-error', '');
    }
  } else {
    setFieldError('degreeOfKinshipMotherFatherGuardin', 'degree-of-kinship-mother-father-guardin-error', '');
    setError('contact-1-error', '');
  }

  const consentChecked = document.getElementById('consentCheckbox')?.checked ?? false;
  setError('consent-error', consentChecked ? '' : 'Необходимо дать согласие на обработку персональных данных');

  setError('signature-error', hasSignature ? '' : 'Нарисуйте подпись');

  return !!(
    allergy &&
    idNumberOk &&
    implantOnlyOk &&
    addressOk &&
    selfBirthDateOk &&
    generalContractOk &&
    consentChecked &&
    hasSignature
  );
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
  ctx.strokeStyle = '#1E4FA3';
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
  const procedure = getSelectedProcedure();
  const isGeneralContract = procedure === GENERAL_CONTRACT_PROCEDURE;
  const isImplant = IMPLANT_PROCEDURES.has(procedure);
  const needsIdNumber = ID_NUMBER_REQUIRED_PROCEDURES.has(procedure);
  const needsAddress = ADDRESS_REQUIRED_PROCEDURES.has(procedure);
  const needsSelfBirthDate = DOB_ALWAYS_REQUIRED_PROCEDURES.has(procedure) && !childFlow;

  let dateOfBirth = null;
  if (childFlow) {
    dateOfBirth = document.getElementById('childBirthDate').value;
  } else if (needsSelfBirthDate) {
    dateOfBirth = document.getElementById('selfBirthDate').value;
  }

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
    date_of_birth: dateOfBirth,
    id_number: needsIdNumber ? document.getElementById('idNumber').value.trim() : '',
    id_authority: isImplant ? document.getElementById('idAuthority').value.trim() : '',
    id_date_of_issue: isImplant ? document.getElementById('idIssueDate').value : null,
    adress: needsAddress ? document.getElementById('address').value.trim() : '',
    degree_of_kinship_mother_father_guardin: isGeneralContract
      ? document.getElementById('degreeOfKinshipMotherFatherGuardin').value.trim()
      : '',
    contact_name_surname_1: isGeneralContract ? document.getElementById('contactNameSurname1').value.trim() : '',
    contact_phones_1: isGeneralContract ? document.getElementById('contactPhones1').value.trim() : '',
    contact_name_surname_2: isGeneralContract ? document.getElementById('contactNameSurname2').value.trim() : '',
    contact_phones_2: isGeneralContract ? document.getElementById('contactPhones2').value.trim() : '',
    contact_name_surname_3: isGeneralContract ? document.getElementById('contactNameSurname3').value.trim() : '',
    contact_phones_3: isGeneralContract ? document.getElementById('contactPhones3').value.trim() : '',
    photo_video_consent: isGeneralContract ? (document.getElementById('photoVideoConsent')?.checked ?? false) : false,
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
