import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { secret, format } = req.query;

  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const raw = await kv.lrange('waitlist:emails', 0, -1);
    const entries = raw.map((item) => {
      try {
        return typeof item === 'string' ? JSON.parse(item) : item;
      } catch {
        return { email: String(item), submittedAt: null };
      }
    });

    if (format === 'csv') {
      const csv = [
        'email,submittedAt',
        ...entries.map((e) => `${e.email},${e.submittedAt || ''}`),
      ].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="waitlist.csv"');
      return res.status(200).send(csv);
    }

    return res.status(200).json({ count: entries.length, entries });
  } catch (err) {
    console.error('Emails fetch error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}
