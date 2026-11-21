import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ErrorCode } from '../../common/error-codes';
import {
  AddressesRepository,
  AddressRow,
} from './addresses.repository';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

export interface AddressResponse {
  id: string;
  label: string;
  addressLine: string;
  building: string | null;
  floor: string | null;
  apartment: string | null;
  landmark: string | null;
  latitude: number;
  longitude: number;
  zoneId: string | null;
  cityId: string | null;
  cityName: string | null;
  districtId: string | null;
  districtName: string | null;
  areaId: string | null;
  areaName: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class AddressesService {
  constructor(private readonly repo: AddressesRepository) {}

  async list(userId: string): Promise<AddressResponse[]> {
    const rows = await this.repo.listByUser(userId);
    return rows.map((r) => this.toResponse(r));
  }

  async get(userId: string, id: string): Promise<AddressResponse> {
    const row = await this.repo.findByIdForUser(id, userId);
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Address not found',
      });
    }
    return this.toResponse(row);
  }

  async create(
    userId: string,
    dto: CreateAddressDto,
  ): Promise<AddressResponse> {
    if (dto.zoneId) {
      const valid = await this.repo.validateAddressGeography({
        cityId: dto.cityId,
        districtId: dto.districtId,
        areaId: dto.areaId,
        zoneId: dto.zoneId,
      });
      if (!valid) {
        throw new BadRequestException({
          code: ErrorCode.ValidationFailed,
          message: 'منطقة التوصيل لا تتطابق مع المدينة أو الحي أو المنطقة المحددة.',
          details: [{ field: 'zoneId', constraints: ['geography mismatch or inactive zone'] }],
        });
      }
    } else if (dto.cityId || dto.districtId || dto.areaId) {
      throw new BadRequestException({
        code: ErrorCode.ValidationFailed,
        message: 'يجب تحديد منطقة التوصيل المتوافقة مع العنوان.',
        details: [{ field: 'zoneId', constraints: ['required with geographic fields'] }],
      });
    }

    const row = await this.repo.create(userId, dto);
    return this.toResponse(row);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateAddressDto,
  ): Promise<AddressResponse> {
    const existing = await this.repo.findByIdForUser(id, userId);
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Address not found',
      });
    }

    const nextZoneId = dto.zoneId ?? existing.zone_id;
    const nextCityId = dto.cityId !== undefined ? dto.cityId : existing.city_id;
    const nextDistrictId = dto.districtId !== undefined ? dto.districtId : existing.district_id;
    const nextAreaId = dto.areaId !== undefined ? dto.areaId : existing.area_id;

    if (nextZoneId) {
      const valid = await this.repo.validateAddressGeography({
        cityId: nextCityId,
        districtId: nextDistrictId,
        areaId: nextAreaId,
        zoneId: nextZoneId,
      });
      if (!valid) {
        throw new BadRequestException({
          code: ErrorCode.ValidationFailed,
          message: 'منطقة التوصيل لا تتطابق مع المدينة أو الحي أو المنطقة المحددة.',
          details: [{ field: 'zoneId', constraints: ['geography mismatch or inactive zone'] }],
        });
      }
    } else if (nextCityId || nextDistrictId || nextAreaId) {
      throw new BadRequestException({
        code: ErrorCode.ValidationFailed,
        message: 'يجب تحديد منطقة التوصيل المتوافقة مع العنوان.',
        details: [{ field: 'zoneId', constraints: ['required with geographic fields'] }],
      });
    }

    const updated = await this.repo.update(id, userId, dto);
    if (!updated) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Address not found',
      });
    }
    return this.toResponse(updated);
  }

  async remove(userId: string, id: string): Promise<{ status: string }> {
    const ok = await this.repo.softDelete(id, userId);
    if (!ok) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Address not found',
      });
    }
    return { status: 'ok' };
  }

  async setDefault(userId: string, id: string): Promise<AddressResponse> {
    const row = await this.repo.setDefault(id, userId);
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Address not found',
      });
    }
    return this.toResponse(row);
  }

  private toResponse(row: AddressRow): AddressResponse {
    return {
      id: row.id,
      label: row.label,
      addressLine: row.address_line,
      building: row.building,
      floor: row.floor,
      apartment: row.apartment,
      landmark: row.landmark,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      zoneId: row.zone_id,
      cityId: row.city_id,
      cityName: row.city_name ?? null,
      districtId: row.district_id,
      districtName: row.district_name ?? null,
      areaId: row.area_id,
      areaName: row.area_name ?? null,
      isDefault: row.is_default,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }
}
