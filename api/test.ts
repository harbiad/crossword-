import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  runtime: 'nodejs',
};

// Inline test dict
const TEST_DICT: Record<string, string> = {
  HELLO: '\u0645\u0631\u062D\u0628\u0627', // مرحبا in Unicode escapes
};

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ ok: true, dictSize: Object.keys(TEST_DICT).length, sample: TEST_DICT.HELLO });
}
