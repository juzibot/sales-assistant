

/*
    if deleted vika room, nothing happen, will create again
    if existed room and modified 'incharge,phase' 
    will update these two 
    ** considering add 'cancel overtime' function, to push a blank msg as sales reply

    READ: vika:room.incharge,phase; room_db
    WRITE: room_db.incharge,phase, name_db
    0. set cycle time
    1. pull all today's vikaroom
    2. pull all room_db, name_db
    3. for each vikaroom, if not in room_db then error -> NOT Consider now 
        check validity: incharge-phase consistency && incharge-sales consistency 
    4. update_room (room,phase,incharge)
*/

import { client, vika, config_all } from './config-all.js'
import * as fs from 'fs'

var vika_datasheet_id = config_all.vika.todayRoom
const datasheet = vika.datasheet(vika_datasheet_id);
var vika_allrooms_id = config_all.vika.allRooms
const allRooms_datasheet = vika.datasheet(vika_allrooms_id);
var systemLogSheet = config_all.vika.systemLog
const systemLog = vika.datasheet(systemLogSheet)

var msg_index = config_all.index.msg;
var juzi_corp_name = config_all.corp.name
var name_index = config_all.index.name.index
var name_index_doc_id = config_all.index.name.docId
var room_index = config_all.index.room
var tolerate_time = config_all.updateCycleTime.vika2Db
var backup_id = config_all.index.backup_id

var sales_list = await get_all_names(2)
var after_sales_list = await get_all_names(3)

var counter = 0
console.log("Now Starting..")
vika_update_roomdb()

setInterval(() => {
    console.log("Now Pulling Vika Data and update roomdb..");
    console.log("Counter:", counter)
    counter += 1
    vika_update_roomdb()
}, tolerate_time);

async function vika_update_roomdb() {

    sales_list = await get_all_names(2)
    after_sales_list = await get_all_names(3)
    //retrieve db and vika rooms
    var db_rooms = await get_all_rooms(room_index) //must not duplicate
    var db_room_dict = {}
    if (db_rooms._source === undefined || db_rooms._source.length === 0) {
        console.log("Still No Rooms!")
        return
    }
    for (var db_room of db_rooms) db_room_dict[regularize_room_name(db_room._source["room_name"])] = db_room
    var db_room_names = db_rooms.map((e) => { return regularize_room_name(e._source["room_name"]) })

    var vika_rooms = await get_vika_rooms(allRooms_datasheet) //ASSERT a3.data.total <= 1000
    var today_vika_rooms = await get_vika_rooms(datasheet, true) //ASSERT a3.data.total <= 1000
    if (vika_rooms == undefined) {
        console.log("get_vika_rooms FAILED")
        return
    }
    if (today_vika_rooms == undefined) {
        console.log("get today's vika_rooms FAILED")
        return
    }

    //match vika's rooms with db's 
    var update_entries = []
    var vika_update_rooms = []
    var system_log_entries = []
    //Check All Room's Update 
    for (var vika_room of vika_rooms) {
        var valid = false
        var update_entry = { recordId: vika_room["recordId"], "fields": { "系统信息": [] } }
        var system_log_entry = { "fields": {} }
        if (!db_room_names.includes(vika_room.fields['群聊名'])) {//Check room existence
            update_entry["fields"]["系统信息"].push("房间不存在") //NEED: delete
            update_entries.push(update_entry)
        }
        else {//Check phase-in_charge consistency
            if (vika_room.fields['群聊阶段'] === 'pre-sales') {
                if (sales_list.includes(vika_room.fields["负责人"])) {//valid
                    vika_update_rooms.push(vika_room)
                    valid = true
                    update_entry["fields"]["系统信息"].push("合法")
                    update_entries.push(update_entry)
                }
                else {
                    update_entry["fields"]["系统信息"].push("负责人非售前")
                    update_entries.push(update_entry)
                }
            }
            else if (vika_room.fields['群聊阶段'] === 'after-sales') {
                if (after_sales_list.includes(vika_room.fields["负责人"])) {//valid
                    if (vika_room.fields['核准进入售后阶段'] === true) {
                        vika_update_rooms.push(vika_room)
                        valid = true
                        update_entry["fields"]["系统信息"].push("已成功更新至售后阶段")
                        update_entries.push(update_entry)
                    } else {
                        update_entry["fields"]["系统信息"].push("等待管理员核准")
                        update_entries.push(update_entry)
                    }
                }
                else {
                    update_entry["fields"]["系统信息"].push("负责人非售后")
                    update_entries.push(update_entry)
                }
            } else {
                update_entry["fields"]["系统信息"].push("群聊阶段不存在") //NEED: delete
                update_entries.push(update_entry)
            }
        }
        if (valid == true) {
            var room = vika_room.fields['群聊名']
            var old_name = db_room_dict[room]._source['in_charge']
            var new_name = vika_room.fields["负责人"]

            if (old_name !== new_name) {
                await change_room(old_name, new_name, room)
            }
        } else {
            // console.log('NOT_VALID',vika_room)
            var room = vika_room.fields['群聊名']
            var old_name = db_room_dict[room]._source['in_charge']
            var update_time = vika_room.fields['上次更新时间']
            var now = new Date()
            // console.log("NOW - Last modified = ",now,vika_room.fields['上次更新时间'],now-vika_room.fields['上次更新时间'])
            if (vika_room.fields['上次更新时间'] > now - tolerate_time) {
                system_log_entry['fields']['群聊名'] = room
                system_log_entry['fields']['负责人'] = old_name
                system_log_entry['fields']['上次更新时间'] = update_time
                system_log_entry["fields"]["系统信息"] = update_entry["fields"]["系统信息"]
                system_log_entries.push(system_log_entry)
                // console.log("SomeBody Modified and it is wrong:",system_log_entry)
            }
        }
    }

    var today_update_entries = []
    for (var today_room of today_vika_rooms) {
        //Clean timeout: push a blank msg in the group
        var update_entry = { recordId: today_room["recordId"], "fields": { "系统信息": [] } }
        if (today_room.fields['消除未回覆记录'] === true) {
            var mm = JSON.parse(fs.readFileSync('utils/msgobj.json'))
            mm.payload.fromInfo.payload.corporation = juzi_corp_name
            mm.payload.fromInfo.payload.name = today_room.fields["负责人"]
            mm.payload.roomInfo.topic = today_room.fields['完整群聊名']
            mm.payload.timestamp = new Date()
            mm.payload.text = 'blank bubble'
            await put_msg(msg_index, JSON.stringify(mm)); //id in ES and in wechat is the same 
            update_entry["fields"]["系统信息"].push("已消除延迟记录") //NEED: delete
            update_entry["fields"]["消除未回覆记录"] = false
        }
        today_update_entries.push(update_entry)
    }

    //console.log(today_update_entries)
    console.log("updating today:", today_update_entries.length)
    await vika_update(today_update_entries, datasheet)

    //make sure write_db operation is save
    console.log("updating dbroom:", vika_update_rooms.length)
    await db_room_update(vika_update_rooms, db_room_dict)

    //push system message
    console.log("updating all rooms:", update_entries.length)
    await vika_update(update_entries, allRooms_datasheet)

    //case: 希望增加新的Vika表，存系統信息紀錄
    console.log("updating system log:", system_log_entries.length)
    create_vika(systemLog, system_log_entries, 10, 30, 1500)
    //['系统信息','时间','操作内容']


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

async function change_room(old_name, new_name, room) {
    var value = await client.get({
        id: name_index_doc_id,
        index: name_index
    })
    value = value.body._source
    await put_document(name_index, JSON.stringify(value), backup_id)

    var names = Object.keys(value)
    //console.log("NAMES:",names,"old name:",old_name,"new name:",new_name)
    if (!names.includes(old_name)) {
        console.log("change_name error: no old name!")
        return
    }
    if (!names.includes(old_name)) {
        console.log("change_name error: no new name!")
        return
    }

    var old_index = value[old_name]['all_rooms'].indexOf(room)
    if (old_index === -1) {
        console.log("change_name error: no room in old name!")
        return
    }
    var new_index = value[new_name]['all_rooms'].indexOf(room)
    if (new_index !== -1) {
        console.log("change_name error: room existed in new name!")
        return
    }

    value[old_name]['all_rooms'].splice(old_index, 1)
    value[new_name]['all_rooms'].push(room)
    console.log('after', JSON.stringify(value, null, 4))
    put_document(name_index, JSON.stringify(value), name_index_doc_id)
}
function regularize_room_name(room_name) {
    var splitted_name = room_name.split('-')
    if (splitted_name.length !== 2) {
        return room_name
    } else {
        return splitted_name[1]
    }
}
async function db_room_update(rooms, db_room_dict) { //DANGEROUS!
    //console.log(db_room_dict)
    for (var room of rooms) {
        var room_name = room.fields['群聊名']
        var source = db_room_dict[room_name]._source
        source["phase"] = room.fields['群聊阶段']
        source["in_charge"] = room.fields['负责人']
        var id = db_room_dict[room_name]._id
        put_document(room_index, source, id)
    }
}
async function put_document(index_name, document, id) {
    // Add a document to the index.
    //console.log("Adding document1:");
    var response = await client.index({
        id: id,
        index: index_name,
        body: document,
        refresh: true,
    });
}
async function put_msg(index_name, document) {
    // Add a document to the index.
    console.log("Adding msg:");
    var response = await client.index({
        index: index_name,
        body: document,
        refresh: true,
    });
}
async function vika_update(update_entries, sheet) {
    console.log("UPDATE:", update_entries.length, "entries")

    if (update_entries.length > 0) {
        var upload_update_entries = []
        for (var i in update_entries) {
            //console.log(i)
            upload_update_entries.push(update_entries[i])
            if ((i % 10 == 9) || (i == update_entries.length - 1)) {
                console.log("i==", i, "now update uploading...");
                await sheet.records.update(
                    upload_update_entries
                ).then(response => {
                    if (response.success) {
                        console.log("succeeded");
                    } else {
                        console.error(response);
                    }
                })
                upload_update_entries = []
            }
            if (i % 30 == 29) {
                sleep(1000)
            }
        }
    }
}

function sleep(milliseconds) {
    const date = Date.now();
    let currentDate = null;
    do {
        currentDate = Date.now();
    } while (currentDate - date < milliseconds);
}

async function get_vika_rooms(sheet, today = false) { //LIMIT: update only 1000 rooms, if a3.data.total > 1000, need to move to next page until no results
    var a3
    if (today) {
        a3 = await sheet.records.query({
            filterByFormula: `AND(NOT(BLANK()),IS_AFTER({上次更新时间}，TODAY()))`,
            pageSize: 1000
        })
    } else {
        a3 = await sheet.records.query({
            pageSize: 1000
        })
    }

    if (a3.success) {
        //console.log("succeeded queried", a3.data.records);
    } else {
        console.error(a3);
        return;
    }
    return a3.data.records
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
    return response.body.hits.hits
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

process.on('uncaughtException', err => {
    console.error(err && err.stack)
})
