<?php
/**
 * Прокси для Facebook Graph API — подтягивает Reels со страницы
 * Токен хранится серверно, кеш 30 минут
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: https://smartcare.house');

// ===== НАСТРОЙКИ =====
$PAGE_ID = '61582836781257';
$ACCESS_TOKEN = 'ВСТАВЬ_ТОКЕН_СЮДА';  // <-- Page Access Token
$CACHE_FILE = __DIR__ . '/reels_cache.json';
$CACHE_TTL = 1800; // 30 минут
$LIMIT = 9; // макс. количество Reels

// ===== КЕШИРОВАНИЕ =====
if (file_exists($CACHE_FILE)) {
    $cache = json_decode(file_get_contents($CACHE_FILE), true);
    if ($cache && isset($cache['ts']) && (time() - $cache['ts']) < $CACHE_TTL) {
        echo json_encode($cache['data'], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// ===== ЗАПРОС К FACEBOOK =====
$fields = 'id,description,created_time,thumbnails,source,permalink_url';
$url = "https://graph.facebook.com/v19.0/{$PAGE_ID}/video_reels"
     . "?fields={$fields}"
     . "&limit={$LIMIT}"
     . "&access_token={$ACCESS_TOKEN}";

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

if ($httpCode !== 200 || !$response) {
    http_response_code(502);
    echo json_encode([
        'error' => 'Facebook API error',
        'status' => $httpCode
    ]);
    exit;
}

$fbData = json_decode($response, true);

if (!isset($fbData['data'])) {
    http_response_code(502);
    echo json_encode(['error' => 'No data from Facebook']);
    exit;
}

// ===== ФОРМИРУЕМ ОТВЕТ =====
$reels = [];
foreach ($fbData['data'] as $reel) {
    $thumb = '';
    if (isset($reel['thumbnails']['data'][0]['uri'])) {
        $thumb = $reel['thumbnails']['data'][0]['uri'];
    }
    $reels[] = [
        'id'          => $reel['id'] ?? '',
        'description' => $reel['description'] ?? '',
        'created'     => $reel['created_time'] ?? '',
        'thumbnail'   => $thumb,
        'video_url'   => $reel['source'] ?? '',
        'permalink'   => $reel['permalink_url'] ?? '',
    ];
}

$result = ['reels' => $reels, 'count' => count($reels)];

// ===== СОХРАНЯЕМ КЕШ =====
file_put_contents($CACHE_FILE, json_encode([
    'ts' => time(),
    'data' => $result
], JSON_UNESCAPED_UNICODE));

echo json_encode($result, JSON_UNESCAPED_UNICODE);
