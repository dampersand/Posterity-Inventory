<?php

//
//login.php
//

require_once "definitions.php";
require_once _SECUREINCLUDE_ . "inventory-php/auth.php";
require_once _SECUREINCLUDE_ . "inventory-php/log.php";

//authorize
//the following line handled by javascript
$retval = array(
    'success' => True,
    'code' => 0,
    'text' => 'Success!',
    'data' => array()
  );
$inputJSON = [];
$inputJSON['index'] = 'items';
$authData = auth($inputJSON, 'login.php');

echo json_encode($retval);

?>
