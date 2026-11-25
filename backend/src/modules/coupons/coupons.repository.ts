import { Injectable } from '@nestjs/common';
import { PoolClient } from 'pg';
import { DatabaseService } from '../../database/database.service';
import { toOffset } from '../../common/pagination.dto';
export interface CouponRow {
 id:string; code:string; type:string; value:string|number; min_order_amount:string|number;
 max_discount_amount:string|number|null; starts_at:Date|null; expires_at:Date|null;
 usage_limit:number|null; per_user_limit:number|null; used_count:number; store_id:string|null;
 category_id:string|null; scope:'general'|'products'; product_ids:string[]; is_active:boolean;
 created_by:string|null; created_at:Date; updated_at:Date;
}
@Injectable()
export class CouponsRepository {
 constructor(private readonly db:DatabaseService){}
 private readonly select='SELECT c.*, COALESCE(array_agg(cp.product_id) FILTER (WHERE cp.product_id IS NOT NULL), ARRAY[]::uuid[]) AS product_ids FROM coupons c LEFT JOIN coupon_products cp ON cp.coupon_id=c.id';
 async list(q:{page:number;limit:number;isActive?:boolean}):Promise<{rows:CouponRow[];total:number}>{
  const w:string[]=['1=1'],p:unknown[]=[];let i=1;
  if(q.isActive!==undefined){w.push('c.is_active=$'+i++);p.push(q.isActive);}
  const where='WHERE '+w.join(' AND ');
  const count=await this.db.query<{count:string}>('SELECT COUNT(*)::text count FROM coupons c '+where,p);
  const rows=await this.db.query<CouponRow>(this.select+' '+where+' GROUP BY c.id ORDER BY c.created_at DESC LIMIT $'+i+++' OFFSET $'+i,[...p,q.limit,toOffset(q)]);
  return {rows:rows.rows,total:Number(count.rows[0]?.count??0)};
 }
 async findByCode(code:string){const r=await this.db.query<CouponRow>(this.select+' WHERE c.code=$1::citext GROUP BY c.id LIMIT 1',[code]);return r.rows[0]??null;}
 async findById(id:string){const r=await this.db.query<CouponRow>(this.select+' WHERE c.id=$1 GROUP BY c.id LIMIT 1',[id]);return r.rows[0]??null;}
 async countUserUsage(c:string,u:string){const r=await this.db.query<{count:string}>('SELECT COUNT(*)::text count FROM coupon_usage WHERE coupon_id=$1 AND user_id=$2',[c,u]);return Number(r.rows[0]?.count??0);}
 async getCartProductSubtotal(items:Array<{productId:string;quantity:number}>,storeId?:string):Promise<number>{
  if(!items.length)return 0;
  const ids=[...new Set(items.map(x=>x.productId))];
  const r=await this.db.query<{id:string;base_price:string|number;store_id:string}>('SELECT id,base_price,store_id FROM products WHERE id=ANY($1::uuid[]) AND deleted_at IS NULL',[ids]);
  const m=new Map(r.rows.map(x=>[x.id,x]));let sum=0;
  for(const item of items){const p=m.get(item.productId);if(!p||(storeId&&p.store_id!==storeId))throw new Error('يوجد منتج غير صالح في السلة');sum+=Number(p.base_price)*item.quantity;}
  if(m.size!==ids.length)throw new Error('تعذر التحقق من جميع منتجات السلة');
  return sum;
 }
 async validateProductIds(ids:string[],storeId?:string):Promise<boolean>{
  if(!ids.length)return false;const p:unknown[]=[ids];const clause=storeId?' AND store_id=$2':'';
  if(storeId)p.push(storeId);
  const r=await this.db.query<{count:string}>('SELECT COUNT(*)::text count FROM products WHERE id=ANY($1::uuid[]) AND deleted_at IS NULL'+clause,p);
  return Number(r.rows[0]?.count??0)===new Set(ids).size;
 }
 private async validateProductIdsWithClient(client:PoolClient,ids:string[],storeId?:string):Promise<boolean>{if(!ids.length)return false;const p:unknown[]=[ids];const clause=storeId?' AND store_id=$2':'';if(storeId)p.push(storeId);const r=await client.query<{count:string}>('SELECT COUNT(*)::text count FROM products WHERE id=ANY($1::uuid[]) AND deleted_at IS NULL'+clause,p);return Number(r.rows[0]?.count??0)===new Set(ids).size}
 async insertUsageInTransaction(u:string,c:string,o:string,d:number){await this.db.query('INSERT INTO coupon_usage(coupon_id,user_id,order_id,discount_amount) VALUES($1,$2,$3,$4)',[c,u,o,d]);await this.db.query('UPDATE coupons SET used_count=used_count+1,updated_at=now() WHERE id=$1',[c]);}
 async insertUsage(client:PoolClient,x:{couponId:string;userId:string;orderId:string;discountAmount:number}){await client.query('INSERT INTO coupon_usage(coupon_id,user_id,order_id,discount_amount) VALUES($1,$2,$3,$4)',[x.couponId,x.userId,x.orderId,x.discountAmount]);await client.query('UPDATE coupons SET used_count=used_count+1,updated_at=now() WHERE id=$1',[x.couponId]);}
 async create(d:any,actor:string):Promise<CouponRow>{
  return this.db.transaction(async client=>{
   const scope=d.scope??'general',ids:string[]=d.product_ids??[];
   if(scope==='products'&&(!ids.length||!await this.validateProductIdsWithClient(client,ids,d.store_id)))throw new Error('اختر منتجات صحيحة تابعة للمتجر المحدد');
   if(scope==='general'&&ids.length)throw new Error('الكوبون العام لا يقبل قائمة منتجات');
   const r=await client.query('INSERT INTO coupons(code,type,value,min_order_amount,max_discount_amount,starts_at,expires_at,usage_limit,per_user_limit,store_id,category_id,scope,is_active,created_by) VALUES($1::citext,$2::discount_type,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id',[d.code,d.type,d.value,d.min_order_amount??0,d.max_discount_amount??null,d.starts_at??null,d.expires_at??null,d.usage_limit??null,d.per_user_limit??null,d.store_id??null,d.category_id??null,scope,d.is_active??true,actor]);
   const id=r.rows[0].id as string;
   for(const pid of ids)await client.query('INSERT INTO coupon_products(coupon_id,product_id) VALUES($1,$2)',[id,pid]);
   const result=await client.query<CouponRow>(this.select+' WHERE c.id=$1 GROUP BY c.id',[id]);return result.rows[0];
  });
 }
 async update(id:string,f:Record<string,unknown>):Promise<CouponRow|null>{
  return this.db.transaction(async client=>{
   const cr=await client.query<{scope:string;store_id:string|null}>('SELECT scope,store_id FROM coupons WHERE id=$1 FOR UPDATE',[id]);if(!cr.rows[0])return null;
   const ids=f.productIds as string[]|undefined,scope=(f.scope as string|undefined)??cr.rows[0].scope,store=(f.storeId as string|undefined)??cr.rows[0].store_id??undefined;
   const oldIds=ids??(await client.query<{product_id:string}>('SELECT product_id FROM coupon_products WHERE coupon_id=$1',[id])).rows.map(x=>x.product_id);
   if(scope==='products'&&(!oldIds.length||!await this.validateProductIdsWithClient(client,oldIds,store)))throw new Error('الكوبون المحدد يتطلب منتجات صحيحة');
   if(scope==='general'&&ids?.length)throw new Error('الكوبون العام لا يقبل قائمة منتجات');
   const map:Record<string,string>={code:'code',type:'type',value:'value',minOrderAmount:'min_order_amount',maxDiscountAmount:'max_discount_amount',startsAt:'starts_at',expiresAt:'expires_at',usageLimit:'usage_limit',perUserLimit:'per_user_limit',storeId:'store_id',categoryId:'category_id',isActive:'is_active'};
   const sets:string[]=[],params:unknown[]=[];let i=1;
   for(const [k,col] of Object.entries(map))if(f[k]!==undefined){const cast=col==='code'?'::citext':col==='type'?'::discount_type':'';sets.push(col+'=$'+i++ +cast);params.push(f[k]);}
   if(f.scope!==undefined){sets.push('scope=$'+i++);params.push(scope);}
   if(sets.length){params.push(id);await client.query('UPDATE coupons SET '+sets.join(',')+',updated_at=now() WHERE id=$'+i,params);}
   if(ids!==undefined||f.scope!==undefined){await client.query('DELETE FROM coupon_products WHERE coupon_id=$1',[id]);if(scope==='products')for(const pid of oldIds)await client.query('INSERT INTO coupon_products(coupon_id,product_id) VALUES($1,$2)',[id,pid]);}
   const result=await client.query<CouponRow>(this.select+' WHERE c.id=$1 GROUP BY c.id',[id]);return result.rows[0]??null;
  });
 }
 async softDelete(id:string){const r=await this.db.query('UPDATE coupons SET is_active=false,updated_at=now() WHERE id=$1',[id]);return (r.rowCount??0)>0;}
}