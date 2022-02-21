const args = process.argv.slice(2)
import config from 'config';
const config_all = config.get('All');
import { Client } from "@opensearch-project/opensearch" 
//Create OpenSearch Javascript Client (borrowed from Official code) 
"use strict"; //not sure
var host = config_all.dbConfig.host;
var protocol = config_all.dbConfig.protocol;
var port = config_all.dbConfig.port;
var auth = config_all.dbConfig.auth; 
const dividers = ["------","- - - - - - - - - - - - - - -"]
// Create a client with SSL/TLS enabled.
var client = new Client({
  node: protocol + "://" + auth + "@" + host + ":" + port,
  ssl: {
    rejectUnauthorized: false //not authorized yet
  },
});

var msg_index = config_all.index.msg;

if(args.length===1){
    var room_obj = room_query(args[0])
    var response = await query_document(msg_index, room_obj);
    response.forEach((e)=>{
        // var obj = {}
        var obj = e._source.payload
        // obj["text"] = data["text"]
        var fromInfo = obj.fromInfo.payload
        var fromName = fromInfo.name

        var d = new Date(obj.timestamp)
        var s = d.toLocaleTimeString()
        var ss = d.toLocaleDateString()
        // console.log(
        //     ss + " " + s + " " + obj.roomInfo.topic + " " +
        //     obj.fromInfo.payload.name +
        //     ":" +
        //     beautify(obj.text) + " "
        //   );
        console.log(e._source)
    })
}else{
    console.log("Args Error!")
}

function beautify(text){
    var a = text.split(dividers[0])
    var b = []
    for(var i=0; i<a.length; i++){
      var c = a[i].split(dividers[1])
      b = b.concat(c)
    }
    var d = b[b.length-1].split("\n")
    return d[d.length-1]
}
function room_query(room_name) { 
    var body = {
      sort: [
        { "payload.timestamp": { "order": "asc" } }
      ],
      size: 1000,
      query: {
        bool: {
          must: [
            {
              match: {
                "payload.roomInfo.topic.keyword": room_name
              }
            },
            {
              range: {
                "payload.timestamp": {
                //   gte: "now/d",
                //   lt: "now/s",
                  time_zone:"Asia/Shanghai"
                }
              }
            }
          ]
        }
      }
    }
    return body
}
async function query_document(index_name, query) {
    // Search for the document.
   
    var response = await client.search({
      index: index_name,
      body: query,
    });
    //  console.log("Search results:");
    //  console.log(response.body.hits.hits.length);
    return response.body.hits.hits;
}