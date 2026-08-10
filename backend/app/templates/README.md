# DOCX template files

Place template binaries in this directory:

- `soglasie_template_general.docx`
- `soglasie_template_invasia.docx`
- `soglasie_template_pregnant.docx`

Generation rules:

- `general` and `invasia` are always generated
- `pregnant` is generated only when `gender=female`

Supported placeholders (recommended):

- `{{ agreement_id }}`
- `{{ date }}` / `{{date}}`
- `{{ full_name }}`
- `{{ birth_date }}`
- `{{ phone }}`
- `{{ iin }}`
- `{{ gender }}`
- `{{ allergy }}`
- `{{ procedure }}`
- `{{ signature }}`

`{{ signature }}` is rendered as an inline PNG image.

Legacy compatibility:

- Existing templates with `{{Дата рождения}}` and `{{пол}}` are auto-normalized on render.
- New templates should use only ASCII/underscore variable names (example: `birth_date`, `gender`) to avoid Jinja parse errors.
