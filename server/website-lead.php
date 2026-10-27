<?php
/**
 * SOD Raqam website lead endpoint.
 * Receives marketing-site forms (static site on sodraqam.com) and writes
 * crm.lead records in Odoo (odoo.soderp.com). Two flows:
 *
 *   1. Contact form — JSON without "type", or type != "demo".
 *      Same validation, title, description, type 'lead', tag, source, and
 *      team as before. Success: {"ok":true,"id":<lead id>}.
 *      Odoo failures stay HTTP 502.
 *
 *   2. Demo request — JSON "type": "demo". Mirrors the POC demo-lead service
 *      (poc.soderp.com): name/phone/email validation, dedupe an open lead by
 *      email, create or note the lead, then return demo credentials.
 *      A filled honeypot ("website") stores nothing and returns
 *      {"ok":true,"message":"Thank you."} with no credentials.
 *      Success: {"ok":true,"id":<lead id>,"demo":{"url","username","password"}}
 *      (plus "existing":true when the email already has an open lead).
 *      If demo username/password are not configured, the lead is still
 *      created and the response is {"ok":true,"id",
 *      "message":"SOD will share access shortly."} with no "demo" object.
 *      If the Odoo push throws, one JSON line is appended to
 *      /var/lib/sod-raqam-lead/pending-demo-leads.jsonl and the response is
 *      still HTTP 200 with the credentials and "queued":true.
 *
 * Deploy on the Raqam server behind nginx at /api/website-lead.
 * Config (Odoo URL/DB/user/API key, optional demo credentials) lives
 * OUTSIDE the web root in a root-only JSON file; see $CONFIG_PATH.
 * Never commit real credentials.
 *
 * Products (added 24 Oct 2026): default "raqam" (unchanged behaviour).
 * "eduplus" is selected by body product "eduplus" / "SOD EduPlus" or by
 * Origin https://sodeduplus.com / https://www.sodeduplus.com. It uses tag
 * "SOD EduPlus", source "Website - sodeduplus.com" (overridable via config
 * key "eduplus": {"tag","source","team"}) and the demo flow returns
 *   "demos": {"full":{url,username,password},"lite":{url,username,password}}
 * read from config "eduplus.demos.full|lite" or env SOD_EDUPLUS_DEMO_FULL_URL,
 * _FULL_USER, _FULL_PASSWORD, SOD_EDUPLUS_DEMO_LITE_URL, _LITE_USER,
 * _LITE_PASSWORD (env wins). Missing creds -> "SOD will share access shortly."
 *
 * Optional top-level config key "demo" (body "product" is ignored; only
 * demo.product, default "SOD Raqam", is trusted):
 *   "demo": {"product":"SOD Raqam","url":"https://erp.sodraqam.com",
 *            "username":"...","password":"..."}
 */

declare(strict_types=1);

$CONFIG_PATH = getenv('SOD_LEAD_CONFIG') ?: '/etc/sod-raqam/website-lead.json';

$ALLOWED_ORIGINS = [
    'https://sodraqam.com',
    'https://www.sodraqam.com',
    'https://soddeveloper.github.io',
    'https://sodeduplus.com',
    'https://www.sodeduplus.com',
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

$EDUPLUS_ORIGINS = ['https://sodeduplus.com', 'https://www.sodeduplus.com'];
$productKey = strtolower(preg_replace('/[\s_-]+/', '', (string)($d['product'] ?? '')));
$IS_EDUPLUS = in_array($productKey, ['eduplus', 'sodeduplus'], true)
    || in_array($origin, $EDUPLUS_ORIGINS, true);

// Honeypot: a filled "website" field means a bot. Pretend success, store nothing.
if (!empty($d['website'])) {
    out(200, ['ok' => true, 'message' => 'Thank you.']);
}

$isDemo = (($d['type'] ?? '') === 'demo');

if ($isDemo) {
    $name   = mb_substr(trim((string)($d['name'] ?? '')), 0, 120);
    $email  = trim((string)($d['email'] ?? ''));
    $phone  = trim((string)($d['phone'] ?? ''));
    $locale = (($d['locale'] ?? 'en') === 'ar') ? 'ar' : 'en';

    if (mb_strlen($name) < 2) out(400, ['error' => 'Please enter your name.']);
    if (!preg_match('/^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/', $email)) {
        out(400, ['error' => 'Please enter a valid email address.']);
    }
    if (!preg_match('/^\+?[0-9][0-9 ()\-]{6,19}$/', $phone)) {
        out(400, ['error' => 'Please enter a valid phone number (country code allowed).']);
    }
} else {
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
$SITE     = 'sodraqam.com';
$PRODUCT_NAME = 'SOD Raqam';
if ($IS_EDUPLUS) {
    $edu = (isset($cfg['eduplus']) && is_array($cfg['eduplus'])) ? $cfg['eduplus'] : [];
    $TAG  = (string)($edu['tag'] ?? 'SOD EduPlus');
    $SOURCE = (string)($edu['source'] ?? 'Website - sodeduplus.com');
    $TEAM = (string)($edu['team'] ?? $TEAM);
    $SITE = 'sodeduplus.com';
    $PRODUCT_NAME = 'SOD EduPlus';
}

/** EduPlus demo login for one edition: env overrides config; null if incomplete. */
function eduplus_demo(array $cfg, string $ed): ?array {
    $c = $cfg['eduplus']['demos'][$ed] ?? [];
    if (!is_array($c)) $c = [];
    $E = 'SOD_EDUPLUS_DEMO_' . strtoupper($ed) . '_';
    $url  = getenv($E . 'URL')      ?: (string)($c['url'] ?? '');
    $user = getenv($E . 'USER')     ?: (string)($c['username'] ?? '');
    $pass = getenv($E . 'PASSWORD') ?: (string)($c['password'] ?? '');
    return ($user !== '' && $pass !== '') ? ['url' => $url, 'username' => $user, 'password' => $pass] : null;
}

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

if ($isDemo) {
    $demoCfg = (isset($cfg['demo']) && is_array($cfg['demo'])) ? $cfg['demo'] : [];
    // Body "product" is not trusted; only the configured name is.
    $PRODUCT = (string)($demoCfg['product'] ?? 'SOD Raqam');
    $demoKey = 'demo';
    $demoUser = isset($demoCfg['username']) ? (string)$demoCfg['username'] : '';
    $demoPass = isset($demoCfg['password']) ? (string)$demoCfg['password'] : '';
    $demoPayload = ($demoUser !== '' && $demoPass !== '') ? [
        'url'      => (string)($demoCfg['url'] ?? ''),
        'username' => $demoUser,
        'password' => $demoPass,
    ] : null;
    if ($IS_EDUPLUS) {
        $PRODUCT = 'SOD EduPlus';
        $demoKey = 'demos';
        $demos = array_filter(['full' => eduplus_demo($cfg, 'full'), 'lite' => eduplus_demo($cfg, 'lite')]);
        $demoPayload = $demos ?: null;
    }

    try {
        $uid = odoo_call($ODOO_URL, 'common', 'authenticate', [$ODOO_DB, $ODOO_USER, $ODOO_KEY, (object)[]]);
        if (!$uid) throw new RuntimeException('CRM authentication failed.');
        $uid = (int)$uid;

        $tagId    = ensure($ODOO_URL, $ODOO_DB, $uid, $ODOO_KEY, 'crm.tag', $TAG);
        $sourceId = ensure($ODOO_URL, $ODOO_DB, $uid, $ODOO_KEY, 'utm.source', $SOURCE);
        $team = execute_kw($ODOO_URL, $ODOO_DB, $uid, $ODOO_KEY, 'crm.team', 'search', [[['name', '=', $TEAM]]], ['limit' => 1]);

        $when = (new DateTimeImmutable('now', new DateTimeZone('Asia/Kolkata')))->format('d M Y H:i') . ' IST';
        $esc  = fn(string $s) => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
        $lang = $locale === 'ar' ? 'Arabic' : 'English';

        $open = execute_kw($ODOO_URL, $ODOO_DB, $uid, $ODOO_KEY, 'crm.lead', 'search', [[
            ['email_from', '=ilike', $email],
            ['active', '=', true],
            ['probability', '<', 100],
        ]], ['limit' => 1, 'order' => 'id desc']);

        $existing = false;
        if (!empty($open)) {
            $existing = true;
            $leadId = (int)$open[0];
            execute_kw($ODOO_URL, $ODOO_DB, $uid, $ODOO_KEY, 'crm.lead', 'write', [[$leadId], [
                'tag_ids' => [[4, $tagId]],
            ]]);
            $note = 'New website demo request (' . $SITE . '). Requested product: ' . $esc($PRODUCT)
                . '. Requested by ' . $esc($name) . ' (' . $esc($phone) . ', ' . $esc($email) . ') at ' . $esc($when) . '.';
            execute_kw($ODOO_URL, $ODOO_DB, $uid, $ODOO_KEY, 'crm.lead', 'message_post', [[$leadId]], [
                'body'           => $note,
                'message_type'   => 'comment',
                'subtype_xmlid'  => 'mail.mt_note',
            ]);
        } else {
            $desc = '<p><b>Requested product:</b> ' . $esc($PRODUCT) . '</p>'
                . '<p>Requested demo access to <b>' . $esc($PRODUCT) . '</b> on ' . $SITE . ' (website demo form) at ' . $esc($when) . '.</p>'
                . '<p>Phone: ' . $esc($phone) . '<br/>Email: ' . $esc($email) . '<br/>Language: ' . $lang . '</p>';
            $title = ($TEST ? '[TEST] ' : '') . 'Website demo: ' . $PRODUCT . ' – ' . $name;
            $vals = [
                'name'         => $title,
                'type'         => 'lead',
                'contact_name' => $name,
                'email_from'   => $email,
                'phone'        => $phone,
                'description'  => $desc,
                'tag_ids'      => [[6, 0, [$tagId]]],
                'source_id'    => $sourceId,
            ];
            if (!empty($team)) {
                $vals['team_id'] = (int)$team[0];
                $teamRows = execute_kw($ODOO_URL, $ODOO_DB, $uid, $ODOO_KEY, 'crm.team', 'read', [$team, ['user_id']]);
                $leader = (is_array($teamRows) && isset($teamRows[0]['user_id'])) ? $teamRows[0]['user_id'] : false;
                $vals['user_id'] = (is_array($leader) && isset($leader[0])) ? (int)$leader[0] : false;
            }
            $leadId = (int)execute_kw($ODOO_URL, $ODOO_DB, $uid, $ODOO_KEY, 'crm.lead', 'create', [$vals],
                ['context' => ['mail_auto_subscribe_no_notify' => true]]);
        }

        $body = ['ok' => true, 'id' => $leadId];
        if ($existing) $body['existing'] = true;
        if ($demoPayload !== null) {
            $body[$demoKey] = $demoPayload;
        } else {
            $body['message'] = 'SOD will share access shortly.';
        }
        out(200, $body);
    } catch (Throwable $e) {
        $dir = '/var/lib/sod-raqam-lead';
        try {
            if (!is_dir($dir)) @mkdir($dir, 0750, true);
            $line = json_encode([
                'ts'      => (new DateTimeImmutable('now', new DateTimeZone('Asia/Kolkata')))->format(DateTimeInterface::ATOM),
                'name'    => $name,
                'phone'   => $phone,
                'email'   => $email,
                'locale'  => $locale,
                'product' => $PRODUCT,
                'error'   => $e->getMessage(),
            ], JSON_UNESCAPED_UNICODE);
            if (is_string($line)) {
                @file_put_contents($dir . '/pending-demo-leads.jsonl', $line . "\n", FILE_APPEND | LOCK_EX);
            }
        } catch (Throwable $ignored) {
            // ignore failures to write
        }
        error_log('sod-raqam demo lead: ' . $e->getMessage());
        $body = ['ok' => true, 'queued' => true];
        if ($demoPayload !== null) {
            $body[$demoKey] = $demoPayload;
        } else {
            $body['message'] = 'SOD will share access shortly.';
        }
        out(200, $body);
    }
}

try {
    $uid = odoo_call($ODOO_URL, 'common', 'authenticate', [$ODOO_DB, $ODOO_USER, $ODOO_KEY, (object)[]]);
    if (!$uid) out(502, ['error' => 'CRM authentication failed.']);
    $uid = (int)$uid;

    $tagId    = ensure($ODOO_URL, $ODOO_DB, $uid, $ODOO_KEY, 'crm.tag', $TAG);
    $sourceId = ensure($ODOO_URL, $ODOO_DB, $uid, $ODOO_KEY, 'utm.source', $SOURCE);

    $esc = fn(string $s) => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
    $desc = '<p><b>Website lead — ' . $SITE . '</b></p><ul>'
        . '<li>Company: ' . $esc($company ?: '—') . '</li>'
        . '<li>Country: ' . $esc($country ?: '—') . '</li>'
        . '<li>Interested in: ' . $esc($interest ?: '—') . '</li>'
        . '<li>Phone: ' . $esc($phone) . '</li>'
        . '<li>Email: ' . $esc($email) . '</li>'
        . '<li>Language: ' . ($locale === 'ar' ? 'Arabic' : 'English') . '</li>'
        . '</ul>'
        . ($message !== '' ? '<p>' . nl2br($esc($message)) . '</p>' : '');

    $title = ($TEST ? '[TEST] ' : '') . 'Website demo: ' . $PRODUCT_NAME . ' – ' . $name
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
