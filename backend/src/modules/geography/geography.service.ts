import { Injectable, NotFoundException } from '@nestjs/common';
import { ErrorCode } from '../../common/error-codes';
import {
  AdministrativeDistrictRow, AreaRow, CityRow, DistrictRow, GeographyRepository, GovernorateRow,
} from './geography.repository';
import {
  AdministrativeDistrictResponseDto, AreaResponseDto, CityResponseDto,
  DistrictResponseDto, GovernorateResponseDto,
} from './dto/geography-response.dto';

@Injectable()
export class GeographyService {
  constructor(private readonly repo: GeographyRepository) {}

  async listGovernorates(): Promise<GovernorateResponseDto[]> {
    return (await this.repo.listGovernorates()).map((g) => this.toGovernorate(g));
  }

  async listAdministrativeDistricts(governorateId: string): Promise<AdministrativeDistrictResponseDto[]> {
    const governorates = await this.repo.listGovernorates();
    if (!governorates.some((g) => g.id === governorateId)) {
      throw new NotFoundException({ code: ErrorCode.NotFound, message: 'Governorate not found' });
    }
    return (await this.repo.listAdministrativeDistricts(governorateId))
      .map((d) => this.toAdministrativeDistrict(d));
  }

  async listCities(): Promise<CityResponseDto[]> {
    return (await this.repo.listCities()).map((c) => this.toCity(c));
  }
  async getCity(id: string): Promise<CityResponseDto> {
    const c = await this.repo.findCity(id);
    if (!c) throw new NotFoundException({ code: ErrorCode.NotFound, message: 'City not found' });
    return this.toCity(c);
  }
  async listDistricts(cityId: string): Promise<DistrictResponseDto[]> {
    if (!(await this.repo.findCity(cityId))) {
      throw new NotFoundException({ code: ErrorCode.NotFound, message: 'City not found' });
    }
    return (await this.repo.listDistricts(cityId)).map((d) => this.toDistrict(d));
  }
  async getDistrict(id: string): Promise<DistrictResponseDto> {
    const d = await this.repo.findDistrict(id);
    if (!d) throw new NotFoundException({ code: ErrorCode.NotFound, message: 'District not found' });
    return this.toDistrict(d);
  }
  async listAreas(districtId: string): Promise<AreaResponseDto[]> {
    if (!(await this.repo.findDistrict(districtId))) {
      throw new NotFoundException({ code: ErrorCode.NotFound, message: 'District not found' });
    }
    return (await this.repo.listAreas(districtId)).map((a) => this.toArea(a));
  }
  async getArea(id: string): Promise<AreaResponseDto> {
    const a = await this.repo.findArea(id);
    if (!a) throw new NotFoundException({ code: ErrorCode.NotFound, message: 'Area not found' });
    return this.toArea(a);
  }
  async search(query: string): Promise<{
    cities: CityResponseDto[]; districts: DistrictResponseDto[]; areas: AreaResponseDto[];
  }> {
    const r = await this.repo.search(query);
    return {
      cities: r.cities.map((c) => this.toCity(c)),
      districts: r.districts.map((d) => this.toDistrict(d)),
      areas: r.areas.map((a) => this.toArea(a)),
    };
  }

  private toGovernorate(g: GovernorateRow): GovernorateResponseDto {
    return { id: g.id, countryCode: g.country_code, nameAr: g.name_ar, nameEn: g.name_en, slug: g.slug };
  }
  private toAdministrativeDistrict(d: AdministrativeDistrictRow): AdministrativeDistrictResponseDto {
    return { id: d.id, governorateId: d.governorate_id, nameAr: d.name_ar, nameEn: d.name_en, slug: d.slug };
  }
  private toCity(c: CityRow): CityResponseDto {
    return {
      id: c.id, countryCode: c.country_code, nameAr: c.name_ar, nameEn: c.name_en,
      slug: c.slug, latitude: Number(c.latitude), longitude: Number(c.longitude), timezone: c.timezone,
    };
  }
  private toDistrict(d: DistrictRow): DistrictResponseDto {
    return {
      id: d.id, cityId: d.city_id, nameAr: d.name_ar, nameEn: d.name_en, slug: d.slug,
      latitude: d.latitude !== null ? Number(d.latitude) : null,
      longitude: d.longitude !== null ? Number(d.longitude) : null,
    };
  }
  private toArea(a: AreaRow): AreaResponseDto {
    return {
      id: a.id, districtId: a.district_id, nameAr: a.name_ar, nameEn: a.name_en, slug: a.slug,
      latitude: a.latitude !== null ? Number(a.latitude) : null,
      longitude: a.longitude !== null ? Number(a.longitude) : null,
    };
  }
}
