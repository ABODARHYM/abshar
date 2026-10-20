#!/data/data/com.termux/files/usr/bin/bash

echo "════════════════════════════════════════════════════"
echo "🧪 E2E Tests"
echo "════════════════════════════════════════════════════"
echo ""

# تحقق من السيرفر
echo "▶️  تحقق من السيرفر..."
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/v1/health)
if [ "$HEALTH" != "200" ]; then
  echo "❌ السيرفر لا يعمل — شغّله أولًا"
  exit 1
fi
echo "✅ السيرفر يعمل"
echo ""

# شغّل الاختبارات
echo "════════════════════════════════════════"
echo "▶️  Full Flow Test"
echo "════════════════════════════════════════"
npx jest --config test/jest-e2e.json test/e2e/full-flow.spec.ts --forceExit --detectOpenHandles 2>&1 | tail -40
echo ""

echo "════════════════════════════════════════"
echo "▶️  RBAC Matrix Test"
echo "════════════════════════════════════════"
npx jest --config test/jest-e2e.json test/e2e/rbac.spec.ts --forceExit --detectOpenHandles 2>&1 | tail -50
echo ""

echo "════════════════════════════════════════"
echo "▶️  Smart Dispatch Test"
echo "════════════════════════════════════════"
npx jest --config test/jest-e2e.json test/e2e/smart-dispatch.spec.ts --forceExit --detectOpenHandles 2>&1 | tail -30
echo ""

echo "════════════════════════════════════════════════════"
echo "✅ انتهت الاختبارات"
echo "════════════════════════════════════════════════════"
