import fs from 'fs';
import path from 'path';

const DB_FOLDER = path.join(path.join(__dirname, '..', 'db'));
const DB_FILE_PATH = path.join(__dirname, '..', 'db', 'local_db.txt');

class DbSvc {
    checkDbExisting() {
        if (!fs.existsSync(DB_FOLDER)) {
            fs.mkdirSync(DB_FOLDER, { recursive: true });
        }
        if (!fs.existsSync(DB_FILE_PATH)) {
            fs.writeFileSync(DB_FILE_PATH, '');
        }
    }

    isListenerExist(chatId: any) {
        const data = fs.readFileSync(DB_FILE_PATH, { encoding: 'utf8', flag: 'r' }).split(',');
        return data.indexOf(chatId.toString()) >= 0;
    }

    getListeners() {
        const listeners = fs.readFileSync(DB_FILE_PATH, { encoding: 'utf8', flag: 'r' });
        return !!listeners ? listeners.split(',').map((id) => id.replace(/(\r\n|\n|\r)/gm, '')) : [];
    }

    addListener(chatId: any) {
        const data = fs.readFileSync(DB_FILE_PATH, { encoding: 'utf8', flag: 'r' });
        const separatedData = !!data ? data.split(',') : [];
        separatedData.push(chatId);
        const newData = separatedData.join(',');
        fs.writeFileSync(DB_FILE_PATH, newData);
    }

    removeListener(chatId: any) {
        const data = fs.readFileSync(DB_FILE_PATH, { encoding: 'utf8', flag: 'r' });
        const separatedData = !!data ? data.split(',') : [];
        const filteredData = separatedData.filter((elem: any) => elem !== chatId.toString());
        const newData = filteredData.join(',');
        fs.writeFileSync(DB_FILE_PATH, newData);
    }
}

export default new DbSvc();
