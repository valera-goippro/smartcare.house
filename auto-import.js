import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const FACEBOOK_PAGE = 'https://www.facebook.com/61582836781257';

async function autoImportReels() {
  console.log('🚀 Запускаю автоматический импорт видео с Facebook...\n');

  let reelUrls = [];

  console.log('⏳ Открываю браузер для парсинга Facebook...');
  console.log('   (Окно браузера откроется на 30 секунд для сбора ссылок)\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1920,1080'
    ]
  });

  const page = await browser.newPage();

  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1920, height: 1080 });

  console.log('📱 Загружаю страницу Facebook: ' + FACEBOOK_PAGE);

  try {
    await page.goto(FACEBOOK_PAGE, { waitUntil: 'domcontentloaded', timeout: 30000 });

    console.log('📜 Жду загрузки контента (30 сек)...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('📜 Прокручиваю страницу...');

    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, 1000));
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log(`   Прокрутка ${i + 1}/5...`);
    }

    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('\n🔍 Собираю ссылки на Reels...');

    reelUrls = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const urls = links
        .map(link => link.href)
        .filter(url => url && url.includes('/reel/'))
        .map(url => {
          const match = url.match(/facebook\.com\/reel\/(\d+)/);
          return match ? `https://www.facebook.com/reel/${match[1]}` : null;
        })
        .filter(url => url !== null);

      return [...new Set(urls)];
    });

    console.log(`✅ Найдено ${reelUrls.length} ссылок`);

  } catch (error) {
    console.log('⚠️  Не удалось автоматически собрать ссылки');
    console.log('   Причина:', error.message);
  } finally {
    await browser.close();
  }

  if (reelUrls.length === 0) {
    console.log('\n' + '='.repeat(60));
    console.log('⚠️  ВНИМАНИЕ: Автоматический парсинг не сработал');
    console.log('='.repeat(60));
    console.log('\nВозможные причины:');
    console.log('  • Facebook требует авторизации');
    console.log('  • Страница защищена от автоматизации');
    console.log('  • Нет доступных видео\n');
    console.log('Попробуйте:');
    console.log('  1. Откройте админ-панель: https://smartcare.house/admin.html');
    console.log('  2. Вставьте ссылки вручную\n');
    return;
  }

  console.log(`✅ Найдено ${reelUrls.length} видео\n`);

  console.log('💾 Добавляю в базу данных...');

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
        console.log(`   [${i + 1}/${reelUrls.length}] Пропуск (уже есть): ${url}`);
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
        console.log(`   [${i + 1}/${reelUrls.length}] ❌ Ошибка: ${url}`);
        errorCount++;
      } else {
        console.log(`   [${i + 1}/${reelUrls.length}] ✅ Добавлено: ${url}`);
        successCount++;
      }

    } catch (error) {
      console.log(`   [${i + 1}/${reelUrls.length}] ❌ Ошибка: ${error.message}`);
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
  console.log('\n✨ Готово! Все видео загружены на сайт.\n');
}

autoImportReels().catch(error => {
  console.error('💥 Критическая ошибка:', error);
  process.exit(1);
});
