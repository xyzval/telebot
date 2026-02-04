require("./lib/myfunc.js");
const config = require("./config");
const { createPanel, createAdmin, createPayment, cekPaid } = require("./lib/myfunc2.js");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const os = require("os");
const prefix = config.prefix || ".";
const scriptDir = path.join(__dirname, "scripts");
const scriptDB = path.join(__dirname, "/database/scripts.json");
const userDB = path.join(__dirname, "/database/users.json");
const stockDB = path.join(__dirname, "/database/stocks.json");
const hargaPanel = require("./price/panel.js");
const vpsPackages = require("./price/vps.js");
const doDB = path.join(__dirname, "/database/digitalocean.json");
const orders = {};

// Inisialisasi database
if (!fs.existsSync(scriptDir)) fs.mkdirSync(scriptDir);
if (!fs.existsSync(scriptDB)) fs.writeFileSync(scriptDB, "[]");
if (!fs.existsSync(userDB)) fs.writeFileSync(userDB, "[]");
if (!fs.existsSync(stockDB)) fs.writeFileSync(stockDB, "{}");
if (!fs.existsSync(doDB)) fs.writeFileSync(doDB, "{}");

// Load database
const loadScripts = () => JSON.parse(fs.readFileSync(scriptDB));
const saveScripts = (d) => fs.writeFileSync(scriptDB, JSON.stringify(d, null, 2));
const loadUsers = () => JSON.parse(fs.readFileSync(userDB));
const saveUsers = (d) => fs.writeFileSync(userDB, JSON.stringify(d, null, 2));
const loadStocks = () => JSON.parse(fs.readFileSync(stockDB));
const saveStocks = (d) => fs.writeFileSync(stockDB, JSON.stringify(d, null, 2));
const loadDO = () => JSON.parse(fs.readFileSync(doDB));
const saveDO = (d) => fs.writeFileSync(doDB, JSON.stringify(d, null, 2));

function randomNumber(length = 5) {
    if (length <= 0) return "";
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(min + Math.random() * (max - min + 1)).toString();
}

function getPhotoInput(qr) {
    if (!qr) throw new Error("QR kosong");
    return qr.startsWith("http") ? qr : { source: qr };
}

function generateRandomFee(min = 100, max = 200) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function toRupiah(angka) {
    return angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

global.startTime = Date.now();

function fmtDur(ms) {
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / 6e4) % 60;
  const h = Math.floor(ms / 36e5) % 24;
  const d = Math.floor(ms / 864e5);
  return `${d} hari ${h} jam ${m} menit`;
}

function fmtBytes(b) {
  if (!b) return "0 Bytes";
  const u = 1024,
    s = ["Bytes", "KB", "MB", "GB", "TB"],
    i = Math.floor(Math.log(b) / Math.log(u));
  return `${(b / Math.pow(u, i)).toFixed(2)} ${s[i]}`;
}

function vpsInfo() {
  const up = os.uptime() * 1000;
  const total = os.totalmem(),
    free = os.freemem();
  return {
    runtime: fmtDur(up),
    mem: `${fmtBytes(total - free)} / ${fmtBytes(total)}`,
    cpu: os.cpus()[0].model.trim(),
    cores: os.cpus().length,
  };
}

function getRuntimeBot() {
  return fmtDur(Date.now() - global.startTime);
}

function getRuntimeVps() {
  return fmtDur(os.uptime() * 1000);
}

function getSpekVps() {
  const total = os.totalmem();
  const free  = os.freemem();
  const mem   = `${fmtBytes(total - free)} / ${fmtBytes(total)}`;
  const cores = os.cpus().length;
  return `${mem}  |  ${cores} Cores`;
}

const menuTextBot = (ctx) => `<blockquote>( ⸙‌ ) 𝐇𝐨𝐥𝐚 𝐒𝐞𝐥𝐚𝐦𝐚𝐭 𝐃𝐚𝐭𝐚𝐧𝐠 𝐃𝐢 𝐁𝐨𝐭 𝐀𝐮𝐭𝐨 𝐎𝐫𝐝𝐞𝐫 𝐗𝐛𝐢𝐥𝐳𝐎𝐟𝐟𝐢𝐜𝐢𝐚𝐥 @${ctx.from.username || "—"}
━━━━━━━━━━━━━━━━

▢ ${config.prefix}profile
▢ ${config.prefix}history

𝐓𝐞𝐤𝐚𝐧 𝐓𝐨𝐦𝐛𝐨𝐥 𝐃𝐢 𝐁𝐚𝐰𝐚𝐡 𝐈𝐧𝐢 𝐔𝐧𝐭𝐮𝐤 𝐌𝐞𝐥𝐢𝐡𝐚𝐭 𝐊𝐚𝐭𝐚𝐥𝐨𝐧𝐠</blockquote>`;

const menuTextOwn = (ctx) => `<blockquote>( ⸙‌ ) 𝐎𝐰𝐧𝐞𝐫 𝐦𝐞𝐧𝐮

⟢ 𝐍𝐚𝐦𝐚 𝐁𝐨𝐭 : 
⟢ 𝐕𝐞𝐫𝐬𝐢𝐨𝐧  : 1.0
⟢ 𝐑𝐮𝐧𝐭𝐢𝐦𝐞  : ${getRuntimeBot()}
━━━━━━━━━━━━━━━━

▢ ${config.prefix}backup
▢ ${config.prefix}broadcast
▢ ${config.prefix}addscript
▢ ${config.prefix}getscript
▢ ${config.prefix}delscript
▢ ${config.prefix}addstock
▢ ${config.prefix}delstock
▢ ${config.prefix}getstock
▢ ${config.prefix}addstockdo
▢ ${config.prefix}delstockdo
▢ ${config.prefix}getstockdo
▢ ${config.prefix}userlist
</blockquote>`;

const textOrder = (name, price, fee) => `
📦 Produk: ${name}
💰 Harga: Rp${toRupiah(price)} (Fee Rp${fee})
⏳ Expired QRIS: 6 Menit

Scan QRIS ini sebelum 6 menit untuk melakukan pembayaran
Bot otomatis mendeteksi status pembayaran jika sudah dibayar.
`;

const isOwner = (ctx) => {
    const fromId = ctx.from?.id || ctx.callbackQuery?.from?.id || ctx.inlineQuery?.from?.id;
    return fromId.toString() == config.ownerId;
}

// Fungsi untuk menambahkan user ke database
function addUser(userData) {
    const users = loadUsers();
    const existingUser = users.find(u => u.id === userData.id);
    if (!existingUser) {
        users.push(userData);
        saveUsers(users);
    }
}

// Fungsi untuk update user history
function updateUserHistory(userId, transaction) {
    const users = loadUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
        if (!users[userIndex].history) users[userIndex].history = [];
        users[userIndex].history.push({
            ...transaction,
            timestamp: new Date().toISOString()
        });
        saveUsers(users);
    }
}

module.exports = (bot) => {

    // #### HANDLE STORE BOT MENU ##### //
    bot.on("text", async (ctx) => {
        const msg = ctx.message;
        const prefix = config.prefix;

        const body = (msg.text || "").trim();
        const isCmd = body.startsWith(prefix);
        const args = body.split(/ +/).slice(1);
        const text = args.join(" "); // teks setelah command
        const command = isCmd
            ? body.slice(prefix.length).trim().split(" ")[0].toLowerCase()
            : body.toLowerCase();
        const fromId = ctx.from.id;
        const userName = ctx.from.username || `${ctx.from.first_name}${ctx.from.last_name ? ' ' + ctx.from.last_name : ''}`;

        // Tambahkan user ke database
        fromId ? addUser({
            id: fromId,
            username: userName,
            first_name: ctx.from.first_name,
            last_name: ctx.from.last_name || "",
            join_date: new Date().toISOString(),
            total_spent: 0,
            history: []
        }) : ""

        switch (command) {
            // ===== MENU / START =====
            case "menu":
            case "start": {
                return ctx.replyWithPhoto(config.menuImage, {
  caption: menuTextBot(ctx),
  parse_mode: "HTML",
  reply_markup: {
    inline_keyboard: [
      [
        { text: "🖥️ Beli Panel",    callback_data: "buy_panel" },
        { text: "🛠️ Beli Admin Panel",   callback_data: "buy_admin" },
      ],
      [
        { text: "📂 Beli Script", callback_data: "buy_script" },
        { text: "📱 Beli Apps Premium",  callback_data: "buy_apps"  },
      ],
      [
        { text: "🌊 Beli Akun DO", callback_data: "buy_do" },
        { text: "💻 Beli VPS DO",  callback_data: "buy_vps" },
      ],
      [
        { text: "🕊️ Owner Menu",   callback_data: "owner_menu" }
      ]
    ]
  }
});
}
            // ===== PROFILE USER =====
            case "profile": {
                const users = loadUsers();
                const user = users.find(u => u.id === fromId);
                if (!user) return ctx.reply("❌ User tidak ditemukan.");

                const escapeHtml = (text) => {
                    if (!text) return '';
                    return text
                        .replace(/&/g, "&amp;")
                        .replace(/</g, "&lt;")
                        .replace(/>/g, "&gt;")
                        .replace(/"/g, "&quot;")
                        .replace(/'/g, "&#039;");
                };

                const firstName = escapeHtml(user.first_name || '');
                const lastName = escapeHtml(user.last_name || '');
                const userName = firstName + (lastName ? ' ' + lastName : '');
                const userUsername = user.username ? '@' + escapeHtml(user.username) : 'Tidak ada';

                let lastTransactions = '<i>Belum ada transaksi</i>';
                if (user.history && user.history.length > 0) {
                    lastTransactions = user.history.slice(-3).reverse().map((t, i) => {
                        const product = escapeHtml(t.product);
                        const amount = toRupiah(t.amount);
                        const date = new Date(t.timestamp).toLocaleDateString('id-ID');
                        return `${i + 1}. ${product} - Rp${amount} (${date})`;
                    }).join('\n');
                }

                const profileText = `<b>👤 Profile User</b>

<b>📛 Nama:</b> ${userName}
<b>🆔 User ID:</b> <code>${user.id}</code>
<b>📧 Username:</b> ${userUsername}
<b>📅 Join Date:</b> ${new Date(user.join_date).toLocaleDateString('id-ID')}
<b>💰 Total Spent:</b> Rp${toRupiah(user.total_spent || 0)}
<b>📊 Total Transaksi:</b> ${user.history ? user.history.length : 0}

<b>📋 Last 3 Transactions:</b>
${lastTransactions}`;

                return ctx.reply(profileText, { parse_mode: "HTML" });
            }

            case "history": {
                const users = loadUsers();
                const user = users.find(u => u.id === fromId);
                if (!user || !user.history || user.history.length === 0) {
                    return ctx.reply("📭 Belum ada riwayat transaksi.");
                }

                let historyText = "📋 *Riwayat Transaksi*\n\n";
                user.history.reverse().forEach((t, i) => {
                    historyText += `*${i + 1}. ${t.product}*\n`;
                    historyText += `💰 Harga: Rp${toRupiah(t.amount)}\n`;
                    historyText += `📅 Tanggal: ${new Date(t.timestamp).toLocaleDateString('id-ID')} ${new Date(t.timestamp).toLocaleTimeString('id-ID')}\n`;
                    historyText += `📦 Tipe: ${t.type}\n`;
                    if (t.details) historyText += `📝 Detail: ${t.details}\n`;
                    historyText += "\n";
                });

                return ctx.reply(historyText, { parse_mode: "Markdown" });
            }

            // ===== USERLIST (OWNER ONLY) =====
            case "userlist": {
                if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
                const users = loadUsers();
                const escapeHtml = (text) => {
                    if (!text) return '';
                    return text
                        .replace(/&/g, "&amp;")
                        .replace(/</g, "&lt;")
                        .replace(/>/g, "&gt;")
                        .replace(/"/g, "&quot;")
                        .replace(/'/g, "&#039;");
                };
                if (users.length === 0) return ctx.reply("📭 Belum ada user terdaftar.");

                let userText = `<b>📊 Total Users: ${users.length}</b>\n\n`;

                users.slice(0, 20).forEach((u, i) => {
                    const firstName = escapeHtml(u.first_name || '');
                    const lastName = escapeHtml(u.last_name || '');
                    const username = u.username ? '@' + escapeHtml(u.username) : '-';

                    userText += `<b>${i + 1}. ${firstName}${lastName ? ' ' + lastName : ''}</b>\n`;
                    userText += `<code>ID: ${u.id}</code>\n`;
                    userText += `📧 ${username}\n`;
                    userText += `💰 Spent: Rp${toRupiah(u.total_spent || 0)}\n`;
                    userText += `📅 Join: ${new Date(u.join_date).toLocaleDateString('id-ID')}\n`;
                    userText += "\n";
                });

                if (users.length > 20) {
                    userText += `\n<i>...dan ${users.length - 20} user lainnya</i>`;
                }

                return ctx.reply(userText, { parse_mode: "HTML" });
            }

            // ===== ADD SCRIPT =====
            case "addscript": {
                if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
                if (!ctx.message.reply_to_message?.document)
                    return ctx.reply(`Reply ZIP dengan:\n${config.prefix}addscript nama|harga`);

                const doc = ctx.message.reply_to_message.document;
                if (!doc.file_name.endsWith(".zip")) return ctx.reply("Harus file .zip");

                if (!text.includes("|")) return ctx.reply(`Format: ${config.prefix}addscript nama|harga`);
                const [name, price] = text.split("|").map(v => v.trim());
                if (!name || isNaN(price)) return ctx.reply("Data tidak valid.");

                const scripts = loadScripts();
                if (scripts.find(s => s.name.toLowerCase() === name.toLowerCase()))
                    return ctx.reply("Script sudah ada.");

                const link = await ctx.telegram.getFileLink(doc.file_id);
                const res = await axios.get(link.href, { responseType: "arraybuffer" });
                const savePath = path.join(scriptDir, doc.file_name);
                fs.writeFileSync(savePath, res.data);

                scripts.push({ name, price: Number(price), file: `scripts/${doc.file_name}` });
                saveScripts(scripts);

                return ctx.reply(`✅ Script ${name} berhasil ditambahkan.`, { parse_mode: "Markdown" });
            }

            // ===== BROADCAST MESSAGE (OWNER ONLY) =====
            case "broadcast": {
                if (!isOwner(ctx)) return ctx.reply("❌ Owner only!");

                const users = loadUsers();
                if (users.length === 0) {
                    return ctx.reply("📭 Tidak ada user untuk di-broadcast.");
                }

                const replyMsg = ctx.message.reply_to_message;
                let broadcastMessage = "";
                let photoFileId = null;
                let hasPhoto = false;

                if (replyMsg) {
                    if (replyMsg.photo && replyMsg.photo.length > 0) {
                        hasPhoto = true;
                        const photo = replyMsg.photo[replyMsg.photo.length - 1];
                        photoFileId = photo.file_id;
                        broadcastMessage = replyMsg.caption || "";
                    } else if (replyMsg.text) {
                        broadcastMessage = replyMsg.text;
                    } else {
                        return ctx.reply("❌ Format tidak valid! Reply pesan dengan teks atau foto.");
                    }
                } else if (text) {
                    broadcastMessage = text;
                } else {
                    return ctx.reply(`❌ Cara penggunaan:\n1. ${config.prefix}broadcast [pesan]\nATAU\n2. Reply pesan/foto dengan ${config.prefix}broadcast`);
                }

                if (!broadcastMessage.trim() && !hasPhoto) {
                    return ctx.reply("❌ Pesan broadcast tidak boleh kosong!");
                }

                const startMsg = await ctx.reply(`🚀 *MEMULAI BROADCAST*\n\n` +
                    `📊 Total User: ${users.length}\n` +
                    `⏳ Estimasi waktu: ${Math.ceil(users.length / 10)} detik\n` +
                    `🔄 Mengirim... 0/${users.length}`,
                    { parse_mode: "Markdown" });

                startBroadcast(ctx, users, broadcastMessage, hasPhoto, photoFileId, startMsg.message_id);
                break;
            }

            // ===== BACKUP SCRIPT =====
            case "backupsc":
            case "bck":
            case "backup": {
                if (!isOwner(ctx)) return ctx.reply("❌ Owner only!");

                try {
                    await ctx.reply("🔄 Backup Processing...");

                    const archiver = require('archiver');

                    const bulanIndo = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
                    const tgl = new Date();
                    const tanggal = tgl.getDate().toString().padStart(2, "0");
                    const bulan = bulanIndo[tgl.getMonth()];
                    const name = `Tele-Autoorder-${tanggal}-${bulan}-${tgl.getFullYear()}`;

                    const exclude = ["node_modules", "package-lock.json", "yarn.lock", ".npm", ".cache", ".git"];
                    const filesToZip = fs.readdirSync(".").filter((f) =>
                        !exclude.includes(f) &&
                        !f.startsWith('.') &&
                        f !== ""
                    );

                    if (!filesToZip.length) {
                        return ctx.reply("❌ Tidak ada file yang dapat di backup!");
                    }

                    const output = fs.createWriteStream(`./${name}.zip`);
                    const archive = archiver("zip", { zlib: { level: 9 } });

                    output.on('close', async () => {
                        console.log(`Backup created: ${archive.pointer()} total bytes`);

                        try {
                            await ctx.telegram.sendDocument(
                                config.ownerId,
                                { source: `./${name}.zip` },
                                {
                                    caption: "✅ <b>Backup Script selesai!</b>\n📁 " + name + ".zip",
                                    parse_mode: "HTML"
                                }
                            );

                            fs.unlinkSync(`./${name}.zip`);

                            if (ctx.chat.id.toString() !== config.ownerId.toString()) {
                                await ctx.reply(
                                    "✅ <b>Backup script selesai!</b>\n📁 File telah dikirim ke chat pribadi owner.",
                                    { parse_mode: "HTML" }
                                );
                            }

                        } catch (err) {
                            console.error("Gagal kirim file backup:", err);
                            await ctx.reply("❌ Error! Gagal mengirim file backup.");
                        }
                    });

                    archive.on('error', async (err) => {
                        console.error("Archive Error:", err);
                        await ctx.reply("❌ Error! Gagal membuat file backup.");
                    });

                    archive.pipe(output);

                    for (let file of filesToZip) {
                        const stat = fs.statSync(file);
                        if (stat.isDirectory()) {
                            archive.directory(file, file);
                        } else {
                            archive.file(file, { name: file });
                        }
                    }

                    await archive.finalize();

                } catch (err) {
                    console.error("Backup Error:", err);
                    await ctx.reply("❌ Error! Terjadi kesalahan saat proses backup.");
                }
                break;
            }

            // ===== GET SCRIPT =====
            case "getscript": {
                if (!isOwner(ctx)) return ctx.reply("❌ Owner only.");
                const allScripts = loadScripts();
                if (!allScripts.length) return ctx.reply("📭 Belum ada script.");

                const buttons = allScripts.map((s, i) => ([
                    { text: `📂 ${s.name} - Rp${s.price}`, callback_data: `getscript|${i}` }
                ]));

                return ctx.reply("Pilih Script untuk melihat detail", {
                    parse_mode: "Markdown",
                    reply_markup: { inline_keyboard: buttons }
                });
            }

            // ===== DELETE SCRIPT =====
            case "delscript": {
                if (!isOwner(ctx)) return ctx.reply('❌ Owner Only!');
                const scriptsDel = loadScripts();
                if (!scriptsDel.length) return ctx.reply("Tidak ada script.");

                const delButtons = scriptsDel.map(s => [{ text: `📂 ${s.name} - Rp${s.price}`, callback_data: `del_script|${s.name}` }]);
                return ctx.reply("Pilih Script yang ingin dihapus", {
                    parse_mode: "Markdown",
                    reply_markup: { inline_keyboard: delButtons }
                });
            }

            // ===== BUY PANEL =====
            case "buypanel": {
                if (!text) return ctx.reply(`Ketik ${config.prefix}buypanel username untuk membeli panel.`);
                if (text.includes(" ")) return ctx.reply("Format username dilarang memakai spasi!");
                const user = text;
                const panelButtons = [];
                const dataPanel = Object.keys(hargaPanel)

                for (let i of dataPanel) {
                    const key = `${i}`;
                    panelButtons.push([
                        { text: `${i} - Rp${hargaPanel[i].toLocaleString("id-ID")}`, callback_data: `panel_ram|${key}|${user}` }
                    ]);
                }

                return ctx.reply("Pilih Ram Panel Pterodactyl:", {
                    reply_markup: { inline_keyboard: panelButtons }
                });
            }

            // ===== BUY SCRIPT =====
            case "buyscript": {
                const scriptsList = loadScripts();
                if (!scriptsList.length) return ctx.reply('❌ Stok Script Sedang Kosong.');

                const scriptButtons = scriptsList.map(s => [
                    { text: `📂 ${s.name} - Rp${s.price}`, callback_data: `script|${s.name}` }
                ]);

                return ctx.reply("Pilih Script yang ingin dibeli:", {
                    reply_markup: { inline_keyboard: scriptButtons }
                });
            }

            // ===== BUY ADMIN =====
            case "buyadmin": {
                if (!text)
                    return ctx.reply(`Ketik ${config.prefix}buyadmin username untuk membeli admin panel.`);
                if (text.includes(" "))
                    return ctx.reply("Format username dilarang memakai spasi!");

                const fee = generateRandomFee();
                const price = fee + 7000;
                const name = "Admin Panel";
                const user = text;

                const paymentType = config.paymentGateway;

                const pay = await createPayment(paymentType, price, config);

                orders[fromId] = {
                    username: user,
                    type: "admin",
                    name,
                    amount: price,
                    fee,
                    orderId: pay.orderId || null,
                    paymentType: paymentType,
                    chatId: ctx.chat.id,
                    expireAt: Date.now() + 6 * 60 * 1000
                };

                const photo =
                    paymentType === "pakasir"
                        ? { source: pay.qris }
                        : pay.qris;

                const qrMsg = await ctx.replyWithPhoto(photo, {
                    caption: textOrder(name, price, fee),
                    parse_mode: "Markdown",
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "❌ Batalkan Order", callback_data: "cancel_order" }]
                        ]
                    }
                });

                orders[fromId].qrMessageId = qrMsg.message_id;
                startCheck(fromId, ctx);
                break;
            }

            // ===== BUY APP =====
            case "buyapp":
            case "buyapps": {
                const stocks = loadStocks();
                const categories = Object.keys(stocks);

                if (categories.length === 0) {
                    return ctx.reply("📭 Stok apps premium sedang kosong.");
                }

                const categoryButtons = categories.map(cat => [
                    { text: `📱 ${cat.charAt(0).toUpperCase() + cat.slice(1)}`, callback_data: `app_category|${cat}` }
                ]);

                return ctx.reply("📱 *Pilih Kategori Apps Premium:*", {
                    parse_mode: "Markdown",
                    reply_markup: { inline_keyboard: categoryButtons }
                });
            }

            // ===== BUY DIGITAL OCEAN ACCOUNT =====
            case "buydo": {
                const doData = loadDO();
                const categories = Object.keys(doData);

                if (categories.length === 0) {
                    return ctx.reply("📭 Stok akun Digital Ocean sedang kosong.");
                }

                const categoryButtons = categories.map(cat => [
                    { text: `🌊 ${cat.charAt(0).toUpperCase() + cat.slice(1)}`, callback_data: `do_category_buy|${cat}` }
                ]);

                return ctx.reply("🌊 *Pilih Kategori Akun Digital Ocean:*", {
                    parse_mode: "Markdown",
                    reply_markup: { inline_keyboard: categoryButtons }
                });
            }

            // ===== BUY VPS DIGITAL OCEAN =====
            case "buyvps": {
                if (!config.apiDigitalOcean) {
                    return ctx.reply("❌ Fitur VPS Digital Ocean belum tersedia.");
                }

                const packageButtons = vpsPackages.map((pkg) => [
                    {
                        text: `${pkg.label} - Rp${toRupiah(pkg.price)}`,
                        callback_data: `vps_step1|${pkg.key}`
                    }
                ]);

                return ctx.reply("💻 *BUY VPS DIGITAL OCEAN - Step 1*\n\n*Pilih Paket RAM & CPU:*", {
                    parse_mode: "Markdown",
                    reply_markup: { inline_keyboard: packageButtons }
                });
            }

            // ===== CEK STOK =====
            case "cekstok":
            case "stokapps": {
                const stocks = loadStocks();
                const doData = loadDO();
                const stockCategories = Object.keys(stocks);
                const doCategories = Object.keys(doData);

                if (stockCategories.length === 0 && doCategories.length === 0) {
                    return ctx.reply("📭 Semua stok sedang kosong.");
                }

                let stockText = "📊 *Stok Tersedia*\n\n";

                // Stok Apps
                if (stockCategories.length > 0) {
                    stockText += "*📱 APPS PREMIUM*\n";
                    stockCategories.forEach(cat => {
                        const items = stocks[cat];
                        stockText += `*${cat.toUpperCase()}*\n`;
                        items.forEach(item => {
                            stockText += `├ ${item.description}\n`;
                            stockText += `├ 💰 Rp${toRupiah(item.price)}\n`;
                            stockText += `└ 📦 Stok: ${item.stock}\n\n`;
                        });
                    });
                }

                // Stok Digital Ocean
                if (doCategories.length > 0) {
                    stockText += "*🌊 DIGITAL OCEAN ACCOUNTS*\n";
                    doCategories.forEach(cat => {
                        const items = doData[cat];
                        stockText += `*${cat.toUpperCase()}*\n`;
                        items.forEach(item => {
                            stockText += `├ ${item.description}\n`;
                            stockText += `├ 💰 Rp${toRupiah(item.price)}\n`;
                            stockText += `└ 📦 Stok: ${item.stock}\n\n`;
                        });
                    });
                }

                return ctx.reply(stockText, { parse_mode: "Markdown" });
            }

            // ===== ADD STOCK (OWNER ONLY) =====
            case "addstock": {
                if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
                if (!text.includes("|")) return ctx.reply(`Format: ${config.prefix}addstock kategori|keterangan|data akun|harga\n\nContoh: ${config.prefix}addstock netflix|1 Bulan|email: xxx@gmail.com pass: xxx123|25000`);

                const parts = text.split("|").map(v => v.trim());
                if (parts.length < 4) {
                    return ctx.reply("Format tidak valid! Gunakan: kategori|keterangan|data akun|harga");
                }

                const [category, description, accountData, priceStr] = parts;
                const price = parseInt(priceStr);

                if (!category || !description || !accountData || isNaN(price)) {
                    return ctx.reply("Data tidak valid! Pastikan semua field terisi dan harga berupa angka.");
                }

                const stocks = loadStocks();

                if (!stocks[category]) {
                    stocks[category] = [];
                }

                let itemAdded = false;
                let existingGroup = null;
                let groupIndex = -1;

                for (let i = 0; i < stocks[category].length; i++) {
                    const item = stocks[category][i];
                    if (item.description.toLowerCase() === description.toLowerCase() &&
                        item.price === price) {
                        existingGroup = item;
                        groupIndex = i;
                        break;
                    }
                }

                if (existingGroup) {
                    const accountExists = existingGroup.accounts.some(acc => acc === accountData);

                    if (!accountExists) {
                        existingGroup.accounts.push(accountData);
                        existingGroup.stock += 1;
                        itemAdded = true;
                    } else {
                        return ctx.reply(`⚠️ Akun ini sudah ada dalam database!\n\n📁 Kategori: *${category}*\n📝 Deskripsi: ${description}\n💰 Harga: Rp${toRupiah(price)}\n\nTidak perlu ditambahkan lagi.`,
                            { parse_mode: "Markdown" });
                    }
                } else {
                    stocks[category].push({
                        description: description,
                        price: price,
                        stock: 1,
                        accounts: [accountData],
                        added_date: new Date().toISOString()
                    });
                    itemAdded = true;
                    groupIndex = stocks[category].length - 1;
                }

                saveStocks(stocks);

                if (itemAdded) {
                    const totalItemsInCategory = stocks[category].reduce((sum, item) => sum + item.accounts.length, 0);
                    const totalItemsInGroup = existingGroup ? existingGroup.accounts.length : 1;

                    let responseText = `✅ Stock berhasil ditambahkan!\n\n`;
                    responseText += `📁 Kategori: *${category}*\n`;
                    responseText += `📝 Keterangan: ${description}\n`;
                    responseText += `💰 Harga: Rp${toRupiah(price)}\n`;
                    responseText += `🔑 Data Akun: ${accountData.substring(0, 30)}...\n\n`;

                    if (existingGroup) {
                        responseText += `📊 *Informasi Grouping:*\n`;
                        responseText += `├ Total akun dalam group: ${totalItemsInGroup}\n`;
                        responseText += `└ Index group: ${groupIndex + 1}\n\n`;
                    } else {
                        responseText += `📊 *Grouping baru dibuat*\n`;
                        responseText += `└ Group ke: ${groupIndex + 1} dalam kategori\n\n`;
                    }

                    responseText += `📈 *Statistik Kategori ${category.toUpperCase()}*\n`;
                    responseText += `├ Total group: ${stocks[category].length}\n`;
                    responseText += `└ Total item: ${totalItemsInCategory}`;

                    return ctx.reply(responseText, { parse_mode: "Markdown" });
                }

                break;
            }

            // ===== ADD STOCK DIGITAL OCEAN (OWNER ONLY) =====
            case "addstockdo": {
                if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
                if (!text.includes("|")) return ctx.reply(`Format: ${config.prefix}addstockdo kategori|keterangan|data akun|harga\n\nContoh: ${config.prefix}addstockdo 3 Droplet|1 Bulan|email: xxx@gmail.com pass: xxx123|120000`);

                const parts = text.split("|").map(v => v.trim());
                if (parts.length < 4) {
                    return ctx.reply("Format tidak valid! Gunakan: kategori|keterangan|data akun|harga");
                }

                const [category, description, accountData, priceStr] = parts;
                const price = parseInt(priceStr);

                if (!category || !description || !accountData || isNaN(price)) {
                    return ctx.reply("Data tidak valid! Pastikan semua field terisi dan harga berupa angka.");
                }

                const doData = loadDO();

                if (!doData[category]) {
                    doData[category] = [];
                }

                let itemAdded = false;
                let existingGroup = null;
                let groupIndex = -1;

                for (let i = 0; i < doData[category].length; i++) {
                    const item = doData[category][i];
                    if (item.description.toLowerCase() === description.toLowerCase() &&
                        item.price === price) {
                        existingGroup = item;
                        groupIndex = i;
                        break;
                    }
                }

                if (existingGroup) {
                    const accountExists = existingGroup.accounts.some(acc => acc === accountData);

                    if (!accountExists) {
                        existingGroup.accounts.push(accountData);
                        existingGroup.stock += 1;
                        itemAdded = true;
                    } else {
                        return ctx.reply(`⚠️ Akun ini sudah ada dalam database!\n\n📁 Kategori: *${category}*\n📝 Deskripsi: ${description}\n💰 Harga: Rp${toRupiah(price)}\n\nTidak perlu ditambahkan lagi.`,
                            { parse_mode: "Markdown" });
                    }
                } else {
                    doData[category].push({
                        description: description,
                        price: price,
                        stock: 1,
                        accounts: [accountData],
                        added_date: new Date().toISOString()
                    });
                    itemAdded = true;
                    groupIndex = doData[category].length - 1;
                }

                saveDO(doData);

                if (itemAdded) {
                    const totalItemsInCategory = doData[category].reduce((sum, item) => sum + item.accounts.length, 0);
                    const totalItemsInGroup = existingGroup ? existingGroup.accounts.length : 1;

                    let responseText = `✅ Stock Digital Ocean berhasil ditambahkan!\n\n`;
                    responseText += `📁 Kategori: *${category}*\n`;
                    responseText += `📝 Keterangan: ${description}\n`;
                    responseText += `💰 Harga: Rp${toRupiah(price)}\n`;
                    responseText += `🔑 Data Akun: ${accountData.substring(0, 30)}...\n\n`;

                    if (existingGroup) {
                        responseText += `📊 *Informasi Grouping:*\n`;
                        responseText += `├ Total akun dalam group: ${totalItemsInGroup}\n`;
                        responseText += `└ Index group: ${groupIndex + 1}\n\n`;
                    } else {
                        responseText += `📊 *Grouping baru dibuat*\n`;
                        responseText += `└ Group ke: ${groupIndex + 1} dalam kategori\n\n`;
                    }

                    responseText += `📈 *Statistik Kategori ${category.toUpperCase()}*\n`;
                    responseText += `├ Total group: ${doData[category].length}\n`;
                    responseText += `└ Total item: ${totalItemsInCategory}`;

                    return ctx.reply(responseText, { parse_mode: "Markdown" });
                }

                break;
            }

            // ===== GET/DEL STOCK (OWNER ONLY) =====
            case "getstock":
            case "delstock":
            case "getstockdo":
            case "delstockdo": {
                if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");

                const isDO = command.includes("do");
                const data = isDO ? loadDO() : loadStocks();
                const categories = Object.keys(data);

                if (categories.length === 0) {
                    return ctx.reply(`📭 Tidak ada stok ${isDO ? 'Digital Ocean' : 'apps'} tersedia.`);
                }

                const categoryButtons = categories.map(cat => [
                    {
                        text: `📁 ${cat.toUpperCase()} (${data[cat].reduce((sum, item) => sum + item.accounts.length, 0)} items)`,
                        callback_data: `${isDO ? 'do' : 'view'}_category|${cat}`
                    }
                ]);

                return ctx.reply(`📊 *DAFTAR KATEGORI STOCK ${isDO ? 'DIGITAL OCEAN' : 'APPS'}*\n\nPilih kategori untuk ${command.includes('del') ? 'menghapus' : 'melihat'} stock:`, {
                    parse_mode: "Markdown",
                    reply_markup: { inline_keyboard: categoryButtons }
                });
            }

            default: {
                break;
            }
        }
    });

    // ===== CALLBACK QUERIES =====


    bot.action("buy_apps", async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.reply(
        `<pre>\nᴋᴇᴛɪᴋ sᴀᴊᴀ → ${config.prefix}buyapp\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n✅ <b>AKSES FITUR PREMIUM TANPA</b>\n✅ <b>DUKUNGAN PRIORITAS & UPDATE TERBARU</b>\n✅ <b>TRANSAKSI CEPAT DAN AMAN</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nJangan nunggu lama—upgrade pengalaman kamu sekarang! 🚀💎</pre>`,
        { parse_mode: "HTML" }
    );
});

    bot.action("buy_panel", async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.reply(
        `<pre>\nKetik aja → ${config.prefix}buypanel username\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n✅ <b>HIGH QUALITY</b>\n✅ <b>ANTI INTIP/RUSUH/MALING</b>\n✅ <b>GARANSI 30DAY UNLI</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nJangan nunggu lama—upgrade pengalaman kamu sekarang! 🚀💎</pre>`,
        { parse_mode: "HTML" }
    );
});

    bot.action("buy_script", async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.reply(
        `<pre>\nKetik aja → ${config.prefix}buyscript\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n✅ <b>SCRIPT GACOR ANTI ERROR</b>\n✅ <b>SCRIPT BERKUALITAS</b>\n✅ <b>TRANSAKSI CEPAT DAN AMAN</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nJangan nunggu lama—upgrade pengalaman kamu sekarang! 🚀💎</pre>`,
        { parse_mode: "HTML" }
    );
});

    bot.action("buy_admin", async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.reply(
        `<pre>\nKetik aja → ${config.prefix}buyadmin username\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n✅ <b>BISA OPEN RESELLER PANEL</b>\n✅ <b>ANTI RUSUH SESAMA ADMIN</b>\n✅ <b>TRANSAKSI CEPAT DAN AMAN</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nJangan nunggu lama—upgrade pengalaman kamu sekarang! 🚀💎</pre>`,
        { parse_mode: "HTML" }
    );
});

    bot.action("buy_do", async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.reply(
        `<blockquote>\nᴋᴇᴛɪᴋ sᴀᴊᴀ → ${config.prefix}buydo\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n✅ <b>ʙɪsᴀ ʙᴇʀᴊᴜᴀʟᴀɴ ᴠᴘs</b>\n✅ <b>ᴄʟᴏᴜᴅ ᴀᴡᴇᴛ ᴀɴᴛɪ ʙᴀɴᴛɪɴɢ</b>\n✅ <b>ʙɪʟʟɪɴɢ ᴀᴅᴀ ᴠᴄᴄ, ᴘᴀʏᴘᴀʟ, ɢᴏᴏɢʟᴇ ᴘᴀʏ</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nɴᴏᴛᴇ: ᴊɪᴋᴀ ɪɴɢɪɴ ᴍᴇᴍʙᴇʟɪ ᴋᴇᴛɪᴋ (/ʙᴜʏᴅᴏ) ᴅᴀɴ ᴘɪʟɪʜ ɪɴɢɪɴ ᴍᴇᴍʙᴇʟɪ ᴅʀᴏᴘʟᴇᴛ ʙᴇʀᴀᴘᴀ</blockquote>`,
        { parse_mode: "HTML" }
    );
});

    bot.action("buy_vps", async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.reply(
        `<blockquote>\nᴋᴇᴛɪᴋ sᴀᴊᴀ → ${config.prefix}buyvps\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n✅ <b>ᴠᴘs ᴀᴡᴇᴛ ᴀᴡᴇᴛ sᴀᴍᴘᴀɪ 𝟷 ʙᴜʟᴀɴ</b>\n✅ <b>sᴜᴅᴀʜ ғʀᴇᴇ ɪɴsᴛᴀʟʟ ᴘᴀɴᴇʟ</b>\n✅ <b>sᴜᴅᴀʜ ғʀᴇᴇ ᴅᴏᴍᴀɪɴ ᴘᴀɴᴇʟ (ᴡᴇʙ ʟᴏɢɪɴ)</b>\n✅ <b>ʙᴇʀɢᴀʀᴀɴsɪ 𝟽 ᴅᴀʏs/ʜᴀʀɪ (𝟷x ʀᴇᴘᴀʟᴄᴇ)</b>\n✅ <b>ʙɪsᴀ ʀᴇǫ ᴠᴘs ᴋᴏsᴏɴɢᴀɴ ᴀᴛᴀᴜ sᴜᴅᴀʜ sɪᴀᴘ ᴊᴀᴅɪ ᴘᴀɴᴇʟ</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nɴᴏᴛᴇ: ᴊɪᴋᴀ ɪɴɢɪɴ ᴍᴇᴍʙᴇʟɪ ᴋᴇᴛɪᴋ (/ʙᴜʏᴠᴘs) ᴅᴀɴ ᴘɪʟɪʜ ɪɴɢɪɴ ᴍᴇᴍʙᴇʟɪ ᴠᴘs ʀᴀᴍ ʙᴇʀᴀᴘᴀ</blockquote>`,
        { parse_mode: "HTML" }
    );
});


    bot.action("owner_menu", async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.deleteMessage();
        return ctx.replyWithPhoto(config.menuImage, {
            caption: menuTextOwn(),
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "🔄 Back To Menu", callback_data: "back_menu" }
                    ]
                ]
            }
        });
    });

    bot.action("back_menu", async (ctx) => {
        await ctx.answerCbQuery();
        try {
            await ctx.deleteMessage();

            return ctx.replyWithPhoto(config.menuImage, {
  caption: menuTextBot(ctx),
  parse_mode: "HTML",
  reply_markup: {
    inline_keyboard: [
      [
        { text: "🖥️ Beli Panel",    callback_data: "buy_panel" },
        { text: "🛠️ Beli Admin Panel",   callback_data: "buy_admin" }
      ],
      [
        { text: "📂 Beli Script", callback_data: "buy_script" },
        { text: "📱 Beli Apps Premium",  callback_data: "buy_apps"  }
      ],
      [
        { text: "🌊 Beli Akun DO", callback_data: "buy_do" },
        { text: "💻 Beli VPS DO",  callback_data: "buy_vps" }
      ],
      [
        { text: "🕊️ Owner Menu",   callback_data: "owner_menu" }
      ]
    ]
  }
});

        } catch (err) {
            console.error("back_menu error:", err);
        }
    });

    bot.action("cancel_order", async (ctx) => {
        await ctx.answerCbQuery();
        const userId = ctx.from.id;
        const order = orders[userId];

        if (order) {
            try {
                if (order.qrMessageId)
                    await ctx.telegram.deleteMessage(order.chatId, order.qrMessageId);
            } catch { }
            delete orders[userId];
        }

        return ctx.telegram.sendMessage(
            ctx.chat.id,
            "❌ Order berhasil dibatalkan.\nSilakan order ulang dari .menu",
            {
                parse_mode: "Markdown",
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "🔄 Back To Menu", callback_data: "back_menu" }
                        ]
                    ]
                }
            }
        );
    });

    // ===== STOCK CATEGORY VIEW =====
    bot.action(/view_category\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery();
        if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');

        const category = ctx.match[1];
        const stocks = loadStocks();
        const items = stocks[category];

        if (!items || items.length === 0) {
            return ctx.editMessageText(`❌ Tidak ada stock di kategori *${category}*.`,
                { parse_mode: "Markdown" });
        }

        let allItems = [];
        let globalIndex = 0;

        items.forEach((item, itemIdx) => {
            item.accounts.forEach((account, accIdx) => {
                allItems.push({
                    category: category,
                    description: item.description,
                    price: item.price,
                    account: account,
                    globalIndex: globalIndex,
                    itemIndex: itemIdx,
                    accountIndex: accIdx,
                    added_date: item.added_date,
                    totalInGroup: item.accounts.length,
                    stockInGroup: item.stock
                });
                globalIndex++;
            });
        });

        const itemsPerPage = 8;
        const totalPages = Math.ceil(allItems.length / itemsPerPage);
        let currentPage = 0;

        const createPage = (page) => {
            const startIdx = page * itemsPerPage;
            const endIdx = Math.min(startIdx + itemsPerPage, allItems.length);
            const pageItems = allItems.slice(startIdx, endIdx);

            const buttons = pageItems.map((item, idx) => [
                {
                    text: `📦 ${item.description} - Rp${toRupiah(item.price)}`,
                    callback_data: `stock_detail|${category}|${item.itemIndex}|${item.accountIndex}`
                }
            ]);

            const navButtons = [];
            if (totalPages > 1) {
                if (page > 0) {
                    navButtons.push({ text: "◀️ Prev", callback_data: `category_page|${category}|${page - 1}` });
                }
                navButtons.push({ text: `${page + 1}/${totalPages}`, callback_data: "noop" });
                if (page < totalPages - 1) {
                    navButtons.push({ text: "Next ▶️", callback_data: `category_page|${category}|${page + 1}` });
                }
            }

            const actionButtons = [
                [
                    { text: "🗑️ Hapus Kategori Ini", callback_data: `del_category|${category}` },
                    { text: "📋 Semua Kategori", callback_data: "back_to_categories" }
                ]
            ];

            if (navButtons.length > 0) {
                buttons.push(navButtons);
            }
            buttons.push(...actionButtons);

            return {
                text: `📊 *STOCK KATEGORI: ${category.toUpperCase()}*\n\n` +
                    `📝 Total Item: ${allItems.length}\n` +
                    `📅 Halaman: ${page + 1}/${totalPages}\n\n` +
                    `Pilih item untuk melihat detail:`,
                keyboard: { inline_keyboard: buttons }
            };
        };

        const pageData = createPage(currentPage);
        return ctx.editMessageText(pageData.text, {
            parse_mode: "Markdown",
            reply_markup: pageData.keyboard
        });
    });

    // === DIGITAL OCEAN CATEGORY VIEW ===
    bot.action(/do_category\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery();
        if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');
        const category = ctx.match[1];
        const doData = loadDO();
        const items = doData[category];

        if (!items || items.length === 0) {
            return ctx.editMessageText(`❌ Tidak ada stock di kategori *${category}*.`,
                { parse_mode: "Markdown" });
        }

        let allItems = [];
        let globalIndex = 0;

        items.forEach((item, itemIdx) => {
            item.accounts.forEach((account, accIdx) => {
                allItems.push({
                    category: category,
                    description: item.description,
                    price: item.price,
                    account: account,
                    globalIndex: globalIndex,
                    itemIndex: itemIdx,
                    accountIndex: accIdx,
                    added_date: item.added_date,
                    totalInGroup: item.accounts.length,
                    stockInGroup: item.stock
                });
                globalIndex++;
            });
        });

        const itemsPerPage = 8;
        const totalPages = Math.ceil(allItems.length / itemsPerPage);
        let currentPage = 0;

        const createPage = (page) => {
            const startIdx = page * itemsPerPage;
            const endIdx = Math.min(startIdx + itemsPerPage, allItems.length);
            const pageItems = allItems.slice(startIdx, endIdx);

            const buttons = pageItems.map((item, idx) => [
                {
                    text: `🌊 ${item.description} - Rp${toRupiah(item.price)}`,
                    callback_data: `do_detail|${category}|${item.itemIndex}|${item.accountIndex}`
                }
            ]);

            const navButtons = [];
            if (totalPages > 1) {
                if (page > 0) {
                    navButtons.push({ text: "◀️ Prev", callback_data: `do_category_page|${category}|${page - 1}` });
                }
                navButtons.push({ text: `${page + 1}/${totalPages}`, callback_data: "noop" });
                if (page < totalPages - 1) {
                    navButtons.push({ text: "Next ▶️", callback_data: `do_category_page|${category}|${page + 1}` });
                }
            }

            const actionButtons = [
                [
                    { text: "🗑️ Hapus Kategori Ini", callback_data: `del_do_category|${category}` },
                    { text: "📋 Semua Kategori", callback_data: "back_to_do_categories" }
                ]
            ];

            if (navButtons.length > 0) {
                buttons.push(navButtons);
            }
            buttons.push(...actionButtons);

            return {
                text: `🌊 *DIGITAL OCEAN KATEGORI: ${category.toUpperCase()}*\n\n` +
                    `📝 Total Item: ${allItems.length}\n` +
                    `📅 Halaman: ${page + 1}/${totalPages}\n\n` +
                    `Pilih item untuk melihat detail:`,
                keyboard: { inline_keyboard: buttons }
            };
        };

        const pageData = createPage(currentPage);
        return ctx.editMessageText(pageData.text, {
            parse_mode: "Markdown",
            reply_markup: pageData.keyboard
        });
    });

    // == DIGITAL OCEAN BUY CATEGORY ===
    bot.action(/do_category_buy\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery();
        const category = ctx.match[1];
        const doData = loadDO();
        const items = doData[category];

        if (!items || items.length === 0) {
            return ctx.editMessageText(`❌ Stok untuk kategori *${category}* sedang kosong.`,
                { parse_mode: "Markdown" });
        }

        const itemButtons = items.map((item, index) => [
            {
                text: `🌊 ${item.description} - Rp${toRupiah(item.price)} (stok ${item.stock})`,
                callback_data: `do_item_buy|${category}|${index}`
            }
        ]);

        itemButtons.push([
            {
                text: `↩️ Kembali ke Kategori`,
                callback_data: `back_do_buy_category`
            }
        ]);

        return ctx.editMessageText(`🌊 *${category.toUpperCase()}*\n\nPilih item yang ingin dibeli:`, {
            parse_mode: "Markdown",
            reply_markup: { inline_keyboard: itemButtons }
        });
    });

    bot.action("back_do_buy_category", async (ctx) => {
        await ctx.answerCbQuery();
        const doData = loadDO();
        const categories = Object.keys(doData);

        if (categories.length === 0) {
            return ctx.reply("📭 Stok Digital Ocean sedang kosong.");
        }

        const categoryButtons = categories.map(cat => [
            { text: `🌊 ${cat.charAt(0).toUpperCase() + cat.slice(1)}`, callback_data: `do_category_buy|${cat}` }
        ]);

        return ctx.editMessageText("🌊 *Pilih Kategori Digital Ocean:*", {
            parse_mode: "Markdown",
            reply_markup: { inline_keyboard: categoryButtons }
        });
    });

    // ===== DIGITAL OCEAN BUY ITEM =====
    bot.action(/do_item_buy\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.deleteMessage();

        const [category, indexStr] = ctx.match[1].split("|");
        const index = parseInt(indexStr);
        const doData = loadDO();
        const items = doData[category];

        if (!items || !items[index]) {
            return ctx.reply("❌ Item tidak ditemukan!");
        }

        const item = items[index];
        if (item.stock <= 0) {
            return ctx.reply("❌ Stok habis!");
        }

        const userId = ctx.from.id;
        const fee = generateRandomFee();
        const price = item.price + fee;
        const name = `Digital Ocean ${category} (${item.description})`;

        const paymentType = config.paymentGateway;

        const pay = await createPayment(paymentType, price, config);

        orders[userId] = {
            type: "do",
            category,
            itemIndex: index,
            name,
            description: item.description,
            account: item.accounts[0],
            accounts: item.accounts,
            amount: price,
            fee,
            orderId: pay.orderId || null,
            paymentType: paymentType,
            chatId: ctx.chat.id,
            expireAt: Date.now() + 6 * 60 * 1000
        };

        const photo =
            paymentType === "pakasir"
                ? { source: pay.qris }
                : pay.qris;

        const qrMsg = await ctx.replyWithPhoto(photo, {
            caption: textOrder(name, price, fee),
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [{ text: "❌ Batalkan Order", callback_data: "cancel_order" }]
                ]
            }
        });

        orders[userId].qrMessageId = qrMsg.message_id;
        startCheck(userId, ctx);
    });

    bot.action(/category_page\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery();
        if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');

        const [category, pageStr] = ctx.match[1].split("|");
        const page = parseInt(pageStr);

        const stocks = loadStocks();
        const items = stocks[category];

        if (!items) {
            return ctx.editMessageText("❌ Kategori tidak ditemukan.");
        }

        let allItems = [];
        let globalIndex = 0;

        items.forEach((item, itemIdx) => {
            item.accounts.forEach((account, accIdx) => {
                allItems.push({
                    category: category,
                    description: item.description,
                    price: item.price,
                    account: account,
                    globalIndex: globalIndex,
                    itemIndex: itemIdx,
                    accountIndex: accIdx,
                    added_date: item.added_date,
                    totalInGroup: item.accounts.length,
                    stockInGroup: item.stock
                });
                globalIndex++;
            });
        });

        const itemsPerPage = 8;
        const totalPages = Math.ceil(allItems.length / itemsPerPage);

        const createPage = (pageNum) => {
            const startIdx = pageNum * itemsPerPage;
            const endIdx = Math.min(startIdx + itemsPerPage, allItems.length);
            const pageItems = allItems.slice(startIdx, endIdx);

            const buttons = pageItems.map((item, idx) => [
                {
                    text: `📦 ${item.description} - Rp${toRupiah(item.price)}`,
                    callback_data: `stock_detail|${category}|${item.itemIndex}|${item.accountIndex}`
                }
            ]);

            const navButtons = [];
            if (totalPages > 1) {
                if (pageNum > 0) {
                    navButtons.push({ text: "◀️ Prev", callback_data: `category_page|${category}|${pageNum - 1}` });
                }
                navButtons.push({ text: `${pageNum + 1}/${totalPages}`, callback_data: "noop" });
                if (pageNum < totalPages - 1) {
                    navButtons.push({ text: "Next ▶️", callback_data: `category_page|${category}|${pageNum + 1}` });
                }
            }

            const actionButtons = [
                [
                    { text: "🗑️ Hapus Kategori Ini", callback_data: `del_category|${category}` },
                    { text: "📋 Semua Kategori", callback_data: "back_to_categories" }
                ]
            ];

            if (navButtons.length > 0) {
                buttons.push(navButtons);
            }
            buttons.push(...actionButtons);

            return {
                text: `📊 *STOCK KATEGORI: ${category.toUpperCase()}*\n\n` +
                    `📝 Total Item: ${allItems.length}\n` +
                    `📅 Halaman: ${pageNum + 1}/${totalPages}\n\n` +
                    `Pilih item untuk melihat detail:`,
                keyboard: { inline_keyboard: buttons }
            };
        };

        const pageData = createPage(page);
        return ctx.editMessageText(pageData.text, {
            parse_mode: "Markdown",
            reply_markup: pageData.keyboard
        });
    });

    bot.action(/do_category_page\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery();
        if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');

        const [category, pageStr] = ctx.match[1].split("|");
        const page = parseInt(pageStr);

        const doData = loadDO();
        const items = doData[category];

        if (!items) {
            return ctx.editMessageText("❌ Kategori tidak ditemukan.");
        }

        let allItems = [];
        let globalIndex = 0;

        items.forEach((item, itemIdx) => {
            item.accounts.forEach((account, accIdx) => {
                allItems.push({
                    category: category,
                    description: item.description,
                    price: item.price,
                    account: account,
                    globalIndex: globalIndex,
                    itemIndex: itemIdx,
                    accountIndex: accIdx,
                    added_date: item.added_date,
                    totalInGroup: item.accounts.length,
                    stockInGroup: item.stock
                });
                globalIndex++;
            });
        });

        const itemsPerPage = 8;
        const totalPages = Math.ceil(allItems.length / itemsPerPage);

        const createPage = (pageNum) => {
            const startIdx = pageNum * itemsPerPage;
            const endIdx = Math.min(startIdx + itemsPerPage, allItems.length);
            const pageItems = allItems.slice(startIdx, endIdx);

            const buttons = pageItems.map((item, idx) => [
                {
                    text: `🌊 ${item.description} - Rp${toRupiah(item.price)}`,
                    callback_data: `do_detail|${category}|${item.itemIndex}|${item.accountIndex}`
                }
            ]);

            const navButtons = [];
            if (totalPages > 1) {
                if (pageNum > 0) {
                    navButtons.push({ text: "◀️ Prev", callback_data: `do_category_page|${category}|${pageNum - 1}` });
                }
                navButtons.push({ text: `${pageNum + 1}/${totalPages}`, callback_data: "noop" });
                if (pageNum < totalPages - 1) {
                    navButtons.push({ text: "Next ▶️", callback_data: `do_category_page|${category}|${pageNum + 1}` });
                }
            }

            const actionButtons = [
                [
                    { text: "🗑️ Hapus Kategori Ini", callback_data: `del_do_category|${category}` },
                    { text: "📋 Semua Kategori", callback_data: "back_to_do_categories" }
                ]
            ];

            if (navButtons.length > 0) {
                buttons.push(navButtons);
            }
            buttons.push(...actionButtons);

            return {
                text: `🌊 *DIGITAL OCEAN KATEGORI: ${category.toUpperCase()}*\n\n` +
                    `📝 Total Item: ${allItems.length}\n` +
                    `📅 Halaman: ${pageNum + 1}/${totalPages}\n\n` +
                    `Pilih item untuk melihat detail:`,
                keyboard: { inline_keyboard: buttons }
            };
        };

        const pageData = createPage(page);
        return ctx.editMessageText(pageData.text, {
            parse_mode: "Markdown",
            reply_markup: pageData.keyboard
        });
    });

    bot.action(/stock_detail\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery();
        if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');

        const [category, itemIndexStr, accountIndexStr] = ctx.match[1].split("|");
        const itemIndex = parseInt(itemIndexStr);
        const accountIndex = parseInt(accountIndexStr);

        const stocks = loadStocks();

        if (!stocks[category] || !stocks[category][itemIndex]) {
            return ctx.editMessageText("❌ Item tidak ditemukan.");
        }

        const item = stocks[category][itemIndex];
        const account = item.accounts[accountIndex];

        if (!account) {
            return ctx.editMessageText("❌ Akun tidak ditemukan.");
        }

        const detailText = `📋 *DETAIL STOCK ITEM*

📁 *Kategori:* ${category.toUpperCase()}
📝 *Deskripsi:* ${item.description}
💰 *Harga:* Rp${toRupiah(item.price)}
📅 *Ditambahkan:* ${new Date(item.added_date).toLocaleDateString('id-ID')}

🔑 *Data Akun:* 
\`${account}\`

📊 *Informasi Grup:*
├ Total Akun: ${item.accounts.length}
├ Stok: ${item.stock}
└ Index: ${itemIndex + 1}/${stocks[category].length} (kategori)`;

        return ctx.editMessageText(detailText, {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "🗑️ Hapus Item Ini", callback_data: `del_stock_item|${category}|${itemIndex}|${accountIndex}` }
                    ],
                    [
                        { text: "📂 Kembali ke Kategori", callback_data: `view_category|${category}` },
                        { text: "🏠 Semua Kategori", callback_data: "back_to_categories" }
                    ]
                ]
            }
        });
    });

    bot.action(/do_detail\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery();
        if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');

        const [category, itemIndexStr, accountIndexStr] = ctx.match[1].split("|");
        const itemIndex = parseInt(itemIndexStr);
        const accountIndex = parseInt(accountIndexStr);

        const doData = loadDO();

        if (!doData[category] || !doData[category][itemIndex]) {
            return ctx.editMessageText("❌ Item tidak ditemukan.");
        }

        const item = doData[category][itemIndex];
        const account = item.accounts[accountIndex];

        if (!account) {
            return ctx.editMessageText("❌ Akun tidak ditemukan.");
        }

        const detailText = `🌊 *DETAIL DIGITAL OCEAN ITEM*

📁 *Kategori:* ${category.toUpperCase()}
📝 *Deskripsi:* ${item.description}
💰 *Harga:* Rp${toRupiah(item.price)}
📅 *Ditambahkan:* ${new Date(item.added_date).toLocaleDateString('id-ID')}

🔑 *Data Akun:* 
\`${account}\`

📊 *Informasi Grup:*
├ Total Akun: ${item.accounts.length}
├ Stok: ${item.stock}
└ Index: ${itemIndex + 1}/${doData[category].length} (kategori)`;

        return ctx.editMessageText(detailText, {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "🗑️ Hapus Item Ini", callback_data: `del_do_item|${category}|${itemIndex}|${accountIndex}` }
                    ],
                    [
                        { text: "📂 Kembali ke Kategori", callback_data: `do_category|${category}` },
                        { text: "🏠 Semua Kategori", callback_data: "back_to_do_categories" }
                    ]
                ]
            }
        });
    });

    bot.action(/del_stock_item\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery();
        if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');

        const [category, itemIndexStr, accountIndexStr] = ctx.match[1].split("|");
        const itemIndex = parseInt(itemIndexStr);
        const accountIndex = parseInt(accountIndexStr);

        const stocks = loadStocks();

        if (!stocks[category] || !stocks[category][itemIndex]) {
            return ctx.editMessageText("❌ Item tidak ditemukan.");
        }

        const item = stocks[category][itemIndex];
        const deletedAccount = item.accounts[accountIndex];

        item.accounts.splice(accountIndex, 1);
        item.stock -= 1;

        if (item.accounts.length === 0) {
            stocks[category].splice(itemIndex, 1);

            if (stocks[category].length === 0) {
                delete stocks[category];
                saveStocks(stocks);
                return ctx.editMessageText(
                    `✅ Item berhasil dihapus!\n\n` +
                    `📁 Kategori: ${category} (dihapus karena kosong)\n` +
                    `🔑 Akun yang dihapus: ${deletedAccount.substring(0, 50)}...\n\n` +
                    `Kategori telah dihapus karena tidak ada item lagi.`,
                    {
                        parse_mode: "Markdown",
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: "📋 Kembali ke List Kategori", callback_data: "back_to_categories" }]
                            ]
                        }
                    }
                );
            }
        }

        saveStocks(stocks);

        return ctx.editMessageText(
            `✅ Item berhasil dihapus!\n\n` +
            `📁 Kategori: ${category}\n` +
            `📝 Deskripsi: ${item.description}\n` +
            `🔑 Akun yang dihapus: ${deletedAccount.substring(0, 50)}...\n` +
            `💰 Harga: Rp${toRupiah(item.price)}\n` +
            `📊 Sisa stok: ${item.accounts.length} akun`,
            {
                parse_mode: "Markdown",
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "📂 Lihat Kategori", callback_data: `view_category|${category}` },
                            { text: "📋 Semua Kategori", callback_data: "back_to_categories" }
                        ]
                    ]
                }
            }
        );
    });

    bot.action(/del_do_item\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery();
        if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');

        const [category, itemIndexStr, accountIndexStr] = ctx.match[1].split("|");
        const itemIndex = parseInt(itemIndexStr);
        const accountIndex = parseInt(accountIndexStr);

        const doData = loadDO();

        if (!doData[category] || !doData[category][itemIndex]) {
            return ctx.editMessageText("❌ Item tidak ditemukan.");
        }

        const item = doData[category][itemIndex];
        const deletedAccount = item.accounts[accountIndex];

        item.accounts.splice(accountIndex, 1);
        item.stock -= 1;

        if (item.accounts.length === 0) {
            doData[category].splice(itemIndex, 1);

            if (doData[category].length === 0) {
                delete doData[category];
                saveDO(doData);
                return ctx.editMessageText(
                    `✅ Item berhasil dihapus!\n\n` +
                    `📁 Kategori: ${category} (dihapus karena kosong)\n` +
                    `🔑 Akun yang dihapus: ${deletedAccount.substring(0, 50)}...\n\n` +
                    `Kategori telah dihapus karena tidak ada item lagi.`,
                    {
                        parse_mode: "Markdown",
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: "📋 Kembali ke List Kategori", callback_data: "back_to_do_categories" }]
                            ]
                        }
                    }
                );
            }
        }

        saveDO(doData);

        return ctx.editMessageText(
            `✅ Item berhasil dihapus!\n\n` +
            `📁 Kategori: ${category}\n` +
            `📝 Deskripsi: ${item.description}\n` +
            `🔑 Akun yang dihapus: ${deletedAccount.substring(0, 50)}...\n` +
            `💰 Harga: Rp${toRupiah(item.price)}\n` +
            `📊 Sisa stok: ${item.accounts.length} akun`,
            {
                parse_mode: "Markdown",
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "📂 Lihat Kategori", callback_data: `do_category|${category}` },
                            { text: "📋 Semua Kategori", callback_data: "back_to_do_categories" }
                        ]
                    ]
                }
            }
        );
    });

    bot.action(/del_category\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery();
        if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');

        const category = ctx.match[1];
        const stocks = loadStocks();

        if (!stocks[category]) {
            return ctx.editMessageText("❌ Kategori tidak ditemukan.");
        }

        const totalItems = stocks[category].reduce((sum, item) => sum + item.accounts.length, 0);
        const categoryName = category;

        delete stocks[category];
        saveStocks(stocks);

        return ctx.editMessageText(
            `🗑️ *Kategori Berhasil Dihapus!*\n\n` +
            `📁 Kategori: ${categoryName.toUpperCase()}\n` +
            `📊 Total Item: ${totalItems}\n` +
            `✅ Semua data dalam kategori ini telah dihapus.`,
            {
                parse_mode: "Markdown",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "📋 Lihat Kategori Lain", callback_data: "back_to_categories" }]
                    ]
                }
            }
        );
    });

    bot.action(/del_do_category\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery();
        if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');

        const category = ctx.match[1];
        const doData = loadDO();

        if (!doData[category]) {
            return ctx.editMessageText("❌ Kategori tidak ditemukan.");
        }

        const totalItems = doData[category].reduce((sum, item) => sum + item.accounts.length, 0);
        const categoryName = category;

        delete doData[category];
        saveDO(doData);

        return ctx.editMessageText(
            `🗑️ *Kategori Digital Ocean Berhasil Dihapus!*\n\n` +
            `📁 Kategori: ${categoryName.toUpperCase()}\n` +
            `📊 Total Item: ${totalItems}\n` +
            `✅ Semua data dalam kategori ini telah dihapus.`,
            {
                parse_mode: "Markdown",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "📋 Lihat Kategori Lain", callback_data: "back_to_do_categories" }]
                    ]
                }
            }
        );
    });

    bot.action("back_to_categories", async (ctx) => {
        await ctx.answerCbQuery();
        if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');

        const stocks = loadStocks();
        const categories = Object.keys(stocks);

        if (categories.length === 0) {
            return ctx.editMessageText("📭 Tidak ada stok tersedia.");
        }

        const categoryButtons = categories.map(cat => [
            {
                text: `📁 ${cat.toUpperCase()} (${stocks[cat].reduce((sum, item) => sum + item.accounts.length, 0)} items)`,
                callback_data: `view_category|${cat}`
            }
        ]);

        return ctx.editMessageText("📊 *DAFTAR KATEGORI STOCK*\n\nPilih kategori untuk melihat stock:", {
            parse_mode: "Markdown",
            reply_markup: { inline_keyboard: categoryButtons }
        });
    });

    bot.action("back_to_do_categories", async (ctx) => {
        await ctx.answerCbQuery();
        if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');

        const doData = loadDO();
        const categories = Object.keys(doData);

        if (categories.length === 0) {
            return ctx.editMessageText("📭 Tidak ada stok Digital Ocean tersedia.");
        }

        const categoryButtons = categories.map(cat => [
            {
                text: `🌊 ${cat.toUpperCase()} (${doData[cat].reduce((sum, item) => sum + item.accounts.length, 0)} items)`,
                callback_data: `do_category|${cat}`
            }
        ]);

        return ctx.editMessageText("🌊 *DAFTAR KATEGORI DIGITAL OCEAN*\n\nPilih kategori untuk melihat stock:", {
            parse_mode: "Markdown",
            reply_markup: { inline_keyboard: categoryButtons }
        });
    });

    bot.action("noop", async (ctx) => {
        await ctx.answerCbQuery();
    });

    bot.action("back_stock_category", async (ctx) => {
        await ctx.answerCbQuery();
        const stocks = loadStocks();
        const categories = Object.keys(stocks);

        if (categories.length === 0) {
            return ctx.reply("📭 Stok apps premium sedang kosong.");
        }

        const categoryButtons = categories.map(cat => [
            { text: `📱 ${cat.charAt(0).toUpperCase() + cat.slice(1)}`, callback_data: `app_category|${cat}` }
        ]);

        return ctx.editMessageText("📱 *Pilih Kategori Apps Premium:*", {
            parse_mode: "Markdown",
            reply_markup: { inline_keyboard: categoryButtons }
        });
    });

    bot.action(/app_category\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery();
        const category = ctx.match[1];
        const stocks = loadStocks();
        const items = stocks[category];

        if (!items || items.length === 0) {
            return ctx.editMessageText(`❌ Stok untuk kategori *${category}* sedang kosong.`,
                { parse_mode: "Markdown" });
        }

        const itemButtons = items.map((item, index) => [
            {
                text: `📱 ${item.description} - Rp${toRupiah(item.price)} (stok ${item.stock})`,
                callback_data: `app_item|${category}|${index}`
            }
        ]);

        itemButtons.push([
            {
                text: `↩️ Kembali ke Kategori`,
                callback_data: `back_stock_category`
            }
        ]);

        return ctx.editMessageText(`📱 *${category.toUpperCase()}*\n\nPilih item yang ingin dibeli:`, {
            parse_mode: "Markdown",
            reply_markup: { inline_keyboard: itemButtons }
        });
    });

    bot.action(/app_item\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.deleteMessage();

        const [category, indexStr] = ctx.match[1].split("|");
        const index = parseInt(indexStr);
        const stocks = loadStocks();
        const items = stocks[category];

        if (!items || !items[index]) {
            return ctx.reply("❌ Item tidak ditemukan!");
        }

        const item = items[index];
        if (item.stock <= 0) {
            return ctx.reply("❌ Stok habis!");
        }

        const userId = ctx.from.id;
        const fee = generateRandomFee();
        const price = item.price + fee;
        const name = `${category.toUpperCase()} - ${item.description}`;

        const paymentType = config.paymentGateway;

        const pay = await createPayment(paymentType, price, config);

        orders[userId] = {
            type: "app",
            category,
            itemIndex: index,
            name,
            description: item.description,
            account: item.accounts[0],
            accounts: item.accounts,
            amount: price,
            fee,
            orderId: pay.orderId || null,
            paymentType: paymentType,
            chatId: ctx.chat.id,
            expireAt: Date.now() + 6 * 60 * 1000
        };

        const photo =
            paymentType === "pakasir"
                ? { source: pay.qris }
                : pay.qris;

        const qrMsg = await ctx.replyWithPhoto(photo, {
            caption: textOrder(name, price, fee),
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [{ text: "❌ Batalkan Order", callback_data: "cancel_order" }]
                ]
            }
        });

        orders[userId].qrMessageId = qrMsg.message_id;
        startCheck(userId, ctx);
    });


    // Handler untuk kembali ke pilihan paket
    bot.action(/back_to_packages/, async (ctx) => {
        await ctx.answerCbQuery();

        const packageButtons = vpsPackages.map((pkg) => [
            {
                text: `${pkg.label} - Rp${toRupiah(pkg.price)}`,
                callback_data: `vps_step1|${pkg.key}`
            }
        ]);

        return ctx.editMessageText("💻 *BUY VPS DIGITAL OCEAN - Step 1*\n\n*Pilih Paket RAM & CPU:*", {
            parse_mode: "Markdown",
            reply_markup: { inline_keyboard: packageButtons }
        });
    });

    // ===== VPS STEP 1: Pilih RAM & CPU (satu set) =====
    bot.action(/vps_step1\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery();
        const specKey = ctx.match[1];

        if (!vpsSpecs[specKey]) {
            return ctx.editMessageText(`❌ *Error:* Spec "${specKey}" tidak ditemukan.\n\nSilakan ulangi dari awal: ${config.prefix}buyvps`, {
                parse_mode: "Markdown"
            });
        }

        const spec = vpsSpecs[specKey];

        // Step 2: Langsung tampilkan semua OS
        const osButtons = Object.entries(vpsImages).map(([osKey, os]) => {
            const costInfo = getOSAdditionalCost(osKey);
            const priceText = costInfo.additional ? ` (+Rp${toRupiah(costInfo.cost)})` : '';

            return [
                {
                    text: `${os.icon} ${os.name}${priceText}`,
                    callback_data: `vps_step2|${specKey}|${osKey}`
                }
            ];
        });

        // Tambahkan tombol kembali
        osButtons.push([
            {
                text: "↩️ Kembali ke Paket",
                callback_data: `back_to_packages`
            }
        ]);

        return ctx.editMessageText(`💻 *BUY VPS DIGITAL OCEAN - Step 2*\n\n*Paket Terpilih:* ${spec.name}\n\n*Pilih Operating System:*`, {
            parse_mode: "Markdown",
            reply_markup: { inline_keyboard: osButtons }
        });
    });

    // ===== VPS STEP 2: Pilih OS =====
    bot.action(/vps_step2\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery();
        const [specKey, osKey] = ctx.match[1].split("|");

        if (!vpsSpecs[specKey]) {
            return ctx.editMessageText(`❌ *Error:* Spec "${specKey}" tidak ditemukan.\n\nSilakan ulangi dari awal: ${config.prefix}buyvps`, {
                parse_mode: "Markdown"
            });
        }

        if (!vpsImages[osKey]) {
            return ctx.editMessageText(`❌ *Error:* OS "${osKey}" tidak ditemukan.\n\nSilakan pilih OS lain.`, {
                parse_mode: "Markdown"
            });
        }

        const spec = vpsSpecs[specKey];
        const osImage = vpsImages[osKey];
        const costInfo = getOSAdditionalCost(osKey);

        // Step 3: Langsung pilih Region (tidak ada pilihan versi)
        const regionButtons = Object.entries(vpsRegions).map(([key, region]) => [
            {
                text: `${region.flag} ${region.name}`,
                callback_data: `vps_step3|${specKey}|${osKey}|${key}`
            }
        ]);

        // Tambahkan tombol kembali
        regionButtons.push([
            {
                text: "↩️ Kembali ke OS",
                callback_data: `vps_step1|${specKey}`
            }
        ]);

        // Tampilkan info biaya tambahan jika ada
        const additionalCostText = costInfo.additional ? `\n*Biaya OS:* Rp${toRupiah(costInfo.cost)}` : '';

        return ctx.editMessageText(`💻 *BUY VPS DIGITAL OCEAN - Step 3*\n\n*Spesifikasi:*\n• ${spec.name}${additionalCostText}\n• OS: ${osImage.name}\n\n*Pilih Region:*`, {
            parse_mode: "Markdown",
            reply_markup: { inline_keyboard: regionButtons }
        });
    });

    // ===== VPS STEP 3: Pilih Region dan Tampilkan QRIS =====
    bot.action(/vps_step3\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.deleteMessage();

        const [specKey, osKey, regionKey] = ctx.match[1].split("|");

        // Validasi semua input
        if (!vpsSpecs[specKey]) {
            return ctx.reply(`❌ *Error:* Spec "${specKey}" tidak ditemukan.\n\nSilakan ulangi dari awal: ${config.prefix}buyvps`, {
                parse_mode: "Markdown"
            });
        }

        if (!vpsImages[osKey]) {
            return ctx.reply(`❌ *Error:* OS "${osKey}" tidak ditemukan.\n\nSilakan ulangi dari awal: ${config.prefix}buyvps`, {
                parse_mode: "Markdown"
            });
        }

        if (!vpsRegions[regionKey]) {
            return ctx.reply(`❌ *Error:* Region "${regionKey}" tidak ditemukan.\n\nSilakan ulangi dari awal: ${config.prefix}buyvps`, {
                parse_mode: "Markdown"
            });
        }

        const spec = vpsSpecs[specKey];
        const osImage = vpsImages[osKey];
        const region = vpsRegions[regionKey];

        // Validasi OS untuk region
        const regionValidation = validateOSForRegion(osKey, regionKey);
        if (!regionValidation.valid) {
            return ctx.reply(`❌ *Error:* ${regionValidation.message}\n\nSilakan pilih region lain.`, {
                parse_mode: "Markdown"
            });
        }

        const userId = ctx.from.id;
        let basePrice = (vpsPackages.find(v => v.key === specKey)).price

        // Tambahkan biaya OS jika ada
        const osCostInfo = getOSAdditionalCost(osKey);
        const osAdditionalCost = osCostInfo.additional ? osCostInfo.cost : 0;

        const fee = generateRandomFee();
        const totalPrice = basePrice + osAdditionalCost + fee;
        const name = `VPS Digital Ocean ${spec.name}`;

        const paymentType = config.paymentGateway;
        const pay = await createPayment(paymentType, totalPrice, config);

        orders[userId] = {
            type: "vps",
            specKey: specKey,
            osKey: osKey,
            regionKey: regionKey,
            name: name,
            spec: {
                ramCpu: spec,
                os: osImage,
                region: region,
                basePrice: basePrice,
                osAdditionalCost: osAdditionalCost
            },
            amount: totalPrice,
            fee: fee,
            orderId: pay.orderId || null,
            paymentType: paymentType,
            chatId: ctx.chat.id,
            expireAt: Date.now() + 6 * 60 * 1000
        };

        const orderDetails = `📋 *Detail Order VPS Digital Ocean*

💻 *Spesifikasi:*
├ Paket: ${spec.name}
├ OS: ${osImage.name}
├ Region: ${region.flag} ${region.name}
└ Latency: ${region.latency}`;

        const photo =
            paymentType === "pakasir"
                ? { source: pay.qris }
                : pay.qris;

        const qrMsg = await ctx.replyWithPhoto(photo, {
            caption: orderDetails + "\n" + textOrder(name, totalPrice, fee),
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [{ text: "❌ Batalkan Order", callback_data: "cancel_order" }]
                ]
            }
        });

        orders[userId].qrMessageId = qrMsg.message_id;
        startCheck(userId, ctx);
    });

    // Handler untuk kembali ke pilihan paket
    bot.action(/back_to_packages/, async (ctx) => {
        await ctx.answerCbQuery();

        const packageButtons = vpsPackages.map((pkg) => [
            {
                text: `${pkg.label} - Rp${toRupiah(pkg.price)}`,
                callback_data: `vps_step1|${pkg.key}`
            }
        ]);

        return ctx.editMessageText("💻 *BUY VPS DIGITAL OCEAN - Step 1*\n\n*Pilih Paket RAM & CPU:*", {
            parse_mode: "Markdown",
            reply_markup: { inline_keyboard: packageButtons }
        });
    });


    function getStorageSize(specKey) {
        const storageMap = {
            "r1c1": "25GB",
            "r2c2": "50GB",
            "r4c2": "80GB",
            "r8c4": "160GB",
            "r16c4": "320GB",
            "r16c8": "320GB",
            "r32c8": "640GB"
        };
        return storageMap[specKey] || "25GB";
    }

    function generateStrongPassword() {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
        let password = "";
        for (let i = 0; i < 12; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }

    // Fungsi untuk membuat VPS Digital Ocean (Sesuai Dokumentasi Resmi)
    async function createVPSDroplet(apiKey, hostname, spec, os, region, password) {
        // Validasi input
        if (!vpsSpecs[spec]) {
            throw new Error(`Spec "${spec}" tidak valid. Pilihan: ${Object.keys(vpsSpecs).join(', ')}`);
        }

        if (!vpsImages[os]) {
            throw new Error(`OS "${os}" tidak valid. Pilihan: ${Object.keys(vpsImages).join(', ')}`);
        }

        // Data droplet sesuai dokumentasi resmi
        // https://docs.digitalocean.com/reference/api/api-reference/#tag/Droplets
        const dropletData = {
            name: hostname.toLowerCase().trim().substring(0, 63), // Max 63 karakter
            region: region,
            size: vpsSpecs[spec].size,
            image: vpsImages[os].image,

            // Optional parameters sesuai dokumentasi
            ssh_keys: [], // Array of SSH key IDs (bisa kosong)
            backups: false, // Disable automatic backups
            ipv6: true, // Enable IPv6
            monitoring: true, // Enable monitoring
            tags: [
                "autoorder-vps",
                "telegram-bot",
                `user-${hostname}`,
                new Date().toISOString().split("T")[0] // YYYY-MM-DD
            ],

            // Cloud-config untuk set password root
            // https://docs.digitalocean.com/products/droplets/how-to/provide-user-data/
            user_data: `#cloud-config
users:
  - name: root
    lock_passwd: false
    passwd: "${password}"
chpasswd:
  expire: false
ssh_pwauth: true
runcmd:
  - echo "VPS created by AutoOrder Telegram Bot" > /etc/motd
  - sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/g' /etc/ssh/sshd_config
  - systemctl restart sshd`
        };

        try {
            console.log(`Creating droplet with data:`, JSON.stringify(dropletData, null, 2));

            const response = await fetch("https://api.digitalocean.com/v2/droplets", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                    "User-Agent": "AutoOrder-Bot/1.0"
                },
                body: JSON.stringify(dropletData)
            });

            const data = await response.json();

            if (!response.ok) {
                console.error("Digital Ocean API Error:", {
                    status: response.status,
                    statusText: response.statusText,
                    error: data
                });

                let errorMsg = data.message || `HTTP ${response.status}: ${response.statusText}`;

                // Error messages spesifik
                if (data.id === "forbidden") {
                    errorMsg = "API Key tidak valid atau expired";
                } else if (data.id === "unprocessable_entity") {
                    errorMsg = `Invalid request: ${data.message || "Check your parameters"}`;
                } else if (response.status === 429) {
                    errorMsg = "Rate limit exceeded, coba lagi nanti";
                }

                throw new Error(errorMsg);
            }

            if (!data.droplet || !data.droplet.id) {
                throw new Error("Invalid response format from Digital Ocean API");
            }

            console.log(`Droplet created successfully: ${data.droplet.id}`);
            return data.droplet.id;

        } catch (error) {
            console.error("Create VPS Droplet Error:", error);
            throw new Error(`Gagal membuat VPS: ${error.message}`);
        }
    }

    async function getDropletIP(apiKey, dropletId) {
        try {
            const response = await fetch(`https://api.digitalocean.com/v2/droplets/${dropletId}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                    "User-Agent": "AutoOrder-Bot/1.0"
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }

            const data = await response.json();

            // Cek jika droplet ada
            if (!data.droplet) {
                throw new Error("Droplet not found");
            }

            // Tunggu jika status masih 'new'
            if (data.droplet.status === 'new') {
                return null; // IP belum tersedia
            }

            // Cari IP public v4
            if (data.droplet.networks && data.droplet.networks.v4) {
                const publicIP = data.droplet.networks.v4.find(net => net.type === "public");
                return publicIP ? publicIP.ip_address : null;
            }

            return null;

        } catch (error) {
            console.error("Get Droplet IP Error:", error);
            return null;
        }
    }

    async function getDropletInfo(apiKey, dropletId) {
        try {
            const response = await fetch(`https://api.digitalocean.com/v2/droplets/${dropletId}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                    "User-Agent": "AutoOrder-Bot/1.0"
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP ${response.status}: Failed to get droplet info`);
            }

            const data = await response.json();

            if (!data.droplet) {
                throw new Error("Invalid response: droplet data missing");
            }

            return data.droplet;

        } catch (error) {
            console.error("Get Droplet Info Error:", error);
            throw new Error(`Failed to get droplet info: ${error.message}`);
        }
    }

    // Fungsi untuk cek status droplet dengan retry
    async function waitForDropletActive(apiKey, dropletId, maxRetries = 30, interval = 10000) {
        console.log(`Waiting for droplet ${dropletId} to become active...`);

        for (let i = 0; i < maxRetries; i++) {
            try {
                const droplet = await getDropletInfo(apiKey, dropletId);

                console.log(`Droplet ${dropletId} status: ${droplet.status} (attempt ${i + 1}/${maxRetries})`);

                if (droplet.status === 'active') {
                    return droplet;
                }

                if (droplet.status === 'error') {
                    throw new Error("Droplet creation failed");
                }

                // Tunggu sebelum cek lagi
                await new Promise(resolve => setTimeout(resolve, interval));

            } catch (error) {
                console.log(`Attempt ${i + 1} failed:`, error.message);
                if (i === maxRetries - 1) {
                    throw new Error(`Droplet not active after ${maxRetries} attempts: ${error.message}`);
                }
                await new Promise(resolve => setTimeout(resolve, interval));
            }
        }

        throw new Error(`Timeout waiting for droplet to become active after ${maxRetries} attempts`);
    }

    // Fungsi untuk delete droplet (jika diperlukan)
    async function deleteDroplet(apiKey, dropletId) {
        try {
            const response = await fetch(`https://api.digitalocean.com/v2/droplets/${dropletId}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                    "User-Agent": "AutoOrder-Bot/1.0"
                }
            });

            if (!response.ok && response.status !== 204) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }

            return true;

        } catch (error) {
            console.error("Delete Droplet Error:", error);
            throw new Error(`Failed to delete droplet: ${error.message}`);
        }
    }

    // ===== CEK STATUS VPS =====
    bot.action(/check_vps_status\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery();

        const dropletId = ctx.match[1];

        try {
            if (!config.apiDigitalOcean) {
                return ctx.answerCbQuery("❌ API tidak dikonfigurasi", { show_alert: true });
            }

            const dropletInfo = await getDropletInfo(config.apiDigitalOcean, dropletId);

            let ipAddress = "Not assigned";
            if (dropletInfo.networks && dropletInfo.networks.v4) {
                const publicIP = dropletInfo.networks.v4.find(net => net.type === "public");
                if (publicIP) {
                    ipAddress = publicIP.ip_address;
                }
            }

            const statusText = `📊 *Status VPS - ${dropletInfo.name}*

🆔 *ID:* ${dropletInfo.id}
📛 *Name:* ${dropletInfo.name}
🌐 *IP:* ${ipAddress}
📦 *Size:* ${dropletInfo.size_slug}
🖥️ *Image:* ${dropletInfo.image.name}
🌍 *Region:* ${dropletInfo.region.name}
📈 *Status:* ${dropletInfo.status}
📅 *Created:* ${new Date(dropletInfo.created_at).toLocaleString('id-ID')}
⏰ *Updated:* ${new Date(dropletInfo.updated_at).toLocaleString('id-ID')}`;

            await ctx.reply(statusText, {
                parse_mode: "Markdown",
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "🔄 Refresh Status",
                                callback_data: `check_vps_status|${dropletId}`
                            },
                            {
                                text: "🌐 Open Dashboard",
                                url: `https://cloud.digitalocean.com/droplets/${dropletId}`
                            }
                        ]
                    ]
                }
            });

        } catch (error) {
            console.error("Error checking VPS status:", error);
            await ctx.answerCbQuery("❌ Gagal cek status VPS", { show_alert: true });
        }
    });

    const vpsSpecs = {
        r1c1: { size: "s-1vcpu-1gb", name: "1GB RAM • 1 CPU Core", icon: "✅" },
        r2c2: { size: "s-2vcpu-2gb", name: "2GB RAM • 2 CPU Cores", icon: "✅" },
        r4c2: { size: "s-2vcpu-4gb", name: "4GB RAM • 2 CPU Cores", icon: "✅" },
        r8c4: { size: "s-4vcpu-8gb", name: "8GB RAM • 4 CPU Cores", icon: "✅" },
        r16c4: { size: "s-4vcpu-16gb-amd", name: "16GB RAM • 4 CPU Cores", icon: "✅" },
        r16c8: { size: "s-8vcpu-16gb-amd", name: "16GB RAM • 8 CPU Cores", icon: "✅" },
        r32c8: { size: "s-8vcpu-32gb-amd", name: "32GB RAM • 8 CPU Cores", icon: "✅" }
    };

    const vpsRegions = {
        sgp1: {
            name: "Singapore",
            flag: "🇸🇬",
            latency: "Tercepat untuk Asia",
            available: true
        },
        nyc1: {
            name: "New York",
            flag: "🇺🇸",
            latency: "USA Pantai Timur",
            available: true
        },
        sfo3: {
            name: "San Francisco",
            flag: "🇺🇸",
            latency: "USA Pantai Barat",
            available: true
        },
        lon1: {
            name: "London",
            flag: "🇬🇧",
            latency: "Eropa Barat",
            available: true
        },
        fra1: {
            name: "Frankfurt",
            flag: "🇩🇪",
            latency: "Eropa Tengah",
            available: true
        },
        ams3: {
            name: "Amsterdam",
            flag: "🇳🇱",
            latency: "Eropa Barat",
            available: true
        },
        tor1: {
            name: "Toronto",
            flag: "🇨🇦",
            latency: "Amerika Utara",
            available: true
        },
        blr1: {
            name: "Bangalore",
            flag: "🇮🇳",
            latency: "Asia Selatan",
            available: true
        }
    };

    const vpsImages = {
        // ===== UBUNTU =====
        ubuntu2404: {
            image: "ubuntu-24-04-x64",
            name: "Ubuntu 24.04 LTS",
            icon: "🐧",
            description: "Latest Ubuntu LTS",
            slug: "ubuntu-24-04-x64"
        },
        ubuntu2204: {
            image: "ubuntu-22-04-x64",
            name: "Ubuntu 22.04 LTS",
            icon: "🐧",
            description: "Stable Ubuntu LTS",
            slug: "ubuntu-22-04-x64"
        },
        ubuntu2004: {
            image: "ubuntu-20-04-x64",
            name: "Ubuntu 20.04 LTS",
            icon: "🐧",
            description: "Previous Ubuntu LTS",
            slug: "ubuntu-20-04-x64"
        },
        ubuntu2404_minimal: {
            image: "ubuntu-24-04-x64",
            name: "Ubuntu 24.04 Minimal",
            icon: "🐧",
            description: "Minimal Ubuntu 24.04",
            slug: "ubuntu-24-04-x64"
        },

        // ===== DEBIAN =====
        debian12: {
            image: "debian-12-x64",
            name: "Debian 12",
            icon: "📦",
            description: "Debian 12 Bookworm",
            slug: "debian-12-x64"
        },
        debian11: {
            image: "debian-11-x64",
            name: "Debian 11",
            icon: "📦",
            description: "Debian 11 Bullseye",
            slug: "debian-11-x64"
        },
        debian10: {
            image: "debian-10-x64",
            name: "Debian 10",
            icon: "📦",
            description: "Debian 10 Buster",
            slug: "debian-10-x64"
        },

        // ===== CENTOS =====
        centos9: {
            image: "centos-stream-9-x64",
            name: "CentOS Stream 9",
            icon: "🎯",
            description: "CentOS Stream 9",
            slug: "centos-stream-9-x64"
        },
        centos8: {
            image: "centos-stream-8-x64",
            name: "CentOS Stream 8",
            icon: "🎯",
            description: "CentOS Stream 8",
            slug: "centos-stream-8-x64"
        },

        // ===== ROCKY LINUX =====
        rocky9: {
            image: "rockylinux-9-x64",
            name: "Rocky Linux 9",
            icon: "🪨",
            description: "Rocky Linux 9",
            slug: "rockylinux-9-x64"
        },
        rocky8: {
            image: "rockylinux-8-x64",
            name: "Rocky Linux 8",
            icon: "🪨",
            description: "Rocky Linux 8",
            slug: "rockylinux-8-x64"
        },

        // ===== ALMA LINUX =====
        alma9: {
            image: "almalinux-9-x64",
            name: "AlmaLinux 9",
            icon: "🌟",
            description: "AlmaLinux 9",
            slug: "almalinux-9-x64"
        },
        alma8: {
            image: "almalinux-8-x64",
            name: "AlmaLinux 8",
            icon: "🌟",
            description: "AlmaLinux 8",
            slug: "almalinux-8-x64"
        },

        // ===== FEDORA =====
        fedora40: {
            image: "fedora-40-x64",
            name: "Fedora 40",
            icon: "🎩",
            description: "Fedora 40",
            slug: "fedora-40-x64"
        },
        fedora39: {
            image: "fedora-39-x64",
            name: "Fedora 39",
            icon: "🎩",
            description: "Fedora 39",
            slug: "fedora-39-x64"
        },

        // ===== OPENSUSE =====
        opensuse15: {
            image: "opensuse-15-5-x64",
            name: "openSUSE Leap 15.5",
            icon: "🦎",
            description: "openSUSE Leap 15.5",
            slug: "opensuse-15-5-x64"
        },

        // ===== FREEBSD =====
        freebsd14: {
            image: "freebsd-14-0-x64",
            name: "FreeBSD 14.0",
            icon: "👹",
            description: "FreeBSD 14.0",
            slug: "freebsd-14-0-x64"
        },
        freebsd13: {
            image: "freebsd-13-2-x64",
            name: "FreeBSD 13.2",
            icon: "👹",
            description: "FreeBSD 13.2",
            slug: "freebsd-13-2-x64"
        },

        // ===== WINDOWS (jika ada lisensi) =====
        windows2022: {
            image: "windows-2022-dc-x64",
            name: "Windows Server 2022",
            icon: "🪟",
            description: "Windows Server 2022 Datacenter",
            slug: "windows-2022-dc-x64",
            license_required: true,
            additional_cost: true
        },
        windows2019: {
            image: "windows-2019-dc-x64",
            name: "Windows Server 2019",
            icon: "🪟",
            description: "Windows Server 2019 Datacenter",
            slug: "windows-2019-dc-x64",
            license_required: true,
            additional_cost: true
        }
    };

    // Fungsi untuk mendapatkan daftar OS berdasarkan kategori
    function getOSByCategory() {
        return {
            ubuntu: {
                name: "Ubuntu",
                icon: "🐧",
                images: ["ubuntu2404", "ubuntu2204", "ubuntu2004", "ubuntu2404_minimal"]
            },
            debian: {
                name: "Debian",
                icon: "📦",
                images: ["debian12", "debian11", "debian10"]
            },
            centos: {
                name: "CentOS",
                icon: "🎯",
                images: ["centos9", "centos8"]
            },
            rocky: {
                name: "Rocky Linux",
                icon: "🪨",
                images: ["rocky9", "rocky8"]
            },
            alma: {
                name: "AlmaLinux",
                icon: "🌟",
                images: ["alma9", "alma8"]
            },
            fedora: {
                name: "Fedora",
                icon: "🎩",
                images: ["fedora40", "fedora39"]
            },
            opensuse: {
                name: "openSUSE",
                icon: "🦎",
                images: ["opensuse15"]
            },
            freebsd: {
                name: "FreeBSD",
                icon: "👹",
                images: ["freebsd14", "freebsd13"]
            },
            windows: {
                name: "Windows Server",
                icon: "🪟",
                images: ["windows2022", "windows2019"]
            }
        };
    }

    function getOSAdditionalCost(osKey) {
        // Semua OS di config ini gratis (tidak termasuk Windows)
        return { additional: false, cost: 0 };
    }

    function validateOSForRegion(osKey, regionKey) {
        // Untuk sekarang, semua OS tersedia di semua region dalam config
        // Kecuali jika ada batasan tertentu
        return { valid: true, message: "" };
    }

    bot.action(/delstock_cat\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery();
        if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');

        const category = ctx.match[1];
        const stocks = loadStocks();

        if (!stocks[category]) {
            return ctx.editMessageText(`❌ Kategori *${category}* tidak ditemukan.`,
                { parse_mode: "Markdown" });
        }

        const items = stocks[category];
        const itemButtons = items.map((item, index) => [
            {
                text: `🗑️ ${item.description}`,
                callback_data: `delstock_item|${category}|${index}`
            }
        ]);

        return ctx.editMessageText(`Pilih item dalam kategori *${category}* yang ingin dihapus:`, {
            parse_mode: "Markdown",
            reply_markup: { inline_keyboard: itemButtons }
        });
    });

    bot.action(/delstock_item\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery();
        if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');

        const [category, indexStr] = ctx.match[1].split("|");
        const index = parseInt(indexStr);
        const stocks = loadStocks();

        if (!stocks[category] || !stocks[category][index]) {
            return ctx.editMessageText("❌ Item tidak ditemukan.");
        }

        const deletedItem = stocks[category][index];
        stocks[category].splice(index, 1);

        if (stocks[category].length === 0) {
            delete stocks[category];
        }

        saveStocks(stocks);

        return ctx.editMessageText(
            `✅ Item berhasil dihapus!\n\n` +
            `📁 Kategori: ${category}\n` +
            `📝 Keterangan: ${deletedItem.description}\n` +
            `💰 Harga: Rp${toRupiah(deletedItem.price)}\n` +
            `🔑 ${deletedItem.accounts.length} akun dihapus`,
            { parse_mode: "Markdown" }
        );
    });

    bot.action(/getscript\|(\d+)/, async (ctx) => {
        await ctx.answerCbQuery();
        if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');
        const index = Number(ctx.match[1]);

        const scripts = loadScripts();
        const s = scripts[index];
        if (!s) return ctx.editMessageText("❌ Script tidak ditemukan.");

        const filePath = path.resolve(s.file || "");
        if (!fs.existsSync(filePath))
            return ctx.editMessageText("❌ File script tidak ditemukan di server.");

        await ctx.editMessageText(
            `📤 Mengirim Script...

📦 Nama: ${s.name}
💰 Harga: Rp${toRupiah(s.price)}`,
            { parse_mode: "Markdown" }
        );

        return ctx.replyWithDocument({ source: filePath });
    });

    bot.action(/del_script\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery();
        if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');
        const name = ctx.match[1];

        let scripts = loadScripts();
        const sc = scripts.find(s => s.name === name);
        if (!sc) return ctx.editMessageText("❌ Tidak ditemukan.");

        const filePath = path.join(__dirname, sc.file);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

        scripts = scripts.filter(s => s.name !== name);
        saveScripts(scripts);

        return ctx.editMessageText(`Script ${name} Berhasil dihapus.`, { parse_mode: "Markdown" });
    });

    bot.action(/panel_ram\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.deleteMessage();

        const params = ctx.match[1].split("|");
        const ram = params[0]; // 1-10 atau unli
        const username = params[1];
        const userId = ctx.from.id;

        const fee = generateRandomFee();

        const priceKey = ram === "unli" ? "unlimited" : `${ram}`;
        const basePrice = hargaPanel[priceKey];

        if (!basePrice) {
            return ctx.reply("Harga panel tidak ditemukan!");
        }

        const price = fee + basePrice;
        const name = `Panel ${ram === "unli" ? "Unlimited" : ram}`;

        const paymentType = config.paymentGateway;
        const pay = await createPayment(paymentType, price, config);

        const photo =
            paymentType === "pakasir"
                ? { source: pay.qris }
                : pay.qris;

        orders[userId] = {
            type: "panel",
            username,
            ram,
            name,
            amount: price,
            fee,
            orderId: pay.orderId || null,
            paymentType,
            chatId: ctx.chat.id,
            expireAt: Date.now() + 6 * 60 * 1000
        };

        const qrMsg = await ctx.replyWithPhoto(photo, {
            caption: textOrder(name, price, fee),
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [{ text: "❌ Batalkan Order", callback_data: "cancel_order" }]
                ]
            }
        });

        orders[userId].qrMessageId = qrMsg.message_id;
        startCheck(userId, ctx);
    });

    bot.action(/script\|(.+)/, async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.deleteMessage();

        const name = ctx.match[1];
        const userId = ctx.from.id;

        const scripts = loadScripts();
        const sc = scripts.find(s => s.name === name);
        if (!sc) return ctx.reply("❌ Stok Script masih kosong.");

        const fee = generateRandomFee();
        const price = sc.price + fee;

        const paymentType = config.paymentGateway;

        const pay = await createPayment(paymentType, price, config);

        const photo =
            paymentType === "pakasir"
                ? { source: pay.qris }
                : pay.qris;

        orders[userId] = {
            type: "script",
            name: sc.name,
            amount: price,
            fee,
            file: sc.file,
            orderId: pay.orderId || null,
            paymentType,
            chatId: ctx.chat.id,
            expireAt: Date.now() + 6 * 60 * 1000
        };

        const qrMsg = await ctx.replyWithPhoto(photo, {
            caption: textOrder(sc.name, price, fee),
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [{ text: "❌ Batalkan Order", callback_data: "cancel_order" }]
                ]
            }
        });

        orders[userId].qrMessageId = qrMsg.message_id;
        startCheck(userId, ctx);
    });

    function startCheck(userId, ctx) {
        const intv = setInterval(async () => {
            const order = orders[userId];
            if (!order) {
                clearInterval(intv);
                return;
            }

            // ===== EXPIRED =====
            if (Date.now() > order.expireAt) {
                clearInterval(intv);

                try {
                    if (order.qrMessageId) {
                        await ctx.telegram.deleteMessage(order.chatId, order.qrMessageId);
                    }
                } catch (e) { }

                await ctx.telegram.sendMessage(
                    order.chatId,
                    "⏰ Pembayaran QR telah expired!\nSilakan order ulang dari .menu",
                    { parse_mode: "Markdown" }
                );

                delete orders[userId];
                return;
            }

            // ===== CEK PEMBAYARAN =====
            const paymentType = order.paymentType || config.paymentGateway;

            const paid = await cekPaid(
                paymentType,
                order,
                config,
                { userId, orders, toRupiah }
            );

            if (!paid) return;

            clearInterval(intv);
            const o = orders[userId];

            // Update user history
            updateUserHistory(userId, {
                product: o.name,
                amount: o.amount,
                type: o.type,
                details: o.type === "app" ? o.description : o.username || o.file
            });

            // Update total spent
            const users = loadUsers();
            const userIndex = users.findIndex(u => u.id === userId);
            if (userIndex !== -1) {
                users[userIndex].total_spent = (users[userIndex].total_spent || 0) + o.amount;
                saveUsers(users);
            }

            await ctx.telegram.sendMessage(
                o.chatId,
                `✅ Pembayaran Berhasil!

📦 Produk: ${o.name}
💰 Harga: Rp${toRupiah(o.amount)} (Fee Rp${o.fee})

Produk sedang dikirim...
Terimakasih sudah membeli produk ♥️`,
                { parse_mode: "Markdown" }
            );

            try {
                if (o.qrMessageId) {
                    await ctx.telegram.deleteMessage(o.chatId, o.qrMessageId);
                }
            } catch (e) { }

            delete orders[userId];

            // ===== KIRIM SCRIPT =====
            if (o.type === "script") {
                await ctx.telegram.sendDocument(
                    o.chatId,
                    { source: o.file },
                    {
                        caption: `Script: ${o.name}`,
                        parse_mode: "Markdown"
                    }
                );
            }

            // ===== BUAT PANEL =====
            if (o.type === "panel") {
                const ram = o.ram === "unli" ? "Unlimited" : `${o.ram}GB`;
                const username = o.username + randomNumber(3);

                let res = await createPanel(username, ram.toLowerCase());
                if (!res.success) {
                    return ctx.telegram.sendMessage(
                        o.chatId,
                        `❌ Error! Terjadi kesalahan saat membuat panel.\nSilahkan hubungi admin @${config.ownerUsername}`,
                        { parse_mode: "Markdown" }
                    );
                }

                res = res.data;

                const teksPanel = `✅ Panel Pterodactyl Berhasil Dibuat!

👤 Username: ${res.username}
🔑 Password: ${res.password}
💾 RAM: ${ram}
🆔 Server ID: ${res.serverId}
📛 Server Name: ${res.serverName}
⏳ Expired: 1 Bulan

📌 Cara Login:
1. Klik tombol Login Panel di bawah
2. Masukkan username & password
3. Server siap dipakai!`;

                await ctx.telegram.sendMessage(o.chatId, teksPanel, {
                    parse_mode: "Markdown",
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: "🔗 Login Panel",
                                    url: res.panelUrl
                                }
                            ]
                        ]
                    }
                });
            }

            // ===== BUAT ADMIN PANEL =====
            if (o.type === "admin") {
                const username = o.username + randomNumber(3);

                let res;
                try {
                    res = await createAdmin(username);
                } catch (e) {
                    return ctx.telegram.sendMessage(
                        o.chatId,
                        `❌ Error! Gagal membuat admin panel.\nSilahkan hubungi admin @${config.ownerUsername}`,
                        { parse_mode: "Markdown" }
                    );
                }

                const teksAdmin = `✅ Admin Panel Berhasil Dibuat!

🆔 User ID: ${res.id}
👤 Username: ${res.username}
🔑 Password: ${res.password}
⏳ Expired: 1 Bulan

📌 Cara Login:
1. Klik tombol Login Panel di bawah
2. Masukkan username & password
3. Admin panel siap digunakan!`;

                await ctx.telegram.sendMessage(o.chatId, teksAdmin, {
                    parse_mode: "Markdown",
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: "🔗 Login Panel",
                                    url: res.panel
                                }
                            ]
                        ]
                    }
                });
            }

            // ===== KIRIM APPS PREMIUM =====
            if (o.type === "app") {
                const stocks = loadStocks();
                if (stocks[o.category] && stocks[o.category][o.itemIndex]) {
                    const item = stocks[o.category][o.itemIndex];

                    const sentAccount = item.accounts.shift();
                    item.stock -= 1;

                    if (item.stock <= 0) {
                        stocks[o.category].splice(o.itemIndex, 1);
                        if (stocks[o.category].length === 0) {
                            delete stocks[o.category];
                        }
                    }

                    saveStocks(stocks);

                    const fileName = `${o.category}_${Date.now()}.txt`;
                    const fileContent = `=== DATA AKUN ${o.category.toUpperCase()} ===\n\n` +
                        `Produk: ${o.name}\n` +
                        `Keterangan: ${o.description}\n` +
                        `Harga: Rp${toRupiah(o.amount)}\n` +
                        `Tanggal: ${new Date().toLocaleString('id-ID')}\n\n` +
                        `=== DATA AKUN ===\n` +
                        `${sentAccount}\n\n` +
                        `=== INSTRUKSI ===\n` +
                        `1. Login dengan akun di atas\n` +
                        `2. Nikmati fitur premium\n` +
                        `3. Jangan bagikan akun ke orang lain\n` +
                        `4. Akun ini untuk personal use\n\n` +
                        `=== SUPPORT ===\n` +
                        `Jika ada masalah, hubungi: @${config.ownerUsername}`;

                    const tempFilePath = path.join(__dirname, 'temp', fileName);
                    const tempDir = path.join(__dirname, 'temp');

                    if (!fs.existsSync(tempDir)) {
                        fs.mkdirSync(tempDir, { recursive: true });
                    }

                    fs.writeFileSync(tempFilePath, fileContent);

                    const appText = `✅ Apps Premium Berhasil Dibeli!

📱 Produk: ${o.name}
💰 Harga: Rp${toRupiah(o.amount)}

📁 Data akun telah dikirim dalam file .txt
📝 Silakan download file untuk melihat detail akun

📌 Cara Pakai:
1. Login dengan akun yang tersedia
2. Nikmati fitur premium
3. Jangan bagikan akun ke orang lain

⚠️ Note: Akun ini untuk personal use`;

                    try {
                        await ctx.telegram.sendMessage(o.chatId, appText, {
                            parse_mode: "Markdown"
                        });

                        await ctx.telegram.sendDocument(o.chatId, {
                            source: tempFilePath,
                            filename: fileName
                        }, {
                            caption: `📁 File Data Akun: ${o.name}`,
                            parse_mode: "Markdown"
                        });

                        setTimeout(() => {
                            if (fs.existsSync(tempFilePath)) {
                                fs.unlinkSync(tempFilePath);
                            }
                        }, 5000);

                    } catch (error) {
                        console.error("Error sending file:", error);
                        const fallbackText = `✅ Apps Premium Berhasil Dibeli!

📱 Produk: ${o.name}
💰 Harga: Rp${toRupiah(o.amount)}

🔑 Data Akun: 
\`${sentAccount}\`

📌 Cara Pakai:
1. Login dengan akun di atas
2. Nikmati fitur premium
3. Jangan bagikan akun ke orang lain

⚠️ Note: Akun ini untuk personal use`;

                        await ctx.telegram.sendMessage(o.chatId, fallbackText, {
                            parse_mode: "Markdown"
                        });
                    }
                }
            }

            // ===== KIRIM DIGITAL OCEAN ACCOUNT =====
            if (o.type === "do") {
                const doData = loadDO();
                if (doData[o.category] && doData[o.category][o.itemIndex]) {
                    const item = doData[o.category][o.itemIndex];

                    const sentAccount = item.accounts.shift();
                    item.stock -= 1;

                    if (item.stock <= 0) {
                        doData[o.category].splice(o.itemIndex, 1);
                        if (doData[o.category].length === 0) {
                            delete doData[o.category];
                        }
                    }

                    saveDO(doData);

                    const fileName = `DO_${o.category}_${Date.now()}.txt`;
                    const fileContent = `=== DATA AKUN DIGITAL OCEAN ===\n\n` +
                        `Produk: ${o.name}\n` +
                        `Keterangan: ${o.description}\n` +
                        `Harga: Rp${toRupiah(o.amount)}\n` +
                        `Tanggal: ${new Date().toLocaleString('id-ID')}\n\n` +
                        `=== DATA AKUN ===\n` +
                        `${sentAccount}\n\n` +
                        `=== INSTRUKSI ===\n` +
                        `1. Login ke https://cloud.digitalocean.com\n` +
                        `2. Gunakan akun di atas\n` +
                        `3. Nikmati credit yang tersedia\n` +
                        `4. Jangan bagikan akun ke orang lain\n\n` +
                        `=== SUPPORT ===\n` +
                        `Jika ada masalah, hubungi: @${config.ownerUsername}`;

                    const tempFilePath = path.join(__dirname, 'temp', fileName);
                    const tempDir = path.join(__dirname, 'temp');

                    if (!fs.existsSync(tempDir)) {
                        fs.mkdirSync(tempDir, { recursive: true });
                    }

                    fs.writeFileSync(tempFilePath, fileContent);

                    const doText = `✅ Akun Digital Ocean Berhasil Dibeli!

🌊 Produk: ${o.name}
💰 Harga: Rp${toRupiah(o.amount)}

📁 Data akun telah dikirim dalam file .txt
📝 Silakan download file untuk melihat detail akun

📌 Cara Pakai:
1. Login ke https://cloud.digitalocean.com
2. Gunakan akun yang tersedia
3. Credit siap digunakan untuk membuat VPS/droplet

⚠️ Note: Akun ini untuk personal use`;

                    try {
                        await ctx.telegram.sendMessage(o.chatId, doText, {
                            parse_mode: "Markdown"
                        });

                        await ctx.telegram.sendDocument(o.chatId, {
                            source: tempFilePath,
                            filename: fileName
                        }, {
                            caption: `🌊 File Data Akun Digital Ocean: ${o.name}`,
                            parse_mode: "Markdown"
                        });

                        setTimeout(() => {
                            if (fs.existsSync(tempFilePath)) {
                                fs.unlinkSync(tempFilePath);
                            }
                        }, 5000);

                    } catch (error) {
                        console.error("Error sending file:", error);
                        const fallbackText = `✅ Akun Digital Ocean Berhasil Dibeli!

🌊 Produk: ${o.name}
💰 Harga: Rp${toRupiah(o.amount)}

🔑 Data Akun: 
\`${sentAccount}\`

📌 Cara Pakai:
1. Login ke https://cloud.digitalocean.com
2. Gunakan akun di atas
3. Credit siap digunakan untuk membuat VPS/droplet

⚠️ Note: Akun ini untuk personal use`;

                        await ctx.telegram.sendMessage(o.chatId, fallbackText, {
                            parse_mode: "Markdown"
                        });
                    }
                }
            }

            // ===== BUAT VPS DIGITAL OCEAN SETELAH PEMBAYARAN =====
            if (o.type === "vps") {
                try {
                    // Cek apakah API key tersedia
                    if (!config.apiDigitalOcean) {
                        throw new Error("API Digital Ocean tidak dikonfigurasi");
                    }

                    // Generate hostname dan password
                    const username = ctx.from.username || `user${ctx.from.id}`;
                    const hostname = `vps-${username}-${randomNumber(6)}`.toLowerCase().substring(0, 63);
                    const password = generateStrongPassword();

                    // Kirim pesan proses pembuatan
                    const processingMsg = await ctx.telegram.sendMessage(
                        o.chatId,
                        `🔄 *Membuat VPS Digital Ocean...*\n\n📊 *Spesifikasi:*\n• ${o.spec.ramCpu.name}\n• ${o.spec.os.name} ${o.spec.version}\n• ${o.spec.region.flag} ${o.spec.region.name}\n\n⏳ Mohon tunggu 2-3 menit...`,
                        { parse_mode: "Markdown" }
                    );

                    // Buat VPS menggunakan API
                    const dropletId = await createVPSDroplet(
                        config.apiDigitalOcean,
                        hostname,
                        o.specKey,       // contoh: "r1c1", "r2c2"
                        o.osKey,         // contoh: "ubuntu22"
                        o.regionKey,     // contoh: "sgp1"
                        password
                    );

                    // Tunggu untuk memastikan droplet dibuat
                    await new Promise(resolve => setTimeout(resolve, 5000));

                    // Ambil informasi droplet untuk mendapatkan IP
                    let ipAddress = "Sedang diprovisioning...";
                    let status = "creating";
                    let dropletInfo = null;

                    try {
                        dropletInfo = await getDropletInfo(config.apiDigitalOcean, dropletId);
                        status = dropletInfo.status || "active";

                        if (dropletInfo.networks && dropletInfo.networks.v4) {
                            const publicIP = dropletInfo.networks.v4.find(net => net.type === "public");
                            if (publicIP) {
                                ipAddress = publicIP.ip_address;
                            }
                        }
                    } catch (infoError) {
                        console.log("Info droplet belum tersedia:", infoError.message);
                        // Coba lagi setelah delay
                        await new Promise(resolve => setTimeout(resolve, 10000));
                        try {
                            dropletInfo = await getDropletInfo(config.apiDigitalOcean, dropletId);
                            status = dropletInfo.status || "active";

                            if (dropletInfo.networks && dropletInfo.networks.v4) {
                                const publicIP = dropletInfo.networks.v4.find(net => net.type === "public");
                                if (publicIP) {
                                    ipAddress = publicIP.ip_address;
                                }
                            }
                        } catch (retryError) {
                            console.log("Masih belum bisa mendapatkan info:", retryError.message);
                        }
                    }

                    // Hapus pesan processing
                    try {
                        await ctx.telegram.deleteMessage(o.chatId, processingMsg.message_id);
                    } catch (e) { }

                    const vpsText = `✅ *VPS Digital Ocean Berhasil Dibuat!*

🎯 *Detail Order:*
├ Produk: ${o.name}
├ Harga: Rp${toRupiah(o.amount)}
└ Status: ${status === 'active' ? '✅ Active' : '🔄 Creating'}

📊 *Spesifikasi:*
├ ${o.spec.ramCpu.name}
├ ${o.spec.os.name} ${o.spec.version}
├ ${o.spec.region.flag} ${o.spec.region.name}
└ ${o.spec.region.latency}

🔧 *Informasi Server:*
├ Server ID: \`${dropletId}\`
├ Hostname: \`${hostname}\`
├ IP Address: \`${ipAddress}\`
├ Username: \`root\`
└ Password: \`${password}\`

📌 *Cara Akses SSH:*
\`\`\`
ssh root@${ipAddress}
\`\`\`
Password: \`${password}\`

⚡ *Fitur Termasuk:*
• ${getStorageSize(o.specKey)} SSD Storage
• 1TB Monthly Transfer
• IPv4 + IPv6 Support
• Automated Backups
• Monitoring Dashboard

⏳ *Catatan Penting:*
• Server membutuhkan 2-5 menit untuk fully ready
• **WAJIB** ganti password setelah login pertama!
• Backup data penting secara berkala
• Monitor resource usage via dashboard

🔗 *Links Penting:*`;

                    await ctx.telegram.sendMessage(o.chatId, vpsText, {
                        parse_mode: "Markdown",
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {
                                        text: "🌐 Dashboard",
                                        url: `https://cloud.digitalocean.com/droplets/${dropletId}`
                                    },
                                    {
                                        text: "📚 SSH Tutorial",
                                        url: "https://docs.digitalocean.com/products/droplets/how-to/connect-with-ssh/"
                                    }
                                ],
                                [
                                    {
                                        text: "🔄 Check Status",
                                        callback_data: `check_vps_status|${dropletId}`
                                    },
                                    {
                                        text: "🔑 Reset Password",
                                        url: "https://docs.digitalocean.com/products/droplets/how-to/reset-root-password/"
                                    }
                                ],
                                [
                                    {
                                        text: "📞 Support",
                                        url: `https://t.me/${config.ownerUsername}`
                                    }
                                ]
                            ]
                        }
                    });

                    // Kirim pesan tambahan dengan informasi penting
                    await ctx.telegram.sendMessage(o.chatId,
                        `💡 *Tips & Best Practices:*\n\n` +
                        `1. *Security First:*\n` +
                        `   • Ganti password segera setelah login\n` +
                        `   • Setup firewall (ufw/iptables)\n` +
                        `   • Gunakan SSH keys untuk authentication\n\n` +
                        `2. *Performance:*\n` +
                        `   • Monitor resource usage dengan \`htop\`\n` +
                        `   • Setup swap jika diperlukan\n` +
                        `   • Optimize database & web server\n\n` +
                        `3. *Maintenance:*\n` +
                        `   • Update system regularly: \`apt update && apt upgrade\`\n` +
                        `   • Backup konfigurasi penting\n` +
                        `   • Monitor logs: \`tail -f /var/log/syslog\``,
                        { parse_mode: "Markdown" }
                    );

                } catch (error) {
                    console.error("Error creating VPS:", error);

                    const errorText = `❌ *Gagal Membuat VPS Digital Ocean*

⚠️ *Error:* \`${error.message}\`

🔧 *Kemungkinan Penyebab:*
1. API key Digital Ocean invalid/expired
2. Limit akun terpenuhi (out of credits)
3. Region/size tidak tersedia
4. Network issue ke API Digital Ocean

💰 *Refund Policy:*
• Uang akan diretur otomatis dalam 1x24 jam
• Silakan hubungi admin untuk konfirmasi

📞 *Support:* @${config.ownerUsername}`;

                    await ctx.telegram.sendMessage(o.chatId, errorText, {
                        parse_mode: "Markdown",
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {
                                        text: "📞 Hubungi Admin",
                                        url: `https://t.me/${config.ownerUsername}`
                                    },
                                    {
                                        text: "🔄 Coba Lagi",
                                        callback_data: "buy_vps"
                                    }
                                ]
                            ]
                        }
                    });
                }
            }


        }, 7000);
    }

    // Fungsi untuk menjalankan broadcast
    async function startBroadcast(ctx, users, message, hasPhoto, photoFileId, statusMessageId) {
        const totalUsers = users.length;
        let successCount = 0;
        let failedCount = 0;
        const failedUsers = [];
        const startTime = Date.now();

        for (let i = 0; i < users.length; i++) {
            const userId = users[i].id;

            try {
                if (hasPhoto && photoFileId) {
                    await ctx.telegram.sendPhoto(userId, photoFileId, {
                        caption: message,
                        parse_mode: "Markdown"
                    });
                } else {
                    await ctx.telegram.sendMessage(userId, message, {
                        parse_mode: "Markdown"
                    });
                }
                successCount++;

            } catch (error) {
                console.error(`Gagal kirim ke user ${userId}:`, error.message);
                failedCount++;
                failedUsers.push(userId);
            }

            if ((i + 1) % 5 === 0 || i === users.length - 1) {
                try {
                    await ctx.telegram.editMessageText(
                        ctx.chat.id,
                        statusMessageId,
                        null,
                        `🚀 *BROADCAST BERJALAN*\n\n` +
                        `📊 Total User: ${totalUsers}\n` +
                        `✅ Berhasil: ${successCount}\n` +
                        `❌ Gagal: ${failedCount}\n` +
                        `⏳ Progress: ${i + 1}/${totalUsers} (${Math.round((i + 1) / totalUsers * 100)}%)\n` +
                        `⏱️ Waktu: ${Math.floor((Date.now() - startTime) / 1000)} detik`,
                        { parse_mode: "Markdown" }
                    );
                } catch (updateError) {
                    console.error("Gagal update progress:", updateError.message);
                }

                if (i < users.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        }

        const duration = Math.floor((Date.now() - startTime) / 1000);

        const finalText = `✅ *BROADCAST SELESAI*\n\n` +
            `📊 Total User: ${totalUsers}\n` +
            `✅ Berhasil dikirim: ${successCount}\n` +
            `❌ Gagal dikirim: ${failedCount}\n` +
            `⏱️ Waktu eksekusi: ${duration} detik\n` +
            `📈 Success Rate: ${totalUsers > 0 ? Math.round((successCount / totalUsers) * 100) : 0}%\n\n` +
            (failedCount > 0 ?
                `⚠️ ${failedCount} user gagal menerima pesan\n` +
                `(Mungkin memblokir bot atau chat tidak ditemukan)` :
                `✨ Semua user berhasil menerima pesan!`);

        try {
            await ctx.telegram.editMessageText(
                ctx.chat.id,
                statusMessageId,
                null,
                finalText,
                { parse_mode: "Markdown" }
            );
        } catch (error) {
            await ctx.reply(finalText, { parse_mode: "Markdown" });
        }
    }

    return bot
};

// ===== HOT RELOAD =====
let file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    delete require.cache[file];
    require(file);
});