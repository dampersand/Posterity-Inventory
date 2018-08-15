<?php
//
//protecthash.php
//this php file should look for any keys labeled 'hash' and replace them with an empty 'password' key.  This should be used to keep hashes from leaving the PHP backend.
//

//get dependencies
require_once('/var/www/html/resources/api/definitions.php');


function protect($input) {
  foreach ($input as $key => $value) {
    if ($key === 'hash') {
      unset($input[$key]);
      $input['password'] = '';
    }else if ($key === 'recovery') {
    	unset($input[$key]);
    } else if (gettype($input[$key]) == 'array') {
      $input[$key] = protect($input[$key]);
    }
  }

  return($input);

}
?>
