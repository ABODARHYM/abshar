import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, createHash, randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { DatabaseService } from '../database/database.service';
import { AppConfigService } from '../config/app-config.service';
import { AuthResponse, AuthUser, TokenPair } from './auth.types';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

interface RequestMeta {
  userAgent?: string;
  ipAddress?: string;
}

interface JwtPayload {
  sub: string;
  type: 'access';
}

@Injectable()
export class AuthService {
  private readonly accessTtl: number;
  private readonly refreshTtl: number;

  constructor(
    private readonly db: DatabaseService,
    private readonly config: AppConfigService,
    private readonly jwt: JwtService,
  ) {
    this.accessTtl = this.config.all.jwt.accessTtlSeconds;
    this.refreshTtl = this.config.all.jwt.refreshTtlSeconds;
  }

  async register(dto: RegisterDto, meta: RequestMeta = {}): Promise<AuthResponse> {
    const email = dto.email?.trim().toLowerCase() || null;
    const phone = dto.phone?.trim() || null;

    if (!email && !phone) {
      throw new ConflictException('Email or phone is required');
    }

    const existing = await this.db.query<{ id: string }>(
      `
      SELECT id
      FROM users
      WHERE deleted_at IS NULL
        AND (
          ($1::citext IS NOT NULL AND email = $1::citext)
          OR ($2::varchar IS NOT NULL AND phone = $2::varchar)
        )
      LIMIT 1
      `,
      [email, phone],
    );

    if (existing.rows.length > 0) {
      throw new ConflictException('User already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const result = await this.db.transaction(async (client) => {
      const userResult = await client.query<{
        id: string;
        email: string | null;
        phone: string | null;
        full_name: string;
        status: string;
      }>(
        `
        INSERT INTO users (
          email,
          phone,
          password_hash,
          full_name,
          locale
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, email, phone, full_name, status
        `,
        [
          email,
          phone,
          passwordHash,
          dto.fullName.trim(),
          dto.locale || 'ar',
        ],
      );

      const user = userResult.rows[0];

      const roleResult = await client.query<{ id: number }>(
        `SELECT id FROM roles WHERE code = 'customer' LIMIT 1`,
      );

      if (roleResult.rows.length === 0) {
        throw new Error('Default customer role is missing');
      }

      await client.query(
        `
        INSERT INTO user_roles (user_id, role_id)
        VALUES ($1, $2)
        `,
        [user.id, roleResult.rows[0].id],
      );

      // إنشاء سجل العميل (Customers) — للولاء والعناوين
      await client.query(
        `
        INSERT INTO customers (user_id, loyalty_points, referral_code)
        VALUES ($1, 0, $2)
        ON CONFLICT (user_id) DO NOTHING
        `,
        [user.id, 'ABS-' + user.id.slice(0, 8).toUpperCase()],
      );

      return user;
    });

    const authUser = await this.loadAuthUser(result.id);

    const tokens = await this.issueTokens(
      authUser,
      meta,
      randomUUID(),
    );

    return {
      user: authUser,
      tokens,
    };
  }

  async login(dto: LoginDto, meta: RequestMeta = {}): Promise<AuthResponse> {
    const identifier = dto.identifier.trim();

    const result = await this.db.query<{
      id: string;
      email: string | null;
      phone: string | null;
      password_hash: string;
      full_name: string;
      status: string;
      failed_login_attempts: number;
      locked_until: Date | null;
    }>(
      `
      SELECT
        id,
        email,
        phone,
        password_hash,
        full_name,
        status,
        failed_login_attempts,
        locked_until
      FROM users
      WHERE deleted_at IS NULL
        AND (
          email = $1::citext
          OR phone = $1::varchar
        )
      LIMIT 1
      `,
      [identifier],
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = result.rows[0];

    if (user.status !== 'active') {
      throw new UnauthorizedException('Account is not active');
    }

    if (user.locked_until && user.locked_until.getTime() > Date.now()) {
      throw new UnauthorizedException('Account is temporarily locked');
    }

    const validPassword = await bcrypt.compare(
      dto.password,
      user.password_hash,
    );

    if (!validPassword) {
      await this.recordFailedLogin(user.id, user.failed_login_attempts);
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.db.query(
      `
      UPDATE users
      SET failed_login_attempts = 0,
          locked_until = NULL,
          last_login_at = now()
      WHERE id = $1
      `,
      [user.id],
    );

    const authUser = await this.loadAuthUser(user.id);
    const tokens = await this.issueTokens(authUser, meta, randomUUID());

    return {
      user: authUser,
      tokens,
    };
  }

  async refresh(refreshToken: string, meta: RequestMeta = {}): Promise<AuthResponse> {
    const tokenHash = this.hashToken(refreshToken);

    // Token rotation must be serialized per refresh-token row. Without a row lock,
    // two concurrent refresh requests can both observe the token as active and
    // each mint a new token before either request revokes the old one.
    const rotated = await this.db.transaction(async (client) => {
      const result = await client.query<{
        id: string;
        user_id: string;
        family_id: string;
        expires_at: Date;
        revoked_at: Date | null;
        replaced_by: string | null;
      }>(
        `
        SELECT
          id,
          user_id,
          family_id,
          expires_at,
          revoked_at,
          replaced_by
        FROM refresh_tokens
        WHERE token_hash = $1
        LIMIT 1
        FOR UPDATE
        `,
        [tokenHash],
      );

      if (result.rows.length === 0) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const stored = result.rows[0];

      if (stored.revoked_at || stored.replaced_by) {
        await client.query(
          `
          UPDATE refresh_tokens
          SET revoked_at = COALESCE(revoked_at, now())
          WHERE family_id = $1
            AND revoked_at IS NULL
          `,
          [stored.family_id],
        );
        throw new UnauthorizedException('Refresh token reuse detected');
      }

      if (stored.expires_at.getTime() <= Date.now()) {
        throw new UnauthorizedException('Refresh token expired');
      }

      const newRawRefresh = this.generateRefreshToken();
      const newHash = this.hashToken(newRawRefresh);
      const newId = randomUUID();

      await client.query(
        `
        INSERT INTO refresh_tokens (
          id,
          user_id,
          family_id,
          token_hash,
          user_agent,
          ip_address,
          expires_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          now() + ($7 * interval '1 second')
        )
        `,
        [
          newId,
          stored.user_id,
          stored.family_id,
          newHash,
          meta.userAgent || null,
          meta.ipAddress || null,
          this.refreshTtl,
        ],
      );

      await client.query(
        `
        UPDATE refresh_tokens
        SET revoked_at = now(),
            replaced_by = $1
        WHERE id = $2
          AND revoked_at IS NULL
          AND replaced_by IS NULL
        `,
        [newId, stored.id],
      );

      return {
        userId: stored.user_id,
        newRawRefresh,
      };
    });

    const user = await this.loadAuthUser(rotated.userId);
    const accessToken = await this.signAccessToken(user.id);

    return {
      user,
      tokens: {
        accessToken,
        refreshToken: rotated.newRawRefresh,
        expiresIn: this.accessTtl,
      },
    };
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);

    await this.db.query(
      `
      UPDATE refresh_tokens
      SET revoked_at = COALESCE(revoked_at, now())
      WHERE token_hash = $1
      `,
      [tokenHash],
    );
  }

  private async issueTokens(
    user: AuthUser,
    meta: RequestMeta,
    familyId: string,
  ): Promise<TokenPair> {
    const accessToken = await this.signAccessToken(user.id);
    const refreshToken = this.generateRefreshToken();

    await this.db.query(
      `
      INSERT INTO refresh_tokens (
        user_id,
        family_id,
        token_hash,
        user_agent,
        ip_address,
        expires_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        now() + ($6 * interval '1 second')
      )
      `,
      [
        user.id,
        familyId,
        this.hashToken(refreshToken),
        meta.userAgent || null,
        meta.ipAddress || null,
        this.refreshTtl,
      ],
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTtl,
    };
  }

  private async signAccessToken(userId: string): Promise<string> {
    const payload: JwtPayload = {
      sub: userId,
      type: 'access',
    };

    return this.jwt.signAsync(payload, {
      secret: this.config.all.jwt.accessSecret,
      expiresIn: this.accessTtl,
    });
  }

  private async loadAuthUser(userId: string): Promise<AuthUser> {
    const result = await this.db.query<{
      id: string;
      email: string | null;
      phone: string | null;
      full_name: string;
      status: string;
      roles: string[] | null;
      permissions: string[] | null;
    }>(
      `
      SELECT
        u.id,
        u.email,
        u.phone,
        u.full_name,
        u.status,
        COALESCE(
          array_agg(DISTINCT r.code) FILTER (WHERE r.code IS NOT NULL),
          '{}'
        ) AS roles,
        COALESCE(
          array_agg(DISTINCT p.code) FILTER (WHERE p.code IS NOT NULL),
          '{}'
        ) AS permissions
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      LEFT JOIN role_permissions rp ON rp.role_id = r.id
      LEFT JOIN permissions p ON p.id = rp.permission_id
      WHERE u.id = $1
        AND u.deleted_at IS NULL
      GROUP BY
        u.id,
        u.email,
        u.phone,
        u.full_name,
        u.status
      `,
      [userId],
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedException('User not found');
    }

    const row = result.rows[0];

    return {
      id: row.id,
      email: row.email,
      phone: row.phone,
      fullName: row.full_name,
      status: row.status,
      roles: row.roles || [],
      permissions: row.permissions || [],
    };
  }

  private async recordFailedLogin(
    userId: string,
    currentAttempts: number,
  ): Promise<void> {
    const nextAttempts = currentAttempts + 1;

    if (nextAttempts >= 5) {
      await this.db.query(
        `
        UPDATE users
        SET failed_login_attempts = 0,
            locked_until = now() + interval '15 minutes'
        WHERE id = $1
        `,
        [userId],
      );
      return;
    }

    await this.db.query(
      `
      UPDATE users
      SET failed_login_attempts = $1
      WHERE id = $2
      `,
      [nextAttempts, userId],
    );
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.db.query(
      `
      UPDATE refresh_tokens
      SET revoked_at = COALESCE(revoked_at, now())
      WHERE family_id = $1
        AND revoked_at IS NULL
      `,
      [familyId],
    );
  }

  private generateRefreshToken(): string {
    return randomBytes(48).toString('base64url');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
