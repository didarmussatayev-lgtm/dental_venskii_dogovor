from __future__ import annotations

import re
from datetime import date

from pydantic import BaseModel, model_validator


CHILD_DEGREE_VALUES = {
    "на моего ребенка",
    "на лицо, чьим законным представителем я являюсь",
}
SEDATION_PROCEDURE = "Терапия - лечение под седацией (севоран)"
IMPLANT_PROCEDURES = {
    "Имплантация - Договор на имплантацию",
    "Имплантация - Дополнительное соглашение к договору имплантации о гарантии",
}


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

    degree_of_kinship_mother_father_guardin: str = ""
    contact_name_surname_1: str = ""
    contact_phones_1: str = ""
    contact_name_surname_2: str = ""
    contact_phones_2: str = ""
    contact_name_surname_3: str = ""
    contact_phones_3: str = ""

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
            if self.date_of_birth is None:
                raise ValueError("date_of_birth is required for child/representative flow")
            if self.date_of_birth > date.today():
                raise ValueError("date_of_birth cannot be in the future")
            if not self.name_surname_patient:
                self.name_surname_patient = self.name_surname_of_child
        else:
            # When "на себя" — patient is the consent giver (full_name)
            self.name_surname_of_child = ""
            self.name_surname_patient = self.full_name
            self.date_of_birth = None
            self.guardian_relationship = ""

        self.id_number = self.id_number.strip()
        self.id_authority = self.id_authority.strip()
        self.adress = self.adress.strip()

        if self.procedure in IMPLANT_PROCEDURES:
            if not re.fullmatch(r"\d{9}", self.id_number):
                raise ValueError("id_number must be exactly 9 digits")
            if not self.id_authority:
                raise ValueError("id_authority is required for implantation procedures")
            if self.id_date_of_issue is None:
                raise ValueError("id_date_of_issue is required for implantation procedures")
            if self.id_date_of_issue > date.today():
                raise ValueError("id_date_of_issue cannot be in the future")
            if not self.adress:
                raise ValueError("adress is required for implantation procedures")
        else:
            self.id_number = ""
            self.id_authority = ""
            self.id_date_of_issue = None
            self.adress = ""

        self.degree_of_kinship_mother_father_guardin = self.degree_of_kinship_mother_father_guardin.strip()
        self.contact_name_surname_1 = self.contact_name_surname_1.strip()
        self.contact_phones_1 = self.contact_phones_1.strip()
        self.contact_name_surname_2 = self.contact_name_surname_2.strip()
        self.contact_phones_2 = self.contact_phones_2.strip()
        self.contact_name_surname_3 = self.contact_name_surname_3.strip()
        self.contact_phones_3 = self.contact_phones_3.strip()

        # For SEDATION_PROCEDURE, always require contacts (whether "на себя" or child flow)
        if self.procedure == SEDATION_PROCEDURE:
            if child_flow:
                # When child flow: require degree_of_kinship_mother_father_guardin
                if self.degree_of_kinship_mother_father_guardin not in {"Мать", "Отец", "Опекун"}:
                    raise ValueError(
                        "degree_of_kinship_mother_father_guardin must be one of: Мать, Отец, Опекун"
                    )
            # Always require at least one contact
            if not self.contact_name_surname_1:
                raise ValueError("contact_name_surname_1 is required for sedation procedure")
            if not re.fullmatch(r"77\d{9}", re.sub(r"\D", "", self.contact_phones_1)):
                raise ValueError("contact_phones_1 must match +7 (7XX) XXX-XX-XX format")

            for name, phone, idx in (
                (self.contact_name_surname_2, self.contact_phones_2, 2),
                (self.contact_name_surname_3, self.contact_phones_3, 3),
            ):
                if name or phone:
                    if not name:
                        raise ValueError(f"contact_name_surname_{idx} is required when contact_phones_{idx} is set")
                    if not re.fullmatch(r"77\d{9}", re.sub(r"\D", "", phone)):
                        raise ValueError(f"contact_phones_{idx} must match +7 (7XX) XXX-XX-XX format")
        else:
            # For non-sedation procedures, clear contacts
            self.degree_of_kinship_mother_father_guardin = ""
            self.contact_name_surname_1 = ""
            self.contact_phones_1 = ""
            self.contact_name_surname_2 = ""
            self.contact_phones_2 = ""
            self.contact_name_surname_3 = ""
            self.contact_phones_3 = ""

        return self
