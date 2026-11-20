import { AdminRepository } from './admin.repository';

describe('AdminRepository driver account status', () => {
  it('creates driver users as pending so credentials cannot be used before approval', async () => {
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: 7 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: 'driver-user-1' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }),
    };
    const db = {
      transaction: jest.fn(async (work: (tx: any) => Promise<any>) => work(client)),
    };
    const repo = new AdminRepository(db as any);

    const result = await repo.createDriverAccount({
      fullName: 'Test Driver',
      phone: '+967777000000',
      email: null,
      passwordHash: 'hashed-password',
      vehicleType: 'motorcycle',
      vehiclePlate: null,
      zoneId: null,
      actorId: 'admin-1',
      actorRole: 'superAdmin',
    });

    expect(result.userId).toBe('driver-user-1');
    expect(String(client.query.mock.calls[1][0])).toContain("VALUES ($1, $2, $3, $4, 'pending', 'ar')");
  });

  it('updates driver and login-user statuses in one transaction', async () => {
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ status: 'active' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: 'driver-user-1' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }),
    };
    const db = {
      transaction: jest.fn(async (work: (tx: any) => Promise<any>) => work(client)),
    };
    const repo = new AdminRepository(db as any);

    await expect(repo.updateDriverStatus('driver-user-1', 'suspended')).resolves.toBe(true);

    expect(String(client.query.mock.calls[0][0])).toContain('FOR UPDATE');
    expect(String(client.query.mock.calls[1][0])).toContain('UPDATE drivers');
    expect(String(client.query.mock.calls[2][0])).toContain('UPDATE users');
    expect(String(client.query.mock.calls[3][0])).toContain('INSERT INTO audit_logs');
    expect(client.query.mock.calls[1][1]).toEqual(['suspended', 'driver-user-1']);
    expect(client.query.mock.calls[2][1]).toEqual(['suspended', 'driver-user-1']);
    expect(JSON.parse(client.query.mock.calls[3][1][3])).toEqual({ status: 'active' });
    expect(JSON.parse(client.query.mock.calls[3][1][4])).toEqual({ status: 'suspended' });
  });

  it('does not change the login user when no driver profile exists', async () => {
    const client = {
      query: jest.fn().mockResolvedValueOnce({ rows: [], rowCount: 0 }),
    };
    const db = {
      transaction: jest.fn(async (work: (tx: any) => Promise<any>) => work(client)),
    };
    const repo = new AdminRepository(db as any);

    await expect(repo.updateDriverStatus('missing-driver', 'active')).resolves.toBe(false);
    expect(client.query).toHaveBeenCalledTimes(1);
  });
});
