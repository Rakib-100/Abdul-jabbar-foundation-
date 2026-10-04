# আব্দুল জব্বার চ্যারিটি ফাউন্ডেশন

আব্দুল জব্বার চ্যারিটি ফাউন্ডেশনের বাংলা ওয়েবসাইট ও সদস্য ব্যবস্থাপনা ব্যবস্থা। Next.js, TypeScript, Tailwind CSS এবং Supabase দিয়ে তৈরি; Vercel-এ প্রকাশের উপযোগী।

## যা রয়েছে

- বাংলা ভাষার responsive public site, আর্থিক স্বচ্ছতার পাতা, নোটিশ বোর্ড এবং বর্তমান কমিটি
- Supabase Auth-ভিত্তিক সদস্য নিবন্ধন ও লগইন; জনসাধারণ ADMIN নির্বাচন করতে পারে না
- ADMIN, COMMITTEE ও MEMBER ভূমিকার জন্য পৃথক অনুমতি
- বিকাশে পাঠানো অনুদানের আবেদন এবং ADMIN-এর যাচাই-অনুমোদনের পরে মূল লেজারে যোগ
- লেনদেন থেকে স্বয়ংক্রিয় জমা, খরচ ও ব্যালেন্স গণনা
- ADMIN-এর লেনদেন/খাত/সদস্য/কমিটি/রিপোর্ট/audit পরিচালনা
- COMMITTEE-এর নোটিশ প্রকাশ ও নিজের নোটিশ সম্পাদনা
- Supabase Storage-এ JPG/PNG ছবি; সর্বোচ্চ ২ MB
- আর্থিক পরিবর্তনের database-trigger-ভিত্তিক audit history
- Supabase Row Level Security (RLS); browser-এর UI check-ই একমাত্র নিরাপত্তা নয়

## স্থানীয়ভাবে চালানো

Node.js 20.9 বা পরবর্তী সংস্করণ এবং npm প্রয়োজন।

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

`http://localhost:3000` খুলুন। Supabase সেট না করলেও public পৃষ্ঠাগুলোর বিন্যাস দেখা যাবে; প্রকৃত তথ্য/লগইনের জন্য নিচের সেটআপ শেষ করতে হবে। `.env.local` কখনো GitHub-এ যোগ করবেন না।

## Supabase সেটআপ

১. Supabase-এ নতুন project তৈরি করুন। Project URL এবং publishable/anon key নিন।
২. `.env.local`-এ বসান:

```env
NEXT_PUBLIC_SUPABASE_URL=https://আপনার-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=আপনার-publishable-key
```

৩. Supabase Dashboard → SQL Editor-এ ক্রমানুসারে `supabase/migrations/20261004000000_initial_schema.sql` এবং `supabase/migrations/20261004230000_phone_login_and_donation_submissions.sql`—দুই ফাইলের সম্পূর্ণ SQL চালান।
৪. Authentication → Providers/Sign In-এ **Email provider চালু** রাখুন এবং **Confirm email বন্ধ** করুন। অ্যাপটি ১১ অঙ্কের লগইন আইডিকে Supabase Email Auth-এর জন্য অভ্যন্তরীণ `.invalid` alias-এ রূপান্তর করে; ব্যবহারকারীর আসল ইমেইল বা ফোনে কোনো কোড পাঠানো হয় না। **Phone provider চালু বা SMS/Twilio credentials প্রয়োজন নেই।**
৫. Authentication → URL Configuration-এ স্থানীয় ও production URL যোগ করুন:

- Site URL: স্থানীয়ভাবে `http://localhost:3000`; প্রকাশের পরে Vercel URL
- Redirect URL: `http://localhost:3000/auth/callback`
- Redirect URL: `https://আপনার-vercel-domain/auth/callback`
- Email confirmation বন্ধ থাকলে callback redirect প্রয়োজন হয় না।

লগইন আইডি **ঠিক ১১টি অঙ্ক**—বাংলা বা ইংরেজি অঙ্ক—হতে হবে; এটি বাস্তব মোবাইল নম্বর হওয়া জরুরি নয়। আইডি যাচাই করা হয় না এবং ID মালিকানা প্রমাণ করে না। তাই সদস্যদের জন্য আলাদা ID দিন, শক্তিশালী password ব্যবহার করুন এবং ADMIN অধিকার কেবল বিশ্বস্ত ব্যক্তিকে দিন। Password ভুলে গেলে স্বয়ংক্রিয় email reset হবে না; প্রশাসকের সহায়তা লাগবে।

## প্রথম ADMIN তৈরি

সাধারণ নিবন্ধন ফর্মে ADMIN ভূমিকা নেই। সাইটের নিবন্ধন ফর্মে প্রশাসকের জন্য একটি নির্দিষ্ট ১১ অঙ্কের login ID ও password দিয়ে account তৈরি করুন। `handle_new_user` trigger প্রাথমিক MEMBER profile বানাবে। এরপর SQL Editor-এ সেই ID দিয়ে চালান:

```sql
update public.profiles
set role = 'ADMIN', is_active = true
where mobile = '12345678901';
```

`12345678901`-এর জায়গায় নিবন্ধনে ব্যবহৃত ১১ অঙ্কের ID দিন এবং update-এর আগে/পরে row-টি যাচাই করুন। ADMIN ভূমিকা পরিবর্তনের public API নেই। Supabase Service Role Key browser-এ বা `NEXT_PUBLIC_` variable-এ কখনো রাখবেন না।

## বিকাশে অনুদান

মূল পাতার **দান করুন** অংশে বিকাশ পার্সোনাল `01304-040565` নম্বরে সেন্ড মানি করার নির্দেশনা আছে। টাকা পাঠানোর পরে দাতা নাম, ট্রানজেকশন আইডি ও পরিমাণ পাঠাবেন। আবেদন আলাদা `donation_submissions` টেবিলে থাকে; মূল ব্যালেন্সে যোগ হয় না। ADMIN বিকাশে ট্রানজেকশন আইডি যাচাই করে **যাচাই করেছি — মূল হিসাবে যোগ করুন** চাপলে database function একই transaction-এ লেজার entry ও আবেদন status সংরক্ষণ করে এবং audit log তৈরি হয়। সন্দেহজনক আবেদন মুছে না দিয়ে বাতিল হিসেবে চিহ্নিত করা হয়।

## আর্থিক প্রতিবেদন আমদানি

লেনদেন, donor/recipient, category, amount, date-সহ financial history database-এ আগে থেকে seed করা হয়নি। সংযুক্ত PDF-তে প্রতিবেদনের সময়কাল থাকলেও প্রতিটি লেনদেনের নির্দিষ্ট তারিখ নেই এবং সারাংশ ও সদস্যভিত্তিক তালিকা একই পূর্ণ transaction list নয়। অনুমান করে তারিখ/লেনদেন তৈরি করলে হিসাব ভুল হবে।

ADMIN হিসেবে লগইন করে **লেনদেন** পাতায় PDF-এর প্রতিটি যাচাইকৃত জমা ও খরচ যোগ করুন। তারিখ জানা না থাকলে তারিখ ফাঁকা রাখুন—লেনদেনটি মোট ব্যালেন্সে থাকবে, তবে নির্দিষ্ট তারিখভিত্তিক/মাসভিত্তিক রিপোর্টে থাকবে না। সব রেকর্ড যোগ করার পর **রিপোর্ট** পাতায় মোট জমা, মোট খরচ ও ব্যালেন্স PDF-এর সঙ্গে মিলিয়ে নিন। কোনো পার্থক্য থাকলে হিসাব সমন্বয়ের আগে মূল খতিয়ান যাচাই করুন। CSV-ও সেখান থেকে ডাউনলোড করা যাবে।

প্রাথমিক ব্যয়ের খাতগুলো schema-তে আছে; নতুন খাত ADMIN যোগ করতে পারবেন। কোনো sample transaction যোগ করা হয়নি।

## ভূমিকা ও নিরাপত্তা

- **ADMIN:** লেনদেন/খাত/সদস্য/কমিটি পরিচালনা, notice pin, report ও audit log।
- **COMMITTEE:** আর্থিক তথ্য দেখা, notice প্রকাশ এবং নিজের unpinned notice সম্পাদনা/মুছে ফেলা।
- **MEMBER:** আর্থিক তথ্য, notice ও বর্তমান committee দেখা; কোনো পরিবর্তন নয়।
- **অতিথি:** public home, financial summary, notice ও current committee দেখা।

Database-এর RLS প্রতিটি অনুমোদিত/অননুমোদিত কাজ নিয়ন্ত্রণ করে। Financial record স্থায়ীভাবে মুছে ফেলার permission নেই; সংশোধন করলে audit log-এ পুরোনো ও নতুন মান থাকবে। Profile photo private bucket-এ, notice ও committee photo public bucket-এ রাখা হয়। প্রতিটি upload ২ MB এবং JPG/PNG-তে সীমিত।

## Vercel-এ প্রকাশ

১. প্রকল্পের GitHub repository Vercel-এ Import করুন; Framework হিসেবে Next.js চিনে নেওয়া হবে।
২. Vercel → Project → Settings → Environment Variables-এ `NEXT_PUBLIC_SUPABASE_URL` ও `NEXT_PUBLIC_SUPABASE_ANON_KEY` Production/Preview-এ যোগ করুন। Service Role Key যোগ করার প্রয়োজন নেই।
৩. Deploy করুন। Vercel-এর পাওয়া `https://...vercel.app` URL Supabase Authentication-এর Site URL ও Redirect URL-এ যোগ করুন।
৪. Vercel-এ Environment Variables পরিবর্তন করলে নতুন deployment দিন।
৫. নতুন সদস্য নিবন্ধন, confirmation ছাড়াই লগইন, আলাদা ভূমিকার permissions, ছবি upload এবং CSV export যাচাই করুন।

## চালনা ও যাচাই

```bash
npm run dev
npm run lint
npx tsc --noEmit
npm run build
```

## পরিবেশ-চলক

| নাম | কোথায় ব্যবহার | প্রয়োজন |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | হ্যাঁ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable/anon key | হ্যাঁ |

`SUPABASE_SERVICE_ROLE_KEY` এই অ্যাপের প্রয়োজন নেই। কোনো secret বা `.env.local` commit করবেন না।
