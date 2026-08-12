from pathlib import Path


def append_missing(path: str, entries: list[str]) -> None:
    file = Path(path)
    text = file.read_text()
    if text and not text.endswith('\n'):
        text += '\n'
    for entry in entries:
        line = f'{entry}\n'
        if line not in text:
            text += line
    file.write_text(text)


append_missing('.gitignore', ['test-results/', 'playwright-report/'])
append_missing('.prettierignore', ['test-results/', 'playwright-report/'])
