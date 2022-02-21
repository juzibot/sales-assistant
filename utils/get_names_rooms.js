

import config from 'config';
const config_all = config.get('All');
import { Client } from "@opensearch-project/opensearch" 
//Create OpenSearch Javascript Client (borrowed from Official code) 
"use strict"; //not sure
var host = config_all.dbConfig.host;
var protocol = config_all.dbConfig.protocol;
var port = config_all.dbConfig.port;
var auth = config_all.dbConfig.auth; 


// Create a client with SSL/TLS enabled.

var client = new Client({
  node: protocol + "://" + auth + "@" + host + ":" + port,
  ssl: {
    rejectUnauthorized: false //not authorized yet
  },
});

var name_index = config_all.index.name.index
var name_index_doc_id = config_all.index.name.docId

get_all_names()
async function get_all_names() {
    //1:all,2:sales,3:post_sales
    var value = await client.get({
        id: name_index_doc_id,
        index: name_index
    })
    var source = value.body._source
    console.log(source)
}