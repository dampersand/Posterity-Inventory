<?php

//if you don't have a cookie, go log in.  A false cookie will get caught by auth anyway.
if (!isset($_COOKIE['Inventoken'])) {
  header("Location: login.html");
  exit();
}
?>

<!doctype html>
<html lang="en">

<head>
  <link rel="stylesheet" type="text/css" href=resources/css/hud.css>
  <script src="https://code.jquery.com/jquery-3.1.0.min.js"
                integrity="sha256-cCueBR6CsyA4/9szpPfrX3s49M9vUU5BgtiJj06wt/s="
                crossorigin="anonymous">
  </script>
  <script type='text/javascript' src='//cdn.jsdelivr.net/jquery.marquee/1.4.0/jquery.marquee.min.js'></script>
  <script src="resources/js/location.js"></script>
  <script src="resources/js/hud.js"></script>
  <title>IMH Inventory HUD</title>

</head>

<body>
  <div id="columnWrapper">
    <div class="column" id="left">
      <div id="serverTable" class="table">
        <div class="row header purple">
          <div class="cell">
            Type
          </div>
          <div class="cell">
            Ready
          </div>
          <div class="cell">
            Action
          </div>
        </div>
        <div class = "row">
          <div class = "cell">
            CC2000
          </div>
          <div id = "cc2000Ready" class = "cell">
          </div>
          <div id = "cc2000Action" class = "cell">
          </div>
        </div>
        <div class = "row">
          <div class = "cell">
            CC1000
          </div>
          <div id = "cc1000Ready" class = "cell">
          </div>
          <div id = "cc1000Action" class = "cell">
          </div>
        </div>
        <div class = "row">
          <div class = "cell">
            CC500
          </div>
          <div id = "cc500Ready" class = "cell">
          </div>
          <div id = "cc500Action" class = "cell">
          </div>
        </div>
        <div class = "row">
          <div class = "cell">
            Elite
          </div>
          <div id = "eliteReady" class = "cell">
          </div>
          <div id = "eliteAction" class = "cell">
          </div>
        </div>
        <div class = "row">
          <div class = "cell">
            Advanced
          </div>
          <div id = "advReady" class = "cell">
          </div>
          <div id = "advAction" class = "cell">
          </div>
        </div>
        <div class = "row">
          <div class = "cell">
            Essential
          </div>
          <div id = "essReady" class = "cell">
          </div>
          <div id = "essAction" class = "cell">
          </div>
        </div>
      </div>
      <div class="table" id="thresholdTable">
        <div class="row header red">
          <div class="cell">Item</div>
          <div class="cell">Curr</div>
          <div class="cell">Thresh</div>
        </div>
        <div class="row threshTemplate">
          <div class="cell item"></div>
          <div class="cell current"></div>
          <div class="cell threshold"></div>
        </div>
      </div>
    </div>
    <div class="column" id="center">
      <div class="table" id="ticketTable">
        <div class="row header green">
          <div class="cell">Actionable Server</div>
          <div class="cell">Maintenance Window Start</div>
          <div class="cell">Maintenance Window End</div>
        </div>
        <div class="row ticketTemplate">
          <div class="cell server"></div>
          <div class="cell start"></div>
          <div class="cell end"></div>
        </div>
      </div>
      <div class="table" id="trackingTable">
        <div class="row header blue">
          <div class="cell">Tracking Number</div>
          <div class="cell">Items</div>
          <div class="cell">Location</div>
          <div class="cell">ETA</div>
          <div class="cell">Status</div>
        </div>
        <div class="row trackTemplate">
          <div class="cell track"></div>
          <div class="cell items"></div>
          <div class="cell location"></div>
          <div class="cell eta"></div>
          <div class="cell status"></div>
        </div>
      </div>
    </div>
    <div class="column" id="right">
      <div id="clock" class="widget">
        <div id="clockText" class="widgetText"></div>
      </div>
      <div id="calendar" class="widget">
        <div id="dow" class="widgetText"></div>
        <div id="dom" class="widgetText"></div>
        <div id="year" class="widgetText"></div>
      </div>
      <div id="oncall" class="widget">
        <div id="oncalltitle">
          <div id="oncalltitleleft" class="widgetText">On&nbsp</div>
          <div id="oncalltitleright" class="widgetText">Call</div>
        </div>
        <div id="oncallnow">
          <div id="oncallnowleft" class="widgetText">Now:</div>
          <div id="oncallnowright" class="widgetText"></div>
        </div>
        <div id="oncallnext">
          <div id="oncallnextleft" class="widgetText"></div>
          <div id="oncallnextright" class="widgetText"></div>
        </div>
        <div id="oncallnetops">
          <div id="oncallnetopsleft" class="widgetText"></div>
          <div id="oncallnetopsright" class="widgetText"></div>
        </div>
      </div>
      <div id="nonrevenue" class="widget">
        <div id="nonRevenueTitle" class="widgetText">Non-Revenue Servers</div>
        <div id="nonRevenueText" class="widgetText"></div>
      </div>
    </div>
  </div>
</body>

