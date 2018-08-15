//Global Variables Section
var credentials;
var logButton;
var inventoryButton;
var goButton;
var submitButton;
var forgotButton;
var restartButton;
var userName;
var password;
var itemHeader;
var readyBox;
var badItemBox;
var problemBox;
var numColumns;
var auditSpace;

//Functions

function loginStart() {
  //disallow double-clicking
  logButton.css("pointer-events", "none");
  inventoryButton.css("pointer-events", "none");

  //swap login buttons
  inventoryButton.slideUp('slow');
	logButton.slideUp("slow", function() {
		credentials.slideDown("slow");
		goButton.slideDown("slow");
    forgotButton.slideDown("slow");
    logButton.css("pointer-events", "auto");
    inventoryButton.css("pointer-events", "auto");
    //set u/n focus for reader speed
    $("#userName").focus();
	});
}

function logout() {
	userName = "";
	password = "";
	$("#userName").val('');
  $("#password").val('');
  reset();
	logButton.off('click');
  logButton.slideUp("slow");
  restartButton.slideUp("slow");
  submitButton.slideUp("slow", function(){
    logButton.html("Login");
    logButton.click(loginStart);
    logButton.slideDown("slow");
    inventoryButton.slideDown("slow");
  });
}

function fixPassword() {
  //disallow multi-clicking, create loading spinner
  goButton.css("pointer-events", "none");
  forgotButton.css("pointer-events", "none");

  var spinLoader = setTimeout(function() {
    $("#spinContainer").show();
  },200);

  if ($("#userName").val() == "") {
    alert("Username required to begin password recovery.");

    //hide spinner
    clearTimeout(spinLoader);
    $("#spinContainer").hide();

    //turn on clicking
    goButton.css("pointer-events", "auto");
    forgotButton.css("pointer-events", "auto");
    return;
  }

  var inputJSON = new Object;
  inputJSON['user'] = $("#userName").val();
  $.ajax({
    url:"resources/api/resetpwd.php",
    type: "POST",
    data: inputJSON,
    success:function(data) {
      //hide spinner
      clearTimeout(spinLoader);
      $("#spinContainer").hide();

      //turn on clicking
      goButton.css("pointer-events", "auto");
      forgotButton.css("pointer-events", "auto");

      data = $.parseJSON(data);
      if (data['success']) {
        alert('Your username has been submitted to the server.  If the username exists, you will receive an email in 5-10 minutes with a temporary key and a method to reset your password.')
      } else {
        alert('An error occurred on the backend of the server.  Error code ' + data['code'] + ': ' + data['text']);
      }
    },
    error:function(data) {
      //hide spinner
      clearTimeout(spinLoader);
      $("#spinContainer").hide();

      //turn on clicking
      goButton.css("pointer-events", "auto");
      forgotButton.css("pointer-events", "auto");

      data = $.parseJSON(data.responseText)
      alert('An error occurred on the backend of the server.  Error code ' + data['code'] + ': ' + data['text']);
    }
  });
}

//completely starts the page over
function reset() {
  var imDone = $.Deferred();
  $("#itemBox").find("*").slideUp('slow',function() {
    $(this).remove();
    imDone.resolve();
  });
  return imDone.promise();
}

//restarts the audit - dumps all changes and remakes the item list
function restart() {
  //turn off restartButton clicking
  restartButton.css("pointer-events", "none");

  var fadedToConfirm = $.Deferred();
  var fadedToRestart = $.Deferred();

  //check to see if the user really wants to change
  restartButton.slideUp('slow', function(){
    $(this).html("Confirm");
    $(this).slideDown('slow', function() {
      fadedToConfirm.resolve();
    });
  });

  //set a timeout to change button back
  var timeoutID = setTimeout(function() {
    //at end of timer (10s), auto-cancel restart: change button back, give it a click handler, restart pointer events
    restartButton.css("pointer-events", "none");
    restartButton.slideUp('slow', function() {
      $(this).html("Restart");
      $(this).slideDown('slow', function() {
        restartButton.css("pointer-events", "auto");
      });
    });
  }, 10000); //timeout is in 10 seconds

  //once animation is done, set the click handler to actually reset
  fadedToConfirm.done(function(){
    restartButton.off("click");

    //actual restart function - turns button off, resets everything, sets click function back to wrapper restart, turns button back on
    restartButton.click(function() {
      //stop timeout and disable button
      clearTimeout(timeoutID);
      restartButton.css("pointer-events", "none");

      //start reset, and once that's done...
      var resetProgress = reset();
      resetProgress.done(function() {
        buildItemList();

        //refade to 'restart'
        restartButton.slideUp('slow', function() {
          $(this).html("Restart");
          $(this).slideDown('slow', function() {
            fadedToRestart.resolve();
          });
        });
        fadedToRestart.done(function(){
          restartButton.off("click");
          restartButton.click(restart);
          restartButton.css("pointer-events", "auto");
        });
      });
    });
    restartButton.css("pointer-events", "auto");
  });
}

//swaps between light and dark theme
function changeTheme() {
  $(".theme").removeClass("down");
  $(this).addClass("down");
  if ($(this).is("#light")) {
    $("#inventoryStyle").attr('href','resources/css/auditor.css');
    $("#logo").attr("src", "resources/img/logo.svg")
  } else {
    $("#inventoryStyle").attr('href','resources/css/auditor-dark.css');    
    $("#logo").attr("src", "resources/img/logo-dark.svg")
  }
}

//checks username/password auth against the server
function authCheck() {
  //disallow double clicking, and create loading spinner
  goButton.css("pointer-events", "none");
  var spinLoader = setTimeout(function() {
    $("#spinContainer").show();
  },200);

  //check auth
	password = $("#password").val();
	userName = $("#userName").val();
  $.ajax({
    xhrFields: {
      withCredentials: true
    },
    headers: {
      'Authorization': 'Basic ' + btoa(userName + ':' + password)
    },
    url: "resources/api/login.php",
    success:function(data) {
      //hide spinner
      clearTimeout(spinLoader);
      $("#spinContainer").hide();

      data = $.parseJSON(data);
      if (data['code'] === 0) {
        //if user is auth'd...
        //change logbutton's click handler to logout
      	logButton.off('click');
      	logButton.html("Logout");
      	logButton.click(logout);

        //hide credentials and go button, and reset goButton's click-ability
      	credentials.slideUp("slow");
        forgotButton.slideUp("slow");
      	goButton.slideUp("slow", function() {
      		logButton.slideDown("slow");
          submitButton.slideDown("slow");
          restartButton.slideDown("slow");
      		buildItemList();
          goButton.css("pointer-events", "auto");
      	});
      } else if (data['code'] == 16) {
        //if user is not auth'd...
        //reset username/password and border them
        $("#userName").val('');
        $("#password").val('');
        $(".auth").css({"border-color":"red"});
        userName = "";
        password = "";
        $("#userName").focus();
        //re-set goButton's click-ability
        goButton.css("pointer-events", "auto");
      } else {
        //something else went wrong, just re-enable gobutton
        goButton.css("pointer-events", "auto");
      }
    },
    error:function(data) {
      //hide spinner
      clearTimeout(spinLoader);
      $("#spinContainer").hide();

      //if user is not auth'd...
      //reset username/password and border them
      $("#userName").val('');
      $("#password").val('');
      $(".auth").css({"border-color":"red"});
      userName = "";
      password = "";
      $("#userName").focus();
      //re-set goButton's click-ability
      goButton.css("pointer-events", "auto");
    }
  });
}

//creates the initial list of items to audit
function buildItemList() {
  var spinLoader = setTimeout(function() {
    $("#spinContainer").show();
  },200);

  var getKeywordsJSON = new Object;
  getKeywordsJSON['index'] = 'items';

  $.ajax({
    xhrFields: {
      withCredentials: true
    },
    headers: {
      'Authorization': 'Basic ' + btoa(userName + ':' + password)
    },
    type: "POST",
    data: getKeywordsJSON,
    url: "resources/api/getall.php",
    success:function(data) {
      //hide spinner
      clearTimeout(spinLoader);
      $("#spinContainer").hide();

      data = $.parseJSON(data);
      if (data['code'] === 0) {
        data = data['data'];

        //everything came back okay, start working on item headers
        for (itemIndex in data) {

          var header = itemHeader.clone();

          //catch any empty 'lastAudited' entries.  Store 'last audited' data on the header row for later sorting.
          if (!('lastAudited' in data[itemIndex]['_source'])) {
            data[itemIndex]['_source']['lastAudited'] = new Object;
          }
          if (!(locale in data[itemIndex]['_source']['lastAudited'])) {
            data[itemIndex]['_source']['lastAudited'][locale] = '2000-01-31';
          }

          //catch any empty 'lastAuditor' entries.
          if(!('lastAuditor' in data[itemIndex]['_source'])) {
            data[itemIndex]['_source']['lastAuditor'] = new Object;
          }
          if (!(locale in data[itemIndex]['_source']['lastAuditor'])) {
            data[itemIndex]['_source']['lastAuditor'][locale] = 'None';
          }
          
          var lastAuditedEpoch = new Date(data[itemIndex]['_source']['lastAudited'][locale]).getTime();
          header.data('lastAudited', lastAuditedEpoch);

          //Build header row and add to itembox
          header.data('elasticID', data[itemIndex]['_id']);
          header.data('record', data[itemIndex]['_source']['record']);
          header.attr("id", data[itemIndex]['_source']['keyword']);
          header.find(".itemKeyword").html(data[itemIndex]['_source']['keyword']);
          header.find(".itemInfoTop").html('Last Audit: ' + data[itemIndex]['_source']['lastAudited'][locale]);
          header.find(".itemInfoBottom").html('By: ' + data[itemIndex]['_source']['lastAuditor'][locale]);
          $("#itemBox").append(header);
          header.hide();
        }

        //sort all itemheaders, then display
        $(".itemHeader").sort(function(a, b) {
            return parseInt($(a).data('lastAudited')) - parseInt($(b).data('lastAudited'));
          }).each(function() {
            var elem = $(this).clone(true);
            $(this).remove()
            $(elem).appendTo("#itemBox");
            elem.slideDown('slow');
          });

        //set on-click functions for audit buttons
        $(".startAudit").click(function() {startAudit($(this))});

        //set keyup for itemSerialInput boxes
        $(".itemSerialInput").on('keyup',function(e){
          if (e.keyCode ==13) {
            checkSerial(this);
            $(this).val('');
          }
        });

      } else {
        alert('An error occurred on the backend of the server while building an item list.  Error code ' + data['code'] + ': ' + data['text']);
      }
    },
    error:function(data) {
      alert('An error occurred on the backend of the server while building an item list.  Information is in the console.');
      console.log(data);
    }
  });
}

//should only be called when a 'startAudit' button is clicked, as it will change the button's behavior!
function startAudit(thisObj) {
  //disable button
  $(thisObj).css("pointer-events", "none");
  $(thisObj).off("click");
  $(thisObj).click(function() {stopAudit($(this))});

  //change button to 'cancel' button
  $(thisObj).html("Cancel");

  //Get clicked object
  var keyword = $(thisObj).parents('.itemHeader').attr('id');

  //Get 'ready' items in this keyword, in our locale
  var searchJSON = new Object
  searchJSON['index'] = 'serial';
  searchJSON['parameters'] = new Object;
  searchJSON['parameters']['match'] = new Object;
  searchJSON['parameters']['match']['keyword'] = keyword;
  searchJSON['parameters']['match']['status'] = 'Ready';
  searchJSON['parameters']['match']['location'] = locale;


  var searchingDone = $.ajax({
    xhrFields: {
      withCredentials: true
    },
    headers: {
      'Authorization': 'Basic ' + btoa(userName + ':' + password)
    },
    type: "POST",
    data: searchJSON,
    url: "resources/api/search.php",

    success:function(data) {
      //if the server responded poorly
      if (!$.parseJSON(data)['success']) {
        alert('An error occurred on the backend of the server while building an item list.  Information is in the console.');
        console.log(data)
      //otherwise, start populating the 'ready' list
      } else {
        //sort the data
        data = $.parseJSON(data)['data']['hits']['hits'];
        data = data.sort(function (a,b){
          return a['_source'].serial - b['_source'].serial;
        });

        //initialize variables and setup boxes
        var newReadies = readyBox.clone();
        newReadies.attr("id", keyword+"readyBox");
        var newProblems = problemBox.clone();
        newProblems.attr("id", keyword+"problemBox");
        var newSpacer = auditSpacer.clone();
        newSpacer.attr("id", keyword + "auditSpacer");
        var numItems = data.length;
        var numRows = Math.floor(numItems / numColumns) + 1;
        var rowCount;
        var colCount;


        //build rows in 'ready' list
        for (rowCount = 0; rowCount < numRows; rowCount++) {
          newReadies.find("tbody").append("<tr></tr>");

          //build and populate cells in 'ready' list
          for (colCount = 0; colCount < numColumns; colCount++) {

            //note: (numRows * colCount) + rowCount = the data index that should be placed in this cell.  This sorts vertically before sorting horizontally.
            //handle the edge case where the number of items is less than the total number of cells (ie, don't add a cell)
            if ((numRows * colCount) + rowCount > (numItems - 1)) {
              continue;
            }
            var td = $('<td class="notFound" id="' + data[(numRows * colCount) + rowCount]['_id'] + '">' + data[(numRows * colCount) + rowCount]['_source']['serial'] + '</td>');
            td.data("record", data[(numRows * colCount) + rowCount]['_source']['record']);
            td.appendTo(newReadies.find("tr").eq(rowCount));
          }
        }

        //actually append all this new stuff underneath the itemheader.  Hide the problems tab until we need it.
        newReadies.insertAfter("#" + keyword).hide();
        newProblems.insertAfter(newReadies).hide();
        newSpacer.insertAfter(newProblems).hide();
        newReadies.slideDown('slow');
        newSpacer.slideDown('slow');
        $("#" + keyword).find(".itemSerialInput").show();
        $("#" + keyword).find(".itemSerialInput").focus();

        //finally, flag the itemheader as in-audit
        $("#" + keyword).addClass("auditing");

        
      }
    },
    error:function(data) {
      alert('An error occurred on the backend of the server while building an item list.  Information is in the console.');
      console.log(data);
    }
  });

  $.when(searchingDone).then(function() {
    //re-enable button
    $(thisObj).css("pointer-events", "auto");
  });
}

//should only be called when a 'cancel' button is pressed
function stopAudit(thisObj) {
  //disable button
  $(thisObj).css("pointer-events", "none");
  $(thisObj).off("click");

  //change button to 'audit' button
  $(thisObj).html("Audit!");
  $(thisObj).click(function() {startAudit($(this))});

  //Get clicked object
  var keyword = $(thisObj).parents('.itemHeader').attr('id');

  //nuke unneeded boxes
  $("#" + keyword + "readyBox").slideUp('slow', function(){$("#" + keyword + "readyBox").remove()});
  $("#" + keyword + "problemBox").slideUp('slow', function(){ $("#" + keyword + "problemBox").remove()});
  $("#" + keyword + "auditSpacer").slideUp('slow', function(){$("#" + keyword + "auditSpacer").remove()});
  $("#" + keyword).find(".itemSerialInput").hide();

  //unflag header - no longer audited
  $("#" + keyword).removeClass("auditing");

  //turn button back on
  $(thisObj).css("pointer-events", "auto");
}

//function to sort scanned variables
function checkSerial(thisObj){

  //gather info
  var keyword = $(thisObj).parents(".itemHeader").attr("id");
  var serial = $(thisObj).val();
  var fixable = false;
  var serialHandled = false;
  var reason = false;
  var record = false;
  var id = false;

  //check current serials for the scanned serial
  $("#" + keyword + "readyBox").find("td").each(function(){

    //if we find the scanned serial for the first time, flag it as found and move on
    if ($(this).html() == serial && $(this).hasClass("notFound")) {

      $(this).addClass("found");
      $(this).removeClass("notFound");
      serialHandled = true;
      return;

    //if we find the scanned serial for the second time, set the reason and move on
    } else if ($(this).html() == serial && $(this).hasClass("found")) {

      reason = "Item already scanned!";
      serialHandled = true;
      return;
    }

  });

  //the loop is done. if we've made it this far, the serial doesn't exist for some reason.  Figure out why.
  //Either the serial is in the 'dead' database, or shouldn't be in 'ready', or has the wrong keyword, or something weird like that.
  if (!(serialHandled)) {

    //set backup reason
    reason = "Unknown error with this serial!";

    //gather info in preparation to query the server
    var searchJSON = new Object;
    var serialDBResults;
    var deadDBResults;
    searchJSON['index'] = 'serial';
    searchJSON['parameters'] = new Object;
    searchJSON['parameters']['match'] = new Object;
    searchJSON['parameters']['match']['serial'] = serial;

    //query the serial DB for the serial in question
    var searchedSerialDB = $.ajax({
      xhrFields: {
        withCredentials: true
      },
      headers: {
        'Authorization': 'Basic ' + btoa(userName + ':' + password)
      },
      type: "POST",
      data: searchJSON,
      url: "resources/api/search.php",
      success:function(data) {
        if (!$.parseJSON(data)['success']) {
          serialDBResults = false;
        } else {
          serialDBResults = $.parseJSON(data)['data'];
        }
      },
      error:function(data) {
        serialDBResults = false;
      }
    });


    //now query the 'dead' db for the serial in question
    searchJSON['index'] = 'dead';

    var searchedDeadDB = $.ajax({
      xhrFields: {
        withCredentials: true
      },
      headers: {
        'Authorization': 'Basic ' + btoa(userName + ':' + password)
      },
      type: "POST",
      data: searchJSON,
      url: "resources/api/search.php",
      success:function(data) {
        if (!$.parseJSON(data)['success']) {
          deadDBResults = false;
        } else {
          deadDBResults = $.parseJSON(data)['data'];
        }
      },
      error:function(data) {
        deadDBResults = false;
      }
    });

    $.when(searchedDeadDB, searchedSerialDB).then(function() {

      //if no results anywhere, figure out why:
      if (!(deadDBResults) || !(serialDBResults)){ //ff one of the databases responded with an error
        reason = "Failed to query server!  Consult an inventory admin!";
      } else if (deadDBResults['hits']['total'] == 1 && serialDBResults['hits']['total'] == 0) { //if the item was found in the 'dead' database
        reason = "Serial has been marked 'dead'!";
      } else if (deadDBResults['hits']['total'] == 0 && serialDBResults['hits']['total'] == 0) { //if the item was not found in the database
        reason = "Serial not found in database!";
      } else if (deadDBResults['hits']['total'] + serialDBResults['hits']['total'] > 1) { //if too many items were found in the databases
        reason = "Too many hits in database!";
      } else if (serialDBResults['hits']['hits'][0]['_source']['location'] != locale) { //if the item was in the wrong datacenter
        reason = "Serial was found, but in the following datacenter: " + serialDBResults['hits']['hits'][0]['_source']['location'] + "! (FIXABLE)";
        fixable = true;
        record = serialDBResults['hits']['hits'][0]['_source']['record'];
        id = serialDBResults['hits']['hits'][0]['_id'];
      } else if (serialDBResults['hits']['hits'][0]['_source']['keyword'] != keyword) { //if the item has the wrong keyword in the serial db
        reason = "Serial was found with the following incorrect keyword: " + serialDBResults['hits']['hits'][0]['_source']['keyword'] + "! (FIXABLE)";
        fixable = true;
        record = serialDBResults['hits']['hits'][0]['_source']['record'];
        id = serialDBResults['hits']['hits'][0]['_id'];
      } else if (serialDBResults['hits']['hits'][0]['_source']['status'] != 'Ready') { //if the item isn't set to ready in the serial db
        reason = "Serial appears to be in " + serialDBResults['hits']['hits'][0]['_source']['status'] + " state! (FIXABLE)";
        fixable = true;
        record = serialDBResults['hits']['hits'][0]['_source']['record'];
        id = serialDBResults['hits']['hits'][0]['_id'];
      }

      //create the problem item, append it, and set its exBox click handler.
      var newProblem = badItemBox.clone();
      newProblem.find('.itemSerial').html(serial);
      newProblem.find('.status').html(reason);
      newProblem.appendTo($('#' + keyword + 'problemBox')).hide();

      if (fixable) {
        newProblem.addClass("fixable");
        newProblem.data("record", record);
        newProblem.data("keyword", keyword);
        newProblem.attr("id", id);
      }

      //if the problem menu is currently hidden, show it, THEN the new problem.  Gotta get the order right, or it looks clunky.
      if ($('#' + keyword + 'problemBox').is(":hidden")) {
        $('#' + keyword + 'problemBox').slideDown('slow', function(){
          newProblem.slideDown('slow');
        });
      } else {
        newProblem.slideDown('slow');
      }

      //click handler for a bad item's exBox
      newProblem.find('.exBox').click(function(){
        $(this).css("pointer-events", "none");
        newProblem.slideUp('slow', function() {
          newProblem.remove();
          if ($('#' + keyword + 'problemBox').find('.badItem').length < 1) {
            $('#' + keyword + 'problemBox').slideUp('slow');
          }
        });
      });

    });
  } else if (reason){

    //create the problem item, append it, and set its exBox click handler.
    //TO DO: this is basically a copy of a code box up above.  Refactor code to eliminate either these lines, or the lines above.  Unfortunately due to asynchronous nature, not so easy.
    var newProblem = badItemBox.clone();
    newProblem.find('.itemSerial').html(serial);
    newProblem.find('.status').html(reason);
    newProblem.appendTo($('#' + keyword + 'problemBox')).hide();

    //if the problem menu is currently hidden, show it, THEN the new problem.  Gotta get the order right, or it looks clunky.
    if ($('#' + keyword + 'problemBox').is(":hidden")) {
      $('#' + keyword + 'problemBox').slideDown('slow', function(){
        newProblem.slideDown('slow');
      });
    } else {
      newProblem.slideDown('slow');
    }

    //click handler for a bad item's exBox
    newProblem.find('.exBox').click(function(){
      $(this).css("pointer-events", "none");
      newProblem.slideUp('slow', function() {
        newProblem.remove();
        if ($('#' + keyword + 'problemBox').find('.badItem').length < 1) {
          $('#' + keyword + 'problemBox').slideUp('slow');
        }
      });
    });
  }
}

//initial function of the 'submit' pipeline
function stageSubmit() {

  //disable button until submission is done
  submitButton.css("pointer-events", "none");

  //if there's nothing to submit, cancel
  if ($(".auditing").length < 1) {
    submitButton.css("pointer-events", "auto");
    return true;
  }

  //if there are unfixable problems, alert and cancel.
  if ($(".fixable").length != $(".badItem").length) {
    alert('Submission canceled: there are still problems in your audit that cannot be auto-fixed!  Please handle these problems manually and then remove them from the problem list to proceed.');
    submitButton.css("pointer-events", "auto");
    return true;
  }

  //additionally, test for anything audited in two places - that's just straight not cool.
  //Solution yoinked from http://stackoverflow.com/questions/840781/easiest-way-to-find-duplicate-values-in-a-javascript-array
  var serialsAudited = [];

  $(".found").each(function() {
    serialsAudited.push($(this).html());
  });

  $(".badItem").find(".itemSerial").each(function() {
    serialsAudited.push($(this).html());
  });

  $(".notFound").each(function() {
    serialsAudited.push($(this).html());
  })

  var uniq = serialsAudited
  .map((serial) => {
    return {count: 1, serial: serial};
  })
  .reduce((a, b) => {
    a[b.serial] = (a[b.serial] || 0) + b.count;
    return a;
  }, {});

  var duplicates = Object.keys(uniq).filter((a) => uniq[a] > 1);

  if (duplicates.length > 0) {
    alert('Submission canceled: some serials were listed multiple times, possibly under multiple keywords.  Please manually fix these before continuing.  Problem serials:\n ' + duplicates.join("\n"));
    submitButton.css("pointer-events", "auto");
    return true;
  }


  //if there are no problems, continue.  Otherwise, alert the user that they need to double-check the submissions (the doublecheck dialog auto-redirects to submitItems).
  if ($(".notFound").length + $(".badItem").length < 1) {
    submitItems();
  } else {
    $("#doubleCheckAlert").dialog("open");
  }
}

function submitItems() {

  //keep track of any failures, and keep a counter of current ajaxcalls
  var failedSerials = [];
  var failedCredit = false;
  var ajaxCalls = $(".notFound").length + $(".fixable").length + $(".auditing").length;

  //date info
  var now = new Date();
  var tz = now.getTimezoneOffset();
  var nowtz = new Date(now - tz*60*1000);
  var lastAudited = now.getFullYear().toString() + '-' + ('0' +(now.getMonth() + 1).toString()).slice(-2) + '-' + ('0' + now.getDate().toString()).slice(-2);

  //Give credit to auditor
  $(".auditing").each(function() {
    var updateJSON = new Object;
    updateJSON['id'] = $(this).data('elasticID');
    updateJSON['record'] = $(this).data('record');
    updateJSON['index'] = 'items';
    updateJSON['parameters'] = new Object;
    updateJSON['parameters']['lastAudited'] = new Object;
    updateJSON['parameters']['lastAuditor'] = new Object;
    updateJSON['parameters']['lastAudited'][locale] = lastAudited;
    updateJSON['parameters']['lastAuditor'][locale] = userName;

    $.ajax({
      xhrFields: {
        withCredentials: true
      },
      headers: {
        'Authorization': 'Basic ' + btoa(userName + ':' + password)
      },
      timeout: 10000,
      type: "POST",
      data: updateJSON,
      url: "resources/api/update.php",
      success:function(data) {
        ajaxCalls = ajaxCalls - 1;
        data = $.parseJSON(data);
        //handle errors quietly because we're making a lot of edits.  Can't have an alert for each one
        if (!(data['success'])) {
          failedCredit = true;
        }
        callsComplete();
      },
      error:function(data) {
        ajaxCalls = ajaxCalls - 1;
        failedCredit = true;
        callsComplete();
      }
    });
  });


  //Submit unfound serials as 'unknown'
  $(".notFound").each(function() {

    //first, get the history of the object
    var historyJSON = new Object;
    var serial = $(this).html();
    var id = $(this).attr("id");
    var record = $(this).data("record");
    historyJSON['id'] = id;
    historyJSON['index'] = 'serial';

    $.ajax({
      xhrFields: {
        withCredentials: true
      },
      headers: {
        'Authorization': 'Basic ' + btoa(userName + ':' + password)
      },
      timeout: 10000,
      type: "POST",
      data: historyJSON,
      url: "resources/api/get.php",
      success:function(docData) {
        docData = $.parseJSON(docData);
        //handle errors quietly because we're making a lot of edits.  Can't have an alert for each one
        if (!(docData['success'])) {
          ajaxCalls = ajaxCalls - 1;
          failedSerials.push(serial);
          callsComplete();
        } else {

          //if we successfully found the item we're trying to find, build a new history for it, and build its update parameters
          var newHistory = new Object;
          newHistory['user'] = userName;
          newHistory['note'] = 'Unable to find during audit';
          newHistory['status'] = 'Unknown';
          newHistory['location'] = locale;
          newHistory['prevStatus'] = docData['data']['_source']['status'];
          newHistory['price'] = docData['data']['_source']['status'];
          newHistory['date'] = nowtz.toISOString().replace(/T/g," ").slice(0, nowtz.toISOString().indexOf("."));

          var updateJSON = new Object;
          updateJSON['id'] = id;
          updateJSON['record'] = record;
          updateJSON['index'] = 'serial';
          updateJSON['parameters'] = new Object;
          updateJSON['parameters']['history'] = docData['data']['_source']['history'];
          updateJSON['parameters']['history'].push(newHistory);
          updateJSON['parameters']['status'] = 'Unknown';

          //now send the updated JSON back to the server
          $.ajax({
            xhrFields: {
              withCredentials: true
            },
            headers: {
              'Authorization': 'Basic ' + btoa(userName + ':' + password)
            },
            timeout: 10000,
            type: "POST",
            data: updateJSON,
            url: "resources/api/update.php",
            success:function(data) {
              ajaxCalls = ajaxCalls - 1;
              data = $.parseJSON(data);
              //handle errors quietly because we're making a lot of edits.  Can't have an alert for each one
              if (!(data['success'])) {
                failedSerials.push(serial);
              }
              callsComplete();
            },
            error:function(data) {
              ajaxCalls = ajaxCalls - 1;
              failedSerials.push(serial);
              callsComplete();
            }
          });



        }
      },
      error:function(data) {
        ajaxCalls = ajaxCalls - 1;
        failedSerials.push(serial);
        callsComplete();
      }
    });


  });


  //set fixable serials to keyword and 'ready'
  $(".fixable").each(function() {
    var historyJSON = new Object;
    var serial = $(this).find(".itemSerial").html();
    var id = $(this).attr("id");
    var record = $(this).data("record");
    var keyword = $(this).data("keyword");
    historyJSON['id'] = id;
    historyJSON['index'] = 'serial';

    //get history of serial
    $.ajax({
      xhrFields: {
        withCredentials: true
      },
      headers: {
        'Authorization': 'Basic ' + btoa(userName + ':' + password)
      },
      timeout: 10000,
      type: "POST",
      data: historyJSON,
      url: "resources/api/get.php",
      success:function(docData) {
        docData = $.parseJSON(docData);
        //handle errors quietly because we're making a lot of edits.  Can't have an alert for each one
        if (!(docData['success'])) {
          ajaxCalls = ajaxCalls - 1;
          failedSerials.push(serial);
          callsComplete();
        } else {
          //if we successfully found the item we're trying to find, build a new history for it, and build its update parameters
          var newHistory = new Object;
          newHistory['user'] = userName;
          newHistory['note'] = 'Recovered during audit';
          newHistory['status'] = 'Ready';
          newHistory['location'] = locale;
          newHistory['prevStatus'] = docData['data']['_source']['status'];
          newHistory['price'] = docData['data']['_source']['status'];
          newHistory['date'] = nowtz.toISOString().replace(/T/g," ").slice(0, nowtz.toISOString().indexOf("."));

          var updateJSON = new Object;
          updateJSON['id'] = id;
          updateJSON['record'] = record;
          updateJSON['index'] = 'serial';
          updateJSON['parameters'] = new Object;
          updateJSON['parameters']['history'] = docData['data']['_source']['history'];
          updateJSON['parameters']['history'].push(newHistory);
          updateJSON['parameters']['status'] = 'Ready';
          updateJSON['parameters']['location'] = locale;
          updateJSON['parameters']['keyword'] = keyword;


          //now send the updated JSON back to the server
          $.ajax({
            xhrFields: {
              withCredentials: true
            },
            headers: {
              'Authorization': 'Basic ' + btoa(userName + ':' + password)
            },
            timeout: 10000,
            type: "POST",
            data: updateJSON,
            url: "resources/api/update.php",
            success:function(data) {
              ajaxCalls = ajaxCalls - 1;
              data = $.parseJSON(data);
              //handle errors quietly because we're making a lot of edits.  Can't have an alert for each one
              if (!(data['success'])) {
                failedSerials.push(serial);
              }
              callsComplete();
            },
            error:function(data) {
              ajaxCalls = ajaxCalls - 1;
              failedSerials.push(serial);
              callsComplete();
            }
          });



        }
      },
      error:function(data) {
        ajaxCalls = ajaxCalls - 1;
        failedSerials.push(serial);
        callsComplete();
      }
    });

  });


  //curried function to do stuff once all Ajax calls are complete.  
  //Since ajax is asynchronous, I don't think the $.each promises will work correctly...
  //and since the ajax calls are looped and I don't know which one ends last, I'm not sure which promise to take.
  //I'm sure there's a better way to do this, though...

  //also, hopefully the math is correct.  If somehow ajaxCalls manages to not make it down to zero, there's no output here.
  //ajax timeouts should hopefully mean that EVENTUALLY the calls will be brought down to zero.
  function callsComplete() {

    //if some calls still remain, quit
    if (ajaxCalls > 0) {
      return;
    }

    //otherwise, we should be all done.  Let the user know the results, then log them out.

    if (failedSerials.length < 1 && !(failedCredit)) {
      alert('Audit processed with no errors!\n\nThe page will now log you out.');
    } else if (failedSerials.length > 0 && !(failedCredit)) {
      alert('Your audits completed, but with errors.  Processing the following serials returned some sort of error, so you should manually update them in the Inventory Admin Frontend: ' + failedSerials.join("\n") + '\n\nThe page will now log you out.');
    } else if (failedSerials.length > 0 && failedCredit) {
      alert('At least one of the audits failed.  You should probably rerun the audit.  Additionally, the following serials failed in processing: ' + failedSerials.join("\n") + '\n\nThe page will now log you out.');
    } else {
      alert('All serials appear to have processed, but the audit itself seems to have failed.  Double check that your name/auditDate appear on the item, and if not, alert an inventory admin.\n\nThe page will now log you out.');
    }

    submitButton.css("pointer-events", "auto");
    logout();
  }
}

function dumpBorder() {
	$(this).css({"border-color":""});
}


//initializes the 'please doublecheck' dialog
function doubleCheckDialog() {
  $("#doubleCheckAlert").dialog({
    autoOpen: false,
    buttons: [
      {
        text: "Yes",
        click: function() {
          $(this).dialog("close");
          submitItems();
        }
      },
      {
        text: "No",
        click: function() {
          $(this).dialog("close");
          //submit button should be off any time this is called, so turn it back on if submission is canceled
          submitButton.css("pointer-events", "auto");
        }
      }
    ],
    closeOnEscape: false,
    modal: true,
    draggable: false,
    resizable: false,
    width: 'auto'
  });
}

//Click handlers and things to be run on ready state
$(document).ready(function(){

  //handle on-click functions
  $("#login").click(loginStart);
  $("#toInventory").click(function() {window.location.href = '../inventory/inventory.html'});
  $("#go").click(authCheck);  
  $("#submit").click(stageSubmit);
  $("#forgot").click(fixPassword);
  $("#restart").click(restart);
  $("#light").click(changeTheme);
  $("#dark").click(changeTheme);


  $(".auth").focus(dumpBorder);

  $("#userName").on('keyup',function(e){
  	if (e.keyCode ==13) {
  		$("#password").focus();
  	}
  });

  $("#password").on('keyup',function(e){
  	if (e.keyCode == 13) {
  		$("#password").blur();
  		authCheck();
  	}
  });

  //assign credentials to variables and link buttons to js vars
  credentials = $("#credentials");
  logButton = $("#login");
  inventoryButton = $("#toInventory");
  goButton = $("#go");
  forgotButton = $("#forgot");
  submitButton = $("#submit");
  restartButton = $("#restart");

  //calculate number of columns before cloning
  numColumns = Math.floor($(".readies").width() / $(".notFound").width()) - 1;
  if (numColumns == 0) {numColumns = 1};
  $(".readies").find("tr").remove();

  //clone headers for later
  $(".itemSerialInput").hide();
  itemHeader = $(".itemHeader").clone(true);
  readyBox = $(".readies").clone(true);
  badItemBox = $(".badItem").clone(true);
  $(".badItem").remove();
  problemBox = $(".problems").clone(true);
  auditSpacer = $(".auditSpacer").clone(true);
  
  //intialize dialog box(es)
  doubleCheckDialog();


  $(".hide").hide();
  $(".remove").remove();
});

