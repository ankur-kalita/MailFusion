"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startEmailSync = void 0;
const imap_simple_1 = require("imap-simple");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const imapConfigs = [
    {
        host: process.env.IMAP_HOST1,
        port: parseInt(process.env.IMAP_PORT1),
        user: process.env.IMAP_USER1,
        password: process.env.IMAP_PASS1,
    },
    {
        host: process.env.IMAP_HOST2,
        port: parseInt(process.env.IMAP_PORT2),
        user: process.env.IMAP_USER2,
        password: process.env.IMAP_PASS2,
    },
];
const fetchEmails = (imap_1, ...args_1) => __awaiter(void 0, [imap_1, ...args_1], void 0, function* (imap, lastNDays = 30) {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - lastNDays);
    try {
        const searchCriteria = [['SINCE', sinceDate.toUTCString()]];
        const fetchOptions = { bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)'], struct: true };
        const results = yield imap.search(searchCriteria, fetchOptions);
        console.log(`Fetched ${results.length} emails from last ${lastNDays} days.`);
        for (const res of results) {
            const header = res.parts[0].body;
            console.log(`From: ${header.from}, Subject: ${header.subject}`);
        }
    }
    catch (error) {
        console.error('Error fetching emails:', error);
    }
});
const startImapConnection = (config) => __awaiter(void 0, void 0, void 0, function* () {
    const imapOptions = {
        imap: {
            user: config.user,
            password: config.password,
            host: config.host,
            port: config.port,
            tls: true,
            authTimeout: 10000,
        },
    };
    try {
        const imap = yield (0, imap_simple_1.connect)(imapOptions);
        yield imap.openBox('INBOX');
        console.log(`Connected to IMAP: ${config.user}`);
        yield fetchEmails(imap);
        imap.on('mail', () => __awaiter(void 0, void 0, void 0, function* () {
            console.log(`New email received in ${config.user}`);
            yield fetchEmails(imap, 1);
        }));
        imap.on('error', (err) => console.error(`IMAP Error: ${err.message}`));
    }
    catch (error) {
        console.error(`Failed to connect to IMAP (${config.user}):`, error);
    }
});
const startEmailSync = () => {
    imapConfigs.forEach(startImapConnection);
};
exports.startEmailSync = startEmailSync;
