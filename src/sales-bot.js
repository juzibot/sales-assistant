/**
 * Sales Assistant
 */
import 'dotenv/config.js'
import {
  WechatyBuilder,
  ScanStatus,
  log,
} from 'wechaty'
import qrcodeTerminal from 'qrcode-terminal'

import { client, config_all } from './config-all.js'

const index_name = config_all.index.msg;
const juzi_corp_name = config_all.corp.name
const name_index = config_all.index.name.index
const name_index_doc_id = config_all.index.name.docId
const room_index = config_all.index.room
const backup_id = config_all.index.name.backup


const bot = WechatyBuilder.build({
  name: 'Sales-Assistant-Bot',
  puppet: 'wechaty-puppet-service',
  puppetOptions: {
    token: config_all.WechatyToken,
  }
})


async function put_document(index_name, document, id) {
  // Add a document to the index.
  const response = await client.index({
    id: id,
    index: index_name,
    body: document,
    refresh: true,
  });
  console.log("Adding document:");
  console.log(response.body);
}

function onScan(qrcode, status) {
  if (status === ScanStatus.Waiting || status === ScanStatus.Timeout) {
    qrcodeTerminal.generate(qrcode, { small: true })  // show qrcode on console

    const qrcodeImageUrl = [
      'https://wechaty.js.org/qrcode/',
      encodeURIComponent(qrcode),
    ].join('')

    log.info('StarterBot', 'onScan: %s(%s) - %s', ScanStatus[status], status, qrcodeImageUrl)

  } else {
    log.info('StarterBot', 'onScan: %s(%s)', ScanStatus[status], status)
  }
}

function onLogin(user) {
  log.info('StarterBot', '%s login', user)
}

function onLogout(user) {
  log.info('StarterBot', '%s logout', user)
}

// TEST:  individuals; group: create new room, get old room; 
// ASSERT: for any group with sales-bot, there is one sales. 
async function onMessage(msg) {
  log.info('StarterBot', msg.toString());
  console.log("MSG:", msg.toString())
  msg._payload.fromInfo = rename_payload(msg.from());

  var room_name
  if (msg.room() == null) { //Not a group
    msg._payload.roomInfo = {};
    msg._payload.toInfo = rename_payload(msg.to());
    room_name = msg.from().name()
  } else {
    room_name = await msg.room().topic();
    var rooms = await get_a_room(room_index, room_name)
    if (rooms.length > 1) { // > 1 ,
      console.log("ROOM EXCEED 1! total rooms:", rooms.length)
    } else if (rooms.length == 0) {
      // ASSERT: the sales and after_sales is correct in the name_index
      // Create New Room
      // search for ROLES: sales, after_sales, employees 
      // Assert sales phase is presales

      var room_obj = {}
      var sales_list = await get_all_names(2)
      var after_sales_list = await get_all_names(3)
      console.log("NAMES:", sales_list, after_sales_list)

      var searched_sales = []
      var searched_after_sales = []
      var employees = []
      var memberList = await msg.room().memberAll(); //Contact[]
      for (var i = 0; i < memberList.length; i++) {
        var j = memberList[i].name()
        var memcorp = await memberList[i].corporation();
        if (memcorp === juzi_corp_name) {
          if (sales_list.includes(j)) {
            searched_sales.push(j)
          }
          if (after_sales_list.includes(j)) {
            searched_after_sales.push(j)
          }
          employees.push(j)
        }
      }

      room_obj["sales"] = searched_sales
      room_obj["after_sales"] = searched_after_sales
      room_obj["employee"] = employees
      room_obj["room_name"] = room_name
      room_obj["phase"] = "pre-sales"
      if (searched_sales.length > 0) {
        room_obj["in_charge"] = searched_sales[0]
        add_room(searched_sales[0],room_name)
      }else{
        room_obj["in_charge"] = undefined
        add_room("undefined",room_name)
      }
      console.log("New Room:", room_obj)
      var response = await client.index({
        index: room_index,
        body: room_obj,
        refresh: true,
      });
      console.log("Adding document:");
      
      console.log(response.body);
    }
    msg._payload.toInfo = {};
    var new_room = rename_payload(msg.room());
    new_room.topic = room_name;
    msg._payload.roomInfo = new_room;
  }
  //save msg in OpenSearch
  var new_msg = rename_payload(msg);
  console.log("NEW:",new_msg)
  //fs.writeFileSync('msgobj.json', JSON.stringify(new_msg));
  log.info('StarterBot', 'after\n' + JSON.stringify(new_msg));
  put_document(index_name, JSON.stringify(new_msg), new_msg.id); //id in ES and in wechat is the same 
}

function rename_payload(obj) {
  //ASSERT obj has _payload field 
  var new_obj = JSON.parse(JSON.stringify(obj));
  new_obj.payload = JSON.parse(JSON.stringify(obj._payload));
  delete new_obj._payload;
  return new_obj;
}


async function add_room(name,room){
  var value = await client.get({
      id: name_index_doc_id,
      index: name_index
    })
    value = value.body._source
  await put_document(name_index,JSON.stringify(value),backup_id)

  var names = Object.keys(value)
  if(!names.includes(name)){
    console.log("add_room error: no name!")
    return 
  } 

  var rooms = value[name]['all_rooms']
  if(rooms.includes(room)){
    console.log("add_room error: already has room!")
    return 
  }

  value[name]['all_rooms'].push(room)
  //console.log('after',JSON.stringify(value,null,4))
  await put_document(name_index,JSON.stringify(value),name_index_doc_id)
}

async function get_a_room(room_index, room_name) {
  var qq = {
    size: 1000,
    query: {
      match: {
        "room_name.keyword": room_name
      },
    }
  }
  var response = await client.search({
    index: room_index,
    body: qq,
  })
  response.body.hits.hits.forEach((e)=>{console.log(e._source)})
  return response.body.hits.hits
}

async function get_all_names(option) {
  //1:all, 2:sales, 3:post_sales
  var value = await client.get({
    id: name_index_doc_id,
    index: name_index
  })
  var source = value.body._source
  if (option == 1) {
    return Object.keys(source)
  } else if (option == 2) {
    var r = []
    Object.keys(source).forEach((e) => {
      if (source[e]['role'] === "sales") r.push(e)
    })
    return r
  } else if (option == 3) {
    var r = []
    Object.keys(source).forEach((e) => {
      if (source[e]['role'] === "after_sales") r.push(e)
    })
    return r
  }
}

bot.on('scan', onScan)
bot.on('login', onLogin)
bot.on('logout', onLogout)
bot.on('message', onMessage)

bot.start()
  .then(async () => {
    log.info('Sales-Assistant', 'Sales-Assistant Bot Started.')
  })
  .catch(e => {
    log.error('Sales-Assistant', e)
    process.exit(55)
  })
var mycard =  {
  "config": {
    "wide_screen_mode": true
  },
  "elements": [
    {
      "tag": "markdown",
      "content": ""
    }
  ],
  "header": {
    "template": "orange",
    "title": {
      "content": "",
      "tag": "plain_text"
    }
  }
}

process.on('uncaughtException', err => {
  console.error(err && err.stack)
  process.exit(1)
})
