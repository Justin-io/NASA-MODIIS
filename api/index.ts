import type { Request, Response } from 'express';
import { app, ensureServerInitialized } from '../server/index';

/**
 * Vercel Serverless Function entrypoint.
 * Automatically initializes ledger and transactional state store before processing requests.
 */
export default async function handler(req: Request, res: Response) {
  await ensureServerInitialized();
  return app(req, res);
}

