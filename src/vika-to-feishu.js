
import { client, config_all, vika } from './config-all.js'

var vika_datasheet_id = config_all.vika.todayRoom
const datasheet = vika.datasheet(vika_datasheet_id);
//LARK PUPPET
import { PuppetLark } from 'wechaty-puppet-lark-2'
import { Feishu } from 'lark-js-sdk';

let lark = new Feishu(config_all.lark.appId, config_all.lark.appKey);

const cycle_time = config_all.lark.cycle_time
const tolerate_time = config_all.updateCycleTime.vika2Feishu
var sales2chat = config_all.lark.sales2chat
var channels = config_all.lark.channels
var is_developing = config_all.lark.is_developing
var sales_alert = config_all.lark.salesAlert
var after_sales_alert = config_all.lark.afterSalesAlert
var alert_group = config_all.lark.channels.alert_group

const puppet = new PuppetLark({
    larkServer: {
        port: config_all.lark.serverPort,
    },
})

puppet.start().catch(async e => {
    console.error('Bot start() fail:', e)
    // await puppet.stop()
    process.exit(-1)
})

async function puppet_start() {
    console.log("HIIII")
    vika_to_feishu()
    setInterval(() => {
        vika_to_feishu()
    }, tolerate_time);
}

async function get_vika_rooms() { //LIMIT: update only 1000 rooms, if a3.data.total > 1000, need to move to next page until no results
    var a3 = await datasheet.records.query({
        filterByFormula: `AND(NOT(BLANK()),IS_AFTER({上次更新时间}，TODAY()))`,
        pageSize: 1000
    })
    if (a3.success) {
        console.log("succeeded queried");
    } else {
        console.error(a3);
        return;
    }
    return a3.data.records
}

async function vika_to_feishu() {

    var vika_rooms = await get_vika_rooms() //ASSERT a3.data.total <= 1000
    if (vika_rooms == undefined) {
        console.log("get_vika_rooms FAILED")
        return
    }
    vika_rooms = vika_rooms.map((e) => {
        return e.fields
    })

    // console.log(color_level[y.toString()])
    // return

    for (var vika_room of vika_rooms) {
        //ASSERT: if last replier is employee, then not_replied time == 0
        var last_replier = vika_room['最后说话者']
        var person_in_charge = vika_room['负责人']
        var room_name = vika_room['群聊名']
        var not_replied_time = vika_room['负责人未回覆时间（分钟）']
        var last_replier = vika_room['最后说话者']
        var phase = vika_room['群聊阶段']
        console.log(last_replier, person_in_charge, room_name, not_replied_time)
        //NOT REPLY Level ; how to make sure that each level is alerted only once? 

        var card_color
        not_replied_time = Math.floor(not_replied_time)
        var need_send_message = false
        var alert

        //distinguish btw sales and after sales's config
        if (phase === 'pre-sales') {
            alert = sales_alert
        } else if (phase === 'after-sales') {
            alert = after_sales_alert
        }

        const color_level = alert.color_level
        var time_list = Object.keys(color_level).map((e) => { return parseInt(e) }).filter((e) => { return !isNaN(e) })

        if (time_list.includes(not_replied_time)) {
            need_send_message = true
            card_color = color_level[not_replied_time.toString()]
        } else {
            var last_time = time_list[time_list.length - 1]
            // console.log(not_replied_time,last_time,alert.cycle_time)
            if (last_time < not_replied_time && (not_replied_time - last_time) % alert.cycle_time === 0 && not_replied_time <= alert.until) {
                need_send_message = true
                card_color = color_level["above"]
            }
        }
        // console.log("IS DEV:",is_developing)
        if (need_send_message) {
            mycard.elements[0]["content"] = `**${last_replier}** 的消息在 **${person_in_charge}** 负责的 **${room_name}** 已经超过 **${Math.floor(not_replied_time)}** 分钟没被回复啦! 加油加油​${"⛽️"}`;
            if (room_name == undefined) {
                mycard.elements[0]["content"] += `\\n**${room} 还没有销售，请添加一位销售`
            }
            mycard.header.template = card_color
            if (is_developing) {
                if (not_replied_time > alert.group_alert_threshold) {
                    await lark.message.send({
                        chat_id: channels.test_roomid,
                        msg_type: 'interactive',
                        card: mycard,
                    });
                }
                await lark.message.send({
                    chat_id: channels.test_roomid,
                    msg_type: 'interactive',
                    card: mycard,
                });
            } else {
                if (not_replied_time > alert.group_alert_threshold) {
                    await lark.message.send({
                        chat_id: channels.alert_group,
                        msg_type: 'interactive',
                        card: mycard,
                    });
                }
                await lark.message.send({
                    chat_id: sales2chat[person_in_charge],
                    msg_type: 'interactive',
                    card: mycard,
                });
            }
        }
    }
}


var mycard = {
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
            "content": "超时提醒⏰",
            "tag": "plain_text"
        }
    }
}

puppet_start()
process.on('uncaughtException', err => {
    console.error(err && err.stack)
});
