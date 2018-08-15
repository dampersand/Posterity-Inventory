<?php

//
//log.php
//this file supplies a logging function that can log to faillog.
//it should be called with a php array as its input.
//
//input array follows:
//['call'] = string, which php api call was made.  Required.
//['subcall'] = string.  This is the error message.  Required.
//['user'] = string, user that made the call.  Required.
//['flag'] = string, small keyword that defines the error.
//
//returns an integer code based on what's wrong, or returns 0 if everything's good.
//
//code 30: unspecified logging error
//code 31: incorrect input



define('_LOGLOCATION_','/var/log/inventory/');
require_once('/var/www/html/resources/api/definitions.php');
require_once(_SECUREINCLUDE_ . 'elasticsearch-php/elasticsearch.php');

function inventoryLog(Array $input) {
  date_default_timezone_set('America/Los_Angeles');
  global $ES;

  $logstring = date('Y-m-d H:i:s') . ' - ';


  if (!(isset($input['call'], $input['subcall'], $input['user'], $input['flag']))) {
    file_put_contents(_LOGLOCATION_ . 'faillog', $logstring . 'Incorrect input detected during error log: ' . json_encode($input) . "\n", FILE_APPEND);
    return 31;
  }

  //if everything looks good for errors, build parameters
  $params = [
    'index' => 'errors-' . date('Y'),
    'type' => '1',
    'body' => [
      'flag' => $input['flag'],
      'call' => $input['call'],
      'subcall' => $input['subcall'],
      'user' => $input['user'],
    ]
  ];
  try {
    $ES->index($params);
  } catch (Exception $err) {
    return 20;
  }

  $logstring = $logstring . 'Call=' . $input['call'] . '. [' . $input['flag'] . '] User "' . $input['user'] . '" caused error: ' . $input['subcall'] . '.' . "\n";
  file_put_contents(_LOGLOCATION_ . 'faillog', $logstring, FILE_APPEND);

  return 0;
}

?>
