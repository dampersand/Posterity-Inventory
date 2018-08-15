<?php

//
//delete.php
//this function takes in an index, type, and document ID, then deletes it.
//

require_once "definitions.php";
require_once _SECUREINCLUDE_ . "inventory-php/auth.php";
require_once _SECUREINCLUDE_ . "inventory-php/log.php";
require_once _SECUREINCLUDE_ . "elasticsearch-php/elasticsearch.php";

//define retval
$retval = array(
  'success' => True,
  'code' => 0,
  'text' => 'Success!',
  'data' => array()
);

//get input variables
$inputJSON = $_POST;

if (isset($inputJSON['index'])) {
  $authData = auth($inputJSON, 'delete.php');
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
    'call' => 'delete.php',
    'subcall' => 'Not enough information when calling delete.php',
    'user' => $authData['user']
  ];
  inventoryLog($logInput);
  echo json_encode($retval);
  header('HTTP/1.1 400 Bad Request');
  exit;
}

//fix empty categories
if (!isset($inputJSON['type']) || $inputJSON['type'] == '') {
  $inputJSON['type'] = '1';
}

$params = [
    'index' => $inputJSON['index'],
    'type' => $inputJSON['type'],
    'id' => $inputJSON['id']
];

try {
  $response = $ES->delete($params);
} catch (Exception $err) {
  $retval['success'] = False;
  $retval['code'] = 20;
  $retval['text'] = 'Unspecified elasticsearch error: ' . $err->getMessage();
  echo json_encode($retval);
  header('HTTP/1.1 500 Internal Server Error');
  exit;
}

//log here!

$retval['data'] = $response;
echo json_encode($retval);

?>
