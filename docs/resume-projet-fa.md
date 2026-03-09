# خلاصه پروژه CRM (فارسی)

## هدف پروژه
ساخت یک CRM وب برای شرکت بازرگانی مواد اولیه غذایی با معماری SaaS کامل:
- فرانت + API روی Next.js
- دیتابیس و احراز هویت روی Supabase
- ایمیل روی Brevo
- دیپلوی روی Vercel

## ماژول‌های تحویل‌شده
- ورود/ثبت‌نام/فراموشی رمز
- نقش‌های کاربری (admin/commercial/standard)
- مدیریت مخاطب‌ها و شرکت‌ها
- مدیریت لیدها
- Pipeline فروش اختصاصی 7 مرحله‌ای
- ثبت تاریخچه تغییر مرحله لید
- مدیریت تسک‌ها و بررسی overdue
- ارسال ایمیل دستی + لاگ ایمیل
- اتوماسیون follow-up بعد از 72 ساعت
- داشبورد KPI

## Pipeline انتخاب‌شده
1. Nouveau lead  
2. Qualification  
3. Echantillon envoye  
4. Devis envoye  
5. Negociation  
6. Gagne  
7. Perdu

## APIهای اصلی
- `/api/contacts`
- `/api/companies`
- `/api/leads`
- `/api/leads/:id/stage`
- `/api/tasks`
- `/api/dashboard`
- `/api/emails/send`
- `/api/emails/logs`
- `/api/jobs/followup`

## امنیت
- RLS روی جداول کلیدی
- محدودسازی دسترسی براساس مالک/مسئول لید
- استفاده از service role فقط در بک‌اند سرور

## وضعیت فنی
- `npm run lint` پاس
- `npm run build` پاس
- migration دیتابیس روی Supabase اعمال شده

## مسیر فایل‌ها
- کد اپ: `C:\dev\crm-food-trading\web`
- SQL migration: `C:\dev\crm-food-trading\supabase\migrations`
- گزارش FR: `C:\dev\crm-food-trading\docs\rapport-projet-fr.md`

## گام بعدی
- انتشار ریپو CRM روی GitHub
- دیپلوی Vercel (root = web)
- اتصال لینک‌ها در Portfolio
