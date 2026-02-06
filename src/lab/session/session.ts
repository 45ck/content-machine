import { randomUUID } from 'node:crypto';

export interface LabSession {
  sessionId: string;
  token: string;
  createdAt: string;
}

export function createLabSession(): LabSession {
  return {
    sessionId: `lab_${randomUUID()}`,
    token: `tok_${randomUUID()}`,
    createdAt: new Date().toISOString(),
  };
}
