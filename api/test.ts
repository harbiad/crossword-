import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  runtime: 'nodejs',
};

// Inline dictionary
const DICT_A1_A2: Record<string, string> = {
  FAMILY: '\u0639\u0627\u0626\u0644\u0629',
  FRIEND: '\u0635\u062f\u064a\u0642',
  BOOK: '\u0643\u062a\u0627\u0628',
};

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ ok: true, dictSize: Object.keys(DICT_A1_A2).length });
}
