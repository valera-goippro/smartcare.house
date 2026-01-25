import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const URLS_FILE = 'reels.txt';

async function simpleImport() {
  console.log('🚀 Запускаю простой импорт видео...\n');

  if (!fs.existsSync(URLS_FILE)) {
    console.log('❌ Файл reels.txt не найден!\n');
    console.log('Создайте файл reels.txt и вставьте туда ссылки на видео.');
    console.log('Каждую ссылку на отдельной строке.\n');
    console.log('Пример содержимого файла:');
    console.log('  https://www.facebook.com/reel/1348545846955296');
    console.log('  https://www.facebook.com/reel/1234567890123456');
    console.log('  https://www.facebook.com/reel/9876543210987654\n');

    fs.writeFileSync(URLS_FILE, '# Вставьте сюда ссылки на Reels (по одной на строку)\n# Строки, начинающиеся с #, игнорируются\n\n');
    console.log(`✅ Создал пустой файл ${URLS_FILE}`);
    console.log('   Заполните его и запустите команду снова.\n');
    return;
  }

  const content = fs.readFileSync(URLS_FILE, 'utf-8');
  const reelUrls = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#') && line.startsWith('http'));

  if (reelUrls.length === 0) {
    console.log('❌ В файле reels.txt нет ссылок!\n');
    console.log('Добавьте ссылки на видео (каждую на отдельной строке) и запустите снова.\n');
    return;
  }

  console.log(`📋 Найдено ${reelUrls.length} ссылок в файле\n`);
  console.log('💾 Добавляю в базу данных...\n');

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (let i = 0; i < reelUrls.length; i++) {
    const url = reelUrls[i];

    try {
      const { data: existing } = await supabase
        .from('facebook_reels')
        .select('id')
        .eq('url', url)
        .maybeSingle();

      if (existing) {
        console.log(`[${i + 1}/${reelUrls.length}] ⏭️  Пропуск (уже есть): ${url}`);
        skipCount++;
        continue;
      }

      const { error } = await supabase
        .from('facebook_reels')
        .insert({
          url: url,
          title: `Заботливый дом - видео ${i + 1}`,
          description: 'Умный дом для заботы о близких',
          order_index: i + 1,
          is_active: true
        });

      if (error) {
        console.log(`[${i + 1}/${reelUrls.length}] ❌ Ошибка: ${url}`);
        console.log(`     ${error.message}`);
        errorCount++;
      } else {
        console.log(`[${i + 1}/${reelUrls.length}] ✅ Добавлено: ${url}`);
        successCount++;
      }

    } catch (error) {
      console.log(`[${i + 1}/${reelUrls.length}] ❌ Ошибка: ${error.message}`);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 ИТОГИ:');
  console.log(`   ✅ Добавлено новых: ${successCount}`);
  console.log(`   ⏭️  Пропущено (уже были): ${skipCount}`);
  console.log(`   ❌ Ошибок: ${errorCount}`);
  console.log(`   📝 Всего обработано: ${reelUrls.length}`);
  console.log('='.repeat(60));

  if (successCount > 0) {
    console.log('\n✨ Готово! Видео загружены на сайт.\n');
  }
}

simpleImport().catch(error => {
  console.error('💥 Критическая ошибка:', error);
  process.exit(1);
});
