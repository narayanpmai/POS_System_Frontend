module.exports = {
  apps: [
    {
      name: "koselighar-frontend",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3001",
      env: {
        NODE_ENV: "production",
        PORT: "3001"
      }
    }
  ]
};
