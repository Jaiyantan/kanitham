import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await query(`SELECT * FROM app_settings ORDER BY key ASC`);
    const settingsMap: Record<string, any> = {};
    for (const row of res.rows) {
      settingsMap[row.key] = row.value;
    }
    return NextResponse.json({ settings: settingsMap, raw: res.rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json(); // Map of key -> value

    for (const [key, value] of Object.entries(body)) {
      await query(
        `
        INSERT INTO app_settings (key, value, updated_at)
        VALUES ($1, $2, now())
        ON CONFLICT (key) DO UPDATE 
        SET value = $2, updated_at = now();
        `,
        [key, JSON.stringify(value)]
      );
    }

    return NextResponse.json({ success: true, updated: Object.keys(body) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

