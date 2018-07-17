cd "$(dirname ${BASH_SOURCE[0]})"

VERSION="$(git rev-parse --short HEAD)"
MESSAGE="$(git show --no-patch --format=%s HEAD)"

rm -rf dist
npm run build-lib
cp README.md dist/pazznetwork/ngx-chat
cd dist/pazznetwork/ngx-chat
git init .
git remote add origin git@github.com:pazznetwork/ngx-chat-xmpp-alpha-prebuilt.git
git fetch
git reset --soft origin/master
git add .
git commit -m "$MESSAGE ($VERSION)"
git push origin master

npm publish
