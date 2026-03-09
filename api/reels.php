<?php
/**
 * Прокси для Facebook Graph API — подтягивает Reels/видео со страницы
 * Использует App Access Token (не требует Page Token)
 * Кеш 30 минут
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: https://smartcare.house');

// ===== НАСТРОЙКИ =====
require_once __DIR__ . '/config.php';
$PAGE_ID      = '61582836781257';
$ACCESS_TOKEN = FB_APP_ID . '|' . FB_APP_SECRET; // App Access Token
$CACHE_FILE = __DIR__ . '/reels_cache.json';
$CACHE_TTL  = 1800; // 30 минут
$LIMIT      = 9;

// ===== КЕШИРОВАНИЕ =====
if (file_exists($CACHE_FILE)) {
    $cache = json_decode(file_get_contents($CACHE_FILE), true);
    if ($cache && isset($cache['ts']) && (time() - $cache['ts']) < $CACHE_TTL) {
        echo json_encode($cache['data'], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// ===== ПРОБУЕМ НЕСКОЛЬКО ЭНДПОИНТОВ =====
$reels = [];
$endpoints = [
    "https://graph.facebook.com/v19.0/{$PAGE_ID}/video_reels?fields=id,description,created_time,thumbnails,permalink_url&limit={$LIMIT}&access_token={$ACCESS_TOKEN}",
    "https://graph.facebook.com/v19.0/{$PAGE_ID}/videos?fields=id,description,created_time,thumbnails,permalink_url,source&limit={$LIMIT}&access_token={$ACCESS_TOKEN}",
];

foreach ($endpoints as $url) {
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => true,
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200 && $response) {
        $fbData = json_decode($response, true);
        if (isset($fbData['data']) && count($fbData['data']) > 0) {
            foreach ($fbData['data'] as $item) {
                $thumb = '';
                if (isset($item['thumbnails']['data'][0]['uri'])) {
                    $thumb = $item['thumbnails']['data'][0]['uri'];
                }
                $reels[] = [
                    'id'          => $item['id'] ?? '',
                    'description' => $item['description'] ?? '',
                    'created'     => $item['created_time'] ?? '',
                    'thumbnail'   => $thumb,
                    'video_url'   => $item['source'] ?? '',
                    'permalink'   => $item['permalink_url'] ?? "https://www.facebook.com/{$item['id']}",
                ];
            }
            break; // нашли данные — выходим
        }
    }
}

if (empty($reels)) {
    http_response_code(502);
    echo json_encode([
        'error' => 'No videos found',
        'debug' => $httpCode ?? 0
    ]);
    exit;
}

// Убираем дубли по id
$seen = [];
$unique = [];
foreach ($reels as $r) {
    if (!in_array($r['id'], $seen)) {
        $seen[] = $r['id'];
        $unique[] = $r;
    }
}
$reels = array_slice($unique, 0, $LIMIT);

$result = ['reels' => $reels, 'count' => count($reels)];

// ===== СОХРАНЯЕМ КЕШ =====
file_put_contents($CACHE_FILE, json_encode([
    'ts' => time(),
    'data' => $result
], JSON_UNESCAPED_UNICODE));

echo json_encode($result, JSON_UNESCAPED_UNICODE);
