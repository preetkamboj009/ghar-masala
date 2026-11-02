<?php
// Starts a PayU payment. The amount is rebuilt here from prices.json; the browser's numbers are never trusted.
// Secrets live in payu-config.php ONE folder above the website root (see payu-config.example.php).

$cfgFile = dirname(__DIR__) . '/payu-config.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { header('Location: checkout.html'); exit; }
if (!is_file($cfgFile)) { fail('Online payment is not set up yet. Please try again later.'); }
$cfg = require $cfgFile;
$data = json_decode(file_get_contents(__DIR__ . '/prices.json'), true);

function fail($msg) {
    http_response_code(400);
    echo '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
       . '<link rel="stylesheet" href="style.css"><main class="policy"><div class="wrap narrow"><section>'
       . '<h1>Could not start payment</h1><p>' . htmlspecialchars($msg) . '</p>'
       . '<a class="btn btn-primary" href="checkout.html">Back to checkout</a></section></div></main>';
    exit;
}

// PayU's hash uses "|" as separator, so it must never appear inside a value.
function field($k, $max) {
    $v = preg_replace('/[|\r\n\t]+/', ' ', (string)($_POST[$k] ?? ''));
    return trim(mb_substr($v, 0, $max));
}

$name    = field('name', 60);
$email   = field('email', 80);
$phone   = field('phone', 10);
$address = field('address', 200);
$city    = field('city', 40);
$state   = field('state', 40);
$pincode = field('pincode', 6);

if ($name === '' || $address === '' || $city === '' || $state === '') fail('Please fill in all delivery details.');
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Please enter a valid email address.');
if (!preg_match('/^[6-9]\d{9}$/', $phone)) fail('Please enter a valid 10-digit mobile number.');
if (!preg_match('/^\d{6}$/', $pincode)) fail('Please enter a valid 6-digit pin code.');

$cart = json_decode((string)($_POST['cart'] ?? ''), true);
if (!is_array($cart) || !$cart) fail('Your cart is empty.');

$total = 0;
$lines = [];
foreach ($cart as $c) {
    $id  = (string)($c['id'] ?? '');
    $qty = (int)($c['qty'] ?? 0);
    $it  = $data['items'][$id] ?? null;
    if (!$it || $qty < 1 || $qty > 20 || $it['price'] <= 0) fail('Something in your cart is not available. Please check your cart again.');
    $total  += $it['price'] * $qty;
    $lines[] = "{$qty}x {$it['name']} {$it['size']}";
}
$total += $total >= ($data['freeShippingAbove'] ?? INF) ? 0 : $data['shipping']; // same rule as script.js

$txnid       = 'GM' . date('ymdHis') . bin2hex(random_bytes(3));
$amount      = number_format($total, 2, '.', '');
$productinfo = 'Ghar Masala order';
$udf1        = mb_substr($address, 0, 255);
$udf2        = "$city, $state - $pincode";
$udf3        = mb_substr(implode('; ', $lines), 0, 255);
$udf4        = $udf5 = '';

$hash = hash('sha512', implode('|', [
    $cfg['key'], $txnid, $amount, $productinfo, $name, $email,
    $udf1, $udf2, $udf3, $udf4, $udf5, '', '', '', '', '', $cfg['salt'],
]));

// Order log outside the website root, so it is never downloadable.
$log = fopen(dirname(__DIR__) . '/ghar-orders.csv', 'a');
if ($log) {
    fputcsv($log, [date('c'), $txnid, 'started', $amount, $name, $email, $phone, $address, $city, $state, $pincode, implode('; ', $lines)]);
    fclose($log);
}

$post = [
    'key' => $cfg['key'], 'txnid' => $txnid, 'amount' => $amount, 'productinfo' => $productinfo,
    'firstname' => $name, 'email' => $email, 'phone' => $phone,
    'udf1' => $udf1, 'udf2' => $udf2, 'udf3' => $udf3, 'udf4' => $udf4, 'udf5' => $udf5,
    'surl' => $cfg['site'] . '/payu-return.php', 'furl' => $cfg['site'] . '/payu-return.php',
    'hash' => $hash,
];
$action = $cfg['mode'] === 'live' ? 'https://secure.payu.in/_payment' : 'https://test.payu.in/_payment';
?>
<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Redirecting to payment…</title><link rel="stylesheet" href="style.css"></head>
<body onload="document.forms[0].submit()">
<main class="policy"><div class="wrap narrow"><section>
  <h1>Taking you to secure payment…</h1>
  <form method="post" action="<?= $action ?>">
    <?php foreach ($post as $k => $v): ?>
      <input type="hidden" name="<?= $k ?>" value="<?= htmlspecialchars($v) ?>">
    <?php endforeach; ?>
    <noscript><button class="btn btn-primary">Continue to payment</button></noscript>
  </form>
</section></div></main>
</body>
</html>
