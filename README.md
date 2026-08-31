# Calorie Counter

An offline-first PWA calorie tracker. React + Vite + TypeScript, deployed to GitHub Pages.

**Language:** [العربية](#العربية) · [中文](#中文) · [English](#english) · [Français](#français) · [Русский](#русский) · [Español](#español)

---

## English

An offline-first calorie tracker PWA. React + Vite + TypeScript, deployed to GitHub Pages.

**Live:** https://agileaq.github.io/CalorieCounter/

### Develop

- `npm install`
- `npm run dev` — local dev server
- `npm run test` — unit tests (Vitest)
- `npm run build` — production build to `dist/`

### Deploy

Push to `main`; GitHub Actions builds and deploys to Pages. In the repo settings, set **Settings → Pages → Build and deployment → Source = GitHub Actions** once.

### Install on iOS

Open the URL in Safari → Share → Add to Home Screen. Launches standalone and works offline. Updates prompt in-app when a new version is deployed.

### Data & backup

All data is stored on-device (localStorage). Use **Goals → Export Backup** periodically — device storage can be cleared by the OS.

### Predefined foods

Bundled in `src/data/predefinedFoods.json`. Same schema as custom foods; import your own via **Goals → Import Foods** (JSON).

---

## 中文

离线优先的卡路里记录 PWA。React + Vite + TypeScript 构建，部署于 GitHub Pages。

**在线访问：** https://agileaq.github.io/CalorieCounter/

### 开发

- `npm install`
- `npm run dev` — 本地开发服务器
- `npm run test` — 单元测试（Vitest）
- `npm run build` — 产物输出到 `dist/`

### 部署

推送到 `main`，GitHub Actions 自动构建并发布到 Pages。首次使用需在仓库设置 **Settings → Pages → Build and deployment → Source = GitHub Actions** 中选择一次。

### iOS 安装

用 Safari 打开网址 →「分享」→「添加到主屏幕」。以独立窗口启动、离线可用；新版本发布后应用内会提示更新。

### 数据与备份

所有数据仅存于设备本地（localStorage）。建议定期使用 **Goals → Export Backup** 导出备份——系统可能清理设备存储。

### 内置食物

数据内置于 `src/data/predefinedFoods.json`，与自定义食物结构相同；可通过 **Goals → Import Foods**（JSON）导入自己的数据。

应用界面支持六种联合国官方语言（English、中文、Español、Français、العربية、Русский），在 Dashboard 上可切换，阿拉伯语从右向左显示。

---

## العربية

تطبيق تتبع السعرات الحرارية يعمل دون اتصال بالإنترنت (PWA). مبني بـ React + Vite + TypeScript، ومنشور على GitHub Pages.

**الرابط المباشر:** https://agileaq.github.io/CalorieCounter/

### التطوير

- `npm install`
- `npm run dev` — خادم التطوير المحلي
- `npm run test` — اختبارات الوحدة (Vitest)
- `npm run build` — بناء الإنتاج إلى `dist/`

### النشر

ادفع التغييرات إلى `main`، وستقوم GitHub Actions بالبناء والنشر إلى Pages. مرة واحدة فقط، اختر في إعدادات المستودع **Settings → Pages → Build and deployment → Source = GitHub Actions**.

### التثبيت على iOS

افتح الرابط في Safari ← «مشاركة» ← «إضافة إلى الشاشة الرئيسية». يعمل بوضع مستقل ودون اتصال، ويظهر إشعار تحديث داخل التطبيق عند نشر إصدار جديد.

### البيانات والنسخ الاحتياطي

جميع البيانات محفوظة على الجهاز (localStorage). استخدم **Goals → Export Backup** بشكل دوري — فقد يُنظّف نظام التشغيل مساحة تخزين الجهاز.

### الأطعمة الجاهزة

مضمنة في `src/data/predefinedFoods.json` وبنفس بنية الأطعمة المخصصة؛ استورد بياناتك عبر **Goals → Import Foods** (JSON).

---

## Français

Un tracker de calories PWA « offline-first ». React + Vite + TypeScript, déployé sur GitHub Pages.

**En ligne :** https://agileaq.github.io/CalorieCounter/

### Développement

- `npm install`
- `npm run dev` — serveur de développement local
- `npm run test` — tests unitaires (Vitest)
- `npm run build` — build de production vers `dist/`

### Déploiement

Poussez sur `main` ; GitHub Actions construit et déploie vers Pages. Dans les réglages du dépôt, définissez une seule fois **Settings → Pages → Build and deployment → Source = GitHub Actions**.

### Installation sur iOS

Ouvrez l'URL dans Safari → Partager → Ajouter à l'écran d'accueil. Se lance en mode autonome et fonctionne hors ligne. Les mises à jour sont signalées dans l'app quand une nouvelle version est déployée.

### Données et sauvegarde

Toutes les données restent sur l'appareil (localStorage). Utilisez régulièrement **Goals → Export Backup** — le stockage de l'appareil peut être effacé par l'OS.

### Aliments prédéfinis

Intégrés dans `src/data/predefinedFoods.json`, même schéma que les aliments personnalisés ; importez les vôtres via **Goals → Import Foods** (JSON).

---

## Русский

Офлайн-first PWA-трекер калорий. React + Vite + TypeScript, развёрнуто на GitHub Pages.

**Онлайн:** https://agileaq.github.io/CalorieCounter/

### Разработка

- `npm install`
- `npm run dev` — локальный dev-сервер
- `npm run test` — модульные тесты (Vitest)
- `npm run build` — production-сборка в `dist/`

### Развёртывание

Пуш в `main` — GitHub Actions собирает и публикует на Pages. Один раз в настройках репозитория выберите **Settings → Pages → Build and deployment → Source = GitHub Actions**.

### Установка на iOS

Откройте адрес в Safari → «Поделиться» → «На экран “Домой”». Запускается в отдельном окне и работает офлайн; при выходе новой версии появляется уведомление внутри приложения.

### Данные и резервные копии

Все данные хранятся на устройстве (localStorage). Периодически используйте **Goals → Export Backup** — ОС может очистить хранилище устройства.

### Готовые продукты

Встроены в `src/data/predefinedFoods.json`, схема та же, что у пользовательских продуктов; свои данные импортируйте через **Goals → Import Foods** (JSON).

---

## Español

Una PWA de conteo de calorías con enfoque offline-first. React + Vite + TypeScript, desplegada en GitHub Pages.

**En línea:** https://agileaq.github.io/CalorieCounter/

### Desarrollo

- `npm install`
- `npm run dev` — servidor de desarrollo local
- `npm run test` — pruebas unitarias (Vitest)
- `npm run build` — build de producción a `dist/`

### Despliegue

Sube a `main`; GitHub Actions compila y despliega a Pages. Una sola vez, en los ajustes del repositorio, establece **Settings → Pages → Build and deployment → Source = GitHub Actions**.

### Instalación en iOS

Abre la URL en Safari → Compartir → Añadir a la pantalla de inicio. Se inicia en modo independiente y funciona sin conexión. La app avisa dentro cuando se despliega una versión nueva.

### Datos y copia de seguridad

Todos los datos se guardan en el dispositivo (localStorage). Usa **Goals → Export Backup** periódicamente: el sistema puede borrar el almacenamiento del dispositivo.

### Alimentos predefinidos

Incluidos en `src/data/predefinedFoods.json`, con el mismo esquema que los alimentos personalizados; importa los tuyos mediante **Goals → Import Foods** (JSON).
