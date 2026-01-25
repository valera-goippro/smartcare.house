import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const FACEBOOK_PAGE_ID = '61582836781257';

async function fetchReelsFromGraphAPI() {
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;

  if (!accessToken) {
    console.log('\n❌ Facebook Access Token не найден');
    console.log('\n📝 Инструкция по получению токена:');
    console.log('1. Перейдите на https://developers.facebook.com/tools/explorer/');
    console.log('2. Выберите вашу страницу');
    console.log('3. Добавьте разрешения: pages_read_engagement, pages_show_list');
    console.log('4. Сгенерируйте токен');
    console.log('5. Добавьте в .env файл: FACEBOOK_ACCESS_TOKEN=ваш_токен');
    console.log('\nБЕЗ ТОКЕНА: используйте /admin.html для ручного добавления видео');
    return [];
  }

  try {
    console.log('Получение видео со страницы Facebook...');

    const url = `https://graph.facebook.com/v18.0/${FACEBOOK_PAGE_ID}/videos?fields=id,permalink_url,title,description,created_time&limit=100&access_token=${accessToken}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error('Ошибка API:', data.error.message);
      return [];
    }

    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    const recentVideos = data.data.filter(video => {
      const videoDate = new Date(video.created_time);
      return videoDate >= twoMonthsAgo;
    });

    console.log(`Найдено ${recentVideos.length} видео за последние 2 месяца`);

    return recentVideos;
  } catch (error) {
    console.error('Ошибка при получении данных:', error.message);
    return [];
  }
}

async function importToDatabase(videos) {
  if (videos.length === 0) {
    console.log('\n⚠️  Нет видео для импорта');
    console.log('\n🔧 Решение: Добавьте видео через админ-панель');
    console.log('Откройте: /admin.html на вашем сайте');
    return;
  }

  console.log('\nДобавление видео в базу данных...');

  for (let i = 0; i < videos.length; i++) {
    const video = videos[i];
    const url = video.permalink_url;

    const { data, error } = await supabase
      .from('facebook_reels')
      .upsert({
        url: url,
        title: video.title || `Заботливый дом - видео ${i + 1}`,
        description: video.description || 'Умный дом для заботы о близких',
        order_index: i + 1,
        is_active: true
      }, {
        onConflict: 'url'
      })
      .select();

    if (error) {
      console.error(`Ошибка при импорте ${url}:`, error);
    } else {
      console.log(`✓ Добавлено: ${video.title || url}`);
    }
  }

  console.log('\n✅ Импорт завершен!');
}

async function main() {
  console.log('=== Импорт Facebook Reels ===\n');

  const videos = await fetchReelsFromGraphAPI();
  await importToDatabase(videos);
}

main().catch(console.error);
