import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

export interface ProfileRow {
  id: string;
  email: string | null;
  phone: string | null;
  full_name: string;
  avatar_url: string | null;
  status: string;
  locale: string;
  email_verified_at: Date | null;
  phone_verified_at: Date | null;
  last_login_at: Date | null;
  created_at: Date;
}

@Injectable()
export class ProfileRepository {
  constructor(private readonly db: DatabaseService) {}

  async findById(userId: string): Promise<ProfileRow | null> {
    const result = await this.db.query<ProfileRow>(
      `
      SELECT
        id,
        email,
        phone,
        full_name,
        avatar_url,
        status,
        locale,
        email_verified_at,
        phone_verified_at,
        last_login_at,
        created_at
      FROM users
      WHERE id = $1 AND deleted_at IS NULL
      LIMIT 1
      `,
      [userId],
    );

    return result.rows[0] ?? null;
  }

  async findPhoneOwner(phone: string): Promise<{ id: string } | null> {
    const result = await this.db.query<{ id: string }>(
      `SELECT id FROM users WHERE phone = $1 AND deleted_at IS NULL LIMIT 1`,
      [phone],
    );
    return result.rows[0] ?? null;
  }

  async updateProfile(
    userId: string,
    fields: { fullName?: string; phone?: string; locale?: string },
  ): Promise<void> {
    const sets: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (fields.fullName !== undefined) {
      sets.push(`full_name = $${i++}`);
      params.push(fields.fullName);
    }
    if (fields.phone !== undefined) {
      sets.push(`phone = $${i++}`);
      params.push(fields.phone);
    }
    if (fields.locale !== undefined) {
      sets.push(`locale = $${i++}`);
      params.push(fields.locale);
    }

    if (sets.length === 0) return;

    params.push(userId);
    await this.db.query(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${i} AND deleted_at IS NULL`,
      params,
    );
  }

  async getPasswordHash(userId: string): Promise<string | null> {
    const result = await this.db.query<{ password_hash: string }>(
      `SELECT password_hash FROM users WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [userId],
    );
    return result.rows[0]?.password_hash ?? null;
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.db.query(
      `UPDATE users SET password_hash = $1 WHERE id = $2 AND deleted_at IS NULL`,
      [passwordHash, userId],
    );
  }

  /**
   * إبطال كل جلسات المستخدم (بعد تغيير كلمة المرور).
   * ملاحظة: لا نلمس عائلة التوكن الحالي — يُبطلها الـ service لاحقًا لو احتاج.
   */
  async revokeAllRefreshTokens(userId: string): Promise<number> {
    const result = await this.db.query(
      `UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId],
    );
    return result.rowCount ?? 0;
  }
}
