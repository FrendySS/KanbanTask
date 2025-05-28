const http = require("http")

const options = {
  hostname: "localhost",
  port: process.env.PORT || 5000,
  path: "/api/health",
  method: "GET",
  timeout: 5000,
}

const req = http.request(options, (res) => {
  let data = ""

  res.on("data", (chunk) => {
    data += chunk
  })

  res.on("end", () => {
    if (res.statusCode === 200) {
      console.log("✅ Health check passed:", data)
      process.exit(0)
    } else {
      console.log("❌ Health check failed with status:", res.statusCode)
      process.exit(1)
    }
  })
})

req.on("error", (error) => {
  console.log("❌ Health check error:", error.message)
  process.exit(1)
})

req.on("timeout", () => {
  console.log("❌ Health check timeout")
  req.destroy()
  process.exit(1)
})

req.end()
