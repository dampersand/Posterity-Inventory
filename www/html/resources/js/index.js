
function changeHrefs() {
  locale = $("#location").val();
  $("#inventoryFrontend").attr('href', 'https://' + locale + '-inventory.domain.net/inventory');
  $("#adminFrontend").attr('href', 'https://' + locale + '-inventory.domain.net/admin');
  $("#auditor").attr('href', 'https://' + locale + '-inventory.domain.net/auditor');
  $("#reporter").attr('href', 'https://' + locale + '-inventory.domain.net/reporter');
  $("#hud").attr('href', 'https://' + locale + '-inventory.domain.net/hud');
}


$(document).ready(function(){

  //add hrefs
  $("#inventoryFrontend").attr('href', 'https://' + locale + '-inventory.domain.net/inventory');
  $("#adminFrontend").attr('href', 'https://' + locale + '-inventory.domain.net/admin');
  $("#auditor").attr('href', 'https://' + locale + '-inventory.domain.net/auditor');
  $("#reporter").attr('href', 'https://' + locale + '-inventory.domain.net/reporter');
  $("#hud").attr('href', 'https://' + locale + '-inventory.domain.net/hud');

  $("#location").change(changeHrefs);

});
