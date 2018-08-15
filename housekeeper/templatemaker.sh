#!/bin/bash

year=$(date +%G)

curl -XPUT localhost:9200/items/ -d '{"mappings": {"_default_": {
"dynamic_templates": [ {
  "keyword_template": {
    "match":"keyword", 
    "mapping": {
      "type":"string","index":"not_analyzed" 
    }
  }
},{
  "label_template": {
    "match":"label", 
    "mapping": {
      "type":"string","index":"not_analyzed" 
    }
  }
},{
  "threshold_template": {
    "match":"threshold", 
    "mapping": {
      "type":"nested"
    }
  }
},{
  "amount_template": {
    "match":"amount", 
    "mapping": {
      "type":"nested"
    }
  }
},{
  "amount_child_template": {
  	"path_match": "amount.*",
    "mapping": {
      "type":"integer"
    }
  }
},{
  "threshold_child_template": {
  	"path_match": "threshold.*",
    "mapping": {
      "type":"integer"
    }
  }
},{
  "category_template": {
    "match":"category", 
    "mapping": {
      "type":"string", "index":"not_analyzed" 
    }
  }
},{
  "threshTrouble_template": {
    "match":"thresholdTrouble", 
    "mapping": {
      "type":"nested" 
    }
  }
},{
  "threshTrouble__child_template": {
    "match":"thresholdTrouble.*", 
    "mapping": {
      "type":"boolean" 
    }
  }
},{
  "ordered_template": {
    "match":"ordered", 
    "mapping": {
      "type":"nested"
    }
  }
},{
  "ordered_child_template": {
    "match":"ordered.*", 
    "mapping": {
      "type":"boolean"
    }
  }
},{
  "record_template": {
    "match":"record", 
    "mapping": {
      "type":"integer" 
    }
  }
},{
  "lastEmail_template": {
    "match":"lastEmail", 
    "mapping": {
      "type":"nested"
    }
  }
},{
  "lastEmail_child_template": {
    "match":"lastEmail", 
    "mapping": {
      "type":"date", "format":"yyyy-MM-dd HH:mm:ss" 
    }
  }
},{
  "lastAudited_template": {
    "match":"lastAudited", 
    "mapping": {
      "type":"nested" 
    }
  }
},{
  "lastAudited_child_template": {
  	"path_match": "lastAudited.*",
    "mapping": {
      "type":"date", "format":"yyyy-MM-dd" 
    }
  }
},{
  "lastAuditor_template": {
    "match":"lastAuditor", 
    "mapping": {
      "type":"nested" 
    }
  }
},{
  "lastAuditor_child_template": {
  	"path_match": "lastAuditor.*",
    "mapping": {
      "type":"string", "index":"not_analyzed" 
    }
  }
},{
  "priceHistory_template": {
    "match": "priceHistory",
    "mapping": {
      "type":"nested"
    }
  }
},{
  "date_template": {
    "match": "date",
    "mapping": {
      "type":"date","format":"yyyy-MM-dd HH:mm:ss"
    }
  }
},{
  "price_template": {
    "match": "price",
    "mapping": {
      "type":"float"
    }
  }
}

]}}}'

curl -XPUT localhost:9200/deleted/

curl -XPUT localhost:9200/oldbuilds/

curl -XPUT localhost:9200/errors-$year/ -d '{"mappings": {"_default_": {
"dynamic_templates": [ {
  "flag_template": {
    "match":"flag", 
    "mapping": {
      "type":"string" 
    }
  }
},{
  "user_template": {
    "match":"user", 
    "mapping": {
      "type":"string", "index":"not_analyzed" 
    }
  }
},{
  "call_template": {
    "match":"call", 
    "mapping": {
      "type":"string", "index":"not_analyzed" 
    }
  }
},{
  "subcall_template": {
    "match":"subcall", 
    "mapping": {
      "type":"string","index":"not_analyzed" 
    }
  }
}
]}}}'

curl -XPUT localhost:9200/tracks/ -d '{"mappings": {"_default_": {
"dynamic_templates": [ {
  "num_template": {
    "match":"num", 
    "mapping": {
      "type":"string", "index":"not_analyzed" 
    }
  }
},{
  "label_template": {
    "match":"label", 
    "mapping": {
      "type":"string" 
    }
  }
},{
  "record_template": {
    "match":"record", 
    "mapping": {
      "type":"integer" 
    }
  }
},{
  "location_template": {
    "match":"location", 
    "mapping": {
      "type":"string" 
    }
  }
},{
	  "locale_template": {
    "match":"locale", 
    "mapping": {
      "type":"string" 
    }
  }
},{
  "status_template": {
    "match":"status", 
    "mapping": {
      "type":"string", "index":"not_analyzed" 
    }
  }
},{
  "carrier_template": {
    "match":"carrier", 
    "mapping": {
      "type":"string", "index":"not_analyzed" 
    }
  }
},{
  "eta_template": {
    "match":"eta", 
    "mapping": {
      "type":"date","format":"yyyy-MM-dd" 
    }
  }
}
]}}}'

curl -XPUT localhost:9200/tickets/ -d '{"mappings": {"_default_": {
"dynamic_templates": [ {
  "server_template": {
    "match":"server", 
    "mapping": {
      "type":"string", "index":"not_analyzed" 
    }
  }
},{
  "start_template": {
    "match":"start", 
    "mapping": {
      "type":"date", "format":"yyyy-MM-dd HH:mm:ss"  
    }
  }
},{
  "record_template": {
    "match":"record", 
    "mapping": {
      "type":"integer" 
    }
  }
},{
  "location_template": {
    "match":"location", 
    "mapping": {
      "type":"string" 
    }
  }
},{
  "tz_template": {
    "match":"TZ", 
    "mapping": {
      "type":"string", "index":"not_analyzed"  
    }
  }
},{
  "end_template": {
    "match":"end", 
    "mapping": {
      "type":"date", "format":"yyyy-MM-dd HH:mm:ss"  
    }
  }
}
]}}}'

curl -XPUT localhost:9200/users/ -d '{"mappings": {"_default_": {
"dynamic_templates": [ {
  "user_template": {
    "match":"user", 
    "mapping": {
      "type":"string", "index":"not_analyzed" 
    }
  }
},{
  "hash_template": {
    "match":"hash", 
    "mapping": {
      "type":"string", "index":"no"  
    }
  }
},{
  "dTime_template": {
    "match":"dTime", 
    "mapping": {
      "type":"date", "format":"yyyy-MM-dd HH:mm:ss"  
    }
  }
},{
  "email_template": {
    "match":"email", 
    "mapping": {
      "type":"string", "index":"no"  
    }
  }
},{
  "recovery_template": {
    "match":"recovery", 
    "mapping": {
      "type":"string", "index":"no"  
    }
  }
},{
  "distress_template": {
    "match":"distressFlag", 
    "mapping": {
      "type":"boolean"  
    }
  }
},{
  "record_template": {
    "match":"record", 
    "mapping": {
      "type":"integer" 
    }
  }
},{
  "permission_template": {
    "match":"permission", 
    "mapping": {
      "type":"integer"  
    }
  }
}

]}}}'
curl -XPUT localhost:9200/indices/ -d '{"mappings": {"_default_": {
"dynamic_templates": [ {
  "name_template": {
    "match":"name", 
    "mapping": {
      "type":"string", "index":"not_analyzed"
    }
  }
},{
  "permission_template": {
    "match":"permission", 
    "mapping": {
      "type":"integer"  
    }
  }
}
]}}}'

curl -XPUT localhost:9200/dead/ -d '{"mappings": {"_default_": {
"dynamic_templates": [ {
  "serial_template": {
    "match":"serial", 
    "mapping": {
      "type":"string", "index":"not_analyzed" 
    }
  }
},{
  "keyword_template": {
    "match":"keyword", 
    "mapping": {
      "type":"string", "index":"not_analyzed"  
    }
  }
},{
  "history_template": {
    "match":"history", 
    "mapping": {
      "type":"nested" 
    }
  }
},{
  "date_template": {
    "match":"date",
    "mapping": {
      "type":"date", "format":"yyyy-MM-dd HH:mm:ss"
    }
  }
},{
  "location_template": {
    "match":"location", 
    "mapping": {
      "type":"string", "index":"not_analyzed" 
    }
  }
},{
  "user_template": {
    "match":"user",
    "mapping": {
      "type":"string"
    }
  }
},{
  "note_template": {
    "match":"note",
    "mapping": {
      "type":"string"
    }
  }
},{
  "status_template": {
    "match":"status",
    "mapping": {
      "type":"string"
    }
  }
},{
  "record_template": {
    "match":"record",
    "mapping": {
      "type":"integer"
    }
  }
},{
  "price_template": {
    "match":"price",
    "mapping": {
      "type":"float"
    }
  }
},{
  "pFlag_template": {
    "match":"pFlag",
    "mapping": {
      "type":"boolean"
    }
  }
}
]}}}'

curl -XPUT localhost:9200/serial/ -d '{"mappings": {"_default_": {
"dynamic_templates": [ {
  "serial_template": {
    "match":"serial", 
    "mapping": {
      "type":"string", "index":"not_analyzed" 
    }
  }
},{
  "keyword_template": {
    "match":"keyword", 
    "mapping": {
      "type":"string", "index":"not_analyzed"  
    }
  }
},{
  "history_template": {
    "match":"history", 
    "mapping": {
      "type":"nested" 
    }
  }
},{
  "date_template": {
    "match":"date",
    "mapping": {
      "type":"date", "format":"yyyy-MM-dd HH:mm:ss"
    }
  }
},{
  "location_template": {
    "match":"location", 
    "mapping": {
      "type":"string", "index":"not_analyzed" 
    }
  }
},{
  "user_template": {
    "match":"user",
    "mapping": {
      "type":"string"
    }
  }
},{
  "note_template": {
    "match":"note",
    "mapping": {
      "type":"string"
    }
  }
},{
  "status_template": {
    "match":"status",
    "mapping": {
      "type":"string"
    }
  }
},{
  "record_template": {
    "match":"record",
    "mapping": {
      "type":"integer"
    }
  }
},{
  "price_template": {
    "match":"price",
    "mapping": {
      "type":"float"
    }
  }
},{
  "pFlag_template": {
    "match":"pFlag",
    "mapping": {
      "type":"boolean"
    }
  }
}
]}}}'

curl -XPUT localhost:9200/builds/ -d '{"mappings": {"_default_": {
"dynamic_templates": [ {
  "builder_template": {
    "match":"builder", 
    "mapping": {
      "type":"string", "index":"not_analyzed" 
    }
  }
},{
  "server_template": {
    "match":"server", 
    "mapping": {
      "type":"string", "index":"not_analyzed"  
    }
  }
},{
  "model_template": {
    "match":"model", 
    "mapping": {
      "type":"string", "index":"not_analyzed"  
    }
  }
},{
  "buildnotes_template": {
    "match":"buildnotes", 
    "mapping": {
      "type":"string", "index":"not_analyzed" 
    }
  }
},{
  "builddate_template": {
    "match":"builddate",
    "mapping": {
      "type":"date", "format":"yyyy-MM-dd"
    }
  }
},{
  "qcdate_template": {
    "match":"qcdate",
    "mapping": {
      "type":"date", "format":"yyyy-MM-dd"
    }
  }
},{
    "editdate_template": {
    "match":"editdate",
    "mapping": {
      "type":"date", "format":"yyyy-MM-dd"
    }
  }
},{
  "location_template": {
    "match":"location", 
    "mapping": {
      "type":"string", "index":"not_analyzed" 
    }
  }
},{
  "checker_template": {
    "match":"qcer",
    "mapping": {
      "type":"string", "index":"not_analyzed"
    }
  }
},{
  "qcnotes_template": {
    "match":"qcnotes",
    "mapping": {
      "type":"string", "index":"not_analyzed"
    }
  }
},{
  "qcstatus_template": {
    "match":"qcstatus",
    "mapping": {
      "type":"string"
    }
  }
},{
  "history_template": {
    "match":"history", 
    "mapping": {
      "type":"nested" 
    }
  }
},{
  "editor_template": {
    "match":"history", 
    "mapping": {
      "type":"string", "index":"not_analyzed" 
    }
  }
},{
  "record_template": {
    "match":"record",
    "mapping": {
      "type":"integer"
    }
  }
}
]}}}'