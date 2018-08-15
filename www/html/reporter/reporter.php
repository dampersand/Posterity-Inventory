<?php

//if you don't have a cookie, go log in.  A false cookie will get caught by auth anyway.
if (!isset($_COOKIE['Inventoken'])) {
  header("Location: login.html");
  exit();
}

require_once "resources/api/definitions.php";
require_once _SECUREINCLUDE_ . "inventory-php/auth.php";
require_once _SECUREINCLUDE_ . "inventory-php/log.php";
require_once _SECUREINCLUDE_ . "elasticsearch-php/elasticsearch.php";
$tempJSON = [];
$tempJSON['index']='items';
$tempData = auth($tempJSON);
$user = $tempData['user'];
unset($tempData);
unset($tempJSON);

?>

<!doctype html>
<html lang="en">
<head>
    <link rel="stylesheet" type="text/css" href="resources/css/jquery-ui.css">
    <link rel="stylesheet" type="text/css" href="resources/css/reporter.css">
    <meta charset="utf-8">
    <title>IMH Inventory Reports</title>
    <script src="https://code.jquery.com/jquery-3.1.0.min.js"
  		integrity="sha256-cCueBR6CsyA4/9szpPfrX3s49M9vUU5BgtiJj06wt/s="
		crossorigin="anonymous">
    </script>
    <script src="https://code.jquery.com/color/jquery.color-2.1.2.min.js"
   	    integrity="sha256-H28SdxWrZ387Ldn0qogCzFiUDDxfPiNIyJX7BECQkDE="
	    crossorigin="anonymous">
    </script>
    <script src="https://code.jquery.com/ui/1.12.1/jquery-ui.min.js"
  	    integrity="sha256-VazP97ZCwtekAsvgPBSUwPFKdrwD3unUfSGVYrahUqU="
	    crossorigin="anonymous">
    </script>
    <script src="resources/js/jquery.inputmask.bundle.js"></script>
    <!-- echo user to reporter.js -->
    <script>user = "<?php echo $user ?>";</script>
    <script src="resources/js/location.js"></script>
    <script src="resources/js/reporter.js"></script>
</head>

<body>
  <div id="outertop">
    <h4>IMH Inventory Reports</h4>
    <div class="growSpacer"></div>
    <img id="logo" src="resources/img/logo" alt="logo" height="34">
  </div>

  <div id="main">
    <div id="tablecontainer">
      <div id="filterbox">
        <div id="datefilter">
          <div class="datewrapper">Start Date<input id="startdate" type="text" placeholder="Start Date"></div>
          <div class="datewrapper">End Date<input id="enddate" type="text" placeholder="End Date"></div>
        </div>
        <button id="filters">Select Filters</button>
        <button id="generate">Generate Report</button>
        <div id="spinContainer" class="hide">
          <div class="spinner"></div>
        </div>
      </div>
      <table id="reporttable">
        <thead>
          <tr id="reportheader" class="header">
            <th>Category</th>
            <th>Item</th>
            <th>Dead</th>
            <th>Ready</th>
            <th>RMA</th>
            <th>Test</th>
            <th>Unknown</th>
            <th>Used</th>
          </tr>
        </thead>
        <tbody>
          <tr class="reportrow remove">
            <td class="category"></td>
            <td class="keyword"></td>
            <td class="Dead"></td>
            <td class="Ready"></td>
            <td class="RMA"></td>
            <td class="Test"></td>
            <td class="Unknown"></td>
            <td class="Used"></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <div id="popuptable">
    <div id="flexcontainer">
      <div class="maincolumn">
        <h5>Categories</h5>
        <div id="categories" class="columnhost">
          <div class="column remove"></div>
        </div>
      </div>
      <div class="maincolumn">
        <h5>Keywords</h5>
        <div id="keywords" class="columnhost"></div>
      </div>
      <div class="maincolumn">
        <h5>Statuses</h5>
        <div id="statuses" class="columnhost"></div>
      </div>
      <div class="maincolumn">
        <h5>Locations</h5>
        <div id="locations" class="columnhost"></div>
      </div>
    </div>
  </div>

  <div class="filteroption remove">
    <input type="checkbox" checked style="vertical-align:middle">
    <label></label>
  </div>

  
  <footer class="foot">
  </footer>

</body>
