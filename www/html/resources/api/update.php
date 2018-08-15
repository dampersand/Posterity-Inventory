<?php

//
//update.php
//This function asks for an index, type, ID, record, and document parameters to update.
//It then updates the fields in the parameters entry.
//if the user is trying to add stuff to the 'users' index, some extra error checking happens.
//

require_once "definitions.php";
require_once _SECUREINCLUDE_ . "inventory-php/auth.php";
require_once _SECUREINCLUDE_ . "inventory-php/log.php";
require_once _SECUREINCLUDE_ . "elasticsearch-php/elasticsearch.php";


//auth is done later due to different authlevels of indices. 

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
  $authData = auth($inputJSON, 'update.php');
} else {
  $authData = auth();
}

//if not enough variables
if (!isset($inputJSON['index'], $inputJSON['id'], $inputJSON['parameters'], $inputJSON['record'])) {
  $retval['success'] = False;
  $retval['code'] = 41;
  $retval['text'] = 'Malformed or insufficient input';
  $logInput = [
    'flag' => 'BAD_INPUT',
    'call' => 'update.php',
    'subcall' => 'Not enough information when calling update.php',
    'user' => $authData['user']
  ];
  inventoryLog($logInput);
  header('HTTP/1.1 400 Bad Request');
  echo json_encode($retval);
  exit;
}

//fix empty categories
if (!isset($inputJSON['type']) || $inputJSON['type'] == '') {
  $inputJSON['type'] = '1';
}

//if the user is trying to do stuff in the 'users' index, it better be exactly right.
if ($inputJSON['index'] == 'users') {

  //if the user is trying to update a password, hash it first
  if (isset($inputJSON['parameters']['password'])) {
    $inputJSON['parameters']['hash'] = password_hash($inputJSON['parameters']['password'], PASSWORD_DEFAULT);
    unset($inputJSON['parameters']['password']);
  }
}

//if auth and input is clean, init params and check record.
$params = [
  'index' => $inputJSON['index'],
  'type' => $inputJSON['type'],
  'id' => $inputJSON['id']
];

//get record
try {
  $response = $ES->get($params);
} catch (Exception $err) {
  $retval['success'] = False;
  $retval['code'] = 20;
  $retval['text'] = 'Unspecified elasticsearch error: ' . $err->getMessage();
  echo json_encode($retval);
  header('HTTP/1.1 500 Internal Server Error');
  exit;
}

//handle legacy entries (those that lack records) by setting record to expected plus one.
if (!isset($response['_source']['record'])) {
  $record = $inputJSON['record'] + 1;
//handle incorrect record expectation (someone else updated before you did)
} else if ($response['_source']['record'] != $inputJSON['record']) {
  $retval['success'] = False;
  $retval['code'] = 22;
  $retval['text'] = 'Document has been changed elsewhere, update canceled';
  echo json_encode($retval);
//  header('HTTP/1.1 400 Bad Request');
  exit;
//otherwise, record matches, increment the record
} else {
  $record = $inputJSON['record'] + 1;
}

//if the user is working in the 'builds' database:
if ($inputJSON['index'] == 'builds') {

  //they shouldn't be submitting a history.
  $inputJSON['parameters']['history'] = [];

  //and if we found a history when searching by id (previous section), build a history out of that.
  if (isset($response['_source']['history'])) {
    $inputJSON['parameters']['history'] = $response['_source']['history'];
  }

  //build our new history
  $newHistory = array(
    "editor" => $authData['user'],
    "editdate" => date('Y-m-d')
    );

  //populate new history with whatever the user just did (minus record).  This won't get nested shit.
  foreach ($inputJSON['parameters'] as $key => $value) {
    if ($key == 'record' || $key =='history') {
      continue;
    }
    $newHistory[$key] = $value;
  }

  //Finally, append $newHistory to history.
  array_push($inputJSON['parameters']['history'], $newHistory);

}

//if record is clean, start building parameters
$params['body'] = [];
$params['body']['doc'] = [];


//direct filtering section because FU php.  This section goes against my philosophy of separating backend from frontend.
//Here, be dragons, beware.
//force specific nested numeric value to become numeric, otherwise it gets passed as a string (WHY)
//god, why is our web designed this way?  How hard is it to pass a freaking INTEGER IN AN ARRAY?!
if (isset($inputJSON['parameters']['priceHistory'])) {
  foreach($inputJSON['parameters']['priceHistory'] as $key => $value) { //note the form $key => $value must exist in order to edit the original $inputJSON using $key
    $inputJSON['parameters']['priceHistory'][$key]['price'] = $inputJSON['parameters']['priceHistory'][$key]['price'] + 0;
  }
}

if (isset($inputJSON['parameters']['history'])) {
  foreach($inputJSON['parameters']['history'] as $key => $value) { //note the form $key => $value must exist in order to edit the original $inputJSON using $key
    if (isset($inputJSON['parameters']['history'][$key]['price'])) {
      $inputJSON['parameters']['history'][$key]['price'] = $inputJSON['parameters']['history'][$key]['price'] + 0;
    }
  }
}

if (isset($inputJSON['parameters']['amount'])) {
  foreach($inputJSON['parameters']['amount'] as $key => $value) { //note the form $key => $value must exist in order to edit the original $inputJSON using $key
    $inputJSON['parameters']['amount'][$key] = $inputJSON['parameters']['amount'][$key] + 0;
  }
}

if (isset($inputJSON['parameters']['threshold'])) {
  foreach($inputJSON['parameters']['threshold'] as $key => $value) { //note the form $key => $value must exist in order to edit the original $inputJSON using $key
    $inputJSON['parameters']['threshold'][$key] = $inputJSON['parameters']['threshold'][$key] + 0;
  }
}

//also also, we have to directly code for two particular keys (num and note) which, though sometimes numeric, should always be strings.
//THANKS PHP!
foreach ($inputJSON['parameters'] as $key => $value) {

  //in another show of assholery, any booleans passed to php by javascript get interpreted as strings.  Guys, this is the kind of crap that our web is built on.
  if (is_numeric($value) && ($key != "num") && ($key != 'note')) {
    $value = $value + 0; //I absolutely promise this will bite me in the ass someday.   9/14/2017 TODAY IS THAT DAY: ordered is now nested.  adding more kludge...      
  } else if (($key == 'pFlag') || ($key == 'distressFlag')) {
    $value = filter_var($value, FILTER_VALIDATE_BOOLEAN);
  } else if ($key == 'ordered') {
    foreach ($inputJSON['parameters']['ordered'] as $orderedkey => $orderedvalue) {
      $value[$orderedkey] = filter_var($orderedvalue, FILTER_VALIDATE_BOOLEAN);
    }
  }
  $params['body']['doc'][$key] = $value;  
}

//include record, overwrite any funny business
$params['body']['doc']['record'] = $record;

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

$retval['data'] = $response;
echo json_encode($retval);

?>
