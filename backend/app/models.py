from __future__ import annotations

import re
from datetime import date

from pydantic import BaseModel, model_validator


CHILD_DEGREE_VALUES = {
    "на моего ребенка",
    "на лицо, чьим законным представителем я являюсь",
}

# Procedure identifiers (must exactly match the <option value="..."> in index.html
# and the keys of PROCEDURE_TEMPLATES in main.py).
GENERAL_CONTRACT_PROCEDURE = "Общий - Договор общий"
ORTHO_PROCEDURE = "Ортопедия - Договор на ортопедию"
IMPLANT_CONTRACT_PROCEDURE = "Имплантация - Договор на имплантацию"
IMPLANT_ADDENDUM_PROCEDURE = "Имплантация - Дополнительное соглашение на имплантацию"

IMPLANT_PROCEDURES = {IMPLANT_CONTRACT_PROCEDURE, IMPLANT_ADDENDUM_PROCEDURE}

# id_number is printed on the implant templates AND on the orthopedics contract
# (which now bundles "Согласие на проведение медицинского вмешательства").
ID_NUMBER_REQUIRED_PROCEDURES = IMPLANT_PROCEDURES | {ORTHO_PROCEDURE}

# adress is printed on the implant templates AND on the general contract.
ADDRESS_REQUIRED_PROCEDURES = IMPLANT_PROCEDURES | {GENERAL_CONTRACT_PROCEDURE}

# date_of_birth is printed for the patient themselves (not just for a child/ward)
# on these two templates, regardless of who is signing.
DOB_ALWAYS_REQUIRED_PROCEDURES = {GENERAL_CONTRACT_PROCEDURE, IMPLANT_ADDENDUM_PROCEDURE}


class AgreementRequest(BaseModel):
    full_name: str
    phone: str
    iin: str
    procedure: str
    allergy: str
    signature_base64: str  # data:image/png;base64,... or raw base64

    degree_of_kinship: str = "на себя"
    guardian_relationship: str = ""

    name_surname_of_child: str = ""
    name_surname_patient: str = ""
    date_of_birth: date | None = None

    id_number: str = ""
    id_authority: str = ""
    id_date_of_issue: date | None = None
    adress: str = ""

    # --- Only used by the general contract (bundles the anesthesia/sedation
    # informed-consent form) ---
    degree_of_kinship_mother_father_guardin: str = ""
    contact_name_surname_1: str = ""
    contact_phones_1: str = ""
    contact_name_surname_2: str = ""
    contact_phones_2: str = ""
    contact_name_surname_3: str = ""
    contact_phones_3: str = ""
    photo_video_consent: bool = False

    @model_validator(mode="after")
    def validate_fields(self) -> "AgreementRequest":
        self.full_name = self.full_name.strip()
        if not self.full_name:
            raise ValueError("full_name is required")

        self.phone = self.phone.strip()
        if not re.fullmatch(r"77\d{9}", re.sub(r"\D", "", self.phone)):
            raise ValueError("Phone must match +7 (7XX) XXX-XX-XX format")

        self.iin = self.iin.strip()
        if not re.fullmatch(r"\d{12}", self.iin):
            raise ValueError("IIN must be exactly 12 digits")

        self.procedure = self.procedure.strip()
        if not self.procedure:
            raise ValueError("procedure is required")

        self.allergy = self.allergy.strip()
        if not self.allergy:
            raise ValueError("allergy is required")

        if not self.signature_base64.strip():
            raise ValueError("signature_base64 is required")

        self.degree_of_kinship = self.degree_of_kinship.strip() or "на себя"

        child_flow = self.degree_of_kinship in CHILD_DEGREE_VALUES

        self.name_surname_of_child = self.name_surname_of_child.strip()
        self.name_surname_patient = self.name_surname_patient.strip()
        self.guardian_relationship = self.guardian_relationship.strip()

        if child_flow:
            if not self.name_surname_of_child:
                raise ValueError("name_surname_of_child is required for child/representative flow")
            if not self.name_surname_patient:
                self.name_surname_patient = self.name_surname_of_child
        else:
            self.name_surname_of_child = ""
            self.name_surname_patient = self.full_name
            self.guardian_relationship = ""

        # --- date_of_birth: required for the child/representative flow, AND
        # for procedures whose templates always print the patient's own DOB
        # (general contract, implant warranty addendum) even when signing "на себя" ---
        dob_required = child_flow or self.procedure in DOB_ALWAYS_REQUIRED_PROCEDURES
        if dob_required:
            if self.date_of_birth is None:
                raise ValueError("date_of_birth is required for this procedure")
            if self.date_of_birth > date.today():
                raise ValueError("date_of_birth cannot be in the future")
        else:
            self.date_of_birth = None

        self.id_number = self.id_number.strip()
        self.id_authority = self.id_authority.strip()
        self.adress = self.adress.strip()

        # --- id_number: implant procedures + orthopedics ---
        if self.procedure in ID_NUMBER_REQUIRED_PROCEDURES:
            if not re.fullmatch(r"\d{9}", self.id_number):
                raise ValueError("id_number must be exactly 9 digits")
        else:
            self.id_number = ""

        # --- id_authority / id_date_of_issue: implant procedures only ---
        if self.procedure in IMPLANT_PROCEDURES:
            if not self.id_authority:
                raise ValueError("id_authority is required for implantation procedures")
            if self.id_date_of_issue is None:
                raise ValueError("id_date_of_issue is required for implantation procedures")
            if self.id_date_of_issue > date.today():
                raise ValueError("id_date_of_issue cannot be in the future")
        else:
            self.id_authority = ""
            self.id_date_of_issue = None

        # --- adress: implant procedures + general contract ---
        if self.procedure in ADDRESS_REQUIRED_PROCEDURES:
            if not self.adress:
                raise ValueError("adress is required for this procedure")
        else:
            self.adress = ""

        # --- Anesthesia/sedation informed-consent block: only the general
        # contract bundles this form. ---
        self.degree_of_kinship_mother_father_guardin = self.degree_of_kinship_mother_father_guardin.strip()
        self.contact_name_surname_1 = self.contact_name_surname_1.strip()
        self.contact_phones_1 = self.contact_phones_1.strip()
        self.contact_name_surname_2 = self.contact_name_surname_2.strip()
        self.contact_phones_2 = self.contact_phones_2.strip()
        self.contact_name_surname_3 = self.contact_name_surname_3.strip()
        self.contact_phones_3 = self.contact_phones_3.strip()

        if self.procedure == GENERAL_CONTRACT_PROCEDURE:
            if not self.degree_of_kinship_mother_father_guardin:
                raise ValueError(
                    "degree_of_kinship_mother_father_guardin is required for the general contract"
                )
            if not self.contact_name_surname_1 or not self.contact_phones_1:
                raise ValueError(
                    "at least one emergency contact (name + phone) is required for the general contract"
                )
        else:
            self.degree_of_kinship_mother_father_guardin = ""
            self.contact_name_surname_1 = ""
            self.contact_phones_1 = ""
            self.contact_name_surname_2 = ""
            self.contact_phones_2 = ""
            self.contact_name_surname_3 = ""
            self.contact_phones_3 = ""
            self.photo_video_consent = False

        return self
