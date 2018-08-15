<?php

//
//get.php
//this function takes in an index, document ID, and optionally a type, then returns the entire document.
//

require_once "definitions.php";
require_once _SECUREINCLUDE_ . "inventory-php/auth.php";
require_once _SECUREINCLUDE_ . "inventory-php/log.php";
require_once _SECUREINCLUDE_ . "elasticsearch-php/elasticsearch.php";
require_once _SECUREINCLUDE_ . "inventory-php/protecthash.php";

//note that we are doing authorization after receiving the variables because of the authlevel difference

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
  $authData = auth($inputJSON, 'get.php');
} else {
  $authData = auth();
}

//if not enough variables
if (!isset($inputJSON['index'], $inputJSON['id'])) {
  $retval['success'] = False;
  $retval['code'] = 41;
  $retval['text'] = 'Malformed or insufficient input';
  $logInput = [
    'flag' => 'BAD_INPUT',
    'call' => 'get.php',
    'subcall' => 'Not enough information when calling get.php',
    'user' => $authData['user']
  ];
  inventoryLog($logInput);
  echo json_encode($retval);
  header('HTTP/1.1 400 Bad Request');
  exit;
}

//build ES call
$params = [
    'index' => $inputJSON['index'],
    'type' => '1',
    'id' => $inputJSON['id']
];

//if type was included, go ahead and put that in params
if (isset($inputJSON['type'])) {
  $params['type'] = $inputJSON['type'];
}

try {
  $response = $ES->get($params);
  $response = protect($response);
} catch (Exception $err) {
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
