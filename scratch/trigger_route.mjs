async function fetchTest() {
  try {
    // 1. Get the token by logging in (we need admin credentials)
    const loginRes = await fetch("http://localhost:5000/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "password" }) // Assuming default admin
    });
    
    if (!loginRes.ok) {
      console.log("Login failed", await loginRes.text());
      // we can try default credentials or we might not be able to test
      return;
    }
    
    const loginData = await loginRes.json();
    const token = loginData.token;
    
    // 2. Fetch the problematic route
    const res = await fetch("http://localhost:5000/api/time-records/all?limit=50&offset=0", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    
    console.log("Status:", res.status);
    const data = await res.text();
    console.log("Response:", data.substring(0, 500));
  } catch (err) {
    console.error("Fetch Error:", err);
  }
}

fetchTest();
