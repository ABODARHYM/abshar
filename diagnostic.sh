#!/data/data/com.termux/files/usr/bin/bash

# ABSHER BI - Read-only Diagnostic Scanner
# فحص شامل دون تعديل ملفات المشروع
set -u

ROOT="$(pwd)"
REPORT="$ROOT/diagnostic-report-$(date +%Y%m%d-%H%M%S).txt"
ERRORS=0
WARNINGS=0

section() {
  printf '\n\n'
  printf '%s\n' '============================================================'
  printf ' %s\n' "$1"
  printf '%s\n' '============================================================'
}

run_check() {
  local title="$1"
  shift
  section "$title"
  "$@" 2>&1
  local rc=$?
  printf '\n[Exit code: %s]\n' "$rc"
  if [ "$rc" -ne 0 ]; then
    WARNINGS=$((WARNINGS + 1))
  fi
  return 0
}

exists_check() {
  local p
  for p in "$@"; do
    if [ -e "$p" ]; then
      printf '[OK] موجود: %s\n' "$p"
    else
      printf '[MISSING] غير موجود: %s\n' "$p"
      WARNINGS=$((WARNINGS + 1))
    fi
  done
}

scan_suspicious_code() {
  echo "البحث عن علامات TODO وFIXME وعمليات غير مكتملة:"
  grep -RInE \
    'TODO|FIXME|XXX|HACK|NOT_IMPLEMENTED|throw new Error\("Not implemented|IMPLEMENT_ME' \
    apps backend \
    --exclude-dir=node_modules --exclude-dir=dist \
    --exclude-dir=.git --exclude='*.lock' \
    2>/dev/null | head -250 || true

  echo
  echo "ملاحظة: وجود هذه الكلمات لا يعني بالضرورة وجود عطل."
}

scan_secrets() {
  echo "بحث أولي عن مفاتيح أو أسرار محتملة داخل الملفات النصية:"
  grep -RInE \
    'PRIVATE KEY|BEGIN RSA|SECRET_KEY[[:space:]]*=[^[:space:]]+|API_SECRET[[:space:]]*=[^[:space:]]+|DATABASE_URL[[:space:]]*=[^[:space:]]+|JWT_SECRET[[:space:]]*=[^[:space:]]+' \
    apps backend \
    --exclude-dir=node_modules --exclude-dir=dist \
    --exclude-dir=.git --exclude='.env' \
    --exclude='*.lock' \
    2>/dev/null | head -100 || true

  echo
  echo "لم تتم طباعة ملفات .env أو قيمها."
  echo "راجع النتائج يدويًا؛ قد تكون بعض المطابقات أمثلة غير سرية."
}

scan_address_code() {
  echo "=== واجهة العميل ==="
  grep -RIn -C 3 -E \
    'addressLat|addressLng|latitude|longitude|parseFloat|CreateAddressDto|ValidationPipe|JSON.stringify' \
    apps/customer/js apps/customer/index.html \
    --exclude-dir=node_modules 2>/dev/null | head -300 || true

  echo
  echo "=== واجهة الإدارة ==="
  grep -RIn -C 2 -E \
    'latitude|longitude|parseFloat|addresses' \
    apps/admin/js \
    --exclude-dir=node_modules 2>/dev/null | head -180 || true

  echo
  echo "=== الخادم: العناوين والتحقق ==="
  grep -RIn -C 3 -E \
    'CreateAddressDto|UpdateAddressDto|latitude|longitude|ValidationPipe|exceptionFactory' \
    backend/src/modules/addresses backend/src/common backend/src/main.ts \
    --include='*.ts' --exclude-dir=node_modules 2>/dev/null | head -300 || true
}

scan_routes() {
  echo "=== مسارات الواجهة ==="
  grep -RInE \
    'API_BASE_URL|fetch\(|router\.(get|post|patch|put|delete)|@(Get|Post|Patch|Put|Delete)\(' \
    apps backend/src \
    --exclude-dir=node_modules --exclude-dir=dist \
    --include='*.js' --include='*.ts' --include='*.html' \
    2>/dev/null | head -300 || true
}

scan_project_files() {
  echo "=== ملفات المشروع الأساسية ==="
  find . -maxdepth 3 -type f \
    \( -name 'package.json' -o -name 'tsconfig*.json' \
       -o -name 'nest-cli.json' -o -name '.env.example' \
       -o -name 'Dockerfile' -o -name 'docker-compose.yml' \
       -o -name 'README*' -o -name '*.sql' \) \
    -not -path '*/node_modules/*' \
    -not -path '*/.git/*' \
    | sort | head -300

  echo
  echo "=== أحجام المجلدات المهمة ==="
  du -sh apps backend 2>/dev/null || true
}

scan_dependencies() {
  echo "=== إصدارات الأدوات ==="
  node --version 2>&1 || true
  npm --version 2>&1 || true
  if command -v psql >/dev/null 2>&1; then
    psql --version
  else
    echo "[INFO] psql غير مثبت أو غير موجود في PATH"
  fi

  echo
  echo "=== ملفات package.json ==="
  find . -name package.json \
    -not -path '*/node_modules/*' \
    -not -path '*/.git/*' -print

  echo
  echo "=== حالة npm dependencies (دون تثبيت) ==="
  if [ -f backend/package.json ]; then
    (
      cd backend || exit 1
      npm ls --depth=0
    ) 2>&1 || true
  fi
}

scan_git() {
  if ! command -v git >/dev/null 2>&1; then
    echo "Git غير متوفر."
    return 0
  fi

  if [ -d .git ]; then
    echo "=== حالة الملفات في Git ==="
    git status --short
    echo
    echo "=== آخر commit ==="
    git log -1 --oneline 2>/dev/null || true
  else
    echo "لا يوجد مجلد .git في جذر المشروع."
  fi
}

scan_database_config() {
  echo "=== حالة PostgreSQL دون عرض كلمات المرور ==="

  if command -v pg_isready >/dev/null 2>&1; then
    pg_isready -h localhost -p 5432 2>&1 || true
  else
    echo "pg_isready غير متوفر."
  fi

  echo
  echo "=== أسماء متغيرات إعدادات قاعدة البيانات فقط ==="
  if [ -f backend/.env ]; then
    grep -E '^[[:space:]]*(DB_[A-Z_]+|DATABASE_URL|NODE_ENV|APP_TIER|PORT)[[:space:]]*=' \
      backend/.env |
      sed -E 's/=.*/=<value hidden>/'
  else
    echo "لم يُعثر على backend/.env"
  fi
}

scan_address_runtime() {
  echo "=== اختبار خادم العناوين المحلي إن كان يعمل ==="
  if ! command -v curl >/dev/null 2>&1; then
    echo "curl غير متوفر."
    return 0
  fi

  echo "-- health --"
  curl --max-time 4 -sS -w '\nHTTP %{http_code}\n' \
    http://127.0.0.1:3000/api/v1/health || true

  echo
  echo "-- readiness --"
  curl --max-time 4 -sS -w '\nHTTP %{http_code}\n' \
    http://127.0.0.1:3000/api/v1/health/ready || true

  echo
  echo "لم يتم إرسال أي طلب إنشاء أو تعديل أو حذف."
}

main() {
  section "ABSHER BI - تقرير تشخيص شامل"
  echo "وقت الفحص: $(date)"
  echo "المسار: $ROOT"
  echo "نوع الفحص: قراءة فقط"
  echo "التقرير: $REPORT"

  {
    exists_check \
      package.json \
      backend/package.json \
      backend/src/main.ts \
      backend/src/modules/addresses/dto/create-address.dto.ts \
      apps/customer/index.html \
      apps/customer/js/addresses.js \
      apps/customer/js/api.js \
      apps/customer/js/map-picker.js

    scan_project_files
    scan_dependencies
    scan_database_config
    scan_address_code
    scan_routes
    scan_suspicious_code
    scan_secrets
    scan_git
    scan_address_runtime

    section "اختبارات TypeScript"
    if [ -x backend/node_modules/.bin/tsc ] &&
       [ -f backend/tsconfig.build.json ]; then
      (
        cd backend || exit 1
        ./node_modules/.bin/tsc \
          -p tsconfig.build.json --noEmit --incremental false
      ) 2>&1
      echo "[ملاحظة] هذا فحص ترجمة TypeScript فقط."
    else
      echo "تعذر تشغيل TypeScript: تحقق من وجود node_modules وtsconfig.build.json."
    fi

    section "اختبارات المشروع"
    if [ -f backend/package.json ] &&
       [ -d backend/node_modules ]; then
      echo "=== npm test ==="
      (
        cd backend || exit 1
        npm test -- --runInBand
      ) 2>&1
      echo
      echo "=== npm run typecheck ==="
      (
        cd backend || exit 1
        npm run typecheck
      ) 2>&1
    else
      echo "لم تُشغّل الاختبارات؛ اعتماديات الخادم غير متوفرة."
    fi

    section "نهاية التقرير"
    echo "انتهى الفحص: $(date)"
    echo "تنبيه: التقرير يحتاج مراجعة بشرية؛ ليست كل التحذيرات أخطاء فعلية."
  } > "$REPORT" 2>&1

  echo
  echo "انتهى الفحص."
  echo "مسار التقرير:"
  echo "$REPORT"
  echo
  echo "آخر 100 سطر من التقرير:"
  tail -n 100 "$REPORT"
}

main
