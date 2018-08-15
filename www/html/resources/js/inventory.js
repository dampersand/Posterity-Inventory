//Global Variables Section
var credentials;
var logButton;
var auditButton;
var goButton;
var submitButton;
var forgotButton;
var restartButton;
var userName;
var password;
var existingItemRow;
var newItemRow;
var newItems = false;

//Functions

function isInt(num) {
  if ($.isNumeric(num)) {
    var n = parseInt(num);
    return +n === n && !(n % 1);
  } else {
    return false;
  }
}

function loginStart() {
  //disallow double-clicking
  logButton.css("pointer-events", "none");
  auditButton.css("pointer-events", "none");

  //swap login buttons
  auditButton.slideUp('slow');
	logButton.slideUp("slow", function() {
		credentials.slideDown("slow");
		goButton.slideDown("slow");
    forgotButton.slideDown("slow");
    logButton.css("pointer-events", "auto");
    auditButton.css("pointer-events", "auto");
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
    auditButton.slideDown("slow");
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

function reset() {
  var imDone = $.Deferred();
  $("#flowStart").slideUp('slow');
  if ($(".item").length > 0) {
    $("#itemBox").find(".item").slideUp('slow',function() {
      $("#itemBox").find(".item").remove();
      imDone.resolve();
    });
  } else {
    imDone.resolve();
  }
  return imDone.promise();
}

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
        $("#flowStart").slideDown('slow');

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

function changeTheme() {
  $(".theme").removeClass("down");
  $(this).addClass("down");
  if ($(this).is("#light")) {
    $("#inventoryStyle").attr('href','resources/css/inventory.css');
    $("#logo").attr("src", "resources/img/logo.svg")
  } else {
    $("#inventoryStyle").attr('href','resources/css/inventory-dark.css');    
    $("#logo").attr("src", "resources/img/logo-dark.svg")
  }
}

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

        //hide credentials and go button, show the flowstart div, and reset goButton's click-ability
      	credentials.slideUp("slow");
        forgotButton.slideUp("slow");
      	goButton.slideUp("slow", function() {
      		logButton.slideDown("slow");
          submitButton.slideDown("slow");
          restartButton.slideDown("slow");
      		$("#flowStart").slideDown("slow");
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

function globalOnChanged() {

  //if this button wasn't previously active, make it active
  if (!($(this).hasClass("activeGlobal"))) {

    //clear previous global item and all other checkboxes
    $(".globalItem").removeClass("globalItem");
    $(".globalOn").not($(this)).removeClass("activeGlobal");

    //create new global item
    $(this).addClass("activeGlobal");
    $(this).parents(".item").addClass("globalItem");
    $(".globalItem").find(".itemKeyword").prop('readonly', false);
    $(".globalItem").find(".itemNote").prop('readonly', false);

    //populate all fields with globalItem's field
    $(".itemKeyword").not($(".item:last-child").find(".itemKeyword")).val($(".globalItem").find(".itemKeyword").val());
    $(".itemKeyword").not($(".globalItem").find(".itemKeyword")).prop('readonly', true);
    $(".itemNote").not($(".item:last-child").find(".itemNote")).val($(".globalItem").find(".itemNote").val());
    $(".itemNote").not($(".globalItem").find(".itemNote")).prop('readonly', true);
    $("#itemBox").find(".toggle").not($(".globalItem").find(".toggle")).removeClass("down");
    $("." + $(".globalItem").find(".down").html()).not($(".item:last-child").find(".toggle")).addClass("down");

  //if this button WAS previously active, we must be turning off global-ness.  Make it inactive
  } else if ($(this).hasClass("activeGlobal")) {
    //kill all global items
    $(".globalItem").removeClass("globalItem");
    $(this).removeClass("activeGlobal");
    //remove readonly
    $(".itemKeyword").prop('readonly',false);
    $(".itemNote").prop('readonly', false);
  }
}

function addItem() {

  //function forks based on whether the user selected new items or existing items
  //instantiate item and get some easy handles
  if (!(newItems)) {
    var item = existingItemRow.clone(true);
    var ready = item.find(".Ready");
    var used = item.find(".Used");
    var rma = item.find(".RMA");
    var test = item.find(".Test");
    var dead = item.find(".Dead");
    var itemNote = item.find(".itemNote");
    //turn off stuff if global is on
    if ($(".activeGlobal").length > 0) {
      itemNote.prop('readonly',true);
    }
  } else {
    var item = newItemRow.clone(true);
    var itemKeyword = item.find(".itemKeyword");
    //turn off stuff if global is on
    if ($(".activeGlobal").length > 0) {
      itemKeyword.prop('readonly', true);
    }
  }
  var itemSerial = item.find(".itemSerial");
  var removeItem = item.find(".exBox");

  //Housekeeping - hide, append, and animate item, set focus for fast barcode scanning
  item.hide();
  $("#itemBox").append(item);
  item.slideDown('slow');
  itemSerial.focus();


  //
  //SECTION:
  //create click handlers for new item
  //

  //toggle button click handlers - irrelevant for newItem, so skip in that case
  if (!(newItems)) {
    item.find(".toggle").click(function(){
      //only toggle if you're the global item or if there is no global item
      if ($(".activeGlobal").length < 1 || item.hasClass("globalItem")) {
        $(this).parents(".statusContainerOuter").find(".toggle").removeClass("down");
        $(this).toggleClass("down");

        //if you're the global item, push everything to everyone else
        if (item.hasClass("globalItem")) {
          $("#itemBox").find(".toggle").not($(".globalItem").find(".toggle")).removeClass("down");
          $("." + $(".globalItem").find(".down").html()).not($(".item:last-child").find(".toggle")).addClass("down");
        }
      }
    });
  }

  //enter-on-serial handler
  itemSerial.on('keyup', function(e){
    if ((itemSerial.val().length > 0) && (e.keyCode == 13)) {

      //check to see how many items have this serial
      var repeatCount = 0;
      $(".item").each(function(){
        if (itemSerial.val() == $(this).find(".itemSerial").val()) {
          repeatCount = repeatCount + 1;
        }
      });

      //existing items
      if (!(newItems)) {
        //if this entry is the only one with this serial, continue.
        if (repeatCount < 2) {
          var dataFound = itemDataGetter(itemSerial.val(), item);
          dataFound.done(function(){
            if (item.is(":last-child")) {
              addItem();
            }
          });

          //if global is active, set note to global note
          if ($(".activeGlobal").length > 0) {
            itemNote.val($(".globalItem").find(".itemNote").val());
          }

        //existing items: if you find another entry with this serial, gtfo
        } else {
          item.find(".toggle").removeClass("down");
          item.find(".itemInfoTop").html("Serial entered above")
          item.effect('shake');
          itemSerial.val("");
        }

      //new items
      } else {
        //if this entry is the only one with this serial, continue, but differently.
        if (repeatCount < 2) {
          //if we're using the global on button
          if ($(".activeGlobal").length > 0) {
            itemKeyword.val($(".globalItem").find(".itemKeyword").val());
            if (item.is(":last-child")) {
              addItem();
            }
          } else {
            item.find(".itemKeyword").focus();
          }
        //new items: if you find another entry with this serial in the above entries, gtfo
        } else {
          itemSerial.val("Serial entered above");
          if ($(".activeGlobal").length > 0) {
            itemKeyword.val($(".globalItem").find(".itemKeyword").val());
            if (item.is(":last-child")) {
              addItem();
            }
          } else {
            item.find(".itemKeyword").focus();
          }
        }

        //still part of 'new items' here.  Check to make sure the serial isn't used in the DB.  Do this after everything
        //because lol asynch javascript
        var outputJSON = new Object;
        outputJSON['index'] = 'serial';
        outputJSON['parameters'] = new Object;
        outputJSON['parameters']['match'] = new Object;
        outputJSON['parameters']['match']['serial'] = itemSerial.val();
        $.ajax({
          xhrFields: {
            withCredentials: true
          },
          headers: {
            'Authorization': 'Basic ' + btoa(userName + ':' + password)
          },
          type: "POST",
          data: outputJSON,
          url: "resources/api/count.php",
          success:function(data) {
            data = $.parseJSON(data);
            if (!(data['success'])) {
              alert("Couldn't determine if serial " + itemSerial.val() + " is in use or not!");
              console.log(data);
            } else if (data['data']['count'] > 0) {
              item.find(".itemSerial").val("SERIAL IN USE");
            }
          },
          error:function(data) {
            alert("Couldn't determine if serial " + itemSerial.val() + " is in use or not!");
            console.log(data);
          }
        });
      }
    }
  });

  //enter-on-keyword handler
  if (newItems) {
    itemKeyword.on('keyup', function(e){
      if (e.keyCode == 13) {
        //if global is on, populate all
        if (item.hasClass("globalItem")) {
          $(".itemKeyword").val(itemKeyword.val());
        }
        //if this is the last child and all the forms are filled out, create a new item
        if (item.is(":last-child") && itemSerial.val().length > 0 && itemKeyword.val().length > 0) {
          addItem();
        }
      }
    });
  }

  //enter-on-note handler for global notes
  if (!newItems) {
    itemNote.on('keyup', function(e) {
      if (e.keyCode == 13 && item.hasClass("globalItem")) {
        console.log('13 and globalitem');
        $(".itemNote").not($(".item:last-child").find(".itemNote")).val(itemNote.val());
      }
    });
  }

  //remove item handler
  removeItem.click(function(){

    //if this was the global item, un-global it before moving forward
    if (item.hasClass("globalItem")) {
      item.find(".globalOn").trigger("click");
    }

    //don't let user delete last item if it's empty (EDIT: do we need this part?  I can't remember why I don't just remove/add)
    if (item.is(":last-child")) {
      if (!(newItems)) {
        item.find(".toggle").removeClass("down");
        itemSerial.val("");
        itemNote.val("");
      } else {
        itemKeyword.val("");
        itemSerial.val("");
      }
      item.css("background-color","transparent");
      return true;
    }

    //now animate and remove the item
    removeItem.parents(".item").slideUp('slow', function(){
      removeItem.parents(".item").remove();
      if ($(".item").length < 1) {
        addItem();
      }
    });
  });
}

//this function only for existing items
function itemDataGetter(serial, parentItem) {
  //set a deferred object to alert when this function is done
  //TODO: learn async better and rewrite these js files to use deferred/promises
  var imDone = $.Deferred();

  //build calling parameters
  var outputJSON = new Object;
  outputJSON['index'] = 'serial';
  outputJSON['parameters'] = new Object;
  outputJSON['parameters']['match'] = new Object;
  outputJSON['parameters']['match']['serial'] = serial;

  //call search.php to find an item when requested
  $.ajax({
    xhrFields: {
      withCredentials: true
    },
    headers: {
      'Authorization': 'Basic ' + btoa(userName + ':' + password)
    },
    url: "resources/api/search.php",
    type: "POST",
    data: outputJSON,
    success:function(data) {
      data = $.parseJSON(data);
      if (data['data']['hits']['total'] == 0) {
        //if no hits, dump the serial
        parentItem.find(".itemSerial").val("");
        parentItem.find(".itemInfoTop").html("No such serial.");
        parentItem.find(".itemInfoBottom").html("");
        parentItem.find(".toggle").removeClass("down").removeClass("current");
        parentItem.effect("shake");
        if ($(".item").length < 1) {
          addItem();
        }
      } else if (data['data']['hits']['total'] > 1) {
        parentItem.find(".itemInfoBottom").html("ERROR: multiple hits");
        parentItem.data("unResolvableTrouble", true);
        parentItem.data("unResolvableProblem", "multiple hits on database")
      } else {

        //if we found the serial, get its amount
        var outputJSON2 = new Object;
        outputJSON2['index'] = 'serial';
        outputJSON2['parameters'] = new Object;
        outputJSON2['parameters']['match'] = new Object;
        outputJSON2['parameters']['match']['keyword'] = data['data']['hits']['hits'][0]['_source']['keyword'];
        outputJSON2['parameters']['match']['status'] = 'Ready';
        outputJSON2['parameters']['match']['location'] = locale;

        $.ajax({
          xhrFields: {
            withCredentials: true
          },
          headers: {
            'Authorization': 'Basic ' + btoa(userName + ':' + password)
          },
          type: "POST",
          data: outputJSON2,
          url: "resources/api/count.php",
          success:function(data2) {
            data2 = $.parseJSON(data2);
            if (!(data2['success'])) {
              parentItem.find(".itemInfoBottom").html('ERROR: indeterminate amount');
              console.log(data2);
              return;
            } else {
              parentItem.find(".itemInfoBottom").html(locale + ' Amount: ' + data2['data']['count']);
            }
          },
          error:function(data2) {
            parentItem.find(".itemInfoBottom").html('ERROR: indeterminate amount');
            console.log(data2);
          }
        });

        //edit itemRow
        parentItem.find(".itemInfoTop").html(data['data']['hits']['hits'][0]['_source']['keyword']);
        parentItem.find(".toggle").removeClass("down");
        parentItem.find("." + data['data']['hits']['hits'][0]['_source']['status']).addClass("current");
        if ($(".activeGlobal").length > 0) {
          parentItem.find("." + $(".globalItem").find(".down").html()).addClass("down");
        } else {
          parentItem.find("." + data['data']['hits']['hits'][0]['_source']['status']).addClass("down");
        }
        parentItem.data("record", parseInt(data['data']['hits']['hits'][0]['_source']['record']));
        parentItem.data("id", data['data']['hits']['hits'][0]['_id']);
        parentItem.data("history", data['data']['hits']['hits'][0]['_source']['history']);
      }

      imDone.resolve();
      
    },
    error:function(data) {
      parentItem.find(".itemInfoBottom").html("ERROR: database problem");
      parentItem.data("unResolvableTrouble", true);
      parentItem.data("unResolvableProblem", "server returned error when initially searching for item");
      imDone.resolve();
    }
  });
  return imDone.promise();
}

function submitItems() {

  //if there's nothing to submit, cancel
  if ($(".item").length <= 1) {
    if (($(".item").find(".itemSerial").val() == "") || ($(".item").length == 0)) {
      return true;
    }
  }

  //counting variables to let us know when to re-enable the submitButton, because ajaxStop doesn't seem to work right
  var failedItems = 0;
  var remainingItems = $(".item").length;
  var itemsChanged = $(".item").length;

  //disable button until submission is done
  submitButton.css("pointer-events", "none");

  //attempt to submit every visible item
  $(".item").each(function(){

    var item = $(this);
    if (!item.is(":visible")) {
      return true;
    }

    item.data("trouble", false);

    //dump empty serials
    if (item.find(".itemSerial").val() == "") {
      item.remove();
      remainingItems = remainingItems - 1;
      itemsChanged = itemsChanged - 1;
      if (remainingItems == failedItems) {
        submitButton.css("pointer-events", "auto");
      }
      return true;
    }

    //dump serials that aren't integers
    if (!isInt(item.find(".itemSerial").val())) {
      item.data("trouble", true);
      item.data("problem", "serial is not an integer");
    }

    //dump unchanged 'existing' items
    if (!(newItems) && item.find(".down").hasClass("current")) {
    	item.data("trouble", true);
      item.data("problem", "no status change made to this item - to add a note with no status change, use the admin frontend");
    }

    //check to make sure one-and-only-one status is selected - existing items only
    if ((item.find(".down").length != 1) && (!(newItems))) {
      item.data("trouble", true);
      item.data("problem", "1 status change expected, but found " + item.find(".down").length);
    }

    //if unresolvable trouble was detected 
    if (item.data("unResolvableTrouble")) {
      alert("Serial " + item.find(".itemSerial").val() + " has a problem and will not be submitted.\nYou will need to delete and remake the item.\nProblem: " + item.data("unResolvableProblem"));
      item.css("background-color","red");
      //check if that was the last good item, if so, re-enable submit button
      failedItems = failedItems + 1;
      itemsChanged = itemsChanged - 1;
      if (remainingItems == failedItems) {
        submitButton.css("pointer-events", "auto");
      }
      return true;
    }
      
    //if trouble was detected, drop an alert and move to next iteration
    if (item.data("trouble")) {
      alert("Serial " + item.find(".itemSerial").val() + " has a problem and will not be submitted.\nPlease fix the problem, then resubmit the item.\nProblem: " + item.data("problem"));
      item.css("background-color","red");
      //check if that was the last good item, if so, re-enable submit button
      failedItems = failedItems + 1;
      itemsChanged = itemsChanged - 1;
      if (remainingItems == failedItems) {
        submitButton.css("pointer-events", "auto");
      }
      return true;
    }

    //item is eligible for update/put, construct parameters for eventual ajax call
    var now = new Date;
    var tz = now.getTimezoneOffset();
    var nowtz = new Date(now - tz*60*1000);
    var newHistoryEntry = new Object;
    var outputJSON = new Object;
    var apiUrl;
    outputJSON['parameters'] = new Object;
    outputJSON['index'] = 'serial';
    newHistoryEntry['user'] = userName;
    newHistoryEntry['date'] = nowtz.toISOString().replace(/T/g," ").slice(0, nowtz.toISOString().indexOf("."));

    //existing items case
    if (!(newItems)) {
      newHistoryEntry['status'] = item.find(".down").html();
      newHistoryEntry['location'] = locale;
      newHistoryEntry['prevStatus'] = item.find(".current").html();
      newHistoryEntry['note'] = item.find(".itemNote").val();
      outputJSON['record'] = parseInt(item.data("record"));
      outputJSON['parameters']['history'] = item.data("history");
      outputJSON['parameters']['history'].push(newHistoryEntry);
      outputJSON['parameters']['status'] = item.find(".down").html();
      outputJSON['parameters']['location'] = locale;
      outputJSON['id'] = item.data("id");
      apiUrl = "resources/api/update.php";
      finalUpdate(apiUrl, outputJSON, item);
    //new items case
    } else {
      newHistoryEntry['status'] = 'Ready';
      newHistoryEntry['location'] = locale;
      newHistoryEntry['prevStatus'] = 'None';
      newHistoryEntry['note'] = 'initial commit';
      outputJSON['parameters']['history'] = [];
      outputJSON['parameters']['history'].push(newHistoryEntry);
      outputJSON['parameters']['status'] = 'Ready';
      outputJSON['parameters']['location'] = locale;
      outputJSON['parameters']['keyword'] = item.find(".itemKeyword").val();
      outputJSON['parameters']['serial'] = item.find(".itemSerial").val();
      apiUrl = "resources/api/put.php";

      var priceCheckJSON = new Object;
      priceCheckJSON['index'] = 'items';
      priceCheckJSON['parameters'] = new Object;
      priceCheckJSON['parameters']['match'] = new Object;
      priceCheckJSON['parameters']['match']['keyword'] = item.find(".itemKeyword").val();

      //such an innocuous thing, but... turns out finding price data is a little harder than it could be.
      //new items have to have their price data checked with a separate ajax call, and since ajax is asynchronous,
      //I had to create the 'finalupdate' function down below - UGGGGHHHH
      $.ajax({
        xhrFields: {
          withCredentials: true
        },
        headers: {
          'Authorization': 'Basic ' + btoa(userName + ':' + password)
        },
        url: "resources/api/search.php",
        type: "POST",
        data: priceCheckJSON,
        success:function(data) {
          data = $.parseJSON(data);

          //price/pflag logic
          if (data['code'] == 0) {
            if (data['data']['hits']['total'] == 1) {
              outputJSON['parameters']['price'] = data['data']['hits']['hits'][0]['_source']['price'];
              var pLength = data['data']['hits']['hits'][0]['_source']['priceHistory'].length - 1;
              var pDate = new Date(Date.parse(data['data']['hits']['hits'][0]['_source']['priceHistory'][pLength]['date']));
              var pDatetz = new Date(pDate - tz*60*1000);
              if (nowtz - pDatetz < 604800000) {
                outputJSON['parameters']['pFlag'] = true;
              } else {
                outputJSON['parameters']['pFlag'] = false;
              }
            } else {
              outputJSON['parameters']['price'] = 0;
              outputJSON['parameters']['pFlag'] = true;
            }
          } else {
            outputJSON['parameters']['price'] = 0;
            outputJSON['parameters']['pFlag'] = true;
          }
          finalUpdate(apiUrl, outputJSON, item);


        },
        error:function(data) {
          outputJSON['parameters']['price'] = 0;
          outputJSON['parameters']['pFlag'] = true;
          finalUpdate(apiUrl, outputJSON, item);
        }
      });
    }

    //maybe functions that have two different use cases is NOT the way to go.
    //because of async javascript calls, I have to curry a function.
    //this is a coding red flag and I would like to fix it.
    //anyway, this function does nothing more than call ajax to post an update.
    function finalUpdate(innerApiUrl, innerOutputJSON, parentItem) {
      $.ajax({
        xhrFields: {
          withCredentials: true
        },
        headers: {
          'Authorization': 'Basic ' + btoa(userName + ':' + password)
        },
        url: innerApiUrl,
        type: "POST",
        data: innerOutputJSON,
        success:function(data) {
          data = $.parseJSON(data);
          if (data['code'] == 0) {
            //flash green on success, and remove item
            parentItem.css("background-color","#00FFAA");
            parentItem.animate({backgroundColor: "transparent"}, 1000, function(){
              parentItem.slideUp('slow', function(){
                parentItem.remove();
                //count items and re-enable submitButton if it's time
                remainingItems = remainingItems - 1;
                if (remainingItems == failedItems) {
                	alert(itemsChanged + " item(s) changed!\n" + failedItems + " item(s) failed!")
                  submitButton.css("pointer-events", "auto");
                }
                //if that was the last item, logout
                if ($(".item").length < 1) {
                  $("#continueAlert").dialog("open");
                }
              });
            });

          //if someone else edited the item before we got to it:
          } else if (data['code'] == 22) {
            alert("Item " + parentItem.find(".itemSerial").val() + " update canceled - a change from another location was detected.  Please delete/remake/resubmit this item.");
            failedItems = failedItems + 1;
          //protect from other errors  
          } else {
            alert("Error while posting " + parentItem.find(".itemSerial").val() +"\nError: " + data['text'] || "unknown");
            failedItems = failedItems + 1;
          }

          //re-enable button for the failures
          if (remainingItems == failedItems) {
            submitButton.css("pointer-events", "auto");
          }
        },
        error:function(data) {
          data = $.parseJSON(data.responseText)
          alert("Unspecified error while posting " + parentItem.find(".itemSerial").val() +". This item may or may not have updated!  Please verify!\nError: " + data['text'] || "unknown");
          failedItems = failedItems + 1;
          //re-enable button
          if (remainingItems == failedItems) {
            submitButton.css("pointer-events", "auto");
          }
        }
      });
    }
  });
}

function dumpBorder() {
	$(this).css({"border-color":""});
}

//initializes the 'another transaction' dialog
function keepGoingDialog() {
	var continueTimeoutID
  $("#continueAlert").dialog({
    autoOpen: false,
    open: function(event, ui) {
      continueTimeoutID = setTimeout(function() {
        $("#continueAlert").dialog("close");
        logout();
      }, 180000);
    },
    buttons: [
      {
        text: "Yes",
        click: function() {
          $(this).dialog("close");
          clearTimeout(continueTimeoutID);
          var resetComplete = reset();
          resetComplete.done(function() {
            $("#flowStart").slideDown('slow');
          });
        }
      },
      {
        text: "No",
        click: function() {
          $(this).dialog("close");
          clearTimeout(continueTimeoutID);
          logout();
        }
      }
    ],
    closeOnEscape: false,
    modal: true,
    draggable: false,
    resizable: false

  });
}

/*this section has a dialog box that should manually set a trouble flag, but I can't get the dialog box to 'block.'  With audits in place, it's not really worth the time to figure this out.
//calls a dialog box to manually set a trouble flag
function troubleDialog(serial) {
	var dialog = $('<div class="dialog">I notice that serial number ' + serial + ' is not changing status, but does have a note.  Are you sure you meant to do this?</div>');
	var dialogDone = $.Deferred(); //this is a clever way to do a dialog box and I wish I'd seen it sooner... create a deferred object and use it as the return value

	$(dialog).dialog({
		autoOpen: true,
		buttons: [
			{
				text: "Yes",
				click: function() {
					dialogDone.resolve();
					$(this).dialog("close");
				}
			},
			{
				text: "No",
				click: function() {
					dialogDone.reject();
					$(this).dialog("close");
				}
			}
		],
		//if the user clicked the 'x' button
		beforeClose: function() {
			if (dialogDone.state() === "pending") {
				dialogDone.reject();
			}
		},
		close: function(event, ui) { 
			$(this).remove()
		},
		closeOnEscape: false,
		modal: true,
		draggable: false,
		resizable: false
	});

	return dialogDone;
}
*/

//Click handlers and things to be run on ready state
$(document).ready(function(){

  //handle on-click functions
  $("#login").click(loginStart);
  $("#toAuditor").click(function() {window.location.href = '../auditor/auditor.html'});
  $("#go").click(authCheck);
  $("#submit").click(submitItems);
  $("#forgot").click(fixPassword);
  $("#restart").click(restart);
  $("#light").click(changeTheme);
  $("#dark").click(changeTheme);

  //if the new-items button is clicked
  $("#new").click(function(){
    newItems = true;
    $("#flowStart").slideUp('slow',function() {
      addItem();
    });
  });

  //if the existing-items button is clicked
  $("#existing").click(function() {
    newItems = false;
    $("#flowStart").slideUp('slow',function() {
      addItem();
    });
  });

  //if one of the global checkboxes is checked:
  $(".globalOn").click(globalOnChanged);

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

  //assign credentials to variable, clone row template, then remove
  credentials = $("#credentials");
  logButton = $("#login");
  auditButton = $("#toAuditor");
  goButton = $("#go");
  forgotButton = $("#forgot");
  submitButton = $("#submit");
  restartButton = $("#restart");
  existingItemRow = $(".existingItem").clone(true);
  newItemRow = $(".newItem").clone(true);
  keepGoingDialog();

  $(".hide").hide();
  $(".remove").remove();
});

