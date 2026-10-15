import { ServerDiagnosticsController } from './server-diagnostics.controller';

describe('ServerDiagnosticsController', () => {
  it('diagnoses behind the view logs permission', async () => {
    const diagnostics = { diagnose: jest.fn().mockResolvedValue({ problems: [] }) };
    const users = { getRequestUser: jest.fn().mockResolvedValue({ id: 1 }) };
    const accessControl = { assertViewLogs: jest.fn() };
    const controller = new ServerDiagnosticsController(diagnostics as any, users as any, accessControl as any);

    expect(await controller.diagnose({ user: { userId: 1 } }, 'srv')).toEqual({ problems: [] });
    expect(accessControl.assertViewLogs).toHaveBeenCalledWith({ id: 1 }, 'srv');
  });
});
