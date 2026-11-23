import { GeographyRepository } from './geography.repository';

describe('GeographyRepository verified public geography', () => {
  const db = { query: jest.fn() };
  let repository: GeographyRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    db.query.mockResolvedValue({ rows: [] });
    repository = new GeographyRepository(db as any);
  });

  it('lists only active governorates with complete source provenance', async () => {
    await repository.listGovernorates();
    const sql = db.query.mock.calls[0][0] as string;
    expect(sql).toContain('FROM governorates');
    expect(sql).toContain('is_active = true');
    expect(sql).toContain("NULLIF(BTRIM(source_name), '') IS NOT NULL");
    expect(sql).toContain("NULLIF(BTRIM(source_url), '') IS NOT NULL");
    expect(sql).toContain('source_updated_at IS NOT NULL');
  });

  it('lists administrative districts only when both district and parent governorate are sourced', async () => {
    await repository.listAdministrativeDistricts('governorate-1');
    const sql = db.query.mock.calls[0][0] as string;
    expect(sql).toContain('FROM administrative_districts ad');
    expect(sql).toContain('JOIN governorates g ON g.id = ad.governorate_id');
    expect(sql).toContain('ad.source_updated_at IS NOT NULL');
    expect(sql).toContain('g.source_updated_at IS NOT NULL');
    expect(db.query.mock.calls[0][1]).toEqual(['governorate-1']);
  });

  it('scopes city selection to the requested active, sourced governorate', async () => {
    await repository.listCitiesByGovernorate('governorate-1');
    const [sql, params] = db.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('c.governorate_id = $1');
    expect(sql).toContain('g.is_active = true');
    expect(sql).toContain("NULLIF(BTRIM(g.source_name), '') IS NOT NULL");
    expect(sql).toContain("NULLIF(BTRIM(g.source_url), '') IS NOT NULL");
    expect(sql).toContain('g.source_updated_at IS NOT NULL');
    expect(params).toEqual(['governorate-1']);
  });

  it('does not expose legacy cities without an active, sourced governorate', async () => {
    await repository.listCities();
    await repository.findCity('city-1');
    for (const [sql] of db.query.mock.calls) {
      expect(sql).toContain('JOIN governorates g ON g.id = c.governorate_id');
      expect(sql).toContain('g.is_active = true');
      expect(sql).toContain("NULLIF(BTRIM(g.source_name), '') IS NOT NULL");
      expect(sql).toContain("NULLIF(BTRIM(g.source_url), '') IS NOT NULL");
      expect(sql).toContain('g.source_updated_at IS NOT NULL');
    }
  });

  it('does not expose unverified localities through detail lookups', async () => {
    await repository.findDistrict('district-1');
    await repository.findArea('area-1');
    const districtSql = db.query.mock.calls[0][0] as string;
    const areaSql = db.query.mock.calls[1][0] as string;
    expect(districtSql).toContain("COALESCE(to_jsonb(d)->>'source_status', 'legacy_unverified') IN ('verified', 'community_verified')");
    expect(districtSql).toContain('d.is_active = true');
    expect(areaSql).toContain("COALESCE(to_jsonb(ar)->>'source_status', 'legacy_unverified') IN ('verified', 'community_verified')");
    expect(areaSql).toContain("COALESCE(to_jsonb(d)->>'source_status', 'legacy_unverified') IN ('verified', 'community_verified')");
    expect(areaSql).toContain('ar.is_active = true');
  });

  it('applies the same verification chain to search results', async () => {
    await repository.search('Marib');
    expect(db.query).toHaveBeenCalledTimes(3);
    const sql = db.query.mock.calls.map(([query]) => query as string);
    expect(sql[0]).toContain('JOIN governorates g ON g.id = c.governorate_id');
    expect(sql[1]).toContain("COALESCE(to_jsonb(d)->>'source_status', 'legacy_unverified')");
    expect(sql[2]).toContain("COALESCE(to_jsonb(ar)->>'source_status', 'legacy_unverified')");
    for (const query of sql) {
      expect(query).toContain('g.source_updated_at IS NOT NULL');
    }
  });
});
