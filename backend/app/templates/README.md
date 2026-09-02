# DOCX template files

Place the procedure-specific template binaries in this directory. Supported procedure labels and current filenames:

- `Хирургия - удаление зуба` → `СОГЛАСИЕ на хирургию удаление зуба.docx`
- `Ортопедия - Договор на ортопедию` → `1.1 ДОГОВОР ортопедия (2).docx`
- `Имплантация - Договор на имплантацию` → `1. ДОГОВОР на ИМПЛАНТАЦИЮ.doc`
- `Имплантация - Дополнительное соглашение на имплантацию` → `ДОПОЛНИТЕЛЬНОЕ СОГЛАШЕНИЕ к дговору имплантация о гарантии.docx`
- `Терапия - Согласие на местную инъекционную анестезию` → `СОГЛАСИЕ на местную инъекционную АНЕСТЕЗИЮ.docx`
- `Терапия - Согласие на эндодонтическое лечение` → `СОГЛАСИЕ на ЭНДОдонтическое лечение.docx`
- `Терапия - Согласие на лечение кариеса` → `СОГЛАСИЕ на терапию (лечение кариеса).docx`
- `Терапия - Согласие на реставрацию зубов` → `СОГЛАСИЕ на РЕСТАВРАЦИЮ зубов.docx`
- `Терапия - Согласие на профессиональную чистку` → `СОГЛАСИЕ на профессиональную ЧИСТКУ.docx`
- `Терапия - Согласие на повторное эндодонтическое вмешательство` → `СОГЛАСИЕ на повторное эндодонтическое вмешательство.docx`
- `Терапия - Согласие на глубокий кариес, переход в пульпит` → `СОГЛАСИЕ на глубокий кариес переход в пульпит.docx`

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
