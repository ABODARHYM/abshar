import { Injectable, NotFoundException } from '@nestjs/common';
import { ErrorCode } from '../../common/error-codes';
import {
  AreaRow,
  CityRow,
  DistrictRow,
  GeographyRepository,
} from './geography.repository';
import {
  AreaResponseDto,
  CityResponseDto,
  DistrictResponseDto,
} from './dto/geography-response.dto';

@Injectable()
export class GeographyService {
  constructor(private readonly repo: GeographyRepository) {}

  async listCities(): Promise<CityResponseDto[]> {
    const rows = await this.repo.listCities();
    return rows.map((c) => this.toCity(c));
  }

  async getCity(id: string): Promise<CityResponseDto> {
    const c = await this.repo.findCity(id);
    if (!c) throw new NotFoundException({ code: ErrorCode.NotFound, message: 'City not found' });
    return this.toCity(c);
  }

  async listDistricts(cityId: string): Promise<DistrictResponseDto[]> {
    const city = await this.repo.findCity(cityId);
    if (!city) throw new NotFoundException({ code: ErrorCode.NotFound, message: 'City not found' });
    const rows = await this.repo.listDistricts(cityId);
    return rows.map((d) => this.toDistrict(d));
  }

  async getDistrict(id: string): Promise<DistrictResponseDto> {
    const d = await this.repo.findDistrict(id);
    if (!d) throw new NotFoundException({ code: ErrorCode.NotFound, message: 'District not found' });
    return this.toDistrict(d);
  }

  async listAreas(districtId: string): Promise<AreaResponseDto[]> {
    const d = await this.repo.findDistrict(districtId);
    if (!d) throw new NotFoundException({ code: ErrorCode.NotFound, message: 'District not found' });
    const rows = await this.repo.listAreas(districtId);
    return rows.map((a) => this.toArea(a));
  }

  async getArea(id: string): Promise<AreaResponseDto> {
    const a = await this.repo.findArea(id);
    if (!a) throw new NotFoundException({ code: ErrorCode.NotFound, message: 'Area not found' });
    return this.toArea(a);
  }

  async search(query: string): Promise<{
    cities: CityResponseDto[];
    districts: DistrictResponseDto[];
    areas: AreaResponseDto[];
  }> {
    const r = await this.repo.search(query);
    return {
      cities: r.cities.map((c) => this.toCity(c)),
      districts: r.districts.map((d) => this.toDistrict(d)),
      areas: r.areas.map((a) => this.toArea(a)),
    };
  }

  private toCity(c: CityRow): CityResponseDto {
    return {
      id: c.id,
      countryCode: c.country_code,
      nameAr: c.name_ar,
      nameEn: c.name_en,
      slug: c.slug,
      latitude: Number(c.latitude),
      longitude: Number(c.longitude),
      timezone: c.timezone,
    };
  }

  private toDistrict(d: DistrictRow): DistrictResponseDto {
    return {
      id: d.id,
      cityId: d.city_id,
      nameAr: d.name_ar,
      nameEn: d.name_en,
      slug: d.slug,
      latitude: d.latitude !== null ? Number(d.latitude) : null,
      longitude: d.longitude !== null ? Number(d.longitude) : null,
    };
  }

  private toArea(a: AreaRow): AreaResponseDto {
    return {
      id: a.id,
      districtId: a.district_id,
      nameAr: a.name_ar,
      nameEn: a.name_en,
      slug: a.slug,
      latitude: a.latitude !== null ? Number(a.latitude) : null,
      longitude: a.longitude !== null ? Number(a.longitude) : null,
    };
  }
}
