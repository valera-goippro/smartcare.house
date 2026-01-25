import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const FACEBOOK_PAGE_ID = '61582836781257';

const reelsUrls = [
  'https://www.facebook.com/reel/1348545846955296',
  'https://www.facebook.com/reel/YOUR_REEL_ID_2',
  'https://www.facebook.com/reel/YOUR_REEL_ID_3',
];

async function importReels() {
  console.log('Начинаем импорт Reels...');

  for (let i = 0; i < reelsUrls.length; i++) {
    const url = reelsUrls[i];

    const { data, error } = await supabase
      .from('facebook_reels')
      .upsert({
        url: url,
        title: `Заботливый дом - видео ${i + 1}`,
        description: 'Умный дом для заботы о близких',
        order_index: i + 1,
        is_active: true
      }, {
        onConflict: 'url'
      })
      .select();

    if (error) {
      console.error(`Ошибка при импорте ${url}:`, error);
    } else {
      console.log(`✓ Импортировано: ${url}`);
    }
  }

  console.log('Импорт завершен!');
}

importReels().catch(console.error);
