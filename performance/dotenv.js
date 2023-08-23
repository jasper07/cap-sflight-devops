export function loadDotEnv() {
    try {
      let dotenv = open("./.env")
      dotenv.split(/[\n\r]/m).forEach( (line) => {
        // Ignore comments
        if (line[0] === "#") return
  
        let parts = line.split("=", 2)
  
        __ENV[parts[0]] = parts[1]
      })
    } catch(_err) {
    }
  }