<?php
require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/../elasticsearch-php/elasticsearch.php';

define('TICKETS_JSON',__DIR__ . '/tickets.json');
define('ROW_COUNTER',__DIR__ . '/rowcounter');
define('APPLICATION_NAME', 'Google Sheets API PHP Quickstart');
define('CREDENTIALS_PATH', __DIR__ . '/.credentials/sheets-php-quickstart.json');
define('CLIENT_SECRET_PATH', __DIR__ . '/client_secret.json');
define('REFRESH_TOKEN_PATH', __DIR__ . '/.credentials/refreshtoken.json');
// If modifying these scopes, delete your previously saved credentials
// at .credentials/tickets-php-quickstart.json
define('SCOPES', implode(' ', array(
  Google_Service_Sheets::SPREADSHEETS_READONLY)
));

if (php_sapi_name() != 'cli') {
  throw new Exception('This application must be run on the command line.');
}

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
$service = new Google_Service_Sheets($client);


//tries to get data from DC Work Form spreadsheet
//EDITOR'S NOTE: this was a spreadsheet set up in a specific fashion.
$spreadsheetId = 'spreadsheetIDhere';
$lastrow = file_get_contents(ExpandHomeDirectory(ROW_COUNTER));

//set ES params
$params = [
  'index' => 'tickets',
  'type' => '1',
  'body' => []
];



//get everything after the last row
$range = 'Form Responses 1!C' . strval(intval($lastrow) + 1) . ':N' . strval(intval($lastrow) + 11);
$response = $service->spreadsheets_values->get($spreadsheetId, $range);
$values = $response->getValues();

//check each row's value. [0] = servername  [7] = scheduled task Y/N, [8] = start time, [9] = end time, [10] = timezone, [11] = datacenter
if ($values > 0) {
  foreach ($values as $row) {

    $lastrow = strval(intval($lastrow) + 1);
    if ($row[7] == "No") {continue;}
    $params['body'] = [];
    $params['body']['server'] = $row[0];
    $params['body']['start'] = DateTime::createFromFormat('m/d/Y H:i:s', $row[8])->format('Y-m-d H:i:s');
    $params['body']['end'] = DateTime::createFromFormat('m/d/Y H:i:s', $row[9])->format('Y-m-d H:i:s');
    $params['body']['record'] = 1;
    $params['body']['TZ'] = $row[10];
    if (strpos($row[11], 'IAD1') !== false) {
      $params['body']['location'] = 'IAD1';
    } elseif (strpos($row[11], 'IAD2') !== false) {
      $params['body']['location'] = 'IAD2';
    } else {
      $params['body']['location'] = 'LAX1';
    }

    $response = $ES->index($params);


  }
  file_put_contents(ExpandHomeDirectory(ROW_COUNTER), $lastrow);
}

?>
