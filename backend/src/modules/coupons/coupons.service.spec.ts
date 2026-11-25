import { BadRequestException } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { CouponRow } from './coupons.repository';

const coupon=(overrides:Partial<CouponRow>={}):CouponRow=>({
 id:'coupon-1',code:'SAVE20',type:'percentage',value:20,min_order_amount:0,max_discount_amount:null,
 starts_at:null,expires_at:null,usage_limit:null,per_user_limit:null,used_count:0,store_id:null,
 category_id:null,scope:'general',product_ids:[],is_active:true,created_by:null,created_at:new Date(),updated_at:new Date(),
 ...overrides,
});
describe('CouponsService product targeting',()=>{
 let repo:any;let service:CouponsService;
 beforeEach(()=>{repo={findByCode:jest.fn(),countUserUsage:jest.fn().mockResolvedValue(0),insertUsageInTransaction:jest.fn()};service=new CouponsService(repo);});
 it('applies a general coupon to the complete subtotal',async()=>{
  repo.findByCode.mockResolvedValue(coupon());
  const result=await service.validateAndCompute('user','SAVE20',1000,'store',[{productId:'p1',lineTotal:400},{productId:'p2',lineTotal:600}]);
  expect(result.discountAmount).toBe(200);
 });
 it('applies a product coupon only to selected product lines',async()=>{
  repo.findByCode.mockResolvedValue(coupon({scope:'products',product_ids:['p1']}));
  const result=await service.validateAndCompute('user','SAVE20',1000,'store',[{productId:'p1',lineTotal:400},{productId:'p2',lineTotal:600}]);
  expect(result.discountAmount).toBe(80);
 });
 it('rejects product coupons when no selected product is in the cart',async()=>{
  repo.findByCode.mockResolvedValue(coupon({scope:'products',product_ids:['p3']}));
  await expect(service.validateAndCompute('user','SAVE20',1000,'store',[{productId:'p1',lineTotal:1000}])).rejects.toBeInstanceOf(BadRequestException);
 });
 it('checks minimum order against eligible product subtotal only',async()=>{
  repo.findByCode.mockResolvedValue(coupon({scope:'products',product_ids:['p1'],min_order_amount:500}));
  await expect(service.validateAndCompute('user','SAVE20',1000,'store',[{productId:'p1',lineTotal:400},{productId:'p2',lineTotal:600}])).rejects.toBeInstanceOf(BadRequestException);
 });
 it('caps percentage discount against the eligible subtotal',async()=>{
  repo.findByCode.mockResolvedValue(coupon({scope:'products',product_ids:['p1'],max_discount_amount:50}));
  const result=await service.validateAndCompute('user','SAVE20',1000,'store',[{productId:'p1',lineTotal:400},{productId:'p2',lineTotal:600}]);
  expect(result.discountAmount).toBe(50);
 });
});
