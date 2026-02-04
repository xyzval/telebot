require("./myfunc.js");
const config = require("../config.js");
const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const axios = require("axios");

async function createPanel(username, ramKey) {
  const email = `${username}@gmail.com`;
  const name = `${global.capital ? global.capital(username) : username} Server`;
  const password = `${username}001`;

  const resourceMap = {
    "1gb": { ram: "1000", disk: "1000", cpu: "40" },
    "2gb": { ram: "2000", disk: "1000", cpu: "60" },
    "3gb": { ram: "3000", disk: "2000", cpu: "80" },
    "4gb": { ram: "4000", disk: "2000", cpu: "100" },
    "5gb": { ram: "5000", disk: "3000", cpu: "120" },
    "6gb": { ram: "6000", disk: "3000", cpu: "140" },
    "7gb": { ram: "7000", disk: "4000", cpu: "160" },
    "8gb": { ram: "8000", disk: "4000", cpu: "180" },
    "9gb": { ram: "9000", disk: "5000", cpu: "200" },
    "10gb": { ram: "10000", disk: "5000", cpu: "220" },
    "unlimited": { ram: "0", disk: "0", cpu: "0" },
    "unli": { ram: "0", disk: "0", cpu: "0" }
  };

  const { ram, disk, cpu } = resourceMap[ramKey] || resourceMap["unli"];

  try {
    // ===== CREATE USER =====
    const f = await fetch(`${config.domain}/api/application/users`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apikey}`
      },
      body: JSON.stringify({
        email,
        username,
        first_name: name,
        last_name: "Server",
        language: "en",
        password
      })
    });

    const data = await f.json();
    if (data.errors) {
      return { success: false, message: data.errors[0]?.detail || "Create user failed" };
    }

    const user = data.attributes;

    // ===== GET EGG =====
    const f1 = await fetch(
      `${config.domain}/api/application/nests/${config.nestid}/eggs/${config.egg}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apikey}`
        }
      }
    );

    const data2 = await f1.json();
    const startup_cmd = data2.attributes?.startup || "npm start";

    // ===== CREATE SERVER =====
    const f2 = await fetch(`${config.domain}/api/application/servers`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apikey}`
      },
      body: JSON.stringify({
        name,
        description: global.tanggal
          ? global.tanggal(Date.now())
          : new Date().toLocaleString(),
        user: user.id,
        egg: parseInt(config.egg),
        docker_image: "ghcr.io/parkervcp/yolks:nodejs_20",
        startup: startup_cmd,
        environment: {
          INST: "npm",
          USER_UPLOAD: "0",
          AUTO_UPDATE: "0",
          CMD_RUN: "npm start"
        },
        limits: { memory: ram, swap: 0, disk, io: 500, cpu },
        feature_limits: { databases: 5, backups: 5, allocations: 5 },
        deploy: {
          locations: [parseInt(config.loc)],
          dedicated_ip: false,
          port_range: []
        }
      })
    });

    const result = await f2.json();
    if (result.errors) {
      return { success: false, message: result.errors[0]?.detail || "Create server failed" };
    }

    const server = result.attributes;
    const domainClean = (config.domain || "").replace(/https?:\/\//g, "");

    return {
      success: true,
      data: {
        username,
        email,
        password,
        serverId: server.id,
        serverName: server.name,
        panelUrl: `https://${domainClean}`
      }
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

async function createAdmin(username) {
  const uname = username.toLowerCase();
  const email = `${uname}@gmail.com`;
  const name = global.capital ? global.capital(uname) : uname;
  const password = `${uname}001`;

  const res = await fetch(`${config.domain}/api/application/users`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apikey}`,
    },
    body: JSON.stringify({
      email,
      username: uname,
      first_name: name,
      last_name: "Admin",
      root_admin: true,
      language: "en",
      password,
    }),
  });

  const data = await res.json();
  if (data.errors) {
    return { success: false, message: err.message };
  }

  const user = data.attributes;
  const domainClean = (config.domain || "").replace(/https?:\/\//g, "");

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    password,
    panel: `https://${domainClean}`,
    raw: user,
  };
}

function randomOrderId(prefix = "ORD") {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

/**
 * Create payment (OrderKuota / Pakasir)
 * Return: { type, amount, qris, orderId? }
 */
async function createPayment(type, amount, config) {
  // ===== ORDERKUOTA =====
  if (type === "orderkuota") {
    const url = `https://skyzopedia-api.vercel.app/orderkuota/createpayment?apikey=skyy&amount=${amount}&username=${config.orderkuota.username}&token=${config.orderkuota.token}`;
    const { data } = await axios.get(url);

    const qris = data?.result?.imageqris?.url;
    if (!qris) throw new Error("Gagal membuat QRIS OrderKuota");

    return {
      type,
      amount,
      qris,
      raw: data
    };
  }

  // ===== PAKASIR =====
  if (type === "pakasir") {
    const { slug, apiKey } = config.pakasir;
    const orderId = randomOrderId();

    const url = "https://app.pakasir.com/api/transactioncreate/qris";
    const body = {
      project: slug,
      order_id: orderId,
      amount,
      api_key: apiKey
    };

    const res = await axios.post(url, body, {
      headers: { "Content-Type": "application/json" }
    });

    const payment = res.data?.payment;
    if (!payment?.payment_number)
      throw new Error("QR Pakasir tidak ditemukan");

    const qrString = payment.payment_number;

    // 👉 Generate QR image otomatis
    const qrDir = path.join(__dirname, "temp_qr");
    if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir, { recursive: true });

    const filePath = path.join(qrDir, `${orderId}.png`);
    await QRCode.toFile(filePath, qrString, {
      type: "png",
      width: 500,
      margin: 2
    });

    setTimeout(async () => {
      try {
        await fs.unlinkSync(filePath)
      } catch { }
    }, 60000)

    return {
      type,
      amount,
      orderId,
      qris: filePath, // 👉 path file PNG, bisa langsung replyWithPhoto
      expiredAt: payment.expired_at,
      raw: res.data
    };
  }

  throw new Error("Type payment tidak dikenal");
}

/**
 * Check payment status
 */
async function cekPaid(type, data, config, extra = {}) {
  // ===== ORDERKUOTA =====
  if (type === "orderkuota") {
    const cekUrl = `https://skyzopedia-api.vercel.app/orderkuota/mutasiqr?apikey=skyy&username=${config.orderkuota.username}&token=${config.orderkuota.token}`;
    const { data: res } = await axios.get(cekUrl);

    const list = res?.result || [];
    const { userId, orders, toRupiah } = extra;

    const found = list
      .filter(i => i.status === "IN")
      .find(i => toRupiah(i.kredit) === toRupiah(orders[userId]?.amount));

    return Boolean(found);
  }

  // ===== PAKASIR =====
  if (type === "pakasir") {
    const { slug, apiKey } = config.pakasir;

    const cekUrl = "https://app.pakasir.com/api/transactiondetail";
    const params = {
      project: slug,
      order_id: data.orderId,
      amount: data.amount,
      api_key: apiKey
    };

    const res = await axios.get(cekUrl, { params });

    const status =
      res.data?.transaction?.status ||
      res.data?.payment?.status ||
      res.data?.status ||
      "";

    return ["paid", "success", "completed"].includes(
      String(status).toLowerCase()
    );
  }

  throw new Error("Type payment tidak dikenal");
}

module.exports = { createAdmin, createPanel, createPayment, cekPaid };