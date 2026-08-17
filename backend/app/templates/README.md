# DOCX template files

Place the procedure-specific template binaries in this directory. Supported procedure labels and current filenames:

- `Хирургия - удаление зуба` → `СОГЛАСИЕ на хирургию удаления зуба.docx` / `СОГЛАСИЕ на хирургию удаление зуба.docx`
- `Терапия - лечение под седацией (севоран)` → `Согласие на седацию.docx` / `согласие на седацию.docx` / `согласие на седацию.doc`
- `Терапия - лечение несовершеннолетних, согласие опекуна` → `Согласие опекуна.docx`
- `Терапия - лечение (взрослые и дети), согласие представителя` → `Согласие опекуна.docx`
- `Имплантация - Договор на имплантацию` → `Договор на имплантацию.docx` / `1. ДОГОВОР на ИМПЛАНТАЦИЮ.docx` / `1. ДОГОВОР на ИМПЛАНТАЦИЮ.doc`
- `Имплантация - Согласие на имплантацию` → `Согласие на имплантацию.docx` / `1.1. СОГЛАСИЕ на имплантацию.docx`
- `Имплантация - Дополнительное соглашение к договору имплантации о гарантии` → `Дополнительное соглашение к договору имплантации о гарантии.docx` / `ДОПОЛНИТЕЛЬНОЕ СОГЛАШЕНИЕ к дговору имплантация о гарантии.docx`
- `Терапия - Согласие на эндодонтическое лечение` → `Согласие на эндодонтическое лечение.docx` / `СОГЛАСИЕ на ЭНДОдонтическое лечение.docx`
- `Терапия - Согласие на лечение кариеса` → `Согласие на лечение кариеса.docx` / `СОГЛАСИЕ на терапию (лечение кариеса).docx`
- `Терапия - Согласие на реставрацию зубов` → `Согласие на реставрацию зубов.docx` / `СОГЛАСИЕ на РЕСТАВРАЦИЮ зубов.docx`
- `Терапия - Согласие на профессиональную чистку` → `Согласие на профессиональную чистку.docx` / `СОГЛАСИЕ на профессиональную ЧИСТКУ.docx`
- `Терапия - Согласие на повторное эндодонтическое вмешательство` → `Согласие на повторное эндодонтическое вмешательство.docx` / `СОГЛАСИЕ на повторное эндодонтическое вмешательство.docx`
- `Терапия - Согласие на глубокий кариес, переходящий в пульпит` → `Согласие на глубокий кариес, переходящий в пульпит.docx` / `СОГЛАСИЕ на глубокий кариес переход в пульпит.docx`

The backend generates exactly one document set for the selected procedure.

Supported placeholders (recommended):

- `{{ agreement_id }}`
- `{{ date }}` / `{{date}}`
- `{{ full_name }}` / `{{ name_surname }}`
- `{{ degree_of_kinship }}`
- `{{ name_surname_of_child }}`
- `{{ name_surname_patient }}`
- `{{ date_of_birth }}` / `{{ birth_date }}`
- `{{ phone }}`
- `{{ iin }}`
- `{{ allergy }}`
- `{{ procedure }}`
- `{{ id_number }}`
- `{{ id_authority }}`
- `{{ id_date_of_issue }}`
- `{{ adress }}`
- `{{ degree_of_kinship_mother_father_guardin }}`
- `{{ contact_name_surname_1 }}` / `{{ contact_phones_1 }}`
- `{{ contact_name_surname_2 }}` / `{{ contact_phones_2 }}`
- `{{ contact_name_surname_3 }}` / `{{ contact_phones_3 }}`
- `{{ full_date }}`
- `{{ signature }}`

`{{ signature }}` is rendered as an inline PNG image.

Legacy compatibility:

- Existing templates with `{{Дата рождения}}` and `{{пол}}` are auto-normalized on render.
- New templates should use only ASCII/underscore variable names (example: `birth_date`, `gender`) to avoid Jinja parse errors.
