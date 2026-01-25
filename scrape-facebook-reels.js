import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const FACEBOOK_PAGE_ID = '61582836781257';
const FACEBOOK_PAGE_URL = `https://www.facebook.com/${FACEBOOK_PAGE_ID}`;

async function scrapeReels() {
  console.log('Запуск браузера...');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    console.log(`Открытие страницы: ${FACEBOOK_PAGE_URL}`);
    await page.goto(FACEBOOK_PAGE_URL, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('Прокрутка страницы для загрузки контента...');
    await autoScroll(page);

    console.log('Поиск Reels на странице...');
    const reelsLinks = await page.evaluate(() => {
      const links = [];
      const anchors = document.querySelectorAll('a[href*="/reel/"]');

      anchors.forEach(anchor => {
        const href = anchor.href;
        if (href && href.includes('/reel/') && !links.includes(href)) {
          links.push(href);
        }
      });

      return links;
    });

    console.log(`Найдено ${reelsLinks.length} Reels`);

    if (reelsLinks.length === 0) {
      console.log('\nНе удалось найти Reels автоматически.');
      console.log('Пожалуйста, добавьте URL Reels вручную в массив reelsUrls в файле import-reels.js');
      console.log('\nИли используйте админ-панель: откройте /admin.html на вашем сайте');
    } else {
      console.log('\nНайденные Reels:');
      reelsLinks.forEach((link, i) => {
        console.log(`${i + 1}. ${link}`);
      });

      console.log('\n\nДобавление в базу данных...');

      for (let i = 0; i < reelsLinks.length; i++) {
        const url = reelsLinks[i];

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
          console.log(`✓ Добавлено: ${url}`);
        }
      }

      console.log('\n✅ Импорт завершен успешно!');
    }

  } catch (error) {
    console.error('Ошибка при парсинге:', error.message);
    console.log('\n📝 Альтернативный способ:');
    console.log('1. Откройте https://www.facebook.com/61582836781257/reels');
    console.log('2. Скопируйте URL каждого Reel');
    console.log('3. Добавьте их через админ-панель: /admin.html');
  } finally {
    await browser.close();
  }
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight || totalHeight >= 3000) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

scrapeReels().catch(console.error);
