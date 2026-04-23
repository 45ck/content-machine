import { beforeEach, describe, expect, it, vi } from 'vitest';

const doctorMocks = vi.hoisted(() => ({
  runDoctor: vi.fn(),
}));

vi.mock('../core/doctor', () => ({
  runDoctor: doctorMocks.runDoctor,
}));

import { runDoctorReport } from './doctor-report';

describe('runDoctorReport', () => {
  beforeEach(() => {
    doctorMocks.runDoctor.mockReset();
  });

  it('writes a structured doctor artifact', async () => {
    doctorMocks.runDoctor.mockResolvedValue({
      ok: false,
      strict: true,
      checks: [
        { id: 'one', label: 'One', status: 'ok' },
        { id: 'two', label: 'Two', status: 'warn' },
        { id: 'three', label: 'Three', status: 'fail' },
      ],
    });

    const result = await runDoctorReport({
      strict: true,
      outputPath: 'tests/.tmp/doctor-report/report.json',
    });

    expect(doctorMocks.runDoctor).toHaveBeenCalledWith({ strict: true });
    expect(result.result).toMatchObject({
      ok: false,
      strict: true,
      checks: 3,
      failures: 1,
      warnings: 1,
    });
    expect(result.artifacts).toEqual([
      {
        path: expect.stringContaining('tests/.tmp/doctor-report/report.json'),
        kind: 'file',
        description: 'Doctor report artifact',
      },
    ]);
  });
});
