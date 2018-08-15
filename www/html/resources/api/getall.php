<?php
//
//getall.php
//this function asks for an index and optionally a type.
//this function returns all documents in that index (optionally type).
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
  $authData = auth($inputJSON, 'getall.php');
} else {
  $authData = auth();
}

//if not enough variables
if (!isset($inputJSON['index'])) {
  $retval['success'] = False;
  $retval['code'] = 41;
  $retval['text'] = 'Malformed or insufficient input';
  $logInput = [
    'flag' => 'BAD_INPUT',
    'call' => 'getall.php',
    'subcall' => 'Not enough information when calling getall.php',
    'user' => $authData['user']
  ];
  inventoryLog($logInput);
  echo json_encode($retval);
  header('HTTP/1.1 400 Bad Request');
  exit;
}

//if auth and stuff is clean, start building parameters
$params = [ 'index' => $inputJSON['index']];

//get max window size of index
try {
  $response = $ES->indices()->getSettings($params);
} catch (Exception $err) {
  $retval['success'] = False;
  $retval['code'] = 20;
  $retval['text'] = 'Unspecified elasticsearch error: ' . $err->getMessage();
  echo json_encode($retval);
  header('HTTP/1.1 500 Internal Server Error');
  exit;
}

//set search params, including size
$params['body'] = [
  'query' => [
    'match_all' => (object)[]
  ],
];

if (isset($response[$inputJSON['index']]["settings"]["index"]["max_result_window"])) {
  $params['size'] = intval($response[$inputJSON['index']]["settings"]["index"]["max_result_window"]);
} else {
  $params['size'] = 10000;
}

//if type was included, go ahead and put that in params
if (isset($inputJSON['type'])) {
  $params['type'] = $inputJSON['type'];
}

//set scroll timeout
$params['scroll'] = "1m";

//get initial document
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

$retval['data'] = $response['hits']['hits'];

while (isset($response['hits']['hits']) && count($response['hits']['hits']) > 0) {
  $scroll_id = $response['_scroll_id'];

  try {
    $response = $ES->scroll([
      "scroll_id" => $scroll_id,
      "scroll" => "1m"
    ]);
    $response = protect($response);
  } catch (Exception $err) {
    $retval['success'] = False;
    $retval['code'] = 20;
    $retval['text'] = 'Unspecified elasticsearch error: ' . $err->getMessage();
    echo json_encode($retval);
    header('HTTP/1.1 500 Internal Server Error');
    exit;
  }

  $retval['data'] = array_merge_recursive($retval['data'], $response['hits']['hits']);
};
echo json_encode($retval);

?>
