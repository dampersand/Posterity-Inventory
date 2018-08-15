<?php

//
//msearch.php
//this function asks for a simple-list array.
//inside the array should be a set of searches.
//each search should be set up exactly the same way an entry in 'search.php' should be set up.
//Example search:
//inputJSON[0]['index'] = 'serial'
//inputJSON[0]['nested']['path'] = 'history'
//path = inputJSON['nested']['path']
//inputJSON[0]['parameters']['match']['keyword'] = '1test'
//inputJSON[0]['parameters']['range']['price']['gte'] = 10
//inputJSON[0]['nested']['parameters']['match'][path . '.user'] = 'danpuser'
//inputJSON[0]['nested']['parameters']['range'][path . '.date']['gte'] = '2016-01-01 12:00:00'
//inputJSON[0]['nested']['parameters']['range'][path . '.date']['lte'] = '2016-02-01 12:00:00'
//inputJSON[1]['index'] = 'items'
//inputJSON[1]['parameters']['category'] = 'Hard Drive'
//this search would search the serials index for keywords matching '1test' and price greater than 10.  Additionally, it would only return documents that ALSO have a history entry made by danpuser later than Jan 1, 2016 at noon and earlier than Feb 1, 2016 at noon.
//this search would ALSO, completely separately, search the items index for items of category 'Hard Drive' and return all those documents, too.
//As of the current version, this uses the 'bool' feature of elasticsearch.
//You can search for multiple things, but will only receive exact matches on all those things.
//Elasticsearch provides some really cool stuff, though, so this API can be expanded as needed.
//

define('BIG_NUMBER', 10000); //a number larger than all the documents in Elasticsearch, so we have a 'size' call for ES docs.  This is stupid and I hate it, but it's cheaper than running 'count' for every single search.

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

//authorize for EACH search
foreach ($inputJSON as $key => $value) {
  if (isset($inputJSON[$key]['index'])) {
    $authData = auth($inputJSON[$key], 'msearch.php');
  } else {
    $authData = auth();
  }
}

//if not enough variables
foreach ($inputJSON as $key => $value) {
  if (!isset($inputJSON[$key]['index']) || ((!isset($inputJSON[$key]['parameters'])) && (!isset($inputJSON[$key]['nested'])))) {
    $retval['success'] = False;
    $retval['code'] = 41;
    $retval['text'] = 'Malformed or insufficient input';
    $logInput = [
      'flag' => 'BAD_INPUT',
      'call' => 'msearch.php',
      'subcall' => 'Not enough information when calling msearch.php',
      'user' => $authData['user']
    ];
    inventoryLog($logInput);
    echo json_encode($retval);
    header('HTTP/1.1 400 Bad Request');
    exit;
  }
}

//if auth and stuff is clean, start building parameters
$params = [];

//for each search
foreach($inputJSON as $searchIndex => $search) {

  //if a type exists, add it, else, dump it
  if (isset($inputJSON[$searchIndex]['type'])) {
    $type = $inputJSON[$searchIndex]['type'];
  } else {
    $type = '1';
  }

  //add index line
  $params['body'][] = [
    'index' => $search['index'],
    'type' => $type
  ];

  $nextSearchQuery = [];
  $nextSearchQuery['size'] = BIG_NUMBER;

  //parse parameters into nextSearchQuery
  //as I add search functionality, this becomes a nightmare and needs just completely overhauled.
  //also, counters are broken into must and mustntcounts, so we don't accidentally have an array with indices '0' and '2', or something.
  $mustCount = 0;
  $mustntCount = 0;
  foreach ($inputJSON[$searchIndex]['parameters'] as $matchtype => $matchvalue) {
    if ($matchtype == 'range') {
      foreach($inputJSON[$searchIndex]['parameters']['range'] as $key => $value) {
        $nextSearchQuery['query']['bool']['must'][$mustCount]['range'][$key] = $value;
        $mustCount = $mustCount + 1;
      }
    } else if ($matchtype == 'match') {
      foreach($inputJSON[$searchIndex]['parameters']['match'] as $key => $value) {
        $nextSearchQuery['query']['bool']['must'][$mustCount]['match'][$key] = $value;
        $mustCount = $mustCount + 1;
      }
    } else if ($matchtype == 'not') {
      foreach ($inputJSON[$searchIndex]['parameters']['not'] as $nottype => $notvalue) {
        if ($nottype == 'range') {
          foreach($inputJSON[$searchIndex]['parameters']['not']['range'] as $key => $value) {
            $nextSearchQuery['query']['bool']['must_not'][$mustntCount]['range'][$key] = $value;
            $mustntCount = $mustntCount + 1;
          }
        } else if ($nottype == 'match') {
          foreach($inputJSON[$searchIndex]['parameters']['not']['match'] as $key => $value) {
            $nextSearchQuery['query']['bool']['must_not'][$mustntCount]['match'][$key] = $value;
            $mustntCount = $mustntCount + 1;
          }
        } else if ($nottype == 'terms') {
          foreach($inputJSON[$searchIndex]['parameters']['not']['terms'] as $key => $value) {
            $nextSearchQuery['query']['bool']['must_not'][$mustntCount]['terms'][$key] = $value;
            $mustntCount = $mustntCount + 1;
          }
        }
      }
    }
  }

  //parse nested parameters into nextSearchQuery
  //as I add search functionality, this becomes a nightmare and needs just completely overhauled.
  if (isset($inputJSON[$searchIndex]['nested'], $inputJSON[$searchIndex]['nested']['path'], $inputJSON[$searchIndex]['nested']['parameters'])) {
    $nextSearchQuery['query']['bool']['must'][$mustCount]['nested']['path'] = $inputJSON[$searchIndex]['nested']['path'];
    $nextSearchQuery['query']['bool']['must'][$mustCount]['nested']['inner_hits'] = [];
    $nextSearchQuery['query']['bool']['must'][$mustCount]['nested']['inner_hits']['size'] = BIG_NUMBER;
    $mustCount2 = 0;
    $mustntCount2 = 0;
    foreach ($inputJSON[$searchIndex]['nested']['parameters'] as $matchtype => $matchvalue) {
      if ($matchtype == 'range') {
        foreach ($inputJSON[$searchIndex]['nested']['parameters']['range'] as $key => $value) {
          $nextSearchQuery['query']['bool']['must'][$mustCount]['nested']['query']['bool']['must'][$mustCount2]['range'][$inputJSON[$searchIndex]['nested']['path'] . '.' . $key] = $value;
          $mustCount2 = $mustCount2 + 1;
        }
      } else if ($matchtype == 'match') {
        foreach ($inputJSON[$searchIndex]['nested']['parameters']['match'] as $key => $value) {
          $nextSearchQuery['query']['bool']['must'][$mustCount]['nested']['query']['bool']['must'][$mustCount2]['match'][$inputJSON[$searchIndex]['nested']['path'] . '.' . $key] = $value;
          $mustCount2 = $mustCount2 + 1;
        }
      } else if ($matchtype == 'not') {
        foreach ($inputJSON[$searchIndex]['nested']['parameters']['not'] as $nottype => $notvalue) {
          if ($nottype == 'range') {
            foreach($inputJSON[$searchIndex]['nested']['parameters']['not']['range'] as $key => $value) {
              $nextSearchQuery['query']['bool']['must'][$mustCount]['nested']['query']['bool']['must_not'][$mustntCount2]['range'][$inputJSON[$searchIndex]['nested']['path'] . '.' . $key] = $value;
              $mustntCount2 = $mustntCount2 + 1;
            }
          } else if ($nottype == 'match') {
            foreach($inputJSON[$searchIndex]['nested']['parameters']['not']['match'] as $key => $value) {
              $nextSearchQuery['query']['bool']['must'][$mustCount]['nested']['query']['bool']['must_not'][$mustntCount2]['match'][$inputJSON[$searchIndex]['nested']['path'] . '.' . $key] = $value;
              $mustntCount2 = $mustntCount2 + 1;
            }
          }
        }
      }
    }
  }

  //jam nextSearchQuery into $params
  $params['body'][] = $nextSearchQuery;
  
  //this commented out section remains to show how things should work, just in case I have trouble with the Bulk API.
  //the bulk API is so much worse than the QueryDSL.
  /*$params['body'][] = [
    'query' => [
      'bool' => [
        'must' => [
          0 => [
            'match' => [
              'name' =>'1test'
            ]
          ]
        ]
      ]
    ]
  ];

  $params['body'][] = [
    'index' => $search['index'],
    'type' => $type
  ];

  $params['body'][] = [
    'query' => [
      'bool' => [
        'must' => [
          0 => [
            'match' => [
              'name' =>'2test'
            ]
          ],
          1 => [
            'nested' => [
              'path' => 'history',
              'query' => [
                'bool' => [
                  'must' => [
                    0 => [
                      'range' => [
                        'history.price' => [
                          'gte' => "-1"
                        ]
                      ]
                    ]
                  ]
                ]
              ]
            ]
          ]
        ]
      ]
    ]
  ];*/

}

//get items
try {
  $response = $ES->msearch($params);
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