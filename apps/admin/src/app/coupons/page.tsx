'use client';
import { useEffect, useMemo, useState } from 'react';
import AdminHeader from '@/components/AdminHeader';
import AdminTable from '@/components/AdminTable';
import { authFetch } from '@/lib/auth';

type Product = { id:string; nameAr:string; nameEn?:string; storeName?:string; basePrice?:number; };
type Coupon = { id:string; code:string; type:string; value:number; scope:'general'|'products'; productIds:string[]; usedCount:number; usageLimit:number|null; isActive:boolean; expiresAt:string|null; };

const TYPE_LABELS:Record<string,string>={percentage:'نسبة مئوية',fixed:'مبلغ ثابت',free_delivery:'توصيل مجاني'};
export default function CouponsPage(){
 const [coupons,setCoupons]=useState<Coupon[]>([]);
 const [products,setProducts]=useState<Product[]>([]);
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false);
 const [error,setError]=useState(''),[notice,setNotice]=useState('');
 const [code,setCode]=useState(''),[type,setType]=useState('percentage'),[value,setValue]=useState('10');
 const [scope,setScope]=useState<'general'|'products'>('general'),[selected,setSelected]=useState<string[]>([]);
 const [search,setSearch]=useState('');
 const [minOrder,setMinOrder]=useState('0'),[maxDiscount,setMaxDiscount]=useState('');
 const [usageLimit,setUsageLimit]=useState(''),[perUserLimit,setPerUserLimit]=useState('');
 const [expiresAt,setExpiresAt]=useState('');
 const visibleProducts=useMemo(()=>products.filter(p=>!search||((p.nameAr||'')+' '+(p.nameEn||'')+' '+(p.storeName||'')).toLowerCase().includes(search.toLowerCase())),[products,search]);

 const load=async()=>{
  setLoading(true);setError('');
  try{
   const [cr,pr]=await Promise.all([authFetch('/api/v1/coupons?limit=100'),authFetch('/api/v1/products?limit=100')]);
   if(!cr.ok)throw new Error('تعذر تحميل الكوبونات');
   const cd=await cr.json();setCoupons(Array.isArray(cd.items)?cd.items:[]);
   if(pr.ok){const pd=await pr.json();setProducts(Array.isArray(pd.items)?pd.items:[]);}
  }catch(e){setError((e as Error).message||'تعذر تحميل البيانات');}
  finally{setLoading(false);}
 };
 useEffect(()=>{void load();},[]);
 const toggleProduct=(id:string)=>setSelected(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);
 const create=async()=>{
  setError('');setNotice('');
  if(!code.trim()){setError('أدخل كود الكوبون');return;}
  if(scope==='products'&&!selected.length){setError('اختر منتجاً واحداً على الأقل');return;}
  if(type!=='free_delivery'&&(!Number.isFinite(Number(value))||Number(value)<0)){setError('قيمة الخصم غير صحيحة');return;}
  setSaving(true);
  try{
   const payload:any={code:code.trim().toUpperCase(),type,value:Number(value)||0,scope,minOrderAmount:Number(minOrder)||0,isActive:true};
   if(scope==='products')payload.productIds=selected;
   if(maxDiscount.trim())payload.maxDiscountAmount=Number(maxDiscount);
   if(usageLimit.trim())payload.usageLimit=Number(usageLimit);
   if(perUserLimit.trim())payload.perUserLimit=Number(perUserLimit);
   if(expiresAt)payload.expiresAt=new Date(expiresAt+'T23:59:59').toISOString();
   const r=await authFetch('/api/v1/coupons',{method:'POST',body:JSON.stringify(payload)});
   const data=await r.json().catch(()=>null);
   if(!r.ok)throw new Error(data?.message||'تعذر إنشاء الكوبون');
   setNotice('تم إنشاء الكوبون بنجاح');
   setCode('');setSelected([]);setValue('10');setScope('general');setSearch('');
   await load();
  }catch(e){setError((e as Error).message||'حدث خطأ');}
  finally{setSaving(false);}
 };
 const disable=async(c:Coupon)=>{
  if(!window.confirm('هل تريد تعطيل هذا الكوبون؟'))return;
  try{const r=await authFetch('/api/v1/coupons/'+c.id,{method:'DELETE'});if(!r.ok)throw new Error('تعذر تعطيل الكوبون');await load();}
  catch(e){setError((e as Error).message);}
 };
 const columns=[
  {key:'code',label:'الكود',render:(c:Coupon)=><span className="font-mono font-black text-accent" dir="ltr">{c.code}</span>},
  {key:'type',label:'الخصم',render:(c:Coupon)=><span>{TYPE_LABELS[c.type]||c.type} {c.type==='percentage'?c.value+'%':c.type==='fixed'?c.value:''}</span>},
  {key:'scope',label:'النطاق',render:(c:Coupon)=><span className="badge badge-info text-[10px]">{c.scope==='products'?'منتجات محددة ('+(c.productIds?.length||0)+')':'عام — كل المنتجات'}</span>},
  {key:'uses',label:'الاستخدامات',render:(c:Coupon)=><span>{c.usedCount||0} / {c.usageLimit??'∞'}</span>},
  {key:'status',label:'الحالة',render:(c:Coupon)=><span className={c.isActive?'text-green-600':'text-red-500'}>{c.isActive?'نشط':'معطل'}</span>},
  {key:'action',label:'إجراء',render:(c:Coupon)=><button disabled={!c.isActive} onClick={()=>void disable(c)} className="text-xs text-red-500 disabled:opacity-40">تعطيل</button>},
 ];
 return <div style={{padding:'24px'}} className="space-y-5">
  <AdminHeader title="🎫 الكوبونات" subtitle={coupons.length+' كوبون'}/>
  {error&&<div role="alert" className="card border border-red-500/40 text-red-600">{error}</div>}
  {notice&&<div role="status" className="card border border-green-500/30 text-green-600">{notice}</div>}
  <section className="card space-y-4">
   <h2 className="font-black text-lg">إنشاء كوبون جديد</h2>
   <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
    <label className="text-sm space-y-1"><span>كود الكوبون</span><input className="input w-full" value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="مثال MARIB20" maxLength={30}/></label>
    <label className="text-sm space-y-1"><span>نوع الخصم</span><select className="input w-full" value={type} onChange={e=>setType(e.target.value)}><option value="percentage">نسبة مئوية</option><option value="fixed">مبلغ ثابت</option><option value="free_delivery">توصيل مجاني</option></select></label>
    {type!=='free_delivery'&&<label className="text-sm space-y-1"><span>قيمة الخصم {type==='percentage'?'(%)':'(مبلغ)'}</span><input className="input w-full" type="number" min="0" max={type==='percentage'?100:undefined} value={value} onChange={e=>setValue(e.target.value)}/></label>}
    <label className="text-sm space-y-1"><span>نوع الكوبون</span><select className="input w-full" value={scope} onChange={e=>{setScope(e.target.value as any);setSelected([]);}}><option value="general">كوبون عام — جميع المنتجات</option><option value="products">كوبون لمنتجات محددة</option></select></label>
    <label className="text-sm space-y-1"><span>الحد الأدنى لقيمة المنتجات المشمولة</span><input className="input w-full" type="number" min="0" value={minOrder} onChange={e=>setMinOrder(e.target.value)}/></label>
    <label className="text-sm space-y-1"><span>أقصى مبلغ للخصم (اختياري)</span><input className="input w-full" type="number" min="0" value={maxDiscount} onChange={e=>setMaxDiscount(e.target.value)}/></label>
    <label className="text-sm space-y-1"><span>حد الاستخدام الكلي (اختياري)</span><input className="input w-full" type="number" min="1" value={usageLimit} onChange={e=>setUsageLimit(e.target.value)}/></label>
    <label className="text-sm space-y-1"><span>حد الاستخدام لكل عميل (اختياري)</span><input className="input w-full" type="number" min="1" value={perUserLimit} onChange={e=>setPerUserLimit(e.target.value)}/></label>
    <label className="text-sm space-y-1"><span>تاريخ الانتهاء (اختياري)</span><input className="input w-full" type="date" value={expiresAt} onChange={e=>setExpiresAt(e.target.value)}/></label>
   </div>
   {scope==='products'&&<div className="space-y-2">
    <div className="flex items-center justify-between gap-2"><h3 className="font-bold">اختر المنتجات المشمولة</h3><span className="text-xs text-muted">{selected.length} منتج محدد</span></div>
    <input className="input w-full" placeholder="ابحث باسم المنتج أو المتجر..." value={search} onChange={e=>setSearch(e.target.value)}/>
    <div className="max-h-64 overflow-auto border rounded-xl p-2 space-y-1">
     {visibleProducts.map(p=><label key={p.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--bg-card-hover)] text-sm"><input type="checkbox" checked={selected.includes(p.id)} onChange={()=>toggleProduct(p.id)}/><span className="flex-1">{p.nameAr||p.nameEn||p.id}</span><span className="text-xs text-muted">{p.storeName||''}</span></label>)}
     {!visibleProducts.length&&<p className="text-sm text-muted p-3">لا توجد منتجات مطابقة. تأكد من صلاحية تحميل المنتجات.</p>}
    </div>
   </div>}
   <button onClick={()=>void create()} disabled={saving} className="btn btn-primary">{saving?'جارٍ الحفظ...':'إنشاء الكوبون'}</button>
  </section>
  <section><h2 className="font-black text-lg mb-3">الكوبونات الحالية</h2><AdminTable columns={columns} data={coupons} keyField="id" loading={loading} emptyMessage="لا توجد كوبونات"/></section>
 </div>;
}
