<?php

//
//getmax.php
//this function asks for an index and a key, then returns the document with the maximum of that key.
//

require_once "definitions.php";
require_once _SECUREINCLUDE_ . "inventory-php/auth.php";
require_once _SECUREINCLUDE_ . "inventory-php/log.php";
require_once _SECUREINCLUDE_ . "elasticsearch-php/elasticsearch.php";
require_once _SECUREINCLUDE_ . "inventory-php/protecthash.php";

//we authorize elsewhere because of the different authlevels of the indices.

//define retval
$retval = array(
  'success' => True,
  'code' => 0,
  'text' => 'Success!',
  'data' => array()
);

//get input variables
$inputJSON = $_POST;

//authorize (quits on failed auth, continues otherwise)
if (isset($inputJSON['index'])) {
  $authData = auth($inputJSON, 'getmax.php');
} else {
  $authData = auth();
}

//if not enough variables
if (!isset($inputJSON['index']) || (!isset($inputJSON['key']))) {
  $retval['success'] = False;
  $retval['code'] = 41;
  $retval['text'] = 'Malformed or insufficient input';
  $logInput = [
    'flag' => 'BAD_INPUT',
    'call' => 'getmax.php',
    'subcall' => 'Not enough information when calling getmax.php',
    'user' => $authData['user']
  ];
  inventoryLog($logInput);
  echo json_encode($retval);
  header('HTTP/1.1 400 Bad Request');
  exit;
}

//if auth and stuff is clean, start building parameters
$params = [
  'index' => $inputJSON['index'],
  'body' => [
    'query' => [
      'match_all' => (object)[]
    ],
    'sort' => [
      $inputJSON['key'] => [
        'order' => 'desc'
      ]
    ]
  ]
];

//if type was included, go ahead and put that in params
if (isset($inputJSON['type'])) {
  $params['type'] = $inputJSON['type'];
}

$params['size'] = 1;

//get items
try {
  $response = $ES->search($params);
  $response = protect($response);
} catch (Exception $err) {
  if ($err->getMessage() == "search_parse_exception: No mapping found for [" . $inputJSON['key'] . "] in order to sort on") {
    $retval['text'] = 'no such maximum';
    $retval['code'] = 23;
    $retval['data'] = 0;
    echo json_encode($retval);
    return;
  }
  $retval['success'] = False;
  $retval['code'] = 20;
  $retval['text'] = 'Unspecified elasticsearch error: ' . $err->getMessage();
  echo json_encode($retval);
  header('HTTP/1.1 500 Internal Server Error');
  exit;
}

$retval['data'] = $response;
echo json_encode($retval);

?>
