import config from 'config';
const config_all = config.get('All');
import {Feishu} from 'lark-js-sdk';

async function sendMessage() {
    let lark = new Feishu(config_all.lark.appId, config_all.lark.appKey);
    let {groups} = await lark.bot.group.getList();
    let chatIds = groups.map(group => [group.name,group.chat_id]);
    console.log(chatIds)
}
sendMessage();