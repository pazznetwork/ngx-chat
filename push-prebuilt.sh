cd "$(dirname ${BASH_SOURCE[0]})"

VERSION="$(git rev-parse --short HEAD)"
MESSAGE="$(git show --no-patch --format=%s HEAD)"

rm -rf dist
npm run build-lib
cd dist/pazz/ngx-chat
git init .
git remote add origin git@github.com:pazz-dot-com/ngx-chat-xmpp-alpha-prebuilt.git
git fetch
git reset --soft origin/master
git add .
git commit -m "$MESSAGE ($VERSION)"
git push origin master
