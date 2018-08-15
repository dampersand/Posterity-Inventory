//Global Variables Section
var reportRow;
var column;
var filterOption;
var database = new Object;


//functions and helpers
function errorHandle(data) { //living function for handling errors

  //code 15 is invalid token, redirect to login
  if (data['code'] == 15) {
    alert('Error: Authentication has expired.  Please log in again.');
    window.location ='https://' + locale + 'inventory.domain.net/reporter/login.html';
  } else if (data['code'] == 16) {
    alert('Error: No authentication provided.  Please log in again.');
    window.location ='https://' + locale + 'inventory.domain.net/reporter/login.html';
  } else if (data['code'] == 24) {
    alert("Error: Database failed to handle search due to an overload.  I'm going to reload the page, and then you can do a few things:\n\n1. Try the search again\n\n2. Try a smaller search\n\n3. If an inventory admin is handy, have them increase the search queue_size at the bottom of elasticsearch.yml.");
    location.reload();
  }
}

function clone(obj) { //thank you javascript for not allowing me to deep-clone an object.  This clones the STRUCTURE of an object, but not its keys
  if(obj == null || typeof(obj) != 'object') {
    return obj;
  }

  var temp = new obj.constructor(); 
  for(var key in obj) {
    temp[key] = clone(obj[key]);
  }

  return temp;
}

//function I yoinked off stack overflow to sort an object YEAAAAAAAH
//see http://stackoverflow.com/questions/9658690/is-there-a-way-to-sort-order-keys-in-javascript-objects
function orderKeys(obj, expected) {

  var keys = Object.keys(obj).sort(function keyOrder(k1, k2) {
      if (k1 < k2) return -1;
      else if (k1 > k2) return +1;
      else return 0;
  });

  var i, after = {};
  for (i = 0; i < keys.length; i++) {
    after[keys[i]] = obj[keys[i]];
    delete obj[keys[i]];
  }

  for (i = 0; i < keys.length; i++) {
    obj[keys[i]] = after[keys[i]];
  }
  return obj;
}

//super concise function I yoinked off of stack overflow to add zeroes to an object.
//https://stackoverflow.com/questions/3605214/javascript-add-leading-zeroes-to-date
function str_pad(n) {
    return String("00" + n).slice(-2);
}

function initializeDatabase() { //function for initializing the 'database' variable of categories and keywords
  var outputJSON = new Object;
  outputJSON['index'] = 'items';

  //ask 'getall'
  $.ajax({
    type: "POST",
    data: outputJSON,
    url: "resources/api/getall.php",
    success:function(data) {
      if (!$.parseJSON(data)['success']) {
        errorHandle($.parseJSON(data));
      } else {
        data = $.parseJSON(data);
        var keyword;
        var category;

        //initialize database variable
        $.each(data['data'], function(index, value) {
          category = value['_source']['category'];
          keyword = value['_source']['keyword'];

          //protect against category collisions (unlikely for keywords, but one line is cheap)
          if (!(category in database)) {
            database[category] = new Object;
          }
          if (!(keyword in database[category])) {
            database[category][keyword] = new Object;
          }
        });

        database = orderKeys(database);
        $.each(database, function(category) {
          database[category] = orderKeys(database[category]);
        });
        buildFilterTable();
      }
    },
    error:function(data) {
      var outputData = $.parseJSON(data.responseText);
      errorHandle(outputData);
    }
  });
}

//takes all info from the database variable and rebuilds the filter table.
function buildFilterTable() {
  $(".column").remove();

  var workingCatColumn = column.clone();
  var workingCatInput;
  var workingKeyColumn = column.clone();
  var workingKeyInput;

  //add categories
  $.each(database, function(category) {
    if (category == "") {
      return true;
    }
    workingCatInput = filterOption.clone();
    workingCatInput.find("input").val(category);
    workingCatInput.find("label").text(category);
    workingCatColumn.append(workingCatInput);

    //append if the column gets too long
    if (workingCatColumn.find(".filteroption").length > 19) {
      $("#categories").append(workingCatColumn);
      workingCatColumn = column.clone();
    }

    //while working on categories, also add keywords
    $.each(database[category], function(keyword) {
      if (keyword == "") {
        return true;
      }
      workingKeyInput = filterOption.clone();
      workingKeyInput.find("input").val(keyword);
      workingKeyInput.find("label").text(keyword);
      workingKeyColumn.append(workingKeyInput);

      //append if the column gets too long
      if (workingKeyColumn.find(".filteroption").length > 19) {
        $("#keywords").append(workingKeyColumn);
        workingKeyColumn = column.clone();
      }
    });

    //if there's nothing in the workingcolumn, but there is at least one column already, don't append.
    if (!(workingKeyColumn.find(".filteroption").length < 1 && $("#keywords").find(".column").length > 0)) {
      $("#keywords").append(workingKeyColumn);
    }
  });

  //if there's nothing in the workingcolumn, but there is at least one column already, don't append.
  if (!(workingCatColumn.find(".filteroption").length < 1 && $("#categories").find(".column").length > 0)) {
    $("#categories").append(workingCatColumn);
  }

  //add statuses
  var statuses = ['Dead','Ready','RMA','Test','Unknown','Used'];
  var workingStatInput;
  var workingStatColumn = column.clone();

  $.each(statuses, function(index, status) {
    workingStatInput = filterOption.clone();
    workingStatInput.find("input").val(status);
    workingStatInput.find("label").text(status);
    workingStatColumn.append(workingStatInput);
  });

  $("#statuses").append(workingStatColumn);

  //add locations
  var locations = ['LAX1','IAD1','IAD2'];
  var workingLocationInput;
  var workingLocationColumn = column.clone();

  $.each(locations, function(index, location) {
    workingLocationInput = filterOption.clone();
    workingLocationInput.find("input").val(location);
    workingLocationInput.find("label").text(location);
    workingLocationColumn.append(workingLocationInput);
  });

  $("#locations").append(workingLocationColumn);

  //add click handlers
  $("#categories").find("input").change(categoryCheck);
}

function showFilterTable() {

  $("#popuptable").dialog({
    modal: true,
    width: $("#main").width()/1.5,
    title: 'Filter Selection'
  });
  $("#popuptable").show();
}

//function that should be called on category input field change
function categoryCheck() {
  var category = $(this).val();

  if (this.checked){
    $.each(database[category], function(keyword) {
      $("#keywords").find(".filteroption :input[value='" + keyword + "']").prop('checked',true);
    });
  } else {
    $.each(database[category], function(keyword) {
      $("#keywords").find(".filteroption :input[value='" + keyword + "']").prop('checked',false);
    });
  }
}


function generateReport() { //function for populating the 'report' variable with things that are missing
  var requestedStartDate = $("#startdate").val();
  var requestedEndDate = $("#enddate").val();
  if (requestedStartDate.match(/[a-z]/i) || requestedEndDate.match(/[a-z]/i) || requestedStartDate == "" || requestedEndDate == "") {
    alert('Please enter a date range to search on.');
    return true;
  }
  var outputJSON = new Object;
  var newSearch = new Object;
  var deadSearch = new Object;
  var count = 0; //wouldn't it be nice if php accepted arrays properly and I could just push on an array instead of using a dumbass object?

  //turn off button to prevent multiclicking.  This is a big search, if we double it up, we overwhelm the server.
  //when we eventually upgrade to a bigger server and build another node or two, this should stop being a problem.
  $("#generate").css("pointer-events", "none");
  $("#spinContainer").show();

  $.each($("#keywords").find('.filteroption :input:checked'), function(keyIndex, keyCheckbox) {
    $.each($("#statuses").find('.filteroption :input:checked'), function(statIndex, statCheckbox) {
      var keyword = $(keyCheckbox).val();
      var status = $(statCheckbox).val();
      newSearch = new Object;
      newSearch['index'] = 'serial';
      newSearch['parameters'] = new Object;
      newSearch['parameters']['match'] = new Object;
      newSearch['parameters']['match']['keyword'] = keyword;

      var locCount = 0;
      $.each($("#locations").find('.filteroption :input:not(:checked)'), function(locIndex, locCheckbox){
        var location = $(locCheckbox).val();
        if (!('not' in newSearch['parameters'])) {
          newSearch['parameters']['not'] = new Object;
          newSearch['parameters']['not']['terms'] = new Object;
          newSearch['parameters']['not']['terms']['location'] = new Object;
        }
        newSearch['parameters']['not']['terms']['location'][locCount] = location;
        locCount = locCount + 1;
      });

      newSearch['nested'] = new Object;
      newSearch['nested']['path'] = 'history'
      newSearch['nested']['parameters'] = new Object;
      newSearch['nested']['parameters']['match'] = new Object;
      newSearch['nested']['parameters']['match']['status'] = status;
      newSearch['nested']['parameters']['range'] = new Object;
      newSearch['nested']['parameters']['range']['date'] = new Object;
      newSearch['nested']['parameters']['range']['date']['gte'] = requestedStartDate;
      newSearch['nested']['parameters']['range']['date']['lte'] = requestedEndDate;
      newSearch['nested']['parameters']['not'] = new Object;
      newSearch['nested']['parameters']['not']['match'] = new Object;
      newSearch['nested']['parameters']['not']['match']['prevStatus'] = status;
      outputJSON[count] = new Object;
      outputJSON[count] = newSearch;
      count = count + 1;

      //also duplicate the search on the 'dead' index.  Only I can't just set newSearch['index'] = dead, because js hates cloning objects
      deadSearch = new Object;
      deadSearch['index'] = 'dead';
      deadSearch['parameters'] = new Object;
      deadSearch['parameters']['match'] = new Object;
      deadSearch['parameters']['match']['keyword'] = keyword;

      locCount = 0;
      $.each($("#locations").find('.filteroption :input:not(:checked)'), function(locIndex, locCheckbox){
        var location = $(locCheckbox).val();
        if (!('not' in deadSearch['parameters'])) {
          deadSearch['parameters']['not'] = new Object;
          deadSearch['parameters']['not']['terms'] = new Object;
          deadSearch['parameters']['not']['terms']['location'] = new Object;
        }
        deadSearch['parameters']['not']['terms']['location'][locCount] = location;
        locCount = locCount + 1;
      });
      deadSearch['nested'] = new Object;
      deadSearch['nested']['path'] = 'history'
      deadSearch['nested']['parameters'] = new Object;
      deadSearch['nested']['parameters']['match'] = new Object;
      deadSearch['nested']['parameters']['match']['status'] = status;
      deadSearch['nested']['parameters']['range'] = new Object;
      deadSearch['nested']['parameters']['range']['date'] = new Object;
      deadSearch['nested']['parameters']['range']['date']['gte'] = requestedStartDate;
      deadSearch['nested']['parameters']['range']['date']['lte'] = requestedEndDate;
      deadSearch['nested']['parameters']['not'] = new Object;
      deadSearch['nested']['parameters']['not']['match'] = new Object;
      deadSearch['nested']['parameters']['not']['match']['prevStatus'] = status;
      outputJSON[count] = new Object;
      outputJSON[count] = deadSearch;
      count = count +1;
    });
  });


  //send this massive search to msearch.php
  $.ajax({
    type: "POST",
    data: outputJSON,
    url: "resources/api/msearch.php",
    success:function(data) {
      $("#generate").css("pointer-events", "auto");
      if (!$.parseJSON(data)['success']) {
        errorHandle($.parseJSON(data));
      } else {
        //three line parse because for some reason parseJSON(data['data']['responses']) won't fly.  probably something to do with objects vs arrays.
        data = $.parseJSON(data);
        data = data['data']['responses'];
        buildReportTable(data);
      }

    },
    error:function(data) {
      $("#generate").css("pointer-events", "auto");
      $("#spinContainer").hide();
      console.log(data.responseText)
    } 
  });
}

function buildReportTable(responses) {
  $(".reportrow").remove();

  //create row keywords/categories based on the checked filters
  //there was probably a better way to do this, but I've rewritten this a million times now.  Screw it, brute force.
  $.each(database, function(category) {
    $.each(database[category], function(keyword) {
      if ($("#keywords").find(".filteroption :input[value='" + keyword + "']").prop('checked')) {
        var workingRow = reportRow.clone();
        workingRow.find(".keyword").text(keyword);
        workingRow.find(".category").text(category);
        workingRow.find("td").not(".keyword").not(".category").text("")
        $.each($("#statuses").find(".filteroption :checked"), function(statIndex, statCheckbox) {
          workingRow.find("." + $(statCheckbox).val()).text('0');
        });
        workingRow.prop('id', keyword);
        $("#reporttable").append(workingRow);
      }
    });
  });

  //good, now that that's out of the way, we can start parsing data.
  $.each(responses, function(responseIndex) { //for each keyword/status search

    //handle a 'too damn big search' error.  This is what I get for running off an aero
    if (!('hits' in responses[responseIndex])) {
      var data = new Object;
      data['code'] = 24;
      errorHandle(data);
      return false;
    }

    //skip no-hits
    if (responses[responseIndex]['hits']['total'] == 0) {
      return true;
    }

    var keyword = responses[responseIndex]['hits']['hits'][0]['_source']['keyword'];
    var status = responses[responseIndex]['hits']['hits'][0]['inner_hits']['history']['hits']['hits'][0]['_source']['status'];
    var total = 0;

    $.each(responses[responseIndex]['hits']['hits'], function(totalsIndex) {
      total = total + parseInt(responses[responseIndex]['hits']['hits'][totalsIndex]['inner_hits']['history']['hits']['total']);
    });

    $("#" + keyword).find("." + status).text(total + parseInt($("#" + keyword).find("." + status).text()));

  });

  //finally, hide the loading spinner.
  $("#spinContainer").hide();

}

//Click handlers and things to be run on ready state
$(document).ready(function(){

  reportRow = $(".reportrow").clone(true);
  filterOption = $(".filteroption").clone(true);
  column = $(".column").clone(true);

  $("#startdate").inputmask('datetime', {
    mask: "y-2-1 h:s:s",
    placeholder: "yyyy-mm-dd hh:mm:ss",
    leapday: "-02-29",
    separator: "-",
    alias: "mm/dd/yyyy hh:mm xm"
  });

  $("#enddate").inputmask('datetime', {
    mask: "y-2-1 h:s:s",
    placeholder: "yyyy-mm-dd hh:mm:ss",
    leapday: "-02-29",
    separator: "-",
    alias: "mm/dd/yyyy hh:mm xm"
  });

  var today = new Date();

  $("#startdate").val((today.getFullYear()-1) + '-' + str_pad(today.getMonth()+1) + '-' + str_pad(today.getDate()) + ' ' + str_pad(today.getHours()) + ':' + str_pad(today.getMinutes()) + ':' + str_pad(today.getSeconds()))
  $("#enddate").val(today.getFullYear() + '-' + str_pad(today.getMonth()+1) + '-' + str_pad(today.getDate()) + ' ' + str_pad(today.getHours()) + ':' + str_pad(today.getMinutes()) + ':' + str_pad(today.getSeconds()))

  $("#filters").click(showFilterTable);
  $("#generate").click(generateReport);
  $(".remove").remove();
  $(".hide").hide();

  initializeDatabase();
});
