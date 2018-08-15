<?php

$tz = date_default_timezone_get();

if ($tz == 'America/Los_Angeles') {
  echo 'LAX1';
} else if ($tz == 'America/New_York') {
  echo 'IAD1';
}

?>

