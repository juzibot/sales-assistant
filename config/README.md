```json
{
  "All":{
    "WechatyToken": "puppet_wxwork_xxxxxxxxxx", // wechaty的企业微信puppet token
    "timeZone":"Asia/Shanghai", //時區，會影響今日總表的開始與結束時間
    "updateCycleTime":{ 
      "updateVika":60000,//vika表多久更新一次
      "vika2Feishu":60000, //多久推送到飛書一次
      "vika2Db":60000 //多久從vika抓信息更新room db一次，同時也是系統信息datasheet的更新週期
    },
    "dbConfig": { //opensearch 不加 credential 的陽春配置
      "host": "localhost",
      "protocol":"https",
      "port": 9200,
      "auth": "admin:admin"
    },
    "index":{
      "msg": "custom-msg-index", //存消息，一條消息在一個doc存
      "room": "custom-room-index",//所有房間的詳情，一個房間在一個doc裡存
      "name": {
        "index":"custom-name-index",//存所有銷售與他們負責的群。所有名單集中在一個doc存
        "docId": 1, //可自選
        "backup":10 //可自選，每次對name的操作後都會備份到這個文檔內，等同於可進行一步回覆
        }
    },
    "corp":{
      "name":"your-corp-name" //所有員工都需要有這個企業名稱，否則會被視作顧客
    },
    "vika":{
      "token":"uskxxxxx", //對應開發者的vika帳號
      "todayRoom":"dstedxxxxxxx", //今日群聊datasheet id 
      "allRooms":"dstxxxxxxxxx", //群聊總表id datasheet id 
      "systemLog":"" //系統信息紀錄 datasheet id
    },
    "names":{ //售前與售後名單
      "sales":[
        "Andy",
        "Ben", 
        "Carl"
      ],
      "after_sales":[
        "Daniel",
        "Emily"
      ],
      "delete_names":false
    },
    "lark":{
      "appId":"cli_xxxxx", //開發者需在open feishu辦帳號
      "appKey":"xxxxxxxx", 
      "channels":{
        "test_roomid":"oc_xxxx", //測試群、可選
        "alert_group":"oc_xxxx"  //主要推送的總群 
      },
      "is_developing":false, //是否在開發？如果是，則會推送到測試群
      "sales2chat":{ //所有售前與售後都需要有一個對應的私人群
        "Andy":"oc_xxxx",
        "Ben":"oc_xxxx", 
        "Carl":"oc_xxxx",
        "Daniel":"oc_xxxx",
        "Emily":"oc_xxxx"
      },
      "serverPort":1235,
      "salesAlert":{
        "color_level":{  //不同時間點發送不同程度的卡片
          "5":"turquoise", //5分鐘發送青綠色警報卡片
          "10":"yellow", 
          "20":"orange",
          "30":"red",
          "40":"purple",
          "50":"blue", 
          "above":"grey"//50分鐘以上的卡片顏色
        },
        "cycle_time":10, //50分鐘以後，每隔10分鐘發送灰色卡片，直到超時70分鐘
        "until":70,
        "group_alert_threshold":20 //大於20分鐘時，推送到總群
      },
      "afterSalesAlert":{ //對於售後也是一樣的配置邏輯
        "color_level":{
          "5":"turquoise",
          "10":"yellow",
          "20":"orange",
          "30":"red",
          "40":"purple",
          "50":"blue",
          "above":"grey"
        },
        "cycle_time":10,
        "until":70,
        "group_alert_threshold":20
      }
    }
  } 
}
```
