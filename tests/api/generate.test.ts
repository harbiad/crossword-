import { describe, expect, it } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from '../../api/generate';

async function request(body: unknown, method = 'POST') {
  let status = 0, content = '', contentType = '';
  await handler({ method, body } as VercelRequest, {
    status(value: number) { status = value; return this; },
    setHeader(name: string, value: string) { if (name === 'content-type') contentType = value; return this; },
    send(value: string) { content = value; return this; },
  } as unknown as VercelResponse);
  return { status, contentType, body: JSON.parse(content) };
}

it('preserves method and request validation', async () => {
  expect((await request({}, 'GET')).status).toBe(405);
  for (const body of [{ size: 8, mode: 'en_to_ar', band: 'beginner' },
    { size: 7, mode: 'invalid', band: 'beginner' }, { size: 7, mode: 'en_to_ar', band: 'invalid' }]) {
    expect((await request(body)).status).toBe(400);
  }
});

describe.each([7, 9, 11, 13])('size %i', size => {
  it.each(['en_to_ar', 'ar_to_en'])('returns canonical bounded candidates for %s in every band', async mode => {
    for (const band of ['beginner', 'intermediate', 'advanced']) {
      const result = await request({ size, mode, band });
      expect(result.status).toBe(200);
      expect(result.contentType).toBe('application/json; charset=utf-8');
      const entries = result.body.entries as { answer: string; clue: string }[];
      expect(entries.length).toBeGreaterThanOrEqual(24);
      const expected = mode === 'en_to_ar' ? 2000 : ({ 7: 2000, 9: 4000, 11: 6000, 13: 6000 } as Record<number, number>)[size];
      expect(entries.length).toBe(expected);
      expect(entries.every(p => p.answer.length >= 2 && p.answer.length <= size && p.clue.length > 0)).toBe(true);
      expect(new Set(entries.map(p => `${p.clue}::${p.answer}`)).size).toBe(entries.length);
      if (mode === 'ar_to_en') expect(entries.every(p => /^[A-Z]+$/.test(p.answer))).toBe(true);
      expect(entries.some(p => p.clue.includes('(inverted)'))).toBe(false);
    }
  });
});

it('keeps fresh randomness between otherwise identical New Puzzle requests', async () => {
  const options = { size: 7, mode: 'en_to_ar', band: 'beginner' };
  expect((await request(options)).body).not.toEqual((await request(options)).body);
});
