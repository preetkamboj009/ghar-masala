<?php
// PayU sends the customer back here (success or failure). We trust the result only if PayU's reverse hash matches.

$cfg = require dirname(__DIR__) . '/payu-config.php';
$p = fn($k) => (string)($_POST[$k] ?? '');

$seq = implode('|', [
    $cfg['salt'], $p('status'), '', '', '', '', '',
    $p('udf5'), $p('udf4'), $p('udf3'), $p('udf2'), $p('udf1'),
    $p('email'), $p('firstname'), $p('productinfo'), $p('amount'), $p('txnid'), $cfg['key'],
]);
if ($p('additionalCharges') !== '') $seq = $p('additionalCharges') . '|' . $seq;

$genuine = hash_equals(hash('sha512', $seq), strtolower($p('hash')));
$paid    = $genuine && $p('status') === 'success';
$status  = $genuine ? $p('status') : 'hash-mismatch';

$log = fopen(dirname(__DIR__) . '/ghar-orders.csv', 'a');
if ($log) {
    fputcsv($log, [date('c'), $p('txnid'), $status, $p('amount'), $p('firstname'), $p('email'), $p('phone'), $p('udf1'), $p('udf2'), '', '', $p('udf3'), $p('mihpayid')]);
    fclose($log);
}

if ($paid) {
    $body = "New paid order on gharmasala.com\n\n"
          . "Order ID: {$p('txnid')}\nPayU ID: {$p('mihpayid')}\nAmount: Rs {$p('amount')}\n\n"
          . "Items: {$p('udf3')}\n\nName: {$p('firstname')}\nPhone: {$p('phone')}\nEmail: {$p('email')}\n"
          . "Address: {$p('udf1')}\n{$p('udf2')}\n";
    @mail($cfg['notify'], "New order {$p('txnid')} - Rs {$p('amount')}", $body, 'From: orders@gharmasala.com');
}
$h = fn($v) => htmlspecialchars($v);
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title><?= $paid ? 'Order confirmed' : 'Payment not completed' ?> | Ghar Masala</title>
  <meta name="robots" content="noindex">
  <link rel="icon" href="images/favicon.png">
  <link href="https://fonts.googleapis.com/css2?family=Bree+Serif&family=Nunito+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style.css">
</head>
<body>
<main class="policy"><div class="wrap narrow"><section>
<?php if ($paid): ?>
  <img src="images/logo.png" alt="Ghar Masala" width="120" style="margin-bottom:16px">
  <h1>Thank you, <?= $h($p('firstname')) ?>!</h1>
  <p>Your payment of <b>₹<?= $h($p('amount')) ?></b> was successful and your order is confirmed.</p>
  <p>Order ID: <b><?= $h($p('txnid')) ?></b><br>Items: <?= $h($p('udf3')) ?></p>
  <p>We pack fresh and dispatch within 1–3 working days. Tracking details will be sent to <?= $h($p('email')) ?>.</p>
  <a class="btn btn-primary" href="index.html">Back to Ghar Masala</a>
  <script>try { localStorage.removeItem("cart"); } catch {}</script>
<?php else: ?>
  <h1>Payment not completed</h1>
  <p>Your payment did not go through, so no money has been taken for this order. If money was debited, it will be returned to you automatically by your bank.</p>
  <p>Order ID: <?= $h($p('txnid')) ?></p>
  <a class="btn btn-primary" href="checkout.html">Try again</a>
<?php endif; ?>
  <p class="co-note">Questions? Call +91 94658 00029 or email support@gharmasala.com.</p>
</section></div></main>
</body>
</html>
