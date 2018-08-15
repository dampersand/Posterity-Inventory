//Global variables
var gserverNumsLocation = 'redacted - location of a json that included server numbers';
var gthreshTemplate;
var gtrackTemplate;
var gticketTemplate;
var vwInPx;

//TO DO: refactor 'build table' codes w/ JS promises instead

//FUNCTIONS

function errorHandle(data) { //living function for handling errors

  //code 15 is invalid token, redirect to login
  if (data['code'] == 15) {
    alert('Error: Authentication has expired.  Please log in again.');
    window.location ='https://inventory.domain.net/hud/login.html';
  } else if (data['code'] == 16) {
    alert('Error: No authentication provided.  Please log in again.');
    window.location ='https://inventory.domain.net/hud/login.html';
  }
}

function textWidth(inputText) {
	var calc = '<span id="textMeasurement" style="display:none">' + inputText + '</span>';
	$('body').append(calc);
	var width = $("#textMeasurement").width();
	$("#textMeasurement").remove();
	return width;
}

function isOdd(n) {
   return Math.abs(n % 2) == 1;
}
    
function startDate() {
  var today = new Date();
  var d = today.getDay();
  var dayStr = convertDay(d);
  var dom = today.getDate();
  var mon = today.getMonth();
  var monStr = convertMon(mon)
  var y = today.getFullYear();
  $('#dow').html(dayStr);
  $('#dom').html(monStr + " " + dom);
  $('#year').html(y);
  setTimeout(startDate, 60000);
}

function convertMon(mon) {
  switch(mon) {
    case 0:
      return 'Jan';
    case 1:
      return 'Feb';
    case 2:
      return 'Mar';
    case 3:
      return 'Apr';
    case 4:
      return 'May';
    case 5:
      return 'Jun';
    case 6:
      return 'Jul';
    case 7:
      return 'Aug';
    case 8:
      return 'Sep';
    case 9:
      return 'Oct';
    case 10:
      return 'Nov';
    case 11:
      return 'Dec';
  }
}

function convertDay(day) {
  switch(day) {
    case 1:
      return 'Monday';
    case 2:
      return 'Tuesday';
    case 3:
      return 'Wednesday';
    case 4:
      return 'Thursday';
    case 5:
      return 'Friday';
    case 6:
      return 'Saturday';
    case 0:
      return 'Sunday';
  }
} 
    
function startTime() {
  var today = new Date();
  var h = today.getHours();
  var m = today.getMinutes();
  var s = today.getSeconds();
  m = checkTime(m);
  s = checkTime(s);
  $('#clockText').html(h + ":" + m + ":" + s);
  var t = setTimeout(startTime, 500);
}

function checkTime(i) {
  if (i < 10) {i = "0" + i};  // add zero in front of numbers < 10
  return i;
}

//TO DO: refactor this code omg so bad pls fix why do I have two js.get functions

function pollThresholds() {
  loadJSON(buildThresholds, 'items');
  setTimeout(pollThresholds, 30000);
}

function pollTracks() {
  loadJSON(buildTracks, 'tracks');
  setTimeout(pollTracks, 30000);
}

function pollOnCall() {
  loadPHP(checkOnCall, 'resources/api/oncall.php');
  setTimeout(pollOnCall, 30000);
}

function pollServerNums() {
  mirrorJSON(buildServerNums, gserverNumsLocation);
  setTimeout(pollServerNums, 30000);
}

function pollTickets() {
  loadJSON(buildTickets, 'tickets');
  setTimeout(pollTickets, 30000);
}


function loadJSON(callback, index) {
  var outputJSON = new Object;
  outputJSON['index'] = index;
  $.ajax({
    type: "POST",
    data: outputJSON,
    url: "resources/api/getall.php",
    success:function(data) {
      callback(data);
    },
    error:function(data) {
      errorHandle($.parseJSON(data.responseText));
    }
  });
}

function mirrorJSON(callback, location) {
  $.get(location, callback)
}


function loadPHP(callback, location) {
  var xobj = new XMLHttpRequest();
  xobj.open('GET', location, true);
  xobj.onreadystatechange = function() {
    if (xobj.readyState == 4 && xobj.status == "200") {
      if (callback != null) {
        callback(xobj.responseText);
      }
    }
  };
  xobj.send(null);
}

function buildTracks(response) {
  var tracksJSON = $.parseJSON(response)['data'];

  //clean old entries from tracktable
  $("#trackingTable").find(".row").not(".header").not(".marquee").remove();

  //add this nightmare to protect marquees from resetting scrolls
  var existingMarquee = [];

  $.each($("#trackingTable").find(".marquee"),function(index, object) {
  	existingMarquee[index] = new Object;
  	existingMarquee[index]['save'] = false;
  	existingMarquee[index]['num'] = $(object).find(".track").html();
  	existingMarquee[index]['label'] = $(object).find("b").first().html();
  	existingMarquee[index]['link'] = object;
  });

  for (count = 0; count < tracksJSON.length; count++) {
    if(tracksJSON[count]['_source'].hasOwnProperty('carrier')) {	//filter for any mistakes

      //skip stuff that isn't part of our locale
      if (tracksJSON[count]['_source']['locale'] != locale) {
        continue;
      }

    	//are we looking at an entry that hasn't changed?
    	var matchedMarquee = $.grep(existingMarquee, function(element, index) {
    		if ((existingMarquee[index]['num'] == tracksJSON[count]['_source']['num']) && (existingMarquee[index]['label'] == tracksJSON[count]['_source']['label'])) {
    			existingMarquee[index]['save'] = true;
    		}
    		return ((existingMarquee[index]['num'] == tracksJSON[count]['_source']['num']) && (existingMarquee[index]['label'] == tracksJSON[count]['_source']['label']))
    	});
    	
    	//if we found a perfect match, skip doing anything
    	if (matchedMarquee.length) {
    		continue;
    	}

      //create new row for all tracks in tracksJSON and append to trackingTable
      var newRow = gtrackTemplate.clone();
      newRow.find(".track").html(tracksJSON[count]['_source']['num']);
      newRow.find(".location").html("<b>" + tracksJSON[count]['_source']['location'] + "</b>");
      newRow.find(".eta").html(tracksJSON[count]['_source']['eta']);
      newRow.find(".status").html(tracksJSON[count]['_source']['status']);
      newRow.find(".items").html("<b>" + tracksJSON[count]['_source']['label'] + "</b>");
      newRow.appendTo("#trackingTable");	

      //if itemtext is too long, marquee it
      if (textWidth(tracksJSON[count]['_source']['label']) > (19 * vwInPx)) {
      	newRow.addClass("marquee");
      	newRow.find(".items").marquee({
      		duration:10000,
      		gap:20,
      		duplicated:true,
      		startVisible:true
      	});
      }	
    }  
  }

  //delete any remaining marquees
  for (count = 0; count < existingMarquee.length; count++) {
  	if (!(existingMarquee[count]['save'])) {
  		existingMarquee[count]['link'].remove();
  	}
  }
}
      
function buildThresholds(response) {
  var threshJSON = $.parseJSON(response)['data'];

  //clean old entries from threshold table
  while ($("#thresholdTable").find(".row").length > 1) {
    $("#thresholdTable").find(".row").last().remove();
  }

  //check all entries in threshJSON
  for (count = 0; count < threshJSON.length; count++) {
    
    //if there's no thresholdtrouble, skip
    if (!(threshJSON[count]['_source'].hasOwnProperty('thresholdTrouble'))) {
      continue;
    }

    if (!(threshJSON[count]['_source']['thresholdTrouble'].hasOwnProperty(locale))) {
      continue;
    }

    if (threshJSON[count]['_source'].hasOwnProperty('threshold')) {    //filter for any mistakes
      if (threshJSON[count]['_source']['threshold'].hasOwnProperty(locale)) {
        if (!threshJSON[count]['_source']['thresholdTrouble'][locale]) { continue;} //skip anything without trouble

        //append a new row and populate item, current, and threshold
        var newRow = gthreshTemplate.clone();
        newRow.find(".item").html(threshJSON[count]['_source']['keyword']);
        newRow.find(".current").html(threshJSON[count]['_source']['amount'][locale]);
        newRow.find(".threshold").html(threshJSON[count]['_source']['threshold'][locale]);
        
        //if item has already been ordered, change its color
        if (threshJSON[count]['_source'].hasOwnProperty('ordered')) {
          if (threshJSON[count]['_source']['ordered'].hasOwnProperty(locale)) {
            if (threshJSON[count]['_source']['ordered'][locale]) {
              if (isOdd($("#thresholdTable").find(".row").length)) { //note length, not length+1, because length starts at 1, not 0.
                newRow.css({'background-color':'#23992B'});
              } else {
                newRow.css({'background-color':'#17631C'});
              }
            }
          }
        }

        newRow.appendTo("#thresholdTable");
      }
    }  
  }
}

function checkOnCall(response) {
  var oncallJSON = $.parseJSON(response);
  if (oncallJSON['netOpsCurrent'] == 'TimCH') {
    $("#oncallnetopsleft").html('Now:');
    $("#oncallnetopsright").html('&nbspTimCh');
  } else if (oncallJSON['netOpsNext'] == 'TimCH') {
    $("#oncallnetopsleft").html(oncallJSON['netOpsDate'] + ":");
    $("#oncallnetopsright").html('&nbspTimCh');
  }
  $("#oncallnowright").html('&nbsp' + oncallJSON['current']);
  $("#oncallnextleft").html(oncallJSON['date'] + ":"); 
  $('#oncallnextright').html('&nbsp' + oncallJSON['next']);
}

function buildServerNums(response) {
  var servers = response['data'][locale.toLowerCase()];
  var totalUsed = 0;
  var totalServers = 0;
  var minimumServers = 2;
  var maximumServers = 10;
  for (var prop in servers) {
    //add any missing entries
    if (!servers[prop].hasOwnProperty('Ready')) {
      servers[prop]['Ready'] = 0;
    }
    if (!servers[prop].hasOwnProperty('Phys')) {
      servers[prop]['Phys'] = 0;
    }
    if (!servers[prop].hasOwnProperty('OS')) {
      servers[prop]['OS'] = 0;
    }
    if (!servers[prop].hasOwnProperty('Config')) {
      servers[prop]['Config'] = 0;
    }
    if (!servers[prop].hasOwnProperty('Reset')) {
      servers[prop]['Reset'] = 0;
    }
    if (!servers[prop].hasOwnProperty('Hold')) {
      servers[prop]['Hold'] = 0;
    }
    if (!servers[prop].hasOwnProperty('Used')) {
      servers[prop]['Used'] = 0;
    }
    if (!servers[prop].hasOwnProperty('Suspended')) {
      servers[prop]['Suspended'] = 0;
    }
    if (!servers[prop].hasOwnProperty('RMA')) {
      servers[prop]['RMA'] = 0;
    }
    if (!servers[prop].hasOwnProperty('Temp')) {
      servers[prop]['Temp'] = 0;
    }
    if (!servers[prop].hasOwnProperty('Prog')) {
      servers[prop]['Prog'] = 0;
    }
    if (!servers[prop].hasOwnProperty('QC')) {
      servers[prop]['QC'] = 0;
    }
    if (!servers[prop].hasOwnProperty('Ordered')) {
      servers[prop]['Ordered'] = 0;
    }
    if (!servers[prop].hasOwnProperty('Build')) {
      servers[prop]['Build'] = 0;
    }

    servers[prop]['Action'] = servers[prop]['QC'] + servers[prop]['Phys'] + servers[prop]['OS'] + servers[prop]['Config'] + servers[prop]['Reset'] + servers[prop]['RMA'] + servers[prop]['Prog'] + servers[prop]['Ordered'] + servers[prop]['Build'];
    totalServers = totalServers + servers[prop]['QC'] + servers[prop]['Phys'] + servers[prop]['OS'] + servers[prop]['Config'] + servers[prop]['Ready'] + servers[prop]['Reset'] + servers[prop]['Hold'] + servers[prop]['Used'] + servers[prop]['Suspended'] + servers[prop]['RMA'] + servers[prop]['Temp'] + servers[prop]['Prog'] + servers[prop]['Ordered'] + servers[prop]['Build'];
    totalUsed = totalUsed + servers[prop]['Used'];
  }

  //build out cells in table
  $("#cc2000Ready").html(typeof servers['CC2000'] === "undefined" ? 0 : servers['CC2000']['Ready']);
  $("#cc1000Ready").html(typeof servers['CC1000'] === "undefined" ? 0 : servers['CC1000']['Ready']);
  $("#cc500Ready").html(typeof servers['CC500'] === "undefined" ? 0 : servers['CC500']['Ready']);
  $("#eliteReady").html(typeof servers['Elite SSD'] === "undefined" ? 0 : servers['Elite SSD']['Ready']);
  $("#advReady").html(typeof servers['Advanced SSD'] === "undefined" ? 0 : servers['Advanced SSD']['Ready']);
  $("#essReady").html(typeof servers['Essential'] === "undefined" ? 0 : servers['Essential']['Ready']);

  $("#cc2000Action").html(typeof servers['CC2000'] === "undefined" ? 0 : servers['CC2000']['Action']);
  $("#cc1000Action").html(typeof servers['CC1000'] === "undefined" ? 0 : servers['CC1000']['Action']);
  $("#cc500Action").html(typeof servers['CC500'] === "undefined" ? 0 : servers['CC500']['Action']);
  $("#eliteAction").html((typeof servers['Elite SSD'] === "undefined" ? 0 : parseInt(servers['Elite SSD']['Action'])) + (typeof servers['Elite SATA'] === "undefined" ? 0 : parseInt(servers['Elite SATA']['Action'])));
  $("#advAction").html((typeof servers['Advanced SSD'] === "undefined" ? 0 : parseInt(servers['Advanced SSD']['Action'])) + (typeof servers['Advanced SATA'] === "undefined" ? 0 : parseInt(servers['Advanced SATA']['Action'])));
  $("#essAction").html(typeof servers['Essential'] === "undefined" ? 0 : servers['Essential']['Action']);

  //change color of table cells in trouble
  $("#serverTable").find(".row").not(".header").each(function(index){
    if ($($(this).find(".cell")[0]).text().indexOf('Elite') > 0 || $($(this).find(".cell")[0]).text().indexOf('Advanced') > 0) {
      minimumServers = 5;
    } else {
      minimumServers = 2;
    }

    if (parseInt($($(this).find(".cell")[1]).html()) < minimumServers) { //look at that double jquery action
      if (isOdd(index)) {
        $($(this).find(".cell")[1]).css({'background-color':'#851E1E'});
      } else {
        $($(this).find(".cell")[1]).css({'background-color':'#CF3030'});
      }
    } else if (parseInt($($(this).find(".cell")[1]).html()) >= maximumServers) {
    	 if (isOdd(index)) {
        $($(this).find(".cell")[1]).css({'background-color':'#23992B'});
      } else {
        $($(this).find(".cell")[1]).css({'background-color':'#17631C'});
      }
    } else {
      $($(this).find(".cell")[1]).css({'background-color':''});
    }
  });

  var nonRevenuePercent =(1-(totalUsed / totalServers)) * 100;
  nonRevenuePercent = nonRevenuePercent.toFixed(2);
  $("#nonRevenueText").html(nonRevenuePercent + "%");
  if (nonRevenuePercent > 4.51) {
    $("#nonRevenueText").css({'color':'Red'});
  } else if (nonRevenuePercent > 4) {
    $("#nonRevenueText").css({'color':'Yellow'});
  } else if (nonRevenuePercent > 2) {
    $("#nonRevenueText").css({'color':''});
  } else if (nonRevenuePercent > 1.5) {
    $("#nonRevenueText").css({'color':'Yellow'});
  } else {
    $("#nonRevenueText").css({'color':'Red'});
  }
}

function buildTickets(response) {
  var ticketsJSON = $.parseJSON(response)['data'];

  //clean old entries from ticket table
  while ($("#ticketTable").find(".row").length > 1) {
    $("#ticketTable").find(".row").last().remove();
  }

  for (count = 0; count < ticketsJSON.length; count++) {
    if(ticketsJSON[count]['_source'].hasOwnProperty('server') && ticketsJSON[count]['_source'].hasOwnProperty('location')) {			//filter for any mistakes
      if(ticketsJSON[count]['_source']['location'] == locale) {
        var newRow = gticketTemplate.clone();
        newRow.find(".server").html(ticketsJSON[count]['_source']['server']);
        newRow.find(".start").html(ticketsJSON[count]['_source']['start']);
        newRow.find(".end").html(ticketsJSON[count]['_source']['end']);
        newRow.appendTo("#ticketTable");	
      }
    }
  }

  //change color of table cells in trouble

  //for each row
  $("#ticketTable").find(".row").each(function(index){
    //determine pertinent timestamps
    var now = new Date;
    var tz = now.getTimezoneOffset()*60000; //time zone offset in milliseconds.  Not the way I'd like to do this, but date.parse doesn't work with firefox-esr
    //var start = Date.parse($(this).find(".start").html()); //this doesn't work in firefox ESR
    var startArray = String($(this).find(".start").html()).split(/-| |:/);
    var start = Date.UTC(startArray[0], startArray[1] - 1, startArray[2], startArray[3], startArray[4], startArray[5]) + tz;
    //var end = Date.parse($(this).find(".end").html());
    var endArray = String($(this).find(".end").html()).split(/-| |:/);
    var end = Date.UTC(endArray[0], endArray[1] - 1, endArray[2], endArray[3], endArray[4], endArray[5]) + tz;
    var error = Date.UTC(1234,01,01,12,00,00) + tz;
    var lead = start - 14400000;

    //if the row is in error
    if (start == error) {
      if (isOdd(index)) {
        $(this).css({'background-color':'#A647DC'});
      } else {
        $(this).css({'background-color':'#7D35A6'});
      }
    } else if (now > end) {
      if (isOdd(index)) {
        $(this).css({'background-color':'#CF3030'});
      } else {
        $(this).css({'background-color':'#851E1E'});
      }
    } else if (now > start) {
      if (isOdd(index)) {
        $(this).css({'background-color':'#23992B'});
      } else {
        $(this).css({'background-color':'#17631C'});
      }
    } else if (now > lead) {
      if (isOdd(index)) {
        $(this).css({'background-color':'#999423'});
      } else {
        $(this).css({'background-color':'#636017'});
      }
    } else {
      $(this).css({'background-color':''});
    }

  });      
}

$(document).ready(function(){
  //set global vars
  gthreshTemplate = $(".threshTemplate").clone(true);
  gtrackTemplate = $(".trackTemplate").clone(true);
  gticketTemplate = $(".ticketTemplate").clone(true);
  $(".threshTemplate").remove();
  $(".trackTemplate").remove();
  $(".ticketTemplate").remove();
  vwInPx = $(window).width()/100;
  $(window).resize(function() {
  	vwInPx = $(window).width()/100;
  });

  startTime();
  startDate();      
  pollThresholds();
  pollTracks();
  pollOnCall();
  pollServerNums();
  pollTickets();
});


