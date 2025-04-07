// import express from 'express';
// import { createServer } from 'node:http';
// import { fileURLToPath } from 'node:url';
// import { dirname, join } from 'node:path';
// import { Server } from 'socket.io';
// import sqlite3 from 'sqlite3';
// import { open } from 'sqlite';

// const db = await open({
//     filename: 'chat.db',
//     driver: sqlite3.Database
// });

// await db.exec(`
//   CREATE TABLE IF NOT EXISTS messages (
//     id INTEGER PRIMARY KEY AUTOINCREMENT,
//     client_offset TEXT UNIQUE,
//     content TEXT
//   );
// `);

// const app = express();
// const server = createServer(app);
// const io = new Server(server, {
//     connectionStateRecovery: {}
// });

// const __dirname = dirname(fileURLToPath(import.meta.url));

// app.get('/', (req, res) => {
//     res.sendFile(join(__dirname, 'index.html'));
// });

// io.on('connection', async (socket) => {
//     socket.on('chat message', async (msg, clientOffset, callback) => {
//         let result;
//         try {
//             result = await db.run(
//                 'INSERT INTO messages (content, client_offset) VALUES (?, ?)',
//                 msg,
//                 clientOffset
//             );
//         } catch (e) {
//             if (e.errno === 19 /* SQLITE_CONSTRAINT */) {
//                 callback();
//             }
//             return;
//         }
//         io.emit('chat message', msg, result.lastID);
//         callback();
//     });

//     if (!socket.recovered) {
//         try {
//             await db.each(
//                 'SELECT id, content FROM messages WHERE id > ?',
//                 [socket.handshake.auth.serverOffset || 0],
//                 (_err, row) => {
//                     socket.emit('chat message', row.content, row.id);
//                 }
//             );
//         } catch (e) {
//             // recovery failed
//         }
//     }
// });

// const port = process.env.PORT || 3000;
// server.listen(port, () => {
//     console.log(`Server running at http://localhost:${port}`);
// });

import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Server } from 'socket.io';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { createAdapter } from '@socket.io/cluster-adapter';

const __dirname = dirname(fileURLToPath(import.meta.url));
const port = process.env.PORT || 10000;

const db = await open({
    filename: 'chat.db',
    driver: sqlite3.Database
});

await db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_offset TEXT UNIQUE,
    content TEXT
  );
`);

const app = express();
app.use(express.static(join(__dirname))); // Serve index.html and other static files

app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
});

const server = createServer(app);
const io = new Server(server, {
    connectionStateRecovery: {},
    adapter: createAdapter()
});

io.on('connection', async (socket) => {
    socket.on('chat message', async (msg, clientOffset, callback) => {
        let result;
        try {
            result = await db.run('INSERT INTO messages (content, client_offset) VALUES (?, ?)', msg, clientOffset);
        } catch (e) {
            if (e.errno === 19) {
                callback(); // duplicate message, do nothing
                return;
            }
        }
        io.emit('chat message', msg, result.lastID);
        callback();
    });

    if (!socket.recovered) {
        try {
            await db.each(
                'SELECT id, content FROM messages WHERE id > ?',
                [socket.handshake.auth.serverOffset || 0],
                (_err, row) => {
                    socket.emit('chat message', row.content, row.id);
                }
            );
        } catch (e) {
            // handle silently
        }
    }
});

server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

