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
    <link rel="stylesheet" type="text/css" href="resources/css/admin.css">
    <meta charset="utf-8">
    <title>Inventory Admin Frontend</title>
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
    <!-- echo user to admin.js -->
    <script>user = "<?php echo $user ?>";</script>
    <script src="resources/js/location.js"></script>
    <script src="resources/js/admin.js"></script>
</head>

<body>
  <nav id="navcontainer" role="navigation">
    <div class="outertopnav">
      <div class="innertopnav">
        <ul class="topnav" id="mainMenu">
          <li><a id="items">Items</a></li>
          <li><a id="serials">Serials</a></li>
          <li><a id="tickets">Tickets</a></li>
          <li><a id="shipments">Shipments</a></li>
          <li><a id="users">Users</a></li>
          <li><a id="builds">Builds</a></li>
        </ul>
        <div class="growspacer"></div>
        <div id="spinContainer" class="hide">
          <div class="spinner"></div>
        </div>
        <td>Page Size: 
          <input type="number" id="pagesize">
        </td>
        <td class="selectcell">
          <select class="globalLocation">
            <option value="LAX1">LAX1</option>
            <option value="IAD1">IAD1</option>
            <option value="IAD2">IAD2</option>
          </select>
        </td>
        <img src="resources/img/logo.svg" alt="LogoHere" height="34" style="float:right;">
      </div>
    </div>
  </nav>

  <div id="main">
    <div id="tablecontainer" class="table-editable container">
      <div class="pagenav">
        <span class="icon icon-first" title="First Page"></span>
        <span class="icon icon-prev" title="Previous Page"></span>
        <input type="number" class="currentpage">
        <span class="icon icon-next" title="Next Page"></span>
        <span class="icon icon-last" title="Last Page"></span>
      </div>
      <table id="maintable" class="table">
        <thead>
          <tr id="itemheader" class="remove header">
            <th>Keyword</th>
            <th>Item</th>
            <th>Category</th>
            <th>Price ($)</th>
            <th>Amount</th>
            <th>Threshold</th>
            <th>Last Audited</th>
            <th>Auditor</th>
            <th>Ordered</th>
            <th class="nohover"><span class="table-add icon icon-add icon-item-add"></span></th>
          </tr>
          <tr id="ticketheader" class="remove header">
            <th>Actionable Server</th>
            <th>Window Start</th>
            <th>Window End</th>
            <th>Location</th>
            <th class="nohover"><span class="table-add icon icon-add icon-ticket-add"></span></th>
          </tr>
          <tr id="shipmentheader" class="remove header">
            <th>Tracking</th>
            <th>Carrier</th>
            <th>Items</th>
            <th>Location</th>
            <th>ETA</th>
            <th>Status</th>
            <th class="nohover"><span class="table-add icon icon-multiadd icon-shipment-multiadd"></span><span class="table-add icon icon-add icon-shipment-add"></span></th>
          </tr>
          <tr id="userheader" class="remove header">
            <th>User</th>
            <th>Password</th>
            <th>Verify Password</th>
            <th>Email</th>
            <th>Access</th>
            <th class="nohover"><span class="table-add icon icon-add icon-user-add"></span></th>
          </tr>
          <tr id="serialheader" class="remove header">
            <th>Keyword</th>
            <th>Serial</th>
            <th>Price ($)</th>
            <th>Status</th>
            <th>Location</th>
            <th>Note</th>
          </tr>
          <tr id="buildsheader" class="remove header">
            <th>Server</th>
            <th>Model</th>
            <th>Location</th>
            <th>Builder</th>
            <th>Build Date</th>
            <th class="shrink">Build Notes</th>
            <th>Quality Checker</th>
            <th>QC Date</th>
            <th class="shrink">QC Notes</th>
            <th>QC Status</th>
            <th class="nohover"><span class="table-add icon icon-add icon-build-add"></span></th>
          </tr>
        </thead>
        <tbody>
          <tr class="remove itemrow">
            <td onclick="document.execCommand('selectAll',false,null)" contenteditable="true" class="keyword"></td>
            <td onclick="document.execCommand('selectAll',false,null)" contenteditable="true" class="item"></td>
            <td onclick="document.execCommand('selectAll',false,null)" contenteditable="true" class="category"></td>
            <td onclick="document.execCommand('selectAll',false,null)" contenteditable="true" class="price"></td>
            <td class="amount"></td>
            <td onclick="document.execCommand('selectAll',false,null)" contenteditable="true" class="threshold"></td>
            <td class="lastAudited"></td>
            <td class="lastAuditor"></td>
            <td class="ordered"><input type="checkbox"></td>
            <td class="trashsave">
              <span class="table-expand icon icon-expand icon-item-expand" title="Show All Serials with this Keyword"></span>
              <span class="table-history icon icon-history icon-item-history" title="Show History for this Keyword"></span>
              <span class="table-save icon icon-save icon-item-save" title="Save Item"></span>
              <span class="table-remove icon icon-remove icon-item-remove" title="Delete Item"></span>
            </td>
          </tr>
          <tr class="remove serialrow">
            <td onclick="document.execCommand('selectAll',false,null)" contenteditable="true" class="keyword"></td>
            <td onclick="document.execCommand('selectAll',false,null)" contenteditable="true" class="serial"></td>
            <td onclick="document.execCommand('selectAll',false,null)" contenteditable="true" class="price"></td>
            <td class="selectcell">
              <select class= "status">
                <option value="Ready">Ready</option>
                <option value="Used">Used</option>
                <option value="Test">Test</option>
                <option value="Dead">Dead</option>
                <option value="RMA">RMA</option>
                <option value="Unknown">Unknown</option>
              </select>
            </td>
            <td class="selectcell">
              <select class="location">
                <option value="LAX1">LAX1</option>
                <option value="IAD1">IAD1</option>
                <option value="IAD2">IAD2</option>
                <option value="Unknown">Unknown</option>
              </select>
            </td>
            <td onclick="document.execCommand('selectAll',false,null)" contenteditable="true" class="note"></td>
            <td class="trashsave">
              <span class="table-history icon icon-history icon-serial-history" title="Show History"></span>
              <span class="table-save icon icon-save icon-serial-save" title="Save Serial"></span>
              <span class="table-remove icon icon-remove icon-serial-remove" title="Delete Serial"></span>
            </td>
          </tr>
          <tr class="remove userrow">
            <td onclick="document.execCommand('selectAll',false,null)" contenteditable="true" class="user"></td>
            <td>
              <input type="password" class="password">
            </td>
            <td>
              <input type="password" class="verify">
            </td>
            <td onclick="document.execCommand('selectAll',false,null)" contenteditable="true" class="email"></td>
            <td class="selectcell">
              <select class= "access">
                <option value=3>L3 - Admin</option>
                <option value=2>L2 - Hud User</option>
                <option value=1>L1 - User</option>
                <option value=0>Disabled</option>
              </select>
            </td>
            <td class="trashsave">
              <span class="table-email icon icon-email icon-user-email" title="Send Password Recovery Email"></span>
              <span class="table-save icon icon-save icon-user-save" title="Save User"></span>
              <span class="table-remove icon icon-remove icon-user-remove" title="Delete User"></span>
            </td>
          </tr>
          <tr class="remove ticketrow">
            <td onclick="document.execCommand('selectAll',false,null)" contenteditable="true" class="server"></td>
            <td onclick="document.execCommand('selectAll',false,null)" contenteditable="true" class="start"></td>
            <td onclick="document.execCommand('selectAll',false,null)" contenteditable="true" class="end"></td>
            <td class="selectcell">
              <select class="location">
                <option value="LAX1">LAX1</option>
                <option value="IAD1">IAD1</option>
                <option value="IAD2">IAD2</option>
              </select>
            </td>
            <td class="trashsave">
              <span class="table-save icon icon-save icon-ticket-save" title="Save Ticket"></span>
              <span class="table-remove icon icon-remove icon-ticket-remove" title="Delete Ticket"></span>
            </td>            
          </tr>
          <tr class="remove shipmentrow">
            <td onclick="document.execCommand('selectAll',false,null)" contenteditable="true" class="num"></td>
            <td onclick="document.execCommand('selectAll',false,null)" contenteditable="true" class="carrier"></td>
            <td onclick="document.execCommand('selectAll',false,null)" contenteditable="true" class="contents"></td>
            <td class="location"></td>
            <td class="eta"></td>
            <td class="status"></td>
            <td class="trashsave">
              <span class="table-save icon icon-save icon-shipment-save" title="Save Shipment"></span>
              <span class="table-remove icon icon-remove icon-shipment-remove" title="Delete Shipment"></span>
            </td>            
          </tr>
          <tr class="remove buildsrow">
            <td class="server"></td>
            <td class="model"></td>
            <td class="location"></td>
            <td class="builder"></td>
            <td class="builddate"></td>
            <td class="buildnotes shrink">
              <span class="icon icon-notes-build icon-nonotes" title="No Build Notes"></span>
            </td>
            <td class="checker"></td>
            <td class="qcdate"></td>
            <td class="qcnotes shrink">
              <span class="icon icon-notes-qc icon-nonotes" title="No QC Notes"></span>
            </td>
            <td class="qcstatus"></td>
            <td class="trashsave">
              <span class="table-qc icon icon-qc icon-build-qc" title="QC Check"></span>
              <span class="table-remove icon icon-remove icon-build-remove" title="Delete Build"></span>
            </td>            
          </tr>
        <tbody>
      </table>
      <div class="pagenav">
        <span class="icon icon-first" title="First Page"></span>
        <span class="icon icon-prev" title="Previous Page"></span>
        <input type="number" class="currentpage">
        <span class="icon icon-next" title="Next Page"></span>
        <span class="icon icon-last" title="Last Page"></span>
      </div>
    </div>
   <span class="remove table-remove-true icon icon-remove-true icon-item-remove-true" title="Confirm Delete"></span>
  </div>

  <div id="innerserialtablecontainer" class="container">
    <div class="pagenav">
      <span class="icon icon-first" title="First Page"></span>
      <span class="icon icon-prev" title="Previous Page"></span>
      <input type="number" class="currentpage">
      <span class="icon icon-next" title="Next Page"></span>
      <span class="icon icon-last" title="Last Page"></span>
    </div>
    <table id="innerserialtable" class ="table">
      <thead>
        <tr id="innerserialheader" class="header">
          <th>Serial</th>
          <th>Price ($)</th>
          <th>Status</th>
          <th>Location</th>
          <th>Note</th>
          <th class="nohover"><span class="table-add icon icon-add icon-innerserial-add"></span></th>
        </tr>
      </thead>
      <tbody>
        <tr class="remove innerserialrow">
          <td onclick="document.execCommand('selectAll',false,null)" contenteditable="true" class="serial"></td>
          <td onclick="document.execCommand('selectAll',false,null)" contenteditable="true" class="price"></td>
          <td class="selectcell">
            <select class= "status">
              <option value="Ready">Ready</option>
              <option value="Used">Used</option>
              <option value="Test">Test</option>
              <option value="Dead">Dead</option>
              <option value="RMA">RMA</option>
              <option value="Unknown">Unknown</option>
            </select>
          </td>
          <td class="selectcell">
            <select class="location">
              <option value="LAX1">LAX1</option>
              <option value="IAD1">IAD1</option>
              <option value="IAD2">IAD2</option>
              <option value="Unknown">Unknown</option>
            </select>
          </td>
          <td onclick="document.execCommand('selectAll',false,null)" contenteditable="true" class="note"></td>
          <td class="trashsave">
            <span class="table-history icon icon-history icon-serial-history" title="Show History"></span>
            <span class="table-save icon icon-save icon-serial-save" title="Save Serial"></span>
            <span class="table-remove icon icon-remove icon-serial-remove" title="Delete Serial"></span>
          </td>
        </tr>
      </tbody>
    </table>
    <div class="pagenav">
      <span class="icon icon-first" title="First Page"></span>
      <span class="icon icon-prev" title="Previous Page"></span>
      <input type="number" class="currentpage">
      <span class="icon icon-next" title="Next Page"></span>
      <span class="icon icon-last" title="Last Page"></span>
    </div>
  </div>

  <div id="historytablecontainer" class="container">
    <div class="pagenav">
      <span class="icon icon-first" title="First Page"></span>
      <span class="icon icon-prev" title="Previous Page"></span>
      <input type="number" class="currentpage">
      <span class="icon icon-next" title="Next Page"></span>
      <span class="icon icon-last" title="Last Page"></span>
    </div>
    <table id="historytable" class ="table">
      <thead>
        <tr id="serialhistoryheader" class="header">
          <th>Date</th>
          <th>User</th>
          <th>Status</th>
          <th>Location</th>
          <th>Note</th>
          <th>Price ($)</th>
        </tr>
        <tr id="itemhistoryheader" class="header">
          <th>Date</th>
          <th>Serial</th>
          <th>User</th>
          <th>Status</th>
          <th>Location</th>
          <th>Note</th>
          <th>Indiv. Price ($)</th>
          <th>Parent Price ($)</th>
        </tr>
      </thead>
      <tbody>
        <tr class="remove serialhistoryrow">
          <td class="date"></td>
          <td class="user"></td>
          <td class="status"></td>
          <td class="location"></td>
          <td class="note"></td>
          <td class="price"></td>
        </tr>
        <tr class="remove itemhistoryrow">
          <td class="date"></td>
          <td class="serial"></td>
          <td class="user"></td>
          <td class="status"></td>
          <td class="location"></td>
          <td class="note"></td>
          <td class="price"></td>
          <td class="keyPrice"></td>
        </tr>
      </tbody>
    </table>
    <div class="pagenav">
      <span class="icon icon-first" title="First Page"></span>
      <span class="icon icon-prev" title="Previous Page"></span>
      <input type="number" class="currentpage">
      <span class="icon icon-next" title="Next Page"></span>
      <span class="icon icon-last" title="Last Page"></span>
    </div>
  </div>
  
  <footer class="foot">
  </footer>

</body>
