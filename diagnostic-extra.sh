#!/data/data/com.termux/files/usr/bin/bash
set +e

ROOT="$(pwd)"
REPORT="$ROOT/diagnostic-extra-$(date +%Y%m%d-%H%M%S).txt"

{
  echo "=================================================="
  echo " ABSHER BI - EXTRA DIAGNOSTIC"
  echo " Date: $(date)"
  echo " Root: $ROOT"
  echo "=================================================="

  echo
  echo "===== 1. الملفات الأساسية ====="
  for f in \
    backend/package.json \
    backend/tsconfig.json \
    backend/tsconfig.build.json \
    backend/src/main.ts \
    backend/src/modules/addresses/dto/create-address.dto.ts \
    backend/src/modules/addresses/dto/update-address.dto.ts \
    backend/src/modules/addresses/addresses.service.ts \
    backend/src/modules/addresses/addresses.repository.ts \
    apps/customer/index.html \
    apps/customer/js/addresses.js \
    apps/customer/js/map-picker.js \
    apps/customer/js/api.js
  do
    if [ -f "$f" ]; then
      echo "[OK] $f"
    else
      echo "[MISSING] $f"
    fi
  done

  echo
  echo "===== 2. تفاصيل إرسال الإحداثيات ====="
  grep -n -C 5 -E \
    'latitude:|longitude:|JSON.stringify\(payload\)|addressLat|addressLng|fetch\(' \
    apps/customer/js/addresses.js \
    apps/customer/js/api.js \
    apps/customer/index.html 2>/dev/null

  echo
  echo "===== 3. جميع مواضع إنشاء DTO العنوان ====="
  grep -RIn -E \
    'CreateAddressDto|UpdateAddressDto|buildValidationPipe|ValidationPipe' \
    backend/src \
    --include='*.ts' \
    --exclude-dir=node_modules \
    --exclude-dir=dist 2>/dev/null

  echo
  echo "===== 4. إعدادات التحويل والتحقق ====="
  grep -RIn -E \
    'enableImplicitConversion|transform:|useGlobalPipes|buildValidationPipe|plainToInstance|validateOrReject' \
    backend/src \
    --include='*.ts' \
    --exclude-dir=node_modules \
    --exclude-dir=dist 2>/dev/null

  echo
  echo "===== 5. فحص JavaScript syntax ====="
  find apps -type f -name '*.js' \
    -not -path '*/node_modules/*' \
    -not -path '*/.next/*' \
    -not -path '*/dist/*' -print0 2>/dev/null |
  while IFS= read -r -d '' f; do
    node --check "$f" >/dev/null 2>&1
    rc=$?
    if [ "$rc" -ne 0 ]; then
      echo "[JS SYNTAX ERROR] $f"
      node --check "$f" 2>&1
    fi
  done

  echo
  echo "===== 6. فحص TypeScript ====="
  if [ -x backend/node_modules/.bin/tsc ]; then
    (cd backend && ./node_modules/.bin/tsc \
      --noEmit -p tsconfig.json)
    echo "TypeScript exit code: $?"
  else
    echo "TypeScript compiler not found"
  fi

  echo
  echo "===== 7. فحص حزم المشروع ====="
  (cd backend && npm ls --depth=0)
  echo "npm ls exit code: $?"

  echo
  echo "===== 8. حالة المنفذ 3000 ====="
  if command -v curl >/dev/null 2>&1; then
    curl --max-time 3 -sS \
      -w '\nHTTP %{http_code}\n' \
      http://127.0.0.1:3000/api/v1/health
  fi

  echo
  echo "===== 9. البحث عن أخطاء غير مكتملة ====="
  grep -RInE \
    'TODO|FIXME|NOT_IMPLEMENTED|IMPLEMENT_ME|throw new Error' \
    backend/src apps/customer/js apps/admin \
    --include='*.ts' --include='*.js' \
    --exclude-dir=node_modules \
    --exclude-dir=.next \
    --exclude-dir=dist 2>/dev/null | head -200

  echo
  echo "===== 10. نهاية الفحص ====="
  echo "لم يتم إرسال طلب إنشاء أو تعديل أو حذف."
  echo "لم تتم طباعة محتويات ملفات .env."
} > "$REPORT" 2>&1

echo "انتهى الفحص."
echo "التقرير: $REPORT"
echo
tail -n 100 "$REPORT"
