<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

'paths' => ['api/*', 'sanctum/csrf-cookie'],
'allowed_origins' => ['http://localhost:5173'], // دقیقاً همین آدرس
'allowed_headers' => ['*'], // یا لیست دقیق شامل 'X-XSRF-TOKEN', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'
'allowed_methods' => ['*'], // یا لیست دقیق شامل 'GET', 'POST', 'OPTIONS'
'supports_credentials' => true, // <-- MUST BE TRUE

];
