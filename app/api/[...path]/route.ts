import { env } from 'cloudflare:workers';
import { handle } from '../../../lib/server.ts';

export const dynamic = 'force-dynamic';
export const GET = (request: Request) => handle(request, env as any);
export const POST = (request: Request) => handle(request, env as any);
