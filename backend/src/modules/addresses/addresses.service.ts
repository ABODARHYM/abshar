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
      const exists = await this.repo.zoneExists(dto.zoneId);
      if (!exists) {
        throw new BadRequestException({
          code: ErrorCode.ValidationFailed,
          message: 'Delivery zone not found or inactive',
          details: [{ field: 'zoneId', constraints: ['not found'] }],
        });
      }
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

    if (dto.zoneId) {
      const exists = await this.repo.zoneExists(dto.zoneId);
      if (!exists) {
        throw new BadRequestException({
          code: ErrorCode.ValidationFailed,
          message: 'Delivery zone not found or inactive',
          details: [{ field: 'zoneId', constraints: ['not found'] }],
        });
      }
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
