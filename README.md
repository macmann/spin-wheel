# codex-project (Minimal Node.js Starter)

> ⚠️ Note: OpenAI **Codex** models (e.g., `code-davinci-002`) have been **retired**.  
> Use modern GPT models (e.g., `gpt-4o-mini`) for code generation.

## Quick Start

1) Install deps
```bash
npm install
```

2) Set your API key
```bash
cp .env.example .env
# put your key in .env as OPENAI_API_KEY=sk-...
```

3) Run a sample generation
```bash
npm start
# or provide your own prompt:
npm run gen -- "Write a Python function that checks if a string is a palindrome."
```

## Spin Wheel UI

Static pages for a 10‑segment spin wheel and admin panel live in `public/`.

- Open `public/index.html` to view and spin the wheel.
- Use the “Go to Admin Panel” button to edit segment labels (stored in `localStorage`).

### AdSense Configuration

- Open `admin.html` and enter your **AdSense Client ID** and **ad unit IDs** under **AdSense Settings**.
- The main `index.html` page reads these values from `localStorage`, so no ad keys are hard‑coded in the HTML.

## Files
```
codex-project/
├── src/
│   └── index.js         # Entrypoint: sends a coding prompt to OpenAI and prints the result
├── .env.example         # Template for environment variables
├── .gitignore
├── package.json
└── README.md
```

## Git: init and push
```bash
git init
git add .
git commit -m "Initial commit: minimal OpenAI codegen project"
git branch -M main
git remote add origin https://github.com/<your-username>/codex-project.git
git push -u origin main
```

## Security
- **Never commit `.env`**. Your secret key must remain local.
- Consider using a `.env` per environment and GitHub Actions secrets for CI.

## License
MIT (replace or remove as needed)
