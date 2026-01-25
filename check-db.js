import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkDatabase() {
  console.log('=== Проверка базы данных ===\n');

  try {
    const { data, error } = await supabase
      .from('facebook_reels')
      .select('*')
      .eq('is_active', true)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Ошибка при получении данных:', error.message);
      return;
    }

    if (!data || data.length === 0) {
      console.log('❌ В базе данных нет активных видео');
      console.log('\n📝 Добавьте видео одним из способов:');
      console.log('1. Используйте batch-import-reels.js');
      console.log('2. Откройте /admin.html на сайте');
      console.log('3. Настройте Facebook API токен');
      return;
    }

    console.log(`✅ Найдено ${data.length} активных видео:\n`);

    data.forEach((video, index) => {
      console.log(`${index + 1}. ${video.title}`);
      console.log(`   URL: ${video.url}`);
      console.log(`   Порядок: ${video.order_index}`);
      console.log('');
    });

    console.log(`\n✅ Все видео должны отображаться на сайте`);

  } catch (error) {
    console.error('Ошибка:', error.message);
  }
}

checkDatabase().catch(console.error);
