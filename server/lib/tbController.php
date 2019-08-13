<?php
include 'vendor/autoload.php';

function setControllerStateInDB($state) {
  // use UTC date
  date_default_timezone_set("UTC");
  $dtNow = date('Y-m-d H:i:s', time());

  $db = mysqliSingleton::init();
  $strSQL = 'UPDATE controller SET state = ' . $state . ', created = "' . $dtNow . '"';
  $db->query($strSQL);
}

function getControllerStateFromDB() {
  $db = mysqliSingleton::init();
  $strSQL = 'SELECT state, created FROM controller';
  $result = $db->query($strSQL);
  $rows = array();
  $index = 0;
  while ( $row = $result->fetch_array(MYSQLI_ASSOC) ) {
    $rows[$index] = $row;
    $index++;
  }

  return $rows;
}