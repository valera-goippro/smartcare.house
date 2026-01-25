import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync } from 'fs';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function batchImportReels() {
  console.log('=== Массовый импорт Facebook Reels ===\n');

  try {
    const content = readFileSync('reels-urls.txt', 'utf-8');

    const urls = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && line.startsWith('http'));

    if (urls.length === 0) {
      console.log('❌ Не найдено URL в файле reels-urls.txt');
      console.log('\n📝 Инструкция:');
      console.log('1. Откройте файл reels-urls.txt');
      console.log('2. Вставьте URL каждого Reel (по одному на строку)');
      console.log('3. Сохраните файл');
      console.log('4. Запустите: node batch-import-reels.js');
      console.log('\nПример содержимого reels-urls.txt:');
      console.log('https://www.facebook.com/reel/1348545846955296');
      console.log('https://www.facebook.com/reel/1234567890123456');
      console.log('https://www.facebook.com/reel/9876543210987654');
      return;
    }

    console.log(`Найдено ${urls.length} URL для импорта\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];

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
        console.error(`❌ Ошибка: ${url}`);
        console.error(`   ${error.message}`);
        errorCount++;
      } else {
        console.log(`✓ ${i + 1}/${urls.length} - Добавлено: ${url}`);
        successCount++;
      }
    }

    console.log(`\n=== Результат ===`);
    console.log(`✅ Успешно: ${successCount}`);
    if (errorCount > 0) {
      console.log(`❌ Ошибок: ${errorCount}`);
    }
    console.log(`\nПроверьте сайт: все видео должны отображаться на главной странице`);

  } catch (error) {
    console.error('Ошибка при чтении файла:', error.message);
    console.log('\n📝 Убедитесь, что файл reels-urls.txt существует');
  }
}

batchImportReels().catch(console.error);
