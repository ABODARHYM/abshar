import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes, randomUUID, createHash } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { DatabaseService } from '../../database/database.service';
import { CreateStoreApplicationDto } from './dto/create-store-application.dto';

@Injectable()
export class StoreApplicationsService {
  constructor(private readonly db: DatabaseService) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async getOptions() {
    const [categories, cities] = await Promise.all([
      this.db.query(
        `SELECT id, name_ar, name_en
         FROM categories
         WHERE store_id IS NULL AND is_active = true
         ORDER BY sort_order, name_ar`,
      ),
      this.db.query(
        `SELECT id, name_ar, name_en
         FROM cities
         WHERE is_active = true
         ORDER BY sort_order, name_ar`,
      ),
    ]);
    return { categories: categories.rows, cities: cities.rows };
  }

  async getDistricts(cityId: string) {
    const result = await this.db.query(
      `SELECT id, name_ar, name_en
       FROM districts
       WHERE city_id = $1 AND is_active = true
       ORDER BY sort_order, name_ar`,
      [cityId],
    );
    return result.rows;
  }

  async submit(dto: CreateStoreApplicationDto) {
    const phone = dto.phone.trim();

    const duplicate = await this.db.query(
      `SELECT id FROM users WHERE phone = $1 AND deleted_at IS NULL
       UNION ALL
       SELECT id FROM store_applications
       WHERE phone = $1 AND status = 'pending'
       LIMIT 1`,
      [phone],
    );
    if (duplicate.rows.length) {
      throw new ConflictException('رقم الهاتف مسجل أو لديه طلب قيد المراجعة');
    }

    const category = await this.db.query(
      `SELECT id FROM categories
       WHERE id = $1 AND store_id IS NULL AND is_active = true`,
      [dto.platformCategoryId],
    );
    if (!category.rows.length) {
      throw new BadRequestException('تصنيف المتجر غير صالح');
    }

    const city = await this.db.query(
      `SELECT id FROM cities WHERE id = $1 AND is_active = true`,
      [dto.cityId],
    );
    if (!city.rows.length) {
      throw new BadRequestException('المدينة غير صالحة');
    }

    if (dto.districtId) {
      const district = await this.db.query(
        `SELECT id FROM districts
         WHERE id = $1 AND city_id = $2 AND is_active = true`,
        [dto.districtId, dto.cityId],
      );
      if (!district.rows.length) {
        throw new BadRequestException('الحي لا يتبع المدينة المحددة');
      }
    }

    if (dto.zoneId) {
      const zone = await this.db.query(
        `SELECT id FROM delivery_zones
         WHERE id = $1 AND city_id = $2 AND is_active = true`,
        [dto.zoneId, dto.cityId],
      );
      if (!zone.rows.length) {
        throw new BadRequestException('منطقة التوصيل غير صالحة');
      }
    }

    const trackingToken = randomBytes(32).toString('hex');
    const trackingHash = this.hashToken(trackingToken);
    const passwordHash = await bcrypt.hash(dto.password, 12);

    let inserted;
    try {
      inserted = await this.db.query(
        `INSERT INTO store_applications (
          owner_full_name, phone, password_hash,
          store_name_ar, store_name_en, platform_category_id,
          city_id, district_id, zone_id, address_text,
          latitude, longitude, contact_phone, contact_email,
          tracking_token_hash
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15
        )
        RETURNING id, status, created_at`,
        [
          dto.ownerFullName.trim(), phone, passwordHash,
          dto.storeNameAr.trim(), dto.storeNameEn?.trim() || null,
          dto.platformCategoryId, dto.cityId, dto.districtId || null,
          dto.zoneId || null, dto.addressText.trim(),
          dto.latitude ?? null, dto.longitude ?? null,
          dto.contactPhone || phone, dto.contactEmail || null,
          trackingHash,
        ],
      );
    } catch (error) {
      const dbError = error as { code?: string; constraint?: string };

      if (
        dbError.code === '23505' &&
        dbError.constraint === 'store_applications_one_pending_phone_idx'
      ) {
        throw new ConflictException(
          'رقم الهاتف مسجل أو لديه طلب قيد المراجعة',
        );
      }

      throw error;
    }

    return {
      application: inserted.rows[0],
      trackingToken,
      message: 'تم استلام طلبك. احتفظ برمز المتابعة لمعرفة حالة الطلب.',
    };
  }

  async checkStatus(id: string, token: string) {
    const result = await this.db.query(
      `SELECT id, store_name_ar, status, review_note, created_at, reviewed_at
       FROM store_applications
       WHERE id = $1 AND tracking_token_hash = $2`,
      [id, this.hashToken(token)],
    );
    if (!result.rows.length) {
      throw new NotFoundException('الطلب أو رمز المتابعة غير صحيح');
    }
    return result.rows[0];
  }

  async listForAdmin(status?: string) {
    const allowed = ['pending', 'approved', 'rejected'];
    if (status && !allowed.includes(status)) {
      throw new BadRequestException('حالة الطلب غير صحيحة');
    }

    const result = await this.db.query(
      `SELECT a.id, a.owner_full_name, a.phone, a.store_name_ar,
              a.store_name_en, a.address_text, a.contact_phone,
              a.contact_email, a.status, a.review_note, a.created_at,
              a.reviewed_at, a.latitude, a.longitude,
              c.name_ar AS category_name,
              ci.name_ar AS city_name,
              d.name_ar AS district_name
       FROM store_applications a
       LEFT JOIN categories c ON c.id = a.platform_category_id
       LEFT JOIN cities ci ON ci.id = a.city_id
       LEFT JOIN districts d ON d.id = a.district_id
       WHERE ($1::varchar IS NULL OR a.status = $1)
       ORDER BY a.created_at DESC`,
      [status || null],
    );
    return result.rows;
  }

  async approve(id: string, reviewerId: string) {
    return this.db.transaction(async (client) => {
      const found = await client.query(
        `SELECT * FROM store_applications WHERE id = $1 FOR UPDATE`,
        [id],
      );
      if (!found.rows.length) throw new NotFoundException('الطلب غير موجود');

      const app = found.rows[0];
      if (app.status !== 'pending' || !app.password_hash) {
        throw new ConflictException('تمت معالجة هذا الطلب مسبقاً');
      }

      if (
        app.latitude === null || app.latitude === undefined ||
        app.longitude === null || app.longitude === undefined
      ) {
        throw new BadRequestException(
          'لا يمكن الموافقة: موقع المتجر وإحداثياته غير مكتملة',
        );
      }

      if (!app.platform_category_id || !app.city_id) {
        throw new BadRequestException(
          'لا يمكن الموافقة: تصنيف المتجر أو المدينة غير محدد',
        );
      }

      const duplicate = await client.query(
        `SELECT id FROM users WHERE phone = $1 AND deleted_at IS NULL`,
        [app.phone],
      );
      if (duplicate.rows.length) {
        throw new ConflictException('رقم الهاتف أصبح مرتبطاً بحساب آخر');
      }

      const role = await client.query(
        `SELECT id FROM roles WHERE code = 'storeOwner' LIMIT 1`,
      );
      if (!role.rows.length) {
        throw new BadRequestException('دور صاحب المتجر غير موجود في قاعدة البيانات');
      }

      const userResult = await client.query(
        `INSERT INTO users (phone, password_hash, full_name, status)
         VALUES ($1, $2, $3, 'active')
         RETURNING id`,
        [app.phone, app.password_hash, app.owner_full_name],
      );
      const userId = userResult.rows[0].id;

      await client.query(
        `INSERT INTO user_roles (user_id, role_id, assigned_by)
         VALUES ($1, $2, $3)`,
        [userId, role.rows[0].id, reviewerId],
      );

      const storeId = randomUUID();
      const slug = `store-${storeId}`;

      await client.query(
        `INSERT INTO stores (
          id, owner_user_id, zone_id, name_ar, name_en, slug,
          phone, email, address_text, latitude, longitude,
          status, is_open, accepts_orders, platform_category_id,
          city_id, district_id
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,
          'pending',false,false,$12,$13,$14
        )`,
        [
          storeId, userId, app.zone_id, app.store_name_ar,
          app.store_name_en || app.store_name_ar, slug,
          app.contact_phone || app.phone, app.contact_email,
          app.address_text, app.latitude, app.longitude,
          app.platform_category_id, app.city_id, app.district_id,
        ],
      );

      await client.query(
        `UPDATE store_applications
         SET status = 'approved', reviewed_by = $2, reviewed_at = now(),
             created_user_id = $3, created_store_id = $4,
             password_hash = NULL, updated_at = now()
         WHERE id = $1`,
        [id, reviewerId, userId, storeId],
      );

      return {
        applicationId: id,
        userId,
        storeId,
        message: 'تمت الموافقة وإنشاء حساب صاحب المتجر. المتجر ما زال بانتظار التفعيل.',
      };
    });
  }

  async reject(id: string, reviewerId: string, reason: string) {
    const result = await this.db.query(
      `UPDATE store_applications
       SET status = 'rejected', review_note = $3,
           reviewed_by = $2, reviewed_at = now(),
           password_hash = NULL, updated_at = now()
       WHERE id = $1 AND status = 'pending'
       RETURNING id, status, review_note, reviewed_at`,
      [id, reviewerId, reason.trim()],
    );
    if (!result.rows.length) {
      throw new NotFoundException('الطلب غير موجود أو تمت معالجته مسبقاً');
    }
    return result.rows[0];
  }
}
