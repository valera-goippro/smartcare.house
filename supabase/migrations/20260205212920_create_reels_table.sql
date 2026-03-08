/*
  # Создание таблицы для хранения видео (reels)

  1. Новая таблица
    - `reels`
      - `id` (uuid, первичный ключ) - уникальный идентификатор видео
      - `title` (text) - название видео
      - `description` (text, опционально) - описание видео
      - `video_url` (text, обязательно) - прямая ссылка на видео
      - `thumbnail_url` (text, опционально) - ссылка на превью
      - `sort_order` (integer, по умолчанию 0) - порядок сортировки
      - `is_published` (boolean, по умолчанию true) - опубликовано ли видео
      - `created_at` (timestamp) - дата создания
      - `updated_at` (timestamp) - дата обновления

  2. Безопасность
    - Включить RLS для таблицы `reels`
    - Добавить политику для публичного чтения опубликованных видео
    - Добавить политику для добавления видео (для будущей аутентификации)

  3. Индекс
    - Индекс для быстрой сортировки по `sort_order` и дате создания
*/

-- Создание таблицы reels
CREATE TABLE IF NOT EXISTS reels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  video_url text NOT NULL,
  thumbnail_url text DEFAULT '',
  sort_order integer DEFAULT 0,
  is_published boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Включение Row Level Security
ALTER TABLE reels ENABLE ROW LEVEL SECURITY;

-- Политика для публичного чтения опубликованных видео
CREATE POLICY "Anyone can view published reels"
  ON reels
  FOR SELECT
  USING (is_published = true);

-- Политика для вставки (пока без аутентификации, для разработки)
CREATE POLICY "Anyone can insert reels"
  ON reels
  FOR INSERT
  WITH CHECK (true);

-- Политика для обновления (пока без аутентификации, для разработки)
CREATE POLICY "Anyone can update reels"
  ON reels
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Политика для удаления (пока без аутентификации, для разработки)
CREATE POLICY "Anyone can delete reels"
  ON reels
  FOR DELETE
  USING (true);

-- Индекс для сортировки
CREATE INDEX IF NOT EXISTS reels_sort_order_idx ON reels (sort_order DESC, created_at DESC);

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_reels_updated_at
  BEFORE UPDATE ON reels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();