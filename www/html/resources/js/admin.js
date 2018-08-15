//Global Variables Section
var itemHeader;
var serialHeader;
var userHeader;
var ticketHeader;
var shipmentHeader;
var innerSerialHeader;
var serialHistoryHeader;
var itemHistoryHeader;
var itemRow;
var serialRow;
var userRow;
var ticketRow;
var shipmentRow;
var innerSerialRow;
var serialHistoryRow;
var itemHistoryRow;
var itemJSON;
var itemJSONById;
var userJSON;
var userJSONById;
var ticketJSON;
var ticketJSONById;
var shipmentJSON;
var shipmentJSONById;
var serialJSON;
var serialJSONById;
var buildsJSON;
var buildsJSONById;
var historyArray = [];
var mainSort = [];
var secondarySort = [];
var tertiarySort = [];
var deleteConfirm;

var pageSize;

//translational object - this dict of constants can be used to translate header values to jsonById values.  Can be used for refactoring code by allowing us to specify a header and immediately get its data's location in the 'jsonById' families (instead of manually typing them in)
//ie, something like 'for entry in columnheader; cellvalue = jsonById[translationarray[entry]]' instead of the series of if/then blocks in buildItemTable/buildSerialTable etc
//note that anything that is nested is shown with dot notation, ie "serialJSONById['threshold']['LAX1'] is shown as "threshold.LAX1"

var translationArray = {
	"Keyword" : "keyword",
	"Item" : "label",
	"Category" : "category",
	"Price ($)" : "price",
	"Amount" : "amount." + locale,
	"Threshold" : "threshold." + locale,
	"Last Audited" : "lastAudited." + locale,
	"Auditor" : "lastAuditor." + locale,
	"Ordered" : "ordered",
	"Serial" : "serial",
	"Status" : "status",
	"Location" : "location",
	"Actionable Server" : "server",
	"Window Start" : "start",
	"Window End" : "end",
	"User" : "user",
	"Email" : "email",
	"Access" : "permission",
	"Tracking" : "num",
	"Date" : "date",
	"Note" : "note",
	"Indiv. Price ($)" : "price",
	"Carrier" : "carrier",
	"Items" : "label",
	"ETA" : "eta",
  "Server" : "server",
  "Builder" : "builder",
  "Build Date" : "builddate",
  "Build Notes" : "buildnotes",
  "Quality Checker" : "checker",
  "QC Date" : "qcdate",
  "QC Notes" : "qcnotes",
  "QC Status" : "qcstatus"
}

//Functions

function getCookie(name) {
  var dc = document.cookie;
  var prefix = name + "=";
  var begin = dc.indexOf("; " + prefix);
  if (begin == -1) {
    begin = dc.indexOf(prefix);
    if (begin != 0) {return null};
  }
  else
  {
    begin += 2;
    var end = document.cookie.indexOf(";", begin);
    if (end == -1) {
    	end = dc.length;
    }
  }
  // because unescape has been deprecated, replaced with decodeURI
  //return unescape(dc.substring(begin + prefix.length, end));
  return decodeURI(dc.substring(begin + prefix.length, end));
}

//function to handle errors - this is a living function, not yet an all-encompassing one.
//put various handling here.
function errorHandle(data) {

  //code 15 is invalid token, redirect to login
  if (data['code'] == 15) {
    alert('Error: Authentication has expired.  Please log in again.');
    window.location ='https://' + locale + '-inventory.domain.net/admin/login.html';
  } else if (data['code'] == 16) {
    alert('Error: No authentication provided.  Please log in again.');
    window.location ='https://' + locale + '-inventory.domain.net/admin/login.html';
  } else if (data['code'] == 14) {
    alert('Error: insufficient permissions to access this resource.  If you believe this message is in error, contact an admin.');
  } else if (data['code'] == 20) {
    alert('Error: malformed request went to the server.  Whatever you attempted to put in the database probably did not register.  This is probably a good time to reload the table.');
  } else {
    console.log(data);
  }
}

function emptyTable(table) {
  $(table).children("tbody").remove();
  $(table).children("thead").remove();
}

function getMaxPage(table) {
	switch (table) {
		case "items":
			var jsonById = itemJSONById;
			break;
		case "serials":
			var jsonById = serialJSONById;
			break;
		case "tickets":
			var jsonById = ticketJSONById;
			break;
		case "shipments":
			var jsonById = shipmentJSONById;
			break;
		case "users":
			var jsonById = userJSONById;
			break;
		case "innerserials":
			var jsonById = serialJSONById;
			break;
		case "serialhistory":
			var jsonById = serialJSONById[$("#historytable").data("serialID")]['history'];
			break;
		case "itemhistory":
			var jsonById = historyArray;
			break;
    case "builds":
      var jsonById = buildsJSONById;
      break;
	}
	var length = Object.keys(jsonById).length; //lol works with arrays too
	if (length % pageSize > 0) {
		return (Math.floor(length/pageSize) + 1);
	} else {
		return (Math.floor(length/pageSize));
	}
}

//TO DO: refactor itemtable, usertable, shipmenttable, and tickettable
//TO DO: refactor additem, adduser, etc
//TO DO: refactor removeitem, removeuser, etc
//TO DO: refactor saveitem, saveuser, etc

//omg I need a way to do pointers in js


//get info to populate itemTable
function itemTable() {

	//record in maintable what data is being displayed, start at first page
	$("#maintable").data('currentTable','items');
	$("#maintable").data("pageNum",1);
	$(".currentpage").val(1);

  //get list of items
  var outputJSON = new Object;
  outputJSON['index'] = 'items';

  $.ajax({
    type: "POST",
    data: outputJSON,
    url: "resources/api/getall.php",
    success:function(data) {
      if (!$.parseJSON(data)['success']) {
        errorHandle($.parseJSON(data))
      } else {
      	//create itemJSON pair
      	itemJSON = $.parseJSON(data)['data'];
      	itemJSONById = [];
      	for (entry in itemJSON) {
					itemJSONById[itemJSON[entry]['_id']] = itemJSON[entry]['_source'];
					itemJSONById[itemJSON[entry]['_id']]['id'] = itemJSON[entry]['_id'];
      	}
      	//populate associative sort array
      	mainSort = aaGen(itemJSONById, 'keyword');
        buildItemTable(true);
      }
    },
    error:function(data) {
      var outputData = $.parseJSON(data.responseText);
      errorHandle(outputData);
    }
  });
}

//build itemTable from scratch.  requestAmountRecalc set to false by default to speed up tablebuilding.
function buildItemTable(requestAmountRecalc) {
	requestAmountRecalc = requestAmountRecalc || false;

	//empty the main table and add headers
	emptyTable($("#maintable"));
  $("#maintable").append("<thead></thead>");
  $("#maintable").children("thead").append(itemHeader);
  $("#maintable").find("th").click(function(){  //omg web design why
  	if (!($(this).text() in translationArray)) {return;}
  	$("#maintable").data("pageNum", 1);
  	$(".currentpage").val(1);
		mainSort = aaGen(itemJSONById, translationArray[$(this).text()]);
		buildItemTable();
  });
  $(".icon-item-add").click(addItem);
  $("#maintable").append("<tbody></tbody>");

  //get page info
  var page = $("#maintable").data("pageNum");
  var maxPage = getMaxPage("items");

  //determine start and endpoint for page
  var startIndex = ((page - 1) * pageSize);
  var endIndex = startIndex + pageSize - 1;

  if (page >= maxPage) {
  	endIndex = Object.keys(itemJSONById).length - 1;
  }

  //using sorted associative array, build itemTable
  for (var entry = startIndex; entry <= endIndex; entry++) {
  	var id = mainSort[entry];
    var newRow = itemRow.clone();
    newRow.attr("id", id);

    //populate the new row with all the keyword information
    newRow.find('td.keyword').html(itemJSONById[id]['keyword']);
    if (itemJSONById[id].hasOwnProperty('label')) {
      if (itemJSONById[id]['label'] !== '') {
        newRow.find('td.item').html(itemJSONById[id]['label']);
      } else { 
        newRow.find('td.item').html('');
      }
    } else {
      newRow.find('td.item').html('');
    }

    if (itemJSONById[id].hasOwnProperty('price')) {
      if (itemJSONById[id]['price'] !== '') {
        newRow.find('td.price').html(itemJSONById[id]['price']);
      } else { 
        newRow.find('td.price').html('');
      }
    } else {
      newRow.find('td.price').html('');
    }

    if (itemJSONById[id].hasOwnProperty('category')) {
      if (itemJSONById[id]['category'] !== '') {
        newRow.find('td.category').html(itemJSONById[id]['category']);
      } else {
        newRow.find('td.category').html('');
      }
    } else {
      newRow.find('td.category').html('');
    }
      
    if (itemJSONById[id].hasOwnProperty('threshold')) {
      if (itemJSONById[id]['threshold'].hasOwnProperty(locale)) {
        if (itemJSONById[id]['threshold'][locale] !== '') {
          newRow.find('td.threshold').html(itemJSONById[id]['threshold'][locale]);
        } else {
          newRow.find('td.threshold').html('');
        }
      }
    } else {
      newRow.find('td.threshold').html('');
    }

    if (itemJSONById[id].hasOwnProperty('lastAudited')) {
      if (itemJSONById[id]['lastAudited'].hasOwnProperty(locale)) {
        if (itemJSONById[id]['lastAudited'][locale] !== '') {
          newRow.find('td.lastAudited').html(itemJSONById[id]['lastAudited'][locale]);
        } else {
        newRow.find('td.lastAudited').html('');
        }
      }
    } else {
      newRow.find('td.lastAudited').html('');
    }

    if (itemJSONById[id].hasOwnProperty('lastAuditor')) {
      if (itemJSONById[id]['lastAuditor'].hasOwnProperty(locale)) {
        if (itemJSONById[id]['lastAuditor'][locale] !== '') {
          newRow.find('td.lastAuditor').html(itemJSONById[id]['lastAuditor'][locale]);
        } else {
          newRow.find('td.lastAuditor').html('');
        }
      }
    } else {
      newRow.find('td.lastAuditor').html('');
    }

    if (itemJSONById[id].hasOwnProperty('ordered')) {
      if (itemJSONById[id]['ordered'][locale]) {
        if (itemJSONById[id]['ordered'][locale] == true) {
          newRow.find('td.ordered :input').prop('checked',true);
        } else {
          newRow.find('td.ordered :input').prop('checked',false);
        }
      }
    } else {
      newRow.find('td.ordered :input').prop('checked',false);
    }

    //only do a full recalculation if requested, otherwise we waste a lot of time by recalculating on a simple sort.
    //we do the full recalculation later.
    if (!(requestAmountRecalc)) {
	    if (itemJSONById[id].hasOwnProperty('amount')) {
	      if (itemJSONById[id]['amount'].hasOwnProperty(locale)) {
	        if (itemJSONById[id]['amount'][locale] !== '') {
	          newRow.find('td.amount').html(itemJSONById[id]['amount'][locale]);
	        } else {
	          newRow.find('td.amount').html('');
	        }
	      }
	    } else {
	      newRow.find('td.amount').html('');
	    }
	  }

    //append the new row
    $("#maintable").children("tbody").append(newRow);
  }

  //handle on-click save/remove/expansion
  $(".icon-item-save").click(function() {saveItem($(this))});
  $(".icon-item-remove").click(function() {removeItem($(this))});
  $(".icon-item-expand").click(function() {
    var keyID = $(this).parents(".itemrow").attr('id');
    innerSerialTable(keyID);
  });
  $(".icon-item-history").click(function() {itemHistoryTable($(this))});

  //with everything done, calculate amounts at our leisure, if requested.
  if (requestAmountRecalc) {
  	for (var entry in mainSort) {
  		var id = mainSort[entry];
  		if ($("#" + id).length){
  			checkAmount(id, function(oldID, result){$("#" + oldID).find('td.amount').html(result)});
  		} else {
  			checkAmount(id, function(oldID, result){return});
  		}
  	}
  }
}

//gather info for serialTable
function serialTable() {

	//record in maintable what data is being displayed, start at first page
	$("#maintable").data('currentTable','serials');
	$("#maintable").data("pageNum",1);
	$(".currentpage").val(1);

  //get list of items
  var outputJSON = new Object;
  outputJSON['index'] = 'serial';

  $.ajax({
    type: "POST",
    data: outputJSON,
    url: "resources/api/getall.php",
    success:function(data) {
      if (!$.parseJSON(data)['success']) {
        errorHandle($.parseJSON(data))
      } else {
      	serialJSON = $.parseJSON(data)['data'];
      	serialJSONById = [];
      	//create serialJSON pair
      	for (entry in serialJSON) {
					serialJSONById[serialJSON[entry]['_id']] = serialJSON[entry]['_source'];
					serialJSONById[serialJSON[entry]['_id']]['id'] = serialJSON[entry]['_id'];
      	}
      	//populate associative sort array
      	mainSort = aaGen(serialJSONById, 'serial');
        buildSerialTable();
      }
    },
    error:function(data) {
      var outputData = $.parseJSON(data.responseText);
      errorHandle(outputData);
    }
  });
}

//build serialTable from scratch
function buildSerialTable() {

	//empty the main table and add headers
	emptyTable($("#maintable"));
  $("#maintable").append("<thead></thead>");
  $("#maintable").children("thead").append(serialHeader);
  $("#maintable").find("th").click(function(){  //omg web design why
  	if (!($(this).text() in translationArray)) {return;}
  	$("#maintable").data("pageNum", 1);
  	$(".currentpage").val(1);
    mainSort = aaGen(serialJSONById, translationArray[$(this).text()]);
		buildSerialTable();
  });
  $(".icon-serial-add").click(addSerial);
  $("#maintable").append("<tbody></tbody>");

  //get page info
  var page = $("#maintable").data("pageNum");
  var maxPage = getMaxPage("serials");
 
  //determine start and endpoint for page
  var startIndex = ((page - 1) * pageSize);
  var endIndex = startIndex + pageSize - 1;

  if (page >= maxPage) {
  	endIndex = Object.keys(serialJSONById).length - 1;
  }


  for (var entry = startIndex; entry <= endIndex; entry++) {
  	var id = mainSort[entry];
    var newRow = serialRow.clone();
    newRow.attr("id", id);

    //populate the new row with all the serial information
    newRow.find('td.serial').html(serialJSONById[id]['serial']);
    newRow.find('td.keyword').html(serialJSONById[id]['keyword']);

    if (serialJSONById[id].hasOwnProperty('price')) {
      if (serialJSONById[id]['price'] !== '') {
        newRow.find('td.price').html(serialJSONById[id]['price']);
      } else { 
        newRow.find('td.price').html('0.00');
      }
    } else {
      newRow.find('td.price').html('0.00');
    }

    if (serialJSONById[id]['pFlag']) {
      newRow.find('td.price').css("background-color", "#F37878");
    }

    if (serialJSONById[id].hasOwnProperty('status')) {
      if (serialJSONById[id]['status'] !== '') {
        newRow.find('select.status').val(serialJSONById[id]['status']);
      } else { 
        newRow.find('select.status').val('Unknown');
      }
    } else {
      newRow.find('select.status').val('Unknown');
    }

    if (serialJSONById[id].hasOwnProperty('location')) {
      if (serialJSONById[id]['location'] !== '') {
        newRow.find('select.location').val(serialJSONById[id]['location']);
      } else { 
        newRow.find('select.location').val('Unknown');
      }
    } else {
      newRow.find('select.location').val('Unknown');
    }

    //append the new row
    $("#maintable").children("tbody").append(newRow);
  }

  //handle on-click save/remove
  $(".icon-serial-save").click(function() {saveSerial($(this))});
  $(".icon-serial-remove").click(function() {removeSerial($(this))});
  $(".icon-serial-history").click(function() {serialHistoryTable($(this))});
}

// gather info for ticketTable
function ticketTable() {

	//record in maintable what data is being displayed, start at first page
	$("#maintable").data('currentTable','tickets');
	$("#maintable").data("pageNum",1);
	$(".currentpage").val(1);

  //get list of tickets
  var outputJSON = new Object;
  outputJSON['index'] = 'tickets';

  $.ajax({
    type: "POST",
    data: outputJSON,
    url: "resources/api/getall.php",
    success:function(data) {
      if (!$.parseJSON(data)['success']) {
        errorHandle($.parseJSON(data))
      } else {
      	ticketJSON = $.parseJSON(data)['data'];
      	ticketJSONById = [];
      	//create ticketJSON pair
      	for (entry in ticketJSON) {
					ticketJSONById[ticketJSON[entry]['_id']] = ticketJSON[entry]['_source'];
					ticketJSONById[ticketJSON[entry]['_id']]['id'] = ticketJSON[entry]['_id'];
      	}
      	//populate associative sort array
      	mainSort = aaGen(ticketJSONById, 'server');
        buildTicketTable();
      }
    },
    error:function(data) {
      var outputData = $.parseJSON(data.responseText);
      errorHandle(outputData);
    }
  });
}

//build ticketTable from scratch
function buildTicketTable() {

	emptyTable($("#maintable"));
  $("#maintable").append("<thead></thead>");
  $("#maintable").children("thead").append(ticketHeader);
  $("#maintable").find("th").click(function(){  //omg web design why
  	if (!($(this).text() in translationArray)) {return;}
  	$("#maintable").data("pageNum", 1);
  	$(".currentpage").val(1);
    mainSort = aaGen(ticketJSONById, translationArray[$(this).text()]);
		buildTicketTable();
  });
  $(".icon-ticket-add").click(addTicket);
  $("#maintable").append("<tbody></tbody>");

  //get page info
  var page = $("#maintable").data("pageNum");
  var maxPage = getMaxPage("tickets");

  //determine start and endpoint for page
  var startIndex = ((page - 1) * pageSize);
  var endIndex = startIndex + pageSize - 1;

  if (page >= maxPage) {
  	endIndex = Object.keys(ticketJSONById).length - 1;
  }


  for (var entry = startIndex; entry <= endIndex; entry++) {
  	var id = mainSort[entry];
    var newRow = ticketRow.clone();
    newRow.attr("id", id);

    //populate the new row with all the keyword information
    newRow.find('td.server').html(ticketJSONById[id]['server']);
    if (ticketJSONById[id].hasOwnProperty('start')) {
      if (ticketJSONById[id]['start'] !== '') {
        newRow.find('td.start').html(ticketJSONById[id]['start']);
      } else { 
        newRow.find('td.start').html('');
      }
    } else {
      newRow.find('td.start').html('');
    }

    if (ticketJSONById[id].hasOwnProperty('end')) {
      if (ticketJSONById[id]['end'] !== '') {
        newRow.find('td.end').html(ticketJSONById[id]['end']);
      } else {
        newRow.find('td.end').html('');
      }
    } else {
      newRow.find('td.end').html('');
    }

    newRow.find('select.location').val(ticketJSONById[id]['location']);
    
    //append the new row
    $("#maintable").children("tbody").append(newRow);
  }

  //handle on-click save/remove
  $(".icon-ticket-save").click(function() {saveTicket($(this))});
  $(".icon-ticket-remove").click(function() {removeTicket($(this))});

  $(".start").inputmask('datetime', {
    mask: "y-2-1 h:s:s",
    placeholder: "yyyy-mm-dd hh:mm:ss",
    leapday: "-02-29",
    separator: "-",
    alias: "mm/dd/yyyy hh:mm xm"
  });

  $(".end").inputmask('datetime', {
    mask: "y-2-1 h:s:s",
    placeholder: "yyyy-mm-dd hh:mm:ss",
    leapday: "-02-29",
    separator: "-",
    alias: "mm/dd/yyyy hh:mm xm"
  });
}

//gather info for userTable
function userTable() {

	//record in maintable what data is being displayed, start at first page
	$("#maintable").data('currentTable','users');
	$("#maintable").data("pageNum",1);
	$(".currentpage").val(1);

  //get list of users
  var outputJSON = new Object;
  outputJSON['index'] = 'users';

  $.ajax({
    type: "POST",
    data: outputJSON,
    url: "resources/api/getall.php",
    success:function(data) {
      if (!$.parseJSON(data)['success']) {
        errorHandle($.parseJSON(data))
      } else {
      	userJSON = $.parseJSON(data)['data'];
      	userJSONById = [];
      	//create userJSON pair
      	for (entry in userJSON) {
					userJSONById[userJSON[entry]['_id']] = userJSON[entry]['_source'];
					userJSONById[userJSON[entry]['_id']]['id'] = userJSON[entry]['_id'];
      	}
      	//populate associative sort array
      	mainSort = aaGen(userJSONById, 'user');
        buildUserTable();
      }
    },
    error:function(data) {
      var outputData = $.parseJSON(data.responseText);
      errorHandle(outputData);
    }
  });
}

//build userTable from scratch
function buildUserTable() {

	emptyTable($("#maintable"));
  $("#maintable").append("<thead></thead>");
  $("#maintable").children("thead").append(userHeader);
  $("#maintable").find("th").click(function(){  //omg web design why
  	if (!($(this).text() in translationArray)) {return;}
  	$("#maintable").data("pageNum", 1);
  	$(".currentpage").val(1);
    mainSort = aaGen(userJSONById, translationArray[$(this).text()]);
		buildUserTable();
  });
  $(".icon-user-add").click(addUser);
  $("#maintable").append("<tbody></tbody>");

  //get page info
  var page = $("#maintable").data("pageNum");
  var maxPage = getMaxPage("users");

  //determine start and endpoint for page
  var startIndex = ((page - 1) * pageSize);
  var endIndex = startIndex + pageSize - 1;

  if (page >= maxPage) {
  	endIndex = Object.keys(userJSONById).length - 1;
  }


  for (var entry = startIndex; entry <= endIndex; entry++) {
  	var id = mainSort[entry];
    var newRow = userRow.clone();
    newRow.attr("id", id);

    //populate the new row with all the user information
    newRow.find('td.user').html(userJSONById[id]['user']);
    newRow.find('select.access').val(userJSONById[id]['permission']);
    if (userJSON[entry]['_source'].hasOwnProperty('email')) {
      if (userJSON[entry]['_source']['email'] !== '') {
        newRow.find('td.email').html(userJSONById[id]['email']);
      } else {
        newRow.find('td.email').html('');
      }
    } else {
      newRow.find('td.email').html('');
    }

    //append the new row
    $("#maintable").children("tbody").append(newRow);
  }

  //handle on-click save/remove
  $(".icon-user-save").click(function() {saveUser($(this))});
  $(".icon-user-remove").click(function() {removeUser($(this))});
  $(".icon-user-email").click(function() {emailUser($(this))});
}

//gather information for shipmentTable
function shipmentTable() {

	//record in maintable what data is being displayed, start at first page
	$("#maintable").data('currentTable','shipments');
	$("#maintable").data("pageNum",1);
	$(".currentpage").val(1);

  //get list of items
  var outputJSON = new Object;
  outputJSON['index'] = 'tracks';

  $.ajax({
    type: "POST",
    data: outputJSON,
    url: "resources/api/getall.php",
    success:function(data) {
      if (!$.parseJSON(data)['success']) {
        errorHandle($.parseJSON(data))
      } else {
      	shipmentJSON = $.parseJSON(data)['data'];
      	shipmentJSONById = [];
      	//create shipmentJSON pair
      	for (entry in shipmentJSON) {
          if (shipmentJSON[entry]['_source']['locale'] != locale) {
            continue;
          }
					shipmentJSONById[shipmentJSON[entry]['_id']] = shipmentJSON[entry]['_source'];
					shipmentJSONById[shipmentJSON[entry]['_id']]['id'] = shipmentJSON[entry]['_id'];
      	}
      	//populate associative sort array
      	mainSort = aaGen(shipmentJSONById, 'num');
        buildShipmentTable();
      }
    },
    error:function(data) {
      var outputData = $.parseJSON(data.responseText);
      errorHandle(outputData);
    }
  });
}

//build shipmentTable from scratch
function buildShipmentTable() {
  emptyTable($("#maintable"));
  $("#maintable").append("<thead></thead>");
  $("#maintable").children("thead").append(shipmentHeader);
  $("#maintable").find("th").click(function(){  //omg web design why
  	if (!($(this).text() in translationArray)) {return;}
  	$("#maintable").data("pageNum", 1);
  	$(".currentpage").val(1);
    mainSort = aaGen(shipmentJSONById, translationArray[$(this).text()]);
		buildShipmentTable();
  });
  $(".icon-shipment-add").click(addShipment);
  $(".icon-shipment-multiadd").click(multipleShipmentsDialog);
  $("#maintable").append("<tbody></tbody>");

  //get page info
  var page = $("#maintable").data("pageNum");
  var maxPage = getMaxPage("shipments");


  //determine start and endpoint for page
  var startIndex = ((page - 1) * pageSize);
  var endIndex = startIndex + pageSize - 1;

  if (page >= maxPage) {
  	endIndex = Object.keys(shipmentJSONById).length - 1;
  }


  for (var entry = startIndex; entry <= endIndex; entry++) {
  	var id = mainSort[entry];
    var newRow = shipmentRow.clone();
    newRow.attr("id", id);


    //populate the new row with all the keyword information
    newRow.find('td.num').html(shipmentJSONById[id]['num']);
    if (shipmentJSONById[id].hasOwnProperty('label')) {
      if (shipmentJSONById[id]['label'] !== '') {
        newRow.find('td.contents').html(shipmentJSONById[id]['label']);
      } else { 
        newRow.find('td.contents').html('');
      }
    } else {
      newRow.find('td.contents').html('');
    }

    if (shipmentJSONById[id].hasOwnProperty('carrier')) {
      if (shipmentJSONById[id]['carrier'] !== '') {
        newRow.find('td.carrier').html(shipmentJSONById[id]['carrier']);
      } else { 
        newRow.find('td.carrier').html('');
      }
    } else {
      newRow.find('td.carrier').html('');
    }

    if (shipmentJSONById[id].hasOwnProperty('location')) {
      if (shipmentJSONById[id]['location'] !== '') {
        newRow.find('td.location').html(shipmentJSONById[id]['location']);
      } else {
        newRow.find('td.location').html('');
      }
    } else {
      newRow.find('td.location').html('');
    }
    
    if (shipmentJSONById[id].hasOwnProperty('eta')) {
      if (shipmentJSONById[id]['eta'] !== '') {
        newRow.find('td.eta').html(shipmentJSONById[id]['eta']);
      } else {
        newRow.find('td.eta').html('');
      }
    } else {
      newRow.find('td.eta').html('');
    }
      
    if (shipmentJSONById[id].hasOwnProperty('status')) {
      if (shipmentJSONById[id]['status'] !== '') {
        newRow.find('td.status').html(shipmentJSONById[id]['status']);
      } else {
        newRow.find('td.status').html('');
      }
    } else {
      newRow.find('td.status').html('');
    }

    //append the new row
    $("#maintable").children("tbody").append(newRow);
  }

  //handle on-click save/remove
  $(".icon-shipment-save").click(function() {saveShipment($(this))});
  $(".icon-shipment-remove").click(function() {removeShipment($(this))});
}

//gather information for buildsTable
function buildsTable() {
  //record in maintable what data is being displayed, start at first page
  $("#maintable").data('currentTable','builds');
  $("#maintable").data("pageNum",1);
  $(".currentpage").val(1);

  //get list of items
  var outputJSON = new Object;
  outputJSON['index'] = 'builds';

  $.ajax({
    type: "POST",
    data: outputJSON,
    url: "resources/api/getall.php",
    success:function(data) {
      if (!$.parseJSON(data)['success']) {
        errorHandle($.parseJSON(data))
      } else {
        buildsJSON = $.parseJSON(data)['data'];
        buildsJSONById = [];
        //create buildsJSON pair
        for (entry in buildsJSON) {
          buildsJSONById[buildsJSON[entry]['_id']] = buildsJSON[entry]['_source'];
          buildsJSONById[buildsJSON[entry]['_id']]['id'] = buildsJSON[entry]['_id'];
        }
        //populate associative sort array
        mainSort = aaGen(buildsJSONById, 'num');
        buildBuildsTable();
      }
    },
    error:function(data) {
      var outputData = $.parseJSON(data.responseText);
      errorHandle(outputData);
    }
  });
}

//build buildsTable from scratch
function buildBuildsTable() {
  emptyTable($("#maintable"));
  $("#maintable").append("<thead></thead>");
  $("#maintable").children("thead").append(buildsHeader);
  $("#maintable").find("th").click(function(){  //omg web design why
    if (!($(this).text() in translationArray)) {return;}
    $("#maintable").data("pageNum", 1);
    $(".currentpage").val(1);
    mainSort = aaGen(buildsJSONById, translationArray[$(this).text()]);
    buildBuildsTable();
  });
  $(".icon-build-add").click(addBuild);
  $("#maintable").append("<tbody></tbody>");

  //get page info
  var page = $("#maintable").data("pageNum");
  var maxPage = getMaxPage("builds");


  //determine start and endpoint for page
  var startIndex = ((page - 1) * pageSize);
  var endIndex = startIndex + pageSize - 1;

  if (page >= maxPage) {
    endIndex = Object.keys(buildsJSONById).length - 1;
  }

  for (var entry = startIndex; entry <= endIndex; entry++) {
    var id = mainSort[entry];
    if (buildsJSONById[id]['location'] != locale) {
      continue;
    }
    var newRow = buildsRow.clone();
    newRow.attr("id", id);


    //populate the new row with all the keyword information
    newRow.find('td.server').html(buildsJSONById[id]['server']);
    newRow.find('td.model').html(buildsJSONById[id]['model']);
    newRow.find('td.location').html(buildsJSONById[id]['location']);
    newRow.find('td.builder').html(buildsJSONById[id]['builder']);
    newRow.find('td.builddate').html(buildsJSONById[id]['builddate']);
    if (buildsJSONById[id]['buildnotes'] !== '') {
      newRow.find('span.icon-notes-build').attr('title', buildsJSONById[id]['buildnotes']);
      newRow.find('span.icon-notes-build').removeClass('icon-nonotes').addClass('icon-yesnotes');
    }
    if (buildsJSONById[id].hasOwnProperty('checker')) {
      if (buildsJSONById[id]['checker'] !== '') {
        newRow.find('td.checker').html(buildsJSONById[id]['checker']);
      } else { 
        newRow.find('td.checker').html('');
      }
    } else {
      newRow.find('td.checker').html('');
    }

    if (buildsJSONById[id].hasOwnProperty('qcdate')) {
      if (buildsJSONById[id]['qcdate'] !== '') {
        newRow.find('td.qcdate').html(buildsJSONById[id]['qcdate']);
      } else { 
        newRow.find('td.qcdate').html('');
      }
    } else {
      newRow.find('td.qcdate').html('');
    }

    if (buildsJSONById[id].hasOwnProperty('qcnotes')) {
      if (buildsJSONById[id]['qcnotes'] !== '') {
        newRow.find('span.icon-notes-qc').attr('title', buildsJSONById[id]['qcnotes']);
        newRow.find('span.icon-notes-qc').removeClass('icon-nonotes').addClass('icon-yesnotes');
      }
    }
    
    if (buildsJSONById[id].hasOwnProperty('qcstatus')) {
      if (buildsJSONById[id]['qcstatus'] !== '') {
        newRow.find('td.qcstatus').html(buildsJSONById[id]['qcstatus']);
      } else {
        newRow.find('td.qcstatus').html('');
      }
    } else {
      newRow.find('td.qcstatus').html('');
    }

    //append the new row
    $("#maintable").children("tbody").append(newRow);
  }

  //handle on-click save/remove
  $(".icon-build-qc").click(function() {startQC($(this))});
  $(".icon-build-remove").click(function() {removeBuild($(this))});
}

//note for refactor - this function does NOT use 'getall,' it uses 'search' instead
function innerSerialTable(keyID) {

	//record in innerserialtable what data is being displayed, start at first page
	$("#innerserialtable").data('currentTable','innerserials');
	$("#innerserialtable").data("pageNum",1);
	$("#innerserialtablecontainer").find(".currentpage").val(1);
	$("#innerserialtable").data("keyID", keyID); //save this data here for future goToPage calls

  //get list of items
  var outputJSON = new Object
  outputJSON['index'] = 'serial';
  outputJSON['parameters'] = new Object;
  outputJSON['parameters']['match'] = new Object;
  outputJSON['parameters']['match']['keyword'] = itemJSONById[keyID]['keyword'];

  $.ajax({
    type: "POST",
    data: outputJSON,
    url: "resources/api/search.php",
    success:function(data) {
      if (!$.parseJSON(data)['success']) {
        errorHandle($.parseJSON(data))
      } else {
      	serialJSON = $.parseJSON(data)['data']['hits']['hits'];
  			serialJSONById = [];
  			//create serialJSON pair
  			for (entry in serialJSON) {
					serialJSONById[serialJSON[entry]['_id']] = serialJSON[entry]['_source'];
					serialJSONById[serialJSON[entry]['_id']]['id'] = serialJSON[entry]['_id'];
  			}
  			//populate associative sort array
  			//note: we have to use a different one from the main associative array - might be better to make an array of arrays with indices based on layer.
      	secondarySort = aaGen(serialJSONById, 'serial');
        buildInnerSerialTable(keyID);
      }
    },
    error:function(data) {
      var outputData = $.parseJSON(data.responseText);
      errorHandle(outputData);
    }
  });
}

//build the inner serialTable from scratch
function buildInnerSerialTable(keyID) {

	emptyTable($("#innerserialtable"));
  $("#innerserialtable").append("<thead></thead>");
  $("#innerserialtable").children("thead").append(innerSerialHeader);
  $("#innerserialtable").find("th").click(function() {
  	if (!($(this).text() in translationArray)) {return;}
  	$("#innerserialtable").data("pageNum", 1);
  	$(this).parents(".container").find(".currentpage").val(1);
    secondarySort = aaGen(serialJSONById, translationArray[$(this).text()]);
		buildInnerSerialTable(keyID);
  });
  $(".icon-innerserial-add").click(function(){
    addSerial(keyID);
  });
  $("#innerserialtable").append("<tbody></tbody>");

	//get page info
  var page = $("#innerserialtable").data("pageNum");
  var maxPage = getMaxPage("innerserials");

  //determine start and endpoint for page
  var startIndex = ((page - 1) * pageSize);
  var endIndex = startIndex + pageSize - 1;

  if (page >= maxPage) {
  	endIndex = Object.keys(serialJSONById).length - 1;
  }

  for (var entry = startIndex; entry <= endIndex; entry++) {
  	var id = secondarySort[entry];
    var newRow = innerSerialRow.clone();
    newRow.attr("id", id);

    //populate the new row with all the serial information
    newRow.find('td.serial').html(serialJSONById[id]['serial']);

    if (serialJSONById[id].hasOwnProperty('price')) {
      if (serialJSONById[id]['price'] !== '') {
        newRow.find('td.price').html(serialJSONById[id]['price']);
      } else { 
        newRow.find('td.price').html('0.00');
      }
    } else {
      newRow.find('td.price').html('0.00');
    }

    if (serialJSONById[id]['pFlag']) {
      newRow.find('td.price').css("background-color", "#F37878");
    }

    if (serialJSONById[id].hasOwnProperty('status')) {
      if (serialJSONById[id]['status'] !== '') {
        newRow.find('select.status').val(serialJSONById[id]['status']);
      } else { 
        newRow.find('select.status').val('Unknown');
      }
    } else {
      newRow.find('select.status').val('Unknown');
    }

    if (serialJSONById[id].hasOwnProperty('location')) {
      if (serialJSONById[id]['location'] !== '') {
        newRow.find('select.location').val(serialJSONById[id]['location']);
      } else { 
        newRow.find('select.location').val('Unknown');
      }
    } else {
      newRow.find('select.location').val('Unknown');
    }

    //append the new row
    $("#innerserialtable").children("tbody").append(newRow);
  }

  //handle on-click save/remove
  $(".icon-serial-save").click(function() {saveSerial($(this))});
  $(".icon-serial-remove").click(function() {removeSerial($(this))});
  $(".icon-serial-history").click(function() {serialHistoryTable($(this))});

  //turn the whole nightmare into a dialog box

  $("#innerserialtablecontainer").dialog({
  	modal: true,
  	width: $("#main").width()/2,
    title: $("#" + keyID).find(".keyword").text() + ' manifest'
  });
  $("#innerserialtablecontainer").off('dialogclose');
  $("#innerserialtablecontainer").on('dialogclose', function(event) {
    checkAmount(keyID, function(oldID, result){$('#' + oldID).children(".amount").html(result)});
  });
  $("#innerserialtablecontainer").show();
}

//gather information for serialHistoryTable
function serialHistoryTable(thisObj) {

	//determine serialID of caller
	var serialID = $(thisObj).parents('tr').attr('id');

	//record in historytable what data is being displayed, start at first page
	$("#historytable").data('currentTable','serialhistory');
	$("#historytable").data("pageNum",1);
	$("#historytablecontainer").find(".currentpage").val(1);
	$("#historytable").data("serialID", serialID); //save this data here for future goToPage calls

  //build table
  var serialID = $(thisObj).parents('tr').attr('id');
  tertiarySort = aaGen(serialJSONById[serialID]['history'], "date")
  buildSerialHistoryTable(serialID);
}

//build serialHistoryTable from scratch
function buildSerialHistoryTable(serialID) {

	//empty history table
  emptyTable($("#historytable"));

  //build history table
  $("#historytable").append("<thead></thead>");
  $("#historytable").children("thead").append(serialHistoryHeader);
  $("#historytable").find("th").click(function() {
    if (!($(this).text() in translationArray)) {return;}
    $("#historytable").data("pageNum", 1);
  	$(this).parents(".container").find(".currentpage").val(1);
    tertiarySort = aaGen(serialJSONById[serialID]['history'], translationArray[$(this).text()]);
		buildSerialHistoryTable(serialID);
  });
  $("#historytable").append("<tbody></tbody>");

  //get page info
  var page = $("#historytable").data("pageNum");
  var maxPage = getMaxPage("serialhistory");

  //determine start and endpoint for page
  var startIndex = ((page - 1) * pageSize);
  var endIndex = startIndex + pageSize - 1;

  if (page >= maxPage) {
  	endIndex = Object.keys(serialJSONById[serialID]['history']).length - 1;
  }

  for (var entry = startIndex; entry <= endIndex; entry++) {
    var newRow = serialHistoryRow.clone();

    if (serialJSONById[serialID]['history'][tertiarySort[entry]].hasOwnProperty('date')) {
      if (serialJSONById[serialID]['history'][tertiarySort[entry]]['date'] !== '') {
        newRow.find('td.date').html(serialJSONById[serialID]['history'][tertiarySort[entry]]['date']);
      } else { 
        newRow.find('td.date').html('Unknown');
      }
    } else {
      newRow.find('td.date').html('Unknown');
    }

    if (serialJSONById[serialID]['history'][tertiarySort[entry]].hasOwnProperty('user')) {
      if (serialJSONById[serialID]['history'][tertiarySort[entry]]['user'] !== '') {
        newRow.find('td.user').html(serialJSONById[serialID]['history'][tertiarySort[entry]]['user']);
      } else { 
        newRow.find('td.user').html('Unknown');
      }
    } else {
      newRow.find('td.user').html('Unknown');
    }

    if (serialJSONById[serialID]['history'][tertiarySort[entry]].hasOwnProperty('status')) {
      if (serialJSONById[serialID]['history'][tertiarySort[entry]]['status'] !== '') {
        newRow.find('td.status').html(serialJSONById[serialID]['history'][tertiarySort[entry]]['status']);
      } else { 
        newRow.find('td.status').html('Unknown');
      }
    } else {
      newRow.find('td.status').html('Unknown');
    }

    if (serialJSONById[serialID]['history'][tertiarySort[entry]].hasOwnProperty('location')) {
      if (serialJSONById[serialID]['history'][tertiarySort[entry]]['location'] !== '') {
        newRow.find('td.location').html(serialJSONById[serialID]['history'][tertiarySort[entry]]['location']);
      } else { 
        newRow.find('td.location').html('Unknown');
      }
    } else {
      newRow.find('td.location').html('Unknown');
    }

    if (serialJSONById[serialID]['history'][tertiarySort[entry]].hasOwnProperty('note')) {
      if (serialJSONById[serialID]['history'][tertiarySort[entry]]['note'] !== '') {
        newRow.find('td.note').html(serialJSONById[serialID]['history'][tertiarySort[entry]]['note']);
      } else { 
        newRow.find('td.note').html('');
      }
    } else {
      newRow.find('td.note').html('');
    }

    if (serialJSONById[serialID]['history'][tertiarySort[entry]].hasOwnProperty('price')) {
      if (serialJSONById[serialID]['history'][tertiarySort[entry]]['price'] !== '') {
        newRow.find('td.price').html(serialJSONById[serialID]['history'][tertiarySort[entry]]['price']);
      } else { 
        newRow.find('td.price').html('');
      }
    } else {
      newRow.find('td.price').html('');
    }

    //append the new row
    $("#historytable").children("tbody").append(newRow);
  }

  //turn this whole nightmare into a dialog box
  $("#historytablecontainer").dialog({
    modal: true,
    width: $("#main").width()/2,
    title: serialJSONById[serialID]['keyword'] + ': S/N ' + $("#" + serialID).find(".serial").html() + ' history'
  });
  $("#historytablecontainer").parent().position({
    my: "left top",
    at: "left+3% top+10%",
    of: $("#innerserialtablecontainer").parent(),
    collision: "fit none"
  });
  $("#historytablecontainer").show();

  if ($('#historytablecontainer').is(':offscreen')) {
    $("#historytablecontainer")[0].scrollIntoView(false, {block: "end", behavior:"smooth"});
  }
}

function itemHistoryTable(thisObj) {

  //get id and start assembling data
  var id = $(thisObj).parents('tr').attr('id');
  //note to self - remember to do this to copy arrays, because JS actually seems to use array pointers instead of copies.
  historyArray = Array.from(itemJSONById[id]['priceHistory']);

  //record in historytable what data is being displayed, start at first page
	$("#historytable").data('currentTable','itemhistory');
	$("#historytable").data("pageNum",1);
	$("#historytablecontainer").find(".currentpage").val(1);
	$("#historytable").data("keyID", id); //save this data here for future goToPage calls

  //search for all keywords in 'serial' database
  var outputJSON = new Object
  outputJSON['index'] = 'serial';
  outputJSON['parameters'] = new Object;
  outputJSON['parameters']['match'] = new Object;
  outputJSON['parameters']['match']['keyword'] = itemJSONById[id]['keyword'];

  $.ajax({
    type: "POST",
    data: outputJSON,
    url: "resources/api/search.php",
    success:function(data) {
      data = $.parseJSON(data);
      if (!(data['success'])) {
        alert("Error " + data['code'] + ": " + data['text'] + " \n\nReloading item table.");
        console.log(data);
        itemTable();                          //reload table
        return;
      } else {
        data = data['data']['hits']['hits'];
      }

      //concatenate search results into history array
      for (entry in data) {

        //include serial in each entry
        for (innerEntry in data[entry]['_source']['history']) {
          data[entry]['_source']['history'][innerEntry]['serial'] = data[entry]['_source']['serial'];
        }

        historyArray = $.merge(historyArray, data[entry]['_source']['history']);
      }


      //okay... I know this is ugly, but we're now going to check ANOTHER database, and since JS is asynchronous,
      //I need to nest this second check inside the first check.  Sorry for ugly code.
      //search for all keywords in 'dead' database
      var outputJSON2 = new Object
      outputJSON2['index'] = 'dead';
      outputJSON2['parameters'] = new Object;
      outputJSON2['parameters']['match'] = new Object;
      outputJSON2['parameters']['match']['keyword'] = itemJSONById[id]['keyword'];

      $.ajax({
        type:"POST",
        data: outputJSON2,
        url: "resources/api/search.php",
        success:function(data2) {
          data2 = $.parseJSON(data2);
          if (!(data2['success'])) {
            alert("Error " + data2['code'] + ": " + data2['text'] + " \n\nReloading item table.");
            console.log(data);
            itemTable();                          //reload table
            return;
          } else {
            data2 = data2['data']['hits']['hits'];
          }

          //concatenate search results into history array
          for (entry in data2) {

            //include serial in each entry
            for (innerEntry in data2[entry]['_source']['history']) {
              data2[entry]['_source']['history'][innerEntry]['serial'] = data2[entry]['_source']['serial'];
            }

            historyArray = $.merge(historyArray, data2[entry]['_source']['history']);
          }

          //if we've reached this point, then we have a full historyArray compiled from itemJSON, serial table, and dead table.
          //Initially sort on date
          tertiarySort = aaGen(historyArray, "date");
          //Go ahead and build the table now.
          buildItemHistoryTable(id);
        },
        error: function(data2) {
          var outputData2 = $.parseJSON(data2.responseText);
          errorHandle(outputData2);
        }
      });


    },
    error:function(data) {
      var outputData = $.parseJSON(data.responseText);
      errorHandle(outputData);
    }
  });
}

function buildItemHistoryTable(keyID) {

	//empty history table
  emptyTable($("#historytable"));

  //build history table
  $("#historytable").append("<thead></thead>");
  $("#historytable").children("thead").append(itemHistoryHeader);
  $("#historytable").find("th").click(function() {
    if (!($(this).text() in translationArray)) {return;}
    $("#historytable").data("pageNum", 1);
  	$(this).parents(".container").find(".currentpage").val(1);
    tertiarySort = aaGen(historyArray, translationArray[$(this).text()]);
		buildItemHistoryTable(keyID);
  });
  $("#historytable").append("<tbody></tbody>");

  //get page info
  var page = $("#historytable").data("pageNum");
  var maxPage = getMaxPage("itemhistory");

  //determine start and endpoint for page
  var startIndex = ((page - 1) * pageSize);
  var endIndex = startIndex + pageSize - 1;

  if (page >= maxPage) {
  	endIndex = historyArray.length - 1;
  }

  for (var entry = startIndex; entry <= endIndex; entry++) {
    var newRow = itemHistoryRow.clone();

    if (historyArray[tertiarySort[entry]].hasOwnProperty('date')) {
      if (historyArray[tertiarySort[entry]]['date'] !== '') {
        newRow.find('td.date').html(historyArray[tertiarySort[entry]]['date']);
      } else { 
        newRow.find('td.date').html('Unknown');
      }
    } else {
      newRow.find('td.date').html('Unknown');
    }

    if (historyArray[tertiarySort[entry]].hasOwnProperty('serial')) {
      if (historyArray[tertiarySort[entry]]['serial'] !== '') {
        newRow.find('td.serial').html(historyArray[tertiarySort[entry]]['serial']);
      } else { 
        newRow.find('td.serial').html('');
      }
    } else {
      newRow.find('td.serial').html('');
    }

    if (historyArray[tertiarySort[entry]].hasOwnProperty('user')) {
      if (historyArray[entry]['user'] !== '') {
        newRow.find('td.user').html(historyArray[tertiarySort[entry]]['user']);
      } else { 
        newRow.find('td.user').html('');
      }
    } else {
      newRow.find('td.user').html('');
    }

    if (historyArray[tertiarySort[entry]].hasOwnProperty('status')) {
      if (historyArray[tertiarySort[entry]]['status'] !== '') {
        newRow.find('td.status').html(historyArray[tertiarySort[entry]]['status']);
      } else { 
        newRow.find('td.status').html('');
      }
    } else {
      newRow.find('td.status').html('');
    }

    if (historyArray[tertiarySort[entry]].hasOwnProperty('location')) {
      if (historyArray[tertiarySort[entry]]['location'] !== '') {
        newRow.find('td.location').html(historyArray[tertiarySort[entry]]['location']);
      } else { 
        newRow.find('td.location').html('');
      }
    } else {
      newRow.find('td.location').html('');
    }

    if (historyArray[tertiarySort[entry]].hasOwnProperty('note')) {
      if (historyArray[tertiarySort[entry]]['note'] !== '') {
        newRow.find('td.note').html(historyArray[tertiarySort[entry]]['note']);
      } else { 
        newRow.find('td.note').html('');
      }
    } else {
      newRow.find('td.note').html('');
    }

    var whosePrice;

    if (historyArray[tertiarySort[entry]].hasOwnProperty('price')) {
      //if it came from a serial 
      if (historyArray[tertiarySort[entry]].hasOwnProperty('serial')) {
        whosePrice = 'td.price';
      } else {
        whosePrice = 'td.keyPrice';
      }

      if (historyArray[tertiarySort[entry]]['price'] !== '') {
        newRow.find(whosePrice).html(historyArray[tertiarySort[entry]]['price']);
      } else { 
        newRow.find(whosePrice).html('');
      }
    } else {
      newRow.find(whosePrice).html('');
    }

    //append the new row
    $("#historytable").children("tbody").append(newRow);
  }

  //turn this nightmare into a dialog box
  $("#historytablecontainer").dialog({
    modal: true,
    width: $("#main").width()/2,
    title: itemJSONById[keyID]['keyword'] + ' history'
  });
  $("#historytablecontainer").show();
}

function addItem() {
  var keyword = "new";
  var count = 0;
  var outputJSON = new Object;
  var now = new Date;
  var tz = now.getTimezoneOffset();
  var nowtz = new Date(now - tz*60*1000);

  outer_loop:
  while (true) {
    for (entry in itemJSONById) {
      //check to see if "new" or "new1" or "new2" or whatever is used
      if (itemJSONById[entry]['keyword'] == keyword) {
        count = count + 1;
        keyword = "new" + String(count);
        continue outer_loop; //if it's used, re-start the loop
      }
    }
    break;
  }
  
  outputJSON['parameters'] = new Object;
  outputJSON['parameters']['lastAudited'] = new Object;
  outputJSON['parameters']['lastAudited'][locale] = (now.getFullYear() - 1).toString() + '-' + ('0' +(now.getMonth() + 1).toString()).slice(-2) + '-' + ('0' + now.getDate().toString()).slice(-2);
  outputJSON['parameters']['lastAuditor'] = new Object;
  outputJSON['parameters']['lastAuditor'][locale] = 'None';
  outputJSON['parameters']['keyword'] = keyword;
  outputJSON['parameters']['threshold'] = new Object;
  outputJSON['parameters']['threshold'][locale] = 0;
  outputJSON['parameters']['ordered'] = new Object;
  outputJSON['parameters']['ordered'][locale] = false;
  outputJSON['parameters']['amount'] = new Object;
  outputJSON['parameters']['price'] = 0.00;
  outputJSON['parameters']['priceHistory'] = [];
  outputJSON['parameters']['priceHistory'][0] = new Object;
  outputJSON['parameters']['priceHistory'][0]['price'] = 0.00;
  outputJSON['parameters']['priceHistory'][0]['date'] = nowtz.toISOString().replace(/T/g," ").slice(0, nowtz.toISOString().indexOf("."));
  outputJSON['index'] = 'items';
  $.post('resources/api/put.php', outputJSON, function(data) {
    data = $.parseJSON(data);
    //reload table on a failure
    if (!(data['success'])) {
      alert("Error " + data['code'] + ": " + data['text'] + " \n\nReloading item table.");
      console.log(data);
      itemTable();                          //reload table
      return;
    //update input
    } else {
      var id = data['data']['_id'];
      var newRow = itemRow.clone();
      newRow.attr("id", id);
      itemJSONById[id] = new Object;
      itemJSONById[id]['keyword'] = keyword;
      itemJSONById[id]['id'] = id;
      itemJSONById[id]['category'] = "";
      itemJSONById[id]['label'] = "";
      itemJSONById[id]['threshold'] = new Object;
      itemJSONById[id]['threshold'][locale] = 0;
      itemJSONById[id]['record'] = 1;
      itemJSONById[id]['price'] = 0.00;
      itemJSONById[id]['ordered'] = new Object;
      itemJSONById[id]['ordered'][locale] = false;
      itemJSONById[id]['priceHistory'] = [];
      itemJSONById[id]['priceHistory'][0] = new Object;
      itemJSONById[id]['priceHistory'][0]['price'] = 0.00;
      itemJSONById[id]['priceHistory'][0]['date'] = outputJSON['parameters']['priceHistory'][0]['date'];
      itemJSONById[id]['amount'] = new Object;
      newRow.find('td.keyword').html(itemJSONById[id]['keyword']);
      newRow.find('td.price').html(itemJSONById[id]['price']);
      newRow.find('span.icon-item-save').click(function() {saveItem($(this))});
      newRow.find('span.icon-item-remove').click(function() {removeItem($(this))});
      newRow.find("span.icon-item-history").click(function() {itemHistoryTable($(this))});
      newRow.find("span.icon-item-expand").click(function() {
        var keyID = $(this).parents(".itemrow").attr('id');
        innerSerialTable(keyID);
      });
      $("#maintable").children("tbody").append(newRow);
      checkAmount(id, function(oldID, result){$('#' + oldID).children(".amount").html(result)});
      $("#" + id)[0].scrollIntoView(false, {block: "end", behavior:"smooth"});
      $("#" + id).css("background-color","#00FFAA");
      $("#" + id).animate({backgroundColor: "transparent"}, 1000);

      //add id to mainSort
      var index = $("#maintable").data("pageNum") * pageSize;
      mainSort.splice(index, 0, id);
    }

  });
}

function saveItem(thisObj) {
  var now = new Date;
  var tz = now.getTimezoneOffset();
  var nowtz = new Date(now - tz*60*1000);

  //gather ID
  var id = $(thisObj).parents('tr').attr('id');

  //turn off the button to prevent multiclicking
  $("#" + id).css("pointer-events", "none");

  //get new category, keyword, label, threshold, assemble in json
  var testingJSON = new Object;
  testingJSON['old'] = new Object;
  testingJSON['new'] = new Object;
  testingJSON['new']['keyword'] = $("#" + id).children('.keyword').text();
  testingJSON['new']['category'] = $("#" + id).children('.category').text();
  testingJSON['new']['label'] = $("#" + id).children('.item').text();
  testingJSON['new']['threshold'] = new Object;
  testingJSON['new']['threshold'][locale] = parseInt($("#" + id).children('.threshold').text()) || 0;
  testingJSON['new']['price'] = parseFloat($("#" + id).children('.price').text());
  testingJSON['new']['ordered'] = new Object;
  testingJSON['new']['ordered'][locale] = $("#" + id).find('.ordered :input').prop('checked');
  testingJSON['id'] = id;

  //it isn't easy to clone an object in javascript.  whee.
  testingJSON['old']['keyword'] = itemJSONById[id]['keyword'];
  testingJSON['old']['category'] = itemJSONById[id]['category'];
  testingJSON['old']['label'] = itemJSONById[id]['label'];
  testingJSON['old']['threshold'] = new Object;
  testingJSON['old']['threshold'][locale] = itemJSONById[id]['threshold'][locale];
  testingJSON['old']['price'] = itemJSONById[id]['price'];
  testingJSON['old']['ordered'] = new Object;
  testingJSON['old']['ordered'][locale] = itemJSONById[id]['ordered'][locale];


  //check for changes, if so, post them to backend
  for (key in testingJSON['new']) {
    if (testingJSON['new'][key] != testingJSON['old'][key]) {
      var outputJSON = new Object;
      outputJSON['parameters'] = new Object;
      outputJSON['parameters'] = testingJSON['new'];
      //if price changed, add new entry in priceHistory
      if (testingJSON['old']['price'] != testingJSON['new']['price']) {
        var newHistoryEntry = new Object;
        newHistoryEntry['price'] = testingJSON['new']['price'];
        newHistoryEntry['date'] = nowtz.toISOString().replace(/T/g," ").slice(0, nowtz.toISOString().indexOf("."));
        outputJSON['parameters']['priceHistory'] = itemJSONById[id]['priceHistory'];
        outputJSON['parameters']['priceHistory'].push(newHistoryEntry);
      }
      outputJSON['id'] = id;
      outputJSON['index'] = 'items';
      outputJSON['record'] = itemJSONById[id]['record'];
      $.post('resources/api/update.php', outputJSON, function(data) {
        data = $.parseJSON(data);
        //reload table on a failure
        if (!(data['success'])) {
          alert("Error " + data['code'] + ": " + data['text'] + " \n\nReloading item table.");
          console.log(data);
          itemTable();                          //reload table
          $("#" + id).css("pointer-events", "auto");  //reset click events
          return;
        //update input
        } else {
          $("#" + id).css("background-color","#00FFAA");
          $("#" + id).animate({backgroundColor: "transparent"}, 1000);
          itemJSONById[id]['keyword'] = outputJSON['parameters']['keyword'];
          itemJSONById[id]['category'] = outputJSON['parameters']['category'];
          itemJSONById[id]['label'] = outputJSON['parameters']['label'];
          itemJSONById[id]['threshold'][locale] = outputJSON['parameters']['threshold'][locale];
          itemJSONById[id]['record'] = outputJSON['record'] + 1;
          itemJSONById[id]['price'] = outputJSON['parameters']['price'];
          itemJSONById[id]['ordered'][locale] = outputJSON['parameters']['ordered'][locale];
          if ('priceHistory' in outputJSON['parameters']) {
            itemJSONById[id]['priceHistory'] = outputJSON['parameters']['priceHistory'];
          }
          checkAmount(id, function(oldID, result){$('#' + oldID).children(".amount").html()});
        }
      });
      break;
    }
  }

  $("#" + id).css("pointer-events", "auto");  //reset click events
}

function removeItem(thisObj) {
  //gather ID and create link to parent
  var id = $(thisObj).parents('tr').attr('id');
  var parent = $(thisObj).parents('td');

  //turn off click events for safety
  $(thisObj).css("pointer-events", "none");

  //fade out trash icon and start the confirmation process
  $(thisObj).fadeOut(200, function() {

    //confirmation process: remove trash icon and create confirm icon
    $(thisObj).remove();
    var confirmIcon = deleteConfirm.clone(true);

    //confirmation process: set a timer
    var timeoutID = setTimeout(function() {

      //at end of timer (10s), auto-cancel delete: remove confirm icon and remake trash icon, give it a click handler, restart pointer events
      confirmIcon.fadeOut(200, function() {
        confirmIcon.remove();
        $(parent).append(thisObj);
        $(thisObj).fadeIn(200);
        $(thisObj).click(function() {removeItem(thisObj)});
        $(thisObj).css("pointer-events", "auto");
      });
    }, 10000); //timeout is in 10 seconds

    //confirmation process: add confirm button and create click handler
    $(parent).append(confirmIcon.click(function() {
      //warn user that serials will remain.
      var sureYouWannaDump = confirm("If any serials are still associated with this keyword, they will NOT be deleted.  You'll need to do that manually.  Yes, not convenient, I know, but think of it as a safeguard against a freak clicking accident.  \n\nPress 'OK' to delete this keyword.");
        if (!(sureYouWannaDump)) {
          return;
        }

      //on confirmation: stop auto-cancel and pointer effects      
      clearTimeout(timeoutID);
      $("#" + id).css("pointer-events", "none");

      //on confirmation: create output object and populate
      var outputJSON = new Object;
      outputJSON['id'] = id;
      outputJSON['index'] = 'items';

      //on confirmation: attempt to remove item from DB
      $.post('resources/api/delete.php', outputJSON, function(data) {
        data = $.parseJSON(data);
        //reload table on a failure
        if (!(data['success'])) {
          alert("Error " + data['code'] + ": " + data['text'] + " \n\nReloading item table.");
          console.log(data);
          itemTable();                                //reload table
          $("#" + id).css("pointer-events", "auto");  //reset click events
          return;
        //update input
        } else {

          //remove row and item from itemJSON
          $("#" + id).fadeOut(300, function(){
            $("#" + id).remove();
          });
          delete itemJSONById[id];
          unSort(id);
        }
      });
    }));

    //now that onclick is set, fade in
    $(confirmIcon).fadeTo(200, 1);
  });
}

function addTicket() {
  var server = "new";
  var count = 0;
  var outputJSON = new Object;
  var dummyStart = new Date(Date.now() + 3600000); //dummyStart is an hour from now
  var dummyEnd = new Date(Date.now() + 86400000); //dummyEnd is a day from now
  //omg setting time formats is a nightmare
  //I've spent way too much time on this, trying different plugins and iso formats.  We're just going to edit strings directly.
  var dummyStartMonth = pad(dummyStart.getMonth() + 1,2); //omg javascript are you serious - DECEMBER is month 11?!
  var dummyStartDay = pad(dummyStart.getDate(),2);
  var dummyEndMonth = pad(dummyEnd.getMonth() + 1,2);
  var dummyEndDay = pad(dummyEnd.getDate(),2);


  var dummyStartStr = dummyStart.getFullYear() + "-" + dummyStartMonth + "-" + dummyStartDay + " ";
  dummyStartStr = dummyStartStr + dummyStart.toLocaleTimeString().replace(" ","").replace("A","").replace("P","").replace("M","");
  var dummyEndStr = dummyEnd.getFullYear() + "-" + dummyEndMonth + "-" + dummyEndDay + " ";
  dummyEndStr = dummyEndStr + dummyEnd.toLocaleTimeString().replace(" ","").replace("A","").replace("P","").replace("M","");

  outer_loop:
  while (true) {
    for (entry in ticketJSONById) {
      //check to see if "new" or "new1" or "new2" or whatever is used
      if (ticketJSONById[entry]['server'] == server) {
        count = count + 1;
        server = "new" + String(count);
        continue outer_loop; //if it's used, re-start the loop
      }
    }
    break;
  }

  outputJSON['parameters'] = new Object;
  outputJSON['parameters']['server'] = server;
  outputJSON['parameters']['start'] = dummyStartStr;
  outputJSON['parameters']['end'] = dummyEndStr;
  outputJSON['parameters']['TZ'] = 'Pacific';
  outputJSON['parameters']['location'] = locale;
  outputJSON['index'] = 'tickets';
  $.post('resources/api/put.php', outputJSON, function(data) {
    data = $.parseJSON(data);
    //reload table on a failure
    if (!(data['success'])) {
      alert("Error " + data['code'] + ": " + data['text'] + " \n\nReloading ticket table.");
      console.log(data);
      ticketTable();                          //reload table
      return;
    //update input
    } else {
      var id = data['data']['_id'];
      var newRow = ticketRow.clone();
      newRow.attr("id", id);
      ticketJSONById[id] = new Object;
      ticketJSONById[id]['server'] = server;
      ticketJSONById[id]['start'] = dummyStartStr;
      ticketJSONById[id]['end'] = dummyEndStr;
      ticketJSONById[id]['location'] = locale;
      ticketJSONById[id]['record'] = 1;
      newRow.find('td.server').html(ticketJSONById[id]['server']);
      newRow.find('td.start').html(ticketJSONById[id]['start']);
      newRow.find('td.end').html(ticketJSONById[id]['end']);
      newRow.find('select.location').val(locale);
      newRow.find('td.start').inputmask('datetime', {
        mask: "y-2-1 h:s:s",
        placeholder: "yyyy-mm-dd hh:mm:ss",
        leapday: "-02-29",
        separator: "-",
        alias: "mm/dd/yyyy hh:mm xm"
      });
      newRow.find('td.end').inputmask('datetime', {
        mask: "y-2-1 h:s:s",
        placeholder: "yyyy-mm-dd hh:mm:ss",
        leapday: "-02-29",
        separator: "-",
        alias: "mm/dd/yyyy hh:mm xm"
      });
      newRow.find('span.icon-ticket-save').click(function() {saveTicket($(this))});
      newRow.find('span.icon-ticket-remove').click(function() {removeTicket($(this))});
      $("#maintable").children("tbody").append(newRow);
      $("#" + id)[0].scrollIntoView(false, {block: "end", behavior:"smooth"});
      $("#" + id).css("background-color","#00FFAA");
      $("#" + id).animate({backgroundColor: "transparent"}, 1000);

      //add id to mainSort
      var index = $("#maintable").data("pageNum") * pageSize;
      mainSort.splice(index, 0, id);
    }

  });
}

function saveTicket(thisObj) {
  //gather ID
  var id = $(thisObj).parents('tr').attr('id');

  //turn off the button to prevent multiclicking
  $("#" + id).css("pointer-events", "none");

  //get new server, start, end, assemble in json
  var testingJSON = new Object;
  testingJSON['old'] = new Object;
  testingJSON['new'] = new Object;
  testingJSON['new']['server'] = $("#" + id).children('.server').text();
  testingJSON['new']['start'] = $("#" + id).children('.start').text();
  testingJSON['new']['end'] = $("#" + id).children('.end').text();
  testingJSON['new']['location'] = $("#" + id).find('.location').val();
  testingJSON['id'] = id;

  //it isn't easy to clone an object in javascript.  whee.
  testingJSON['old']['server'] = ticketJSONById[id]['server'];
  testingJSON['old']['start'] = ticketJSONById[id]['start'];
  testingJSON['old']['end'] = ticketJSONById[id]['end'];
  testingJSON['old']['location'] = ticketJSONById[id]['location'];


  //check for changes, if so, post them to backend
  for (key in testingJSON['new']) {
    if (testingJSON['new'][key] != testingJSON['old'][key]) {
      var outputJSON = new Object;
      outputJSON['parameters'] = new Object;
      outputJSON['parameters'] = testingJSON['new'];
      outputJSON['id'] = id;
      outputJSON['index'] = 'tickets';
      outputJSON['record'] = ticketJSONById[id]['record'];
      $.post('resources/api/update.php', outputJSON, function(data) {
        data = $.parseJSON(data);
        //reload table on a failure
        if (!(data['success'])) {
          alert("Error " + data['code'] + ": " + data['text'] + " \n\nReloading ticket table.");
          console.log(data);
          ticketTable();                          //reload table
          $("#" + id).css("pointer-events", "auto");  //reset click events
          return;
        //update input
        } else {
          $("#" + id).css("background-color","#00FFAA");
          $("#" + id).animate({backgroundColor: "transparent"}, 1000);
          ticketJSONById[id]['server'] = outputJSON['parameters']['server'];
          ticketJSONById[id]['start'] = outputJSON['parameters']['start'];
          ticketJSONById[id]['end'] = outputJSON['parameters']['end'];
          ticketJSONById[id]['location'] = outputJSON['parameters']['location'];
          ticketJSONById[id]['record'] = outputJSON['record'] + 1;
        }
      });
      break;
    }
  }

  $("#" + id).css("pointer-events", "auto");  //reset click events
}

function removeTicket(thisObj) {
  //gather ID and create link to parent
  var id = $(thisObj).parents('tr').attr('id');
  var parent = $(thisObj).parents('td');

  //turn off click events for safety
  $(thisObj).css("pointer-events", "none");

  //fade out trash icon and start the confirmation process
  $(thisObj).fadeOut(200, function() {

    //confirmation process: remove trash icon and create confirm icon
    $(thisObj).remove();
    var confirmIcon = deleteConfirm.clone(true);

    //confirmation process: set a timer
    var timeoutID = setTimeout(function() {

      //at end of timer (10s), auto-cancel delete: remove confirm icon and remake trash icon, give it a click handler, restart pointer events
      confirmIcon.fadeOut(200, function() {
        confirmIcon.remove();
        $(parent).append(thisObj);
        $(thisObj).fadeIn(200);
        $(thisObj).click(function() {removeTicket(thisObj)});
        $(thisObj).css("pointer-events", "auto");
      });
    }, 10000); //timeout is in 10 seconds

    //confirmation process: add confirm button and create click handler
    $(parent).append(confirmIcon.click(function() {

      //on confirmation: stop auto-cancel and pointer effects      
      clearTimeout(timeoutID);
      $("#" + id).css("pointer-events", "none");

      //on confirmation: create output object and populate
      var outputJSON = new Object;
      outputJSON['id'] = id;
      outputJSON['index'] = 'tickets';

      //on confirmation: attempt to remove ticket from DB
      $.post('resources/api/delete.php', outputJSON, function(data) {
        data = $.parseJSON(data);
        //reload table on a failure
        if (!(data['success'])) {
          alert("Error " + data['code'] + ": " + data['text'] + " \n\nReloading ticket table.");
          console.log(data);
          ticketTable();                              //reload table
          $("#" + id).css("pointer-events", "auto");  //reset click events
          return;
        //update input
        } else {

          //remove row and ticket from ticketJSON
          $("#" + id).fadeOut(300, function(){
            $("#" + id).remove();
          });
          delete ticketJSONById[id];
          unSort(id);
        }
      });
    }));

    //now that onclick is set, fade in
    $(confirmIcon).fadeTo(200, 1);
  });
}

function addUser() {
  var user = "new";
  var count = 0;
  var outputJSON = new Object;

  //stupid datetime tricks
  var now = new Date;
  var tz = now.getTimezoneOffset();
  var nowtz = new Date(now - tz*60*1000);

  outer_loop:
  while (true) {
    for (entry in userJSONById) {
      //check to see if "new" or "new1" or "new2" or whatever is used
      if (userJSONById[entry]['user'] == user) {
        count = count + 1;
        user = "new" + String(count);
        continue outer_loop; //if it's used, re-start the loop
      }
    }
    break;
  }
  
  outputJSON['parameters'] = new Object;
  outputJSON['parameters']['user'] = user;
  outputJSON['parameters']['password'] = '';
  outputJSON['parameters']['permission'] = 0;
  outputJSON['parameters']['email'] = '';
  outputJSON['parameters']['distressFlag'] = false;
  outputJSON['parameters']['dTime'] = nowtz.toISOString().replace(/T/g," ").slice(0, nowtz.toISOString().indexOf("."));

  outputJSON['index'] = 'users';
  $.post('resources/api/put.php', outputJSON, function(data) {
    data = $.parseJSON(data);
    //reload table on a failure
    if (!(data['success'])) {
      alert("Error " + data['code'] + ": " + data['text'] + " \n\nReloading user table.");
      console.log(data);
      userTable();                          //reload table
      return;
    //update input
    } else {
      var id = data['data']['_id'];
      var newRow = userRow.clone();
      newRow.attr("id", id);
      userJSONById[id] = new Object;
      userJSONById[id]['user'] = user;
      userJSONById[id]['password'] = '';
      userJSONById[id]['permission'] = 0;
      userJSONById[id]['email'] = '';
      userJSONById[id]['record'] = 1;
      userJSONById[id]['distressFlag'] = false;
      userJSONById[id]['dTime'] = nowtz.toISOString().replace(/T/g," ").slice(0, nowtz.toISOString().indexOf("."));
      newRow.find('td.user').html(userJSONById[id]['user']);
      newRow.find('select.access').val(0);
      newRow.find('span.icon-user-save').click(function() {saveUser($(this))});
      newRow.find('span.icon-user-remove').click(function() {removeUser($(this))});
      newRow.find('span.icon-user-email').click(function(){emailUser($(this))});
      $("#maintable").children("tbody").append(newRow);
      $("#" + id)[0].scrollIntoView(false, {block: "end", behavior:"smooth"});
      $("#" + id).css("background-color","#00FFAA");
      $("#" + id).animate({backgroundColor: "transparent"}, 1000);

      //add id to mainSort
      var index = $("#maintable").data("pageNum") * pageSize;
      mainSort.splice(index, 0, id);
    }

  });
}

function saveUser(thisObj) {
  //gather ID
  var id = $(thisObj).parents('tr').attr('id');

  //turn off the button to prevent multiclicking
  $("#" + id).css("pointer-events", "none");

  //check for password matching
  if (!($("#" + id).find('.password').val().split("<br>").join("") === $("#" + id).find('.verify').val().split("<br>").join(""))) {
    alert("Passwords don't match!");
    $("#" + id).css("pointer-events", "auto");  //reset click events
    return;
  }

  //get new stuff, assemble in JSON
  var testingJSON = new Object;
  testingJSON['old'] = new Object;
  testingJSON['new'] = new Object;
  testingJSON['new']['user'] = $("#" + id).children('.user').text();
  testingJSON['new']['email'] = $("#" + id).children('.email').text();

  //if the password hasn't been updated, don't try to update it
  if ($("#" + id).find('.password').val().split("<br>").join("") != "") {
		testingJSON['new']['password'] = $("#" + id).find('.password').val();
		testingJSON['old']['password'] = userJSONById[id]['password'];
  }
  testingJSON['new']['permission'] = parseInt($("#" + id).find('.access').val());
  testingJSON['id'] = id;

  //it isn't easy to clone an object in javascript.  whee.
  testingJSON['old']['user'] = userJSONById[id]['user'];
  testingJSON['old']['permission'] = userJSONById[id]['permission'];
  testingJSON['old']['email'] = userJSONById[id]['email'];


  //check for changes, if so, post them to backend
  for (key in testingJSON['new']) {
    if (testingJSON['new'][key] != testingJSON['old'][key]) {
      var outputJSON = new Object;
      outputJSON['parameters'] = new Object;
      outputJSON['parameters'] = testingJSON['new'];
      outputJSON['id'] = id;
      outputJSON['index'] = 'users';
      outputJSON['record'] = userJSONById[id]['record'];
      $.post('resources/api/update.php', outputJSON, function(data) {
        data = $.parseJSON(data);
        //reload table on a failure
        if (!(data['success'])) {
          alert("Error " + data['code'] + ": " + data['text'] + " \n\nReloading user table.");
          userTable();	                              //reload table
          $("#" + id).css("pointer-events", "auto");  //reset click events
          return;
        //update input
        } else {
          $("#" + id).css("background-color","#00FFAA");
          $("#" + id).animate({backgroundColor: "transparent"}, 1000);
          userJSONById[id]['user'] = outputJSON['parameters']['user'];
          userJSONById[id]['password'] = '';
          userJSONById[id]['email'] = outputJSON['parameters']['email'];
          userJSONById[id]['permission'] = outputJSON['parameters']['permission'];
          userJSONById[id]['record'] = outputJSON['record'] + 1;
        }
      });
      break;
    }
  }

  $("#" + id).css("pointer-events", "auto");  //reset click events
}

function removeUser(thisObj) {
  //gather ID and create link to parent
  var id = $(thisObj).parents('tr').attr('id');
  var parent = $(thisObj).parents('td');

  //turn off click events for safety
  $(thisObj).css("pointer-events", "none");

  //fade out trash icon and start the confirmation process
  $(thisObj).fadeOut(200, function() {

    //confirmation process: remove trash icon and create confirm icon
    $(thisObj).remove();
    var confirmIcon = deleteConfirm.clone(true);

    //confirmation process: set a timer
    var timeoutID = setTimeout(function() {

      //at end of timer (10s), auto-cancel delete: remove confirm icon and remake trash icon, give it a click handler, restart pointer events
      confirmIcon.fadeOut(200, function() {
        confirmIcon.remove();
        $(parent).append(thisObj);
        $(thisObj).fadeIn(200);
        $(thisObj).click(function() {removeUser(thisObj)});
        $(thisObj).css("pointer-events", "auto");
      });
    }, 10000); //timeout is in 10 seconds

    //confirmation process: add confirm button and create click handler
    $(parent).append(confirmIcon.click(function() {

      //on confirmation: stop auto-cancel and pointer effects      
      clearTimeout(timeoutID);
      $("#" + id).css("pointer-events", "none");

      //on confirmation: create output object and populate
      var outputJSON = new Object;
      outputJSON['id'] = id;
      outputJSON['index'] = 'users';

      //on confirmation: attempt to remove user from DB
      $.post('resources/api/delete.php', outputJSON, function(data) {
        data = $.parseJSON(data);
        //reload table on a failure
        if (!(data['success'])) {
          alert("Error " + data['code'] + ": " + data['text'] + " \n\nReloading user table.");
          console.log(data);
          userTable();                                //reload table
          $("#" + id).css("pointer-events", "auto");  //reset click events
          return;
        //update input
        } else {

          //remove row and user from userJSON
          $("#" + id).fadeOut(300, function(){
            $("#" + id).remove();
          });
          delete userJSONById[id];
          unSort(id);
        }
      });
    }));

    //now that onclick is set, fade in
    $(confirmIcon).fadeTo(200, 1);
  });
}

function emailUser(thisObj) {
  //gather ID
  var id = $(thisObj).parents('tr').attr('id');

  //stupid datetime tricks
  var now = new Date;
  var tz = now.getTimezoneOffset();
  var nowtz = new Date(now - tz*60*1000);

  //don't start if distressFlag is still set
  if (userJSONById[id]['distressFlag']) {
    alert('Password recovery process is already underway.  If you think something is wrong, have an admin check the minikeeper logs.');
    return;
  }

  //turn off the button to prevent multiclicking
  $("#" + id).css("pointer-events", "none");

  var outputJSON = new Object;
  outputJSON['parameters'] = new Object;
  outputJSON['parameters']['distressFlag'] = true;
  outputJSON['parameters']['dTime'] = nowtz.toISOString().replace(/T/g," ").slice(0, nowtz.toISOString().indexOf("."));
  outputJSON['index'] = 'users';
  outputJSON['id'] = id;
  outputJSON['record'] = userJSONById[id]['record'];

  $.post('resources/api/update.php', outputJSON, function(data) {
    data = $.parseJSON(data);
    //reload table on a failure
    if (!(data['success'])) {
      alert("Error " + data['code'] + ": " + data['text'] + " \n\nReloading user table.");
      userTable();                                //reload table
      $("#" + id).css("pointer-events", "auto");  //reset click events
      return;
    //update input
    } else {
      alert('Password recovery process successfully initiated!')
      userJSONById[id]['record'] = outputJSON['record'] + 1;
      userJSONById[id]['distressFlag'] = outputJSON['parameters']['distressFlag'];
      userJSONById[id]['dTime'] = nowtz.toISOString().replace(/T/g," ").slice(0, nowtz.toISOString().indexOf("."));
    }
  }); 

  $("#" + id).css("pointer-events", "auto");  //reset click events
}

//onclick appears to pass the parent as the first argument, so we're going to have to receive it to keep things straight.
function addShipment(parent, num = "new", label = "", carrier = "") {
  var count = 0;
  var outputJSON = new Object;

  outer_loop:
  while (true) {
    for (entry in shipmentJSONById) {
      //check to see if "new" or "new1" or "new2" or whatever is used
      if (shipmentJSONById[entry]['num'] == num) {
        if (num.includes("new")) {
          count = count + 1;
          num = "new" + String(count);
        //if the user gave us info, though, and we already found the tracking number, abort.
        } else {
          alert("Tracking number " + num + " already exists!")
          return;
        }
        continue outer_loop; //if it's used, re-start the loop
      }
    }
    break;
  }
  
  outputJSON['parameters'] = new Object;
  outputJSON['parameters']['num'] = num;
  outputJSON['parameters']['label'] = label;
  outputJSON['parameters']['carrier'] = carrier;
  outputJSON['parameters']['locale'] = locale;
  outputJSON['index'] = 'tracks';
  $.post('resources/api/put.php', outputJSON, function(data) {
    data = $.parseJSON(data);
    //reload table on a failure
    if (!(data['success'])) {
      alert("Error " + data['code'] + ": " + data['text'] + " \n\nReloading shipment table.");
      console.log(data);
      shipmentTable();                          //reload table
      return;
    //update input
    } else {
      var id = data['data']['_id'];
      var newRow = shipmentRow.clone();
      newRow.attr("id", id);
      shipmentJSONById[id] = new Object;
      shipmentJSONById[id]['num'] = num;
      shipmentJSONById[id]['label'] = label;
      shipmentJSONById[id]['carrier'] = carrier;
      shipmentJSONById[id]['id'] = id;
      shipmentJSONById[id]['location'] = "";
      shipmentJSONById[id]['locale'] = locale
      shipmentJSONById[id]['eta'] = "";
      shipmentJSONById[id]['status'] = '';
      shipmentJSONById[id]['record'] = 1;
      newRow.find('td.num').html(shipmentJSONById[id]['num']);
      newRow.find('td.contents').html(shipmentJSONById[id]['label']);
      newRow.find('td.carrier').html(shipmentJSONById[id]['carrier']);
      newRow.find('span.icon-shipment-save').click(function() {saveShipment($(this))});
      newRow.find('span.icon-shipment-remove').click(function() {removeShipment($(this))});
      $("#maintable").children("tbody").append(newRow);
      $("#" + id)[0].scrollIntoView(false, {block: "end", behavior:"smooth"});
      $("#" + id).css("background-color","#00FFAA");
      $("#" + id).animate({backgroundColor: "transparent"}, 1000);

      //add id to mainSort
      var index = $("#maintable").data("pageNum") * pageSize;
      mainSort.splice(index, 0, id);
    }

  });
}

function multipleShipmentsDialog() {

  var carrierBox = $('<div><input type="text" id="multicarrier" placeholder="Carrier"><br><input type="text" id="multilabel" placeholder="Items"><br><textarea rows="4" id="multinums" placeholder="Space-separated Tracking Numbers"></textarea></div>');

  $(carrierBox).dialog({
    autoOpen: true,
    title: "Add Multiple Shipments",
    //if the user clicked the 'x' button
    beforeClose: function() {
      //quit on empty
      if ($("#multinums").val() == "") {
        return;
      }

      var trackNums = $("#multinums").val().split(" ");
      for (entry in trackNums) {
        //pass garbage for the first argument, otherwise arguments come in in the wrong order
        addShipment(false, trackNums[entry], $("#multilabel").val(), $("#multicarrier").val());
      }
    },
    close: function(event, ui) { 
      $(this).remove();
    },
    closeOnEscape: false,
    modal: true,
    draggable: false,
    resizable: false
  });
}

function saveShipment(thisObj) {
  //gather ID
  var id = $(thisObj).parents('tr').attr('id');

  //turn off the button to prevent multiclicking
  $("#" + id).css("pointer-events", "none");

  //get new category, keyword, label, threshold, assemble in json
  var testingJSON = new Object;
  testingJSON['old'] = new Object;
  testingJSON['new'] = new Object;
  testingJSON['new']['num'] = $("#" + id).children('.num').text().replace(' ', '');
  testingJSON['new']['carrier'] = $("#" + id).children('.carrier').text();
  testingJSON['new']['label'] = $("#" + id).children('.contents').text();
  testingJSON['new']['locale'] = locale;
  testingJSON['id'] = id;

  //it isn't easy to clone an object in javascript.  whee.
  testingJSON['old']['num'] = shipmentJSONById[id]['num'];
  testingJSON['old']['carrier'] = shipmentJSONById[id]['carrier'];
  testingJSON['old']['label'] = shipmentJSONById[id]['label'];
  testingJSON['old']['locale'] = shipmentJSONById[id]['locale'];


  //check for changes, if so, post them to backend
  for (key in testingJSON['new']) {
    if (testingJSON['new'][key] != testingJSON['old'][key]) {
      var outputJSON = new Object;
      outputJSON['parameters'] = new Object;
      outputJSON['parameters'] = testingJSON['new'];
      outputJSON['id'] = id;
      outputJSON['index'] = 'tracks';
      outputJSON['record'] = shipmentJSONById[id]['record'];
      $.post('resources/api/update.php', outputJSON, function(data) {
        data = $.parseJSON(data);
        //reload table on a failure
        if (!(data['success'])) {
          alert("Error " + data['code'] + ": " + data['text'] + " \n\nReloading shipment table.");
          console.log(data);
          shipmentTable();                          //reload table
          $("#" + id).css("pointer-events", "auto");  //reset click events
          return;
        //update input
        } else {
          $("#" + id).css("background-color","#00FFAA");
          $("#" + id).animate({backgroundColor: "transparent"}, 1000);
          shipmentJSONById[id]['num'] = outputJSON['parameters']['num'];
          shipmentJSONById[id]['label'] = outputJSON['parameters']['label'];
          shipmentJSONById[id]['record'] = outputJSON['record'] + 1;
          shiptmentJSONById[id]['locale'] = locale;
        }
      });
      break;
    }
  }

  $("#" + id).css("pointer-events", "auto");  //reset click events
}

function removeShipment(thisObj) {
  //gather ID and create link to parent
  var id = $(thisObj).parents('tr').attr('id');
  var parent = $(thisObj).parents('td');

  //turn off click events for safety
  $(thisObj).css("pointer-events", "none");

  //fade out trash icon and start the confirmation process
  $(thisObj).fadeOut(200, function() {

    //confirmation process: remove trash icon and create confirm icon
    $(thisObj).remove();
    var confirmIcon = deleteConfirm.clone(true);

    //confirmation process: set a timer
    var timeoutID = setTimeout(function() {

      //at end of timer (10s), auto-cancel delete: remove confirm icon and remake trash icon, give it a click handler, restart pointer events
      confirmIcon.fadeOut(200, function() {
        confirmIcon.remove();
        $(parent).append(thisObj);
        $(thisObj).fadeIn(200);
        $(thisObj).click(function() {removeShipment(thisObj)});
        $(thisObj).css("pointer-events", "auto");
      });
    }, 10000); //timeout is in 10 seconds

    //confirmation process: add confirm button and create click handler
    $(parent).append(confirmIcon.click(function() {

      //on confirmation: stop auto-cancel and pointer effects      
      clearTimeout(timeoutID);
      $("#" + id).css("pointer-events", "none");

      //on confirmation: create output object and populate
      var outputJSON = new Object;
      outputJSON['id'] = id;
      outputJSON['index'] = 'tracks';

      //on confirmation: attempt to remove item from DB
      $.post('resources/api/delete.php', outputJSON, function(data) {
        data = $.parseJSON(data);
        //reload table on a failure
        if (!(data['success'])) {
          alert("Error " + data['code'] + ": " + data['text'] + " \n\nReloading item table.");
          console.log(data);
          shipmentTable();                                //reload table
          $("#" + id).css("pointer-events", "auto");  //reset click events
          return;
        //update input
        } else {

          //remove row and shipment from shipmentJSON
          $("#" + id).fadeOut(300, function(){
            $("#" + id).remove();
          });
          delete shipmentJSONById[id];
          unSort(id);
        }
      });
    }));

    //now that onclick is set, fade in
    $(confirmIcon).fadeTo(200, 1);
  });
}

function addSerial(keyID) {
  var countJSON = new Object;
  //one serial for each ajax call, and then a max serial
  var maxSerial;
  var serial1;
  var serial2;
  var serial3;
  var price;
  var pFlag = false;

  //this is embarrassing, because I'm sure there's a smarter way to account for timezones, but I'm on a time crunch
  var now = new Date;
  var tz = now.getTimezoneOffset();
  var nowtz = new Date(now - tz*60*1000);

  //get price of keyword
  if ('priceHistory' in itemJSONById[keyID]) {
    var pLength = itemJSONById[keyID]['priceHistory'].length - 1;
    price = itemJSONById[keyID]['price'];

    //determine if price has changed in the last seven days, if so, set a flag
    var pDate = new Date(Date.parse(itemJSONById[keyID]['priceHistory'][pLength]['date']));
    var pDatetz = new Date(pDate - tz*60*1000);
    if (nowtz - pDatetz < 604800000) {
      pFlag = true;
    }
  } else {
    price = 0.00;
    pFlag = true;
  }

  //get new serial number
  countJSON['index'] = 'serial';
  countJSON['key'] = 'serial';

  //need to check three different databases for serials, so we're going to have to learn how to use
  //javascript promises real quick.  I think there's a curried function somewhere on this server that could
  //benefit from using promises instead...
  var maxFromSerialDB = $.post('resources/api/getmax.php', countJSON, function(data) {
    data = $.parseJSON(data);
    if (!(data['success'])) {
      //handle an error by giving up
      alert("Error " + data['code'] + ": " + data['text'] + " \n\nClosing serial table.");
      console.log(data);
      $("#innerserialtablecontainer").hide();
      $("#innerserialtablecontainer").dialog('close');
      return;
    } else {
      //calculate serial number
      if (data['code'] == 23) {
        serial1 = 10000000;
      } else if (isNaN(data['data']['hits']['total'])) {
        //handle an error by giving up
        alert("Error " + data['code'] + ": " + data['text'] + " \n\nClosing serial table.");
        console.log(data);
        $("#innerserialtablecontainer").hide();
        $("#innerserialtablecontainer").dialog('close');
        return;
      } else if (data['data']['hits']['total'] == 0) {
        serial1 = 10000000;
      } else {
        serial1 = (data['data']['hits']['hits'][0]['_source']['serial']);
      }
    }
  });

  countJSON['index'] = 'dead';

  var maxFromDeadDB = $.post('resources/api/getmax.php', countJSON, function(data2) {
    data2 = $.parseJSON(data2);
    if (!(data2['success'])) {
      //handle an error by giving up
      alert("Error " + data2['code'] + ": " + data2['text'] + " \n\nClosing serial table.");
      console.log(data2);
      $("#innerserialtablecontainer").hide();
      $("#innerserialtablecontainer").dialog('close');
      return;
    } else {
      //calculate serial number
      if (data2['code'] == 23) {
        serial2 = 10000000;
      } else if (isNaN(data2['data']['hits']['total'])) {
        //handle an error by giving up
        alert("Error " + data2['code'] + ": " + data2['text'] + " \n\nClosing serial table.");
        console.log(data2);
        $("#innerserialtablecontainer").hide();
        $("#innerserialtablecontainer").dialog('close');
        return;
      } else if (data2['data']['hits']['total'] == 0) {
        serial2 = 10000000;
      } else {
        serial2 = (data2['data']['hits']['hits'][0]['_source']['serial']);
      }
    }
  });

  countJSON['index'] = 'deleted';

  var maxFromDeletedDB = $.post('resources/api/getmax.php', countJSON, function(data3) {
    data3 = $.parseJSON(data3);
    if (!(data3['success'])) {
      //handle an error by giving up
      alert("Error " + data3['code'] + ": " + data3['text'] + " \n\nClosing serial table.");
      console.log(data3);
      $("#innerserialtablecontainer").hide();
      $("#innerserialtablecontainer").dialog('close');
      return;
    } else {
      //calculate serial number
      if (data3['code'] == 23) {
        serial3 = 10000000;
      } else if (isNaN(data3['data']['hits']['total'])) {
        //handle an error by giving up
        alert("Error " + data3['code'] + ": " + data3['text'] + " \n\nClosing serial table.");
        console.log(data3);
        $("#innerserialtablecontainer").hide();
        $("#innerserialtablecontainer").dialog('close');
        return;
      } else if (data3['data']['hits']['total'] == 0) {
        serial3 = 10000000;
      } else {
        serial3 = (data3['data']['hits']['hits'][0]['_source']['serial']);
      }
    }
  });

  $.when(maxFromSerialDB, maxFromDeadDB, maxFromDeletedDB).then(function() {
    //determine max serial
    maxSerial = Math.max(serial1, serial2, serial3) + 1;

    if (isNaN(maxSerial)) {
      //panic!  Don't push a NaN into the database because oh my god it just propogates and propogates
      alert("Error: detected a non-numerical max serial.\n\nClosing serial table.");
      console.log(maxSerial);
      $("#innerserialtablecontainer").hide();
      $("#innerserialtablecontainer").dialog('close');
      return;
    }

    //build new serial entry
    var outputJSON = new Object;
    outputJSON['parameters'] = new Object;
    outputJSON['parameters']['keyword'] = itemJSONById[keyID]['keyword'] || 'new';
    outputJSON['parameters']['serial'] = maxSerial;
    outputJSON['parameters']['status'] = 'Ready';
    outputJSON['parameters']['location'] = locale;
    outputJSON['parameters']['price'] = price;
    outputJSON['parameters']['pFlag'] = pFlag;
    outputJSON['parameters']['history'] = [];
    outputJSON['parameters']['history'][0] = new Object;
    outputJSON['parameters']['history'][0]['user'] = user;
    outputJSON['parameters']['history'][0]['note'] = 'initial commit';
    outputJSON['parameters']['history'][0]['status'] = 'Ready';
    outputJSON['parameters']['history'][0]['location'] = locale;
    outputJSON['parameters']['history'][0]['prevStatus'] = 'None';
    outputJSON['parameters']['history'][0]['price'] = price;
    outputJSON['parameters']['history'][0]['date'] = nowtz.toISOString().replace(/T/g," ").slice(0, nowtz.toISOString().indexOf("."));
    outputJSON['index'] = 'serial';

    //post new serial entry 
    //yes, data4, because I do not trust javascript's asynch nature.  Logical?  no.  Makes me feel better? yup.
    $.post('resources/api/put.php', outputJSON, function(data4) {
      data4 = $.parseJSON(data4);
      //handle an error by giving up
      if (!(data4['success'])) {
        alert("Error " + data4['code'] + ": " + data4['text'] + " \n\nClosing serial table.");
        console.log(data4);
        $("#innerserialtablecontainer").hide();
        $("#innerserialtablecontainer").dialog('close');
        return;
      //update serialtable and serialJSON
      } else {
        var id = data4['data']['_id'];
        var newRow = innerSerialRow.clone();
        newRow.attr("id", id);
        serialJSONById[id] = new Object;
        serialJSONById[id]['serial'] = maxSerial;
        serialJSONById[id]['price'] = price;
        serialJSONById[id]['keyword'] = itemJSONById[keyID]['keyword'];
        serialJSONById[id]['status'] = "Ready";
        serialJSONById[id]['location'] = locale;
        serialJSONById[id]['pFlag'] = pFlag;
        serialJSONById[id]['record'] = 1;
        serialJSONById[id]['history'] = [];
        serialJSONById[id]['history'][0] = new Object;
        serialJSONById[id]['history'][0]['user'] = user;
        serialJSONById[id]['history'][0]['note'] = 'initial commit';
        serialJSONById[id]['history'][0]['status'] = 'Ready';
        serialJSONById[id]['history'][0]['location'] = locale;
        serialJSONById[id]['history'][0]['prevStatus'] = 'None';
        serialJSONById[id]['history'][0]['price'] = price;
        serialJSONById[id]['history'][0]['date'] = nowtz.toISOString().replace(/T/g," ").slice(0, nowtz.toISOString().indexOf("."));
        newRow.find('td.serial').html(serialJSONById[id]['serial']);
        newRow.find('td.price').html(serialJSONById[id]['price']);
        newRow.find('select.status').val(serialJSONById[id]['status']);
        newRow.find('select.location').val(serialJSONById[id]['location']);
        newRow.find('span.icon-serial-save').click(function() {saveSerial($(this))});
        newRow.find('span.icon-serial-remove').click(function() {removeSerial($(this))});
        newRow.find('span.icon-serial-history').click(function() {serialHistoryTable($(this))});
        if (serialJSONById[id]['pFlag']) {
          newRow.find('td.price').css("background-color", "#F37878");
        }
        $("#innerserialtable").children("tbody").append(newRow);

        //fun animations
        $("#" + id)[0].scrollIntoView(false, {block: "end", behavior:"smooth"});
        $("#" + id).css("background-color","#00FFAA");
        $("#" + id).animate({backgroundColor: "transparent"}, 1000);

        //add id to secondarySort
      	var index = $("#maintable").data("pageNum") * pageSize;
      	secondarySort.splice(index, 0, id);
      }
    });
  });
}

function saveSerial(thisObj) {
  //gather ID
  var id = $(thisObj).parents('tr').attr('id');

  //turn off the button to prevent multiclicking
  $("#" + id).css("pointer-events", "none");

  //get new category, keyword, label, threshold, assemble in json
  var testingJSON = new Object;
  testingJSON['old'] = new Object;
  testingJSON['new'] = new Object;
  if ($("#" + id).find('.keyword').length > 0) {
    testingJSON['new']['keyword'] = $("#" + id).find('.keyword').text();
  }
  testingJSON['new']['keyword']
  testingJSON['new']['serial'] = parseInt($("#" + id).children('.serial').text());
  testingJSON['new']['price'] = parseFloat($("#" + id).children('.price').text());
  testingJSON['new']['status'] = $("#" + id).find('.status').val();
  testingJSON['new']['location'] = $("#" + id).find('.location').val();
  testingJSON['new']['pFlag'] = false; //no easy way of checking pflag, so I assume if you hit 'save,' you've looked at it.
  testingJSON['new']['note'] = $("#" + id).children('.note').text();
  testingJSON['id'] = id;

  //it isn't easy to clone an object in javascript.  whee.
  if ($("#" + id).find('.keyword').length > 0) {
    testingJSON['old']['keyword'] = serialJSONById[id]['keyword'];
  }
  testingJSON['old']['serial'] = serialJSONById[id]['serial'];
  testingJSON['old']['price'] = serialJSONById[id]['price'];
  testingJSON['old']['status'] = serialJSONById[id]['status'];
  testingJSON['old']['location'] = serialJSONById[id]['location'];
  testingJSON['old']['pFlag'] = serialJSONById[id]['pFlag'];
  testingJSON['old']['note'] = ''; //test all notes against blank notes

  //check for changes, if so, post them to backend
  for (key in testingJSON['new']) {
    if (testingJSON['new'][key] != testingJSON['old'][key]) {

      //set the date
      var now = new Date;
      var tz = now.getTimezoneOffset();
      var nowtz = new Date(now - tz*60*1000);

      //create a new history entry
      var newHistory = new Object;
      newHistory['user'] = user;
      newHistory['note'] = $("#" + id).children('.note').text();
      newHistory['status'] = testingJSON['new']['status'];
      newHistory['location'] = testingJSON['new']['location'];
      newHistory['prevStatus'] = testingJSON['old']['status'];
      newHistory['price'] = testingJSON['new']['price'];
      newHistory['date'] = nowtz.toISOString().replace(/T/g," ").slice(0, nowtz.toISOString().indexOf("."));
      delete testingJSON['new']['note']; //delete this note, we'll re-add it into the history section

      //prepare output for API
      var outputJSON = new Object;
      outputJSON['parameters'] = new Object;
      outputJSON['parameters'] = testingJSON['new'];
      outputJSON['parameters']['history'] = serialJSONById[id]['history'];
      outputJSON['parameters']['history'].push(newHistory);
      outputJSON['id'] = id;
      outputJSON['index'] = 'serial';
      outputJSON['record'] = serialJSONById[id]['record'];

      //send to API
      $.post('resources/api/update.php', outputJSON, function(data) {
        data = $.parseJSON(data);
        //reload table on a failure
        if (!(data['success'])) {
          alert("Error " + data['code'] + ": " + data['text'] + " \n\nClosing serial table.");
          console.log(data);
          $("#innerserialtablecontainer").hide();
          $("#innerserialtablecontainer").dialog('close');
          $("#" + id).css("pointer-events", "auto"); //reset click events
          return;
        //update input
        } else {
          //pretty animations and tweaks
          $("#" + id).children(".price").css("background-color","transparent")
          $("#" + id).css("background-color","#00FFAA");
          $("#" + id).animate({backgroundColor: "transparent"}, 1000);
          $("#" + id).children(".note").text("");

          //update local data
          if ('keyword' in outputJSON['parameters']) {
            serialJSONById[id]['keyword'] = outputJSON['parameters']['keyword'];
          }
          serialJSONById[id]['serial'] = outputJSON['parameters']['serial'];
          serialJSONById[id]['price'] = outputJSON['parameters']['price'];
          serialJSONById[id]['status'] = outputJSON['parameters']['status'];
          serialJSONById[id]['location'] = outputJSON['parameters']['location'];
          serialJSONById[id]['pFlag'] = outputJSON['parameters']['pFlag'];
          serialJSONById[id]['history'] = outputJSON['parameters']['history'];
          serialJSONById[id]['record'] = outputJSON['record'] + 1;
        }
      });
      break;
    }
  }

  $("#" + id).css("pointer-events", "auto");  //reset click events
}

function removeSerial(thisObj) {
  //gather ID and create link to parent
  var id = $(thisObj).parents('tr').attr('id');
  var parent = $(thisObj).parents('td');

  //turn off click events for safety
  $(thisObj).css("pointer-events", "none");

  //fade out trash icon and start the confirmation process
  $(thisObj).fadeOut(200, function() {

    //confirmation process: remove trash icon and create confirm icon
    $(thisObj).remove();
    var confirmIcon = deleteConfirm.clone(true);

    //confirmation process: set a timer
    var timeoutID = setTimeout(function() {

      //at end of timer (10s), auto-cancel delete: remove confirm icon and remake trash icon, give it a click handler, restart pointer events
      confirmIcon.fadeOut(200, function() {
        confirmIcon.remove();
        $(parent).append(thisObj);
        $(thisObj).fadeIn(200);
        $(thisObj).click(function() {removeSerial(thisObj)});
        $(thisObj).css("pointer-events", "auto");
      });
    }, 10000); //timeout is in 10 seconds

    //confirmation process: add confirm button and create click handler
    $(parent).append(confirmIcon.click(function() {

      //on confirmation: stop auto-cancel and pointer effects      
      clearTimeout(timeoutID);
      $("#" + id).css("pointer-events", "none");

      //create output object and populate
      var outputJSON = new Object;
      outputJSON['index'] = 'deleted';
      outputJSON['parameters'] = serialJSONById[id];


      //copy serial into 'deleted' database before deletion
      $.post('resources/api/put.php', outputJSON, function(data) {
        data = $.parseJSON(data);
        //reload table on a failure
        if (!(data['success'])) {
          alert("Error " + data['code'] + ": " + data['text'] + " \n\nClosing serial table.");
          console.log(data);
          $("#innerserialtablecontainer").hide();
          $("#innerserialtablecontainer").dialog('close');
          $("#" + id).css("pointer-events", "auto"); //reset click events
          return;
          //update UI
        } else {

          //create output object for deletion and populate
          var outputJSON2 = new Object;
          outputJSON2['id'] = id;
          outputJSON2['index'] = 'serial';
          //on confirmation: attempt to remove user from DB
          $.post('resources/api/delete.php', outputJSON2, function(data2) {
            data2 = $.parseJSON(data2);
            //reload table on a failure
            if (!(data['success'])) {
              alert("Error " + data2['code'] + ": " + data2['text'] + " \n\nClosing serial table.");
              console.log(data2);
              $("#innerserialtablecontainer").hide();
              $("#innerserialtablecontainer").dialog('close');
              $("#" + id).css("pointer-events", "auto"); //reset click events
              return;
              //update UI
            } else {
              //remove row and user from userJSON
              $("#" + id).fadeOut(300, function(){
                $("#" + id).remove();
              });
              delete serialJSONById[id];
              unSort(id);
            }
          });
        }
      });
    }));

    //now that onclick is set, fade in
    $(confirmIcon).fadeTo(200, 1);
  });
}

function addBuild() {
  var builderBox = $('<div class="centeredDialog"><input type="text" id="newserver" placeholder="Server"><select id="model" name="model"><option value="Mercury I">Mercury I</option><option value="1029P-MT">1029P-MT</option></select><input type="text" id="newbuilder" placeholder="Builder"><textarea rows="4" id="newbuildnotes" placeholder="Notes"></textarea></div>');

  $(builderBox).dialog({
    dialogClass: 'no-close',
    autoOpen: true,
    title: "Add a New Build",
    buttons: [
      {
        text: "Submit",
        click:function() {
          //quit on empty
          if ($("#newserver").val() == "" || $("#newbuilder").val() == "") {
            return;
          }

          $("#spinContainer").show();
          var now = new Date(Date.now());
          now = now.getFullYear() + "-" + pad(now.getMonth() + 1,2) + "-" + pad(now.getDate(),2);

          var outputJSON = new Object;
          outputJSON['parameters'] = new Object;
          outputJSON['parameters']['builder'] = $("#newbuilder").val();
          outputJSON['parameters']['server'] = $("#newserver").val();
          outputJSON['parameters']['buildnotes'] = $("#newbuildnotes").val();
          outputJSON['parameters']['location'] = locale;
          outputJSON['parameters']['builddate'] = now;
          outputJSON['parameters']['model'] = $("#model").val();

          outputJSON['index'] = 'builds';
          $.ajax({
            type: "POST",
            url: 'resources/api/put.php', 
            data: outputJSON, 
            success: function(data) {
              data = $.parseJSON(data);
              //reload table on a failure
              if (!(data['success'])) {
                alert("Error " + data['code'] + ": " + data['text'] + " \n\nReloading builds table.");
                console.log(data);
                $("#spinContainer").hide();
                buildsTable();                          //reload table
                return;
              //update input
              } else {
                var id = data['data']['_id'];
                var newRow = buildsRow.clone();
                newRow.attr("id", id);
                buildsJSONById[id] = new Object;
                buildsJSONById[id]['builder'] = outputJSON['parameters']['builder'];
                buildsJSONById[id]['server'] = outputJSON['parameters']['server'];
                buildsJSONById[id]['buildnotes'] = outputJSON['parameters']['buildnotes'];
                buildsJSONById[id]['builddate'] = now;
                buildsJSONById[id]['record'] = 1;
                buildsJSONById[id]['location'] = locale;
                buildsJSONById[id]['model'] = outputJSON['parameters']['model'];
                newRow.find('td.builder').html(buildsJSONById[id]['builder']);
                newRow.find('td.server').html(buildsJSONById[id]['server']);
                if (buildsJSONById[id]['buildnotes'] !== '') {
                  newRow.find('span.icon-notes-build').attr('title', buildsJSONById[id]['buildnotes']);
                  newRow.find('span.icon-notes-build').removeClass('icon-nonotes').addClass('icon-yesnotes');
                }
                newRow.find('td.location').html(buildsJSONById[id]['location']);
                newRow.find('td.builddate').html(now);
                newRow.find('td.model').html(buildsJSONById[id]['model']);
                newRow.find('span.icon-build-qc').click(function() {startQC($(this))});
                newRow.find('span.icon-build-remove').click(function() {removeBuild($(this))});
                $("#maintable").children("tbody").append(newRow);
                $("#" + id)[0].scrollIntoView(false, {block: "end", behavior:"smooth"});
                $("#" + id).css("background-color","#00FFAA");
                $("#" + id).animate({backgroundColor: "transparent"}, 1000);

                //add id to mainSort
                var index = $("#maintable").data("pageNum") * pageSize;
                mainSort.splice(index, 0, id);
                $("#spinContainer").hide();
              }
            },
            error: function(data){
              $("#spinContainer").hide();
              errorHandle($.parseJSON(data.responseText));
            }
          });
          $(this).dialog("close");
        }
      },{
        text: "Cancel",
        click: function() { $(this).dialog("close")}
      }
    ],
    close: function(event, ui) { 
      $(this).remove();
    },
    closeOnEscape: false,
    modal: true,
    draggable: false,
    resizable: false
  });
}

function startQC(thisObj) {
  //gather ID
  var id = $(thisObj).parents('tr').attr('id');
  var parentRow = $(thisObj).parents('tr');

  var qcBox = $('<div class="centeredDialog"><input type="text" id="newchecker" placeholder="Checker"><textarea rows="4" id="newqcnotes" placeholder="Notes"></textarea><select id="newstatus"><option selected="selected" value="pass">Pass</option><option value="fail">Fail</option></select></div>');

  $(qcBox).dialog({
    dialogClass: 'no-close',
    autoOpen: true,
    title: "QC check for " + buildsJSONById[id]['server'],
    buttons: [
      {
        text: "Submit",
        click: function() {
          //quit on empty
          if ($("#newchecker").val() == "") {
            return;
          }

          $("#spinContainer").show();
          var now = new Date(Date.now());
          now = now.getFullYear() + "-" + pad(now.getMonth() + 1,2) + "-" + pad(now.getDate(),2);

          var outputJSON = new Object;
          outputJSON['parameters'] = new Object;
          outputJSON['parameters']['checker'] = $("#newchecker").val();
          outputJSON['parameters']['qcnotes'] = $("#newqcnotes").val();
          outputJSON['parameters']['qcstatus'] = $("#newstatus").val();
          outputJSON['parameters']['qcdate'] = now;
          outputJSON['id'] = id;
          outputJSON['record'] = buildsJSONById[id]['record'];
          outputJSON['index'] = 'builds';

          $.ajax({
            type: "POST",
            url: 'resources/api/update.php', 
            data: outputJSON, 
            success: function(data) {
              data = $.parseJSON(data);
              //reload table on a failure
              if (!(data['success'])) {
                alert("Error " + data['code'] + ": " + data['text'] + " \n\nReloading builds table.");
                console.log(data);
                $("#spinContainer").hide();
                buildsTable();                          //reload table
                return;
              //update input
              } else {
                buildsJSONById[id]['checker'] = outputJSON['parameters']['checker'];
                buildsJSONById[id]['qcnotes'] = outputJSON['parameters']['qcnotes'];
                buildsJSONById[id]['qcstatus'] = outputJSON['parameters']['qcstatus'];
                buildsJSONById[id]['qcdate'] = outputJSON['parameters']['qcdate'];
                buildsJSONById[id]['record'] = outputJSON['record'] + 1;
                $(parentRow).find('td.checker').html(buildsJSONById[id]['checker']);
                if (buildsJSONById[id]['qcnotes'] !== '') {
                  $(parentRow).find('span.icon-notes-qc').attr('title', buildsJSONById[id]['qcnotes']);
                  $(parentRow).find('span.icon-notes-qc').removeClass('icon-nonotes').addClass('icon-yesnotes');
                } else {
                  //since we're editing an existing thing, we might need to REMOVE notes
                  $(parentRow).find('span.icon-notes-qc').removeClass('icon-yesnotes').addClass('icon-nonotes');
                }
                $(parentRow).find('td.qcdate').html(buildsJSONById[id]['qcdate']);
                $(parentRow).find('td.qcstatus').html(buildsJSONById[id]['qcstatus']);
                $("#" + id).css("background-color","#00FFAA");
                $("#" + id).animate({backgroundColor: "transparent"}, 1000);

                //add id to mainSort
                var index = $("#maintable").data("pageNum") * pageSize;
                mainSort.splice(index, 0, id);
                $("#spinContainer").hide();
              }
            },
            error: function(data){
              $("#spinContainer").hide();
              errorHandle($.parseJSON(data.responseText));
            }
          });
          $(this).dialog("close");
        }
      },{
        text: "Cancel",
        click: function() { $(this).dialog("close")}
      }
    ],
    close: function(event, ui) { 
      $(this).remove();
    },
    closeOnEscape: false,
    modal: true,
    draggable: false,
    resizable: false
  });
}

function removeBuild(thisObj) {
  //gather ID and create link to parent
  var id = $(thisObj).parents('tr').attr('id');
  var parent = $(thisObj).parents('td');

  //turn off click events for safety
  $(thisObj).css("pointer-events", "none");

  //fade out trash icon and start the confirmation process
  $(thisObj).fadeOut(200, function() {

    //confirmation process: remove trash icon and create confirm icon
    $(thisObj).remove();
    var confirmIcon = deleteConfirm.clone(true);

    //confirmation process: set a timer
    var timeoutID = setTimeout(function() {

      //at end of timer (10s), auto-cancel delete: remove confirm icon and remake trash icon, give it a click handler, restart pointer events
      confirmIcon.fadeOut(200, function() {
        confirmIcon.remove();
        $(parent).append(thisObj);
        $(thisObj).fadeIn(200);
        $(thisObj).click(function() {removeBuild(thisObj)});
        $(thisObj).css("pointer-events", "auto");
      });
    }, 10000); //timeout is in 10 seconds

    //confirmation process: add confirm button and create click handler
    $(parent).append(confirmIcon.click(function() {

      //on confirmation: stop auto-cancel and pointer effects      
      clearTimeout(timeoutID);
      $("#" + id).css("pointer-events", "none");

      //create output object and populate
      var outputJSON = new Object;
      outputJSON['index'] = 'deleted';
      outputJSON['parameters'] = buildsJSONById[id];


      //copy build into 'deleted' database before deletion
      $.ajax({
        url: 'resources/api/put.php', 
        data: outputJSON, 
        type: "POST",
        success: function(data) {
          data = $.parseJSON(data);
          //reload table on a failure
          if (!(data['success'])) {
            alert("Error " + data['code'] + ": " + data['text'] + " \n\nReloading builds table.");
            buildsTable();                          //reload table
            return;
            //update UI
          } else {

            //create output object for deletion and populate
            var outputJSON2 = new Object;
            outputJSON2['id'] = id;
            outputJSON2['index'] = 'builds';
            //on confirmation: attempt to remove user from DB
            $.post('resources/api/delete.php', outputJSON2, function(data2) {
              data2 = $.parseJSON(data2);
              //reload table on a failure
              if (!(data['success'])) {
                alert("Error " + data['code'] + ": " + data['text'] + " \n\nReloading builds table.");
                buildsTable();                          //reload table
                return;
                //update UI
              } else {
                //remove row and user from userJSON
                $("#" + id).fadeOut(300, function(){
                  $("#" + id).remove();
                });
                delete buildsJSONById[id];
                unSort(id);
              }
            });
          }
        },
        error: function(data) {
          errorHandle($.parseJSON(data.responseText));
        }
      });
    }));

    //now that onclick is set, fade in
    $(confirmIcon).fadeTo(200, 1);
  });
}

//checks the amount in ready of a given object (keyword ID).  Expects a callback, where it will pass back the original ID and the amount found.
function checkAmount(keyID, callback) {
  var outputJSON = new Object
  outputJSON['index'] = 'serial';
  outputJSON['parameters'] = new Object;
  outputJSON['parameters']['match'] = new Object;
  outputJSON['parameters']['match']['keyword'] = itemJSONById[keyID]['keyword'];
  outputJSON['parameters']['match']['status'] = 'Ready';
  outputJSON['parameters']['match']['location'] = locale;

  $.ajax({
    type: "POST",
    data: outputJSON,
    url: "resources/api/count.php",
    success:function(data) {
      data = $.parseJSON(data);
      if (!(data['success'])) {
        alert("Error " + data['code'] + ": " + data['text'] + " \n\nAmount for " + itemJSONById[keyID]['keyword'] + " is probably wrong.");
        console.log(data);
        errorHandle(data)
        return;
      } else {
      	if (!(itemJSONById[keyID].hasOwnProperty('amount'))) {
      		itemJSONById[keyID]['amount'] = new Object;
      	}
      	itemJSONById[keyID]['amount'][locale] = data['data']['count'];
      	callback(keyID, data['data']['count']);
      }
    },
    error:function(data) {
      var outputData = $.parseJSON(data.responseText);
      errorHandle(outputData);
    }
  });
}

//returns an associative array based on jsonById, sorted on index.  index can be dot-notated to traverse down an object (ie, array['key']['property']['name'] could be sorted by array.key.property.name)
function aaGen(jsonById, index) {
  index = index.split('.');
  var traverses = index.length;
  var result = Object.keys(jsonById);

  result.sort(function (a, b) {
    a = jsonById[a];
    b = jsonById[b];
    var i = 0;

    while( i < traverses ) {

    	//if the index doesn't exist, don't error out, just set it as undefined and we'll handle it in the return conditions.
    	if (!(a == undefined)) {
    		if (!(index[i] in a)) {
	    		a = undefined;
	    	} else {
	    		a = a[index[i]];
    		}
    	}

    	if (!(b == undefined)) {
    		if (!(index[i] in b)) {
    			b = undefined;
    		} else {
    			b = b[index[i]];
    		}
    	}

    	i++;

    }

    //return conditions
    if (a == undefined && b == undefined) {
    	return 0
    } else if (a == undefined) {
    	return -1
    } else if (b == undefined) {
    	return 1
    } else if (!isNaN(parseFloat(a)) && isFinite(a)) {
    	return a - b;
    } else {
    	return a.toString().localeCompare(b.toString());
    }
  });

  return result;
}

//removes an entry from all associative arrays
function unSort(id) {
	if (mainSort.indexOf(id) > -1) {mainSort.splice(mainSort.indexOf[id],	1)}
	if (secondarySort.indexOf(id) > -1) {secondarySort.splice(secondarySort.indexOf[id],	1)}
	if (tertiarySort.indexOf(id) > -1) {tertiarySort.splice(tertiarySort.indexOf[id],	1)}
}

//function to help javascript's inane version of dates
function pad(num, size) {
    var s = num+"";
    while (s.length < size) s = "0" + s;
    return s;
}

function getCellValue(row, index){ 
  if ($(row).children('td').eq(index).children('select').length > 0) {
    return $(row).children('td').eq(index).children('select').val();
  } else {
    return $(row).children('td').eq(index).html();
  }
}

//function that takes a table and a desired page number and returns a sanitized page number (ie, if page number is higher than max, returns max, if page number is less than 1, returns 1)
function pageSanitizer(table, pageNum) {
	var max = getMaxPage(table);
	if (pageNum > max) {
		return max;
	} else if (pageNum < 1) {
		return 1;
	} else {
		return pageNum;
	}
}

function goToPage(caller, tableID, page, force=false) {

	var pageNum = pageSanitizer(tableID, page);

	//if we're called by something outside of all tables, affect maintable.  Otherwise, affect the closest parent container's table
	if ($(caller).parents(".container").length > 0) {
		var currentTable = $(caller).parents(".container").find(".table").data("currentTable");
		var currentPage = $(caller).parents(".container").find(".table").data("pageNum");	
	} else {
		currentTable = $("#main").find(".table").data("currentTable");
		currentPage = $("#main").find(".table").data("pageNum");
	}

	//if we're already there, cancel
	if (currentTable == tableID && currentPage == pageNum && !force) {
		return;
	}

	//set pagenum on UI and in stored var location
	//again, if we've been called by something outside of any table container, affect the main table; otherwise affect the table inside our container
	if ($(caller).parents(".container").length > 0) {
		$(caller).parents(".container").find(".table").data("pageNum", pageNum);
		$(caller).parents(".container").find(".currentpage").val(pageNum);
	} else {
		$("#main").find(".table").data("pageNum", pageNum);
		$("#main").find(".currentpage").val(pageNum);
	}

	//get current table and rebuild it
	if (tableID == "items") {
		buildItemTable();
	} else if (tableID == "serials") {
		buildSerialTable();
	} else if (tableID == "tickets") {
		buildTicketTable();
	} else if (tableID == "shipments") {
		buildShipmentTable();
	} else if (tableID == "users") {
		buildUserTable();
  } else if (tableID == "builds") {
    buildBuildsTable();
	} else if (tableID == "innerserials") {
		//this one is uglier, we have to determine keyID, so we pull it from a previously-saved location.
		buildInnerSerialTable($("#innerserialtable").data("keyID"));
	} else if (tableID == "serialhistory") {
		buildSerialHistoryTable($("#historytable").data("serialID"));
	} else if (tableID == "itemhistory") {
		buildItemHistoryTable($("#historytable").data("keyID"));
	}
}

//function to help figure out if stuff is offscreen
jQuery.expr.filters.offscreen = function(el) {
  var rect = el.getBoundingClientRect();
  return (
   (rect.x + rect.width) < 0 
     || (rect.y + rect.height) < 0
     || (rect.x > window.innerWidth || rect.y > window.innerHeight)
  );
};

//Click handlers and things to be run on ready state
$(document).ready(function(){

	//set date for cookie purposes
	var expiry = new Date();
	expiry.setFullYear(expiry.getFullYear() +1);

	pageSize = parseInt(getCookie("pageSize"));

	if (pageSize == null) {
		pageSize = 50;
	} else if (!($.isNumeric(pageSize))) {
		pageSize = 50;
	}

	document.cookie = "pageSize=" + pageSize + "; expires=" + expiry.toGMTString() + ";";

  //clone headers, bind handlers, delete headers for general table and headers
  deleteConfirm = $(".table-remove-true").clone(true);
  itemHeader = $("#itemheader").clone(true);
  serialHeader = $("#serialheader").clone(true);
  userHeader = $("#userheader").clone(true);
  ticketHeader = $("#ticketheader").clone(true);
  shipmentHeader = $("#shipmentheader").clone(true);
  buildsHeader = $("#buildsheader").clone(true);
  innerSerialHeader = $("#innerserialheader").clone(true);
  serialHistoryHeader = $("#serialhistoryheader").clone(true);
  itemHistoryHeader = $("#itemhistoryheader").clone(true);
  itemRow = $(".itemrow").clone(true);
  serialRow = $(".serialrow").clone(true);
  userRow = $(".userrow").clone(true);
  ticketRow = $(".ticketrow").clone(true);
  shipmentRow = $(".shipmentrow").clone(true);
  buildsRow = $(".buildsrow").clone(true);
  innerSerialRow = $(".innerserialrow").clone(true);
  serialHistoryRow = $(".serialhistoryrow").clone(true);
  itemHistoryRow = $(".itemhistoryrow").clone(true);
  $("#items").click(itemTable);
  $("#serials").click(serialTable);
  $("#users").click(userTable);
  $("#tickets").click(ticketTable);
  $("#shipments").click(shipmentTable);
  $("#builds").click(buildsTable);
  $(".hide").hide();
  $(".remove").remove();


  //set values and handlers for the location box
  $(".globalLocation").val(locale);

  $(".globalLocation").change(function() {
    locale = $(".globalLocation").val();
    if ($("#itemheader").length > 0) {
      itemTable();
    } else if ($("#serialheader").length > 0) {
      serialTable();
    } else if ($("#userheader").length > 0) {
      userTable();
    } else if ($("#ticketheader").length > 0) {
      ticketTable();
    } else if ($("#shipmentheader").length > 0) {
      shipmentTable();
    } else if ($("#buildsheader").length > 0) {
      buildsTable();
    }
  });

  //set values and handlers for the pagesize box
  $("#pagesize").val(pageSize);
  $('#pagesize').on('keyup', function (e) {
		if(e.keyCode == 13){

			//sanity check
			if (!(Math.floor(parseInt($(this).val()) == parseInt($(this).val()) && $.isNumeric(parseInt($(this).val()))))) {
				$(this).val(pageSize);
				return;
			}

			if (parseInt($(this).val()) < 1) {
				$(this).val(1)
			}

			//set pagesize
			pageSize = parseInt($(this).val());
			document.cookie = "pageSize=" + pageSize + "; expires=" + expiry.toGMTString() + ";";

			//get current table and rebuild it
			var currentTable = $("#maintable").data("currentTable") || "items";
			goToPage(this, currentTable, 1, true)
		}
	});

	//set values and handlers for the currentpage boxes
  $(".currentpage").val(1);
  $('.currentpage').on('keyup', function (e) {
		if(e.keyCode == 13){
			var oldPageNum = $(this).parents(".container").find(".table").data("pageNum");

			//if we got a non-numerical value, abort.
			if (!(Math.floor(parseInt($(this).val()) == parseInt($(this).val()) && $.isNumeric(parseInt($(this).val()))))) {
				$(this).parents(".container").find(".currentpage").val(oldPageNum)
				return;
			}

			//call go to page
			goToPage(this, $(this).parents(".container").find(".table").data("currentTable"), parseInt($(this).val()));
		}
	});

	//set handlers for the pagination arrows
	$(".icon-first").click(function() {goToPage(this, $(this).parents(".container").children(".table").data("currentTable"), 1)});
  $(".icon-prev").click(function() {goToPage(this, $(this).parents(".container").children(".table").data("currentTable"), $(this).parents(".container").children(".table").data("pageNum") - 1)});
  $(".icon-next").click(function() {goToPage(this, $(this).parents(".container").children(".table").data("currentTable"), $(this).parents(".container").children(".table").data("pageNum") + 1)});
  $(".icon-last").click(function() {goToPage(this, $(this).parents(".container").children(".table").data("currentTable"), getMaxPage($(this).parents(".container").children(".table").data("currentTable")))});

  itemTable();

});

