@echo off
cd /d D:\Projects\Chatroom
echo Creating Next.js app...
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git --yes
echo Done!
