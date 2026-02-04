require("./lib/myfunc.js");
const fs = require("fs");
const { Telegraf } = require("telegraf");
const config = require("./config");

(async () => {
  const bot = new Telegraf(config.botToken);

  // Load handler bot
  require("./bot")(bot);

  // Jalankan bot
  bot.launch();
  await bot.telegram.setMyCommands([
    { command: "menu", description: "Tampilkan Menu Utama" },
    { command: "buyapps", description: "Beli Account App Premium" },
    { command: "buypanel", description: "Beli Server Panel Pterodactyl" },
    { command: "buyadmin", description: "Beli Admin Panel Pterodactyl" },
    { command: "buyscript", description: "Beli Source Code Script" }
  ])
  console.log("• Bot Autorder Connected");

  // Graceful stop
  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
})();