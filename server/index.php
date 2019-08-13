<?php
//error_reporting(E_ERROR);
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Access-Control-Allow-Origin: *');
header("Access-Control-Allow-Credentials: true");
header('Access-Control-Allow-Methods: GET, PUT, POST, DELETE, OPTIONS');
header('Access-Control-Max-Age: 1000');
header('Access-Control-Allow-Headers: Origin, Content-Type, X-Auth-Token , Authorization');
header('Content-Type: application/json');

use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;

include "lib/tbController.php";

require 'vendor/autoload.php';
require_once 'lib/mysqliSingleton.php';
require_once 'lib/mysql.php';

$settings =  [
  'settings' => [
    'displayErrorDetails' => true,
  ],
];

$app = new \Slim\App($settings);
//$app = new \Slim\App;

const STATE_INIT = 0;
const STATE_FLY = 1;
const STATE_SPIN = 2;
const STATE_TOGGLE_SNOW = 3;
const STATE_GOTO_START = 4;
const STATE_GOTO_SUMMIT = 5;
const STATE_FOCUS_PLAYER = 6;
const STATE_MOVE_PLAYER = 7;

$GLOBALS['db_server'] = 'localhost';
$GLOBALS['db_user'] = 'root';
$GLOBALS['db_pass'] = 'root';
$GLOBALS['db_name'] = 'tb_event';

if (getenv("CLEARDB_DATABASE_URL")) {
  $url = parse_url(getenv("CLEARDB_DATABASE_URL"));

  $GLOBALS['db_server'] = $url["host"];
  $GLOBALS['db_user'] = $url["user"];
  $GLOBALS['db_pass'] = $url["pass"];
  $GLOBALS['db_name'] = substr($url["path"], 1);
}
else {
  $dotenv = Dotenv\Dotenv::create(__DIR__);
  $dotenv->load();  
}

$app->get('/', function (Request $request, Response $response) {
  echo 'Mountain Rush Event Controller<br/>';
});

$app->get('/controlstate', function (Request $request, Response $response) {  
  $jsonResponse = getControllerStateFromDB();

  return $response->withJSON($jsonResponse);  
});

$app->post('/controlstate', function (Request $request, Response $response) {
  $jsonResponse = array();

  $json = $request->getBody();
  $data = json_decode($json, true); 

  setControllerStateInDB($data['state']);

  return $response->withJSON($jsonResponse);
});

$app->run();
