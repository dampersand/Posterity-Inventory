<?php

//include location of stuff
include ('../../../secureinclude/calendar/calendar.php');

$array = array("current" => $names[0], "next" => $names[1], "date" => $dates[1], "netOpsCurrent" => $netOpsNames[0], "netOpsNext" => $netOpsNames[1], "netOpsDate" => $netOpsDates[1]);
$retval = json_encode($array);

echo $retval;

?>
