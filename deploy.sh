#!/bin/bash
# Скрипт для автоматического деплоя изменений в master

echo "🔄 Синхронизация с GitHub..."
git fetch origin

echo "📦 Проверка изменений в ветке codex..."
if git log origin/master..origin/codex/edit-website-content --oneline 2>/dev/null | grep -q .; then
    echo "✅ Найдены изменения в codex, мержим в master..."
    git checkout master
    git merge origin/codex/edit-website-content --no-edit
    git push origin master
    echo "✅ Изменения запушены в master, вебхук должен сработать!"
else
    echo "ℹ️  Нет новых изменений для деплоя"
fi
