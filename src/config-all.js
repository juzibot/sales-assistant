import config from 'config';
import { Client } from "@opensearch-project/opensearch"
import { Vika } from "@vikadata/vika";

export const config_all = config.get('All');

var host = config_all.dbConfig.host;
var protocol = config_all.dbConfig.protocol;
var port = config_all.dbConfig.port;
var auth = config_all.dbConfig.auth; 

export const client = new Client({
    node: protocol + "://" + auth + "@" + host + ":" + port,
    ssl: {
        rejectUnauthorized: false //not authorized yet
    },
});

export const vika = new Vika({ token: config_all.vika.token, fieldKey: "name" });
