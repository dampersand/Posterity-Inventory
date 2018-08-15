<?php

//
//put.php
//This function asks for an index, type, optionally an ID and record, and document parameters to add.
//It then creates a document at the specified place, replacing any existing documents.
//if the user is trying to add stuff to the 'users' index, some extra error checking happens.
//

require_once "definitions.php";
require_once _SECUREINCLUDE_ . "inventory-php/auth.php";
require_once _SECUREINCLUDE_ . "inventory-php/log.php";
require_once _SECUREINCLUDE_ . "elasticsearch-php/elasticsearch.php";

//note that we do auth further down in because of the authlevel difference of some indices.

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
  $authData = auth($inputJSON, 'put.php');
} else {
  $authData = auth();
}

//if not enough variables, or if id/record isn't called with its counterpart
if (!isset($inputJSON['index'], $inputJSON['parameters']) || (isset($inputJSON['id']) xor isset($inputJSON['record']))) {
  $retval['success'] = False;
  $retval['code'] = 41;
  $retval['text'] = 'Malformed or insufficient input';
  $logInput = [
    'flag' => 'BAD_INPUT',
    'call' => 'put.php',
    'subcall' => 'Not enough information when calling put.php',
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

//if the user is trying to do stuff in the 'users' index, it better be exactly right.
if ($inputJSON['index'] == 'users') {

  //make sure the input exists
  if (!isset($inputJSON['parameters']['password'], $inputJSON['parameters']['user'], $inputJSON['parameters']['permission'])) {
    $retval['success'] = False;
    $retval['code'] = 41;
    $retval['text'] = 'Malformed or insufficient input';
    $logInput = [
      'flag' => 'BAD_INPUT',
      'call' => 'put.php',
      'subcall' => 'Not enough information when calling put.php',
      'user' => $authData['user']
    ];
    inventoryLog($logInput);
    echo json_encode($retval);
    header('HTTP/1.1 400 Bad Request');
    exit;
  }

  //make sure the user isn't already set
  //run ES query to check
  $params = [
    'index' => 'users',
    'body' => [
      'query' => [
        'match' => [
          'user' => $inputJSON['parameters']['user']
        ]
      ]
    ]
  ];

  try {
    $response = $ES->search($params);
  } catch(Exception $err) {
    $retval['success'] = False;
    $retval['code'] = 20;
    $retval['text'] = 'Unhandled error when querying database';
    echo json_encode($retval);
    header('HTTP/1.1 500 Internal Server Error');
    exit;
  }

  //if the user already exists, quit
  if (!($response['hits']['total'] == 0)) {
    $retval['success'] = False;
    $retval['code'] = 21;
    $retval['text'] = 'Too many search results, consult the database admin';
    echo json_encode($retval);
    header('HTTP/1.1 403 Forbidden');
    exit;
  }

  //if the user is trying to add a password, hash it first
  if (isset($inputJSON['parameters']['password'])) {
    $inputJSON['parameters']['hash'] = password_hash($inputJSON['parameters']['password'], PASSWORD_DEFAULT);
    unset($inputJSON['parameters']['password']);
  }

  unset($params); //refresh this variable now that we're done with it
}

//if auth and input is clean, start building parameters
$params = [
  'index' => $inputJSON['index'],
  'type' => $inputJSON['type']
];


//if id is included, add to params, check record.
if (isset($inputJSON['id'])) {  

  //add id to params
  $params['id'] = $inputJSON['id'];

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
//    header('HTTP/1.1 400 Bad Request');
    exit;
  //otherwise, record matches, increment the record
  } else {
    $record = $inputJSON['record'] + 1;
  }

//if there was no id/record given, set record to 1 (first entry)
} else {
  $record = 1;
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
    if ($key == 'record' || $key == 'history') {
      continue;
    }
    $newHistory[$key] = $value;
  }

  //Finally, append $newHistory to history.
  array_push($inputJSON['parameters']['history'], $newHistory);

}

//init params body (for actual commit)
$params['body'] = [];


//direct filtering section because FU php
//this stupid section turns some specific nested values into numbers.  The way they SHOULD be.
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


foreach ($inputJSON['parameters'] as $key => $value) {
  //php	and javascript are FUCKING ASSHOLES, so	force any numeric value to become numeric, otherwise it gets passed as a string (WHY)
  //god, why is	our web	designed this way?  How	hard is	it to pass a freaking INTEGER IN AN ARRAY?!
  //also also, we have to directly code for one particular key (num) which, though sometimes numeric, should always be a string.
  //THANKS PHP!

  //in another show of assholery, any booleans passed to php by javascript get interpreted as strings.  Guys, this is the kind of crap that our web is built on.
  if (is_numeric($value) && ($key != 'num') && ($key != 'note')) {
    $value = $value + 0; //I absolutely promise this will bite	me in the ass someday. 	 9/14/2017 TODAY IS THAT DAY: ordered is now nested.  adding more kludge...      
  } else if (($key == 'pFlag') || ($key == 'distressFlag')) {
    $value = filter_var($value, FILTER_VALIDATE_BOOLEAN);
  } else if ($key == 'ordered') {
    foreach ($inputJSON['parameters']['ordered'] as $orderedkey => $orderedvalue) {
      $value[$orderedkey] = filter_var($orderedvalue, FILTER_VALIDATE_BOOLEAN);
    }
  }
  $params['body'][$key] = $value;
}

//include record from previous calculations (and overwrite any funny business)
$params['body']['record'] = $record;

try {
  $response = $ES->index($params);
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
