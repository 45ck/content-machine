/**
 * Doctor domain types.
 *
 * Doctor reports are intended to be stable for JSON output (`cm doctor --json`).
 */

export type DoctorStatus = 'ok' | 'warn' | 'fail';

export interface DoctorCheck {
  id: string;
  label: string;
  status: DoctorStatus;
  detail?: string;
  fix?: string;
  code?: string;
}

export interface DoctorReport {
  schemaVersion: 1;
  ok: boolean;
  strict: boolean;
  checks: DoctorCheck[];
}
