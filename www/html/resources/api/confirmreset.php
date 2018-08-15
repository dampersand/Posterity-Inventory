<?php

//
//confirmreset.php
//this function asks for a user and a password.
//this function auths on the key, then updates the user's password.
//

require_once "definitions.php";
require_once _SECUREINCLUDE_ . "inventory-php/auth.php";
require_once _SECUREINCLUDE_ . "inventory-php/log.php";
require_once _SECUREINCLUDE_ . "elasticsearch-php/elasticsearch.php";
require_once _SECUREINCLUDE_ . "inventory-php/protecthash.php";

//define retval
$retval = array(
  'success' => True,
  'code' => 0,
  'text' => 'Success!',
  'data' => array()
);

//get input variables
$inputJSON = $_POST;
$inputJSON['index'] = 'users';
$inputHeader = apache_request_headers();
$inputJSON['user'] = $_SERVER['PHP_AUTH_USER'];

//authorize (quits on failed auth, continues otherwise)
$inputJSON['search'] = [];
$inputJSON['search']['field'] = 'user';
$inputJSON['search']['value'] = $inputJSON['user'];
$authData = auth($inputJSON, 'confirmreset.php');

//if not enough variables
if (!isset($inputJSON['user'], $inputJSON['password'])) {
  $retval['success'] = False;
  $retval['code'] = 41;
  $retval['text'] = 'Malformed or insufficient input';
  $logInput = [
    'flag' => 'BAD_INPUT',
    'call' => 'confirmreset.php',
    'subcall' => 'Not enough information when calling confirmreset.php',
    'user' => $authData['user']
  ];
  inventoryLog($logInput);
  echo json_encode($retval);
  header('HTTP/1.1 400 Bad Request');
  exit;
}

//if auth and stuff is clean, start building parameters
$params = [
      'index' => 'users',
      'body' => [
        'query' => [
          'match' => [
            'user' => $inputJSON['user']
          ]
        ]
      ]
    ];

//if type was included, go ahead and put that in params
if (isset($inputJSON['type'])) {
  $params['type'] = $inputJSON['type'];
}

//get item
try {
  $response = $ES->search($params);
  $response = protect($response);
} catch (Exception $err) {
  $retval['success'] = False;
  $retval['code'] = 20;
  $retval['text'] = 'Unspecified elasticsearch error: ' . $err->getMessage();
  echo json_encode($retval);
  header('HTTP/1.1 500 Internal Server Error');
  exit;
}

//did the correct stuff come back?
if ($response['hits']['total'] == 0) {
  $retval['success'] = False;
  $retval['code'] = 13;
  $retval['text'] = 'Incorrect username or password';
  header('HTTP/1.1 401 Unauthorized');
  echo json_encode($retval);
  exit;
}

if ($response['hits']['total'] > 1) {
  $retval['success'] = False;
  $retval['code'] = 21;
  $retval['text'] = 'Too many search results, consult the database admin';
  header('HTTP/1.1 401 Unauthorized');
  echo json_encode($retval);
  exit;
}

//set up new ES call to update db
$params = [
  'index' => $inputJSON['index'],
  'type' => '1',
  'id' => $response['hits']['hits'][0]['_id'],
  'body' => []
];

$params['body']['doc'] = [];
$params['body']['doc']['hash'] = password_hash($inputJSON['password'], PASSWORD_DEFAULT);
$params['body']['doc']['recovery'] = '';

try {
  $response = $ES->update($params);
} catch (Exception $err) {
  $retval['success'] = False;
  $retval['code'] = 20;
  $retval['text'] = 'Unspecified elasticsearch error: ' . $err->getMessage();
  header('HTTP/1.1 500 Internal Server Error');
  echo json_encode($retval);
  exit;
}

echo json_encode($retval);

?>
