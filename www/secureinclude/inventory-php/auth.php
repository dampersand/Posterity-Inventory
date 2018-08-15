<?php

//
//auth.php
//This php file should test for authentication based on a token or a password/key check.  It should also check for a login attempt.
//from a design standpoint, auth's job is to take credentials and a request and decide whether or not the creds are acceptable to allow the request.
//This php file should be included at the top of every translation layer.
//the function should be called with $request, which is an array that should include ['index'] and optionally ['id'] or ['search'] (and ['search'] should include ['field'], a field to search on, and ['value'], a value to search for).
//It is additionally called with a 'caller' field to know what part of the API is calling.  This can be used for future security if needed.
//on a login attempt, verify, then set the cookie and return retval (success or failure).
//on an authentication attempt, check for an auth header
//if the authentication header just supplies a password, auth it against the document (if available) and the index (if the document auth fails or is unavailable).  On failure, try authing again using the recovery key.  If you still fail, echo retval and quit.  On success, return decoded data array.
//if the authentication header supplies a token, auth it against the document (if available) and the index (if the document auth fails or is unavailable).  On a failure, echo retval and quit; on success, return decoded data array.
//if the authentication header supplies nothing or expired, echo retval and quit.
//

//get dependencies
require_once('/var/www/html/resources/api/definitions.php');
require_once(_SECUREINCLUDE_ . 'firebase/vendor/autoload.php');
use \Firebase\JWT\JWT;
require_once(_SECUREINCLUDE_ . 'inventory-php/key.php');
require_once(_SECUREINCLUDE_ . 'elasticsearch-php/elasticsearch.php');
require_once(_SECUREINCLUDE_ . 'inventory-php/log.php');

function auth($request = [], $caller='auth.php') {
  //set parameters and get variables
  define('ALGORITHM','HS512');
  $inputHeader = apache_request_headers();
  global $ES;

  $login = False;


  //get the referer, determine if it includes a locale code
  if (strpos($_SERVER['HTTP_REFERER'], '-') == False) {
    $locale = '';
  } else {
    $locale = substr($_SERVER['HTTP_REFERER'], strpos($_SERVER['HTTP_REFERER'], '//') + 2, strpos($_SERVER['HTTP_REFERER'], '-') - strpos($_SERVER['HTTP_REFERER'], '//') - 2) . '-';
  }

  if (isset($_REQUEST['action'])) {
    if ($_REQUEST['action'] == 'login') {
      $login = True;
    }
  }

  //build generic retval
  $retval = array(
    'success' => True,
    'code' => 0,
    'text' => 'Success!',
    'data' => array()
  );

  //begin login block
  if ($login) {

    //sanitize input
    if (!(isset($_SERVER['PHP_AUTH_USER'], $_SERVER['PHP_AUTH_PW'])) || ($_SERVER['PHP_AUTH_USER'] == '') || ($_SERVER['PHP_AUTH_PW'] == '')) {
      $retval['success'] = False;
      $retval['code'] = 11;
      $retval['text'] = 'Blank or null user or password';
      header('HTTP/1.1 400 Bad Request');
      echo json_encode($retval);
      exit;
    }

    //set up ES query
    $params = [
      'index' => 'users',
      'body' => [
        'query' => [
          'match' => [
            'user' => $_SERVER['PHP_AUTH_USER']
          ]
        ]
      ]
    ];

    //get user's hash and handle trouble
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

    //determine legitimacy
  
    //verify password
    $auth = password_verify($_SERVER['PHP_AUTH_PW'], $response['hits']['hits'][0]['_source']['hash']);
    if (!$auth) {
      $retval['success'] = False;
      $retval['code'] = 13;
      $retval['text'] = 'Incorrect username or password';
      header('HTTP/1.1 401 Unauthorized');
      echo json_encode($retval);
      exit;
    }

    //legitimate, move forward
    $tokenID = base64_encode(random_bytes(32));
    $issuedAt = time();
    $notBefore = $issuedAt;
    $expire = $notBefore + 43200;
    //$expire = $notBefore + 10;
    $serverName = $_SERVER['HTTP_REFERER'];

    //produce 10 year token for huduser
    if ($response['hits']['hits'][0]['_source']['user'] === "huduser") {
      $expire = $expire + 315400000;
    }

    //build token params
    $data = [
      'iat' => $issuedAt,
      'iss' => $serverName,
      'jti' => $tokenID,
      'nbf' => $notBefore,
      'exp' => $expire,
      'data' => [
        'user' => $_SERVER['PHP_AUTH_USER'],
        'permission' => $response['hits']['hits'][0]['_source']['permission']
      ]
    ];

 
    //produce token
    $secretKey = base64_decode(KEY);
    $jwt = JWT::encode(
      $data,
      $secretKey,
      ALGORITHM
    );

    $retval['data'] = [
      'time' => $issuedAt,
      'expires' => $expire
    ];

    setcookie("Inventoken", $jwt, $expire, '/', $locale . 'inventory.yourdomain.net', true, true);

    echo json_encode($retval);
    exit;

  } else {  //if we didn't call for a login, we expect the user is trying to access something.  check the document/index in question and get the authlevel required

    //sanitize input
    if (!isset($request['index'])) {
      $retval['success'] = False;
      $retval['code'] = 16;
      $retval['text'] = 'No input provided';
      header('HTTP/1.1 401 Unauthorized');
      echo json_encode($retval);
      exit;
    }

    //if the referer is the inventory frontend, nuke any cookies we find by expiring them and dumping them from $_COOKIE var
    if(strpos($_SERVER['HTTP_REFERER'], "https://" . $locale . "inventory.yourdomain.net/inventory/") === 0) {
    	//this line dumps the entire cookie, but I think all we need to do is unset the $_COOKIE var when going to inventory
    	//setcookie("Inventoken", "", time()-100000, "/", "inventory.yourdomain.net");
    	unset($_COOKIE["Inventoken"]);
    }

    //start building authentication requirements for this document/index.
    //start with 'unauthenticatable'
    $authReqs = [];
    $authReqs['permission'] = 999; 

    //if the user has a specific document they want to look at, check that doc's authlevel first
    if (isset($request['id']) || isset($request['search'])) {

      //check for authinfo by id
      if (isset($request['id'])) {
        $params = [
          'index' => $request['index'],
          'type' => '1',
          'id' => $request['id']
        ];

        //ask ES what it finds
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

        //if we found an 'authedusers' section on that ID, set it in authreqs
        if (isset($response['_source']['authedusers'])) {
          $authReqs['authedusers'] = $response['_source']['authedusers'];
        }

      //if no id provided, check info based on search
      } else if (isset($request['search'])) {

        //make doubly sure that 'field' and 'value' are set
        if (isset($request['search']['field'], $request['search']['value'])) {
          $params = [
            'index' => $request['index'],
            'body' => [
              'query' => [
                'match' => [
                  $request['search']['field'] => $request['search']['value']
                ]
              ]
            ]
          ];

          //ask ES what it finds
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

          //if we found exactly one hit, set its authreqs
          if (isset($response['hits']['total'])){
            if ($response['hits']['total'] == 1) {
              if (isset($response['hits']['hits'][0]['_source']['authedusers'])) {
                $authReqs['authedusers'] = $response['hits']['hits'][0]['_source']['authedusers'];
              }
              //if the caller is confirmreset.php (a password reset function), add the 'user' field in response to authedusers
              //DON'T set it equal to the calling user, set it equal to the FOUND user.
              if (($caller == 'confirmreset.php') && (isset($response['hits']['hits'][0]['_source']['user']))) {
                if (!isset($authReqs['authedusers'])) {
                  $authReqs['authedusers'] = [];
                }
                $authLength = count($authReqs['authedusers']);
                $authReqs['authedusers'][$authLength]['user'] = $response['hits']['hits'][0]['_source']['user'];
              }
            }
          }

        //if 'search' wasn't set correctly, dump the params
        } else {
          unset($params);
        }

      //if neither id nor search were provided, dump the params
      } else {
        unset($params);
      }
    }

    //get the overall index's permission level
    $params = [
      'index' => 'indices',
      'body' => [
        'query' => [
          'match' => [
            'name' => $request['index']
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
      header('HTTP/1.1 500 Internal Server Error');
      echo json_encode($retval);
      exit;
    }

    if (isset($response['hits']['total'])){
      if ($response['hits']['total'] == 1) {
        if (isset($response['hits']['hits'][0]['_source']['permission'])) {
          $authReqs['permission'] = $response['hits']['hits'][0]['_source']['permission'];
        }
      }
    }

    //authReqs SHOULD now be set, so continue with authenticating the user.

    //if we find a token
    if (isset($_COOKIE['Inventoken'])) {
      $secretKey = base64_decode(KEY);
      $inputToken = $_COOKIE['Inventoken'];
    
      //decode token
      try {
        $decodedData = JWT::decode($inputToken, $secretKey, array(ALGORITHM));
      } catch(Exception $err) {
        $retval['success'] = False;
        $retval['code'] = 15;
        $retval['text'] = 'Invalid Token: ' . $err->getMessage();
        if (strpos($err->getMessage(), 'Expired') !== false) { //if your token is expired, force expiry
          setcookie("Inventoken", $jwt, time()-10, '/', $locale . 'inventory.yourdomain.net', true, true);
        } else {
          header('HTTP/1.1 401 Unauthorized');
        }
        echo json_encode($retval);
        exit;
      }

      $decodedDataArray = (array)$decodedData;
      $decodedDataArray['data'] = (array)$decodedDataArray['data'];

      //token decoded successfully, verify that user and their auth level are still current
      $params = [
        'index' => 'users',
        'body' => [
          'query' => [
            'match' => [
              'user' => $decodedDataArray['data']['user']
            ]
          ]
        ]
      ];

      //get user and handle trouble
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

      //did the correct stuff come back?
      if ($response['hits']['total'] == 0) {
        $retval['success'] = False;
        $retval['code'] = 15;
        $retval['text'] = 'Invalid Token';
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

      //determine if user is part of authedusers list
      //if so, temporarily change authReq's perm level to the user's
      if (isset($authReqs['authedusers'])) {
        foreach ($authReqs['authedusers'] as $autheduser) {
          if ($response['hits']['hits'][0]['_source']['user'] == $autheduser['user']) {
            $authReqs['permission'] = $response['hits']['hits'][0]['_source']['permission'];
          }
        }
      }

      //determine authlevel
      if ($response['hits']['hits'][0]['_source']['permission'] < $authReqs['permission']) {
        $retval['success'] = False;
        $retval['code'] = 14;
        $retval['text'] = 'Insufficient Permissions';
        header('HTTP/1.1 401 Unauthorized');
        echo json_encode($retval);
        exit;
      }

      return $decodedDataArray['data']; //if we find our auth, we're set! also omg why can't I return an object


    //if you don't find a token, look for a password
    } else if (isset($_SERVER['PHP_AUTH_USER'], $_SERVER['PHP_AUTH_PW']) && $_SERVER['PHP_AUTH_USER'] != '' && $_SERVER['PHP_AUTH_PW'] != '') {
      //set up ES query
      $params = [
        'index' => 'users',
        'body' => [
          'query' => [
            'match' => [
              'user' => $_SERVER['PHP_AUTH_USER']
            ]
          ]
        ]
      ];


      //get user's hash and handle trouble
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

      //determine if user is part of authedusers list
      //if so, temporarily lower authReq's perm level
      if (isset($authReqs['authedusers'])) {
        foreach ($authReqs['authedusers'] as $autheduser) {
          if ($response['hits']['hits'][0]['_source']['user'] == $autheduser['user']) {
            $authReqs['permission'] = $response['hits']['hits'][0]['_source']['permission'];
          }
        }
      }

      //determine authlevel
      if ($response['hits']['hits'][0]['_source']['permission'] < $authReqs['permission']) {
        $retval['success'] = False;
        $retval['code'] = 14;
        $retval['text'] = 'Insufficient Permissions';
        header('HTTP/1.1 401 Unauthorized');
        echo json_encode($retval);
        exit;
      }        

      //verify password
      $auth = password_verify($_SERVER['PHP_AUTH_PW'], $response['hits']['hits'][0]['_source']['hash']);
      if (!$auth) {
        $auth = password_verify($_SERVER['PHP_AUTH_PW'], $response['hits']['hits'][0]['_source']['recovery']);
        if (!$auth) {
          $retval['success'] = False;
          $retval['code'] = 13;
          $retval['text'] = 'Incorrect username or password';
          header('HTTP/1.1 401 Unauthorized');
          echo json_encode($retval);
          exit;
        } else {
          $decodedDataArray = ['user' => $_SERVER['PHP_AUTH_USER'], 'admin' => False];
          return $decodedDataArray; //if the program hits this point, return!  You're authed!  Congrats!
        }
      } else {
        $decodedDataArray = ['user' => $_SERVER['PHP_AUTH_USER'], 'admin' => False];
        return $decodedDataArray; //if the program hits this point, return!  You're authed!  Congrats!  
      }

    } else { //if auth was neither password nor token,
        $retval['success'] = False;
        $retval['code'] = 16;
        $retval['text'] = 'No authentication provided';
        echo json_encode($retval);
        exit;
    }

  } //end if:auth

}
?>
