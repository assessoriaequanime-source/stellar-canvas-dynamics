module.exports = {
  apps: [{
    name: 'singulai-alt-backend',
    script: './dist/server.js',
    cwd: '/projects/active/stellar-canvas-dynamics/stellar-backend',
    env: {
      PORT: 3000,
      NODE_ENV: 'production',
      XAI_API_KEY: 'xai-Ktqtem2CxQkSAkKn8TrNxk9BU2ampRgaPKcACKH9uGBSQwY0YZsC7scyLMmafIn0sknAFA34ZyUsRopF'
    }
  }]
}
