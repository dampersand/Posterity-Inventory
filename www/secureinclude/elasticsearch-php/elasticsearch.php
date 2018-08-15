<?php

require_once '/var/www/secureinclude/elasticsearch-php/vendor/autoload.php';

$ESHost = [
  'localhost:9200'
];

$ES = Elasticsearch\ClientBuilder::create()->setHosts($ESHost)->build();

?>
