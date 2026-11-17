# brand/intake (local only)

Made by `brand/scripts/intake.py` from the iCloud library on this PC (`%USERPROFILE%\clinic-library`, catalog.sqlite). Everything
here except this README is gitignored: the folders hold hard links to clinic and patient previews, and `intake.json` /
`QUESTIONS.md` hold patient codes and descriptions. Nothing is uploaded anywhere.

- `product/ before-after/ procedure/ office-team/ event/ other-usable/`: sorted previews (`<catalog row>_<file>.jpg`)
- `intake.json`: one row per kept photo (date, category, what is in it, product / procedure when readable, quality, suggested
  template, what is missing, answers) plus the catalog's 72 before/after pairs
- `QUESTIONS.md`: the one batched list of what is missing. The same list is the Needs info panel on `/brand/ostad/grid`;
  answers typed there save into `intake.json` and survive a re-run of the script.

Re-run: `~/clinic-library/.venv/Scripts/python.exe -I brand/scripts/intake.py`
