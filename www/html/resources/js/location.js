var locale;
var datacenterList = ["LAX1", "IAD1", "IAD2"];

locale = window.location.href.substring(window.location.href.indexOf("//") + 2, window.location.href.indexOf("-")).toUpperCase();

if (datacenterList.indexOf(locale) < 0) {

  $.ajax({
    type: "GET",
    url: "resources/api/locale.php",
    async: false,
    success:function(data) {
      //seems like a newline winds up at the end of this.  kill it.
  	  locale = data.replace(/(\r\n|\n|\r)/gm,"");
    },
    error:function(data) {
      alert('Unable to determine locale!  Please report this bug to an inventory admin!\n\nI will assume you are operating out of LAX1.  If this is not the case, stop now and have an admin manually make your inventory changes.');
    }
  });

}