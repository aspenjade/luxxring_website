import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body || {};

    if (
      !email ||
      typeof email !== 'string' ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const entry = {
      email: email.trim().toLowerCase(),
      submittedAt: new Date().toISOString(),
    };

    // Avoid storing exact duplicates twice
    const existing = await kv.lrange('waitlist:emails', 0, -1);
    const alreadyIn = existing.some((raw) => {
      try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return parsed.email === entry.email;
      } catch {
        return false;
      }
    });

    if (!alreadyIn) {
      await kv.rpush('waitlist:emails', JSON.stringify(entry));
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Subscribe error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
