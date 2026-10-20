import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfigService } from '../../config/app-config.service';
import { DatabaseService } from '../../database/database.service';

interface JwtPayload {
  sub: string;
  type: 'access';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: AppConfigService,
    private readonly db: DatabaseService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.all.jwt.accessSecret,
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.type !== 'access' || !payload.sub) {
      throw new UnauthorizedException('Invalid access token');
    }

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
        AND u.status = 'active'
      GROUP BY
        u.id,
        u.email,
        u.phone,
        u.full_name,
        u.status
      `,
      [payload.sub],
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedException('User not found');
    }

    const user = result.rows[0];

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      fullName: user.full_name,
      status: user.status,
      roles: user.roles || [],
      permissions: user.permissions || [],
    };
  }
}
