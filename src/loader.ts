/** Contract loading and validation. */

import { readFileSync } from 'fs';
import { extname } from 'path';
import yaml from 'js-yaml';
import { Contract } from './models.js';
import { ContractLoadError } from './exceptions.js';

export function loadContract(filePath: string): Contract {
  const ext = extname(filePath).toLowerCase();
  if (!['.yaml', '.yml', '.json'].includes(ext)) {
    throw new ContractLoadError(
      `Unsupported file format: ${ext}. Use .contract.yaml or .contract.json`
    );
  }

  let raw: string;
  try {
    raw = readFileSync(filePath, 'utf-8');
  } catch {
    throw new ContractLoadError(`Contract file not found: ${filePath}`);
  }

  let data: unknown;
  try {
    data = ext === '.json' ? JSON.parse(raw) : yaml.load(raw);
  } catch (e) {
    throw new ContractLoadError(`Failed to parse contract file: ${e}`);
  }

  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new ContractLoadError('Contract file must be a YAML/JSON object at the root level.');
  }

  const result = Contract.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new ContractLoadError(`Contract schema validation failed:\n${issues}`);
  }

  return result.data;
}
