<?php

//
//search.php
//this function asks for an index and optionally a type.
//this function should also be called with a 'parameters' set of entries.  The function will then return all documents in the index matching the parameters.
//A 'parameters' entry can be either 'range' or 'match', depending on whether you want to search for a match or search for something that falls within a range.  'match' entries should be set to a key/term combo to search on e.g. 'keyword' => 'test' or 'user' => 'dan'. 'range' entries should be set to the ranges you want to find using Elasticsearch's 'gt', 'gte', 'lt', 'lte' methods.  An example range parameter would be ['range']['price']['lte'] = 10.  Two bounds may be specified.
//this function can also be called with a 'nested' argument in order to search a nested (read: array) document in elasticsearch.  the 'nested' argument should be a dict that includes a 'path' key (specifying the name of the nested field e.g. the 'history' field in the serials index, or the 'priceHistory' field in the items index), and a 'parameters' argument structured the exact same way as the parameters argument above.  Note that this parameters argument will only search the nested path, so if there's a 'status' in both the root document and the nested part of the document, you won't get any collisions.
//if a nested search is called, the function will ALSO return all inner hits - meaning it will also return an array of all the nested entries that fit the criteria.
//Example search:
//inputJSON['index'] = 'serial'
//inputJSON['nested']['path'] = 'history'
//path = inputJSON['nested']['path']
//inputJSON['parameters']['match']['keyword'] = '1test'
//inputJSON['parameters']['range']['price']['gte'] = 10
//inputJSON['nested']['parameters']['match'][path . '.user'] = 'danpuser'
//inputJSON['nested']['parameters']['range'][path . '.date']['gte'] = '2016-01-01 12:00:00'
//inputJSON['nested']['parameters']['range'][path . '.date']['lte'] = '2016-02-01 12:00:00'
//this search would search the serials index for keywords matching '1test' and price greater than 10.  Additionally, it would only return documents that ALSO have a history entry made by danpuser later than Jan 1, 2016 at noon and earlier than Feb 1, 2016 at noon.
//note that currently the function only supports nesting searches that exist directly in the root of the document.  Double-nesting or searching on multiple nested fields is unsupported, but could be added fairly easily.
//As of the current version, this uses the 'bool' feature of elasticsearch.
//You can search for multiple things, but will only receive exact matches on all those things.
//Elasticsearch provides some really cool stuff, though, so this API can be expanded as needed.
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
  $authData = auth($inputJSON, 'search.php');
} else {
  $authData = auth();
}

//if not enough variables
if (!isset($inputJSON['index']) || (!isset($inputJSON['parameters']))) {
  $retval['success'] = False;
  $retval['code'] = 41;
  $retval['text'] = 'Malformed or insufficient input';
  $logInput = [
    'flag' => 'BAD_INPUT',
    'call' => 'search.php',
    'subcall' => 'Not enough information when calling search.php',
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
      'bool' => [
        'must' => []
      ]
    ]
  ]
];

//if type was included, go ahead and put that in params
if (isset($inputJSON['type'])) {
  $params['type'] = $inputJSON['type'];
}

//normal parameters (root document) section
//as I add search functionality, this becomes a nightmare and needs just completely overhauled.
$count = 0;
foreach ($inputJSON['parameters'] as $matchtype => $matchvalue) {
  if ($matchtype == 'range') {
    foreach($inputJSON['parameters']['range'] as $key => $value) {
      $params['body']['query']['bool']['must'][$count]['range'][$key] = $value;
      $count = $count + 1;
    }
  } else if ($matchtype == 'match') {
    foreach($inputJSON['parameters']['match'] as $key => $value) {
      $params['body']['query']['bool']['must'][$count]['match'][$key] = $value;
      $count = $count + 1;
    }
  } else if ($matchtype == 'not') {
    foreach ($inputJSON[$searchIndex]['parameters']['not'] as $nottype => $notvalue) {
      if ($nottype == 'range') {
        foreach($inputJSON[$searchIndex]['parameters']['not']['range'] as $key => $value) {
          $nextSearchQuery['query']['bool']['must'][$count]['not']['range'][$key] = $value;
          $count = $count + 1;
        }
      } else if ($nottype == 'match') {
        foreach($inputJSON[$searchIndex]['parameters']['not']['match'] as $key => $value) {
          $nextSearchQuery['query']['bool']['must'][$count]['not']['match'][$key] = $value;
          $count = $count + 1;
        }
      }
    }
  }
}

//nested parameters (nested once in the root document) section
//as I add search functionality, this becomes a nightmare and needs just completely overhauled.
if (isset($inputJSON['nested'], $inputJSON['nested']['path'], $inputJSON['nested']['parameters'])) {
  $params['body']['query']['bool']['must'][$count]['nested']['path'] = $inputJSON['nested']['path'];
  $params['body']['query']['bool']['must'][$count]['nested']['inner_hits'] = (object)[];
  $count2 = 0;
  foreach ($inputJSON['nested']['parameters'] as $matchtype => $matchvalue) {
    if ($matchtype == 'range') {
      foreach ($inputJSON['nested']['parameters']['range'] as $key => $value) {
        $params['body']['query']['bool']['must'][$count]['nested']['query']['bool']['must'][$count2]['range'][$inputJSON['nested']['path'] . '.' . $key] = $value;
        $count2 = $count2 + 1;
      }
    } else if ($matchtype == 'match') {
      foreach ($inputJSON['nested']['parameters']['match'] as $key => $value) {
        $params['body']['query']['bool']['must'][$count]['nested']['query']['bool']['must'][$count2]['match'][$inputJSON['nested']['path'] . '.' . $key] = $value;
        $count2 = $count2 + 1;
      }
    } else if ($matchtype == 'not') {
      foreach ($inputJSON[$searchIndex]['nested']['parameters']['not'] as $nottype => $notvalue) {
        if ($nottype == 'range') {
          foreach($inputJSON[$searchIndex]['nested']['parameters']['not']['range'] as $key => $value) {
            $nextSearchQuery['query']['bool']['must'][$count]['nested']['query']['bool']['must'][$count2]['not']['range'][$inputJSON[$searchIndex]['nested']['path'] . '.' . $key] = $value;
            $count = $count + 1;
          }
        } else if ($nottype == 'match') {
          foreach($inputJSON[$searchIndex]['nested']['parameters']['not']['match'] as $key => $value) {
            $nextSearchQuery['query']['bool']['must'][$count]['nested']['query']['bool']['must'][$count2]['not']['match'][$inputJSON[$searchIndex]['nested']['path'] . '.' . $key] = $value;
            $count = $count + 1;
          }
        }
      }
    }
  }
}

//count number of items
try {
  $response = $ES->count($params);
} catch (Exception $err) {
  $retval['success'] = False;
  $retval['code'] = 20;
  $retval['text'] = 'Unspecified elasticsearch error: ' . $err->getMessage();
  echo json_encode($retval);
  header('HTTP/1.1 500 Internal Server Error');
  exit;
}

$size = $response['count'];
$params['size'] = $size;

//get items
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

$retval['data'] = $response;
echo json_encode($retval);

?>
