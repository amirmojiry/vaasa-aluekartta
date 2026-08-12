from pathlib import Path

path = Path('playwright.config.ts')
text = path.read_text()
old = "command: 'npm run preview -- --host 127.0.0.1 --port 4173',"
new = "command: 'npm run preview -- --host 127.0.0.1 --port 4173 --base /vaasa-aluekartta/',"
if old not in text:
    raise SystemExit('Expected Playwright preview command not found')
path.write_text(text.replace(old, new, 1))
