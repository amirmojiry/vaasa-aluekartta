from pathlib import Path

path = Path('vite.config.ts')
text = path.read_text()
text = text.replace(
    "import { defineConfig } from 'vitest/config'",
    "import { configDefaults, defineConfig } from 'vitest/config'",
    1,
)
text = text.replace(
    "    globals: true,\n",
    "    globals: true,\n    exclude: [...configDefaults.exclude, 'e2e/**'],\n",
    1,
)
path.write_text(text)
