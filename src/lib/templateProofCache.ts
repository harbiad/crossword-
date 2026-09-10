import type { PreparedCandidates } from './preparedCandidates';

// Exact serialized canonical membership avoids hash collisions. Clues and input
// ordering cannot affect crossing feasibility. Any added/removed answer creates
// a different key. The caller may insert ONLY complete impossibility proofs.
export function createTemplateProofCache(poolLimit = 4, templateLimit = 1024) {
  const fingerprints = new WeakMap<PreparedCandidates, string>();
  const pools = new Map<string, Set<string>>();
  const fingerprint = (prepared: PreparedCandidates) => {
    let key = fingerprints.get(prepared);
    if (key === undefined) {
      key = JSON.stringify([...new Set(prepared.words.map(w => w.answer))].sort());
      fingerprints.set(prepared, key);
    }
    return key;
  };
  const geometryKey = (template: number[][], direction: 'ltr' | 'rtl') =>
    `${template.length}:${direction}:${template.map(row => row.join('')).join('/')}`;
  return {
    has(prepared: PreparedCandidates, template: number[][], direction: 'ltr' | 'rtl') {
      return pools.get(fingerprint(prepared))?.has(geometryKey(template, direction)) ?? false;
    },
    add(prepared: PreparedCandidates, template: number[][], direction: 'ltr' | 'rtl') {
      const key = fingerprint(prepared);
      let templates = pools.get(key);
      if (!templates) {
        if (pools.size >= poolLimit) pools.delete(pools.keys().next().value!);
        templates = new Set();
        pools.set(key, templates);
      }
      if (templates.size >= templateLimit) templates.delete(templates.values().next().value!);
      templates.add(geometryKey(template, direction));
    },
  };
}
