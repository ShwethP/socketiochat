#!/usr/bin/env bash
#!/usr/bin/env bash
echo "Installing dependencies from scratch..."
rm -rf node_modules package-lock.json
npm install --build-from-source sqlite3

npm install --force
