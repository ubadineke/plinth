import { NextRequest, NextResponse } from 'next/server';

// Server-side proxy for admin calls. The dashboard's browser code hits this same-origin route
// with no credentials attached; ADMIN_SECRET (no NEXT_PUBLIC_ prefix, so it never reaches the
// client bundle) is attached here before forwarding to the engine.
const ENGINE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:7331';

async function forward(req: NextRequest, path: string[]): Promise<NextResponse> {
  const res = await fetch(`${ENGINE_URL}/admin/${path.join('/')}`, {
    method:  req.method,
    headers: {
      'Content-Type': 'application/json',
      Authorization:  `Bearer ${process.env.ADMIN_SECRET ?? ''}`,
    },
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.text(),
  });

  const body = await res.text();
  return new NextResponse(body, {
    status:  res.status,
    headers: { 'Content-Type': res.headers.get('Content-Type') ?? 'application/json' },
  });
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  return forward(req, params.path);
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return forward(req, params.path);
}
