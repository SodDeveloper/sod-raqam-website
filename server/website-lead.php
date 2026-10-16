<?php
/**
 * SOD Raqam website lead endpoint.
 * Receives the marketing-site contact form (static site on sodraqam.com) and
 * creates a crm.lead in Odoo (odoo.soderp.com), mirroring the POC lead flow:
 *   - tag "SOD Raqam", source "Website - sodraqam.com"
 * Deploy on the Raqam server behind nginx at /api/website-lead.
 * Config (Odoo URL/DB/user/API key) lives OUTSIDE the web root in a
 * root-only JSON file; see $CONFIG_PATH. Never commit real credentials.
 */

declare(strict_types=1);

$CONFIG_PATH = getenv('SOD_LEAD_CONFIG') ?: '/etc/sod-raqam/website-lead.json';

$ALLOWED_ORIGINS = [
    'https://sodraqam.com',
    'https://www.sodraqam.com',
    'http://localhost:3000',
    'http://localhost:4173',
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $ALLOWED_ORIGINS, true)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Vary: Origin');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Max-Age: 86400');
}
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function out(int $code, array $body): never {
    http_response_code($code);
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    out(405, ['error' => 'Method not allowed']);
}
if ($origin !== '' && !in_array($origin, $ALLOWED_ORIGINS, true)) {
    out(403, ['error' => 'Origin not allowed']);
}

$raw = file_get_contents('php://input', false, null, 0, 16384);
$d = json_decode($raw ?: '{}', true);
if (!is_array($d)) {
    out(400, ['error' => 'Invalid request.']);
}

// Honeypot: a filled "website" field means a bot. Pretend success, store nothing.
if (!empty($d['website'])) {
    out(200, ['ok' => true, 'message' => 'Thank you.']);
}

$name    = trim((string)($d['name'] ?? ''));
$company = trim((string)($d['company'] ?? ''));
$email   = trim((string)($d['email'] ?? ''));
$phone   = trim((string)($d['phone'] ?? ''));
$country = trim((string)($d['country'] ?? ''));
$interest= trim((string)($d['interest'] ?? ''));
$message = trim((string)($d['message'] ?? ''));
$locale  = (($d['locale'] ?? 'en') === 'ar') ? 'ar' : 'en';

foreach ([&$name,&$company,&$email,&$phone,&$country,&$interest] as &$v) {
    $v = mb_substr($v, 0, 160);
}
unset($v);
$message = mb_substr($message, 0, 4000);

if (mb_strlen($name) < 2) out(400, ['error' => 'Please enter your name.']);
if (!preg_match('/^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/', $email)) {
    out(400, ['error' => 'Please enter a valid email address.']);
}
if (!preg_match('/^\+?[0-9][0-9 ()\-]{6,24}$/', $phone)) {
    out(400, ['error' => 'Please enter a valid phone number.']);
}

if (!is_readable($CONFIG_PATH)) {
    error_log("sod-raqam lead: config not readable at $CONFIG_PATH");
    out(500, ['error' => 'Server not configured.']);
}
$cfg = json_decode((string)file_get_contents($CONFIG_PATH), true);
$crm = $cfg['crm'] ?? [];
foreach (['url','db','login','api_key'] as $k) {
    if (empty($crm[$k])) {
        error_log("sod-raqam lead: missing crm.$k in config");
        out(500, ['error' => 'Server not configured.']);
    }
}
$ODOO_URL = rtrim((string)$crm['url'], '/');
$ODOO_DB  = (string)$crm['db'];
$ODOO_USER= (string)$crm['login'];
$ODOO_KEY = (string)$crm['api_key'];
$TAG      = (string)($crm['tag'] ?? 'SOD Raqam');
$SOURCE   = (string)($crm['source'] ?? 'Website - sodraqam.com');
$TEAM     = (string)($crm['team'] ?? 'Sales');
$TEST     = !empty($d['test']) || !empty($crm['test']);

/** Minimal Odoo JSON-RPC client. */
function odoo_call(string $url, string $service, string $method, array $args) {
    $payload = json_encode([
        'jsonrpc' => '2.0',
        'method'  => 'call',
        'params'  => ['service' => $service, 'method' => $method, 'args' => $args],
        'id'      => mt_rand(),
    ], JSON_UNESCAPED_UNICODE);
    $ch = curl_init("$url/jsonrpc");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_TIMEOUT => 20,
    ]);
    $res = curl_exec($ch);
    if ($res === false) throw new RuntimeException('Odoo unreachable: ' . curl_error($ch));
    curl_close($ch);
    $j = json_decode($res, true);
    if (isset($j['error'])) {
        throw new RuntimeException('Odoo error: ' . json_encode($j['error']));
    }
    return $j['result'] ?? null;
}

function execute_kw(string $url, string $db, int $uid, string $key, string $model, string $method, array $args, array $kwargs = []) {
    return odoo_call($url, 'object', 'execute_kw', [$db, $uid, $key, $model, $method, $args, $kwargs]);
}

function ensure(string $url, string $db, int $uid, string $key, string $model, string $name): int {
    $found = execute_kw($url, $db, $uid, $key, $model, 'search', [[['name', '=', $name]]], ['limit' => 1]);
    if (!empty($found)) return (int)$found[0];
    return (int)execute_kw($url, $db, $uid, $key, $model, 'create', [['name' => $name]]);
}

try {
    $uid = odoo_call($ODOO_URL, 'common', 'authenticate', [$ODOO_DB, $ODOO_USER, $ODOO_KEY, (object)[]]);
    if (!$uid) out(502, ['error' => 'CRM authentication failed.']);
    $uid = (int)$uid;

    $tagId    = ensure($ODOO_URL, $ODOO_DB, $uid, $ODOO_KEY, 'crm.tag', $TAG);
    $sourceId = ensure($ODOO_URL, $ODOO_DB, $uid, $ODOO_KEY, 'utm.source', $SOURCE);

    $esc = fn(string $s) => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
    $desc = '<p><b>Website lead — sodraqam.com</b></p><ul>'
        . '<li>Company: ' . $esc($company ?: '—') . '</li>'
        . '<li>Country: ' . $esc($country ?: '—') . '</li>'
        . '<li>Interested in: ' . $esc($interest ?: '—') . '</li>'
        . '<li>Phone: ' . $esc($phone) . '</li>'
        . '<li>Email: ' . $esc($email) . '</li>'
        . '<li>Language: ' . ($locale === 'ar' ? 'Arabic' : 'English') . '</li>'
        . '</ul>'
        . ($message !== '' ? '<p>' . nl2br($esc($message)) . '</p>' : '');

    $title = ($TEST ? '[TEST] ' : '') . 'Website demo: SOD Raqam – ' . $name
        . ($company ? ' (' . $company . ')' : '');

    $vals = [
        'name'         => $title,
        'type'         => 'lead',
        'contact_name' => $name,
        'partner_name' => $company ?: false,
        'email_from'   => $email,
        'phone'        => $phone,
        'description'  => $desc,
        'tag_ids'      => [[6, 0, [$tagId]]],
        'source_id'    => $sourceId,
    ];
    if ($country) $vals['city'] = false; // country kept in description; name match avoided

    $team = execute_kw($ODOO_URL, $ODOO_DB, $uid, $ODOO_KEY, 'crm.team', 'search', [[['name', '=', $TEAM]]], ['limit' => 1]);
    if (!empty($team)) $vals['team_id'] = (int)$team[0];

    $leadId = execute_kw($ODOO_URL, $ODOO_DB, $uid, $ODOO_KEY, 'crm.lead', 'create', [$vals],
        ['context' => ['mail_auto_subscribe_no_notify' => true]]);

    out(200, ['ok' => true, 'id' => $leadId]);
} catch (Throwable $e) {
    error_log('sod-raqam lead: ' . $e->getMessage());
    out(502, ['error' => 'Could not submit right now. Please email us directly.']);
}
