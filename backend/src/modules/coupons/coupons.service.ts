import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ErrorCode } from '../../common/error-codes';
import { buildPage, Paginated } from '../../common/pagination.dto';
import { CouponsRepository, CouponRow } from './coupons.repository';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { CouponResponseDto, CouponValidationDto } from './dto/coupon-response.dto';

export interface CouponOrderItem { productId:string; lineTotal:number; quantity?:number; }
@Injectable()
export class CouponsService {
 constructor(private readonly repo:CouponsRepository){}
 async validate(userId:string,dto:ValidateCouponDto):Promise<CouponValidationDto>{
  const coupon=await this.repo.findByCode(dto.code);
  if(!coupon)return this.invalid('الكوبون غير موجود');
  if(!coupon.is_active)return this.invalid('الكوبون غير مفعّل');
  const now=new Date();
  if(coupon.starts_at&&coupon.starts_at>now)return this.invalid('الكوبون لم يبدأ بعد');
  if(coupon.expires_at&&coupon.expires_at<=now)return this.invalid('انتهت صلاحية الكوبون');
  if(coupon.store_id&&coupon.store_id!==dto.storeId)return this.invalid('الكوبون لا ينطبق على هذا المتجر');
  if(coupon.usage_limit!==null&&coupon.used_count>=coupon.usage_limit)return this.invalid('استُنفد الكوبون');
  if(coupon.per_user_limit!==null&&await this.repo.countUserUsage(coupon.id,userId)>=coupon.per_user_limit)return this.invalid('استخدمت هذا الكوبون من قبل');
  let eligibleSubtotal=dto.subtotal;
  let verifiedCartSubtotal=dto.subtotal;
  if(coupon.scope==='products'){
   if(!dto.items?.length)return this.invalid('هذا الكوبون مخصص لمنتجات محددة؛ أرسل منتجات السلة للتحقق');
   try{
    const cartSubtotal=await this.repo.getCartProductSubtotal(dto.items,dto.storeId);
    verifiedCartSubtotal=cartSubtotal;
    const selected=new Set(coupon.product_ids);
    eligibleSubtotal=0;
    for(const item of dto.items)if(selected.has(item.productId)){
     const unitSubtotal=await this.repo.getCartProductSubtotal([{productId:item.productId,quantity:item.quantity}],dto.storeId);
     eligibleSubtotal+=unitSubtotal;
    }
   }catch(e){return this.invalid((e as Error).message);}
   if(eligibleSubtotal<=0)return this.invalid('السلة لا تحتوي على منتجات مشمولة بهذا الكوبون');
  }
  const min=Number(coupon.min_order_amount);
  if(eligibleSubtotal<min)return this.invalid('الحد الأدنى للمنتجات المشمولة بالكوبون '+min);
  const discount=this.computeDiscount(coupon,eligibleSubtotal);
  return {valid:true,couponId:coupon.id,code:coupon.code,type:coupon.type,discountAmount:discount,finalSubtotal:Math.max(0,verifiedCartSubtotal-discount),message:null};
 }
 computeDiscount(coupon:CouponRow,subtotal:number):number{
  const value=Number(coupon.value);
  if(coupon.type==='percentage'){let d=subtotal*value/100;if(coupon.max_discount_amount!==null)d=Math.min(d,Number(coupon.max_discount_amount));return Math.min(d,subtotal);}
  if(coupon.type==='fixed')return Math.min(value,subtotal);
  return 0;
 }
 async recordUsage(userId:string,couponId:string,orderId:string,discountAmount:number){await this.repo.insertUsageInTransaction(userId,couponId,orderId,discountAmount);}
 async validateAndCompute(userId:string,code:string,subtotal:number,storeId:string,items:CouponOrderItem[]):Promise<{coupon:CouponRow;discountAmount:number;freeDelivery:boolean}>{
  const coupon=await this.repo.findByCode(code);
  if(!coupon)throw new BadRequestException({code:ErrorCode.ValidationFailed,message:'الكوبون غير موجود'});
  if(!coupon.is_active)throw new BadRequestException({code:ErrorCode.ValidationFailed,message:'الكوبون غير مفعّل'});
  const now=new Date();
  if(coupon.starts_at&&coupon.starts_at>now)throw new BadRequestException({code:ErrorCode.ValidationFailed,message:'الكوبون لم يبدأ بعد'});
  if(coupon.expires_at&&coupon.expires_at<=now)throw new BadRequestException({code:ErrorCode.ValidationFailed,message:'انتهت صلاحية الكوبون'});
  if(coupon.store_id&&coupon.store_id!==storeId)throw new BadRequestException({code:ErrorCode.ValidationFailed,message:'الكوبون لا ينطبق على هذا المتجر'});
  if(coupon.usage_limit!==null&&coupon.used_count>=coupon.usage_limit)throw new BadRequestException({code:ErrorCode.ValidationFailed,message:'استُنفد الكوبون'});
  if(coupon.per_user_limit!==null&&await this.repo.countUserUsage(coupon.id,userId)>=coupon.per_user_limit)throw new BadRequestException({code:ErrorCode.ValidationFailed,message:'استخدمت هذا الكوبون من قبل'});
  let eligible= subtotal;
  if(coupon.scope==='products'){
   const selected=new Set(coupon.product_ids);
   eligible=items.reduce((sum,item)=>sum+(selected.has(item.productId)?item.lineTotal:0),0);
   if(eligible<=0)throw new BadRequestException({code:ErrorCode.ValidationFailed,message:'السلة لا تحتوي على منتجات مشمولة بهذا الكوبون'});
  }
  if(eligible<Number(coupon.min_order_amount))throw new BadRequestException({code:ErrorCode.ValidationFailed,message:'الحد الأدنى للمنتجات المشمولة بالكوبون '+coupon.min_order_amount});
  return {coupon,discountAmount:this.computeDiscount(coupon,eligible),freeDelivery:coupon.type==='free_delivery'};
 }
 async list(q:{page:number;limit:number;isActive?:boolean}):Promise<Paginated<CouponResponseDto>>{const {rows,total}=await this.repo.list(q);return buildPage(rows.map(c=>this.toResponse(c)),total,q);}
 async get(id:string){const c=await this.repo.findById(id);if(!c)throw new NotFoundException({code:ErrorCode.NotFound,message:'Coupon not found'});return this.toResponse(c);}
 async create(actorId:string,dto:CreateCouponDto){
  if(dto.type==='percentage'&&dto.value>100)throw new BadRequestException({code:ErrorCode.ValidationFailed,message:'النسبة يجب أن تكون 0-100'});
  const scope=dto.scope??'general',ids=dto.productIds??[];
  if(scope==='products'&&!ids.length)throw new BadRequestException({code:ErrorCode.ValidationFailed,message:'اختر منتجاً واحداً على الأقل للكوبون المحدد'});
  if(scope==='general'&&ids.length)throw new BadRequestException({code:ErrorCode.ValidationFailed,message:'الكوبون العام لا يحتاج إلى تحديد منتجات'});
  if(await this.repo.findByCode(dto.code))throw new BadRequestException({code:ErrorCode.Conflict,message:'كود الكوبون مستخدم بالفعل'});
  try{
   const row=await this.repo.create({code:dto.code,type:dto.type,value:dto.value,scope,product_ids:ids,min_order_amount:dto.minOrderAmount,max_discount_amount:dto.maxDiscountAmount,starts_at:dto.startsAt?new Date(dto.startsAt):undefined,expires_at:dto.expiresAt?new Date(dto.expiresAt):undefined,usage_limit:dto.usageLimit,per_user_limit:dto.perUserLimit,store_id:dto.storeId,category_id:dto.categoryId,is_active:dto.isActive},actorId);
   return this.toResponse(row);
  }catch(e){throw new BadRequestException({code:ErrorCode.ValidationFailed,message:(e as Error).message});}
 }
 async update(id:string,dto:UpdateCouponDto){
  if(dto.type==='percentage'&&dto.value!==undefined&&dto.value>100)throw new BadRequestException({code:ErrorCode.ValidationFailed,message:'النسبة يجب أن تكون 0-100'});
  try{const row=await this.repo.update(id,dto as Record<string,unknown>);if(!row)throw new NotFoundException({code:ErrorCode.NotFound,message:'Coupon not found'});return this.toResponse(row);}
  catch(e){if(e instanceof NotFoundException)throw e;throw new BadRequestException({code:ErrorCode.ValidationFailed,message:(e as Error).message});}
 }
 async remove(id:string){const ok=await this.repo.softDelete(id);if(!ok)throw new NotFoundException({code:ErrorCode.NotFound,message:'Coupon not found'});return {status:'ok'};}
 private invalid(message:string):CouponValidationDto{return {valid:false,couponId:null,code:null,type:null,discountAmount:0,finalSubtotal:0,message};}
 private toResponse(c:CouponRow):CouponResponseDto{return {id:c.id,code:c.code,type:c.type,value:Number(c.value),scope:c.scope??'general',productIds:c.product_ids??[],minOrderAmount:Number(c.min_order_amount),maxDiscountAmount:c.max_discount_amount!==null?Number(c.max_discount_amount):null,startsAt:c.starts_at?.toISOString()??null,expiresAt:c.expires_at?.toISOString()??null,usageLimit:c.usage_limit,perUserLimit:c.per_user_limit,usedCount:c.used_count,storeId:c.store_id,categoryId:c.category_id,isActive:c.is_active,createdAt:c.created_at.toISOString()};}
}