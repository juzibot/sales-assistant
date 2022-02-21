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
var room_index = config_all.index.room
var rooms = await get_all_rooms(room_index)
console.log(rooms)
async function get_all_rooms(room_index) {
    // Search for the document.
    var query = {
        query: {
        match_all: {
        },
        },
    };
    var response = await client.search({
        index: room_index,
        body: query,
        size: 1000,
    });
    var r = []
    response.body.hits.hits.forEach((e) => {
        r.push(e._source)
    });
    return r
}