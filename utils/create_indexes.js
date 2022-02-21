import config from 'config';
const config_all = config.get('All');
import { Client } from "@opensearch-project/opensearch";
"use strict"
var host = config_all.dbConfig.host;
var protocol = config_all.dbConfig.protocol;
var port = config_all.dbConfig.port;
var auth = config_all.dbConfig.auth;

var msg_index = config_all.index.msg;
var name_index = config_all.index.name.index
var name_index_doc_id = config_all.index.name.docId
var room_index = config_all.index.room
console.log("Putting indexes:",msg_index,room_index,name_index)
var client = new Client({
  node: protocol + "://" + auth + "@" + host + ":" + port,
  ssl: {
    rejectUnauthorized: false
  },
});

async function create_index(index_name) {
  //given msg object, turn into JSON, and save in Opensearch DB, return? 
  var response = await client.indices.create({
    index: index_name,
  });
  console.log("Creating index:");
  console.log(response.body);

  var response = await client.index({
    id: name_index_doc_id,
    index: index_name,
    body: {},
  })
  console.log("Creating doc:");
  console.log(response.body);
}

async function delete_index(index_name) {
    //given msg object, turn into JSON, and save in Opensearch DB, return? 
    var response = await client.indices.delete({
        index: index_name,
    });
    console.log("Deleting index:");
    console.log(response.body);
}
create_index(msg_index) //to save wechat msg
create_index(name_index) //to save room list
create_index(room_index) //to save sales list 