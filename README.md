# telebot
install

apt update -y && \
curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
apt install -y nodejs git unzip && \
git clone https://github.com/xyzval/telebot.git && \
cd telebot && \
npm install && \
npm install -g pm2 && \
pm2 start index.js --name telebot && \
pm2 startup && \
pm2 save
