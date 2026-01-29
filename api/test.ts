import type { VercelRequest, VercelResponse } from '@vercel/node';
import { DICT_A1_A2 } from './_dict';

export const config = {
  runtime: 'nodejs',
};

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ ok: true, dictSize: Object.keys(DICT_A1_A2).length });
}
