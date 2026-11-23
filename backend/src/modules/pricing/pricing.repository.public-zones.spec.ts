import { PricingRepository } from './pricing.repository';

describe('PricingRepository public delivery-zone visibility', () => {
  const db = { query: jest.fn() };
  let repository: PricingRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    db.query.mockResolvedValue({ rows: [] });
    repository = new PricingRepository(db as any);
  });

  it('returns a public zone only when active coverage has complete administrator verification', async () => {
    await repository.getActiveVerifiedZoneById('zone-1');
    const [sql, params] = db.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("z.is_active = true AND z.coverage_status = 'verified'");
    expect(sql).toContain('z.coverage_geojson IS NOT NULL');
    expect(sql).toContain('z.coverage_verified_at IS NOT NULL');
    expect(sql).toContain('z.coverage_verified_by IS NOT NULL');
    expect(sql).toContain("length(trim(coalesce(z.coverage_verification_note, ''))) >= 8");
    expect(params).toEqual(['zone-1']);
  });

  it('returns not-found data for legacy/unverified rows rather than exposing old fee fields', async () => {
    db.query.mockResolvedValue({ rows: [] });
    await expect(repository.getActiveVerifiedZoneById('legacy-zone')).resolves.toBeNull();
  });
});
