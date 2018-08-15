<?php
require_once __DIR__ . '/vendor/autoload.php';


define('APPLICATION_NAME', 'Google Calendar API PHP Quickstart');
define('CREDENTIALS_PATH', __DIR__ . '/.credentials/calendar-php-quickstart.json');
define('CLIENT_SECRET_PATH', __DIR__ . '/client_secret.json');
define('REFRESH_TOKEN_PATH', __DIR__ . '/.credentials/refreshtoken.json');
// If modifying these scopes, delete your previously saved credentials
// at /var/www/html/calendar/.credentials/calendar-php-quickstart.json
define('SCOPES', implode(' ', array(
  Google_Service_Calendar::CALENDAR_READONLY)
));

$calendarId = 'calendarIDToDrawFrom';


//if (php_sapi_name() != 'cli') {
//  throw new Exception('This application must be run on the command line.');
//}

/**
 * Returns an authorized API client.
 * @return Google_Client the authorized client object
 */
function getClient() {
  $client = new Google_Client();
  $client->setApplicationName(APPLICATION_NAME);
  $client->setScopes(SCOPES);
  $client->setAuthConfigFile(CLIENT_SECRET_PATH);
  $client->setAccessType('offline');

  // Load previously authorized credentials from a file.
  $credentialsPath = expandHomeDirectory(CREDENTIALS_PATH);
  $refreshTokenPath = expandHomeDirectory(REFRESH_TOKEN_PATH);
  if (file_exists($credentialsPath)) {
    $accessToken = unserialize(file_get_contents($credentialsPath));
    $refreshToken = unserialize(file_get_contents($refreshTokenPath));
  } else {
    // Request authorization from the user.
    $authUrl = $client->createAuthUrl();
    printf("Open the following link in your browser:\n%s\n", $authUrl);
    print 'Enter verification code: ';
    $authCode = trim(fgets(STDIN));

    // Exchange authorization code for an access token.
    $accessToken = $client->authenticate($authCode);
    // Store the credentials to disk.
    if(!file_exists(dirname($credentialsPath))) {
      mkdir(dirname($credentialsPath), 0700, true);
    }
    file_put_contents($refreshTokenPath, serialize($client->getRefreshToken()));
    file_put_contents($credentialsPath, serialize($accessToken));
    printf("Credentials saved to %s\n", $credentialsPath);
  }
  $client->setAccessToken($accessToken);
  // Refresh the token if it's expired.
  if ($client->isAccessTokenExpired()) {
    $client->refreshToken($refreshToken);
    file_put_contents($credentialsPath, serialize($client->getAccessToken()));
  }
  return $client;
}

/**
 * Expands the home directory alias '~' to the full path.
 * @param string $path the path to expand.
 * @return string the expanded path.
 */
function expandHomeDirectory($path) {
  $homeDirectory = getenv('HOME');
  if (empty($homeDirectory)) {
    $homeDirectory = getenv("HOMEDRIVE") . getenv("HOMEPATH");
  }
  return str_replace('~', realpath($homeDirectory), $path);
}


// Get the API client and construct the service object.
$client = getClient();
$service = new Google_Service_Calendar($client);

// Print the next 3 events on the user's calendar.
$optParams = array(
  'maxResults' => 3,
  'orderBy' => 'startTime',
  'singleEvents' => TRUE,
  'timeMin' => date('c'),
  'q' => 'WCDC',
);

$results = $service->events->listEvents($calendarId, $optParams);

if (count($results->getItems()) == 0) {
  print "No upcoming events found.\n";
} else {
  $count = 0;
  foreach ($results->getItems() as $event) {
    $start = $event->start->dateTime;
    if (empty($start)) {
      $start = $event->start->date;
    }
    $resultsArray = explode(" ",$event->getSummary());
    $start = substr($start, 0, strpos($start, "T"));
    $start = substr($start, strpos($start, "-") + 1);
//    echo "<p class='name'>" . $resultsArray[0] . "</p>" ;
//    echo "<p class='start'>" . $start . "</p>";
    $names[$count] = $resultsArray[0];
    $dates[$count] = $start;
    $count = $count + 1;
  }
//  echo "<p class='name'><b>Current:</b> " . $names[0] . "</p>";
//  echo "<p class='name'><b>On Deck:</b> " . $names[1] . " on " . $dates[1] . "</p>";  
}

//now go find the netops calendar
$optParams = array(
  'maxResults' => 3,
  'orderBy' => 'startTime',
  'singleEvents' => TRUE,
  'timeMin' => date('c'),
  'q' => 'Netops',
);

$results = $service->events->listEvents($calendarId, $optParams);

if (count($results->getItems()) != 0) {
  $count = 0;
  foreach ($results->getItems() as $event) {
    $netOpsStart = $event->start->dateTime;
    if (empty($netOpsStart)) {
      $netOpsStart = $event->start->date;
    }
    $resultsArray = explode(" ",$event->getSummary());
    $netOpsStart = substr($netOpsStart, strpos($netOpsStart, "-") + 1);
    $netOpsNames[$count] = $resultsArray[0];
    $netOpsDates[$count] = $netOpsStart;
    $count = $count + 1;
  } 
}

?>
