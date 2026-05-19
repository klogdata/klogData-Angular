import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const placeholder = 'YOUR_WEB3FORMS_ACCESS_KEY';

function loadDotEnv() {
  const envPath = join(root, '.env');
  if (!existsSync(envPath)) {
    return {};
  }

  const values = {};
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

function resolveAccessKey() {
  const fileEnv = loadDotEnv();
  return (process.env.VITE_WEB3FORMS_ACCESS_KEY ?? fileEnv.VITE_WEB3FORMS_ACCESS_KEY ?? '').trim();
}

const accessKey = resolveAccessKey();
const outputPath = join(root, 'public', 'web3forms-config.js');
const output = `window.__env__ = Object.assign({}, window.__env__, {
  web3formsAccessKey: ${JSON.stringify(accessKey || placeholder)},
  web3formsEndpoint: 'https://api.web3forms.com/submit',
  web3formsSiteUrl: 'https://web3forms.com/'
});
`;

writeFileSync(outputPath, output, 'utf8');

if (accessKey) {
  console.log('[web3forms] Generated public/web3forms-config.js from VITE_WEB3FORMS_ACCESS_KEY.');
} else {
  console.warn(
    '[web3forms] VITE_WEB3FORMS_ACCESS_KEY is not set. Enquiry form submissions will be disabled until it is configured.',
  );
}
