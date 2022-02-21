# Readme


## About the Project 
For a company to sell its enterprise service, the sales need to communicate with the potential customers effectively.  As each sales are overloaded with customers, they are prone to delayed response and low-quality response. However, evaluating the conversation between sales and customers requires huge labor works from manager and HRs.  Therefore, a sales-assistant chatbot to record, analyze, and visualize the metrics of the conversation comes in handy. 

### Blog
1. [基于Wechaty的销售助理机器人--项目规划](https://wechaty.js.org/2021/11/11/sales-assistant-bot/)
2. [基于Wechaty的销售助理机器人--项目中期进展](https://wechaty.js.org/2021/12/14/sales-assistant-mid-term-progress/)
3. [基于Wechaty的销售助理机器人--结项报告](https://wechaty.js.org/2022/02/10/sales-assistant-final/)

### Video Links
1. [期初報告](https://youtu.be/OHKxFKlIaIU)
2. [期中報告1](https://youtu.be/i45SQ4CrsdE)
3. [期中報告2](https://youtu.be/X9mVtIBKiY0)
4. [期中報告3](https://youtu.be/SFXOwsCLlv4)
5. [期末報告](https://www.youtube.com/watch?v=HsQmU9txmT0)

### System Structure
![System Structure](./assets/SystemStructure.jpg)

We structure the system into user, frontend, puppet, backend code, and database. 

Firstly, there are lots of new rooms and messages in Wechat, which are listened and captured through Wechaty and saved in `msg_db` through `sales-bot.js`. 
Secondly, `update-vika.js` analyze room data and msg data and show it on Vika in real time.  Managers can see all rooms' status and find man-made or bot-made problems.  When pre-sales finish their jobs, they switch the rooms' phase into after-sales on Vika, which should be approved by the managers then.  These changes are checked by `vika-update-roomdb.js`.  Only when the changes are valid will the room_db be modified as well. 

Finally, `vika-to-feishu.js` takes vika's room data, turn different level of delayed reply into message cards, and send them to Feishu through Lark Puppet.   
If the manager want to change the sales-list, just modify `config/default.json` and execute `update-name.js`.  To configure the alert policy or other parameters, modify `config/default.json` and restart the system.  

## [Overall Configuration](https://k0auuqcihb.feishu.cn/docs/doccnKLFrlLJ7kcJIZHDdUhhWGx#GOFlKz)
- 【管理者】執行【產品準備1】和【產品準備2】，得到【售前售後名單, 企業名稱，警報配置，2個Vika表單的ID】
- 【技術人員】根據【售前售後名單, 企業名稱，警報配置，2個Vika表單的ID】執行【部署系統】，使系統上線，通知【管理者】，正式運行

## [System Deployment](https://k0auuqcihb.feishu.cn/docs/doccnKLFrlLJ7kcJIZHDdUhhWGx#GeHWT6)
### Input: 
1. Need to get sales-list, corporation name, alert-settings and 2 Vika sheets' ID from Managers.
2. make sure that you had created a Feishu Bot
3. Deploy a server with docker installed
### Process:
0. clone the project and install npm package
```
git clone https://github.com/KevinTung/sales-assistant.git
cd sales-assistant
npm install
```
1. Fill the sales list in `config.names.sales, config.names.after_sales`
```
"names":{
  "sales":[
    "Andy",
    "Ben", 
    "Carl"
  ],
  "after_sales":[
    "Daniel",
    "Emily"
  ],
  "delete_names":false  #if you want to delete names not in the list from name_db 
},
```
2. Get the chatId based on sales list
```
node utils/get_chat_ids.js 

Output:
[
[name1,chatId1],
[name2,chatId2],
...
]

```
3. Configure lark. All names in the sales list need to fill in sales2chat.
```
"lark":{
 "channels":{
    "alert_group":"oc_xxx"   #group chat 
    "test_roomid":"oc_xxx",  #in dev phase, let msg flow here instead of formal Feishu groups
  },
  "sales2chat":{ #individual chat
    "name1": "chatId1", 
    "name2": "chatId2",
    ...
  },
}
```
4. Configure lark.salesAlert, lark.afterSalesAlert
```
"salesAlert":{
    "color_level":{  
      "5":"turquoise", //send turquoise card at 5 mins
      "10":"yellow", //send yellow card at 10 mins
      "20":"orange",
      "30":"red",
      "40":"purple",
      "50":"blue",
      "above":"grey"//send grey card after 50 mins
    },
    "cycle_time":10, //starting from 50, send a grey card every 10 mins, until 70
    "until":70,
    "group_alert_threshold":20 //also send to group chat after 20 mins
},
"afterSalesAlert":{ //對於售後也是一樣的配置邏輯
}
```
5. Configure corp.name based on corporation name on WeCom. Every employee has to have the same name, otherwise they will be treated as customer. 
6. Create Vika account and fill vika.token as your personal ID and (vika.todayRoom, vika.allRooms) as the 2 datasheets' ID （今日群聊、所有群聊）

7. install OpenSearch 
```
cd opensearch && docker-compose up
```
- Configure dbConfig: 
```
"dbConfig": {
  "host": "localhost",
  "protocol":"https",
  "port": 9200,
  "auth": "admin:admin"
},
```
- download [Opensearch JS SDK](https://github.com/opensearch-project/opensearch-js) and make sure that OpenSearch functions correctly
```
npm i @opensearch-project/opensearch
NODE_CONFIG_DIR=./config node utils/opensearch-test.js
```
- Configure the following indexes: 
```
"index":{
  "msg": "opensearch-index-for-messages",
  "room": "opensearch-index-for-rooms",
  "name": {
    "index":"opensearch-index-for-names",
    "docId": 1,
    "backup":10
    }
},
```
- Create indexes in Opensearch
```
NODE_CONFIG_DIR=./config node utils/create_indexes.js
```

- update sales-list:
```
NODE_CONFIG_DIR=./config node src/update-name.js
```
8. Get a WECHATY_PUPPET_SERVICE_TOKEN and Configure sales-assistant/scripts/.env 
``` 
DOCKER_NAME=salesbot
TZ=Asia/Shanghai
WECHATY_PUPPET_SERVICE_NO_TLS_INSECURE_CLIENT=true
WECHATY_LOG=error
WECHATY_PUPPET=wechaty-puppet-service
WECHATY_PUPPET_SERVICE_TOKEN=<YOUR_WECHATY_TOKEN>
```
- continue update in `default.json`
9. Configure `timeZone`，which decides how to count as 'a day' for Vika's 'today's group' 
10. Configure `UpdateCycleTime`, which decides `vika-to-feishu.js`, `update-vika.js`, and `vika_update_roomdb.js`'s update frequencies (default:`60000ms`)
11. If in dev mode，set `is_developing` to `true`, and all the alert will flow towards `test_roomid`
12. build docker image and start the container
```
./scripts/build_image.sh 
./scripts/run_all.sh     
```
- now use docker ps to check all the running container (there are 4)
- inspect how sales-bot is running. In the first time, you will see a QR code to scan. Take the prepared sales-assistant WeCom account and scan it. 
```
docker logs -f salesbot 
```
13. check all other containers by
```
docker logs -f <container_name>
```
14. If they functions well, tell managers that the system is functioning correctly. 

## [Usage](https://k0auuqcihb.feishu.cn/docs/doccnKLFrlLJ7kcJIZHDdUhhWGx#7D4yYM) 
After Installation, run the system with orr without docker: 
- Docker Operation
```
./scripts/build_image.sh #build image after modifying code
./scripts/run_all.sh     #start all containers
./scritps/stop_all.sh    #stop all containers
docker logs -f <container_name> #check a container's log
docker ps #check all running containers
```
- To run a nodejs file directly in server, you need to specify the path of config file
```
NODE_CONFIG_DIR=./config node src/update-vika.js 
```
- To update sales list, modify `config/default.json`'s `names` and `sales2chat` sections and update the name_db: 
```
NODE_CONFIG_DIR=./config node src/update-name.js
```
- Check that the names have been correctly modified: 
```
asd135441@ip-172-31-19-51:~/sales-assistant$ NODE_CONFIG_DIR=./config node utils/get_all_names.js 
Sales: [
  'Andy',"Ben','Carl'
]
After Sales: [ 'Daniel', 'Emily' ]
```

### Database Schema
- msg_db

Store the data listened from Wechaty:
```
[
  { //the first message....
 _events: {},
  _eventsCount: 0,
  id: '1155227',
  payload: {
    filename: '',
    fromId: '182xxxxxxxx',
    id: '1155227',
    mentionIdList: [],
    roomId: 'R:100xxxxxxxxx',
    text: 'hello',
    timestamp: 1642729893000,
    toId: '',
    type: 7,
    fromInfo: {
      _events: {},
      _eventsCount: 0,
      id: '182xxxxxxxx',
      payload: [Object]
    },
    toInfo: {},
    roomInfo: {
      _events: {},
      _eventsCount: 0,
      id: 'R:100xxxxxxxxx',
      payload: [Object],
      topic: '句子秒回&X展'
    }
  },
  {
    //another message....
  },
 ...
]
```
```
$ NODE_CONFIG_DIR=./config node utils/get_room_msg.js '句子秒回&X展'
Output:
12/16/2021 2:14:17 PM 句子秒回&X展 customerA:好，我明白了，那我这边先向上汇报一下，如果有需要我具体找你沟通哈！ 
12/16/2021 2:14:32 PM 句子秒回&X展 salesA:好 
12/20/2021 4:05:09 PM 句子秒回&X展 customerA:@salesB  发不出去，一直转圈 
...
...

```
- name_db

Store all sales and their responsive rooms
```
$ NODE_CONFIG_DIR=./config node utils/get_names_rooms.js 
Output:
[
'Andy': {
    role: 'sales',
    all_rooms: [
      'group1',
      'group2',
      'group3',
      'group4'
    ]
  },
'Ben':{
  ...
}
]
```
- room_db

Store all rooms and their status
```
$ NODE_CONFIG_DIR=./config node utils/get_all_rooms.js 
Output:
[
  {
    sales: [ 'Andy' ],
    employee: [
      EmployeeA,
      EmployeeB,
      EmployeeC,
    ],
    phase: 'pre-sales',
    in_charge: 'Daniel',
    after_sales: [ 'Daniel', 'Emily' ],
    room_name: 'Customer Service Group'
  },
  {
    sales:['Ben'],
    ...
  },
  ...
]
```

### Code Explanation

- `sales-bot.js`
need to scan the QR code to log in and let the sales-assistant WeCom account scan the QRCode. After you bind the puppet account with a WeCom account, it can start listen the incoming message and function correctly. 

```
docker run \
    -d \
    --name=salesbot \
    -e TZ=$TZ \
    -e WECHATY_PUPPET_SERVICE_NO_TLS_INSECURE_CLIENT=$WECHATY_PUPPET_SERVICE_NO_TLS_INSECURE_CLIENT \
    -e WECHATY_LOG=$WECHATY_LOG \
    -e WECHATY_PUPPET=$WECHATY_PUPPET \
    -e WECHATY_PUPPET_SERVICE_TOKEN=$WECHATY_PUPPET_SERVICE_TOKEN \
    --network=host \
    --restart=always \
    salesbot
```
- `update-vika.js`

`update-vika.js` reads `room_db` and analyzes today's active rooms. The metric of the rooms are sent to `Today's Rooms` datasheet in Vika.  To modify or add new metrics on Vika, just add more fields in `metric_obj` in the code and modify `headermap` , which maps the field in `metric_obj` to Vika's field. The update frequency is in default 1 minute (60000 ms).

```
 docker run \
    -d \
    --name=update-vika \
    --network=host \
    --restart=always \
    -e NODE_CONFIG_DIR=./config \
    salesbot \
    node src/update-vika.js
    
```
- `vika-update-roomdb.js`

`vika-update-roomdb.js` checks the manual changes on Vika's `Today's Room` and `All Rooms`. The `room_db` will only be modified if the changes are valid. To change the checking logic of the 2 datasheets, modify `vika_update_rooms`.  To change the output message of the system to the 2 sheets, modify `update_entries` and `today_update_entries`.  The update frequency is in default 1 minute (60000 ms).

```
docker run \
    -d \
    --name=vika-update-roomdb \
    --network=host \
    --restart=always \
    -e NODE_CONFIG_DIR=./config \
    salesbot \
    node src/vika-update-roomdb.js
    
```
- `vika-to-feishu.js`

`vika-to-feishu.js` reads vika's data of today's active rooms, turns different level of delayed replies into message cards, and sends them to Feishu through Lark Puppet. To modify the alert policy, configure the `lark.salesAlert`, and `lark.afterSalesAlert` in `config/default.json`. To redirect message into `test` group, set `lark.is_developing` to `true` and set `channels.test_roomid` to the target Feishu room's id.  To change more details such as card style, refer to [Feishu Card Builder](https://open.feishu.cn/tool/cardbuilder) and modify it in the code.  The update frequency is in default 1 minute (60000 ms). 
```
docker run \
    -d \
    --name=vika-to-feishu \
    --network=host \
    --restart=always \
    -e NODE_CONFIG_DIR=./config \
    salesbot \
    node src/vika-to-feishu.js
```

## Appendix
- Use [tmux](https://tmuxcheatsheet.com/) to run multiple processes in a single terminal

```
tmux a   #to open a new window
Ctrl+B D #detach from tmux window
Ctrl+B W #switch between windows
Ctrl+D   #close a window
```

## Contact 
KevinTung - [@asd135441](https://twitter.com/asd135541) - email@example.com


