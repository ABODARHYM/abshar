import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { ErrorCode } from '../../common/error-codes';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileRepository, ProfileRow } from './profile.repository';

export interface ProfileResponse {
  id: string;
  email: string | null;
  phone: string | null;
  fullName: string;
  avatarUrl: string | null;
  status: string;
  locale: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

const BCRYPT_ROUNDS = 12;

@Injectable()
export class ProfileService {
  constructor(private readonly repo: ProfileRepository) {}

  async getProfile(userId: string): Promise<ProfileResponse> {
    const row = await this.repo.findById(userId);
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'User not found',
      });
    }
    return this.toResponse(row);
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<ProfileResponse> {
    if (dto.phone !== undefined) {
      const owner = await this.repo.findPhoneOwner(dto.phone);
      if (owner && owner.id !== userId) {
        throw new BadRequestException({
          code: ErrorCode.ValidationFailed,
          message: 'Phone number already in use',
          details: [{ field: 'phone', constraints: ['must be unique'] }],
        });
      }
    }

    await this.repo.updateProfile(userId, dto);
    return this.getProfile(userId);
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<{ status: string; revokedSessions: number }> {
    const currentHash = await this.repo.getPasswordHash(userId);
    if (!currentHash) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'User not found',
      });
    }

    const ok = await bcrypt.compare(dto.currentPassword, currentHash);
    if (!ok) {
      throw new BadRequestException({
        code: ErrorCode.ValidationFailed,
        message: 'Current password is incorrect',
        details: [{ field: 'currentPassword', constraints: ['invalid'] }],
      });
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException({
        code: ErrorCode.ValidationFailed,
        message: 'New password must differ from current password',
        details: [{ field: 'newPassword', constraints: ['must differ'] }],
      });
    }

    const newHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.repo.updatePassword(userId, newHash);

    // إبطال كل الجلسات بعد تغيير كلمة المرور
    const revoked = await this.repo.revokeAllRefreshTokens(userId);

    return { status: 'ok', revokedSessions: revoked };
  }

  private toResponse(row: ProfileRow): ProfileResponse {
    return {
      id: row.id,
      email: row.email,
      phone: row.phone,
      fullName: row.full_name,
      avatarUrl: row.avatar_url,
      status: row.status,
      locale: row.locale,
      emailVerified: row.email_verified_at !== null,
      phoneVerified: row.phone_verified_at !== null,
      lastLoginAt: row.last_login_at ? row.last_login_at.toISOString() : null,
      createdAt: row.created_at.toISOString(),
    };
  }
}
