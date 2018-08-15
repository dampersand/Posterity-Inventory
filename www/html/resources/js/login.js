function onClick() {
  $.ajax({
    type: "POST",
    xhrFields: {
      withCredentials: true
    },
    headers: {
      'Authorization': 'Basic ' + btoa($("#user").val() + ':' + $("#password").val())
    },
    url: "resources/api/login.php?action=login",
    success:function(data) {
      data = $.parseJSON(data);
      if (data['success']) {
        window.location = finalLocation;
      } else {
        $("#user").val('');
        $("#password").val('');
        $(".login-card").effect("shake");
      }
    },
    error:function(data) {
      $("#user").val('');
      $("#password").val('');
      $(".login-card").effect("shake");
    }
  });
}

$(document).ready(function(){
  $("#user").keyup(function(event){
    if(event.keyCode == 13){
        $("#login").click();
    }
  });

  $("#password").keyup(function(event){
    if(event.keyCode == 13){
        $("#login").click();
    }
  });
});
