@echo off
cd /d "c:\Users\prince biyo\searcherconnector"
git add app/api/support/route.ts app/api/payment/mobile-money/route.ts app/api/monitoring/route.ts src/lib/email.ts
git commit -m "fix: correct TypeScript errors in API routes and email service"
git push origin main
pause
