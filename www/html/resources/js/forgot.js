var datacenterList = ["LAX1", "IAD1", "IAD2"];

function onClick() {

  if ($('#pass1').val() !== $('#pass2').val()) {
    $("#pass1").val('');
    $("#pass2").val('');
    $(".login-card").effect("shake");
    return;
  }

  var outputJSON = new Object;
  outputJSON['password'] = $("#pass1").val();

  $.ajax({
    type: "POST",
    xhrFields: {
      withCredentials: true
    },
    headers: {
      'Authorization': 'Basic ' + btoa($("#user").val() + ':' + $("#key").val())
    },
    url: "resources/api/confirmreset.php",
    data: outputJSON,
    success:function(data) {
      data = $.parseJSON(data);
      if (data['success']) {
        alert("Password successfully reset!  Click OK to be redirected to the inventory frontend.")
        window.location = "https://" + locale + "-inventory.domain.net/inventory/inventory.html";
      } else {
        $("#user").val('');
        $("#key").val('');
        $(".login-card").effect("shake");
      }
    },
    error:function(data) {
        console.log(data);
      $("#user").val('');
      $("#key").val('');
      $(".login-card").effect("shake");
    }
  });
}

$(document).ready(function(){

  //figure out where the caller is calling from
  $.ajax({
    type: "GET",
    url: "resources/api/locale.php",
    async: false,
    success:function(data) {
      //seems like a newline winds up at the end of this.  kill it.
      locale = data.replace(/(\r\n|\n|\r)/gm,"");
    },
    error:function(data) {
      locale = window.location.href.substring(window.location.href.indexOf("//") + 2, window.location.href.indexOf("-")).toUpperCase();
      if (datacenterList.indexOf(locale) < 0) {
        locale = 'LAX1';
      } 
    }
  });

  $("#user").keyup(function(event){
    if(event.keyCode == 13){
        $("#login").click();
    }
  });

  $("#key").keyup(function(event){
    if(event.keyCode == 13){
        $("#login").click();
    }
  });

  $("#pass1").keyup(function(event){
    if(event.keyCode == 13){
        $("#login").click();
    }
  });

  $("#pass2").keyup(function(event){
    if(event.keyCode == 13){
        $("#login").click();
    }
  });
});
