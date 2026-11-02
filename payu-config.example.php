<?php
// Copy this file to payu-config.php ONE folder ABOVE public_html (not inside it), then fill in the
// values from the PayU dashboard. Never commit payu-config.php or put the salt anywhere else.
return [
    'key'    => 'YOUR_PAYU_MERCHANT_KEY',
    'salt'   => 'YOUR_PAYU_MERCHANT_SALT',
    'mode'   => 'test',                      // 'test' while testing, 'live' after PayU approval
    'site'   => 'https://gharmasala.com',    // used for the return URL
    'notify' => 'support@gharmasala.com',    // new paid orders are emailed here
];
