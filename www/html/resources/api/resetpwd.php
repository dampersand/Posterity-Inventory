<?php

//
//resetpwd.php
//This function asks for a user.
//It then searches for the user and, if the user is found, sets the 'distressFlag' key to true for use with minikeeper 
//It also sets the time of request as 'dTime' for use with minikeeper
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

//No auth.  That means whatever is done must be completely internal.  No data (beyond failed DB calls) should be returned to the user.

//if not enough variables
if (!isset($inputJSON['user'])) {
  $retval['success'] = False;
  $retval['code'] = 41;
  $retval['text'] = 'Malformed or insufficient input';
  $logInput = [
    'flag' => 'BAD_INPUT',
    'call' => 'resetpwd.php',
    'subcall' => 'Not enough information when calling update.php',
    'user' => $authData['user']
  ];
  inventoryLog($logInput);
  header('HTTP/1.1 400 Bad Request');
  echo json_encode($retval);
  exit;
}


//if input is clean, find user.
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

//get userID
try {
  $response = $ES->search($params);
} catch(Exception $err) {
  $retval['success'] = False;
  $retval['code'] = 20;
  $retval['text'] = 'Unhandled error when querying database';
  header('HTTP/1.1 500 Internal Server Error');
  echo json_encode($retval);
  exit;
} 

//be sure that hits are found
if (!isset($response['hits'])) {
  $retval['success'] = False;
  $retval['code'] = 20;
  $retval['text'] = 'Unhandled error when querying database';
  header('HTTP/1.1 500 Internal Server Error');
  echo json_encode($retval);
  exit;
}

//if we found none (or too many) of the user in question, quit (don't inform the user)
if ($response['hits']['total'] > 1 || $response['hits']['total'] === 0) {
  echo json_encode($retval);
  exit;
}

//otherwise, we must have found the user.  Verify that ID exists, otherwise exit (don't inform the user)
if (!isset($response['hits']['hits'][0]['_id'])) {
  echo json_encode($retval);
  exit;
}

//and if ID does exist, set up params to update the distressFlag
$params = [
  'index' => 'users',
  'type' => '1',
  'id' => $response['hits']['hits'][0]['_id'],
  'body' => []
];

$params['body']['doc'] = [];
$params['body']['doc']['distressFlag'] = True;
$params['body']['doc']['dTime'] = date('Y-m-d H:i:s');

//send info to ES
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

//if done here, echo the 'success' retval
echo json_encode($retval);

?>
