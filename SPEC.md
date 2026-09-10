# Smart Backlog ("Butler") — Master Technical Specification

## 1. Project Overview & Vision
Smart Backlog ("Butler") — минималистичное веб-приложение для преодоления паралича выбора и ликвидации "кладбищ закладок". 
Сервис агрегирует ссылки на YouTube-видео, статьи для чтения и пользовательские задачи в единый бэклог. Вместо бесконечных списков интерфейс работает по принципу персонального дворецкого: запрашивает у пользователя текущее окно времени и уровень энергии, после чего предлагает строго **одну** активность за раз.

---

## 2. Tech Stack & Infrastructure
- **Framework:** Next.js (App Router, React 19, TypeScript)
- **Styling & UI:** Tailwind CSS v4, Lucide React (иконки), Radix UI / shadcn/ui primitives
- **Backend & Database:** Supabase (PostgreSQL, Supabase Auth, Row Level Security, Server Actions)
- **AI Processing:** Google Gemini API (`gemini-2.5-flash` via `@google/genai` SDK)
- **Content Extractors:** `@extractus/article-extractor`, `cheerio`
- **External APIs:** YouTube Data API v3 (Google Cloud Console integration)

---

## 3. Core Data Architecture (Database Schema)

### Table: `profiles`
Расширение модели `auth.users` Supabase.
- `id`: UUID, Primary Key, References `auth.users.id` ON DELETE CASCADE
- `email`: TEXT NOT NULL
- `google_refresh_token`: TEXT NULL (для фоновых запросов к YouTube Data API)
- `created_at`: TIMESTAMPTZ DEFAULT now()

### Table: `backlog_items`
- `id`: UUID, Primary Key DEFAULT gen_random_uuid()
- `user_id`: UUID, References `profiles.id` ON DELETE CASCADE
- `type`: TEXT NOT NULL CHECK (type IN ('youtube', 'article', 'custom_task'))
- `title`: TEXT NOT NULL
- `url`: TEXT NULL
- `raw_content`: TEXT NULL (чистый HTML/Markdown статьи для встроенного ридера или описание задачи)
- `source_metadata`: JSONB DEFAULT '{}'::jsonb
  - Для YouTube: `{ "video_id": "...", "channel": "...", "thumbnail": "..." }`
  - Для статей: `{ "domain": "...", "favicon": "...", "author": "..." }`
- `estimated_minutes`: INTEGER NOT NULL DEFAULT 15
- `energy_level`: TEXT NOT NULL CHECK (energy_level IN ('low', 'medium', 'high'))
- `ai_summary`: TEXT NULL (микро-хук: в одном предложении объяснить, почему это стоит открыть сейчас)
- `tags`: TEXT[] DEFAULT '{}'
- `status`: TEXT NOT NULL DEFAULT 'inbox' CHECK (status IN ('inbox', 'completed', 'dismissed', 'archived'))
- `last_suggested_at`: TIMESTAMPTZ NULL
- `created_at`: TIMESTAMPTZ DEFAULT now()
- `updated_at`: TIMESTAMPTZ DEFAULT now()

### Row Level Security (RLS)
- Включить RLS на обеих таблицах.
- Разрешить операции `SELECT`, `INSERT`, `UPDATE`, `DELETE` только при условии `auth.uid() = user_id`.

---

## 4. Ingestion & AI Enrichment Pipeline

### 4.1. Universal Input Router
Все входящие элементы отправляются на роут `POST /api/items/create`.
- **YouTube:** 
  - Регулярным выражением определяется ссылка на YouTube (`youtube.com/watch?v=...` или `youtu.be/...`).
  - Извлекается `videoId`. Через YouTube Data API v3 запрашиваются заголовок, превью и длительность (`contentDetails.duration`, ISO 8601 -> перевод в минуты).
  - Если передается ссылка на пользовательский плейлист: пакетный импорт элементов через `playlistItems.list`.
- **Статьи:** 
  - URL парсится через `@extractus/article-extractor`.
  - Извлекается чистый текст и сохраняется в `raw_content`.
  - Время чтения рассчитывается автоматически: `estimated_minutes = Math.max(2, Math.ceil(wordCount / 200))`.
- **Задачи (Custom Tasks):** 
  - Ручной ввод названия, опциональный выбор времени (5, 15, 30, 60 мин).
  - Если время не указано, оценка делегируется Gemini.

### 4.2. Gemini AI Processing (`gemini-2.5-flash`)
Для каждого нового айтема запускается фоновая обработка со строгим системным промптом.
Цель — вернуть JSON с полями:
- `energy_level`: `"low" | "medium" | "high"`
- `tags`: массив строк (до 3 тегов)
- `ai_summary`: одно предложение на русском языке (почему это стоит посмотреть/сделать сейчас, без спойлеров).

Правила определения `energy_level`:
- `low`: развлекательные видео, легкие новости, короткие простые заметки.
- `medium`: прикладные статьи, обзоры технологий, стандартные бытовые дела.
- `high`: сложная техническая документация, глубокие лонгриды, задачи, требующие интенсивной концентрации.

---

## 5. Recommendation Engine ("The Butler")

Эндпоинт: `POST /api/butler/recommend`

**Входные параметры (JSON):**
- `availableMinutes`: number (например: 10, 20, 45, 60)
- `energyState`: `'low' | 'medium' | 'high'`
- `preferredType`: `'all' | 'youtube' | 'article' | 'custom_task'` (опционально)

**Алгоритм отбора:**
1. **Жесткая фильтрация:**
   - `status = 'inbox'`
   - `estimated_minutes <= availableMinutes`
   - Соответствие `preferredType` (если задан и не равен `'all'`).
2. **Скоринг (Scoring):**
   - **Точное совпадение по энергии:** +50 очков (если `item.energy_level === energyState`).
   - **Допустимое смежное состояние:** +20 очков (например, при энергии medium допустим контент low).
   - **Штраф за повторные показы:** -30 очков, если `last_suggested_at` был менее 24 часов назад.
   - **Бонус выдержки:** +1 очко за каждые 3 дня нахождения в бэклоге (максимум +20), чтобы поднимать старые забытые закладки.
3. **Выдача:** Ровно один айтем с наивысшим баллом. Если пул пуст, возвращается статус `EMPTY_POOL`.
4. При выдаче поле `last_suggested_at` обновляется текущей временной меткой.

---

## 6. UI/UX & Responsive Layout Specifications

### 6.1. Принципы верстки и адаптивности
- **Mobile-First & Fully Responsive:** Интерфейс обязан бесшовно адаптироваться под экраны от мобильных телефонов (360px) до планшетов и широких десктопных мониторов.
- **Breakpoints:** Стандартные брейкпоинты Tailwind (`sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`).
- **Сенсорные экраны:** Минимальный touch target для интерактивных элементов — 44x44px. Никаких микроскопических кнопок на мобильных устройствах.
- **Оформление:** Темная тема по умолчанию (Dark Mode First) с глубокими нейтральными оттенками (`slate-900` / `zinc-900`), мягкими границами и спокойными акцентами для снижения визуального шума.

### 6.2. Главный экран: "Butler Desk"
Центрированный контейнер ограниченной ширины (`max-w-xl` на десктопе, `w-full px-4` на мобильных).

1. **Селектор времени (Time Chips):**
   - Адаптивная сетка: `grid-cols-2` на мобилках или flex-ряд на десктопе (10 мин, 20 мин, 45 мин, 60+ мин).
2. **Селектор энергии (Segmented Control):**
   - 3 состояния: Устал (`low`) | В норме (`medium`) | Заряжен (`high`).
3. **Основное действие:**
   - Кнопка **«Что мне сделать?»** во всю ширину контейнера с плавной анимацией нажатия.

### 6.3. Карточка рекомендации (Active Focus Card)
Появляется после расчета дворецкого, плавно заменяя пульт выбора.
- **Шапка карточки:** Бейдж типа контента (YouTube / Статья / Задача), расчетное время в минутах, домен/канал.
- **Тело:**
  - Крупный заголовок с хорошей типографикой.
  - Блок AI-хука: выделен мягким контрастным фоном со значком подсказки.
  - **Интерактивный плеер/контент:**
    - Если YouTube: адаптивный контейнер плеера (класс `aspect-video` с IFrame).
    - Если статья: кнопка «Читать здесь» (открывает Reader Mode) или переход по внешней ссылке.
    - Если задача: встроенный таймер с обратным отсчетом на указанное время.
- **Нижняя панель действий (Action Bar):**
  - Мобильный: вертикальный стек кнопок. Десктоп: горизонтальный ряд.
  - `[Выполнено]` (Primary / Success — переводит в `status = 'completed'`).
  - `[Другое]` (Secondary — запрашивает следующий подходящий вариант).
  - `[Выбросить]` (Ghost / Destructive — переводит в `status = 'dismissed'`).

### 6.4. Модальное окно / Шторка добавления ("Quick Ingest")
- Плавающая кнопка быстрого добавления (`+`) в нижнем углу экрана.
- На смартфонах открывается как Bottom Sheet (выезжающая снизу шторка), на десктопе — как центрированный модальный диалог.
- Одно универсальное поле ввода (Smart Input): если вставлен URL — автоопределение YouTube/статьи; если введен обычный текст — оформление в виде пользовательской задачи.

### 6.5. Экран бэклога ("Storage Archive")
- Доступен по отдельной иконке в шапке/навигации, скрыт от глаз при входе, чтобы не провоцировать паралич выбора.
- Адаптивный список с возможностью ручного удаления, фильтрацией по тегам и статусам.

---

## 7. Step-by-Step Implementation Roadmap for Antigravity

1. **Шаг 1: Базовая инфраструктура и БД**
   - Развернуть проект Next.js с Tailwind CSS v4.
   - Настроить клиент Supabase, схему PostgreSQL для `profiles` и `backlog_items`, RLS-политики.
   - Настроить Google Auth.

2. **Шаг 2: Пайплайн парсинга контента и Gemini**
   - Интегрировать парсер YouTube API (извлечение видео, длительности).
   - Интегрировать `@extractus/article-extractor` для очистки статей.
   - Реализовать роут `/api/items/create` с фоновым вызовом Gemini для автотегирования и оценки когнитивной нагрузки.

3. **Шаг 3: Движок рекомендаций**
   - Реализовать API `/api/butler/recommend` с алгоритмом скоринга.

4. **Шаг 4: Адаптивный UI**
   - Собрать пульт Butler Desk (кнопки времени, энергии, запуск).
   - Собрать Focus Card с поддержкой YouTube IFrame, таймера и модального Reader View.
   - Собрать Bottom Sheet / Dialog для быстрого добавления контента.