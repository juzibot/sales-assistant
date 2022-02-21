

/*
    cycle: 1 min
    ASSERT: room_index will only be manually update 
        room_doc lifecycle: created in sales_bot when capture new room; and updated manually 
    
    check manual updates in [>1] mins (2 min?) time
    if modified and update, need to check all update throughout the downtime

    ASSERT now we have the right meta data of a group 
    
    calculate metric as usual  
    upload 
*/

import { client, config_all, vika } from './config-all.js'

var vika_datasheet_id = config_all.vika.todayRoom
var vika_allrooms_id = config_all.vika.allRooms
const datasheet = vika.datasheet(vika_datasheet_id);
const allRooms_datasheet = vika.datasheet(vika_allrooms_id);
var msg_index = config_all.index.msg;
var juzi_corp_name = config_all.corp.name
var name_index = config_all.index.name.index
var name_index_doc_id = config_all.index.name.docId
var room_index = config_all.index.room
var tolerate_time = config_all.updateCycleTime.updateVika
const dividers = ["------", "- - - - - - - - - - - - - - -"]


//VIKA Interaction: check the phase and check sales, post sales to be consistant 
var sales_list = await get_all_names(2)
var after_sales_list = await get_all_names(3)
var all_sales = sales_list.concat(after_sales_list)

var counter = 0
console.log("Now Starting..")
calculate_metric()
setInterval(() => {
  console.log("Now Update Vika..");
  console.log("Counter:", counter)
  counter += 1
  calculate_metric()

}, tolerate_time);


async function calculate_metric() {
  //ASSERT: calculate only today's metric, so the metric only depends on room, instead of in_charge and phase
  //in_charge might be "" ?
  await vika_upload_new_room()
  var rooms = await get_all_rooms(room_index) //must not duplicate
  console.log("room db length:", rooms.length)
  if (rooms.length === 0) {
    // console.log("Empty room!") 
    return
  } else if (Object.entries(rooms[0]).length === 0 && rooms[0].constructor === Object) {
    // console.log("Empty dictionary!") 
    return
  }
  sales_list = await get_all_names(2)
  after_sales_list = await get_all_names(3)
  all_sales = sales_list.concat(after_sales_list)
  var vika_total_csv_data = []
  //console.log(rooms)
  for (var room of rooms) {
    var room_obj = room_query(room["room_name"])
    var response = await query_document(msg_index, room_obj);
    if (response.length == 0) {
      //no action
    } else {
      //in_charge might be blank?
      var metric_obj = print_a_room(response, room["in_charge"]) //return all metrics in a room
      metric_obj["name"] = room["in_charge"]
      metric_obj["full_room_name"] = room["room_name"]
      metric_obj["room"] = regularize_room_name(room["room_name"])
      metric_obj["phase"] = room["phase"]
      vika_total_csv_data.push(metric_obj)
    }
  }
  //console.log(vika_total_csv_data)
  if (vika_total_csv_data.length > 0) { //must 
    await vika_export_customer_record(vika_total_csv_data)
  } else {
    console.error("NO RECORDS YET!")
    //Calculate Sales Total: need sales data! 
  }
}
function regularize_room_name(room_name) {
  var splitted_name = room_name.split('-')
  if (splitted_name.length !== 2) {
    return room_name
  } else {
    return splitted_name[1]
  }
}
//VIKA MODULE 
//DEV: if the entries are modified, then need to modify vika_headermap

var vika_headermap = [
  { id: 'name', title: '负责人' },
  { id: 'room', title: '群聊名' },
  { id: 'full_room_name', title: '完整群聊名' },
  { id: 'over2mins', title: '回复超过2分钟次数' },
  { id: 'avg', title: '平均回复时间（分钟）' },
  { id: 'total', title: '总回复数' },
  { id: 'in_charge_reply_num', title: '负责人总回复数' },
  { id: 'pre_sales_reply_num', title: '售前总回复数' },
  { id: 'after_sales_reply_num', title: '售后总回复数' },
  { id: 'emnum', title: '其他员工总回复数' },
  { id: 'cnum', title: '顾客总回复数' },
  { id: 'last_replier_type', title: '最后回复人类别' },
  { id: 'last_replier', title: '最后说话者' },
  { id: 'last_reply', title: '最后一句话' },
  { id: 'not_replied_time', title: '负责人未回覆时间（分钟）' },
  { id: 'phase', title: '群聊阶段' },
]

const vika_room_headermap = [
  { id: 'name', title: '负责人' },
  { id: 'room', title: '群聊名' },
  { id: 'full_room_name', title: '完整群聊名' },
  { id: 'phase', title: '群聊阶段' },
]
async function vika_upload_new_room() {

  var rooms = await get_all_rooms(room_index) //must not duplicate
  if (rooms.length === 0) {
    // console.log("Empty room!") 
    return
  } else if (Object.entries(rooms[0]).length === 0 && rooms[0].constructor === Object) {
    // console.log("Empty dictionary!") 
    return
  }
  //console.log("room db length:", rooms.length)
  var res = await allRooms_datasheet.records.query({
    pageSize: 1000
  })
  if (!res.success) {
    console.log("vika_export_all_rooms retrieve data not success!")
    return
  }
  var vika_rooms = res.data.records.map((e) => { return e.fields['完整群聊名'] })
  rooms = rooms.filter((e) => { return !vika_rooms.includes(e.room_name) })

  var datas = []
  for (var room of rooms) {
    var metric_obj = {}
    metric_obj["name"] = room["in_charge"]
    metric_obj["full_room_name"] = room["room_name"]
    metric_obj["room"] = regularize_room_name(room["room_name"])
    metric_obj["phase"] = room["phase"]
    datas.push(metric_obj)
  }

  var entries = []

  for (var data of datas) {
    var entry = {}
    for (let i of vika_room_headermap) {
      entry[i["title"]] = data[i["id"]]
    }
    entries.push({ "fields": entry })
  }
  create_vika(allRooms_datasheet, entries, 10, 30, 1000)
}
async function vika_export_customer_record(datas) {
  //DEPENDS ON: room_db, name_db
  //ASSERT: No Duplicated rooms. Otherwise duplicated rooms will be re-created
  //PROCESS: pull today's data, map records -> roomname; for each room in today's record, check whether it is in today. 
  //To see whether we should update or create
  var a3 = await datasheet.records.query({
    filterByFormula: `AND(NOT(BLANK()),IS_AFTER({上次更新时间}，TODAY()))`,
  })
  if (a3.success) {
    //console.log("succeeded queried",a3.data);
  } else {
    console.error(a3);
    return;
  }

  //ASSERT: No Duplicated rooms.
  var all_rooms = {}
  for (var rec of a3.data.records) {
    var key = rec["fields"]['群聊名']
    all_rooms[key] = rec
  }
  var entries = []
  var update_entries = []
  for (var data of datas) {
    var roomname = data["room"]
    var key = roomname
    if (Object.keys(all_rooms).includes(key)) { //Decide whether to update or create new VIKA record 
      var update_entry = {}
      for (let i of vika_headermap) { //transform object fields to VIKA fields
        update_entry[i["title"]] = data[i["id"]]
      }
      update_entries.push({ recordId: all_rooms[key]["recordId"], "fields": update_entry })
    } else { //create
      var entry = {}
      for (let i of vika_headermap) {
        entry[i["title"]] = data[i["id"]]
      }
      entries.push({ "fields": entry })
    }
  }

  //CREATE or UPDATE by batches 
  //the VIKA API upload frequency limit is 5times/sec
  //need to consider other process using the same API 
  //console.log(update_entries)
  create_vika(datasheet, entries, 10, 30, 1500)
  update_vika(datasheet, update_entries, 10, 30, 1500)
}

async function create_vika(vikasheet, data, batchSize, sleepInterval, sleepTime) {
  console.log("CREATE:", data.length, "entries")
  if (data.length > 0) {
    var upload = []
    for (var i in data) {
      //console.log(i)
      upload.push(data[i])
      if ((i % batchSize == (batchSize - 1)) || (i == data.length - 1)) {
        console.log("i==", i, "now creating...");
        await vikasheet.records.create(
          upload
        ).then(response => {
          if (response.success) {
            console.log("succeeded");
          } else {
            console.error(response);
          }
        })
        upload = []
      }
      if (i % sleepInterval == (sleepInterval - 1)) {
        sleep(sleepTime)
      }
    }
  }
  sleep(sleepTime)
}
async function update_vika(vikasheet, data, batchSize, sleepInterval, sleepTime) {
  console.log("UPDATE:", data.length, "entries")
  if (data.length > 0) {
    var upload = []
    for (var i in data) {
      //console.log(i)
      upload.push(data[i])
      if ((i % batchSize == (batchSize - 1)) || (i == data.length - 1)) {
        console.log("i==", i, "now update uploading...");
        await vikasheet.records.update(
          upload
        ).then(response => {
          if (response.success) {
            console.log("succeeded");
          } else {
            console.error(response);
          }
        })
        upload = []
      }
      if (i % sleepInterval == (sleepInterval - 1)) {
        sleep(sleepTime)
      }
    }
  }
  sleep(sleepTime)
}



function sleep(milliseconds) {
  const date = Date.now();
  let currentDate = null;
  do {
    currentDate = Date.now();
  } while (currentDate - date < milliseconds);
}


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
function print_a_room(response, in_charge, print_msg = false) {//ASSERT response length > 0 
  var to_reply = false;
  var to_reply_msg_time = new Date(); //not know whether null is ok? 
  var crit_2_mins_count = 0;
  const time_threshold_min = 2;
  var sum = 0.0;
  if (response.length === 0) {
    return ([0, 0, 0])
  }
  var cnum = 0, emnum = 0, pre_sales_num = 0, after_sales_num = 0, in_charge_reply_num = 0
  for (var k = 0; k < response.length; k++) { //for each message
    var obj = response[k]._source.payload;
    var d = new Date(obj.timestamp)
    var s = d.toLocaleTimeString()
    var ss = d.toLocaleDateString()

    //Calculate replies from different roles
    if (is_from_customer(response[k])) cnum += 1;
    if (is_from_pre_sales(response[k])) pre_sales_num += 1;
    else if (is_from_after_sales(response[k])) after_sales_num += 1;
    else if (is_from_employee(response[k])) emnum += 1;
    if (is_from_incharge(response[k], in_charge)) in_charge_reply_num += 1

    if (print_msg) {
      console.log(
        ss + " " + s + " " + obj.roomInfo.topic + " " +
        obj.fromInfo.payload.name +
        ":" +
        obj.text + " "
      );
    }

    //Calculate total delayed times 
    if (is_from_customer(response[k])) {
      if (to_reply === false) {
        //console.log("1st from customer ")
        to_reply = true;
        to_reply_msg_time = d
      }
    } else {
      if (to_reply === true) {
        //console.log("1st reply")
        to_reply = false
        var replied_msg_time_sec = (d - to_reply_msg_time) / 1000  //this - is ok? 
        //console.log("replied: "+replied_msg_time)
        //console.log("replied: "+Math.floor(replied_msg_time_sec/60)+" minutes and "+replied_msg_time_sec%60+" sec")
        if (replied_msg_time_sec > time_threshold_min * 60) {
          crit_2_mins_count += 1;
        }
        sum += replied_msg_time_sec;
      }
    }
  }

  //Calculate current reply context
  var last_replier, not_replied_time, last_replier_type
  var last_reply = response[response.length - 1]._source.payload.text;
  for (var k = response.length - 1; k >= 0; k--) {
    var replier = response[k]._source.payload.fromInfo.payload.name
    if (!is_from_customer(response[k]) && k == response.length - 1) {
      //console.log("**Last replier is sales or employee! GOOD!")
      last_replier = "句子员工:" + replier
      last_replier_type = "句子员工"
      not_replied_time = 0
      break;
    }
    else if (!is_from_customer(response[k])) {
      var obj = response[k + 1]._source.payload;
      var d = new Date(obj.timestamp)
      var now = new Date()
      var s = d.toLocaleTimeString()
      var ss = d.toLocaleDateString()
      not_replied_time = ((now - d) / 1000 / 60).toFixed(2)  //this - is ok? 
      //console.log("**NOT REPLIED TIME:", not_replied_time)
      //switch cases: if in 10,20,...alert, else not alert 
      //    if(not_replied_time > time_threshold_min * 60 * 1000){
      //         crit_2_mins_count+=1; 
      //     }    
      last_replier = "客户:" + response[k + 1]._source.payload.fromInfo.payload.name
      last_replier_type = "客户"
      break;
    }
    if (is_from_customer(response[k]) && k == 0) {
      var obj = response[k]._source.payload;
      var d = new Date(obj.timestamp)
      var now = new Date()
      var s = d.toLocaleTimeString()
      var ss = d.toLocaleDateString()
      not_replied_time = ((now - d) / 1000 / 60).toFixed(2)
      last_replier = "客户:" + replier
      last_replier_type = "客户"
    }
  }

  // Save results into object
  var metric_obj = {}
  metric_obj["over2mins"] = crit_2_mins_count
  metric_obj["avg"] = parseFloat((sum / response.length / 60).toFixed(2))
  metric_obj["total"] = response.length
  metric_obj["in_charge_reply_num"] = in_charge_reply_num
  metric_obj["pre_sales_reply_num"] = pre_sales_num
  metric_obj["after_sales_reply_num"] = after_sales_num
  metric_obj["emnum"] = emnum
  metric_obj["cnum"] = cnum
  metric_obj["last_replier_type"] = [last_replier_type]
  metric_obj["last_reply"] = beautify(last_reply)
  metric_obj["last_replier"] = last_replier
  metric_obj["last_reply"] = beautify(last_reply)
  metric_obj["not_replied_time"] = parseFloat(not_replied_time)
  return metric_obj
}

function is_from_customer(msg) {
  return msg._source.payload.fromInfo.payload.corporation !== juzi_corp_name //not employee
}
function is_from_incharge(msg, in_charge) {
  return in_charge === msg._source.payload.fromInfo.payload.name
}

function is_from_pre_sales(msg) {
  return sales_list.includes(msg._source.payload.fromInfo.payload.name)
}
function is_from_after_sales(msg) {
  return after_sales_list.includes(msg._source.payload.fromInfo.payload.name)
}
function is_from_employee(msg) {
  return (msg._source.payload.fromInfo.payload.corporation === juzi_corp_name) //is employee
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
async function get_all_names(option) {
  //1:all,2:sales,3:post_sales
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

function beautify(text) {
  var a = text.split(dividers[0])
  var b = []
  for (var i = 0; i < a.length; i++) {
    var c = a[i].split(dividers[1])
    b = b.concat(c)
  }
  var d = b[b.length - 1].split("\n")
  return d[d.length - 1]
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
                gte: "now/d",
                lt: "now/s",
                time_zone: "Asia/Shanghai"
              }
            }
          }
        ]
      }
    }
  }
  return body
}

process.on('uncaughtException', err => {
  console.error(err && err.stack)
});
